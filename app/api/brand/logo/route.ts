import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateFile, detectMimeType } from '@/lib/file-validation'
import { sanitizeSvg } from '@/lib/svg-sanitizer'
import { processUploadedImage } from '@/lib/image-processing'
import { wouldExceedQuota } from '@/lib/storage-quota'
import { LOGO_MAX_BYTES } from '@/types/brand'

type UploadTarget = 'logo' | 'avatar'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Workspace introuvable' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const target = (formData.get('target') as UploadTarget) || 'logo'

  if (!file) return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 })
  if (target !== 'logo' && target !== 'avatar') {
    return NextResponse.json({ error: 'Cible invalide.' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Validate type + size
  const allowed: ('image/jpeg' | 'image/png' | 'image/webp' | 'image/svg+xml' | 'image/heic')[] =
    ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/heic']
  const validation = validateFile(buffer, allowed, LOGO_MAX_BYTES)
  if (!validation.ok) return NextResponse.json({ error: validation.reason }, { status: 400 })

  const service = createServiceClient()

  // Check quota
  const { data: brand } = await service
    .from('brand_identity')
    .select('storage_used_bytes')
    .eq('workspace_id', member.workspace_id)
    .single()

  const currentUsed: number = brand?.storage_used_bytes ?? 0
  if (wouldExceedQuota(currentUsed, buffer.length)) {
    return NextResponse.json({ error: 'Quota de stockage dépassé (500 Mo).' }, { status: 413 })
  }

  let uploadBuffer: Buffer
  let contentType: string

  if (validation.mime === 'image/svg+xml') {
    const svgText = buffer.toString('utf8')
    const sanitized = sanitizeSvg(svgText)
    if (!sanitized.ok) return NextResponse.json({ error: sanitized.reason }, { status: 400 })
    uploadBuffer = Buffer.from(sanitized.svg, 'utf8')
    contentType = 'image/svg+xml'
  } else {
    // Process: strip EXIF, correct orientation, resize
    const processed = await processUploadedImage(buffer, validation.mime)
    uploadBuffer = processed.optimized
    contentType = processed.mime
  }

  const ext = contentType === 'image/svg+xml' ? 'svg'
    : contentType === 'image/png' ? 'png'
    : contentType === 'image/webp' ? 'webp'
    : 'jpg'

  const storagePath = `${user.id}/${target}-${Date.now()}.${ext}`

  const { error: uploadError } = await service.storage
    .from('brand-assets')
    .upload(storagePath, uploadBuffer, {
      contentType,
      upsert: true,
    })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  // Update brand_identity: set path + update storage_used_bytes
  const field = target === 'logo' ? 'logo_path' : 'avatar_path'

  // Get old path to compute freed bytes
  const oldPath: string | null = brand ? (brand as Record<string, unknown>)[field] as string | null ?? null : null
  let freedBytes = 0
  if (oldPath) {
    const { data: fileInfo } = await service.storage.from('brand-assets').list(oldPath.split('/').slice(0, -1).join('/'), { search: oldPath.split('/').pop() })
    if (fileInfo?.[0]?.metadata?.size) {
      freedBytes = fileInfo[0].metadata.size as number
    }
    await service.storage.from('brand-assets').remove([oldPath])
  }

  const newUsed = Math.max(0, currentUsed - freedBytes + uploadBuffer.length)

  const { data: updatedBrand, error: updateError } = await service
    .from('brand_identity')
    .upsert(
      {
        workspace_id: member.workspace_id,
        [field]: storagePath,
        storage_used_bytes: newUsed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ brand: updatedBrand, path: storagePath })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Workspace introuvable' }, { status: 403 })

  const { target } = await req.json() as { target: UploadTarget }
  if (target !== 'logo' && target !== 'avatar') {
    return NextResponse.json({ error: 'Cible invalide.' }, { status: 400 })
  }

  const field = target === 'logo' ? 'logo_path' : 'avatar_path'
  const service = createServiceClient()

  const { data: brand } = await service
    .from('brand_identity')
    .select('logo_path, avatar_path, storage_used_bytes')
    .eq('workspace_id', member.workspace_id)
    .single()

  if (!brand) return NextResponse.json({ error: 'Identité introuvable.' }, { status: 404 })

  const path = (brand as Record<string, unknown>)[field] as string | null
  if (!path) return NextResponse.json({ error: 'Aucun fichier à supprimer.' }, { status: 404 })

  await service.storage.from('brand-assets').remove([path])

  const currentUsed: number = brand.storage_used_bytes ?? 0
  // We approximate freed bytes as 0 since we don't track them individually here
  const { data: updatedBrand } = await service
    .from('brand_identity')
    .update({ [field]: null, updated_at: new Date().toISOString() })
    .eq('workspace_id', member.workspace_id)
    .select()
    .single()

  return NextResponse.json({ brand: updatedBrand })
}

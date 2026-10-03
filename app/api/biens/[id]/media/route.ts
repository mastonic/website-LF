import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateFile } from '@/lib/file-validation'
import { processUploadedImage } from '@/lib/image-processing'
import { wouldExceedQuota } from '@/lib/storage-quota'
import { PHOTO_MAX_BYTES, PHOTOS_MAX_PER_BIEN } from '@/types/brand'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Workspace introuvable' }, { status: 403 })

  const service = createServiceClient()

  // Verify annonce belongs to workspace
  const { data: annonce } = await service
    .from('annonces')
    .select('id, workspace_id')
    .eq('id', params.id)
    .eq('workspace_id', member.workspace_id)
    .single()
  if (!annonce) return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 })

  const { data: medias, error } = await service
    .from('annonce_media')
    .select('*')
    .eq('annonce_id', params.id)
    .eq('workspace_id', member.workspace_id)
    .order('ordre', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate signed URLs
  const enriched = await Promise.all(
    (medias ?? []).map(async (m) => {
      const [{ data: s1 }, { data: s2 }] = await Promise.all([
        service.storage.from('bien-media').createSignedUrl(m.storage_path, 3600),
        m.thumb_path
          ? service.storage.from('bien-media').createSignedUrl(m.thumb_path, 3600)
          : Promise.resolve({ data: null }),
      ])
      return {
        ...m,
        signed_url: s1?.signedUrl ?? null,
        thumb_signed_url: s2?.signedUrl ?? null,
      }
    })
  )

  return NextResponse.json({ medias: enriched })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Workspace introuvable' }, { status: 403 })

  const service = createServiceClient()

  // Verify annonce belongs to workspace
  const { data: annonce } = await service
    .from('annonces')
    .select('id, workspace_id')
    .eq('id', params.id)
    .eq('workspace_id', member.workspace_id)
    .single()
  if (!annonce) return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 })

  // Count existing photos
  const { count } = await service
    .from('annonce_media')
    .select('id', { count: 'exact', head: true })
    .eq('annonce_id', params.id)

  if ((count ?? 0) >= PHOTOS_MAX_PER_BIEN) {
    return NextResponse.json(
      { error: `Maximum ${PHOTOS_MAX_PER_BIEN} photos par bien atteint.` },
      { status: 400 }
    )
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const allowed: ('image/jpeg' | 'image/png' | 'image/webp' | 'image/svg+xml' | 'image/heic')[] =
    ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  const validation = validateFile(buffer, allowed, PHOTO_MAX_BYTES)
  if (!validation.ok) return NextResponse.json({ error: validation.reason }, { status: 400 })

  // Quota check
  const { data: brand } = await service
    .from('brand_identity')
    .select('storage_used_bytes')
    .eq('workspace_id', member.workspace_id)
    .single()

  const currentUsed: number = brand?.storage_used_bytes ?? 0
  // Estimate: optimized + thumbnail ≈ 2× compressed
  if (wouldExceedQuota(currentUsed, buffer.length)) {
    return NextResponse.json({ error: 'Quota de stockage dépassé (500 Mo).' }, { status: 413 })
  }

  // Process image
  const processed = await processUploadedImage(buffer, validation.mime)

  const ext = processed.mime === 'image/png' ? 'png'
    : processed.mime === 'image/webp' ? 'webp'
    : 'jpg'

  const ts = Date.now()
  const basePath = `${user.id}/${params.id}`
  const storagePath = `${basePath}/${ts}.${ext}`
  const thumbPath = `${basePath}/${ts}_thumb.${ext}`

  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    service.storage.from('bien-media').upload(storagePath, processed.optimized, {
      contentType: processed.mime,
      upsert: false,
    }),
    service.storage.from('bien-media').upload(thumbPath, processed.thumbnail, {
      contentType: processed.mime,
      upsert: false,
    }),
  ])

  if (e1 || e2) {
    return NextResponse.json({ error: (e1 ?? e2)!.message }, { status: 500 })
  }

  const totalBytes = processed.optimized.length + processed.thumbnail.length

  // Get next order index
  const { data: lastMedia } = await service
    .from('annonce_media')
    .select('ordre')
    .eq('annonce_id', params.id)
    .order('ordre', { ascending: false })
    .limit(1)
    .single()

  const ordre = (lastMedia?.ordre ?? -1) + 1

  // Insert media row
  const { data: media, error: insertError } = await service
    .from('annonce_media')
    .insert({
      workspace_id: member.workspace_id,
      annonce_id: params.id,
      storage_path: storagePath,
      thumb_path: thumbPath,
      mime_type: processed.mime,
      taille_octets: totalBytes,
      largeur: processed.width,
      hauteur: processed.height,
      ordre,
      is_couverture: ordre === 0,
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Update storage quota
  await service
    .from('brand_identity')
    .upsert(
      {
        workspace_id: member.workspace_id,
        storage_used_bytes: currentUsed + totalBytes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id', ignoreDuplicates: false }
    )

  return NextResponse.json({ media }, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Workspace introuvable' }, { status: 403 })

  const { mediaId } = await req.json() as { mediaId: string }
  if (!mediaId) return NextResponse.json({ error: 'mediaId manquant.' }, { status: 400 })

  const service = createServiceClient()

  const { data: media } = await service
    .from('annonce_media')
    .select('*')
    .eq('id', mediaId)
    .eq('annonce_id', params.id)
    .eq('workspace_id', member.workspace_id)
    .single()

  if (!media) return NextResponse.json({ error: 'Média introuvable.' }, { status: 404 })

  // Delete from storage
  const pathsToDelete = [media.storage_path, media.thumb_path].filter(Boolean) as string[]
  await service.storage.from('bien-media').remove(pathsToDelete)

  // Delete row
  await service.from('annonce_media').delete().eq('id', mediaId)

  // Update quota
  const { data: brand } = await service
    .from('brand_identity')
    .select('storage_used_bytes')
    .eq('workspace_id', member.workspace_id)
    .single()

  const currentUsed: number = brand?.storage_used_bytes ?? 0
  await service
    .from('brand_identity')
    .update({
      storage_used_bytes: Math.max(0, currentUsed - media.taille_octets),
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', member.workspace_id)

  // If deleted media was cover, promote next
  if (media.is_couverture) {
    const { data: next } = await service
      .from('annonce_media')
      .select('id')
      .eq('annonce_id', params.id)
      .order('ordre', { ascending: true })
      .limit(1)
      .single()
    if (next) {
      await service.from('annonce_media').update({ is_couverture: true }).eq('id', next.id)
    }
  }

  return NextResponse.json({ ok: true })
}

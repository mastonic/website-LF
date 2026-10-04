import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { renderVisual, validateAnnonceExport, makeThumbnail } from '@/lib/visuals/renderer'
import { deriveTheme } from '@/lib/visuals/theme'
import { wouldExceedQuota } from '@/lib/storage-quota'
import { RENDER_RATE_LIMIT } from '@/types/visuals'
import type { RenderRequest, TemplateId } from '@/types/visuals'
import type { BrandIdentity } from '@/types/brand'
import { ZodError } from 'zod'

const RATE_LIMIT = RENDER_RATE_LIMIT

async function fetchAsDataUri(
  service: ReturnType<typeof createServiceClient>,
  bucket: string,
  path: string
): Promise<string | null> {
  try {
    const { data, error } = await service.storage.from(bucket).download(path)
    if (error || !data) return null
    const arr = await data.arrayBuffer()
    const b64 = Buffer.from(arr).toString('base64')
    const mime = bucket === 'brand-assets' ? detectMime(path) : detectMime(path)
    return `data:${mime};base64,${b64}`
  } catch {
    return null
  }
}

function detectMime(path: string): string {
  if (path.endsWith('.svg')) return 'image/svg+xml'
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

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

  const service = createServiceClient()

  // ── Rate limit ────────────────────────────────────────────
  const { data: rateData } = await service.rpc('count_recent_renders', {
    workspace_id_input: member.workspace_id,
    hours_back: 1,
  })
  if ((rateData ?? 0) >= RATE_LIMIT) {
    return NextResponse.json(
      { error: `Limite de ${RATE_LIMIT} exports par heure atteinte. Réessayez dans une heure.` },
      { status: 429 }
    )
  }

  // ── Parse body ────────────────────────────────────────────
  let body: RenderRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const { templateId, data, format = 'png', lowRes = false, previewSlide } = body

  if (!['annonce', 'carrousel', 'story'].includes(templateId)) {
    return NextResponse.json({ error: 'Template inconnu' }, { status: 400 })
  }

  // ── Load brand ────────────────────────────────────────────
  const { data: brand, error: brandErr } = await service
    .from('brand_identity')
    .select('*')
    .eq('workspace_id', member.workspace_id)
    .single()

  if (brandErr && brandErr.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Erreur chargement marque' }, { status: 500 })
  }

  const brandData = brand as BrandIdentity | null

  // ── Load logo ─────────────────────────────────────────────
  let logoDataUri: string | null = null
  if (brandData?.logo_path) {
    logoDataUri = await fetchAsDataUri(service, 'brand-assets', brandData.logo_path)
  }

  const theme = deriveTheme(
    brandData ?? {
      id: '', workspace_id: member.workspace_id, nom_affiche: null, signature: null,
      logo_path: null, avatar_path: null, couleurs: [], polices: {}, charte: null,
      storage_used_bytes: 0, created_at: '', updated_at: '',
    },
    logoDataUri
  )

  // ── Validate annonce before render ────────────────────────
  if (templateId === 'annonce' && !lowRes) {
    try {
      const { annonceSchema } = await import('@/types/visuals')
      const parsed = annonceSchema.parse(data)
      if (parsed.exportType === 'final') {
        const blockErrors = validateAnnonceExport(parsed)
        if (blockErrors.length > 0) {
          return NextResponse.json(
            {
              error: `Export final bloqué : ${blockErrors.join(', ')}.`,
              code: 'EXPORT_BLOCKED',
              errors: blockErrors,
            },
            { status: 422 }
          )
        }
      }
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: 'Données invalides', details: err.issues.map((e) => e.message) },
          { status: 400 }
        )
      }
    }
  }

  // ── Load photo ────────────────────────────────────────────
  let photoDataUri: string | null = null
  const photoId: string | undefined =
    (data as { photoId?: string }).photoId

  if (photoId) {
    // photoId is annonce.id — fetch the cover photo for that annonce
    const { data: media } = await service
      .from('annonce_media')
      .select('storage_path, workspace_id')
      .eq('annonce_id', photoId)
      .eq('is_couverture', true)
      .eq('workspace_id', member.workspace_id)
      .single()

    if (!media) {
      return NextResponse.json({ error: 'Photo introuvable ou accès refusé' }, { status: 403 })
    }

    photoDataUri = await fetchAsDataUri(service, 'bien-media', media.storage_path)
  }

  // ── Render ────────────────────────────────────────────────
  let result
  try {
    result = await renderVisual({ templateId, data, format, lowRes, previewSlide }, theme, photoDataUri)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur de rendu'
    const code = (err as { code?: string }).code
    if (code === 'EXPORT_BLOCKED') {
      return NextResponse.json({ error: msg, code }, { status: 422 })
    }
    console.error('[visuals/render]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // ── Low-res preview: return PNG directly without storing ──
  if (lowRes) {
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Cache-Control': 'no-store',
        'X-Render-Time': String(result.renderTimeMs),
        'X-Warnings': result.warnings.join(' | '),
      },
    })
  }

  // ── Quota check ───────────────────────────────────────────
  const { data: quotaData } = await service
    .from('brand_identity')
    .select('storage_used_bytes')
    .eq('workspace_id', member.workspace_id)
    .single()

  const currentUsed: number = quotaData?.storage_used_bytes ?? 0
  if (wouldExceedQuota(currentUsed, result.buffer.length)) {
    return NextResponse.json({ error: 'Quota de stockage dépassé (500 Mo).' }, { status: 413 })
  }

  // ── Store render ──────────────────────────────────────────
  const ts = Date.now()
  const ext = result.contentType === 'application/zip' ? 'zip' : 'png'
  const storagePath = `${user.id}/renders/${templateId}/${ts}.${ext}`
  const thumbPath = ext === 'png' ? `${user.id}/renders/${templateId}/${ts}_thumb.png` : null

  const { error: upErr } = await service.storage
    .from('renders')
    .upload(storagePath, result.buffer, { contentType: result.contentType, upsert: false })

  if (upErr) return NextResponse.json({ error: 'Erreur stockage export' }, { status: 500 })

  // Thumbnail
  let thumbSize = 0
  if (thumbPath && ext === 'png') {
    const thumb = await makeThumbnail(result.buffer, templateId)
    thumbSize = thumb.length
    await service.storage.from('renders').upload(thumbPath, thumb, { contentType: 'image/png', upsert: false })
  }

  // Strip binary fields from render_data before storing
  const safeData = JSON.parse(JSON.stringify(data, (k, v) =>
    k === 'photoId' ? v : typeof v === 'string' && v.startsWith('data:') ? '[data-uri]' : v
  ))

  // Insert history record
  const { data: renderRecord } = await service
    .from('visual_renders')
    .insert({
      workspace_id: member.workspace_id,
      user_id: user.id,
      template_id: templateId,
      render_data: safeData,
      storage_path: storagePath,
      thumb_path: thumbPath,
      taille_octets: result.buffer.length + thumbSize,
    })
    .select('id')
    .single()

  // Update quota
  await service
    .from('brand_identity')
    .upsert(
      {
        workspace_id: member.workspace_id,
        storage_used_bytes: currentUsed + result.buffer.length + thumbSize,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id', ignoreDuplicates: false }
    )

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="visuel-${templateId}-${ts}.${ext}"`,
      'X-Render-Time': String(result.renderTimeMs),
      'X-Warnings': result.warnings.join(' | '),
      'X-Render-Id': renderRecord?.id ?? '',
    },
  })
}

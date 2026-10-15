import { NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api-auth'
import { validateFile } from '@/lib/file-validation'
import { processUploadedImage } from '@/lib/image-processing'
import { createServiceClient } from '@/lib/supabase/server'
import { BUCKET, photosAffichees } from '@/lib/photos'
import { MAX_PHOTOS, type PhotoBien } from '@/lib/photos-shared'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_BYTES = 8 * 1024 * 1024

async function loadRow(ctx: { supabase: any; workspaceId: string }, id: string) {
  const { data } = await ctx.supabase
    .from('estimations')
    .select('id, photos')
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .single()
  return data as { id: string; photos: PhotoBien[] | null } | null
}

/** Ajoute une photo au dossier : contrôle du vrai format, retrait des données GPS, redimensionnement. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext()
  if ('error' in ctx) return ctx.error
  const row = await loadRow(ctx, params.id)
  if (!row) return NextResponse.json({ error: 'Estimation introuvable' }, { status: 404 })

  const photos = row.photos ?? []
  if (photos.length >= MAX_PHOTOS) {
    return NextResponse.json({ error: `Maximum ${MAX_PHOTOS} photos par dossier.` }, { status: 400 })
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const check = validateFile(buffer, ['image/jpeg', 'image/png', 'image/webp', 'image/heic'], MAX_BYTES)
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 })

  let processed
  try {
    processed = await processUploadedImage(buffer, check.mime)
  } catch {
    return NextResponse.json({ error: 'Image illisible. Essayez une autre photo.' }, { status: 400 })
  }

  const id = crypto.randomUUID()
  const ext = processed.mime === 'image/png' ? 'png' : processed.mime === 'image/webp' ? 'webp' : 'jpg'
  const base = `users/${ctx.user.id}/estimations/${params.id}/${id}`
  const path = `${base}.${ext}`
  const thumb = `${base}-t.${ext}`

  const service = createServiceClient()
  const up1 = await service.storage.from(BUCKET).upload(path, processed.optimized, { contentType: processed.mime })
  const up2 = up1.error
    ? up1
    : await service.storage.from(BUCKET).upload(thumb, processed.thumbnail, { contentType: processed.mime })
  if (up1.error || up2.error) {
    await service.storage.from(BUCKET).remove([path, thumb])
    return NextResponse.json({ error: 'Envoi de la photo impossible. Réessayez.' }, { status: 502 })
  }

  const nom = (file.name || 'photo').replace(/[^\w.\- ]+/g, '').slice(0, 80) || 'photo'
  const photo: PhotoBien = { id, path, thumb, nom }
  const { error } = await ctx.supabase
    .from('estimations')
    .update({ photos: [...photos, photo] })
    .eq('id', params.id)
    .eq('workspace_id', ctx.workspaceId)
  if (error) {
    await service.storage.from(BUCKET).remove([path, thumb])
    return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 500 })
  }

  const [affichee] = await photosAffichees([photo])
  return NextResponse.json({ photo: affichee })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext()
  if ('error' in ctx) return ctx.error
  const row = await loadRow(ctx, params.id)
  if (!row) return NextResponse.json({ error: 'Estimation introuvable' }, { status: 404 })

  const { id } = (await req.json().catch(() => ({}))) as { id?: string }
  const photos = row.photos ?? []
  const cible = photos.find((p) => p.id === id)
  if (!cible) return NextResponse.json({ error: 'Photo introuvable' }, { status: 404 })

  await createServiceClient().storage.from(BUCKET).remove([cible.path, cible.thumb])
  await ctx.supabase
    .from('estimations')
    .update({ photos: photos.filter((p) => p.id !== cible.id) })
    .eq('id', params.id)
    .eq('workspace_id', ctx.workspaceId)
  return NextResponse.json({ ok: true })
}

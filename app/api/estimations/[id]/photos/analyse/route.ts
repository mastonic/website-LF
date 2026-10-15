import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { consumeQuota, getApiContext } from '@/lib/api-auth'
import { createServiceClient } from '@/lib/supabase/server'
import { BUCKET } from '@/lib/photos'
import { analysePhotos } from '@/lib/photos-analyse'
import type { PhotoBien } from '@/lib/photos-shared'
import type { ImageInput } from '@/lib/claude'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext()
  if ('error' in ctx) return ctx.error
  const { supabase, workspaceId } = ctx

  const { data: row } = await supabase
    .from('estimations')
    .select('*')
    .eq('id', params.id)
    .eq('workspace_id', workspaceId)
    .single()
  if (!row) return NextResponse.json({ error: 'Estimation introuvable' }, { status: 404 })

  const photos = (row.photos ?? []) as PhotoBien[]
  if (photos.length === 0) return NextResponse.json({ error: 'Ajoutez d’abord au moins une photo.' }, { status: 400 })

  const service = createServiceClient()
  const images: ImageInput[] = []
  try {
    for (const p of photos) {
      const { data, error } = await service.storage.from(BUCKET).download(p.path)
      if (error || !data) throw new Error('download')
      const jpeg = await sharp(Buffer.from(await data.arrayBuffer()))
        .rotate()
        .resize({ width: 1568, height: 1568, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer()
      images.push({ mediaType: 'image/jpeg', data: jpeg.toString('base64') })
    }
  } catch {
    return NextResponse.json({ error: 'Lecture des photos impossible. Réessayez.' }, { status: 502 })
  }

  const quotaError = await consumeQuota(supabase, workspaceId)
  if (quotaError) return quotaError

  try {
    const { analyse, tokens } = await analysePhotos(
      {
        typeBien: row.type_bien,
        surface: Number(row.surface),
        pieces: row.pieces,
        anneeConstruction: row.annee_construction,
        etat: row.etat,
        notes: row.notes,
      },
      images,
      photos.map((p) => p.id)
    )
    await supabase
      .from('estimations')
      .update({ analyse_photos: analyse, tokens_used: (row.tokens_used ?? 0) + tokens })
      .eq('id', params.id)
      .eq('workspace_id', workspaceId)
    return NextResponse.json({ analyse })
  } catch {
    return NextResponse.json({ error: 'L’analyse des photos a échoué. Réessayez.' }, { status: 502 })
  }
}

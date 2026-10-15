import { createServiceClient } from '@/lib/supabase/server'
import type { PhotoAffichee, PhotoBien } from '@/lib/photos-shared'

export const BUCKET = 'bien-media'
/** Durée de validité des liens d'affichage (en secondes). */
const URL_TTL = 60 * 60

/** Liens temporaires (miniatures) pour afficher les photos d'une estimation. */
export async function photosAffichees(photos: PhotoBien[]): Promise<PhotoAffichee[]> {
  if (photos.length === 0) return []
  const service = createServiceClient()
  const { data } = await service.storage.from(BUCKET).createSignedUrls(
    photos.map((p) => p.thumb),
    URL_TTL
  )
  return photos.map((p, i) => ({ id: p.id, nom: p.nom, url: data?.[i]?.signedUrl ?? '' }))
}

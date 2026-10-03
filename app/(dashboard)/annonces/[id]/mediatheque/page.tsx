import { redirect, notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { MediathequeClient } from './MediathequeClient'
import type { AnnonceMedia } from '@/types/brand'
import { computeQuota } from '@/lib/storage-quota'

export const metadata = { title: 'Médiathèque — ImmoAI' }

export default async function MediathequePage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()
  if (!member) redirect('/login')

  const service = createServiceClient()

  const { data: annonce } = await service
    .from('annonces')
    .select('id, titre, workspace_id')
    .eq('id', params.id)
    .eq('workspace_id', member.workspace_id)
    .single()
  if (!annonce) notFound()

  const { data: rawMedias } = await service
    .from('annonce_media')
    .select('*')
    .eq('annonce_id', params.id)
    .eq('workspace_id', member.workspace_id)
    .order('ordre', { ascending: true })

  // Generate signed URLs
  const medias: AnnonceMedia[] = await Promise.all(
    (rawMedias ?? []).map(async (m) => {
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

  const { data: brand } = await service
    .from('brand_identity')
    .select('storage_used_bytes')
    .eq('workspace_id', member.workspace_id)
    .single()

  const quota = computeQuota(brand?.storage_used_bytes ?? 0)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Médiathèque</h1>
        <p className="text-sm text-gray-500 mt-1 truncate">{annonce.titre}</p>
      </div>

      <MediathequeClient
        annonceId={params.id}
        initialMedias={medias}
        quota={quota}
      />
    </div>
  )
}

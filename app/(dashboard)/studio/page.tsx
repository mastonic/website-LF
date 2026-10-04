import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { StudioClient } from './StudioClient'
import { computeQuota } from '@/lib/storage-quota'
import type { BrandIdentity } from '@/types/brand'

export const metadata = { title: 'Studio visuel — ImmoAI' }

export default async function StudioPage() {
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

  const { data: brand } = await service
    .from('brand_identity')
    .select('*')
    .eq('workspace_id', member.workspace_id)
    .single()

  const { data: annonces } = await service
    .from('annonces')
    .select('id, titre')
    .eq('workspace_id', member.workspace_id)
    .order('created_at', { ascending: false })
    .limit(50)

  const quota = computeQuota(brand?.storage_used_bytes ?? 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Studio visuel</h1>
        <p className="text-sm text-gray-500 mt-1">
          Créez vos visuels aux couleurs de votre agence — annonces, carrousels, stories.
        </p>
      </div>
      <StudioClient
        brand={brand as BrandIdentity | null}
        annonces={annonces ?? []}
        quota={quota}
      />
    </div>
  )
}

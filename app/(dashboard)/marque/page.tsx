import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { BrandForm } from './BrandForm'
import { computeQuota } from '@/lib/storage-quota'
import type { BrandIdentity } from '@/types/brand'

export const metadata = { title: 'Ma marque — ImmoAI' }

export default async function MarquePage() {
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

  const quota = computeQuota(brand?.storage_used_bytes ?? 0)

  // Generate signed URLs for logo/avatar if they exist
  let logoUrl: string | null = null
  let avatarUrl: string | null = null

  if (brand?.logo_path) {
    const { data } = await service.storage
      .from('brand-assets')
      .createSignedUrl(brand.logo_path, 3600)
    logoUrl = data?.signedUrl ?? null
  }
  if (brand?.avatar_path) {
    const { data } = await service.storage
      .from('brand-assets')
      .createSignedUrl(brand.avatar_path, 3600)
    avatarUrl = data?.signedUrl ?? null
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ma marque</h1>
        <p className="text-sm text-gray-500 mt-1">
          Personnalisez votre identité visuelle pour le kit réseaux sociaux.
        </p>
      </div>

      <BrandForm
        brand={brand as BrandIdentity | null}
        logoUrl={logoUrl}
        avatarUrl={avatarUrl}
        quota={quota}
      />
    </div>
  )
}

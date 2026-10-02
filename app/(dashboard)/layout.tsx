import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/sidebar'
import type { Workspace } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .single()

  if (!member) redirect('/login')

  // N'expose pas api_key dans le layout (chargée seulement dans /leads et /parametres)
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name, slug, plan, plan_expires_at, logo_url, brand_color, ai_quota_used, ai_quota_limit, created_at, updated_at')
    .eq('id', member.workspace_id)
    .single()

  if (!workspace) redirect('/login')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar workspace={workspace as Workspace} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

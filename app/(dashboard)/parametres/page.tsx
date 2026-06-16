import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Key, CreditCard } from 'lucide-react'
import type { Workspace } from '@/types'

export const metadata = { title: 'Paramètres' }

const planLabels = { starter: 'Starter — 29€/mois', pro: 'Pro — 59€/mois', agence: 'Agence — 149€/mois', trial: 'Essai gratuit (7 jours)' }

export default async function ParametresPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  const { data: workspace } = await supabase.from('workspaces').select('*').eq('id', member?.workspace_id).single()
  const ws = workspace as Workspace

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Paramètres</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Espace de travail</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'agence</label>
              <input defaultValue={ws?.name} className="w-full border rounded-lg px-3 py-2 text-sm" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input defaultValue={ws?.slug} className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50" readOnly />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> Clé API publique</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">Utilisez cette clé pour intégrer le widget chatbot sur votre site.</p>
            <div className="flex items-center gap-2">
              <input value={ws?.api_key ?? ''} className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono bg-gray-50" readOnly />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Plan actuel</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-gray-900 mb-1">{planLabels[ws?.plan ?? 'trial']}</p>
            <p className="text-sm text-gray-500">
              Usage IA : {ws?.ai_quota_used ?? 0} / {ws?.ai_quota_limit ?? 20} appels ce mois
            </p>
            <a href="#" className="mt-4 inline-block text-sm text-blue-600 hover:underline font-medium">
              Changer de plan →
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

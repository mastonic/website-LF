import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Bot, Flame, Minus, Snowflake, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Lead } from '@/types'

export const metadata = { title: 'Leads & Chatbot' }

export default async function LeadsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  const { data: workspace } = await supabase.from('workspaces').select('api_key, slug').eq('id', member?.workspace_id).single()
  const { data: leads } = await supabase.from('leads').select('*').eq('workspace_id', member?.workspace_id).order('created_at', { ascending: false })

  const list = (leads ?? []) as Lead[]
  const scoreConfig = {
    chaud: { label: 'Chaud', variant: 'destructive' as const, icon: Flame },
    tiede: { label: 'Tiède', variant: 'warning' as const, icon: Minus },
    froid: { label: 'Froid', variant: 'info' as const, icon: Snowflake },
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Leads & Chatbot</h1>
        <p className="text-gray-500 text-sm mt-1">{list.length} lead{list.length > 1 ? 's' : ''} qualifié{list.length > 1 ? 's' : ''}</p>
      </div>

      {/* Widget integration */}
      <Card className="mb-8 border-blue-200 bg-blue-50">
        <CardHeader><CardTitle className="text-blue-900 flex items-center gap-2"><Bot className="h-5 w-5" /> Intégrer le chatbot sur votre site</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700 mb-3">Copiez ce code dans le <code className="bg-blue-100 px-1 rounded">&lt;/body&gt;</code> de votre site :</p>
          <pre className="bg-blue-900 text-blue-100 text-xs p-4 rounded-lg overflow-x-auto">
{`<script src="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://immoai.fr'}/widget.js"
  data-key="${workspace?.api_key ?? 'VOTRE_CLE_API'}"
  data-color="#2563EB">
</script>`}
          </pre>
        </CardContent>
      </Card>

      {list.length === 0 ? (
        <div className="text-center py-24">
          <Bot className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Aucun lead encore</h2>
          <p className="text-gray-500 text-sm">Intégrez le chatbot sur votre site pour capturer des leads qualifiés</p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((lead) => {
            const cfg = scoreConfig[lead.score]
            return (
              <Card key={lead.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant={cfg.variant} className="flex items-center gap-1">
                          <cfg.icon className="h-3 w-3" />{cfg.label}
                        </Badge>
                        <Badge variant="outline">{lead.statut}</Badge>
                        <span className="text-xs text-gray-400">{formatDate(lead.created_at)}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">
                        {lead.prenom && lead.nom ? `${lead.prenom} ${lead.nom}` : lead.email ?? 'Prospect anonyme'}
                      </h3>
                      {lead.resume_ia && <p className="text-sm text-gray-600 mt-1">{lead.resume_ia}</p>}
                      <div className="flex gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                        {lead.email && <span>{lead.email}</span>}
                        {lead.telephone && <span>{lead.telephone}</span>}
                        {lead.budget_max && <span>Budget : {lead.budget_max.toLocaleString('fr-FR')}€</span>}
                        {lead.type_recherche && <span>{lead.type_recherche}</span>}
                        {lead.delai_projet && <span>{lead.delai_projet}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

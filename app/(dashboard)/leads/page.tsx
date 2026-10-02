import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Bot, Flame, Minus, Snowflake } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Lead } from '@/types'

export const metadata = { title: 'Leads & Chatbot' }

const SCORE_CONFIG = {
  chaud: { label: 'Chaud', bg: 'bg-red-100 text-red-800', icon: Flame },
  tiede: { label: 'Tiède', bg: 'bg-yellow-100 text-yellow-800', icon: Minus },
  froid: { label: 'Froid', bg: 'bg-blue-100 text-blue-800', icon: Snowflake },
} as const

const STATUT_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  contacte: 'Contacté',
  rdv: 'RDV planifié',
  converti: 'Converti',
  perdu: 'Perdu',
}

export default async function LeadsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()
  if (!member) redirect('/login')

  const workspaceId: string = member.workspace_id

  const [workspaceRes, leadsRes] = await Promise.all([
    supabase.from('workspaces').select('api_key').eq('id', workspaceId).single(),
    supabase
      .from('leads')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
  ])

  const apiKey = workspaceRes.data?.api_key ?? ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://immoai.fr'
  const list = (leadsRes.data ?? []) as Lead[]

  const counts = {
    chaud: list.filter((l) => l.score === 'chaud').length,
    tiede: list.filter((l) => l.score === 'tiede').length,
    froid: list.filter((l) => l.score === 'froid').length,
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Leads & Chatbot</h1>
        <p className="text-gray-500 text-sm mt-1">
          {list.length} lead{list.length > 1 ? 's' : ''} qualifié{list.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Compteurs par score */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {(['chaud', 'tiede', 'froid'] as const).map((score) => {
          const cfg = SCORE_CONFIG[score]
          return (
            <Card key={score}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                  <cfg.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{counts[score]}</p>
                  <p className="text-xs text-gray-500">{cfg.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Widget integration */}
      <Card className="mb-8 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2 text-base">
            <Bot className="h-5 w-5" /> Intégrer le chatbot sur votre site
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700 mb-3">
            Copiez ce code avant le <code className="bg-blue-100 px-1 rounded">&lt;/body&gt;</code> :
          </p>
          <pre className="bg-blue-900 text-blue-100 text-xs p-4 rounded-lg overflow-x-auto select-all">
{`<script src="${appUrl}/widget.js"
  data-key="${apiKey}"
  data-color="#2563EB">
</script>`}
          </pre>
        </CardContent>
      </Card>

      {list.length === 0 ? (
        <div className="text-center py-24">
          <Bot className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Aucun lead encore</h2>
          <p className="text-gray-500 text-sm">
            Intégrez le chatbot sur votre site pour capturer des leads qualifiés
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((lead) => {
            // Fallback si score null (lead créé manuellement ou avant le scoring)
            const score = lead.score ?? 'tiede'
            const cfg = SCORE_CONFIG[score] ?? SCORE_CONFIG.tiede

            return (
              <Card key={lead.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.bg}`}
                        >
                          <cfg.icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                          {STATUT_LABELS[lead.statut] ?? lead.statut}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(lead.created_at)}</span>
                      </div>

                      <h3 className="font-semibold text-gray-900">
                        {lead.prenom && lead.nom
                          ? `${lead.prenom} ${lead.nom}`
                          : lead.email ?? 'Prospect anonyme'}
                      </h3>

                      {lead.resume_ia && (
                        <p className="text-sm text-gray-600 mt-1">{lead.resume_ia}</p>
                      )}

                      <div className="flex gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                        {lead.email && <span>✉ {lead.email}</span>}
                        {lead.telephone && <span>📞 {lead.telephone}</span>}
                        {lead.budget_max && (
                          <span>
                            Budget :{' '}
                            {lead.budget_min
                              ? `${lead.budget_min.toLocaleString('fr-FR')} – `
                              : ''}
                            {lead.budget_max.toLocaleString('fr-FR')} €
                          </span>
                        )}
                        {lead.type_recherche && <span>{lead.type_recherche}</span>}
                        {lead.delai_projet && <span>Délai : {lead.delai_projet}</span>}
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

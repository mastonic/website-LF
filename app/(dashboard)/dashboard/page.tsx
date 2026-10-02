import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileText, Bot, FolderOpen, Users, TrendingUp, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import type { Annonce, Lead } from '@/types'

export const metadata = { title: 'Tableau de bord' }

async function getWorkspaceId(userId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .single()
  return data?.workspace_id
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const workspaceId = await getWorkspaceId(user.id)
  if (!workspaceId) redirect('/login')

  const [annoncesRes, leadsRes, docsRes, contactsRes, recentAnnoncesRes, recentLeadsRes] = await Promise.all([
    supabase.from('annonces').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('annonces').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(5),
    supabase.from('leads').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(5),
  ])

  const stats = [
    { label: 'Annonces créées', value: annoncesRes.count ?? 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Leads reçus', value: leadsRes.count ?? 0, icon: Bot, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Documents traités', value: docsRes.count ?? 0, icon: FolderOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Contacts CRM', value: contactsRes.count ?? 0, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  const recentAnnonces = (recentAnnoncesRes.data ?? []) as Annonce[]
  const recentLeads = (recentLeadsRes.data ?? []) as Lead[]

  const scoreColors = { chaud: 'bg-red-100 text-red-700', tiede: 'bg-yellow-100 text-yellow-700', froid: 'bg-blue-100 text-blue-700' }
  const scoreLabels = { chaud: 'Chaud', tiede: 'Tiède', froid: 'Froid' }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Bienvenue sur ImmoAI — votre copilote immobilier</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{s.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Annonces */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Annonces récentes
            </CardTitle>
            <a href="/annonces" className="text-sm text-blue-600 hover:underline">Voir tout</a>
          </CardHeader>
          <CardContent>
            {recentAnnonces.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune annonce encore</p>
                <a href="/annonces/nouvelle" className="text-blue-600 text-sm hover:underline mt-1 inline-block">
                  Créer ma première annonce
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAnnonces.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.titre ?? a.type_bien}</p>
                      <p className="text-xs text-gray-500">{formatDate(a.created_at)}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ml-3 flex-shrink-0 ${a.statut === 'publie' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {a.statut}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              Leads récents
            </CardTitle>
            <a href="/leads" className="text-sm text-blue-600 hover:underline">Voir tout</a>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Bot className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun lead encore</p>
                <a href="/leads" className="text-blue-600 text-sm hover:underline mt-1 inline-block">
                  Configurer le chatbot
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLeads.map((l) => (
                  <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {l.prenom && l.nom ? `${l.prenom} ${l.nom}` : l.email ?? 'Prospect anonyme'}
                      </p>
                      <p className="text-xs text-gray-500">{l.type_recherche ?? 'Recherche non précisée'}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ml-3 flex-shrink-0 ${scoreColors[l.score]}`}>
                      {scoreLabels[l.score]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

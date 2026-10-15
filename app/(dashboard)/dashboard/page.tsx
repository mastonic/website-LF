import Link from 'next/link'
import { getWorkspaceContext, needsFollowUp } from '@/lib/workspace'
import { MVP_AGENTS, V2_AGENTS } from '@/lib/agents'
import { AgentAvatar } from '@/components/agents/AgentAvatar'
import { Card, CardContent } from '@/components/ui/card'
import { AlexChat } from '@/components/agents/AlexChat'
import type { Contact } from '@/types'

export const metadata = { title: 'Mon équipe' }

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`

export default async function DashboardPage() {
  const { supabase, workspaceId } = await getWorkspaceContext()

  const [draftsRes, newLeadsRes, contactsRes] = await Promise.all([
    supabase.from('annonces').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('statut', 'brouillon'),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('statut', 'nouveau'),
    supabase.from('contacts').select('id, type_contact, statut_pipeline, last_contact_at, created_at').eq('workspace_id', workspaceId).limit(500),
  ])

  const drafts = draftsRes.count ?? 0
  const newLeads = newLeadsRes.count ?? 0
  const contacts = (contactsRes.data ?? []) as Pick<Contact, 'id' | 'type_contact' | 'statut_pipeline' | 'last_contact_at' | 'created_at'>[]
  const vendeurs = contacts.filter((c) => c.type_contact === 'vendeur' && c.statut_pipeline !== 'perdu').length
  const relances = contacts.filter((c) => needsFollowUp(c)).length
  const pending = drafts + newLeads + relances

  const statusLine: Record<string, string> = {
    victor: vendeurs > 0 ? `${plural(vendeurs, 'vendeur suivi', 'vendeurs suivis')} dans votre pipeline` : 'Aucun vendeur dans votre pipeline pour l’instant',
    sophie: newLeads > 0 ? `${plural(newLeads, 'nouveau contact à rappeler', 'nouveaux contacts à rappeler')}` : 'Aucun nouveau contact en attente',
    julien: drafts > 0 ? `${plural(drafts, 'annonce à relire', 'annonces à relire')}` : 'Aucune annonce en attente de relecture',
    emma: relances > 0 ? `${plural(relances, 'contact à relancer', 'contacts à relancer')}` : 'Aucune relance en retard',
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mon équipe</h1>
        <p className="text-gray-600 text-sm mt-1">Vos collaborateurs préparent le travail, vous gardez la décision.</p>
      </div>

      <AlexChat />

      <Link
        href="/validation"
        className="mb-8 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-5 hover:bg-blue-100 transition-colors"
      >
        <div>
          <p className="font-semibold text-blue-900">
            {pending > 0 ? `${plural(pending, 'élément attend', 'éléments attendent')} votre décision` : 'Rien n’attend votre décision'}
          </p>
          <p className="text-sm text-blue-800 mt-0.5">
            {pending > 0 ? 'Annonces à relire, nouveaux contacts, relances à envoyer.' : 'Vos collaborateurs vous préviendront dès qu’un résultat est prêt.'}
          </p>
        </div>
        <span className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">Voir ce qui est à valider</span>
      </Link>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Au travail</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {MVP_AGENTS.filter((a) => a.id !== 'alex').map((agent) => {
          const inner = (
            <Card className="h-full transition-colors hover:border-blue-300">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <AgentAvatar agent={agent} size="lg" />
                  <div>
                    <p className="font-semibold text-gray-900">{agent.prenom}</p>
                    <p className="text-sm text-gray-600">{agent.role}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-3">« {agent.presentation} »</p>
                <p className="text-sm font-medium text-gray-900">{statusLine[agent.id]}</p>
                <p className="text-xs text-gray-500 mt-2">{agent.autonomie}</p>
              </CardContent>
            </Card>
          )
          return <Link key={agent.id} href={agent.href}>{inner}</Link>
        })}
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">Bientôt disponibles</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {V2_AGENTS.map((agent) => (
          <div key={agent.id} className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-5">
            <div className="flex items-center gap-3">
              <AgentAvatar agent={agent} muted />
              <div>
                <p className="font-semibold text-gray-500">{agent.prenom}</p>
                <p className="text-sm text-gray-500">{agent.role}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">Bientôt disponible</p>
          </div>
        ))}
      </div>
    </div>
  )
}


import Link from 'next/link'
import { getWorkspaceContext, needsFollowUp } from '@/lib/workspace'
import { getAgent, type AgentId } from '@/lib/agents'
import { AgentAvatar } from '@/components/agents/AgentAvatar'
import { formatDate } from '@/lib/utils'
import type { Annonce, Contact, Lead } from '@/types'

export const metadata = { title: 'À valider' }

function Item({ agentId, title, detail, href, cta }: { agentId: AgentId; title: string; detail: string; href: string; cta: string }) {
  const agent = getAgent(agentId)
  return (
    <li className="flex items-center gap-4 rounded-xl border border-border bg-white p-4">
      <AgentAvatar agent={agent} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-600">{agent.prenom}</p>
        <p className="font-medium text-gray-900 truncate">{title}</p>
        <p className="text-sm text-gray-600 truncate">{detail}</p>
      </div>
      <span className="hidden sm:inline rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-900">À valider</span>
      <Link href={href} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white min-h-[44px] inline-flex items-center hover:bg-blue-700">
        {cta}
      </Link>
    </li>
  )
}

export default async function ValidationPage() {
  const { supabase, workspaceId } = await getWorkspaceContext()

  const [annoncesRes, leadsRes, contactsRes] = await Promise.all([
    supabase.from('annonces').select('id, titre, type_bien, localisation, created_at').eq('workspace_id', workspaceId).eq('statut', 'brouillon').order('created_at', { ascending: false }).limit(50),
    supabase.from('leads').select('id, prenom, nom, email, type_recherche, score, created_at').eq('workspace_id', workspaceId).eq('statut', 'nouveau').order('created_at', { ascending: false }).limit(50),
    supabase.from('contacts').select('*').eq('workspace_id', workspaceId).limit(500),
  ])

  const annonces = (annoncesRes.data ?? []) as Pick<Annonce, 'id' | 'titre' | 'type_bien' | 'localisation' | 'created_at'>[]
  const leads = (leadsRes.data ?? []) as Pick<Lead, 'id' | 'prenom' | 'nom' | 'email' | 'type_recherche' | 'score' | 'created_at'>[]
  const relances = ((contactsRes.data ?? []) as Contact[]).filter((c) => needsFollowUp(c))
  const total = annonces.length + leads.length + relances.length

  return (
    <div className="p-4 sm:p-4 sm:p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">À valider</h1>
      <p className="text-gray-600 text-sm mt-1 mb-8">
        Rien ne part sous votre nom sans votre accord. {total > 0 ? `${total} élément${total > 1 ? 's' : ''} en attente.` : 'Tout est à jour.'}
      </p>

      {total === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-6 text-sm text-gray-600">
          Aucun résultat en attente. Vos collaborateurs vous préviendront dès qu&apos;un travail est prêt.
        </p>
      )}

      <ul className="space-y-3">
        {annonces.map((a) => (
          <Item key={a.id} agentId="julien"
            title={a.titre ?? `Annonce ${a.type_bien}`}
            detail={`Brouillon du ${formatDate(a.created_at)}${a.localisation ? ` · ${a.localisation}` : ''}`}
            href={`/annonces/${a.id}`} cta="Relire" />
        ))}
        {leads.map((l) => (
          <Item key={l.id} agentId="sophie"
            title={l.prenom && l.nom ? `${l.prenom} ${l.nom}` : l.email ?? 'Visiteur anonyme'}
            detail={`${l.type_recherche ?? 'Recherche non précisée'} · contact ${l.score === 'chaud' ? 'chaud' : l.score === 'tiede' ? 'tiède' : 'froid'}`}
            href="/leads" cta="Voir le contact" />
        ))}
        {relances.map((c) => (
          <Item key={c.id} agentId="emma"
            title={`${c.prenom} ${c.nom}`}
            detail={`Sans échange depuis le ${formatDate(c.last_contact_at ?? c.created_at)}`}
            href="/crm" cta="Relancer" />
        ))}
      </ul>
    </div>
  )
}

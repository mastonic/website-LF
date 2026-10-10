import Link from 'next/link'
import { getWorkspaceContext } from '@/lib/workspace'
import { getAgent } from '@/lib/agents'
import { AgentAvatar } from '@/components/agents/AgentAvatar'
import { ContactForm } from '@/components/crm/ContactForm'
import { ContactList } from '@/components/crm/ContactList'
import type { Contact } from '@/types'

export const metadata = { title: 'Vendeurs — Victor' }

export default async function VendeursPage() {
  const { supabase, workspaceId } = await getWorkspaceContext()
  const victor = getAgent('victor')

  const { data } = await supabase
    .from('contacts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('type_contact', 'vendeur')
    .order('created_at', { ascending: false })

  const vendeurs = (data ?? []) as Contact[]

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <AgentAvatar agent={victor} size="lg" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Victor — Prospection vendeurs</h1>
          <p className="text-gray-600 text-sm mt-1">« {victor.presentation} » Sans mandat, pas de vente : c&apos;est le point de départ.</p>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
        <p className="font-medium">Ce que Victor fait aujourd&apos;hui</p>
        <p className="mt-1">Il rassemble vos propriétaires vendeurs et vous les remonte avec leur étape. La page d&apos;estimation en ligne pour attirer de nouveaux vendeurs et les approches personnalisées arrivent ensuite. Les contacts reçus par le chatbot de <Link href="/leads" className="underline font-medium">Sophie</Link> restent dans ses leads.</p>
      </div>

      <section className="mb-10" aria-labelledby="vendeurs-liste">
        <h2 id="vendeurs-liste" className="text-lg font-semibold text-gray-900 mb-3">Vos vendeurs ({vendeurs.length})</h2>
        <ContactList contacts={vendeurs} emptyText="Aucun vendeur pour l'instant. Ajoutez un propriétaire qui souhaite vendre." />
      </section>

      <section aria-labelledby="vendeur-ajout" className="rounded-xl border border-border bg-white p-5">
        <h2 id="vendeur-ajout" className="text-lg font-semibold text-gray-900 mb-3">Ajouter un vendeur</h2>
        <ContactForm defaultType="vendeur" lockType />
      </section>
    </div>
  )
}

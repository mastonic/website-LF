import { getWorkspaceContext, needsFollowUp, RELANCE_DELAI_JOURS } from '@/lib/workspace'
import { getAgent } from '@/lib/agents'
import { AgentAvatar } from '@/components/agents/AgentAvatar'
import { ContactForm } from '@/components/crm/ContactForm'
import { ContactList } from '@/components/crm/ContactList'
import type { Contact } from '@/types'

export const metadata = { title: 'Suivi client — Emma' }

export default async function CrmPage() {
  const { supabase, workspaceId } = await getWorkspaceContext()
  const emma = getAgent('emma')

  const { data } = await supabase
    .from('contacts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  const contacts = (data ?? []) as Contact[]
  const aRelancer = contacts.filter((c) => needsFollowUp(c))
  const autres = contacts.filter((c) => !needsFollowUp(c))

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <AgentAvatar agent={emma} size="lg" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Emma — Suivi client</h1>
          <p className="text-gray-600 text-sm mt-1">« {emma.presentation} » Elle signale les contacts sans échange depuis {RELANCE_DELAI_JOURS} jours ; vous relancez.</p>
        </div>
      </div>

      <section className="mb-10" aria-labelledby="relances">
        <h2 id="relances" className="text-lg font-semibold text-gray-900 mb-3">À relancer ({aRelancer.length})</h2>
        <ContactList contacts={aRelancer} emptyText="Aucune relance en retard. Emma vous prévient dès qu'un contact reste sans nouvelles." />
      </section>

      <section className="mb-10" aria-labelledby="pipeline">
        <h2 id="pipeline" className="text-lg font-semibold text-gray-900 mb-3">Contacts suivis ({autres.length})</h2>
        <ContactList contacts={autres} emptyText="Ajoutez votre premier contact ci-dessous." />
      </section>

      <section aria-labelledby="ajout" className="rounded-xl border border-border bg-white p-5">
        <h2 id="ajout" className="text-lg font-semibold text-gray-900 mb-3">Ajouter un contact</h2>
        <ContactForm />
      </section>
    </div>
  )
}

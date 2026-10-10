import { markContacted, updateStatut } from '@/app/(dashboard)/crm/actions'
import { needsFollowUp } from '@/lib/workspace'
import { formatDate } from '@/lib/utils'
import type { Contact } from '@/types'

export const STATUT_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  qualification: 'Qualification',
  visite: 'Visite',
  offre: 'Offre',
  compromis: 'Compromis',
  acte: 'Acte signé',
  perdu: 'Perdu',
}

const TYPE_LABELS: Record<string, string> = {
  acheteur: 'Acheteur', vendeur: 'Vendeur', bailleur: 'Bailleur', locataire: 'Locataire',
}

export function ContactList({ contacts, emptyText }: { contacts: Contact[]; emptyText: string }) {
  if (contacts.length === 0) {
    return <p className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-6 text-sm text-gray-600">{emptyText}</p>
  }
  return (
    <ul className="space-y-3">
      {contacts.map((c) => {
        const relance = needsFollowUp(c)
        return (
          <li key={c.id} className="rounded-xl border border-border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{c.prenom} {c.nom}</p>
                <p className="text-sm text-gray-600">
                  {TYPE_LABELS[c.type_contact]}
                  {c.email ? ` · ${c.email}` : ''}
                  {c.telephone ? ` · ${c.telephone}` : ''}
                </p>
                {c.notes && <p className="mt-1 text-sm text-gray-700">{c.notes}</p>}
                <p className="mt-1 text-xs text-gray-500">
                  Dernier échange : {c.last_contact_at ? formatDate(c.last_contact_at) : 'aucun'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {relance && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-900">À relancer</span>
                )}
                <form action={updateStatut} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <select name="statut_pipeline" defaultValue={c.statut_pipeline} aria-label="Étape du dossier"
                    className="rounded-lg border border-input bg-white px-2 py-2 text-sm min-h-[40px]">
                    {Object.entries(STATUT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <button type="submit" className="rounded-lg border border-input bg-white px-3 py-2 text-sm min-h-[40px] hover:bg-gray-100">OK</button>
                </form>
                <form action={markContacted}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white min-h-[40px] hover:bg-blue-700">
                    Marquer comme relancé
                  </button>
                </form>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

import { addContact } from '@/app/(dashboard)/crm/actions'
import type { ContactType } from '@/types'

const inputCls = 'w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-ring'

export function ContactForm({ defaultType = 'acheteur', lockType = false }: { defaultType?: ContactType; lockType?: boolean }) {
  return (
    <form action={addContact} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input name="prenom" required maxLength={80} placeholder="Prénom" aria-label="Prénom" className={inputCls} />
      <input name="nom" required maxLength={80} placeholder="Nom" aria-label="Nom" className={inputCls} />
      <input name="email" type="email" maxLength={200} placeholder="E-mail" aria-label="E-mail" className={inputCls} />
      <input name="telephone" maxLength={30} placeholder="Téléphone" aria-label="Téléphone" className={inputCls} />
      {lockType ? (
        <input type="hidden" name="type_contact" value={defaultType} />
      ) : (
        <select name="type_contact" defaultValue={defaultType} aria-label="Type de contact" className={inputCls}>
          <option value="acheteur">Acheteur</option>
          <option value="vendeur">Vendeur</option>
          <option value="bailleur">Bailleur</option>
          <option value="locataire">Locataire</option>
        </select>
      )}
      <input name="notes" maxLength={1000} placeholder="Note (projet, origine du contact…)" aria-label="Note" className={inputCls} />
      <button type="submit" className="sm:col-span-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white min-h-[44px] hover:bg-blue-700 transition-colors">
        Ajouter le contact
      </button>
    </form>
  )
}

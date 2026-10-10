'use server'

import { revalidatePath } from 'next/cache'
import { getWorkspaceContext } from '@/lib/workspace'
import type { ContactType, StatutPipeline } from '@/types'

const TYPES: ContactType[] = ['acheteur', 'vendeur', 'bailleur', 'locataire']
const STATUTS: StatutPipeline[] = ['prospect', 'qualification', 'visite', 'offre', 'compromis', 'acte', 'perdu']

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max)

export async function addContact(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext()

  const prenom = clean(formData.get('prenom'), 80)
  const nom = clean(formData.get('nom'), 80)
  const type = clean(formData.get('type_contact'), 20) as ContactType
  if (!prenom || !nom || !TYPES.includes(type)) return

  await supabase.from('contacts').insert({
    workspace_id: workspaceId,
    created_by: user.id,
    prenom,
    nom,
    email: clean(formData.get('email'), 200) || null,
    telephone: clean(formData.get('telephone'), 30) || null,
    type_contact: type,
    statut_pipeline: 'prospect',
    notes: clean(formData.get('notes'), 1000) || null,
  })

  revalidatePath('/crm')
  revalidatePath('/vendeurs')
  revalidatePath('/dashboard')
  revalidatePath('/validation')
}

export async function markContacted(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext()
  const id = clean(formData.get('id'), 64)
  if (!id) return

  await supabase
    .from('contacts')
    .update({ last_contact_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  revalidatePath('/crm')
  revalidatePath('/vendeurs')
  revalidatePath('/dashboard')
  revalidatePath('/validation')
}

export async function updateStatut(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext()
  const id = clean(formData.get('id'), 64)
  const statut = clean(formData.get('statut_pipeline'), 20) as StatutPipeline
  if (!id || !STATUTS.includes(statut)) return

  await supabase
    .from('contacts')
    .update({ statut_pipeline: statut })
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  revalidatePath('/crm')
  revalidatePath('/vendeurs')
  revalidatePath('/dashboard')
  revalidatePath('/validation')
}

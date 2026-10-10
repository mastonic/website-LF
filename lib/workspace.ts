import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Contexte authentifié : client Supabase, utilisateur et espace de travail. */
export async function getWorkspaceContext() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()
  if (!member) redirect('/login')

  return { supabase, user, workspaceId: member.workspace_id as string }
}

export const RELANCE_DELAI_JOURS = 7

/** Un contact est à relancer s'il est actif et sans échange depuis le délai fixé. */
export function needsFollowUp(
  c: { statut_pipeline: string; last_contact_at: string | null; created_at: string },
  now: Date = new Date()
): boolean {
  if (c.statut_pipeline === 'perdu' || c.statut_pipeline === 'acte') return false
  const ref = new Date(c.last_contact_at ?? c.created_at).getTime()
  return now.getTime() - ref >= RELANCE_DELAI_JOURS * 24 * 60 * 60 * 1000
}

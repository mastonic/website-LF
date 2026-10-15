import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Contexte authentifié pour les routes API : utilisateur + espace de travail. */
export async function getApiContext() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) } as const

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()
  if (!member) return { error: NextResponse.json({ error: 'Espace de travail introuvable' }, { status: 404 }) } as const

  return { supabase, user, workspaceId: member.workspace_id as string } as const
}

/** Décompte atomique du quota mensuel. Retourne une réponse 429 si épuisé. */
export async function consumeQuota(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string
): Promise<NextResponse | null> {
  const { data: ok, error } = await supabase.rpc('increment_ai_quota', { workspace_id_input: workspaceId })
  if (error) return NextResponse.json({ error: 'Quota indisponible, réessayez.' }, { status: 500 })
  if (!ok) return NextResponse.json({ error: 'Quota mensuel épuisé.' }, { status: 429 })
  return null
}

export async function loadMarque(supabase: ReturnType<typeof createClient>, workspaceId: string) {
  const { data } = await supabase
    .from('brand_identity')
    .select('nom_affiche, signature, charte')
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  return {
    nom: (data?.nom_affiche as string | null) ?? null,
    signature: (data?.signature as string | null) ?? null,
    charte: (data?.charte as string | null) ?? null,
  }
}

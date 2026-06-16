import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAnnonce } from '@/lib/claude'
import type { AnnonceGenerateInput } from '@/types'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()
    if (!member) return NextResponse.json({ error: 'Workspace introuvable' }, { status: 404 })

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, ai_quota_used, ai_quota_limit')
      .eq('id', member.workspace_id)
      .single()
    if (!workspace) return NextResponse.json({ error: 'Workspace introuvable' }, { status: 404 })

    if (workspace.ai_quota_used >= workspace.ai_quota_limit) {
      return NextResponse.json({ error: 'Quota IA épuisé. Upgradez votre plan.' }, { status: 429 })
    }

    const body = (await request.json()) as AnnonceGenerateInput & { annonce_id?: string }
    const { annonce_id, ...input } = body

    const result = await generateAnnonce(input)

    if (annonce_id) {
      await supabase.from('annonces').update({
        titre: result.titre,
        description_longue: result.description_longue,
        description_courte: result.description_courte,
        description_en: result.description_en,
        tokens_used: result.tokens_used,
      }).eq('id', annonce_id)
    } else {
      await supabase.from('annonces').insert({
        workspace_id: member.workspace_id,
        created_by: user.id,
        ...input,
        titre: result.titre,
        description_longue: result.description_longue,
        description_courte: result.description_courte,
        description_en: result.description_en,
        tokens_used: result.tokens_used,
      })
    }

    await supabase.from('workspaces').update({
      ai_quota_used: workspace.ai_quota_used + 1,
    }).eq('id', member.workspace_id)

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

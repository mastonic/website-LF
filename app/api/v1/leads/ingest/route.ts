import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { scoreLeadIA } from '@/lib/claude'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token Bearer manquant' }, { status: 401 })
    }
    const apiKey = authHeader.slice(7)

    const supabase = createServiceClient()
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('api_key', apiKey)
      .single()

    if (!workspace) return NextResponse.json({ error: 'Clé API invalide' }, { status: 401 })

    const body = await request.json()
    const conversation = body.conversation ?? JSON.stringify(body)
    const scoring = await scoreLeadIA(conversation)

    const { data: lead } = await supabase.from('leads').insert({
      workspace_id: workspace.id,
      prenom: body.prenom,
      nom: body.nom,
      email: body.email,
      telephone: body.telephone,
      budget_min: body.budget_min,
      budget_max: body.budget_max,
      type_recherche: body.type_recherche,
      delai_projet: body.delai_projet,
      score: scoring.score,
      score_detail: scoring.detail,
      resume_ia: scoring.resume,
      source: 'api',
    }).select().single()

    return NextResponse.json({ success: true, lead_id: lead?.id, score: scoring.score })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur' }, { status: 500 })
  }
}

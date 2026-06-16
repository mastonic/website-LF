import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { scoreLeadIA } from '@/lib/claude'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Tu es un assistant immobilier virtuel friendly et professionnel.
Tu qualifies les visiteurs qui s'intéressent à des biens immobiliers.
Tu dois collecter naturellement dans la conversation :
1. Le type de bien recherché (appartement, maison, etc.)
2. La localisation souhaitée
3. Le budget (fourchette)
4. Le délai du projet (urgent, 3 mois, 6 mois, plus d'un an)
5. Les coordonnées (prénom, nom, email ou téléphone)

Sois naturel et chaleureux. Pose une question à la fois.
Ne demande pas toutes les informations d'un coup.
Réponds en français sauf si l'utilisateur écrit dans une autre langue.
Quand tu as collecté suffisamment d'informations, conclus en proposant un rendez-vous.`

export async function POST(request: Request) {
  try {
    const { api_key, messages, session_id } = await request.json() as {
      api_key: string
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
      session_id?: string
    }

    const supabase = createServiceClient()
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('api_key', api_key)
      .single()

    if (!workspace) return NextResponse.json({ error: 'Clé API invalide' }, { status: 401 })

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages,
    })

    const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : ''

    const allMessages = [...messages, { role: 'assistant' as const, content: assistantMessage }]

    const isEnough = allMessages.filter(m => m.role === 'user').length >= 4
    if (isEnough && session_id) {
      const conversation = allMessages.map(m => `${m.role === 'user' ? 'Visiteur' : 'Assistant'}: ${m.content}`).join('\n')
      const scoring = await scoreLeadIA(conversation)

      await supabase.from('leads').upsert({
        id: session_id,
        workspace_id: workspace.id,
        score: scoring.score,
        score_detail: scoring.detail,
        resume_ia: scoring.resume,
        source: 'widget',
      }, { onConflict: 'id', ignoreDuplicates: false })
    }

    return NextResponse.json({ message: assistantMessage })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { scoreLeadIA } from '@/lib/claude'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'

// Limite les messages pour éviter le prompt injection et l'abus de tokens
const MAX_MESSAGES = 20
const MAX_MESSAGE_LENGTH = 500

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
    const body = await request.json()

    // ── Auth : api_key en Authorization header (pas dans le body) ────────────
    const authHeader = request.headers.get('authorization')
    const apiKey: string =
      authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : (body.api_key as string | undefined) ?? '' // rétro-compat temporaire widget

    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API manquante' }, { status: 401 })
    }

    const { messages: rawMessages, session_id } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
      session_id?: string
    }

    // ── Validation des messages ───────────────────────────────────────────────
    if (!Array.isArray(rawMessages)) {
      return NextResponse.json({ error: 'Messages invalides' }, { status: 400 })
    }

    const messages = rawMessages
      .slice(-MAX_MESSAGES) // limite la taille de la fenêtre de contexte
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role,
        content: String(m.content).slice(0, MAX_MESSAGE_LENGTH),
      }))

    const supabase = createServiceClient()

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('api_key', apiKey)
      .single()

    if (!workspace) {
      return NextResponse.json({ error: 'Clé API invalide' }, { status: 401 })
    }

    // ── Appel Claude ─────────────────────────────────────────────────────────
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages,
    })

    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : ''

    const allMessages = [
      ...messages,
      { role: 'assistant' as const, content: assistantMessage },
    ]

    // ── Persist messages + scoring après 4 échanges utilisateur ──────────────
    const userTurnCount = allMessages.filter((m) => m.role === 'user').length

    if (session_id && userTurnCount >= 4) {
      const conversationText = allMessages
        .map((m) => `${m.role === 'user' ? 'Visiteur' : 'Assistant'}: ${m.content}`)
        .join('\n')

      // Score + extraction des coordonnées en un seul appel IA
      const scoring = await scoreLeadIA(conversationText)

      // Upsert lead avec toutes les infos extraites
      await supabase.from('leads').upsert(
        {
          id: session_id,
          workspace_id: workspace.id,
          prenom: scoring.contact.prenom ?? null,
          nom: scoring.contact.nom ?? null,
          email: scoring.contact.email ?? null,
          telephone: scoring.contact.telephone ?? null,
          budget_min: scoring.contact.budget_min ?? null,
          budget_max: scoring.contact.budget_max ?? null,
          type_recherche: scoring.contact.type_recherche ?? null,
          delai_projet: scoring.contact.delai_projet ?? null,
          score: scoring.score,
          score_detail: scoring.detail,
          resume_ia: scoring.resume,
          source: 'widget',
        },
        { onConflict: 'id' }
      )

      // Persist les messages dans lead_messages
      const messageRows = allMessages.map((m) => ({
        lead_id: session_id,
        workspace_id: workspace.id,
        role: m.role,
        content: m.content,
      }))

      // Évite les doublons : on supprime puis reinsère
      await supabase.from('lead_messages').delete().eq('lead_id', session_id)
      await supabase.from('lead_messages').insert(messageRows)
    }

    return NextResponse.json({ message: assistantMessage })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur' },
      { status: 500 }
    )
  }
}

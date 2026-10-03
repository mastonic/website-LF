import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { scoreLeadIA } from '@/lib/claude'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'

// Limite les messages pour éviter le prompt injection et l'abus de tokens
const MAX_MESSAGES = 20
const MAX_MESSAGE_LENGTH = 500

const BASE_SYSTEM_PROMPT = `Tu es un assistant immobilier virtuel friendly et professionnel pour l'agence {AGENCY_NAME}.
Tu aides les visiteurs à trouver un bien et tu qualifies leur projet.

{LISTINGS_SECTION}

Tes objectifs dans la conversation :
1. Comprendre ce que cherche le visiteur (type de bien, localisation, budget, délai)
2. Si un bien du catalogue correspond, le mentionner naturellement avec ses caractéristiques réelles
3. Collecter les coordonnées (prénom, nom, email ou téléphone) pour qu'un agent rappelle

Règles importantes :
- Pose une seule question à la fois, sois naturel et chaleureux
- Ne mentionne que des biens qui existent dans le catalogue ci-dessus
- Si aucun bien ne correspond exactement, propose de chercher d'autres options et collecte les critères
- Réponds en français sauf si l'utilisateur écrit dans une autre langue
- Quand tu as les coordonnées, conclus en proposant un rendez-vous ou un rappel`

interface Annonce {
  id: string
  titre: string | null
  type_bien: string
  surface: number | null
  pieces: number | null
  localisation: string | null
  prix: number | null
  equipements: string[] | null
  description_courte: string | null
  reference_mandat: string | null
}

function formatListingsForPrompt(annonces: Annonce[]): string {
  if (annonces.length === 0) {
    return 'CATALOGUE : Aucun bien actuellement publié. Collecte les critères du visiteur pour lui proposer une recherche personnalisée.'
  }

  const lines = annonces.map((a, i) => {
    const parts = [
      `${i + 1}. ${a.titre ?? a.type_bien}`,
      a.type_bien,
      a.surface ? `${a.surface} m²` : null,
      a.pieces ? `${a.pieces} pièce${a.pieces > 1 ? 's' : ''}` : null,
      a.localisation ?? null,
      a.prix ? `${a.prix.toLocaleString('fr-FR')} €` : null,
      a.equipements?.length ? a.equipements.slice(0, 4).join(', ') : null,
      a.reference_mandat ? `réf. ${a.reference_mandat}` : null,
    ].filter(Boolean)
    return `  ${parts.join(' | ')}`
  })

  return `CATALOGUE DES BIENS DISPONIBLES (${annonces.length} bien${annonces.length > 1 ? 's' : ''}) :\n${lines.join('\n')}\n\nUtilise uniquement ces biens quand tu réponds aux questions sur les disponibilités.`
}

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

    // ── Chargement des annonces publiées du workspace ─────────────────────────
    const { data: annonces } = await supabase
      .from('annonces')
      .select('id, titre, type_bien, surface, pieces, localisation, prix, equipements, description_courte, reference_mandat')
      .eq('workspace_id', workspace.id)
      .eq('statut', 'publie')
      .order('created_at', { ascending: false })
      .limit(25)

    const listingsSection = formatListingsForPrompt((annonces ?? []) as Annonce[])
    const systemPrompt = BASE_SYSTEM_PROMPT
      .replace('{AGENCY_NAME}', workspace.name)
      .replace('{LISTINGS_SECTION}', listingsSection)

    // ── Appel Claude ─────────────────────────────────────────────────────────
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: systemPrompt,
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

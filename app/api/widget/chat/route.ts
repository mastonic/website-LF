import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { scoreLeadIA } from '@/lib/claude'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'

const MAX_MESSAGES = 20
const MAX_MESSAGE_LENGTH = 500

// ── Limites RAG par plan ──────────────────────────────────────────────────────
const RAG_LIMITS: Record<string, number> = {
  trial:   20,
  starter: 20,
  pro:     50,
  agence:  100,
}

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

// ── Filtre les annonces les plus pertinentes selon la conversation ─────────────
// Priorité : correspondance mot-clé sur type_bien et localisation dans les derniers messages
function rankAnnonces(annonces: Annonce[], messages: Array<{ role: string; content: string }>): Annonce[] {
  if (messages.length === 0) return annonces

  const recentUserText = messages
    .filter((m) => m.role === 'user')
    .slice(-3)
    .map((m) => m.content.toLowerCase())
    .join(' ')

  if (!recentUserText) return annonces

  const scored = annonces.map((a) => {
    let score = 0
    const haystack = [
      a.type_bien,
      a.localisation ?? '',
      a.titre ?? '',
    ].join(' ').toLowerCase()

    // Bonus si le type de bien est mentionné
    if (recentUserText.includes(a.type_bien.toLowerCase())) score += 3

    // Bonus par mot de la localisation trouvé dans la conversation
    if (a.localisation) {
      for (const word of a.localisation.toLowerCase().split(/[\s,]+/)) {
        if (word.length > 3 && recentUserText.includes(word)) score += 2
      }
    }

    // Bonus si budget mentionné est dans la fourchette ±30%
    const budgetMatch = recentUserText.match(/(\d[\d\s]*)\s*(€|euros?|k€|000)/i)
    if (budgetMatch && a.prix) {
      const mentioned = parseInt(budgetMatch[1].replace(/\s/g, '')) * (budgetMatch[2].toLowerCase().startsWith('k') ? 1000 : 1)
      if (mentioned > 0 && Math.abs(a.prix - mentioned) / a.prix < 0.3) score += 4
    }

    // Bonus nombre de pièces si mentionné
    const piecesMatch = recentUserText.match(/(\d)\s*(pièces?|chambres?|p\b)/i)
    if (piecesMatch && a.pieces) {
      if (parseInt(piecesMatch[1]) === a.pieces) score += 2
    }

    return { annonce: a, score }
  })

  return scored.sort((a, b) => b.score - a.score).map((s) => s.annonce)
}

function formatListingsForPrompt(annonces: Annonce[], plan: string): string {
  const limit = RAG_LIMITS[plan] ?? 20
  const limited = annonces.slice(0, limit)

  if (limited.length === 0) {
    return 'CATALOGUE : Aucun bien actuellement publié. Collecte les critères du visiteur pour lui proposer une recherche personnalisée.'
  }

  const planNote = annonces.length > limit
    ? ` (top ${limit} les plus pertinents — plan ${plan})`
    : ''

  const lines = limited.map((a, i) => {
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

  return `CATALOGUE DES BIENS DISPONIBLES (${limited.length} bien${limited.length > 1 ? 's' : ''}${planNote}) :\n${lines.join('\n')}\n\nUtilise uniquement ces biens quand tu réponds aux questions sur les disponibilités.`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization')
    const apiKey: string =
      authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : (body.api_key as string | undefined) ?? ''

    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API manquante' }, { status: 401 })
    }

    const { messages: rawMessages, session_id } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
      session_id?: string
    }

    if (!Array.isArray(rawMessages)) {
      return NextResponse.json({ error: 'Messages invalides' }, { status: 400 })
    }

    const messages = rawMessages
      .slice(-MAX_MESSAGES)
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role,
        content: String(m.content).slice(0, MAX_MESSAGE_LENGTH),
      }))

    const supabase = createServiceClient()

    // ── Workspace + plan ──────────────────────────────────────────────────────
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name, plan')
      .eq('api_key', apiKey)
      .single()

    if (!workspace) {
      return NextResponse.json({ error: 'Clé API invalide' }, { status: 401 })
    }

    // ── RAG : annonces publiées, classées par pertinence, limitées par plan ───
    const ragLimit = RAG_LIMITS[workspace.plan] ?? 20

    const { data: rawAnnonces } = await supabase
      .from('annonces')
      .select('id, titre, type_bien, surface, pieces, localisation, prix, equipements, description_courte, reference_mandat')
      .eq('workspace_id', workspace.id)
      .eq('statut', 'publie')
      .order('updated_at', { ascending: false })
      .limit(ragLimit * 3) // on charge 3× pour pouvoir re-classer

    const annonces = (rawAnnonces ?? []) as Annonce[]
    const ranked = rankAnnonces(annonces, messages)
    const listingsSection = formatListingsForPrompt(ranked, workspace.plan)

    const systemPrompt = BASE_SYSTEM_PROMPT
      .replace('{AGENCY_NAME}', workspace.name)
      .replace('{LISTINGS_SECTION}', listingsSection)

    // ── Appel Claude ──────────────────────────────────────────────────────────
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

    // ── Scoring + persist après 4 échanges ────────────────────────────────────
    const userTurnCount = allMessages.filter((m) => m.role === 'user').length

    if (session_id && userTurnCount >= 4) {
      const conversationText = allMessages
        .map((m) => `${m.role === 'user' ? 'Visiteur' : 'Assistant'}: ${m.content}`)
        .join('\n')

      const scoring = await scoreLeadIA(conversationText)

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
          source: 'chatbot',
        },
        { onConflict: 'id' }
      )

      const messageRows = allMessages.map((m) => ({
        lead_id: session_id,
        workspace_id: workspace.id,
        role: m.role,
        content: m.content,
      }))

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

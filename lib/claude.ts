import Anthropic from '@anthropic-ai/sdk'
import type { AnnonceGenerateInput, AnnonceGenerateOutput, AnnonceTon } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-sonnet-4-6'

const TON_DESCRIPTIONS: Record<AnnonceTon, string> = {
  standard: 'professionnel et neutre, adapté à tous les acquéreurs',
  luxe: 'raffiné et haut de gamme, vocabulaire premium, évoque prestige et exclusivité',
  familial: 'chaleureux et pratique, met en avant la vie de famille, la proximité des écoles',
  investisseur: 'orienté rentabilité, met en avant le rendement, les charges et le potentiel locatif',
}

// ─── Extraction JSON robuste (supporte les markdown fences) ──────────────────
function extractJSON(text: string): unknown {
  // Retire les blocs ```json ... ``` ou ``` ... ```
  const stripped = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim()
  const jsonMatch = stripped.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Réponse IA invalide — JSON non trouvé')
  return JSON.parse(jsonMatch[0])
}

// ─── Module 1 : Générateur d'annonces ────────────────────────────────────────
export async function generateAnnonce(
  input: AnnonceGenerateInput
): Promise<AnnonceGenerateOutput & { tokens_used: number }> {
  const equipementsStr =
    input.equipements?.length ? input.equipements.join(', ') : 'non précisés'

  const systemPrompt = `Tu es un expert en rédaction d'annonces immobilières françaises, avec 15 ans d'expérience.
Tu maîtrises parfaitement le SEO immobilier, les techniques de copywriting et le marché français.
Tu génères des annonces qui convertissent, en respectant scrupuleusement le ton demandé.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans commentaire.`

  const userPrompt = `Génère une annonce immobilière complète pour ce bien :
- Type : ${input.type_bien}
- Surface : ${input.surface ? `${input.surface} m²` : 'non précisée'}
- Pièces : ${input.pieces ?? 'non précisé'}
- Localisation : ${input.localisation ?? 'non précisée'}
- Prix : ${input.prix ? `${input.prix.toLocaleString('fr-FR')} €` : 'non précisé'}
- Équipements : ${equipementsStr}
- Points forts : ${input.points_forts ?? 'non précisés'}
- Ton : ${TON_DESCRIPTIONS[input.ton]}
${input.ton === 'investisseur' && input.donnees_investissement ? `- Données investissement : ${JSON.stringify(input.donnees_investissement)}` : ''}

Retourne ce JSON exact (sans markdown) :
{
  "titre": "titre accrocheur de 60-80 caractères max",
  "description_longue": "description complète SEO de 300-500 mots avec mots-clés naturels",
  "description_courte": "version réseaux sociaux de 100-150 mots, punchy",
  "description_en": "traduction anglaise du titre et description_courte réunis (150-200 mots)"
}`

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const rawText =
    message.content[0].type === 'text' ? message.content[0].text : ''
  const parsed = extractJSON(rawText) as AnnonceGenerateOutput
  const tokens_used =
    message.usage.input_tokens + message.usage.output_tokens

  return { ...parsed, tokens_used }
}

// ─── Module 2 : Scoring lead ──────────────────────────────────────────────────
const VALID_SCORES = ['chaud', 'tiede', 'froid'] as const
type LeadScore = (typeof VALID_SCORES)[number]

interface LeadScoringResult {
  score: LeadScore
  detail: string
  resume: string
  contact: {
    prenom?: string
    nom?: string
    email?: string
    telephone?: string
    budget_min?: number
    budget_max?: number
    type_recherche?: string
    delai_projet?: string
  }
}

export async function scoreLeadIA(conversation: string): Promise<LeadScoringResult> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: `Tu es un expert en qualification de leads immobiliers.
Analyse la conversation, détermine la qualité du lead ET extrais les informations de contact.
Réponds UNIQUEMENT en JSON valide, sans markdown.`,
    messages: [
      {
        role: 'user',
        content: `Voici la conversation avec un prospect :\n\n${conversation}\n\nRetourne ce JSON exact :
{
  "score": "chaud|tiede|froid",
  "detail": "explication en 1 phrase",
  "resume": "résumé du prospect en 2-3 phrases pour l'agent",
  "contact": {
    "prenom": "prénom si mentionné, sinon null",
    "nom": "nom de famille si mentionné, sinon null",
    "email": "email si mentionné, sinon null",
    "telephone": "téléphone si mentionné, sinon null",
    "budget_min": nombre ou null,
    "budget_max": nombre ou null,
    "type_recherche": "type de bien recherché ou null",
    "delai_projet": "délai du projet ou null"
  }
}`,
      },
    ],
  })

  const rawText =
    message.content[0].type === 'text' ? message.content[0].text : ''
  const parsed = extractJSON(rawText) as LeadScoringResult

  // Validation stricte du score
  if (!VALID_SCORES.includes(parsed.score)) {
    parsed.score = 'tiede' // fallback sûr
  }

  return parsed
}

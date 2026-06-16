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

export async function generateAnnonce(input: AnnonceGenerateInput): Promise<AnnonceGenerateOutput & { tokens_used: number }> {
  const equipementsStr = input.equipements?.length
    ? input.equipements.join(', ')
    : 'non précisés'

  const systemPrompt = `Tu es un expert en rédaction d'annonces immobilières françaises, avec 15 ans d'expérience.
Tu maîtrises parfaitement le SEO immobilier, les techniques de copywriting et le marché français.
Tu génères des annonces qui convertissent, en respectant scrupuleusement le ton demandé.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans commentaire.`

  const userPrompt = `Génère une annonce immobilière complète pour ce bien :
- Type : ${input.type_bien}
- Surface : ${input.surface ? `${input.surface} m²` : 'non précisée'}
- Pièces : ${input.pieces ?? 'non précisé'}
- Localisation : ${input.localisation ?? 'non précisée'}
- Équipements : ${equipementsStr}
- Points forts : ${input.points_forts ?? 'non précisés'}
- Ton : ${TON_DESCRIPTIONS[input.ton]}

Retourne ce JSON exact :
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

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Réponse IA invalide — JSON non trouvé')

  const parsed = JSON.parse(jsonMatch[0]) as AnnonceGenerateOutput
  const tokens_used = message.usage.input_tokens + message.usage.output_tokens

  return { ...parsed, tokens_used }
}

export async function scoreLeadIA(conversation: string): Promise<{ score: 'chaud' | 'tiede' | 'froid'; detail: string; resume: string }> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: `Tu es un expert en qualification de leads immobiliers.
Analyse la conversation et détermine la qualité du lead.
Réponds UNIQUEMENT en JSON.`,
    messages: [{
      role: 'user',
      content: `Voici la conversation avec un prospect :\n\n${conversation}\n\nRetourne ce JSON :\n{"score":"chaud|tiede|froid","detail":"explication 1 phrase","resume":"résumé du prospect en 2-3 phrases pour l'agent"}`,
    }],
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Réponse IA invalide')
  return JSON.parse(jsonMatch[0])
}

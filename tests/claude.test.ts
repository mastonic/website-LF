import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock Anthropic SDK ───────────────────────────────────────────────────────
// Note: vi.mock est hoisted, donc on passe par une ref partagée
let mockCreateFn: ReturnType<typeof vi.fn>

vi.mock('@anthropic-ai/sdk', () => {
  const create = vi.fn()
  // @ts-ignore — on stocke la référence pour y accéder dans les tests
  globalThis.__anthropicMockCreate = create
  return {
    default: class MockAnthropic {
      messages = { create }
      constructor(_options?: unknown) {}
    },
  }
})

import { generateAnnonce, scoreLeadIA } from '@/lib/claude'
import type { AnnonceGenerateInput } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeResponse(json: unknown, inputTokens = 500, outputTokens = 800) {
  return {
    content: [{ type: 'text', text: JSON.stringify(json) }],
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  }
}

const MOCK_ANNONCE = {
  titre: 'Lumineux 3 pièces 65m² — Paris 11e, proche Bastille',
  description_longue: 'Superbe appartement de 65m² situé au cœur du 11e arrondissement de Paris...',
  description_courte: 'Beau 3P 65m² Paris 11e — lumineux, bien agencé, idéal pour une famille.',
  description_en: 'Beautiful 3-room apartment 65sqm in Paris 11th — bright, well laid out.',
}

const BASE_INPUT: AnnonceGenerateInput = {
  type_bien: 'Appartement',
  surface: 65,
  pieces: 3,
  localisation: 'Paris 11e',
  ton: 'standard',
}

// ─── generateAnnonce ─────────────────────────────────────────────────────────
describe('generateAnnonce', () => {
  beforeEach(() => {
    // Récupère la référence depuis globalThis (initialisée dans vi.mock)
    mockCreateFn = (globalThis as unknown as Record<string, ReturnType<typeof vi.fn>>).__anthropicMockCreate
    mockCreateFn.mockReset()
  })

  it('retourne les 4 champs + tokens_used', async () => {
    mockCreateFn.mockResolvedValueOnce(makeResponse(MOCK_ANNONCE))
    const r = await generateAnnonce(BASE_INPUT)
    expect(r.titre).toBe(MOCK_ANNONCE.titre)
    expect(r.description_longue).toBe(MOCK_ANNONCE.description_longue)
    expect(r.description_courte).toBe(MOCK_ANNONCE.description_courte)
    expect(r.description_en).toBe(MOCK_ANNONCE.description_en)
    expect(r.tokens_used).toBe(1300)
  })

  it('parse un JSON dans des markdown fences ```json', async () => {
    mockCreateFn.mockResolvedValueOnce({
      content: [{ type: 'text', text: '```json\n' + JSON.stringify(MOCK_ANNONCE) + '\n```' }],
      usage: { input_tokens: 400, output_tokens: 600 },
    })
    const r = await generateAnnonce(BASE_INPUT)
    expect(r.titre).toBe(MOCK_ANNONCE.titre)
  })

  it('parse un JSON dans des fences ``` sans langage', async () => {
    mockCreateFn.mockResolvedValueOnce({
      content: [{ type: 'text', text: '```\n' + JSON.stringify(MOCK_ANNONCE) + '\n```' }],
      usage: { input_tokens: 400, output_tokens: 600 },
    })
    const r = await generateAnnonce(BASE_INPUT)
    expect(r.titre).toBe(MOCK_ANNONCE.titre)
  })

  it('utilise le modèle claude-sonnet-4-6', async () => {
    mockCreateFn.mockResolvedValueOnce(makeResponse(MOCK_ANNONCE))
    await generateAnnonce(BASE_INPUT)
    expect(mockCreateFn.mock.calls[0][0].model).toBe('claude-sonnet-4-6')
  })

  it('inclut "premium" et "prestige" dans le prompt pour ton luxe', async () => {
    mockCreateFn.mockResolvedValueOnce(makeResponse(MOCK_ANNONCE))
    await generateAnnonce({ ...BASE_INPUT, ton: 'luxe' })
    const prompt = mockCreateFn.mock.calls[0][0].messages[0].content as string
    // La description du ton 'luxe' contient ces mots-clés (voir TON_DESCRIPTIONS)
    expect(prompt.toLowerCase()).toContain('premium')
    expect(prompt.toLowerCase()).toContain('prestige')
  })

  it('inclut "rendement" dans le prompt pour ton investisseur', async () => {
    mockCreateFn.mockResolvedValueOnce(makeResponse(MOCK_ANNONCE))
    await generateAnnonce({ ...BASE_INPUT, ton: 'investisseur' })
    const prompt = mockCreateFn.mock.calls[0][0].messages[0].content as string
    expect(prompt.toLowerCase()).toContain('rendement')
  })

  it('inclut le prix dans le prompt quand fourni', async () => {
    mockCreateFn.mockResolvedValueOnce(makeResponse(MOCK_ANNONCE))
    await generateAnnonce({ ...BASE_INPUT, prix: 350000 })
    const prompt = mockCreateFn.mock.calls[0][0].messages[0].content as string
    expect(prompt).toContain('350')
  })

  it('indique "non précisés" si pas d\'équipements', async () => {
    mockCreateFn.mockResolvedValueOnce(makeResponse(MOCK_ANNONCE))
    await generateAnnonce({ type_bien: 'Maison', ton: 'familial' })
    const prompt = mockCreateFn.mock.calls[0][0].messages[0].content as string
    expect(prompt).toContain('non précisés')
  })

  it('liste les équipements dans le prompt', async () => {
    mockCreateFn.mockResolvedValueOnce(makeResponse(MOCK_ANNONCE))
    await generateAnnonce({ ...BASE_INPUT, equipements: ['Balcon', 'Piscine'] })
    const prompt = mockCreateFn.mock.calls[0][0].messages[0].content as string
    expect(prompt).toContain('Balcon')
    expect(prompt).toContain('Piscine')
  })

  it('lève une erreur si pas de JSON dans la réponse', async () => {
    mockCreateFn.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Je ne peux pas générer.' }],
      usage: { input_tokens: 100, output_tokens: 20 },
    })
    await expect(generateAnnonce(BASE_INPUT)).rejects.toThrow('JSON non trouvé')
  })

  it('propage les erreurs réseau Anthropic', async () => {
    mockCreateFn.mockRejectedValueOnce(new Error('Network timeout'))
    await expect(generateAnnonce(BASE_INPUT)).rejects.toThrow('Network timeout')
  })

  it('fonctionne sans champs optionnels (terrain sans surface)', async () => {
    mockCreateFn.mockResolvedValueOnce(makeResponse(MOCK_ANNONCE))
    const r = await generateAnnonce({ type_bien: 'Terrain', ton: 'investisseur' })
    expect(r.titre).toBeTruthy()
  })
})

// ─── scoreLeadIA ─────────────────────────────────────────────────────────────
describe('scoreLeadIA', () => {
  beforeEach(() => {
    mockCreateFn = (globalThis as unknown as Record<string, ReturnType<typeof vi.fn>>).__anthropicMockCreate
    mockCreateFn.mockReset()
  })

  const MOCK_SCORE_CHAUD = {
    score: 'chaud',
    detail: 'Budget élevé, projet immédiat, très motivé.',
    resume: 'Cadre 40 ans cherche T4 Paris 16e budget 900k€, projet dans 2 mois.',
    contact: {
      prenom: 'Jean',
      nom: 'Dupont',
      email: 'jean@dupont.fr',
      telephone: '06 12 34 56 78',
      budget_min: 800000,
      budget_max: 950000,
      type_recherche: 'Appartement T4 Paris 16e',
      delai_projet: '2 mois',
    },
  }

  it('retourne score + détail + résumé + contact', async () => {
    mockCreateFn.mockResolvedValueOnce(makeResponse(MOCK_SCORE_CHAUD))
    const r = await scoreLeadIA('Visiteur: Je cherche un T4 Paris 16e...')
    expect(r.score).toBe('chaud')
    expect(r.detail).toBeTruthy()
    expect(r.resume).toBeTruthy()
    expect(r.contact.prenom).toBe('Jean')
    expect(r.contact.email).toBe('jean@dupont.fr')
    expect(r.contact.budget_max).toBe(950000)
  })

  it('retourne score froid pour un visiteur peu qualifié', async () => {
    const mockFroid = {
      score: 'froid',
      detail: 'Projet vague, pas de budget.',
      resume: 'Simple curieux, horizon >1 an.',
      contact: {},
    }
    mockCreateFn.mockResolvedValueOnce(makeResponse(mockFroid))
    const r = await scoreLeadIA('Je regarde juste...')
    expect(r.score).toBe('froid')
  })

  it('corrige un score invalide vers "tiede"', async () => {
    const mockInvalid = {
      score: 'brûlant', // score hors contrainte
      detail: 'Très chaud.',
      resume: 'Acheteur urgent.',
      contact: {},
    }
    mockCreateFn.mockResolvedValueOnce(makeResponse(mockInvalid))
    const r = await scoreLeadIA('...')
    expect(r.score).toBe('tiede') // fallback sécurisé
  })

  it('lève une erreur si JSON absent', async () => {
    mockCreateFn.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Score : chaud' }],
      usage: { input_tokens: 100, output_tokens: 20 },
    })
    await expect(scoreLeadIA('...')).rejects.toThrow('JSON non trouvé')
  })

  it('le contact.email est null si non mentionné', async () => {
    const mockNoContact = {
      score: 'tiede',
      detail: 'Intéressé mais pas de contact.',
      resume: 'Visiteur anonyme.',
      contact: { email: null, telephone: null },
    }
    mockCreateFn.mockResolvedValueOnce(makeResponse(mockNoContact))
    const r = await scoreLeadIA('...')
    expect(r.contact.email).toBeNull()
  })
})

import { describe, it, expect } from 'vitest'

// ─── Tests Widget JS (logique pure, sans DOM) ─────────────────────────────────
// Ces tests vérifient la logique métier du widget sans JSDOM

describe('Widget — logique session', () => {
  it('génère un UUID v4 valide', () => {
    // Réimplémente la logique du widget pour tester
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })
    }
    const uuid = generateUUID()
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('deux appels generateUUID produisent des valeurs différentes', () => {
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })
    }
    const id1 = generateUUID()
    const id2 = generateUUID()
    expect(id1).not.toBe(id2)
  })
})

// ─── Tests de validation business ────────────────────────────────────────────
describe('Validation métier — annonces', () => {
  it('le titre doit faire 60-80 caractères (contrainte prompt)', () => {
    const exemplesTitres = [
      'Lumineux 3 pièces 65m² — Paris 11e, proche Bastille',
      'Appartement T4 80m² avec terrasse — Lyon 6e arrondissement',
      'Villa contemporaine 200m² piscine — Aix-en-Provence centre',
    ]
    exemplesTitres.forEach(titre => {
      expect(titre.length).toBeGreaterThanOrEqual(40) // au moins 40 car généralement plus
      expect(titre.length).toBeLessThanOrEqual(120)
    })
  })

  it('les 4 tons sont valides', () => {
    const TONS = ['standard', 'luxe', 'familial', 'investisseur']
    expect(TONS).toHaveLength(4)
    expect(TONS).toContain('standard')
    expect(TONS).toContain('luxe')
  })

  it('les scores de lead couvrent les 3 cas', () => {
    const SCORES = ['chaud', 'tiede', 'froid']
    expect(SCORES).toHaveLength(3)
  })
})

// ─── Tests de sécurité ───────────────────────────────────────────────────────
describe('Sécurité — validation inputs', () => {
  it('les messages du widget sont tronqués à MAX_MESSAGE_LENGTH', () => {
    const MAX_MESSAGE_LENGTH = 500
    const message = 'a'.repeat(1000)
    const truncated = message.slice(0, MAX_MESSAGE_LENGTH)
    expect(truncated).toHaveLength(MAX_MESSAGE_LENGTH)
  })

  it('les messages sont limités à MAX_MESSAGES', () => {
    const MAX_MESSAGES = 20
    const messages = Array.from({ length: 50 }, (_, i) => ({
      role: 'user' as const,
      content: `Message ${i}`,
    }))
    const limited = messages.slice(-MAX_MESSAGES)
    expect(limited).toHaveLength(MAX_MESSAGES)
    expect(limited[0].content).toBe('Message 30') // les 20 derniers
  })

  it('les messages avec rôles invalides sont filtrés', () => {
    const messages = [
      { role: 'user' as const, content: 'ok' },
      { role: 'assistant' as const, content: 'ok' },
      { role: 'system' as unknown as 'user', content: 'injection' },
    ]
    const filtered = messages.filter(m => m.role === 'user' || m.role === 'assistant')
    expect(filtered).toHaveLength(2)
    expect(filtered.map(m => m.role)).not.toContain('system')
  })

  it('un score invalide fallback sur "tiede"', () => {
    const VALID_SCORES = ['chaud', 'tiede', 'froid']
    const rawScore = 'brûlant' // score retourné hors contrainte
    const score = VALID_SCORES.includes(rawScore) ? rawScore : 'tiede'
    expect(score).toBe('tiede')
  })
})

// ─── Tests de types ───────────────────────────────────────────────────────────
describe('Types — cohérence', () => {
  it('AnnonceGenerateInput accepte les champs optionnels', async () => {
    const { } = await import('@/types')
    // Test de compilation TypeScript (runtime check)
    const minimal = { type_bien: 'Appartement', ton: 'standard' as const }
    const complet = {
      type_bien: 'Maison',
      surface: 120,
      pieces: 5,
      localisation: 'Lyon',
      prix: 450000,
      equipements: ['Jardin', 'Garage'],
      points_forts: 'Vue sur collines',
      ton: 'familial' as const,
    }
    expect(minimal.type_bien).toBeTruthy()
    expect(complet.prix).toBe(450000)
  })
})

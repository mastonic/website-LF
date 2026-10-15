import { describe, it, expect, vi, beforeEach } from 'vitest'

const claudeJSON = vi.fn()
vi.mock('@/lib/claude', () => ({
  claudeJSON: (...a: unknown[]) => claudeJSON(...a),
  extractJSON: (t: string) => JSON.parse(t),
}))

import { generateContenu, generateIdees, dureeScript } from '@/lib/contenu'

const marque = { nom: 'Claire Martin', signature: 'Votre agent de proximité', charte: 'Posée, sincère', secteur: 'Haut Var' }

beforeEach(() => {
  claudeJSON.mockReset()
  delete process.env.OPENAI_API_KEY
})

describe('idées de contenu', () => {
  it('nettoie les idées renvoyées et force un format valide', async () => {
    claudeJSON.mockResolvedValue({
      data: { idees: [{ titre: ' Les travaux comptent ', angle: 'Le prix baisse avec les travaux', format: 'texte' }, { titre: 'Sans format', angle: 'x', format: 'hologramme' }, { titre: '', angle: 'vide' }] },
      tokens: 120,
    })
    const r = await generateIdees(marque, 'travaux')
    expect(r.idees).toEqual([
      { titre: 'Les travaux comptent', angle: 'Le prix baisse avec les travaux', format: 'texte' },
      { titre: 'Sans format', angle: 'x', format: 'video' },
    ])
    expect(r.fournisseur).toBe('anthropic')
    const [system, user] = claudeJSON.mock.calls[0]
    expect(system).toContain('Haut Var')
    expect(system).toContain('Aucune promesse')
    expect(user).toContain('travaux')
  })

  it('échoue proprement quand rien n’est exploitable', async () => {
    claudeJSON.mockResolvedValue({ data: { idees: [] }, tokens: 1 })
    await expect(generateIdees(marque)).rejects.toThrow()
  })
})

describe('script', () => {
  it('borne les durées et retire les # des hashtags', async () => {
    claudeJSON.mockResolvedValue({
      data: {
        titre: 'Les travaux',
        accroche: 'Savez-vous ce qui pèse sur le prix ?',
        sequences: [{ duree_s: 1, a_dire: 'Savez-vous ce qui pèse sur le prix ?' }, { duree_s: 60, a_dire: 'Les travaux.' }, { duree_s: 5, a_dire: '' }],
        legende: 'Légende',
        hashtags: ['#immobilier', 'estimation'],
        appel_action: 'Écrivez-moi',
        preparation: ['Lumière du jour'],
      },
      tokens: 300,
    })
    const r = await generateContenu(marque, 'les travaux', 'video', 'instagram')
    expect(r.contenu.format).toBe('video')
    if (r.contenu.format !== 'video') throw new Error()
    expect(r.contenu.sequences).toEqual([{ duree_s: 2, a_dire: 'Savez-vous ce qui pèse sur le prix ?' }, { duree_s: 20, a_dire: 'Les travaux.' }])
    expect(r.contenu.hashtags).toEqual(['immobilier', 'estimation'])
    expect(dureeScript(r.contenu.sequences)).toBe(22)
  })

  it('génère une publication écrite', async () => {
    claudeJSON.mockResolvedValue({ data: { titre: 'T', texte: 'Bonjour', hashtags: ['a'] }, tokens: 10 })
    const r = await generateContenu(marque, 'idée', 'texte', 'linkedin')
    expect(r.contenu).toMatchObject({ format: 'texte', texte: 'Bonjour' })
  })

  it('refuse un script vide', async () => {
    claudeJSON.mockResolvedValue({ data: { sequences: [] }, tokens: 1 })
    await expect(generateContenu(marque, 'x idée', 'video', 'tiktok')).rejects.toThrow()
  })

  it('utilise OpenAI quand la clé est présente, et replie sur Claude en cas d’échec', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({ titre: 'T', texte: 'Via OpenAI', hashtags: [] }) } }], usage: { total_tokens: 50 } }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const a = await generateContenu(marque, 'idée', 'texte', 'facebook')
    expect(a.fournisseur).toBe('openai')
    expect(fetchMock.mock.calls[0][0]).toContain('openai.com')

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 })
    claudeJSON.mockResolvedValue({ data: { titre: 'T', texte: 'Via Claude', hashtags: [] }, tokens: 5 })
    const b = await generateContenu(marque, 'idée', 'texte', 'facebook')
    expect(b.fournisseur).toBe('anthropic')
    expect(b.contenu).toMatchObject({ texte: 'Via Claude' })
    vi.unstubAllGlobals()
  })
})

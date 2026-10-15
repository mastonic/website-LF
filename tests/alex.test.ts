import { describe, it, expect, vi, beforeEach } from 'vitest'

const claudeJSON = vi.fn()
vi.mock('@/lib/claude', () => ({ claudeJSON: (...a: unknown[]) => claudeJSON(...a), extractJSON: (t: string) => JSON.parse(t) }))

import { routeByRules, routeRequest, sanitizeRoute, alexHref } from '@/lib/alex'

beforeEach(() => claudeJSON.mockReset())

describe('Alex : orientation par règles', () => {
  it.each([
    ['Je dois estimer une maison à rénover', 'thomas'],
    ['combien vaut mon appartement ?', 'thomas'],
    ['Rédige-moi une annonce pour mon T3', 'julien'],
    ['j’ai une idée de vidéo pour Instagram', 'chloe'],
    ['Qui dois-je relancer cette semaine ?', 'emma'],
    ['trier mes nouvelles demandes entrantes', 'sophie'],
    ['trouver des vendeurs dans mon secteur', 'victor'],
    ['lire le compromis et les diagnostics', 'hugo'],
  ])('« %s » → %s', (message, agent) => {
    expect(routeByRules(message).agent).toBe(agent)
  })

  it('ne tient pas compte des accents ni de la casse', () => {
    expect(routeByRules('ESTIMATION').agent).toBe('thomas')
    expect(routeByRules('publication réseaux').agent).toBe('chloe')
  })

  it('pose une question quand rien ne correspond', () => {
    const r = routeByRules('bonjour')
    expect(r.agent).toBe('alex')
    expect(r.reponse).toContain('?')
  })

  it('reprend l’idée de l’agent pour Chloé', () => {
    expect(routeByRules('une idée de post sur les travaux').prefill).toBe('une idée de post sur les travaux')
    expect(routeByRules('estimer ma maison').prefill).toBeUndefined()
  })
})

describe('Alex : réponse de Claude', () => {
  it('utilise la réponse valide du modèle', async () => {
    claudeJSON.mockResolvedValue({ data: { agent: 'thomas', reponse: 'Thomas prépare le dossier chiffré.', prefill: 'ignoré' }, tokens: 50 })
    const r = await routeRequest('estimer la maison de village')
    expect(r.via).toBe('claude')
    expect(r.route).toEqual({ agent: 'thomas', reponse: 'Thomas prépare le dossier chiffré.', prefill: undefined })
    expect(claudeJSON.mock.calls[0][0]).toContain('chef d\'équipe')
  })

  it('transmet l’échange en cours', async () => {
    claudeJSON.mockResolvedValue({ data: { agent: 'chloe', reponse: 'Chloé écrira le texte.', prefill: 'les travaux' }, tokens: 10 })
    await routeRequest('oui, pour mes réseaux', [{ role: 'alex', texte: 'Pour quoi faire ?' }])
    expect(claudeJSON.mock.calls[0][1]).toContain('Alex : Pour quoi faire ?')
  })

  it('se replie sur les règles si le modèle échoue ou répond n’importe quoi', async () => {
    claudeJSON.mockRejectedValueOnce(new Error('réseau'))
    expect((await routeRequest('estimer ma maison')).via).toBe('regles')
    claudeJSON.mockResolvedValueOnce({ data: { agent: 'robot', reponse: 'x' }, tokens: 1 })
    const r = await routeRequest('rédiger une annonce')
    expect(r).toMatchObject({ via: 'regles', route: { agent: 'julien' } })
  })

  it('sanitizeRoute rejette un agent inconnu ou une réponse vide', () => {
    expect(sanitizeRoute({ agent: 'inconnu' as any, reponse: 'ok' })).toBeNull()
    expect(sanitizeRoute({ agent: 'emma', reponse: '  ' })).toBeNull()
    expect(sanitizeRoute(null)).toBeNull()
    expect(sanitizeRoute({ agent: 'alex', reponse: 'Quelle est votre demande ?' })).toMatchObject({ agent: 'alex' })
  })
})

describe('Alex : liens', () => {
  it('ouvre la page du collaborateur', () => {
    expect(alexHref({ agent: 'thomas', reponse: 'x' })).toBe('/estimation')
    expect(alexHref({ agent: 'emma', reponse: 'x' })).toBe('/crm')
  })
  it('pré-remplit l’idée de Chloé dans l’adresse', () => {
    expect(alexHref({ agent: 'chloe', reponse: 'x', prefill: 'les travaux & le prix' })).toBe('/social?piste=les%20travaux%20%26%20le%20prix')
  })
})

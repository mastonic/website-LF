// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { SocialClient } from '@/components/social/SocialClient'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('SocialClient', () => {
  it('propose des idées, écrit le script et permet de le marquer publié', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/contenus/idees')
        return { ok: true, json: async () => ({ idees: [{ titre: 'Les travaux comptent', angle: 'Ils se déduisent du prix', format: 'video' }] }) }
      if (url === '/api/contenus' && init?.method === 'POST')
        return {
          ok: true,
          json: async () => ({
            id: 'c1',
            created_at: new Date().toISOString(),
            contenu: {
              format: 'video',
              titre: 'Les travaux comptent',
              accroche: 'Une maison à rénover se vend-elle au même prix ?',
              sequences: [
                { duree_s: 5, a_dire: 'Une maison à rénover se vend-elle au même prix ?' },
                { duree_s: 15, a_dire: 'Non, et voici pourquoi.' },
              ],
              legende: 'Légende du jour',
              hashtags: ['immobilier'],
              appel_action: 'Écrivez-moi en message privé',
              preparation: ['Lumière du jour'],
            },
          }),
        }
      return { ok: true, json: async () => ({ ok: true }) }
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<SocialClient initial={[]} />)

    expect(screen.getByText('Quelle idée vous trotte dans la tête ?')).toBeTruthy()
    fireEvent.click(screen.getByText('Donnez-moi des idées'))
    const idee = await screen.findByText('Les travaux comptent')
    fireEvent.click(idee)

    fireEvent.click(await screen.findByText('Écrire le script'))
    await waitFor(() => expect(screen.getByText('Non, et voici pourquoi.')).toBeTruthy())
    expect(screen.getByText(/environ 20 secondes/)).toBeTruthy()
    expect(screen.getByText('#immobilier')).toBeTruthy()

    fireEvent.click(screen.getByText('Marquer comme publié'))
    await waitFor(() => expect(screen.getByText('Remettre en brouillon')).toBeTruthy())
    expect(screen.getByText(/1 publié · 1 ce mois-ci/)).toBeTruthy()
    const patch = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === 'PATCH')!
    expect(patch[0]).toBe('/api/contenus/c1')
  })

  it('affiche l’erreur du serveur quand les idées échouent', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({ error: 'Quota mensuel épuisé.' }) })))
    render(<SocialClient initial={[]} />)
    fireEvent.click(screen.getByText('Donnez-moi des idées'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Quota mensuel épuisé.'))
  })

  it('n’affiche aucun texte mentionnant l’intelligence artificielle', () => {
    const { container } = render(<SocialClient initial={[]} />)
    expect(container.textContent).not.toMatch(/\bIA\b|intelligence artificielle|Claude|ChatGPT|OpenAI/i)
  })
})

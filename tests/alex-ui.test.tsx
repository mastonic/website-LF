// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { AlexChat } from '@/components/agents/AlexChat'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AlexChat', () => {
  it('oriente vers le bon collaborateur avec un lien', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ route: { agent: 'thomas', reponse: 'C’est pour Thomas : il prépare le dossier chiffré.' } }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    render(<AlexChat />)

    expect(screen.getByText('Alex — Chef d’équipe')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Dites-moi ce dont vous avez besoin'), { target: { value: 'estimer la maison de village' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))

    await waitFor(() => expect(screen.getByText(/C’est pour Thomas/)).toBeTruthy())
    expect(screen.getByText('estimer la maison de village')).toBeTruthy()
    const lien = screen.getByRole('link', { name: /Ouvrir avec Thomas/ })
    expect(lien.getAttribute('href')).toBe('/estimation')
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body).toEqual({ message: 'estimer la maison de village', history: [] })
  })

  it('un exemple se lance d’un clic et le lien de Chloé porte l’idée', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ route: { agent: 'chloe', reponse: 'C’est pour Chloé.', prefill: 'les travaux' } }),
    })))
    render(<AlexChat />)
    fireEvent.click(screen.getByText('J’ai une idée de publication'))
    const lien = await screen.findByRole('link', { name: /Ouvrir avec Chloé/ })
    expect(lien.getAttribute('href')).toBe('/social?piste=les%20travaux')
  })

  it('n’offre pas de lien quand Alex pose une question, et garde l’historique', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ route: { agent: 'alex', reponse: 'Pour quoi faire ?' } }) }))
    vi.stubGlobal('fetch', fetchMock)
    render(<AlexChat />)
    fireEvent.change(screen.getByLabelText('Dites-moi ce dont vous avez besoin'), { target: { value: 'bonjour' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    await screen.findByText('Pour quoi faire ?')
    expect(screen.queryByRole('link')).toBeNull()

    fireEvent.change(screen.getByLabelText('Dites-moi ce dont vous avez besoin'), { target: { value: 'une annonce' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const second = JSON.parse((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body as string)
    expect(second.history).toEqual([{ role: 'vous', texte: 'bonjour' }, { role: 'alex', texte: 'Pour quoi faire ?' }])
  })

  it('indique quand le collaborateur n’est pas encore disponible', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ route: { agent: 'hugo', reponse: 'Ce serait pour Hugo.' } }) })))
    render(<AlexChat />)
    fireEvent.click(screen.getByText('Rédiger une annonce'))
    await screen.findByText('Ce serait pour Hugo.')
    expect(screen.getByText('Hugo n’est pas encore disponible.')).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('affiche l’erreur quand Alex est injoignable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({ error: 'Alex est indisponible.' }) })))
    render(<AlexChat />)
    fireEvent.click(screen.getByText('Trouver des vendeurs'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Alex est indisponible.'))
  })

  it('ne mentionne pas l’intelligence artificielle', () => {
    const { container } = render(<AlexChat />)
    expect(container.textContent).not.toMatch(/\bIA\b|intelligence artificielle|Claude|ChatGPT|OpenAI/i)
  })
})

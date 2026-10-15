// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { EstimationClient } from '@/components/estimation/EstimationClient'
import type { EstimationResult } from '@/lib/dvf'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const dvf: EstimationResult = {
  prixM2Median: 2780,
  prixM2Bas: 2220,
  prixM2Haut: 3330,
  estimationBasse: 200000,
  estimationCentrale: 250000,
  estimationHaute: 300000,
  nbVentes: 24,
  rayonM: 1000,
  periode: { debut: '2023-02-01', fin: '2026-06-30' },
  fiabilite: 'moyenne',
  comparables: [
    { id: 'A', date: '2025-05-10', prix: 240000, surface: 88, pieces: 4, type: 'Maison', voie: '4 Rue des Tilleuls', codePostal: '78190', lat: 0, lon: 0, prixM2: 2727, distanceM: 210 },
  ],
  parAnnee: [
    { annee: 2024, prixM2Median: 2700, nbVentes: 10 },
    { annee: 2025, prixM2Median: 2800, nbVentes: 14 },
  ],
}

const base = {
  id: 'e1',
  adresse: '1 rue des Tilleuls, 78190 Trappes',
  typeBien: 'Maison',
  surface: 90,
  pieces: 4,
  anneeConstruction: 1900,
  dvf,
  initialTravaux: [],
  initialAjustements: [],
  initialEtat: '',
  initialNotes: '',
  initialConcurrent: '',
  initialRapport: null,
  initialIssue: 'en_cours' as const,
  initialRaison: null,
}

describe('EstimationClient', () => {
  it('affiche les ventes autour et les trois prix', () => {
    render(<EstimationClient {...base} />)
    expect(screen.getByText('1 rue des Tilleuls, 78190 Trappes')).toBeTruthy()
    expect(screen.getAllByText(/4 Rue des Tilleuls/).length).toBeGreaterThan(0)
    expect(screen.getByText('Vente rapide')).toBeTruthy()
    expect(screen.getByText('Prix de marché')).toBeTruthy()
    expect(screen.getByText('Prix d’essai')).toBeTruthy()
  })

  it('recalcule les prix en l’état quand on saisit des travaux', () => {
    render(<EstimationClient {...base} />)
    fireEvent.click(screen.getByText('+ Toiture / charpente'))
    fireEvent.change(screen.getByLabelText('Montant en euros'), { target: { value: '60000' } })
    expect(screen.getByText(/Total des travaux : 60\s000\s€/)).toBeTruthy()
    // médiane 250 000 − 60 000 = 190 000
    expect(screen.getAllByText(/190\s000\s€/).length).toBeGreaterThan(0)
  })

  it('situe un autre avis de valeur', () => {
    render(<EstimationClient {...base} initialConcurrent="350000" initialTravaux={[{ id: 't', label: 'Travaux', montant: 60000 }]} />)
    expect(screen.getByText(/Où se situe l’autre avis de valeur/)).toBeTruthy()
    expect(screen.getByText(/dépasse de/)).toBeTruthy()
  })

  it('enregistre puis génère le dossier, et prévient quand il est périmé', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') return { ok: true, json: async () => ({ ok: true }) }
      return {
        ok: true,
        json: async () => ({
          rapport: { resume: 'Résumé du dossier.', sections: [{ titre: 'Méthode et limites', texte: 'Les ventes ne disent rien de l’état.' }], argumentaire: ['Phrase pour le vendeur.'], vigilance: ['À vérifier sur place.'] },
        }),
      }
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<EstimationClient {...base} />)

    fireEvent.click(screen.getByText('+ Isolation'))
    fireEvent.change(screen.getByLabelText('Montant en euros'), { target: { value: '12000' } })
    fireEvent.click(screen.getByText('Générer le dossier'))

    await waitFor(() => expect(screen.getByText('Résumé du dossier.')).toBeTruthy())
    const calls = fetchMock.mock.calls.map((c) => `${(c[1] as RequestInit)?.method} ${c[0]}`)
    expect(calls).toEqual(['PATCH /api/estimations/e1', 'POST /api/estimations/e1/report'])
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(sent.travaux[0]).toMatchObject({ label: 'Isolation', montant: 12000 })
    expect(screen.getByText('Phrase pour le vendeur.')).toBeTruthy()
    expect(screen.getByText('Points de vigilance')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Montant en euros'), { target: { value: '15000' } })
    expect(screen.getByText(/régénérez-le/)).toBeTruthy()
  })

  it('enregistre l’issue et la raison d’un mandat perdu', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }))
    vi.stubGlobal('fetch', fetchMock)
    render(<EstimationClient {...base} />)
    fireEvent.change(screen.getByLabelText('Issue'), { target: { value: 'mandat_perdu' } })
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    fireEvent.change(screen.getByLabelText('Raison'), { target: { value: 'estimation_plus_haute_ailleurs' } })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const last = JSON.parse((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body as string)
    expect(last).toEqual({ issue: 'mandat_perdu', raison_perte: 'estimation_plus_haute_ailleurs' })
  })

  it('n’affiche aucun texte mentionnant l’intelligence artificielle', () => {
    const { container } = render(<EstimationClient {...base} />)
    expect(container.textContent).not.toMatch(/\bIA\b|intelligence artificielle|Claude|ChatGPT|OpenAI/i)
  })
})

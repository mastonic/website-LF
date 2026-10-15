// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { PhotosBien } from '@/components/estimation/PhotosBien'
import type { AnalysePhotos } from '@/lib/photos-shared'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const analyse: AnalysePhotos = {
  etat_general: 'Maison ancienne, cuisine datée.',
  niveau_travaux: 'renovation_partielle',
  pieces: [{ photo: 1, piece: 'Cuisine', observations: ['Meubles anciens'] }],
  travaux_suggeres: [{ poste: 'Cuisine', ampleur: 'important', pourquoi: 'Plan de travail abîmé', photo: 1 }],
  atouts: ['Belle lumière'],
  a_verifier: ['Toiture'],
  photo_ids: ['p1'],
  date: '2026-10-15T10:00:00Z',
}

const props = {
  estimationId: 'e1',
  initialPhotos: [{ id: 'p1', nom: 'a.jpg', url: 'https://x/a.jpg' }],
  initialAnalyse: null,
  postesExistants: [] as string[],
  onAjouterTravaux: vi.fn(),
  onChange: vi.fn(),
}

describe('PhotosBien', () => {
  it('envoie une photo et l’affiche', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ photo: { id: 'p2', nom: 'b.jpg', url: 'https://x/b.jpg' } }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const onChange = vi.fn()
    render(<PhotosBien {...props} initialPhotos={[]} onChange={onChange} />)
    const input = document.getElementById('photos-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'b.jpg', { type: 'image/jpeg' })] } })
    await waitFor(() => expect(screen.getByAltText('Photo 1')).toBeTruthy())
    expect(fetchMock.mock.calls[0][0]).toBe('/api/estimations/e1/photos')
    expect(onChange).toHaveBeenCalled()
  })

  it('analyse les photos puis permet d’ajouter un poste aux travaux', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ analyse }) }))
    const onAjouter = vi.fn()
    render(<PhotosBien {...props} onAjouterTravaux={onAjouter} />)
    fireEvent.click(screen.getByRole('button', { name: /Analyser les photos/ }))
    await waitFor(() => expect(screen.getByText('Ce que montrent les photos')).toBeTruthy())
    expect(screen.getByText(/Maison ancienne, cuisine datée/)).toBeTruthy()
    expect(screen.getByText('Toiture')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Ajouter aux travaux/ }))
    expect(onAjouter).toHaveBeenCalledWith(analyse.travaux_suggeres[0])
  })

  it('ne propose pas deux fois un poste déjà dans les travaux', () => {
    render(<PhotosBien {...props} initialAnalyse={analyse} postesExistants={['Cuisine']} />)
    const b = screen.getByRole('button', { name: /Déjà dans les travaux/ }) as HTMLButtonElement
    expect(b.disabled).toBe(true)
  })

  it('signale une lecture dépassée quand les photos ont changé', () => {
    render(<PhotosBien {...props} initialAnalyse={{ ...analyse, photo_ids: ['autre'] }} />)
    expect(screen.getByText(/Les photos ont changé depuis cette lecture/)).toBeTruthy()
  })

  it('supprime une photo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }))
    render(<PhotosBien {...props} />)
    fireEvent.click(screen.getByLabelText('Supprimer la photo 1'))
    await waitFor(() => expect(screen.queryByAltText('Photo 1')).toBeNull())
  })
})

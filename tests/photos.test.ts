import { describe, it, expect } from 'vitest'
import { buildAnalysePrompt, sanitizeAnalyse } from '@/lib/photos-analyse'
import { buildReportPrompt } from '@/lib/estimation-report'
import { computeScenarios } from '@/lib/estimation'
import type { EstimationResult } from '@/lib/dvf'

describe('analyse des photos', () => {
  it('le prompt interdit les montants et demande des constats visibles', () => {
    const p = buildAnalysePrompt({ typeBien: 'Maison', surface: 90, pieces: 4, anneeConstruction: 1900 }, 3)
    expect(p).toContain('Maison, 90 m²')
    expect(p).toContain('de 1 à 3')
    expect(p).toContain('Tableau et mise aux normes électriques')
  })

  it('nettoie la réponse : valeurs inconnues, numéros de photo hors limites, vide', () => {
    const a = sanitizeAnalyse(
      {
        etat_general: '  Maison ancienne, cuisine à refaire.  ',
        niveau_travaux: 'n_importe_quoi',
        pieces: [
          { photo: 1, piece: 'Cuisine', observations: ['Meubles anciens', ''] },
          { photo: 9, piece: 'Hors limite', observations: ['x'] },
          { photo: 2, piece: 'Vide', observations: [] },
        ],
        travaux_suggeres: [
          { poste: 'Cuisine', ampleur: 'énorme', pourquoi: 'Plan de travail abîmé', photo: 1 },
          { poste: '', ampleur: 'leger' },
          { poste: 'Façade', ampleur: 'important', photo: 7 },
        ],
        atouts: ['Lumière', 5, ''],
        a_verifier: ['Toiture'],
      },
      ['a', 'b']
    )
    expect(a.etat_general).toBe('Maison ancienne, cuisine à refaire.')
    expect(a.niveau_travaux).toBe('aucun_visible')
    expect(a.pieces).toEqual([{ photo: 1, piece: 'Cuisine', observations: ['Meubles anciens'] }])
    expect(a.travaux_suggeres).toEqual([
      { poste: 'Cuisine', ampleur: 'moyen', pourquoi: 'Plan de travail abîmé', photo: 1 },
      { poste: 'Façade', ampleur: 'important', pourquoi: '', photo: null },
    ])
    expect(a.atouts).toEqual(['Lumière'])
    expect(a.photo_ids).toEqual(['a', 'b'])
  })

  it('refuse une réponse entièrement vide', () => {
    expect(() => sanitizeAnalyse({}, ['a'])).toThrow()
  })
})

describe('dossier : observations des photos', () => {
  const dvf = {
    prixM2Median: 2000, prixM2Bas: 1500, prixM2Haut: 2500,
    estimationBasse: 135000, estimationCentrale: 180000, estimationHaute: 225000,
    nbVentes: 10, rayonM: 800, periode: { debut: '2023-01-01', fin: '2026-01-01' },
    fiabilite: 'moyenne', comparables: [], parAnnee: [],
  } as unknown as EstimationResult

  const base = {
    adresse: '1 rue X', typeBien: 'Maison', surface: 90, dvf, travaux: [], ajustements: [],
    scenarios: computeScenarios(dvf, 90, [], [], null),
  }

  it('inclut les observations quand elles existent, et le dit sinon', () => {
    const sans = buildReportPrompt(base)
    expect(sans).toContain('Aucune photo analysée.')
    const avec = buildReportPrompt({
      ...base,
      analysePhotos: sanitizeAnalyse(
        { etat_general: 'Cuisine datée', pieces: [{ photo: 1, piece: 'Cuisine', observations: ['Meubles anciens'] }], a_verifier: ['Électricité'] },
        ['a']
      ),
    })
    expect(avec).toContain('OBSERVATIONS SUR LES PHOTOS')
    expect(avec).toContain('Meubles anciens')
    expect(avec).toContain('Électricité')
    expect(avec).not.toContain('Aucune photo analysée.')
  })
})

import { describe, it, expect } from 'vitest'
import { computeScenarios, summarizeSuivi, totalTravaux, totalAjustements } from '@/lib/estimation'
import { estimate, parseDvfCsv } from '@/lib/dvf'
import { buildReportPrompt, sanitizeReport } from '@/lib/estimation-report'

const dvf = { estimationBasse: 200000, estimationCentrale: 250000, estimationHaute: 300000 }

describe('computeScenarios', () => {
  it('déduit les travaux de chaque prix', () => {
    const r = computeScenarios(dvf, 100, [{ id: 'a', label: 'Toiture', montant: 40000 }, { id: 'b', label: 'Électricité', montant: 20000 }], [])
    expect(r.totalTravaux).toBe(60000)
    expect(r.scenarios.map((s) => s.prixEnEtat)).toEqual([140000, 190000, 240000])
    expect(r.scenarios[1].reference).toBe(250000)
    expect(r.scenarios[1].prixM2).toBe(1900)
  })

  it('applique les ajustements en pourcentage et en euros avant les travaux', () => {
    const r = computeScenarios(
      dvf,
      100,
      [{ id: 'a', label: 'Travaux', montant: 10000 }],
      [
        { id: 'x', label: 'Grand jardin', type: 'pct', valeur: 10 },
        { id: 'y', label: 'Pas de garage', type: 'eur', valeur: -5000 },
      ]
    )
    // 250 000 × 1,10 − 5 000 − 10 000 = 260 000
    expect(r.scenarios[1].prixEnEtat).toBe(260000)
    expect(r.scenarios[1].reference).toBe(270000)
  })

  it('ne descend jamais sous zéro et ignore les valeurs invalides', () => {
    const r = computeScenarios(dvf, 100, [{ id: 'a', label: 'Énorme', montant: 999999 }, { id: 'b', label: 'NaN', montant: NaN }], [])
    expect(r.scenarios.every((s) => s.prixEnEtat === 0)).toBe(true)
    expect(totalTravaux([{ id: 'n', label: 'neg', montant: -500 }])).toBe(0)
    expect(totalAjustements([{ id: 'n', label: 'x', type: 'pct', valeur: NaN }])).toEqual({ pct: 0, eur: 0 })
  })

  it('situe un autre avis de valeur par rapport à la fourchette en l’état', () => {
    const travaux = [{ id: 'a', label: 'Travaux', montant: 60000 }]
    const r = computeScenarios(dvf, 100, travaux, [], 290000)
    // marché en l'état 190 000 ; haut 240 000
    expect(r.avisConcurrent).not.toBeNull()
    expect(r.avisConcurrent!.ecartVsMarche).toBe(100000)
    expect(r.avisConcurrent!.ecartVsMarchePct).toBe(52.6)
    expect(r.avisConcurrent!.auDessusFourchette).toBe(true)
    expect(r.avisConcurrent!.ecartVsHaut).toBe(50000)
    expect(r.avisConcurrent!.prixM2).toBe(2900)
  })

  it('ne produit pas d’avis concurrent sans montant', () => {
    expect(computeScenarios(dvf, 100, [], [], null).avisConcurrent).toBeNull()
    expect(computeScenarios(dvf, 100, [], [], 0).avisConcurrent).toBeNull()
  })
})

describe('summarizeSuivi', () => {
  it('compte les issues, le taux et les raisons de perte', () => {
    const s = summarizeSuivi([
      { issue: 'mandat_signe', raison_perte: null },
      { issue: 'mandat_perdu', raison_perte: 'estimation_plus_haute_ailleurs' },
      { issue: 'mandat_perdu', raison_perte: 'estimation_plus_haute_ailleurs' },
      { issue: 'mandat_perdu', raison_perte: 'vendeur_renonce' },
      { issue: 'en_cours', raison_perte: null },
      { issue: 'abandonne', raison_perte: null },
    ])
    expect(s).toMatchObject({ total: 6, signes: 1, perdus: 3, enCours: 1, abandonnes: 1, tauxTransformation: 25 })
    expect(s.raisons[0]).toEqual({ raison: 'estimation_plus_haute_ailleurs', nb: 2 })
  })

  it('n’invente pas de taux sans dossier clos', () => {
    expect(summarizeSuivi([{ issue: 'en_cours', raison_perte: null }]).tauxTransformation).toBeNull()
    expect(summarizeSuivi([]).total).toBe(0)
  })
})

describe('estimate : tendance et comparables', () => {
  const HEADER = 'id_mutation,date_mutation,numero_disposition,nature_mutation,valeur_fonciere,adresse_numero,adresse_suffixe,adresse_nom_voie,adresse_code_voie,code_postal,code_commune,nom_commune,code_departement,id_parcelle,nombre_lots,type_local,surface_reelle_bati,nombre_pieces_principales,surface_terrain,longitude,latitude'
  const row = (i: number, y: number, m2: number) =>
    `M${i},${y}-06-01,1,Vente,${m2 * 90},${i},,"Rue des Tilleuls",0001,78190,78686,Trappes,78,X,1,Maison,90,4,,${2.0 + i * 0.0001},48.78`
  const csv = [HEADER, ...Array.from({ length: 24 }, (_, i) => row(i, 2023 + (i % 3), 2500 + i * 10))].join('\n')
  const sales = parseDvfCsv(csv)

  it('renvoie le prix médian par année, dans l’ordre', () => {
    const r = estimate({ type: 'Maison', surface: 90, lon: 2.0, lat: 48.78 }, sales, { maxComparables: 10 })!
    expect(r.parAnnee.map((a) => a.annee)).toEqual([2023, 2024, 2025])
    expect(r.parAnnee.reduce((s, a) => s + a.nbVentes, 0)).toBe(r.nbVentes)
    expect(r.comparables).toHaveLength(10)
  })

  it('garde 5 comparables par défaut', () => {
    expect(estimate({ type: 'Maison', surface: 90, lon: 2.0, lat: 48.78 }, sales)!.comparables).toHaveLength(5)
  })
})

describe('compte rendu', () => {
  const dvfFull = estimate(
    { type: 'Maison', surface: 90, lon: 2.0, lat: 48.78 },
    parseDvfCsv(
      [
        'id_mutation,date_mutation,numero_disposition,nature_mutation,valeur_fonciere,adresse_numero,adresse_suffixe,adresse_nom_voie,adresse_code_voie,code_postal,code_commune,nom_commune,code_departement,id_parcelle,nombre_lots,type_local,surface_reelle_bati,nombre_pieces_principales,surface_terrain,longitude,latitude',
        ...Array.from({ length: 20 }, (_, i) => `M${i},2025-03-01,1,Vente,${(2500 + i * 10) * 90},${i},,"Rue des Tilleuls",0001,78190,78686,Trappes,78,X,1,Maison,90,4,,${2.0 + i * 0.0001},48.78`),
      ].join('\n')
    ),
    { maxComparables: 10 }
  )!

  it('transmet tous les chiffres calculés et interdit d’en inventer', () => {
    const travaux = [{ id: 'a', label: 'Tableau électrique', montant: 8000 }]
    const sc = computeScenarios(dvfFull, 90, travaux, [], 350000)
    const prompt = buildReportPrompt({
      adresse: '1 rue des Tilleuls, 78190 Trappes',
      typeBien: 'Maison',
      surface: 90,
      dvf: dvfFull,
      travaux,
      ajustements: [],
      scenarios: sc,
    })
    expect(prompt).toContain('Tableau électrique : 8')
    expect(prompt).toContain(`${dvfFull.nbVentes} ventes`)
    expect(prompt).toContain('Un autre avis de valeur reçu par le vendeur')
    expect(prompt).toContain('Rue des Tilleuls')
  })

  it('nettoie la réponse du modèle et refuse un contenu vide', () => {
    const r = sanitizeReport({
      resume: '  Résumé  ',
      sections: [{ titre: 'A', texte: 'texte' }, { titre: '', texte: 'sans titre' }] as any,
      argumentaire: ['ok', 42 as any, ''],
      vigilance: undefined as any,
    })
    expect(r.resume).toBe('Résumé')
    expect(r.sections).toHaveLength(1)
    expect(r.argumentaire).toEqual(['ok'])
    expect(r.vigilance).toEqual([])
    expect(() => sanitizeReport({})).toThrow()
  })
})

/**
 * Dossier d'estimation (Thomas) : calculs déterministes.
 * Tous les chiffres du dossier viennent d'ici (ventes officielles + saisies de l'agent).
 * La rédaction ne fait que commenter ces chiffres, elle n'en invente aucun.
 */
import type { EstimationResult } from '@/lib/dvf'

export interface PosteTravaux {
  id: string
  label: string
  /** Montant TTC estimé, en euros. */
  montant: number
  note?: string
}

export interface Ajustement {
  id: string
  label: string
  type: 'pct' | 'eur'
  /** Pourcentage (ex. 5 = +5 %) ou euros, positif ou négatif. */
  valeur: number
}

export interface ScenarioPrix {
  cle: 'rapide' | 'marche' | 'essai'
  titre: string
  description: string
  /** Valeur de référence (bien en bon état) après ajustements. */
  reference: number
  /** Prix « en l'état » : référence moins travaux. */
  prixEnEtat: number
  prixM2: number
}

export interface ScenariosResult {
  totalTravaux: number
  totalAjustementsPct: number
  totalAjustementsEur: number
  scenarios: ScenarioPrix[]
  /** Position d'un autre avis de valeur par rapport à la fourchette en l'état. */
  avisConcurrent: {
    prix: number
    prixM2: number
    ecartVsMarche: number
    ecartVsMarchePct: number
    auDessusFourchette: boolean
    ecartVsHaut: number
  } | null
}

export const RAISONS_PERTE = {
  estimation_plus_haute_ailleurs: 'Une autre estimation était plus haute',
  autre_agence_choisie: 'Autre agence choisie (autre raison)',
  vendeur_renonce: 'Le vendeur renonce à vendre',
  vendeur_reporte: 'Le vendeur reporte son projet',
  autre: 'Autre raison',
} as const

export type RaisonPerte = keyof typeof RAISONS_PERTE

export const ISSUES = {
  en_cours: 'En cours',
  mandat_signe: 'Mandat signé',
  mandat_perdu: 'Mandat perdu',
  abandonne: 'Abandonné',
} as const

export type Issue = keyof typeof ISSUES

/** Postes de travaux proposés d'un clic (le montant reste à saisir par l'agent). */
export const POSTES_SUGGERES = [
  'Tableau et mise aux normes électriques',
  'Toiture / charpente',
  'Isolation',
  'Chauffage (remplacement de la chaudière)',
  'Cuisine',
  'Salle de bains',
  'Fenêtres et menuiseries',
  'Sols, murs, peintures',
  'Assainissement',
  'Façade',
] as const

const roundTo = (n: number, step: number) => Math.round(n / step) * step
const clean = (n: number) => (Number.isFinite(n) ? n : 0)

export function totalTravaux(travaux: PosteTravaux[]): number {
  return travaux.reduce((sum, t) => sum + Math.max(0, clean(t.montant)), 0)
}

export function totalAjustements(ajustements: Ajustement[]): { pct: number; eur: number } {
  let pct = 0
  let eur = 0
  for (const a of ajustements) {
    if (a.type === 'pct') pct += clean(a.valeur)
    else eur += clean(a.valeur)
  }
  return { pct, eur }
}

/**
 * Calcule les trois prix « en l'état » à partir de la fourchette des ventes officielles :
 *  - vente rapide : bas de fourchette
 *  - prix de marché : médiane
 *  - prix d'essai : haut de fourchette
 * Chaque prix = (valeur de référence ± ajustements) − travaux.
 * Le prix au m² des ventes mélange des biens rénovés ou non : c'est pourquoi les travaux
 * sont déduits par l'agent, poste par poste, plutôt que devinés.
 */
export function computeScenarios(
  dvf: Pick<EstimationResult, 'estimationBasse' | 'estimationCentrale' | 'estimationHaute'>,
  surface: number,
  travaux: PosteTravaux[],
  ajustements: Ajustement[],
  prixConcurrent?: number | null
): ScenariosResult {
  const tt = totalTravaux(travaux)
  const adj = totalAjustements(ajustements)
  const apply = (ref: number) => Math.max(0, ref * (1 + adj.pct / 100) + adj.eur)

  const build = (
    cle: ScenarioPrix['cle'],
    titre: string,
    description: string,
    base: number
  ): ScenarioPrix => {
    const reference = roundTo(apply(base), 1000)
    const prixEnEtat = Math.max(0, roundTo(apply(base) - tt, 1000))
    return { cle, titre, description, reference, prixEnEtat, prixM2: surface > 0 ? Math.round(prixEnEtat / surface) : 0 }
  }

  const scenarios: ScenarioPrix[] = [
    build('rapide', 'Vente rapide', 'Bas de la fourchette des ventes proches : pour vendre vite.', dvf.estimationBasse),
    build('marche', 'Prix de marché', 'Médiane des ventes proches : le prix le plus défendable.', dvf.estimationCentrale),
    build('essai', 'Prix d’essai', 'Haut de la fourchette : demande plus de temps et une négociation à prévoir.', dvf.estimationHaute),
  ]

  const marche = scenarios[1].prixEnEtat
  const haut = scenarios[2].prixEnEtat

  const avisConcurrent =
    prixConcurrent && prixConcurrent > 0
      ? {
          prix: prixConcurrent,
          prixM2: surface > 0 ? Math.round(prixConcurrent / surface) : 0,
          ecartVsMarche: roundTo(prixConcurrent - marche, 1000),
          ecartVsMarchePct: marche > 0 ? Math.round(((prixConcurrent - marche) / marche) * 1000) / 10 : 0,
          auDessusFourchette: prixConcurrent > haut,
          ecartVsHaut: roundTo(prixConcurrent - haut, 1000),
        }
      : null

  return {
    totalTravaux: tt,
    totalAjustementsPct: adj.pct,
    totalAjustementsEur: adj.eur,
    scenarios,
    avisConcurrent,
  }
}

/** Synthèse de suivi pour mesurer ce que les estimations rapportent. */
export interface SuiviEstimations {
  total: number
  enCours: number
  signes: number
  perdus: number
  abandonnes: number
  /** Part de mandats signés parmi les dossiers clos (signé + perdu), en %. */
  tauxTransformation: number | null
  raisons: { raison: RaisonPerte; nb: number }[]
}

export function summarizeSuivi(
  rows: { issue: string; raison_perte: string | null }[]
): SuiviEstimations {
  const count = (i: Issue) => rows.filter((r) => r.issue === i).length
  const signes = count('mandat_signe')
  const perdus = count('mandat_perdu')
  const clos = signes + perdus
  const parRaison = new Map<RaisonPerte, number>()
  for (const r of rows) {
    if (r.issue === 'mandat_perdu' && r.raison_perte && r.raison_perte in RAISONS_PERTE) {
      const k = r.raison_perte as RaisonPerte
      parRaison.set(k, (parRaison.get(k) ?? 0) + 1)
    }
  }
  return {
    total: rows.length,
    enCours: count('en_cours'),
    signes,
    perdus,
    abandonnes: count('abandonne'),
    tauxTransformation: clos > 0 ? Math.round((signes / clos) * 100) : null,
    raisons: Array.from(parRaison.entries())
      .map(([raison, nb]) => ({ raison, nb }))
      .sort((a, b) => b.nb - a.nb),
  }
}

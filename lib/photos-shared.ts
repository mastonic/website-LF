/** Photos d'une estimation : types et constantes partagés (sans dépendance serveur). */

export const MAX_PHOTOS = 8

export interface PhotoBien {
  id: string
  /** Chemin dans le bucket privé « bien-media ». */
  path: string
  thumb: string
  nom: string
}

/** Photo prête à l'affichage (lien temporaire). */
export interface PhotoAffichee {
  id: string
  nom: string
  url: string
}

export const AMPLEURS = { leger: 'léger', moyen: 'moyen', important: 'important' } as const
export type Ampleur = keyof typeof AMPLEURS

export const NIVEAUX_TRAVAUX = {
  aucun_visible: 'Aucun travaux visible',
  rafraichissement: 'Rafraîchissement',
  renovation_partielle: 'Rénovation partielle',
  renovation_lourde: 'Rénovation lourde',
} as const
export type NiveauTravaux = keyof typeof NIVEAUX_TRAVAUX

export interface ObservationPiece {
  /** Numéro de la photo (à partir de 1). */
  photo: number
  piece: string
  observations: string[]
}

export interface TravauxSuggere {
  poste: string
  ampleur: Ampleur
  pourquoi: string
  photo: number | null
}

export interface AnalysePhotos {
  etat_general: string
  niveau_travaux: NiveauTravaux
  pieces: ObservationPiece[]
  travaux_suggeres: TravauxSuggere[]
  atouts: string[]
  a_verifier: string[]
  /** Photos prises en compte, pour savoir si l'analyse est à jour. */
  photo_ids: string[]
  date: string
}

// Types et utilitaires communs au serveur et au navigateur : aucune dépendance serveur ici.

export type FormatContenu = 'video' | 'texte'
export type Plateforme = 'instagram' | 'tiktok' | 'facebook' | 'linkedin'

export const PLATEFORMES: Record<Plateforme, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
}

export interface MarqueContexte {
  nom?: string | null
  signature?: string | null
  charte?: string | null
  secteur?: string | null
}

export interface IdeeContenu {
  titre: string
  angle: string
  format: FormatContenu
}

export interface ScriptVideo {
  titre: string
  accroche: string
  sequences: { duree_s: number; a_dire: string }[]
  legende: string
  hashtags: string[]
  appel_action: string
  preparation: string[]
}

export interface PublicationTexte {
  titre: string
  texte: string
  hashtags: string[]
}

export type ContenuGenere = ({ format: 'video' } & ScriptVideo) | ({ format: 'texte' } & PublicationTexte)

/** Durée parlée estimée d'un script (≈ 2,5 mots par seconde). */
export function dureeScript(seq: { duree_s: number }[]): number {
  return seq.reduce((s, x) => s + x.duree_s, 0)
}

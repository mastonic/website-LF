export type ColorRole = 'principale' | 'secondaire' | 'accent' | 'fond'

export interface BrandColor {
  hex: string
  role: ColorRole
}

export type FontKey = 'Inter' | 'Playfair Display' | 'Montserrat' | 'Lora' | 'Raleway' | 'Source Serif 4' | 'DM Sans' | 'Cormorant Garamond'

export interface BrandFonts {
  titre: FontKey
  texte: FontKey
}

export interface BrandIdentity {
  id: string
  workspace_id: string
  nom_affiche: string | null
  signature: string | null
  logo_path: string | null
  avatar_path: string | null
  couleurs: BrandColor[]
  polices: Partial<BrandFonts>
  charte: string | null
  storage_used_bytes: number
  created_at: string
  updated_at: string
}

export interface AnnonceMedia {
  id: string
  workspace_id: string
  annonce_id: string
  storage_path: string
  thumb_path: string | null
  mime_type: string
  taille_octets: number
  largeur: number | null
  hauteur: number | null
  ordre: number
  is_couverture: boolean
  created_at: string
  // URL signée (enrichie côté serveur, non stockée en base)
  signed_url?: string
  thumb_signed_url?: string
}

export const STORAGE_QUOTA_BYTES = 500 * 1024 * 1024 // 500 Mo
export const LOGO_MAX_BYTES = 2 * 1024 * 1024         // 2 Mo
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024       // 10 Mo
export const PHOTOS_MAX_PER_BIEN = 20

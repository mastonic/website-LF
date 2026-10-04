import { z } from 'zod'

// ── Character limits ──────────────────────────────────────────────────────────
export const CHAR_LIMITS = {
  annonce: {
    typeBien: 30,
    villeQuartier: 50,
    surface: 20,
    nbPieces: 10,
    prix: 30,
    pointFort: 60,
    precisionPrix: 120,
    referenceBien: 50,
    mentionSupp: 200,
  },
  carrousel: {
    titreCouverture: 80,
    soustitreCouverture: 120,
    titreSlide: 60,
    texteSlide: 200,
    titreFinal: 80,
    ctaFinal: 100,
    coordonnees: 80,
  },
  story: {
    typeBien: 30,
    villeQuartier: 40,
    prix: 30,
    question: 120,
    soustitre: 80,
  },
} as const

export const RENDER_RATE_LIMIT = 30 // per hour per workspace

// ── Enums ─────────────────────────────────────────────────────────────────────
export const bandeauEnum = z.enum(['À venir', 'Nouveauté', 'Toujours disponible', 'Loué', 'Vendu'])
export type Bandeau = z.infer<typeof bandeauEnum>

export const classeEnergieEnum = z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
export type ClasseEnergie = z.infer<typeof classeEnergieEnum>

// ── Annonce schema ────────────────────────────────────────────────────────────
export const annonceSchema = z.object({
  bandeau: bandeauEnum,
  typeBien: z.string().min(1, 'Type de bien requis').max(CHAR_LIMITS.annonce.typeBien, `Max ${CHAR_LIMITS.annonce.typeBien} caractères`),
  villeQuartier: z.string().min(1, 'Ville ou quartier requis').max(CHAR_LIMITS.annonce.villeQuartier, `Max ${CHAR_LIMITS.annonce.villeQuartier} caractères`),
  surface: z.string().min(1, 'Surface requise').max(CHAR_LIMITS.annonce.surface),
  nbPieces: z.string().min(1, 'Nb de pièces requis').max(CHAR_LIMITS.annonce.nbPieces),
  prix: z.string().min(1, 'Prix requis').max(CHAR_LIMITS.annonce.prix),
  pointsForts: z.array(z.string().max(CHAR_LIMITS.annonce.pointFort, `Point fort : max ${CHAR_LIMITS.annonce.pointFort} caractères`)).max(3).default([]),
  photoId: z.string().optional(),
  mentionsLegales: z.object({
    precisionPrix: z.string().max(CHAR_LIMITS.annonce.precisionPrix).optional(),
    classeEnergie: classeEnergieEnum.optional(),
    referenceBien: z.string().max(CHAR_LIMITS.annonce.referenceBien).optional(),
    mentionSupp: z.string().max(CHAR_LIMITS.annonce.mentionSupp).optional(),
  }).default({}),
  photoRetouchee: z.boolean().default(false),
  confirmationLoueSolde: z.boolean().default(false),
  exportType: z.enum(['final', 'brouillon']).default('final'),
})
export type AnnonceData = z.infer<typeof annonceSchema>

// ── Carrousel schema ──────────────────────────────────────────────────────────
export const slideContenuSchema = z.object({
  titre: z.string().min(1, 'Titre de slide requis').max(CHAR_LIMITS.carrousel.titreSlide, `Titre slide : max ${CHAR_LIMITS.carrousel.titreSlide} caractères`),
  texte: z.string().min(1, 'Texte de slide requis').max(CHAR_LIMITS.carrousel.texteSlide, `Texte slide : max ${CHAR_LIMITS.carrousel.texteSlide} caractères`),
})
export type SlideContenu = z.infer<typeof slideContenuSchema>

export const carrouselSchema = z.object({
  titreCouverture: z.string().min(1, 'Titre de couverture requis').max(CHAR_LIMITS.carrousel.titreCouverture, `Titre couverture : max ${CHAR_LIMITS.carrousel.titreCouverture} caractères`),
  soustitreCouverture: z.string().max(CHAR_LIMITS.carrousel.soustitreCouverture).optional(),
  slides: z.array(slideContenuSchema)
    .min(3, 'Au moins 3 slides de contenu requis')
    .max(5, 'Maximum 5 slides de contenu'),
  titreFinal: z.string().min(1, 'Titre de la slide finale requis').max(CHAR_LIMITS.carrousel.titreFinal),
  ctaFinal: z.string().max(CHAR_LIMITS.carrousel.ctaFinal).optional(),
  coordonnees: z.string().max(CHAR_LIMITS.carrousel.coordonnees).optional(),
})
export type CarrouselData = z.infer<typeof carrouselSchema>

// ── Story schema ──────────────────────────────────────────────────────────────
export const storyAnnonceSchema = z.object({
  variant: z.literal('annonce'),
  typeBien: z.string().max(CHAR_LIMITS.story.typeBien),
  villeQuartier: z.string().max(CHAR_LIMITS.story.villeQuartier),
  prix: z.string().max(CHAR_LIMITS.story.prix),
  photoId: z.string().optional(),
})

export const storyTeaserSchema = z.object({
  variant: z.literal('teaser'),
  question: z.string().min(1, 'Question requise').max(CHAR_LIMITS.story.question, `Question : max ${CHAR_LIMITS.story.question} caractères`),
  soustitre: z.string().max(CHAR_LIMITS.story.soustitre).optional(),
})

export const storySchema = z.discriminatedUnion('variant', [storyAnnonceSchema, storyTeaserSchema])
export type StoryData = z.infer<typeof storySchema>

// ── Render request / result ───────────────────────────────────────────────────
export type TemplateId = 'annonce' | 'carrousel' | 'story'

export interface RenderRequest {
  templateId: TemplateId
  data: AnnonceData | CarrouselData | StoryData
  format?: 'png' | 'zip'
  lowRes?: boolean
  previewSlide?: number  // for carrousel preview
}

export interface RenderResult {
  buffer: Buffer
  contentType: 'image/png' | 'application/zip'
  width: number
  height: number
  renderTimeMs: number
  warnings: string[]
}

// ── History entry ─────────────────────────────────────────────────────────────
export interface VisualRender {
  id: string
  workspace_id: string
  user_id: string
  template_id: TemplateId
  render_data: Record<string, unknown>
  storage_path: string
  thumb_path: string | null
  taille_octets: number
  created_at: string
  thumb_signed_url?: string | null
}

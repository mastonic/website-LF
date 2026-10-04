import { describe, it, expect } from 'vitest'
import { annonceSchema, carrouselSchema, storySchema, CHAR_LIMITS } from '@/types/visuals'
import { textColorOnBg, contrastRatio } from '@/lib/visuals/contrast'
import { validateAnnonceExport } from '@/lib/visuals/renderer'

// ── Helpers ───────────────────────────────────────────────────────────────────
const baseAnnonce = {
  bandeau: 'Nouveauté' as const,
  typeBien: 'Appartement T3',
  villeQuartier: 'Paris 11e',
  surface: '65 m²',
  nbPieces: '3 pièces',
  prix: '320 000 €',
  pointsForts: [],
  mentionsLegales: {},
  photoRetouchee: false,
  confirmationLoueSolde: false,
  exportType: 'final' as const,
}

const baseCarrousel = {
  titreCouverture: 'Titre de test',
  slides: [
    { titre: 'Slide 1', texte: 'Contenu 1' },
    { titre: 'Slide 2', texte: 'Contenu 2' },
    { titre: 'Slide 3', texte: 'Contenu 3' },
  ],
  titreFinal: 'Parlons de votre projet',
}

// ── Annonce schema ────────────────────────────────────────────────────────────
describe('annonceSchema', () => {
  it('accepts valid data', () => {
    expect(() => annonceSchema.parse(baseAnnonce)).not.toThrow()
  })

  it('rejects missing typeBien', () => {
    expect(() => annonceSchema.parse({ ...baseAnnonce, typeBien: '' })).toThrow()
  })

  it('rejects typeBien over limit', () => {
    const tooLong = 'A'.repeat(CHAR_LIMITS.annonce.typeBien + 1)
    expect(() => annonceSchema.parse({ ...baseAnnonce, typeBien: tooLong })).toThrow(/Max/)
  })

  it('rejects more than 3 pointsForts', () => {
    const data = { ...baseAnnonce, pointsForts: ['a', 'b', 'c', 'd'] }
    expect(() => annonceSchema.parse(data)).toThrow()
  })

  it('rejects pointFort over char limit', () => {
    const tooLong = 'A'.repeat(CHAR_LIMITS.annonce.pointFort + 1)
    const data = { ...baseAnnonce, pointsForts: [tooLong] }
    expect(() => annonceSchema.parse(data)).toThrow()
  })

  it('rejects invalid bandeau', () => {
    expect(() => annonceSchema.parse({ ...baseAnnonce, bandeau: 'Invalide' })).toThrow()
  })

  it('defaults exportType to final', () => {
    const result = annonceSchema.parse({ ...baseAnnonce, exportType: undefined })
    expect(result.exportType).toBe('final')
  })
})

// ── Annonce mentions légales validation ──────────────────────────────────────
describe('validateAnnonceExport', () => {
  it('returns no errors when final with all mentions', () => {
    const data = annonceSchema.parse({
      ...baseAnnonce,
      mentionsLegales: { classeEnergie: 'B', referenceBien: 'REF-001' },
    })
    expect(validateAnnonceExport(data)).toHaveLength(0)
  })

  it('blocks export when classeEnergie missing', () => {
    const data = annonceSchema.parse({ ...baseAnnonce, mentionsLegales: { referenceBien: 'REF-001' } })
    const errors = validateAnnonceExport(data)
    expect(errors.some((e) => e.includes('classe énergie'))).toBe(true)
  })

  it('blocks export when referenceBien missing', () => {
    const data = annonceSchema.parse({ ...baseAnnonce, mentionsLegales: { classeEnergie: 'C' } })
    const errors = validateAnnonceExport(data)
    expect(errors.some((e) => e.includes('référence'))).toBe(true)
  })

  it('blocks Loué without confirmation', () => {
    const data = annonceSchema.parse({
      ...baseAnnonce,
      bandeau: 'Loué',
      confirmationLoueSolde: false,
      mentionsLegales: { classeEnergie: 'C', referenceBien: 'REF-001' },
    })
    const errors = validateAnnonceExport(data)
    expect(errors.some((e) => e.includes('loué'))).toBe(true)
  })

  it('allows Loué with confirmation', () => {
    const data = annonceSchema.parse({
      ...baseAnnonce,
      bandeau: 'Loué',
      confirmationLoueSolde: true,
      mentionsLegales: { classeEnergie: 'C', referenceBien: 'REF-001' },
    })
    expect(validateAnnonceExport(data)).toHaveLength(0)
  })

  it('skips validation for brouillon', () => {
    const data = annonceSchema.parse({ ...baseAnnonce, exportType: 'brouillon', mentionsLegales: {} })
    expect(validateAnnonceExport(data)).toHaveLength(0)
  })
})

// ── Carrousel schema ──────────────────────────────────────────────────────────
describe('carrouselSchema', () => {
  it('accepts 3 slides', () => {
    expect(() => carrouselSchema.parse(baseCarrousel)).not.toThrow()
  })

  it('accepts 5 slides', () => {
    const data = {
      ...baseCarrousel,
      slides: Array(5).fill({ titre: 'T', texte: 'Contenu de slide' }),
    }
    expect(() => carrouselSchema.parse(data)).not.toThrow()
  })

  it('rejects fewer than 3 slides', () => {
    expect(() => carrouselSchema.parse({ ...baseCarrousel, slides: [{ titre: 'A', texte: 'B' }] })).toThrow(/3 slides/)
  })

  it('rejects more than 5 slides', () => {
    const data = { ...baseCarrousel, slides: Array(6).fill({ titre: 'T', texte: 'C' }) }
    expect(() => carrouselSchema.parse(data)).toThrow(/5 slides/)
  })

  it('rejects slide texte over limit', () => {
    const tooLong = 'A'.repeat(CHAR_LIMITS.carrousel.texteSlide + 1)
    const data = { ...baseCarrousel, slides: [{ titre: 'T', texte: tooLong }, { titre: 'T', texte: 'ok' }, { titre: 'T', texte: 'ok' }] }
    expect(() => carrouselSchema.parse(data)).toThrow()
  })
})

// ── Story schema ──────────────────────────────────────────────────────────────
describe('storySchema', () => {
  it('accepts annonce variant', () => {
    expect(() => storySchema.parse({ variant: 'annonce', typeBien: 'Maison', villeQuartier: 'Lyon', prix: '300 000 €' })).not.toThrow()
  })

  it('accepts teaser variant', () => {
    expect(() => storySchema.parse({ variant: 'teaser', question: 'Saviez-vous ?' })).not.toThrow()
  })

  it('rejects teaser without question', () => {
    expect(() => storySchema.parse({ variant: 'teaser', question: '' })).toThrow()
  })

  it('rejects question over limit', () => {
    const tooLong = 'A'.repeat(CHAR_LIMITS.story.question + 1)
    expect(() => storySchema.parse({ variant: 'teaser', question: tooLong })).toThrow()
  })

  it('rejects unknown variant', () => {
    expect(() => storySchema.parse({ variant: 'unknown', question: 'ok' })).toThrow()
  })
})

// ── Contrast / text color selection ──────────────────────────────────────────
describe('textColorOnBg', () => {
  it('selects white on dark background', () => {
    const result = textColorOnBg('#1e3a5f')
    expect(result.color).toBe('#ffffff')
  })

  it('selects dark on light background', () => {
    const result = textColorOnBg('#f5f5f0')
    expect(result.color).toBe('#1a1a1a')
  })

  it('flags low-contrast background', () => {
    // #777777 has luminance ≈ 0.184 — falls in the gap where neither
    // white (~4.48:1) nor near-black (~3.88:1) meets WCAG AA (≥4.5:1)
    const result = textColorOnBg('#777777')
    expect(result.meetsAA).toBe(false)
  })

  it('white/black passes WCAG AA', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeGreaterThanOrEqual(21)
  })
})

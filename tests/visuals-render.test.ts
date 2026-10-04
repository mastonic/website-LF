import { describe, it, expect, beforeAll } from 'vitest'
import { renderVisual } from '@/lib/visuals/renderer'
import { deriveTheme } from '@/lib/visuals/theme'
import type { BrandIdentity } from '@/types/brand'
import type { RenderRequest } from '@/types/visuals'
import sharp from 'sharp'
import path from 'path'
import { readdir } from 'fs/promises'

// Check if fonts are available
async function fontsAvailable(): Promise<boolean> {
  try {
    const files = await readdir(path.join(process.cwd(), 'public', 'fonts'))
    return files.some((f) => f.endsWith('.ttf') || f.endsWith('.otf'))
  } catch {
    return false
  }
}

const mockBrand: BrandIdentity = {
  id: 'test-id',
  workspace_id: 'ws-id',
  nom_affiche: 'Agence Test',
  signature: 'Votre partenaire',
  logo_path: null,
  avatar_path: null,
  couleurs: [
    { hex: '#1e3a5f', role: 'principale' },
    { hex: '#e8a320', role: 'accent' },
    { hex: '#f5f5f0', role: 'fond' },
    { hex: '#2d5a8e', role: 'secondaire' },
  ],
  polices: { titre: 'Inter', texte: 'Inter' },
  charte: null,
  storage_used_bytes: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const theme = deriveTheme(mockBrand, null)

const annonceRequest: RenderRequest = {
  templateId: 'annonce',
  data: {
    bandeau: 'Nouveauté',
    typeBien: 'Appartement T3',
    villeQuartier: 'Paris 11e',
    surface: '65 m²',
    nbPieces: '3 pièces',
    prix: '320 000 €',
    pointsForts: ['Lumineux', 'Parquet ancien', 'Cave'],
    mentionsLegales: { classeEnergie: 'C', referenceBien: 'REF-001' },
    photoRetouchee: false,
    confirmationLoueSolde: false,
    exportType: 'final',
  },
  lowRes: true,
}

const carrouselRequest: RenderRequest = {
  templateId: 'carrousel',
  data: {
    titreCouverture: '5 conseils pour acheter malin',
    soustitreCouverture: 'Par votre agent immobilier',
    slides: [
      { titre: 'Conseil 1', texte: 'Vérifiez le DPE avant de visiter.' },
      { titre: 'Conseil 2', texte: 'Négociez les honoraires d\'agence.' },
      { titre: 'Conseil 3', texte: 'Lisez le règlement de copropriété.' },
    ],
    titreFinal: 'Parlons de votre projet !',
    ctaFinal: 'Prendre RDV',
    coordonnees: '06 00 00 00 00',
  },
  lowRes: true,
}

const storyRequest: RenderRequest = {
  templateId: 'story',
  data: { variant: 'annonce', typeBien: 'Maison', villeQuartier: 'Lyon 6e', prix: '500 000 €' },
  lowRes: true,
}

describe('renderVisual', () => {
  let hasFonts = false

  beforeAll(async () => {
    hasFonts = await fontsAvailable()
    if (!hasFonts) console.warn('⚠ Polices non téléchargées — tests de rendu ignorés. Exécutez scripts/download-fonts.sh')
  })

  it('annonce: renders PNG at correct dimensions (low-res)', async () => {
    if (!hasFonts) return
    const result = await renderVisual(annonceRequest, theme, null)
    expect(result.contentType).toBe('image/png')
    const meta = await sharp(result.buffer).metadata()
    // Low-res = 1/3 of 1080x1350
    expect(meta.width).toBe(360)
    expect(meta.height).toBe(450)
  })

  it('annonce full-res: PNG is 1080x1350', async () => {
    if (!hasFonts) return
    const req = { ...annonceRequest, lowRes: false }
    const result = await renderVisual(req, theme, null)
    const meta = await sharp(result.buffer).metadata()
    expect(meta.width).toBe(1080)
    expect(meta.height).toBe(1350)
  })

  it('annonce: no crash without logo or photo', async () => {
    if (!hasFonts) return
    await expect(renderVisual(annonceRequest, theme, null)).resolves.toBeDefined()
  })

  it('annonce: brouillon mode adds watermark', async () => {
    if (!hasFonts) return
    const req: RenderRequest = {
      ...annonceRequest,
      lowRes: false,
      data: { ...(annonceRequest.data as object), exportType: 'brouillon' } as RenderRequest['data'],
    }
    const result = await renderVisual(req, theme, null)
    expect(result.warnings.some((w) => w.includes('brouillon'))).toBe(true)
  })

  it('annonce: throws EXPORT_BLOCKED when final without mentions', async () => {
    if (!hasFonts) return
    const req: RenderRequest = {
      ...annonceRequest,
      lowRes: false,
      data: {
        ...(annonceRequest.data as object),
        mentionsLegales: {},
        exportType: 'final',
      } as RenderRequest['data'],
    }
    await expect(renderVisual(req, theme, null)).rejects.toMatchObject({ code: 'EXPORT_BLOCKED' })
  })

  it('carrousel: renders first slide PNG', async () => {
    if (!hasFonts) return
    const result = await renderVisual(carrouselRequest, theme, null)
    expect(result.contentType).toBe('image/png')
    expect(result.buffer.length).toBeGreaterThan(0)
  })

  it('carrousel: renders ZIP with correct number of slides', async () => {
    if (!hasFonts) return
    const req: RenderRequest = { ...carrouselRequest, format: 'zip', lowRes: false }
    const result = await renderVisual(req, theme, null)
    expect(result.contentType).toBe('application/zip')
    // ZIP should contain cover + 3 slides + final = 5 files
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(result.buffer)
    expect(Object.keys(zip.files)).toHaveLength(5)
  })

  it('story annonce: renders 1080x1920 PNG', async () => {
    if (!hasFonts) return
    const req = { ...storyRequest, lowRes: false }
    const result = await renderVisual(req, theme, null)
    const meta = await sharp(result.buffer).metadata()
    expect(meta.width).toBe(1080)
    expect(meta.height).toBe(1920)
  })

  it('story teaser: no crash', async () => {
    if (!hasFonts) return
    const req: RenderRequest = {
      templateId: 'story',
      data: { variant: 'teaser', question: 'Saviez-vous que les frais sont négociables ?' },
      lowRes: true,
    }
    await expect(renderVisual(req, theme, null)).resolves.toBeDefined()
  })

  it('handles very long (but valid) text without crashing', async () => {
    if (!hasFonts) return
    const req: RenderRequest = {
      ...annonceRequest,
      data: {
        ...(annonceRequest.data as object),
        typeBien: 'A'.repeat(30),
        villeQuartier: 'B'.repeat(50),
        prix: 'C'.repeat(30),
      } as RenderRequest['data'],
    }
    await expect(renderVisual(req, theme, null)).resolves.toBeDefined()
  })

  it('theme with no colors uses safe fallbacks', async () => {
    if (!hasFonts) return
    const minimalTheme = deriveTheme(
      { ...mockBrand, couleurs: [], polices: {} },
      null
    )
    await expect(renderVisual(annonceRequest, minimalTheme, null)).resolves.toBeDefined()
  })
})

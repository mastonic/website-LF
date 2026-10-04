import satori from 'satori'
import sharp from 'sharp'
import { createElement } from 'react'
import type { BrandTheme } from './theme'
import type { RenderRequest, RenderResult, AnnonceData, CarrouselData, StoryData } from '@/types/visuals'
import { annonceSchema, carrouselSchema, storySchema } from '@/types/visuals'
import { getFontsForRender } from './fonts'
import { AnnonceTemplate } from './templates/annonce'
import { buildCarrouselSlides } from './templates/carrousel'
import { StoryTemplate } from './templates/story'

const DIMS = {
  annonce:   { width: 1080, height: 1350 },
  carrousel: { width: 1080, height: 1350 },
  story:     { width: 1080, height: 1920 },
}

async function svgToPng(svg: string, width: number, height: number, lowRes: boolean): Promise<Buffer> {
  const scale = lowRes ? 1 / 3 : 1
  let pipe = sharp(Buffer.from(svg), { density: 144 })
  if (lowRes) pipe = pipe.resize(Math.round(width * scale), Math.round(height * scale))
  return pipe.png({ compressionLevel: 6 }).toBuffer()
}

async function addWatermark(png: Buffer, width: number, height: number): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="rgba(0,0,0,0.38)"/>
    <text x="${width / 2}" y="${height / 2 - 40}" font-family="sans-serif" font-size="68" font-weight="bold"
      fill="rgba(255,255,255,0.85)" text-anchor="middle" transform="rotate(-30 ${width / 2} ${height / 2})">
      BROUILLON
    </text>
    <text x="${width / 2}" y="${height / 2 + 40}" font-family="sans-serif" font-size="36"
      fill="rgba(255,255,255,0.7)" text-anchor="middle" transform="rotate(-30 ${width / 2} ${height / 2})">
      à compléter
    </text>
  </svg>`
  return sharp(png)
    .composite([{ input: Buffer.from(svg), blend: 'over' }])
    .png()
    .toBuffer()
}

export function validateAnnonceExport(data: AnnonceData): string[] {
  if (data.exportType !== 'final') return []
  const errors: string[] = []
  if (!data.mentionsLegales.classeEnergie) errors.push('classe énergie (DPE) manquante')
  if (!data.mentionsLegales.referenceBien) errors.push('référence du bien manquante')
  if ((data.bandeau === 'Loué' || data.bandeau === 'Vendu') && !data.confirmationLoueSolde) {
    errors.push(`cochez "Je confirme que ce bien est ${data.bandeau.toLowerCase()}" avant d'exporter en final`)
  }
  return errors
}

export async function renderVisual(
  request: RenderRequest,
  theme: BrandTheme,
  photoDataUri: string | null
): Promise<RenderResult> {
  const t0 = Date.now()
  const warnings: string[] = [...theme.warnings]
  const { templateId, lowRes = false } = request
  const dims = DIMS[templateId]

  const fonts = await getFontsForRender(theme.titleFont, theme.textFont)

  const satoriOpts = { width: dims.width, height: dims.height, fonts }

  // ── Annonce ──────────────────────────────────────────────
  if (templateId === 'annonce') {
    const data = annonceSchema.parse(request.data) as AnnonceData

    const blockErrors = validateAnnonceExport(data)
    if (blockErrors.length > 0) {
      throw Object.assign(
        new Error(`Export final bloqué : ${blockErrors.join(', ')}.`),
        { code: 'EXPORT_BLOCKED', errors: blockErrors }
      )
    }

    const el = createElement(AnnonceTemplate, { data, theme, photoDataUri })
    const svg = await satori(el, satoriOpts)
    let png = await svgToPng(svg, dims.width, dims.height, lowRes)

    if (data.exportType === 'brouillon') {
      png = await addWatermark(png, dims.width, dims.height)
      warnings.push('Mode brouillon — filigrane ajouté.')
    }

    return { buffer: png, contentType: 'image/png', width: dims.width, height: dims.height, renderTimeMs: Date.now() - t0, warnings }
  }

  // ── Carrousel ─────────────────────────────────────────────
  if (templateId === 'carrousel') {
    const data = carrouselSchema.parse(request.data) as CarrouselData
    const slideElements = buildCarrouselSlides(data, theme)

    if (request.format === 'zip') {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      for (let i = 0; i < slideElements.length; i++) {
        const svg = await satori(slideElements[i], satoriOpts)
        const png = await svgToPng(svg, dims.width, dims.height, false)
        zip.file(`slide-${String(i + 1).padStart(2, '0')}.png`, png)
      }

      const buf = Buffer.from(await zip.generateAsync({ type: 'arraybuffer' }))
      return { buffer: buf, contentType: 'application/zip', width: dims.width, height: dims.height, renderTimeMs: Date.now() - t0, warnings }
    }

    // Single slide (preview: first slide, or requested slide index)
    const idx = Math.min(request.previewSlide ?? 0, slideElements.length - 1)
    const svg = await satori(slideElements[idx], satoriOpts)
    const png = await svgToPng(svg, dims.width, dims.height, lowRes)
    return { buffer: png, contentType: 'image/png', width: dims.width, height: dims.height, renderTimeMs: Date.now() - t0, warnings }
  }

  // ── Story ─────────────────────────────────────────────────
  if (templateId === 'story') {
    const data = storySchema.parse(request.data) as StoryData
    const el = createElement(StoryTemplate, { data, theme, photoDataUri })
    const svg = await satori(el, { ...satoriOpts, width: 1080, height: 1920 })
    const png = await svgToPng(svg, 1080, 1920, lowRes)
    return { buffer: png, contentType: 'image/png', width: 1080, height: 1920, renderTimeMs: Date.now() - t0, warnings }
  }

  throw new Error(`Template inconnu : ${templateId}`)
}

/** Generate a 300x375 (annonce/carrousel) or 160x285 (story) thumbnail */
export async function makeThumbnail(png: Buffer, templateId: string): Promise<Buffer> {
  const isStory = templateId === 'story'
  return sharp(png).resize(isStory ? 160 : 300, isStory ? 285 : 375, { fit: 'cover' }).png({ compressionLevel: 8 }).toBuffer()
}

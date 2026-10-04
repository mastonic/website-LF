/**
 * Generate 9 sample PNG exports: 3 brand variants × 3 templates.
 * Run with: npx tsx scripts/generate-samples.ts
 * Requires fonts in public/fonts/ — run scripts/download-fonts.sh first.
 */

import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { renderVisual } from '../lib/visuals/renderer'
import { deriveTheme } from '../lib/visuals/theme'
import type { BrandIdentity } from '../types/brand'
import type { RenderRequest } from '../types/visuals'

const OUT_DIR = path.join(process.cwd(), 'public', 'samples')
mkdirSync(OUT_DIR, { recursive: true })

// ── Brand fixtures ───────────────────────────────────────────────────────────
const BRANDS: { name: string; brand: BrandIdentity }[] = [
  {
    name: 'prestige',
    brand: {
      id: 'b1', workspace_id: 'w1',
      nom_affiche: 'Prestige Immobilier',
      signature: 'L\'excellence à votre service',
      logo_path: null, avatar_path: null,
      couleurs: [
        { hex: '#1e3a5f', role: 'principale' },
        { hex: '#c8a020', role: 'accent' },
        { hex: '#f8f6f0', role: 'fond' },
        { hex: '#2d5a8e', role: 'secondaire' },
      ],
      polices: { titre: 'Playfair Display', texte: 'Lora' },
      charte: null, storage_used_bytes: 0,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
  },
  {
    name: 'moderne',
    brand: {
      id: 'b2', workspace_id: 'w2',
      nom_affiche: 'Agence Moderne',
      signature: 'Votre projet, notre priorité',
      logo_path: null, avatar_path: null,
      couleurs: [
        { hex: '#0f172a', role: 'principale' },
        { hex: '#3b82f6', role: 'accent' },
        { hex: '#f1f5f9', role: 'fond' },
        { hex: '#1e40af', role: 'secondaire' },
      ],
      polices: { titre: 'Montserrat', texte: 'Inter' },
      charte: null, storage_used_bytes: 0,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
  },
  {
    name: 'chaleureux',
    brand: {
      id: 'b3', workspace_id: 'w3',
      nom_affiche: 'Immo Chaleureux',
      signature: 'Chez vous, chez nous',
      logo_path: null, avatar_path: null,
      couleurs: [
        { hex: '#7c2d12', role: 'principale' },
        { hex: '#f97316', role: 'accent' },
        { hex: '#fef3c7', role: 'fond' },
        { hex: '#c2410c', role: 'secondaire' },
      ],
      polices: { titre: 'Raleway', texte: 'DM Sans' },
      charte: null, storage_used_bytes: 0,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
  },
]

// ── Requests ─────────────────────────────────────────────────────────────────
const REQUESTS: { name: string; req: RenderRequest }[] = [
  {
    name: 'annonce',
    req: {
      templateId: 'annonce',
      data: {
        bandeau: 'Nouveauté',
        typeBien: 'Appartement T3',
        villeQuartier: 'Paris 11e',
        surface: '65 m²',
        nbPieces: '3 pièces',
        prix: '320 000 €',
        pointsForts: ['Lumineux', 'Parquet ancien', 'Cave'],
        mentionsLegales: { classeEnergie: 'C', referenceBien: 'REF-2024-001' },
        photoRetouchee: false,
        confirmationLoueSolde: false,
        exportType: 'brouillon',
      },
      lowRes: false,
    },
  },
  {
    name: 'carrousel',
    req: {
      templateId: 'carrousel',
      data: {
        titreCouverture: '5 erreurs à éviter lors de votre achat',
        soustitreCouverture: 'Conseils de votre agent immobilier',
        slides: [
          { titre: 'Ne pas vérifier le DPE', texte: 'Le diagnostic de performance énergétique impacte directement vos charges. Demandez-le avant la visite.' },
          { titre: 'Ignorer les charges', texte: 'Les charges de copropriété peuvent représenter plusieurs centaines d\'euros par mois. Toujours les vérifier.' },
          { titre: 'Sous-estimer les travaux', texte: 'Prévoyez un budget travaux réaliste en faisant estimer les rénovations avant de signer.' },
        ],
        titreFinal: 'Parlons de votre projet !',
        ctaFinal: 'Prendre rendez-vous',
        coordonnees: '06 00 00 00 00 · contact@agence.fr',
      },
      lowRes: false,
      format: 'png',
    },
  },
  {
    name: 'story',
    req: {
      templateId: 'story',
      data: {
        variant: 'teaser',
        question: 'Saviez-vous que vous pouvez négocier les frais d\'agence ?',
        soustitre: 'Glissez pour en savoir plus →',
      },
      lowRes: false,
    },
  },
]

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Génération de ${BRANDS.length * REQUESTS.length} visuels dans ${OUT_DIR}...\n`)

  let total = 0
  let errors = 0

  for (const { name: brandName, brand } of BRANDS) {
    const theme = deriveTheme(brand, null)

    for (const { name: tplName, req } of REQUESTS) {
      const label = `${brandName}_${tplName}`
      process.stdout.write(`  ${label} ... `)

      try {
        const start = Date.now()
        const result = await renderVisual(req, theme, null)
        const ms = Date.now() - start

        const ext = result.contentType === 'application/zip' ? 'zip' : 'png'
        const outPath = path.join(OUT_DIR, `${label}.${ext}`)
        writeFileSync(outPath, result.buffer)

        console.log(`✓ ${(result.buffer.length / 1024).toFixed(0)} Ko — ${ms} ms`)
        if (result.warnings.length > 0) {
          console.log(`    ⚠ ${result.warnings.join(' | ')}`)
        }
        total++
      } catch (err) {
        console.log(`✗ ${err instanceof Error ? err.message : String(err)}`)
        errors++
      }
    }
  }

  console.log(`\n${total} visuels générés, ${errors} erreurs.`)
  if (errors > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

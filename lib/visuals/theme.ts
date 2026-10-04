import type { BrandIdentity, BrandColor, FontKey } from '@/types/brand'
import { textColorOnBg } from './contrast'

export interface BrandTheme {
  primary: string
  secondary: string
  accent: string
  bg: string
  primaryText: string   // readable text color on primary
  bgText: string        // readable text color on bg
  titleFont: FontKey
  textFont: FontKey
  logoDataUri: string | null
  nomAffiche: string | null
  signature: string | null
  warnings: string[]
}

function colorByRole(couleurs: BrandColor[], role: string, fallback: string): string {
  return couleurs.find((c) => c.role === role)?.hex ?? fallback
}

export function deriveTheme(brand: BrandIdentity, logoDataUri: string | null): BrandTheme {
  const warnings: string[] = []

  const primary = colorByRole(brand.couleurs, 'principale', '#1e3a5f')
  const secondary = colorByRole(brand.couleurs, 'secondaire', '#2d5a8e')
  const accent = colorByRole(brand.couleurs, 'accent', '#e8a320')
  const bg = colorByRole(brand.couleurs, 'fond', '#f5f5f0')

  const primaryResult = textColorOnBg(primary)
  const bgResult = textColorOnBg(bg)

  if (!primaryResult.meetsAA)
    warnings.push(`Contraste insuffisant sur la couleur principale (${primary}) — WCAG AA non atteint`)
  if (!bgResult.meetsAA)
    warnings.push(`Contraste insuffisant sur la couleur de fond (${bg}) — WCAG AA non atteint`)

  return {
    primary,
    secondary,
    accent,
    bg,
    primaryText: primaryResult.color,
    bgText: bgResult.color,
    titleFont: brand.polices?.titre ?? 'Inter',
    textFont: brand.polices?.texte ?? 'Inter',
    logoDataUri,
    nomAffiche: brand.nom_affiche,
    signature: brand.signature,
    warnings,
  }
}

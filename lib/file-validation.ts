// Validation du type réel d'un fichier par ses octets magiques (pas l'extension).

export type AllowedImageType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/svg+xml' | 'image/heic'

const SIGNATURES: Array<{ mime: AllowedImageType; bytes: number[]; offset?: number }> = [
  // JPEG : FF D8 FF
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  // PNG : 89 50 4E 47 0D 0A 1A 0A
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // WebP : RIFF????WEBP (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
  // HEIC/HEIF : ftyp box à l'offset 4 — on vérifie "ftyp" à l'offset 4
  // bytes[4..7] = 66 74 79 70  ("ftyp")
  { mime: 'image/heic', bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
]

/**
 * Détecte le type MIME réel d'un fichier binaire.
 * Retourne le MIME détecté, ou null si inconnu / non supporté.
 */
export function detectMimeType(buffer: Buffer): AllowedImageType | 'image/svg+xml' | null {
  // SVG : texte, commence par "<svg" ou "<?xml" (après BOM éventuel)
  const textStart = buffer.slice(0, 512).toString('utf8').trimStart()
  if (textStart.startsWith('<svg') || textStart.startsWith('<?xml') || textStart.startsWith('﻿<?xml')) {
    // On vérifie qu'il y a bien un tag <svg> dans les 1024 premiers octets
    if (buffer.slice(0, 1024).toString('utf8').includes('<svg')) {
      return 'image/svg+xml'
    }
  }

  for (const sig of SIGNATURES) {
    const off = sig.offset ?? 0
    const slice = buffer.slice(off, off + sig.bytes.length)
    if (sig.bytes.every((b, i) => slice[i] === b)) {
      // WebP: vaut aussi vérifier WEBP à offset 8
      if (sig.mime === 'image/webp') {
        const webp = buffer.slice(8, 12)
        if (webp.toString('ascii') !== 'WEBP') continue
      }
      return sig.mime
    }
  }

  return null
}

/** Valide qu'un fichier correspond au type attendu et respecte la taille max. */
export function validateFile(
  buffer: Buffer,
  allowedTypes: AllowedImageType[],
  maxBytes: number
): { ok: true; mime: AllowedImageType } | { ok: false; reason: string } {
  if (buffer.length > maxBytes) {
    const mb = (maxBytes / 1024 / 1024).toFixed(0)
    return { ok: false, reason: `Fichier trop lourd (max ${mb} Mo).` }
  }

  const mime = detectMimeType(buffer)
  if (!mime) {
    return { ok: false, reason: 'Format non reconnu. Utilisez JPEG, PNG, WebP, SVG ou HEIC.' }
  }

  // Cast sécurisé : si mime est image/svg+xml il est dans AllowedImageType
  const typedMime = mime as AllowedImageType
  if (!allowedTypes.includes(typedMime)) {
    return { ok: false, reason: `Type ${mime} non autorisé pour cet usage.` }
  }

  return { ok: true, mime: typedMime }
}

/** Valide une couleur hex (#RRGGBB ou #RGB). */
export function validateHexColor(hex: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)
}

/**
 * Calcule le ratio de contraste WCAG entre deux couleurs hex.
 * Retourne true si le contraste est >= 4.5 (WCAG AA).
 */
export function meetsWcagAA(hex1: string, hex2: string): boolean {
  const lum = (hex: string) => {
    const rgb = hexToRgb(hex)
    if (!rgb) return 0
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const l1 = lum(hex1)
  const l2 = lum(hex2)
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
  return ratio >= 4.5
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '')
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    }
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    }
  }
  return null
}

/**
 * Traitement d'image côté serveur via sharp :
 * - Suppression EXIF (GPS, données personnelles)
 * - Conversion HEIC → JPEG
 * - Correction d'orientation
 * - Redimensionnement (max 2400px) + miniature (480px)
 */
import sharp from 'sharp'

export interface ProcessedImage {
  optimized: Buffer  // largeur max 2400px, EXIF supprimé, orientation corrigée
  thumbnail: Buffer  // largeur max 480px
  mime: 'image/jpeg' | 'image/png' | 'image/webp'
  width: number
  height: number
  thumbWidth: number
  thumbHeight: number
}

const MAX_WIDTH = 2400
const THUMB_WIDTH = 480

/**
 * Traite une image upload : HEIC→JPEG, strip EXIF, resize, miniature.
 * Accepte JPEG, PNG, WebP, HEIC.
 */
export async function processUploadedImage(
  input: Buffer,
  inputMime: string
): Promise<ProcessedImage> {
  // 1. Charger avec sharp (gère HEIC via libvips)
  let pipeline = sharp(input)

  // 2. Récupérer les métadonnées AVANT de modifier (pour corriger l'orientation)
  const meta = await pipeline.metadata()

  // 3. Corriger l'orientation EXIF automatiquement
  pipeline = pipeline.rotate() // rotate() sans argument utilise l'orientation EXIF

  // 4. Déterminer le format de sortie
  // HEIC → JPEG, SVG non traité ici (géré séparément)
  const isHeic = inputMime === 'image/heic' || meta.format === 'heif'
  const outputFormat: 'jpeg' | 'png' | 'webp' =
    isHeic ? 'jpeg'
    : meta.format === 'png' ? 'png'
    : meta.format === 'webp' ? 'webp'
    : 'jpeg'

  const outputMime = `image/${outputFormat}` as 'image/jpeg' | 'image/png' | 'image/webp'

  // 5. Optimisé (max 2400px) — sharp strip EXIF par défaut quand on passe withMetadata(false)
  // Ne PAS appeler withMetadata() = supprime tous les métadonnées incl. GPS
  const optimizedBuf = await pipeline
    .clone()
    .resize({ width: MAX_WIDTH, height: MAX_WIDTH, fit: 'inside', withoutEnlargement: true })
    [outputFormat](outputFormat === 'jpeg' ? { quality: 85, progressive: true } : {})
    .toBuffer()

  // 6. Récupérer les dimensions de l'image traitée
  const optimizedMeta = await sharp(optimizedBuf).metadata()
  const width = optimizedMeta.width ?? 0
  const height = optimizedMeta.height ?? 0

  // 7. Miniature (480px)
  const thumbBuf = await pipeline
    .clone()
    .resize({ width: THUMB_WIDTH, height: THUMB_WIDTH, fit: 'inside', withoutEnlargement: true })
    [outputFormat](outputFormat === 'jpeg' ? { quality: 75 } : {})
    .toBuffer()

  const thumbMeta = await sharp(thumbBuf).metadata()

  return {
    optimized: optimizedBuf,
    thumbnail: thumbBuf,
    mime: outputMime,
    width,
    height,
    thumbWidth: thumbMeta.width ?? 0,
    thumbHeight: thumbMeta.height ?? 0,
  }
}

/**
 * Supprime uniquement les métadonnées EXIF d'une image (pour vérification).
 * Utile pour les tests unitaires.
 */
export async function stripExif(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .jpeg({ quality: 95 })
    .toBuffer()
}

/**
 * Vérifie si un buffer JPEG contient des données GPS dans l'EXIF.
 */
export async function hasGpsData(input: Buffer): Promise<boolean> {
  try {
    const meta = await sharp(input).metadata()
    const exif = meta.exif
    if (!exif) return false
    // GPS IFD marker dans l'EXIF brut : tag 0x8825 (34853)
    // On cherche la séquence de bytes du tag GPS
    const gpsTag = Buffer.from([0x88, 0x25]) // big-endian tag 0x8825
    const gpsTagLE = Buffer.from([0x25, 0x88]) // little-endian
    return exif.includes(gpsTag) || exif.includes(gpsTagLE)
  } catch {
    return false
  }
}

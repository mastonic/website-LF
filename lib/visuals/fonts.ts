import { readFile } from 'fs/promises'
import path from 'path'
import type { FontKey } from '@/types/brand'
import { FONT_REGISTRY } from '@/lib/fonts'

// Module-level cache: survives multiple requests in the same Node process
const fontCache = new Map<FontKey, ArrayBuffer>()

export interface SatoriFontConfig {
  name: string
  data: ArrayBuffer
  weight: 400
  style: 'normal'
}

async function loadFont(key: FontKey): Promise<ArrayBuffer | null> {
  const cached = fontCache.get(key)
  if (cached) return cached

  const meta = FONT_REGISTRY[key]
  if (!meta) return null

  const fontPath = path.join(process.cwd(), 'public', 'fonts', meta.path)
  try {
    const buf = await readFile(fontPath)
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
    fontCache.set(key, ab)
    return ab
  } catch {
    return null
  }
}

export async function getFontsForRender(titleFont: FontKey, textFont: FontKey): Promise<SatoriFontConfig[]> {
  const needed = Array.from(new Set<FontKey>(['Inter', titleFont, textFont]))
  const configs: SatoriFontConfig[] = []

  for (const key of needed) {
    const data = await loadFont(key)
    if (data) {
      configs.push({ name: key, data, weight: 400, style: 'normal' })
    }
  }

  if (configs.length === 0) {
    throw new Error('Aucune police disponible. Exécutez scripts/download-fonts.sh pour les télécharger.')
  }

  return configs
}

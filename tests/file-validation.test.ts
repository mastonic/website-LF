import { describe, it, expect } from 'vitest'
import { detectMimeType, validateFile, validateHexColor, meetsWcagAA } from '@/lib/file-validation'

// JPEG magic bytes
const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, ...Array(100).fill(0)])
// PNG magic bytes
const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(100).fill(0)])
// WebP: RIFF????WEBP
const webpBuf = (() => {
  const b = Buffer.alloc(20)
  b.write('RIFF', 0, 'ascii')
  b.write('WEBP', 8, 'ascii')
  return b
})()
// HEIC: ftyp at offset 4
const heicBuf = (() => {
  const b = Buffer.alloc(20)
  b.write('ftyp', 4, 'ascii')
  return b
})()
// SVG
const svgBuf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>')

describe('detectMimeType', () => {
  it('detects JPEG', () => expect(detectMimeType(jpegBuf)).toBe('image/jpeg'))
  it('detects PNG', () => expect(detectMimeType(pngBuf)).toBe('image/png'))
  it('detects WebP', () => expect(detectMimeType(webpBuf)).toBe('image/webp'))
  it('detects HEIC', () => expect(detectMimeType(heicBuf)).toBe('image/heic'))
  it('detects SVG', () => expect(detectMimeType(svgBuf)).toBe('image/svg+xml'))
  it('returns null for unknown', () => expect(detectMimeType(Buffer.from([0x00, 0x01, 0x02]))).toBeNull())
})

describe('validateFile', () => {
  it('accepts valid JPEG under limit', () => {
    const r = validateFile(jpegBuf, ['image/jpeg'], 1024 * 1024)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.mime).toBe('image/jpeg')
  })

  it('rejects file over size limit', () => {
    const big = Buffer.alloc(5 * 1024 * 1024)
    big[0] = 0xff; big[1] = 0xd8; big[2] = 0xff
    const r = validateFile(big, ['image/jpeg'], 2 * 1024 * 1024)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('Mo')
  })

  it('rejects disallowed type', () => {
    const r = validateFile(jpegBuf, ['image/png'], 1024 * 1024)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('non autorisé')
  })

  it('rejects unknown type', () => {
    const r = validateFile(Buffer.from([0x00, 0x01]), ['image/jpeg'], 1024 * 1024)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('Format non reconnu')
  })
})

describe('validateHexColor', () => {
  it('accepts #RRGGBB', () => expect(validateHexColor('#1e3a5f')).toBe(true))
  it('accepts #RGB', () => expect(validateHexColor('#abc')).toBe(true))
  it('rejects no hash', () => expect(validateHexColor('1e3a5f')).toBe(false))
  it('rejects wrong length', () => expect(validateHexColor('#1e3a5')).toBe(false))
  it('rejects non-hex chars', () => expect(validateHexColor('#zzzzzz')).toBe(false))
})

describe('meetsWcagAA', () => {
  it('black/white passes (ratio ~21)', () => expect(meetsWcagAA('#000000', '#ffffff')).toBe(true))
  it('similar greys fail', () => expect(meetsWcagAA('#888888', '#999999')).toBe(false))
  it('dark blue on white passes', () => expect(meetsWcagAA('#003366', '#ffffff')).toBe(true))
})

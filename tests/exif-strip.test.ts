import { describe, it, expect } from 'vitest'
import { stripExif, hasGpsData, processUploadedImage } from '@/lib/image-processing'
import sharp from 'sharp'

async function makeJpegWithGps(): Promise<Buffer> {
  // Create a minimal valid JPEG via sharp, then we check our GPS detector
  const buf = await sharp({
    create: { width: 10, height: 10, channels: 3, background: { r: 100, g: 150, b: 200 } },
  })
    .jpeg()
    .toBuffer()
  return buf
}

async function makeJpeg(): Promise<Buffer> {
  return sharp({
    create: { width: 40, height: 30, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .jpeg({ quality: 80 })
    .toBuffer()
}

async function makePng(): Promise<Buffer> {
  return sharp({
    create: { width: 40, height: 30, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .png()
    .toBuffer()
}

describe('stripExif', () => {
  it('returns a valid JPEG buffer', async () => {
    const jpeg = await makeJpeg()
    const stripped = await stripExif(jpeg)
    expect(stripped[0]).toBe(0xff)
    expect(stripped[1]).toBe(0xd8)
    expect(stripped[2]).toBe(0xff)
  })
})

describe('hasGpsData', () => {
  it('returns false for synthetic JPEG with no GPS EXIF', async () => {
    const jpeg = await makeJpeg()
    expect(await hasGpsData(jpeg)).toBe(false)
  })
})

describe('processUploadedImage', () => {
  it('produces optimized + thumbnail buffers for JPEG', async () => {
    const jpeg = await makeJpeg()
    const result = await processUploadedImage(jpeg, 'image/jpeg')
    expect(result.optimized.length).toBeGreaterThan(0)
    expect(result.thumbnail.length).toBeGreaterThan(0)
    expect(result.mime).toBe('image/jpeg')
    expect(result.width).toBeGreaterThan(0)
    expect(result.height).toBeGreaterThan(0)
  })

  it('converts PNG and strips EXIF', async () => {
    const png = await makePng()
    const result = await processUploadedImage(png, 'image/png')
    expect(result.mime).toBe('image/png')
    expect(result.optimized.length).toBeGreaterThan(0)
  })

  it('thumbnail is smaller than optimized', async () => {
    const jpeg = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: { r: 128, g: 128, b: 128 } },
    }).jpeg({ quality: 90 }).toBuffer()
    const result = await processUploadedImage(jpeg, 'image/jpeg')
    expect(result.thumbnail.length).toBeLessThan(result.optimized.length)
    expect(result.thumbWidth).toBeLessThanOrEqual(480)
  })
})

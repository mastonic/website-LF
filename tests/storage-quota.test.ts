import { describe, it, expect } from 'vitest'
import { computeQuota, formatMb, wouldExceedQuota } from '@/lib/storage-quota'
import { STORAGE_QUOTA_BYTES } from '@/types/brand'

describe('computeQuota', () => {
  it('computes 0% for 0 bytes', () => {
    const q = computeQuota(0)
    expect(q.pct).toBe(0)
    expect(q.used).toBe(0)
    expect(q.total).toBe(STORAGE_QUOTA_BYTES)
    expect(q.exceeded).toBe(false)
    expect(q.remaining).toBe(STORAGE_QUOTA_BYTES)
  })

  it('computes 50% for half quota', () => {
    const q = computeQuota(STORAGE_QUOTA_BYTES / 2)
    expect(q.pct).toBe(50)
    expect(q.exceeded).toBe(false)
  })

  it('computes 100% at quota', () => {
    const q = computeQuota(STORAGE_QUOTA_BYTES)
    expect(q.pct).toBe(100)
    expect(q.exceeded).toBe(false)
    expect(q.remaining).toBe(0)
  })

  it('marks exceeded when over quota', () => {
    const q = computeQuota(STORAGE_QUOTA_BYTES + 1)
    expect(q.exceeded).toBe(true)
    expect(q.pct).toBe(100)
    expect(q.remaining).toBe(0)
  })

  it('includes label string', () => {
    const q = computeQuota(1024 * 1024) // 1 MB
    expect(q.label).toContain('sur')
    expect(q.label).toContain('Mo')
  })
})

describe('formatMb', () => {
  it('formats bytes below 1MB as Ko', () => {
    expect(formatMb(512 * 1024)).toMatch(/Ko$/)
  })
  it('formats bytes >= 1MB as Mo', () => {
    expect(formatMb(10 * 1024 * 1024)).toMatch(/Mo$/)
  })
})

describe('wouldExceedQuota', () => {
  it('returns false when within quota', () => {
    expect(wouldExceedQuota(0, 100)).toBe(false)
  })

  it('returns true when would exceed', () => {
    expect(wouldExceedQuota(STORAGE_QUOTA_BYTES - 10, 11)).toBe(true)
  })

  it('returns false at exact boundary', () => {
    expect(wouldExceedQuota(STORAGE_QUOTA_BYTES - 10, 10)).toBe(false)
  })
})

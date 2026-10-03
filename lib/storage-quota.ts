import { STORAGE_QUOTA_BYTES } from '@/types/brand'

export interface QuotaInfo {
  used: number      // octets utilisés
  total: number     // quota total (500 Mo)
  remaining: number
  pct: number       // 0-100
  exceeded: boolean
  label: string     // ex. "42 Mo sur 500 Mo"
}

export function computeQuota(usedBytes: number): QuotaInfo {
  const total = STORAGE_QUOTA_BYTES
  const remaining = Math.max(0, total - usedBytes)
  const pct = Math.min(100, Math.round((usedBytes / total) * 100))
  const exceeded = usedBytes > total
  return {
    used: usedBytes,
    total,
    remaining,
    pct,
    exceeded,
    label: `${formatMb(usedBytes)} sur ${formatMb(total)}`,
  }
}

export function formatMb(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

/**
 * Vérifie si l'ajout de `additionalBytes` dépasserait le quota.
 */
export function wouldExceedQuota(currentUsed: number, additionalBytes: number): boolean {
  return currentUsed + additionalBytes > STORAGE_QUOTA_BYTES
}

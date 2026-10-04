import React from 'react'
import type { BrandTheme } from '@/lib/visuals/theme'
import type { AnnonceData } from '@/types/visuals'
import { textColorOnBg } from '@/lib/visuals/contrast'

interface Props {
  data: AnnonceData
  theme: BrandTheme
  photoDataUri: string | null
}

const BANDEAU_COLORS: Record<string, string> = {
  'À venir':           '#6366f1',
  'Nouveauté':         '#10b981',
  'Toujours disponible': '#3b82f6',
  'Loué':              '#f59e0b',
  'Vendu':             '#ef4444',
}

function scaleFontSize(text: string, base: number, maxLen: number): number {
  if (text.length <= maxLen * 0.5) return base
  if (text.length <= maxLen * 0.7) return Math.round(base * 0.88)
  if (text.length <= maxLen * 0.9) return Math.round(base * 0.78)
  return Math.round(base * 0.68)
}

const PLACEHOLDER_PHOTO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="680"><rect width="1080" height="680" fill="#c8d6e5"/><text x="540" y="340" font-family="sans-serif" font-size="48" fill="#8fafc8" text-anchor="middle" dominant-baseline="middle">Photo du bien</text></svg>'
)}`

export function AnnonceTemplate({ data, theme, photoDataUri }: Props) {
  const bandeauColor = BANDEAU_COLORS[data.bandeau] ?? theme.accent
  const bandeauText = textColorOnBg(bandeauColor).color

  const photo = photoDataUri ?? PLACEHOLDER_PHOTO
  const prixSize = scaleFontSize(data.prix, 52, 20)
  const titleSize = scaleFontSize(`${data.typeBien} — ${data.villeQuartier}`, 28, 60)

  const mentionsLine = [
    data.mentionsLegales.precisionPrix,
    data.mentionsLegales.classeEnergie ? `DPE : ${data.mentionsLegales.classeEnergie}` : null,
    data.mentionsLegales.referenceBien ? `Réf. ${data.mentionsLegales.referenceBien}` : null,
    data.mentionsLegales.mentionSupp,
    data.photoRetouchee ? "Projection d'aménagement non contractuelle" : null,
  ].filter(Boolean).join(' · ')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 1080,
        height: 1350,
        backgroundColor: theme.bg,
        fontFamily: theme.textFont,
        overflow: 'hidden',
      }}
    >
      {/* ── Photo block (680px) ─────────────────────────────── */}
      <div style={{ display: 'flex', position: 'relative', width: 1080, height: 680 }}>
        {/* Photo */}
        <img
          src={photo}
          width={1080}
          height={680}
          style={{ objectFit: 'cover', position: 'absolute', inset: 0 }}
        />

        {/* Bottom gradient overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 320,
            background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.85) 100%)',
            display: 'flex',
          }}
        />

        {/* Bandeau badge */}
        <div
          style={{
            position: 'absolute',
            top: 28,
            left: 28,
            backgroundColor: bandeauColor,
            color: bandeauText,
            fontFamily: theme.titleFont,
            fontSize: 22,
            fontWeight: 700,
            padding: '8px 20px',
            borderRadius: 4,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            display: 'flex',
          }}
        >
          {data.bandeau}
        </div>

        {/* Property info overlay on gradient */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '0 40px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div
            style={{
              color: '#ffffff',
              fontFamily: theme.titleFont,
              fontSize: titleSize,
              fontWeight: 700,
              letterSpacing: 0.3,
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            {data.typeBien} — {data.villeQuartier}
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 20, display: 'flex' }}>
              {data.surface}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, display: 'flex' }}>•</span>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 20, display: 'flex' }}>
              {data.nbPieces}
            </span>
          </div>
        </div>
      </div>

      {/* ── Brand block (670px) ─────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          backgroundColor: theme.bg,
          padding: '36px 40px 28px',
        }}
      >
        {/* Price */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            marginBottom: 28,
          }}
        >
          <span
            style={{
              fontFamily: theme.titleFont,
              fontSize: prixSize,
              fontWeight: 700,
              color: theme.primary,
              display: 'flex',
            }}
          >
            {data.prix}
          </span>
        </div>

        {/* Points forts */}
        {data.pointsForts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32, flex: 1 }}>
            {data.pointsForts.map((pt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: theme.accent,
                    flexShrink: 0,
                    display: 'flex',
                  }}
                />
                <span
                  style={{
                    color: theme.bgText,
                    fontSize: 22,
                    overflow: 'hidden',
                    display: 'flex',
                  }}
                >
                  {pt}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Separator */}
        <div
          style={{
            width: '100%',
            height: 1,
            backgroundColor: `${theme.primary}30`,
            marginBottom: 24,
            display: 'flex',
          }}
        />

        {/* Footer: logo + signature + mentions */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {theme.nomAffiche && (
              <span
                style={{
                  fontFamily: theme.titleFont,
                  fontSize: 20,
                  fontWeight: 700,
                  color: theme.primary,
                  display: 'flex',
                }}
              >
                {theme.nomAffiche}
              </span>
            )}
            {theme.signature && (
              <span style={{ color: theme.bgText, fontSize: 15, opacity: 0.7, display: 'flex' }}>
                {theme.signature}
              </span>
            )}
            {mentionsLine && (
              <span
                style={{
                  color: theme.bgText,
                  fontSize: 12,
                  opacity: 0.55,
                  marginTop: 4,
                  maxWidth: 700,
                  overflow: 'hidden',
                  display: 'flex',
                }}
              >
                {mentionsLine}
              </span>
            )}
          </div>

          {/* Logo */}
          {theme.logoDataUri && (
            <img
              src={theme.logoDataUri}
              style={{ maxWidth: 120, maxHeight: 64, objectFit: 'contain' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

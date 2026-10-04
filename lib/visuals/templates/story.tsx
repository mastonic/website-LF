import React from 'react'
import type { BrandTheme } from '@/lib/visuals/theme'
import type { StoryData } from '@/types/visuals'

interface Props {
  data: StoryData
  theme: BrandTheme
  photoDataUri: string | null
  showSafeZones?: boolean  // development helper
}

const PLACEHOLDER_PHOTO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="#c8d6e5"/></svg>'
)}`

function StoryAnnonce({ data, theme, photoDataUri, showSafeZones }: Props & { data: Extract<StoryData, { variant: 'annonce' }> }) {
  const photo = photoDataUri ?? PLACEHOLDER_PHOTO

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 1080,
        height: 1920,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: theme.textFont,
      }}
    >
      {/* Full-bleed photo */}
      <img
        src={photo}
        style={{ position: 'absolute', inset: 0, width: 1080, height: 1920, objectFit: 'cover' }}
      />

      {/* Bottom gradient for text legibility */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 700,
          background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.9) 100%)',
          display: 'flex',
        }}
      />

      {/* Top gradient for logo area */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 350,
          background: 'linear-gradient(to top, transparent 0%, rgba(0,0,0,0.6) 100%)',
          display: 'flex',
        }}
      />

      {/* Safe zone indicators (dev only) */}
      {showSafeZones && (
        <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 250, border: '2px dashed rgba(255,0,0,0.5)', display: 'flex' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 250, border: '2px dashed rgba(255,0,0,0.5)', display: 'flex' }} />
        </>
      )}

      {/* Logo — within safe zone top (below 250px) */}
      <div style={{ position: 'absolute', top: 270, left: 48, display: 'flex', alignItems: 'center', gap: 16 }}>
        {theme.logoDataUri ? (
          <img src={theme.logoDataUri} style={{ maxWidth: 80, maxHeight: 40, objectFit: 'contain' }} />
        ) : null}
        {theme.nomAffiche && (
          <span style={{ color: '#ffffff', fontSize: 22, fontWeight: 700, fontFamily: theme.titleFont, display: 'flex' }}>
            {theme.nomAffiche}
          </span>
        )}
      </div>

      {/* Property info — above safe zone bottom (above 250px from bottom) */}
      <div
        style={{
          position: 'absolute',
          bottom: 270,
          left: 48,
          right: 48,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {data.typeBien && (
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              backgroundColor: theme.accent,
              color: '#ffffff',
              fontSize: 20,
              fontWeight: 700,
              fontFamily: theme.titleFont,
              padding: '6px 18px',
              borderRadius: 4,
            }}
          >
            {data.typeBien}
          </div>
        )}
        {data.villeQuartier && (
          <div style={{ color: '#ffffff', fontSize: 32, fontWeight: 700, fontFamily: theme.titleFont, display: 'flex' }}>
            {data.villeQuartier}
          </div>
        )}
        {data.prix && (
          <div style={{ color: theme.accent, fontSize: 48, fontWeight: 700, fontFamily: theme.titleFont, display: 'flex' }}>
            {data.prix}
          </div>
        )}
        {/* Separator */}
        <div style={{ width: 60, height: 3, backgroundColor: theme.accent, borderRadius: 2, marginTop: 8, display: 'flex' }} />
      </div>
    </div>
  )
}

function StoryTeaser({ data, theme, showSafeZones }: Props & { data: Extract<StoryData, { variant: 'teaser' }> }) {
  const questionSize = data.question.length > 60 ? 60 : data.question.length > 40 ? 72 : 80

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 1080,
        height: 1920,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: theme.primary,
        fontFamily: theme.textFont,
      }}
    >
      {/* Background accent shape */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          right: -200,
          width: 700,
          height: 700,
          borderRadius: 350,
          backgroundColor: `${theme.accent}20`,
          display: 'flex',
        }}
      />

      {/* Safe zone indicators */}
      {showSafeZones && (
        <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 250, border: '2px dashed rgba(255,255,0,0.4)', display: 'flex' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 250, border: '2px dashed rgba(255,255,0,0.4)', display: 'flex' }} />
        </>
      )}

      {/* Logo — top, within safe zone */}
      <div style={{ position: 'absolute', top: 270, left: 56, display: 'flex', alignItems: 'center', gap: 16 }}>
        {theme.logoDataUri ? (
          <img src={theme.logoDataUri} style={{ maxWidth: 80, maxHeight: 40, objectFit: 'contain' }} />
        ) : null}
        {theme.nomAffiche && (
          <span style={{ color: `${theme.primaryText}cc`, fontSize: 20, fontFamily: theme.titleFont, display: 'flex' }}>
            {theme.nomAffiche}
          </span>
        )}
      </div>

      {/* Main content — centered vertically */}
      <div
        style={{
          position: 'absolute',
          top: 400,
          bottom: 500,
          left: 56,
          right: 56,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 40,
        }}
      >
        <div style={{ width: 60, height: 4, backgroundColor: theme.accent, borderRadius: 2, display: 'flex' }} />
        <div
          style={{
            fontFamily: theme.titleFont,
            fontSize: questionSize,
            fontWeight: 700,
            color: theme.primaryText,
            lineHeight: 1.2,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {data.question}
        </div>
        {data.soustitre && (
          <div style={{ fontSize: 28, color: `${theme.primaryText}bb`, lineHeight: 1.55, display: 'flex' }}>
            {data.soustitre}
          </div>
        )}
      </div>

      {/* Sticker zone placeholder — above safe zone bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 270,
          left: 56,
          right: 56,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            border: `2px dashed ${theme.accent}60`,
            borderRadius: 16,
            padding: '20px 40px',
            display: 'flex',
          }}
        >
          <span style={{ color: `${theme.primaryText}60`, fontSize: 20, fontFamily: theme.textFont, display: 'flex' }}>
            Zone sticker Instagram
          </span>
        </div>
      </div>
    </div>
  )
}

export function StoryTemplate({ data, theme, photoDataUri, showSafeZones }: Props) {
  if (data.variant === 'annonce') {
    return (
      <StoryAnnonce
        data={data}
        theme={theme}
        photoDataUri={photoDataUri}
        showSafeZones={showSafeZones}
      />
    )
  }
  return (
    <StoryTeaser
      data={data}
      theme={theme}
      photoDataUri={photoDataUri}
      showSafeZones={showSafeZones}
    />
  )
}

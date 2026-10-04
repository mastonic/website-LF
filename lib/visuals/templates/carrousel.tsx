import React from 'react'
import type { BrandTheme } from '@/lib/visuals/theme'
import type { CarrouselData } from '@/types/visuals'

interface SlideProps {
  theme: BrandTheme
  slideNumber: number
  total: number
  children: React.ReactNode
}

function SlideWrapper({ theme, slideNumber, total, children }: SlideProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 1080,
        height: 1350,
        overflow: 'hidden',
        fontFamily: theme.textFont,
        position: 'relative',
      }}
    >
      {children}
      {/* Slide number */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          right: 32,
          color: 'rgba(150,150,150,0.7)',
          fontSize: 16,
          fontFamily: theme.textFont,
          display: 'flex',
        }}
      >
        {slideNumber}/{total}
      </div>
    </div>
  )
}

function CoverSlide({ data, theme, total }: { data: CarrouselData; theme: BrandTheme; total: number }) {
  return (
    <SlideWrapper theme={theme} slideNumber={1} total={total}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          backgroundColor: theme.primary,
          padding: '80px 64px',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo top-right */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {theme.logoDataUri ? (
            <img
              src={theme.logoDataUri}
              style={{ maxWidth: 100, maxHeight: 48, objectFit: 'contain' }}
            />
          ) : (
            <span style={{ color: `${theme.primaryText}70`, fontSize: 18, fontFamily: theme.titleFont, display: 'flex' }}>
              {theme.nomAffiche ?? ''}
            </span>
          )}
        </div>

        {/* Title block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div
            style={{
              width: 60,
              height: 4,
              backgroundColor: theme.accent,
              borderRadius: 2,
              display: 'flex',
            }}
          />
          <div
            style={{
              fontFamily: theme.titleFont,
              fontSize: data.titreCouverture.length > 50 ? 52 : 64,
              fontWeight: 700,
              color: theme.primaryText,
              lineHeight: 1.15,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {data.titreCouverture}
          </div>
          {data.soustitreCouverture && (
            <div
              style={{
                fontSize: 24,
                color: `${theme.primaryText}cc`,
                lineHeight: 1.5,
                maxWidth: 800,
                display: 'flex',
              }}
            >
              {data.soustitreCouverture}
            </div>
          )}
        </div>

        {/* Scroll hint */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: `${theme.primaryText}90`, fontSize: 18, display: 'flex' }}>
            Faites défiler
          </span>
          <span style={{ color: theme.accent, fontSize: 22, display: 'flex' }}>→</span>
        </div>
      </div>
    </SlideWrapper>
  )
}

function ContentSlide({
  titre,
  texte,
  theme,
  slideNumber,
  total,
}: {
  titre: string
  texte: string
  theme: BrandTheme
  slideNumber: number
  total: number
}) {
  return (
    <SlideWrapper theme={theme} slideNumber={slideNumber} total={total}>
      <div
        style={{
          display: 'flex',
          flex: 1,
          backgroundColor: theme.bg,
        }}
      >
        {/* Accent stripe */}
        <div style={{ width: 8, backgroundColor: theme.accent, flexShrink: 0, display: 'flex' }} />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '80px 56px 80px 48px',
            justifyContent: 'center',
            gap: 40,
          }}
        >
          <div
            style={{
              fontFamily: theme.titleFont,
              fontSize: titre.length > 40 ? 44 : 52,
              fontWeight: 700,
              color: theme.primary,
              lineHeight: 1.2,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {titre}
          </div>
          <div
            style={{
              fontSize: 26,
              color: theme.bgText,
              lineHeight: 1.65,
              maxWidth: 900,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {texte}
          </div>
        </div>
      </div>
    </SlideWrapper>
  )
}

function FinalSlide({ data, theme, total }: { data: CarrouselData; theme: BrandTheme; total: number }) {
  return (
    <SlideWrapper theme={theme} slideNumber={total} total={total}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          backgroundColor: theme.primary,
          padding: '80px 64px',
          justifyContent: 'space-between',
        }}
      >
        {/* Top: accent + title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ width: 60, height: 4, backgroundColor: theme.accent, borderRadius: 2, display: 'flex' }} />
          <div
            style={{
              fontFamily: theme.titleFont,
              fontSize: data.titreFinal.length > 50 ? 48 : 60,
              fontWeight: 700,
              color: theme.primaryText,
              lineHeight: 1.2,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {data.titreFinal}
          </div>
          {data.ctaFinal && (
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                backgroundColor: theme.accent,
                color: '#ffffff',
                fontFamily: theme.titleFont,
                fontSize: 22,
                fontWeight: 700,
                padding: '14px 32px',
                borderRadius: 6,
                marginTop: 12,
              }}
            >
              {data.ctaFinal}
            </div>
          )}
        </div>

        {/* Bottom: contact + logo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {theme.nomAffiche && (
              <span style={{ color: theme.primaryText, fontSize: 22, fontFamily: theme.titleFont, fontWeight: 700, display: 'flex' }}>
                {theme.nomAffiche}
              </span>
            )}
            {data.coordonnees && (
              <span style={{ color: `${theme.primaryText}cc`, fontSize: 18, display: 'flex' }}>
                {data.coordonnees}
              </span>
            )}
          </div>
          {theme.logoDataUri && (
            <img src={theme.logoDataUri} style={{ maxWidth: 100, maxHeight: 48, objectFit: 'contain' }} />
          )}
        </div>
      </div>
    </SlideWrapper>
  )
}

// Returns an array of React elements, one per slide
export function buildCarrouselSlides(data: CarrouselData, theme: BrandTheme): React.ReactElement[] {
  const total = 1 + data.slides.length + 1  // cover + content + final
  const slides: React.ReactElement[] = []

  slides.push(<CoverSlide key="cover" data={data} theme={theme} total={total} />)

  data.slides.forEach((slide, i) => {
    slides.push(
      <ContentSlide
        key={`slide-${i}`}
        titre={slide.titre}
        texte={slide.texte}
        theme={theme}
        slideNumber={i + 2}
        total={total}
      />
    )
  })

  slides.push(<FinalSlide key="final" data={data} theme={theme} total={total} />)

  return slides
}

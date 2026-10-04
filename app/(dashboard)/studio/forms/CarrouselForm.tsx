'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import type { CarrouselData } from '@/types/visuals'
import { CHAR_LIMITS } from '@/types/visuals'

interface Props { onPreview: (data: CarrouselData) => void }

function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length > max
  return <span className={`text-xs ml-1 ${over ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{value.length}/{max}</span>
}

const EMPTY_SLIDE = { titre: '', texte: '' }

export function CarrouselForm({ onPreview }: Props) {
  const [titreCouverture, setTitreCouverture] = useState('')
  const [soustitreCouverture, setSoustitreCouverture] = useState('')
  const [slides, setSlides] = useState([{ ...EMPTY_SLIDE }, { ...EMPTY_SLIDE }, { ...EMPTY_SLIDE }])
  const [titreFinal, setTitreFinal] = useState('')
  const [ctaFinal, setCtaFinal] = useState('')
  const [coordonnees, setCoordonnees] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  function addSlide() {
    if (slides.length < 5) setSlides([...slides, { ...EMPTY_SLIDE }])
  }

  function removeSlide(idx: number) {
    if (slides.length > 3) setSlides(slides.filter((_, i) => i !== idx))
  }

  function updateSlide(idx: number, field: 'titre' | 'texte', value: string) {
    setSlides(slides.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  function validate(): string[] {
    const errs: string[] = []
    if (!titreCouverture.trim()) errs.push('Titre de couverture requis')
    if (titreCouverture.length > CHAR_LIMITS.carrousel.titreCouverture) errs.push(`Titre couverture : max ${CHAR_LIMITS.carrousel.titreCouverture} caractères`)
    slides.forEach((s, i) => {
      if (!s.titre.trim()) errs.push(`Slide ${i + 1} : titre requis`)
      if (!s.texte.trim()) errs.push(`Slide ${i + 1} : texte requis`)
    })
    if (!titreFinal.trim()) errs.push('Titre de la slide finale requis')
    return errs
  }

  function handlePreview() {
    const errs = validate()
    setErrors(errs)
    if (errs.length > 0) return
    onPreview({
      titreCouverture: titreCouverture.trim(),
      soustitreCouverture: soustitreCouverture.trim() || undefined,
      slides: slides.map((s) => ({ titre: s.titre.trim(), texte: s.texte.trim() })),
      titreFinal: titreFinal.trim(),
      ctaFinal: ctaFinal.trim() || undefined,
      coordonnees: coordonnees.trim() || undefined,
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
      {/* Cover */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Slide de couverture</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Titre accrocheur <CharCount value={titreCouverture} max={CHAR_LIMITS.carrousel.titreCouverture} /></label>
            <input type="text" value={titreCouverture} onChange={(e) => setTitreCouverture(e.target.value)} placeholder="5 erreurs à éviter lors de votre achat" maxLength={CHAR_LIMITS.carrousel.titreCouverture} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Sous-titre <CharCount value={soustitreCouverture} max={CHAR_LIMITS.carrousel.soustitreCouverture} /></label>
            <input type="text" value={soustitreCouverture} onChange={(e) => setSoustitreCouverture(e.target.value)} placeholder="Conseils d'un professionnel" maxLength={CHAR_LIMITS.carrousel.soustitreCouverture} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* Content slides */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Slides de contenu ({slides.length}/5)</h3>
          {slides.length < 5 && (
            <button type="button" onClick={addSlide} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          )}
        </div>
        <div className="space-y-4">
          {slides.map((s, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Slide {i + 1}</span>
                {slides.length > 3 && (
                  <button type="button" onClick={() => removeSlide(i)} className="text-red-400 hover:text-red-500">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <input
                type="text"
                value={s.titre}
                onChange={(e) => updateSlide(i, 'titre', e.target.value)}
                placeholder={`Titre slide ${i + 1}`}
                maxLength={CHAR_LIMITS.carrousel.titreSlide}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={s.texte}
                onChange={(e) => updateSlide(i, 'texte', e.target.value)}
                placeholder="Contenu de la slide…"
                maxLength={CHAR_LIMITS.carrousel.texteSlide}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <CharCount value={s.texte} max={CHAR_LIMITS.carrousel.texteSlide} />
            </div>
          ))}
        </div>
      </div>

      {/* Final slide */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Slide finale</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Titre <CharCount value={titreFinal} max={CHAR_LIMITS.carrousel.titreFinal} /></label>
            <input type="text" value={titreFinal} onChange={(e) => setTitreFinal(e.target.value)} placeholder="Parlons de votre projet !" maxLength={CHAR_LIMITS.carrousel.titreFinal} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Appel à l'action <CharCount value={ctaFinal} max={CHAR_LIMITS.carrousel.ctaFinal} /></label>
            <input type="text" value={ctaFinal} onChange={(e) => setCtaFinal(e.target.value)} placeholder="Prenez RDV" maxLength={CHAR_LIMITS.carrousel.ctaFinal} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Coordonnées <CharCount value={coordonnees} max={CHAR_LIMITS.carrousel.coordonnees} /></label>
            <input type="text" value={coordonnees} onChange={(e) => setCoordonnees(e.target.value)} placeholder="06 00 00 00 00 · contact@agence.fr" maxLength={CHAR_LIMITS.carrousel.coordonnees} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="text-xs text-red-700 bg-red-50 rounded-lg p-3 space-y-1">
          {errors.map((e, i) => <div key={i}>• {e}</div>)}
        </div>
      )}

      <button type="button" onClick={handlePreview} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
        Générer l'aperçu (slide 1)
      </button>
    </div>
  )
}

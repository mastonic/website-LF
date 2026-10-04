'use client'

import { useState } from 'react'
import type { StoryData } from '@/types/visuals'
import { CHAR_LIMITS } from '@/types/visuals'

interface Annonce { id: string; titre: string }
interface Props { annonces: Annonce[]; onPreview: (data: StoryData) => void }

function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length > max
  return <span className={`text-xs ml-1 ${over ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{value.length}/{max}</span>
}

export function StoryForm({ annonces, onPreview }: Props) {
  const [variant, setVariant] = useState<'annonce' | 'teaser'>('annonce')
  // Annonce fields
  const [typeBien, setTypeBien] = useState('')
  const [villeQuartier, setVilleQuartier] = useState('')
  const [prix, setPrix] = useState('')
  const [photoId, setPhotoId] = useState('')
  // Teaser fields
  const [question, setQuestion] = useState('')
  const [soustitre, setSoustitre] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  function validate(): string[] {
    const errs: string[] = []
    if (variant === 'teaser') {
      if (!question.trim()) errs.push('Question requise')
      if (question.length > CHAR_LIMITS.story.question) errs.push(`Question : max ${CHAR_LIMITS.story.question} caractères`)
    }
    return errs
  }

  function handlePreview() {
    const errs = validate()
    setErrors(errs)
    if (errs.length > 0) return

    if (variant === 'annonce') {
      onPreview({ variant, typeBien: typeBien.trim(), villeQuartier: villeQuartier.trim(), prix: prix.trim(), photoId: photoId || undefined })
    } else {
      onPreview({ variant, question: question.trim(), soustitre: soustitre.trim() || undefined })
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
      {/* Variant selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Type de story</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setVariant('annonce')} className={`flex-1 text-sm py-2 rounded-lg border font-medium transition-colors ${variant === 'annonce' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
            Story annonce
          </button>
          <button type="button" onClick={() => setVariant('teaser')} className={`flex-1 text-sm py-2 rounded-lg border font-medium transition-colors ${variant === 'teaser' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
            Question / Teaser
          </button>
        </div>
      </div>

      {variant === 'annonce' ? (
        <div className="space-y-3">
          {annonces.length > 0 && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">Photo de couverture</label>
              <select value={photoId} onChange={(e) => setPhotoId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Sans photo —</option>
                {annonces.map((a) => <option key={a.id} value={a.id}>{a.titre}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Type de bien <CharCount value={typeBien} max={CHAR_LIMITS.story.typeBien} /></label>
            <input type="text" value={typeBien} onChange={(e) => setTypeBien(e.target.value)} placeholder="Maison 4 pièces" maxLength={CHAR_LIMITS.story.typeBien} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Ville / Quartier <CharCount value={villeQuartier} max={CHAR_LIMITS.story.villeQuartier} /></label>
            <input type="text" value={villeQuartier} onChange={(e) => setVilleQuartier(e.target.value)} placeholder="Lyon 6e" maxLength={CHAR_LIMITS.story.villeQuartier} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Prix <CharCount value={prix} max={CHAR_LIMITS.story.prix} /></label>
            <input type="text" value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="450 000 €" maxLength={CHAR_LIMITS.story.prix} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Question <CharCount value={question} max={CHAR_LIMITS.story.question} /></label>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Saviez-vous que vous pouvez négocier les frais d'agence ?" maxLength={CHAR_LIMITS.story.question} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Sous-titre <CharCount value={soustitre} max={CHAR_LIMITS.story.soustitre} /></label>
            <input type="text" value={soustitre} onChange={(e) => setSoustitre(e.target.value)} placeholder="Glissez pour en savoir plus →" maxLength={CHAR_LIMITS.story.soustitre} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <p className="text-xs text-gray-400">La zone de sticker Instagram est matérialisée dans l'aperçu.</p>
        </div>
      )}

      {errors.length > 0 && (
        <div className="text-xs text-red-700 bg-red-50 rounded-lg p-3 space-y-1">
          {errors.map((e, i) => <div key={i}>• {e}</div>)}
        </div>
      )}

      <button type="button" onClick={handlePreview} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
        Générer l'aperçu
      </button>
    </div>
  )
}

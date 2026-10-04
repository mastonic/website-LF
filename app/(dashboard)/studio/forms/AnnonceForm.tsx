'use client'

import { useState } from 'react'
import type { AnnonceData } from '@/types/visuals'
import { CHAR_LIMITS } from '@/types/visuals'

interface Annonce { id: string; titre: string }
interface Props {
  annonces: Annonce[]
  onPreview: (data: AnnonceData) => void
}

const BANDEAUX = ['À venir', 'Nouveauté', 'Toujours disponible', 'Loué', 'Vendu'] as const
const ENERGIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const

function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length > max
  return (
    <span className={`text-xs ml-1 ${over ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
      {value.length}/{max}
    </span>
  )
}

export function AnnonceForm({ annonces, onPreview }: Props) {
  const [bandeau, setBandeau] = useState<AnnonceData['bandeau']>('Nouveauté')
  const [typeBien, setTypeBien] = useState('')
  const [villeQuartier, setVilleQuartier] = useState('')
  const [surface, setSurface] = useState('')
  const [nbPieces, setNbPieces] = useState('')
  const [prix, setPrix] = useState('')
  const [pointsForts, setPointsForts] = useState(['', '', ''])
  const [photoId, setPhotoId] = useState('')
  const [precisionPrix, setPrecisionPrix] = useState('')
  const [classeEnergie, setClasseEnergie] = useState('')
  const [referenceBien, setReferenceBien] = useState('')
  const [mentionSupp, setMentionSupp] = useState('')
  const [photoRetouchee, setPhotoRetouchee] = useState(false)
  const [confirmationLoueSolde, setConfirmationLoueSolde] = useState(false)
  const [exportType, setExportType] = useState<'final' | 'brouillon'>('final')
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const needsConfirm = bandeau === 'Loué' || bandeau === 'Vendu'
  const missingMentions: string[] = []
  if (!classeEnergie) missingMentions.push('classe énergie')
  if (!referenceBien) missingMentions.push('référence du bien')
  if (needsConfirm && !confirmationLoueSolde) missingMentions.push('confirmation statut')
  const finalBlocked = missingMentions.length > 0 && exportType === 'final'

  function validate(): string[] {
    const errors: string[] = []
    if (!typeBien.trim()) errors.push('Type de bien requis')
    else if (typeBien.length > CHAR_LIMITS.annonce.typeBien) errors.push(`Type de bien : max ${CHAR_LIMITS.annonce.typeBien} caractères`)
    if (!villeQuartier.trim()) errors.push('Ville ou quartier requis')
    if (!surface.trim()) errors.push('Surface requise')
    if (!nbPieces.trim()) errors.push('Nombre de pièces requis')
    if (!prix.trim()) errors.push('Prix requis')
    return errors
  }

  function handlePreview() {
    const errors = validate()
    setValidationErrors(errors)
    if (errors.length > 0) return

    const data: AnnonceData = {
      bandeau,
      typeBien: typeBien.trim(),
      villeQuartier: villeQuartier.trim(),
      surface: surface.trim(),
      nbPieces: nbPieces.trim(),
      prix: prix.trim(),
      pointsForts: pointsForts.filter((p) => p.trim()).map((p) => p.trim()),
      photoId: photoId || undefined,
      mentionsLegales: {
        precisionPrix: precisionPrix.trim() || undefined,
        classeEnergie: (classeEnergie as AnnonceData['mentionsLegales']['classeEnergie']) || undefined,
        referenceBien: referenceBien.trim() || undefined,
        mentionSupp: mentionSupp.trim() || undefined,
      },
      photoRetouchee,
      confirmationLoueSolde,
      exportType,
    }

    onPreview(data)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
      {/* Bandeau */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Bandeau</label>
        <div className="flex flex-wrap gap-2">
          {BANDEAUX.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBandeau(b)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                bandeau === b ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-300'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Photo selection */}
      {annonces.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photo de couverture</label>
          <select
            value={photoId}
            onChange={(e) => setPhotoId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Sans photo —</option>
            {annonces.map((a) => (
              <option key={a.id} value={a.id}>{a.titre}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Sélectionnez une annonce pour utiliser sa photo de couverture.</p>
        </div>
      )}

      {/* Core fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Type de bien <CharCount value={typeBien} max={CHAR_LIMITS.annonce.typeBien} />
          </label>
          <input
            type="text"
            value={typeBien}
            onChange={(e) => setTypeBien(e.target.value)}
            placeholder="Appartement T3"
            maxLength={CHAR_LIMITS.annonce.typeBien}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Ville / Quartier <CharCount value={villeQuartier} max={CHAR_LIMITS.annonce.villeQuartier} />
          </label>
          <input
            type="text"
            value={villeQuartier}
            onChange={(e) => setVilleQuartier(e.target.value)}
            placeholder="Paris 11e"
            maxLength={CHAR_LIMITS.annonce.villeQuartier}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Surface</label>
          <input type="text" value={surface} onChange={(e) => setSurface(e.target.value)} placeholder="65 m²" maxLength={20} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Pièces</label>
          <input type="text" value={nbPieces} onChange={(e) => setNbPieces(e.target.value)} placeholder="3 pièces" maxLength={10} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Prix <CharCount value={prix} max={CHAR_LIMITS.annonce.prix} />
        </label>
        <input type="text" value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="320 000 €" maxLength={CHAR_LIMITS.annonce.prix} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Points forts */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Points forts (max 3)</label>
        {pointsForts.map((pt, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
            <input
              type="text"
              value={pt}
              onChange={(e) => setPointsForts(pointsForts.map((p, j) => j === i ? e.target.value : p))}
              placeholder={`Point fort ${i + 1}`}
              maxLength={CHAR_LIMITS.annonce.pointFort}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <CharCount value={pt} max={CHAR_LIMITS.annonce.pointFort} />
          </div>
        ))}
      </div>

      {/* Mentions légales */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2">
          Mentions légales
          {missingMentions.length > 0 && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              {missingMentions.length} manquante{missingMentions.length > 1 ? 's' : ''}
            </span>
          )}
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Précision du prix</label>
            <input type="text" value={precisionPrix} onChange={(e) => setPrecisionPrix(e.target.value)} placeholder="Charges comprises / Honoraires à charge acquéreur" maxLength={CHAR_LIMITS.annonce.precisionPrix} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Classe énergie (DPE) *</label>
              <select value={classeEnergie} onChange={(e) => setClasseEnergie(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Non renseigné —</option>
                {ENERGIES.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Référence du bien *</label>
              <input type="text" value={referenceBien} onChange={(e) => setReferenceBien(e.target.value)} placeholder="REF-2024-001" maxLength={CHAR_LIMITS.annonce.referenceBien} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Mention supplémentaire</label>
            <input type="text" value={mentionSupp} onChange={(e) => setMentionSupp(e.target.value)} placeholder="..." maxLength={CHAR_LIMITS.annonce.mentionSupp} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </details>

      {/* Options */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={photoRetouchee} onChange={(e) => setPhotoRetouchee(e.target.checked)} className="rounded" />
          Projection d'aménagement
        </label>
        {needsConfirm && (
          <label className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded-lg cursor-pointer">
            <input type="checkbox" checked={confirmationLoueSolde} onChange={(e) => setConfirmationLoueSolde(e.target.checked)} className="rounded" />
            Je confirme que ce bien est bien {bandeau.toLowerCase()} *
          </label>
        )}
      </div>

      {/* Export type */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setExportType('final')} className={`flex-1 text-sm py-2 rounded-lg border font-medium transition-colors ${exportType === 'final' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>Export final</button>
        <button type="button" onClick={() => setExportType('brouillon')} className={`flex-1 text-sm py-2 rounded-lg border font-medium transition-colors ${exportType === 'brouillon' ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>Brouillon</button>
      </div>

      {finalBlocked && exportType === 'final' && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          ⚠ Export final bloqué : {missingMentions.join(', ')}. Complétez ou passez en mode brouillon.
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="text-xs text-red-700 bg-red-50 rounded-lg p-3 space-y-1">
          {validationErrors.map((e, i) => <div key={i}>• {e}</div>)}
        </div>
      )}

      <button
        type="button"
        onClick={handlePreview}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
      >
        Générer l'aperçu
      </button>
    </div>
  )
}

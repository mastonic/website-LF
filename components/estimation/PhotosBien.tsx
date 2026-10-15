'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2, Plus, ScanSearch, Trash2 } from 'lucide-react'
import { reduirePhoto } from '@/lib/image-client'
import {
  AMPLEURS,
  MAX_PHOTOS,
  NIVEAUX_TRAVAUX,
  type AnalysePhotos,
  type PhotoAffichee,
  type TravauxSuggere,
} from '@/lib/photos-shared'

interface Props {
  estimationId: string
  initialPhotos: PhotoAffichee[]
  initialAnalyse: AnalysePhotos | null
  /** Postes déjà présents dans les travaux (pour ne pas les proposer deux fois). */
  postesExistants: string[]
  onAjouterTravaux: (t: TravauxSuggere) => void
  /** Appelé quand les photos ou leur analyse changent (le dossier rédigé n'est plus à jour). */
  onChange: () => void
}

export function PhotosBien({ estimationId, initialPhotos, initialAnalyse, postesExistants, onAjouterTravaux, onChange }: Props) {
  const [photos, setPhotos] = useState<PhotoAffichee[]>(initialPhotos)
  const [analyse, setAnalyse] = useState<AnalysePhotos | null>(initialAnalyse)
  const [envoi, setEnvoi] = useState<string | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const aJour = !!analyse && analyse.photo_ids.length === photos.length && photos.every((p) => analyse.photo_ids.includes(p.id))

  async function ajouter(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    const restant = MAX_PHOTOS - photos.length
    const choisies = Array.from(files).slice(0, Math.max(0, restant))
    if (files.length > restant) setError(`Maximum ${MAX_PHOTOS} photos : seules les ${restant} premières sont ajoutées.`)
    for (let i = 0; i < choisies.length; i++) {
      setEnvoi(`Envoi de la photo ${i + 1} sur ${choisies.length}…`)
      try {
        const petite = await reduirePhoto(choisies[i])
        const fd = new FormData()
        fd.append('file', petite)
        const res = await fetch(`/api/estimations/${estimationId}/photos`, { method: 'POST', body: fd })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error ?? 'Envoi impossible')
        setPhotos((prev) => [...prev, json.photo as PhotoAffichee])
        onChange()
      } catch (e) {
        setError((e as Error).message)
        break
      }
    }
    setEnvoi(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function supprimer(id: string) {
    setError(null)
    const res = await fetch(`/api/estimations/${estimationId}/photos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? 'Suppression impossible')
      return
    }
    setPhotos((prev) => prev.filter((p) => p.id !== id))
    onChange()
  }

  async function analyser() {
    setError(null)
    setAnalysing(true)
    try {
      const res = await fetch(`/api/estimations/${estimationId}/photos/analyse`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'L’analyse a échoué.')
      setAnalyse(json.analyse as AnalysePhotos)
      onChange()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAnalysing(false)
    }
  }

  return (
    <section aria-labelledby="h-photos" className="rounded-xl border bg-white p-6 print:hidden">
      <h2 id="h-photos" className="text-lg font-semibold text-gray-900 mb-1">Photos du bien</h2>
      <p className="text-sm text-gray-500 mb-4">
        Ajoutez les photos de votre visite (jusqu’à {MAX_PHOTOS}). Elles sont relues pour repérer l’état visible et les postes de travaux possibles.
        Vous gardez la main sur les montants.
      </p>

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {photos.map((p, i) => (
            <li key={p.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full rounded-lg object-cover bg-gray-100" />
              <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 text-xs text-white">{i + 1}</span>
              <button
                type="button"
                aria-label={`Supprimer la photo ${i + 1}`}
                className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-gray-600 hover:text-red-600"
                onClick={() => supprimer(p.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          id="photos-input"
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => ajouter(e.target.files)}
        />
        <label
          htmlFor="photos-input"
          className={`inline-flex items-center gap-2 min-h-[44px] cursor-pointer rounded-lg border px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 ${
            photos.length >= MAX_PHOTOS || envoi ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <Camera className="h-4 w-4" /> Ajouter des photos
        </label>
        {photos.length > 0 && (
          <button
            type="button"
            onClick={analyser}
            disabled={analysing || !!envoi}
            className="inline-flex items-center gap-2 min-h-[44px] rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {analysing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
            {analysing ? 'Lecture des photos…' : analyse ? 'Relire les photos' : 'Analyser les photos'}
          </button>
        )}
        {envoi && <span className="text-sm text-gray-500" role="status">{envoi}</span>}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

      {analyse && (
        <div className="mt-6 space-y-5 border-t pt-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Ce que montrent les photos</h3>
            <p className="mt-1 text-xs text-gray-500">Observations indicatives, faites à partir des photos seulement : à confirmer sur place.</p>
            {!aJour && (
              <p className="mt-2 text-sm text-amber-700">Les photos ont changé depuis cette lecture : relancez-la pour la mettre à jour.</p>
            )}
            <p className="mt-3 text-sm text-gray-800">
              <span className="font-medium">{NIVEAUX_TRAVAUX[analyse.niveau_travaux]}.</span> {analyse.etat_general}
            </p>
          </div>

          {analyse.pieces.length > 0 && (
            <ul className="space-y-2 text-sm text-gray-700">
              {analyse.pieces.map((p, i) => (
                <li key={i}>
                  <span className="font-medium">Photo {p.photo}{p.piece ? ` · ${p.piece}` : ''} :</span> {p.observations.join(' ; ')}
                </li>
              ))}
            </ul>
          )}

          {analyse.travaux_suggeres.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Postes de travaux repérés</h4>
              <ul className="space-y-2">
                {analyse.travaux_suggeres.map((t, i) => {
                  const dejaLa = postesExistants.includes(t.poste)
                  return (
                    <li key={i} className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-gray-50 p-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">
                          {t.poste} <span className="font-normal text-gray-500">· ampleur {AMPLEURS[t.ampleur]}</span>
                        </p>
                        <p className="text-gray-600">
                          {t.pourquoi}
                          {t.photo ? ` (photo ${t.photo})` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={dejaLa}
                        onClick={() => onAjouterTravaux(t)}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3 text-xs text-gray-700 hover:bg-white disabled:opacity-50"
                      >
                        <Plus className="h-3 w-3" /> {dejaLa ? 'Déjà dans les travaux' : 'Ajouter aux travaux'}
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-2 text-xs text-gray-500">Le montant reste à saisir par vous, après votre visite.</p>
            </div>
          )}

          {analyse.atouts.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Atouts visibles</h4>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-0.5">
                {analyse.atouts.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          {analyse.a_verifier.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-4">
              <h4 className="text-sm font-semibold text-amber-900 mb-1">À vérifier sur place</h4>
              <ul className="list-disc pl-5 text-sm text-amber-900/90 space-y-0.5">
                {analyse.a_verifier.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

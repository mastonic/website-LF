'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { AddressSearch } from '@/components/estimation/AddressSearch'
import type { AddressSuggestion } from '@/lib/geocode'

const field = 'w-full min-h-[44px] rounded-lg border border-input bg-white px-3 text-base focus:outline-none focus:ring-2 focus:ring-ring'

export default function NouvelleEstimationPage() {
  const router = useRouter()
  const [adresse, setAdresse] = useState<AddressSuggestion | null>(null)
  const [type, setType] = useState<'Appartement' | 'Maison'>('Maison')
  const [surface, setSurface] = useState('')
  const [pieces, setPieces] = useState('')
  const [annee, setAnnee] = useState('')
  const [etat, setEtat] = useState('')
  const [notes, setNotes] = useState('')
  const [concurrent, setConcurrent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!adresse) return setError('Choisissez une adresse dans la liste proposée.')
    const s = Number(surface.replace(',', '.'))
    if (!(s >= 9 && s <= 400)) return setError('Indiquez une surface entre 9 et 400 m².')
    const c = concurrent ? Number(concurrent.replace(/\s/g, '').replace(',', '.')) : null
    if (c !== null && !(c >= 0)) return setError('Montant de l’autre avis invalide.')

    setLoading(true)
    try {
      const res = await fetch('/api/estimations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adresse: adresse.label,
          codeInsee: adresse.codeInsee,
          lat: adresse.lat,
          lon: adresse.lon,
          type,
          surface: s,
          pieces: pieces ? Number(pieces) : null,
          etat: etat.trim() || null,
          annee_construction: annee ? Number(annee) : null,
          notes: notes.trim() || null,
          prix_concurrent: c,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Estimation impossible.')
        return
      }
      router.push(`/estimation/${json.id}`)
    } catch {
      setError('Connexion impossible. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 sm:p-4 sm:p-8 max-w-3xl">
      <Link href="/estimation" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft className="h-4 w-4" /> Estimations
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Nouvelle estimation</h1>
      <p className="text-sm text-gray-500 mb-8">
        Thomas retrouve les ventes réelles autour du bien. Vous ajouterez ensuite les travaux et les points propres au bien.
      </p>

      <form onSubmit={submit} className="space-y-5 rounded-xl border bg-white p-6 shadow-sm" noValidate>
        <div>
          <label htmlFor="adresse" className="block text-sm font-medium mb-1">Adresse du bien</label>
          <AddressSearch value={adresse} onChange={setAdresse} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium mb-1">Type de bien</label>
            <select id="type" className={field} value={type} onChange={(e) => setType(e.target.value as 'Appartement' | 'Maison')}>
              <option>Maison</option>
              <option>Appartement</option>
            </select>
          </div>
          <div>
            <label htmlFor="surface" className="block text-sm font-medium mb-1">Surface habitable (m²)</label>
            <input id="surface" className={field} inputMode="decimal" value={surface} onChange={(e) => setSurface(e.target.value)} placeholder="95" />
          </div>
          <div>
            <label htmlFor="pieces" className="block text-sm font-medium mb-1">Pièces</label>
            <input id="pieces" className={field} inputMode="numeric" value={pieces} onChange={(e) => setPieces(e.target.value.replace(/\D/g, ''))} placeholder="4" />
          </div>
          <div>
            <label htmlFor="annee" className="block text-sm font-medium mb-1">Construit en</label>
            <input id="annee" className={field} inputMode="numeric" value={annee} onChange={(e) => setAnnee(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1900" />
          </div>
        </div>

        <div>
          <label htmlFor="etat" className="block text-sm font-medium mb-1">État général (facultatif)</label>
          <input id="etat" className={field} value={etat} onChange={(e) => setEtat(e.target.value)} placeholder="À rénover entièrement, chauffage au fioul, pas de tableau électrique" maxLength={300} />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-1">Vos remarques (facultatif)</label>
          <textarea id="notes" className={`${field} py-2 min-h-[88px]`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Calme, petit jardin, village de caractère…" maxLength={2000} />
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <label htmlFor="concurrent" className="block text-sm font-medium mb-1">Autre avis de valeur reçu par le vendeur, en € (facultatif)</label>
          <input id="concurrent" className={field} inputMode="numeric" value={concurrent} onChange={(e) => setConcurrent(e.target.value.replace(/[^\d\s]/g, ''))} placeholder="450 000" />
          <p className="mt-1 text-xs text-gray-500">Sert uniquement à situer ce prix par rapport aux ventes réelles, pour argumenter calmement.</p>
        </div>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 min-h-[44px] rounded-lg bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Recherche des ventes…' : 'Rechercher les ventes autour du bien'}
        </button>
      </form>
    </div>
  )
}

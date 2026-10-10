'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, MapPin, ArrowRight } from 'lucide-react'

interface Suggestion {
  label: string
  codeInsee: string
  lat: number
  lon: number
}

interface Comparable {
  id: string
  date: string
  prix: number
  surface: number
  pieces: number | null
  voie: string
  distanceM: number
  prixM2: number
}

interface Result {
  adresse: string
  prixM2Median: number
  estimationBasse: number
  estimationCentrale: number
  estimationHaute: number
  nbVentes: number
  rayonM: number
  periode: { debut: string; fin: string }
  fiabilite: 'faible' | 'moyenne' | 'bonne'
  comparables: Comparable[]
}

const GEOCODERS = [
  'https://data.geopf.fr/geocodage/search',
  'https://api-adresse.data.gouv.fr/search/',
]

async function searchAddress(q: string, signal: AbortSignal): Promise<Suggestion[]> {
  for (const base of GEOCODERS) {
    try {
      const res = await fetch(`${base}?q=${encodeURIComponent(q)}&limit=5&autocomplete=1`, { signal })
      if (!res.ok) continue
      const json = await res.json()
      return (json.features ?? [])
        .filter((f: any) => f.properties?.citycode && f.geometry?.coordinates)
        .map((f: any) => ({
          label: f.properties.label as string,
          codeInsee: f.properties.citycode as string,
          lon: f.geometry.coordinates[0] as number,
          lat: f.geometry.coordinates[1] as number,
        }))
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
    }
  }
  return []
}

const eur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const mois = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })

const FIABILITE = {
  bonne: 'Fiabilité : bonne (beaucoup de ventes proches)',
  moyenne: 'Fiabilité : moyenne',
  faible: 'Fiabilité : faible (peu de ventes comparables)',
} as const

export default function EstimationSimulator() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [chosen, setChosen] = useState<Suggestion | null>(null)
  const [type, setType] = useState<'Appartement' | 'Maison'>('Appartement')
  const [surface, setSurface] = useState('')
  const [pieces, setPieces] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    if (chosen || query.trim().length < 4) {
      setSuggestions([])
      return
    }
    const t = setTimeout(async () => {
      abort.current?.abort()
      const ctrl = new AbortController()
      abort.current = ctrl
      try {
        setSuggestions(await searchAddress(query.trim(), ctrl.signal))
      } catch {
        /* annulé */
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query, chosen])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)
    if (!chosen) return setError('Choisissez une adresse dans la liste proposée.')
    const s = Number(surface.replace(',', '.'))
    if (!(s >= 9 && s <= 400)) return setError('Indiquez une surface entre 9 et 400 m².')
    setLoading(true)
    try {
      const res = await fetch('/api/estimation/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adresse: chosen.label,
          codeInsee: chosen.codeInsee,
          lat: chosen.lat,
          lon: chosen.lon,
          type,
          surface: s,
          pieces: pieces ? Number(pieces) : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) setError(json.error ?? 'Estimation impossible.')
      else setResult(json)
    } catch {
      setError('Connexion impossible. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const field = 'w-full min-h-[44px] rounded-lg border border-input bg-white px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={submit} className="rounded-xl border bg-white p-6 shadow-sm space-y-4" noValidate>
        <div className="relative">
          <label htmlFor="sim-adresse" className="block text-sm font-medium mb-1">Adresse du bien</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" aria-hidden />
            <input
              id="sim-adresse"
              className={`${field} pl-10`}
              value={query}
              autoComplete="off"
              placeholder="12 rue de la République, Lyon"
              onChange={(e) => {
                setQuery(e.target.value)
                setChosen(null)
              }}
              aria-autocomplete="list"
              aria-controls="sim-suggestions"
            />
          </div>
          {suggestions.length > 0 && (
            <ul id="sim-suggestions" role="listbox" className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg overflow-hidden">
              {suggestions.map((s) => (
                <li key={s.label + s.lat}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="w-full text-left min-h-[44px] px-3 py-2 text-sm hover:bg-blue-50"
                    onClick={() => {
                      setChosen(s)
                      setQuery(s.label)
                      setSuggestions([])
                    }}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="sim-type" className="block text-sm font-medium mb-1">Type de bien</label>
            <select id="sim-type" className={field} value={type} onChange={(e) => setType(e.target.value as 'Appartement' | 'Maison')}>
              <option>Appartement</option>
              <option>Maison</option>
            </select>
          </div>
          <div>
            <label htmlFor="sim-surface" className="block text-sm font-medium mb-1">Surface habitable (m²)</label>
            <input id="sim-surface" className={field} inputMode="decimal" value={surface} onChange={(e) => setSurface(e.target.value)} placeholder="65" />
          </div>
          <div>
            <label htmlFor="sim-pieces" className="block text-sm font-medium mb-1">Pièces (facultatif)</label>
            <input id="sim-pieces" className={field} inputMode="numeric" value={pieces} onChange={(e) => setPieces(e.target.value.replace(/\D/g, ''))} placeholder="3" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Analyse des ventes…</> : 'Estimer gratuitement'}
        </button>

        <div role="alert" aria-live="polite">
          {error && <p className="text-sm text-red-700 font-medium">Erreur : {error}</p>}
        </div>
      </form>

      {result && (
        <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm" aria-live="polite">
          <p className="text-sm text-gray-600">{result.adresse}</p>
          <p className="mt-2 text-sm font-medium text-gray-700">Estimation indicative</p>
          <p className="text-3xl sm:text-4xl font-bold text-gray-900">
            {eur(result.estimationBasse)} <span className="text-gray-400">à</span> {eur(result.estimationHaute)}
          </p>
          <p className="mt-1 text-gray-700">
            Valeur centrale : <strong>{eur(result.estimationCentrale)}</strong> · {eur(result.prixM2Median)}/m²
          </p>
          <p className="mt-2 text-sm text-gray-600">
            {FIABILITE[result.fiabilite]} — {result.nbVentes} ventes réelles dans {result.rayonM >= 1000 ? `${result.rayonM / 1000} km` : `${result.rayonM} m`}, de {mois(result.periode.debut)} à {mois(result.periode.fin)}.
          </p>

          <h3 className="mt-6 font-semibold text-gray-900">Ventes comparables</h3>
          <ul className="mt-2 divide-y">
            {result.comparables.map((c) => (
              <li key={c.id} className="py-2 flex flex-wrap justify-between gap-2 text-sm">
                <span>{c.voie || 'Adresse non précisée'} · {c.surface} m²{c.pieces ? ` · ${c.pieces} p.` : ''}</span>
                <span className="text-gray-700">{mois(c.date)} · {eur(c.prix)} · {eur(c.prixM2)}/m² · à {Math.round(c.distanceM)} m</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-lg bg-blue-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-gray-800">
              Pour un rapport d’estimation complet avec argumentaire vendeur, démarrez votre essai gratuit.
            </p>
            <Link href="/register" className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-white font-medium hover:bg-blue-700">
              Essai gratuit <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500 text-center">
        Source : Demandes de valeurs foncières (DVF), data.gouv.fr — Licence Ouverte. Estimation statistique indicative, qui ne remplace pas une expertise : état, étage, exposition et prestations ne sont pas pris en compte.
      </p>
    </div>
  )
}

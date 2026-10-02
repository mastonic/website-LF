'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wand2, ArrowLeft, Copy, Check, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AnnonceTon, AnnonceGenerateOutput } from '@/types'
import Link from 'next/link'

const TYPES_BIEN = [
  'Appartement', 'Maison', 'Villa', 'Studio', 'Loft', 'Duplex', 'Triplex',
  'Terrain', 'Local commercial', 'Bureau', 'Entrepôt', 'Parking',
]

const EQUIPEMENTS = [
  'Balcon', 'Terrasse', 'Jardin', 'Piscine', 'Garage', 'Parking', 'Cave',
  'Ascenseur', 'Gardien', 'Digicode', 'Interphone', 'Fibre optique',
  'Cuisine équipée', 'Parquet', 'Double vitrage', 'Climatisation',
  'Cheminée', 'Lumineux', 'Vue dégagée', 'Calme', 'Proche transports',
]

// ── Composant copier avec gestion d'erreur ────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback pour les navigateurs sans Clipboard API
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
      title={copied ? 'Copié !' : 'Copier'}
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

// ── Toast notification ────────────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
        type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {type === 'success' ? <Check className="h-4 w-4" /> : null}
      {message}
    </div>
  )
}

type TabKey = 'longue' | 'courte' | 'en'

export default function NouvelleAnnoncePage() {
  const [form, setForm] = useState({
    type_bien: '', surface: '', pieces: '', localisation: '', prix: '',
    points_forts: '', ton: 'standard' as AnnonceTon,
  })
  const [selectedEquipements, setSelectedEquipements] = useState<string[]>([])
  const [result, setResult] = useState<AnnonceGenerateOutput | null>(null)
  const [editedResult, setEditedResult] = useState<AnnonceGenerateOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('longue')
  const [elapsed, setElapsed] = useState(0)

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleEquipement(eq: string) {
    setSelectedEquipements(prev =>
      prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]
    )
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleGenerate() {
    if (!form.type_bien) { setError('Sélectionnez un type de bien.'); return }
    setLoading(true)
    setError(null)
    setElapsed(0)

    const timer = setInterval(() => setElapsed(s => s + 1), 1000)

    try {
      const res = await fetch('/api/annonces/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_bien: form.type_bien,
          surface: form.surface ? parseFloat(form.surface) : undefined,
          pieces: form.pieces ? parseInt(form.pieces) : undefined,
          localisation: form.localisation || undefined,
          prix: form.prix ? parseFloat(form.prix) : undefined,
          equipements: selectedEquipements.length > 0 ? selectedEquipements : undefined,
          points_forts: form.points_forts || undefined,
          ton: form.ton,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur génération')
      setResult(data.data)
      setEditedResult(data.data)
      showToast('Annonce générée et sauvegardée !', 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setLoading(false)
      clearInterval(timer)
    }
  }

  function updateEdited(field: keyof AnnonceGenerateOutput, value: string) {
    setEditedResult(prev => prev ? { ...prev, [field]: value } : null)
  }

  const current = editedResult ?? result

  const TAB_FIELD: Record<TabKey, keyof AnnonceGenerateOutput> = {
    longue: 'description_longue',
    courte: 'description_courte',
    en: 'description_en',
  }
  const TAB_LABELS: Record<TabKey, string> = {
    longue: 'Description complète',
    courte: 'Réseaux sociaux',
    en: 'English',
  }

  return (
    <div className="p-8 max-w-5xl">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex items-center gap-4 mb-8">
        <Link href="/annonces" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle annonce IA</h1>
          <p className="text-gray-500 text-sm">Remplissez les informations, Claude rédige pour vous</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Formulaire ─────────────────────────────────────────────────────── */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Informations du bien</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Type de bien *</Label>
                <Select value={form.type_bien} onValueChange={v => update('type_bien', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {TYPES_BIEN.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Surface (m²)</Label>
                  <input type="number" min="1" value={form.surface} onChange={e => update('surface', e.target.value)}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="65" />
                </div>
                <div>
                  <Label>Pièces</Label>
                  <input type="number" min="1" value={form.pieces} onChange={e => update('pieces', e.target.value)}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="3" />
                </div>
              </div>

              <div>
                <Label>Prix (€)</Label>
                <input type="number" min="0" value={form.prix} onChange={e => update('prix', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="350 000" />
              </div>

              <div>
                <Label>Localisation</Label>
                <input type="text" value={form.localisation} onChange={e => update('localisation', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Paris 11e, proche Bastille" />
              </div>

              <div>
                <Label>Points forts</Label>
                <Textarea value={form.points_forts} onChange={e => update('points_forts', e.target.value)}
                  className="mt-1 text-sm" rows={3}
                  placeholder="Vue panoramique, rénovation récente, immeuble haussmannien..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Équipements</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {EQUIPEMENTS.map(eq => (
                  <button key={eq} onClick={() => toggleEquipement(eq)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selectedEquipements.includes(eq)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >{eq}</button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Ton de l'annonce</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {(['standard', 'luxe', 'familial', 'investisseur'] as AnnonceTon[]).map(t => (
                  <button key={t} onClick={() => update('ton', t)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      form.ton === t ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm font-medium capitalize text-gray-900">{t}</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t === 'standard' && 'Professionnel et neutre'}
                      {t === 'luxe' && 'Premium et exclusif'}
                      {t === 'familial' && 'Chaleureux et pratique'}
                      {t === 'investisseur' && 'Rendement et potentiel'}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {error && <div className="bg-red-50 text-red-700 text-sm p-4 rounded-lg">{error}</div>}

          <Button onClick={handleGenerate} disabled={loading} className="w-full h-12 text-base">
            {loading ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Claude rédige... ({elapsed}s)</>
            ) : (
              <><Wand2 className="h-5 w-5 mr-2" /> Générer l'annonce</>
            )}
          </Button>
        </div>

        {/* ── Résultat éditable ─────────────────────────────────────────────── */}
        <div>
          {!current && !loading && (
            <div className="flex items-center justify-center h-full min-h-[400px] border-2 border-dashed border-gray-200 rounded-xl">
              <div className="text-center text-gray-400">
                <Wand2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">L'annonce générée apparaîtra ici</p>
                <p className="text-xs mt-1 text-gray-300">Vous pourrez l'éditer directement</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-full min-h-[400px] border-2 border-dashed border-blue-200 rounded-xl bg-blue-50">
              <div className="text-center text-blue-500">
                <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin" />
                <p className="text-sm font-medium">Claude rédige votre annonce...</p>
                <p className="text-xs mt-1 text-blue-400">{elapsed}s — généralement 10-20 secondes</p>
              </div>
            </div>
          )}

          {current && !loading && (
            <div className="space-y-4">
              {/* Titre éditable */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Titre
                      <span className={`ml-2 font-normal ${current.titre.length > 80 ? 'text-red-500' : 'text-gray-400'}`}>
                        ({current.titre.length}/80)
                      </span>
                    </span>
                    <CopyButton text={current.titre} />
                  </div>
                  <textarea
                    value={current.titre}
                    onChange={e => updateEdited('titre', e.target.value)}
                    className="w-full text-sm font-semibold text-gray-900 resize-none border-0 focus:outline-none focus:ring-1 focus:ring-blue-300 rounded p-1 -m-1"
                    rows={2}
                  />
                </CardContent>
              </Card>

              {/* Description onglets éditables */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-2 mb-4 border-b">
                    {(Object.keys(TAB_LABELS) as TabKey[]).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`text-sm pb-2 px-1 border-b-2 transition-colors ${
                          activeTab === tab
                            ? 'border-blue-600 text-blue-600 font-medium'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >{TAB_LABELS[tab]}</button>
                    ))}
                  </div>

                  <div className="relative">
                    <div className="absolute top-1 right-1 z-10">
                      <CopyButton text={current[TAB_FIELD[activeTab]]} />
                    </div>
                    <textarea
                      value={current[TAB_FIELD[activeTab]]}
                      onChange={e => updateEdited(TAB_FIELD[activeTab], e.target.value)}
                      className="w-full text-sm text-gray-700 resize-none border rounded-lg p-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-300 min-h-[200px]"
                      rows={activeTab === 'longue' ? 12 : 6}
                    />
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleGenerate} variant="outline" className="w-full">
                <Wand2 className="h-4 w-4 mr-2" /> Régénérer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

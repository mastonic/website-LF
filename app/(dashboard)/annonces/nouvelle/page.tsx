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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors" title="Copier">
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

export default function NouvelleAnnoncePage() {
  const router = useRouter()
  const [form, setForm] = useState({
    type_bien: '', surface: '', pieces: '', localisation: '',
    points_forts: '', ton: 'standard' as AnnonceTon,
  })
  const [selectedEquipements, setSelectedEquipements] = useState<string[]>([])
  const [result, setResult] = useState<AnnonceGenerateOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'longue' | 'courte' | 'en'>('longue')

  function toggleEquipement(eq: string) {
    setSelectedEquipements(prev =>
      prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]
    )
  }

  async function handleGenerate() {
    if (!form.type_bien) { setError('Sélectionnez un type de bien.'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/annonces/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_bien: form.type_bien,
          surface: form.surface ? parseFloat(form.surface) : undefined,
          pieces: form.pieces ? parseInt(form.pieces) : undefined,
          localisation: form.localisation || undefined,
          equipements: selectedEquipements.length > 0 ? selectedEquipements : undefined,
          points_forts: form.points_forts || undefined,
          ton: form.ton,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur génération')
      setResult(data.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl">
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
        {/* Formulaire */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Informations du bien</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Type de bien *</Label>
                <Select value={form.type_bien} onValueChange={v => setForm(p => ({ ...p, type_bien: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES_BIEN.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Surface (m²)</Label>
                  <input
                    type="number" value={form.surface} onChange={e => setForm(p => ({ ...p, surface: e.target.value }))}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="75"
                  />
                </div>
                <div>
                  <Label>Pièces</Label>
                  <input
                    type="number" value={form.pieces} onChange={e => setForm(p => ({ ...p, pieces: e.target.value }))}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="3"
                  />
                </div>
              </div>

              <div>
                <Label>Localisation</Label>
                <input
                  type="text" value={form.localisation} onChange={e => setForm(p => ({ ...p, localisation: e.target.value }))}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Paris 11e, proche Bastille"
                />
              </div>

              <div>
                <Label>Points forts</Label>
                <Textarea
                  value={form.points_forts}
                  onChange={e => setForm(p => ({ ...p, points_forts: e.target.value }))}
                  className="mt-1 text-sm"
                  placeholder="Vue panoramique, rénovation récente, immeuble haussmannien..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Équipements</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {EQUIPEMENTS.map(eq => (
                  <button
                    key={eq}
                    onClick={() => toggleEquipement(eq)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selectedEquipements.includes(eq)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Ton de l'annonce</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {(['standard', 'luxe', 'familial', 'investisseur'] as AnnonceTon[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(p => ({ ...p, ton: t }))}
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

          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-4 rounded-lg">{error}</div>
          )}

          <Button onClick={handleGenerate} disabled={loading} className="w-full h-12 text-base">
            {loading ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Claude rédige...</>
            ) : (
              <><Wand2 className="h-5 w-5 mr-2" /> Générer l'annonce</>
            )}
          </Button>
        </div>

        {/* Résultat */}
        <div>
          {!result && !loading && (
            <div className="flex items-center justify-center h-full min-h-[400px] border-2 border-dashed border-gray-200 rounded-xl">
              <div className="text-center text-gray-400">
                <Wand2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">L'annonce générée apparaîtra ici</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-full min-h-[400px] border-2 border-dashed border-blue-200 rounded-xl bg-blue-50">
              <div className="text-center text-blue-500">
                <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin" />
                <p className="text-sm font-medium">Claude rédige votre annonce...</p>
                <p className="text-xs mt-1 text-blue-400">Généralement 10-20 secondes</p>
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {/* Titre */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Titre</span>
                    <CopyButton text={result.titre} />
                  </div>
                  <p className="text-base font-semibold text-gray-900">{result.titre}</p>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-2 mb-4 border-b">
                    {(['longue', 'courte', 'en'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`text-sm pb-2 px-1 border-b-2 transition-colors ${
                          activeTab === tab
                            ? 'border-blue-600 text-blue-600 font-medium'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {tab === 'longue' ? 'Description complète' : tab === 'courte' ? 'Réseaux sociaux' : 'English'}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <div className="absolute top-2 right-2">
                      <CopyButton text={activeTab === 'longue' ? result.description_longue : activeTab === 'courte' ? result.description_courte : result.description_en} />
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap pr-8">
                      {activeTab === 'longue' && result.description_longue}
                      {activeTab === 'courte' && result.description_courte}
                      {activeTab === 'en' && result.description_en}
                    </div>
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

'use client'

import { useState } from 'react'
import { Image, BookOpen, Instagram, Clock, X, Download, AlertTriangle } from 'lucide-react'
import type { BrandIdentity } from '@/types/brand'
import type { QuotaInfo } from '@/lib/storage-quota'
import type { TemplateId, AnnonceData, CarrouselData, StoryData } from '@/types/visuals'
import { AnnonceForm } from './forms/AnnonceForm'
import { CarrouselForm } from './forms/CarrouselForm'
import { StoryForm } from './forms/StoryForm'

interface Annonce { id: string; titre: string }

interface Props {
  brand: BrandIdentity | null
  annonces: Annonce[]
  quota: QuotaInfo
}

const TEMPLATES = [
  { id: 'annonce' as TemplateId, label: 'Annonce', desc: 'Post 1080×1350', icon: Image },
  { id: 'carrousel' as TemplateId, label: 'Carrousel', desc: '5–7 slides 1080×1350', icon: BookOpen },
  { id: 'story' as TemplateId, label: 'Story', desc: 'Format 1080×1920', icon: Instagram },
]

interface HistoryItem {
  id: string
  template_id: string
  thumb_signed_url: string | null
  taille_octets: number
  created_at: string
}

export function StudioClient({ brand, annonces, quota: initialQuota }: Props) {
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>('annonce')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [quota, setQuota] = useState(initialQuota)

  // Current form data ref (lifted from child forms via callbacks)
  const [currentData, setCurrentData] = useState<AnnonceData | CarrouselData | StoryData | null>(null)

  async function loadHistory() {
    const res = await fetch('/api/visuals/history')
    if (res.ok) {
      const d = await res.json()
      setHistory(d.renders ?? [])
    }
    setHistoryLoaded(true)
    setShowHistory(true)
  }

  async function deleteRender(id: string) {
    await fetch('/api/visuals/history', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ renderId: id }),
    })
    setHistory((prev) => prev.filter((r) => r.id !== id))
  }

  async function generatePreview(data: AnnonceData | CarrouselData | StoryData) {
    setCurrentData(data)
    setPreviewLoading(true)
    setError(null)
    setWarnings([])
    if (previewUrl) URL.revokeObjectURL(previewUrl)

    try {
      const res = await fetch('/api/visuals/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: activeTemplate, data, lowRes: true }),
      })

      const warn = res.headers.get('X-Warnings') ?? ''
      if (warn) setWarnings(warn.split(' | ').filter(Boolean))

      if (res.status === 422) {
        const j = await res.json()
        setError(j.error)
        return
      }
      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? 'Erreur de rendu')
        return
      }

      const blob = await res.blob()
      setPreviewUrl(URL.createObjectURL(blob))
    } catch {
      setError('Erreur réseau lors de l\'aperçu.')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function exportVisual(format: 'png' | 'zip' = 'png') {
    if (!currentData) { setError('Générez d\'abord un aperçu.'); return }
    setExporting(true)
    setError(null)

    try {
      const res = await fetch('/api/visuals/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: activeTemplate, data: currentData, format, lowRes: false }),
      })

      const warn = res.headers.get('X-Warnings') ?? ''
      if (warn) setWarnings(warn.split(' | ').filter(Boolean))

      if (res.status === 422) {
        const j = await res.json()
        setError(j.error)
        return
      }
      if (res.status === 429) {
        const j = await res.json()
        setError(j.error)
        return
      }
      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? 'Erreur export')
        return
      }

      const blob = await res.blob()
      const ext = format === 'zip' ? 'zip' : 'png'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `visuel-${activeTemplate}-${Date.now()}.${ext}`
      a.click()
      URL.revokeObjectURL(url)

      // Refresh history if open
      if (showHistory) loadHistory()
    } catch {
      setError('Erreur réseau lors de l\'export.')
    } finally {
      setExporting(false)
    }
  }

  const quotaColor = quota.pct >= 90 ? 'bg-red-500' : quota.pct >= 70 ? 'bg-amber-500' : 'bg-blue-500'

  return (
    <div className="space-y-6">
      {/* Quota bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-gray-500">Stockage</span>
          <span className="text-sm text-gray-500">{quota.label}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className={`h-1.5 rounded-full ${quotaColor}`} style={{ width: `${quota.pct}%` }} />
        </div>
      </div>

      {/* Template tabs */}
      <div className="flex gap-3">
        {TEMPLATES.map(({ id, label, desc, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTemplate(id); setPreviewUrl(null); setError(null); setCurrentData(null) }}
            className={`flex-1 flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all ${
              activeTemplate === id
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-xs opacity-70">{desc}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form side */}
        <div className="space-y-4">
          {activeTemplate === 'annonce' && (
            <AnnonceForm annonces={annonces} onPreview={generatePreview} />
          )}
          {activeTemplate === 'carrousel' && (
            <CarrouselForm onPreview={generatePreview} />
          )}
          {activeTemplate === 'story' && (
            <StoryForm annonces={annonces} onPreview={generatePreview} />
          )}
        </div>

        {/* Preview side */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Aperçu</span>
              {previewLoading && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <span className="h-3 w-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Rendu…
                </span>
              )}
            </div>

            <div className="p-4 flex items-center justify-center min-h-64 bg-gray-50">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Aperçu du visuel"
                  className="max-w-full max-h-96 object-contain rounded shadow"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <Image className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Remplissez le formulaire et cliquez sur "Aperçu"</p>
                </div>
              )}
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-1">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  {w}
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Export buttons */}
          {previewUrl && (
            <div className="flex gap-3">
              <button
                onClick={() => exportVisual('png')}
                disabled={exporting}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Export…' : 'Exporter PNG'}
              </button>
              {activeTemplate === 'carrousel' && (
                <button
                  onClick={() => exportVisual('zip')}
                  disabled={exporting}
                  className="flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium py-2.5 px-4 rounded-lg disabled:opacity-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  ZIP
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          className="w-full flex items-center justify-between p-4 text-sm font-medium text-gray-700"
          onClick={() => { if (!historyLoaded) loadHistory(); else setShowHistory(!showHistory) }}
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            Historique des exports
          </span>
          <span className="text-gray-400 text-xs">{showHistory ? '▲' : '▼'}</span>
        </button>

        {showHistory && (
          <div className="border-t border-gray-100 p-4">
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucun export pour l'instant.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {history.map((r) => (
                  <div key={r.id} className="group relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    {r.thumb_signed_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.thumb_signed_url} alt={r.template_id} className="w-full aspect-square object-cover" />
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center text-gray-300 text-xs">
                        {r.template_id}
                      </div>
                    )}
                    <button
                      onClick={() => deleteRender(r.id)}
                      className="absolute top-1 right-1 bg-white/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-red-500" />
                    </button>
                    <div className="p-1.5">
                      <p className="text-xs text-gray-500 truncate capitalize">{r.template_id}</p>
                      <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

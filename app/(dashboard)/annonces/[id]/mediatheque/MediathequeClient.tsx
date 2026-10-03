'use client'

import { useState, useRef } from 'react'
import { Upload, X, Star, StarOff, AlertTriangle, GripVertical } from 'lucide-react'
import type { AnnonceMedia } from '@/types/brand'
import type { QuotaInfo } from '@/lib/storage-quota'
import { PHOTOS_MAX_PER_BIEN } from '@/types/brand'

interface Props {
  annonceId: string
  initialMedias: AnnonceMedia[]
  quota: QuotaInfo
}

export function MediathequeClient({ annonceId, initialMedias, quota: initialQuota }: Props) {
  const [medias, setMedias] = useState<AnnonceMedia[]>(initialMedias)
  const [quota, setQuota] = useState(initialQuota)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const quotaColor = quota.pct >= 90 ? 'bg-red-500' : quota.pct >= 70 ? 'bg-amber-500' : 'bg-blue-500'

  async function uploadFile(file: File) {
    if (medias.length >= PHOTOS_MAX_PER_BIEN) {
      setError(`Maximum ${PHOTOS_MAX_PER_BIEN} photos atteint.`)
      return
    }
    setUploading(true)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch(`/api/biens/${annonceId}/media`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur upload.'); return }
      // Refresh media list
      const listRes = await fetch(`/api/biens/${annonceId}/media`)
      const listData = await listRes.json()
      setMedias(listData.medias ?? [])
    } finally {
      setUploading(false)
    }
  }

  async function deleteMedia(mediaId: string) {
    const res = await fetch(`/api/biens/${annonceId}/media`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaId }),
    })
    if (res.ok) {
      setMedias((prev) => prev.filter((m) => m.id !== mediaId))
    }
  }

  async function setCover(mediaId: string) {
    const orderedIds = medias.map((m) => m.id)
    await fetch(`/api/biens/${annonceId}/media/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds, coverId: mediaId }),
    })
    setMedias((prev) => prev.map((m) => ({ ...m, is_couverture: m.id === mediaId })))
  }

  // Simple drag-to-reorder
  function handleDragStart(idx: number) {
    setDragIdx(idx)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const newList = [...medias]
    const [moved] = newList.splice(dragIdx, 1)
    newList.splice(idx, 0, moved)
    setMedias(newList)
    setDragIdx(idx)
  }

  async function handleDragEnd() {
    setDragIdx(null)
    const orderedIds = medias.map((m) => m.id)
    const coverId = medias.find((m) => m.is_couverture)?.id
    await fetch(`/api/biens/${annonceId}/media/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds, coverId }),
    })
  }

  return (
    <div className="space-y-5">
      {/* Quota */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Stockage</span>
          <span className="text-sm text-gray-500">{quota.label}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className={`h-2 rounded-full ${quotaColor}`} style={{ width: `${quota.pct}%` }} />
        </div>
      </div>

      {/* Upload zone */}
      <div
        className={`flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-300'
        }`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) uploadFile(file)
        }}
      >
        {uploading ? (
          <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Upload className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Glissez ou cliquez pour ajouter une photo</p>
            <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP, HEIC — max 10 Mo — {medias.length}/{PHOTOS_MAX_PER_BIEN}</p>
          </>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) uploadFile(f)
          e.target.value = ''
        }}
      />

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertTriangle className="h-4 w-4" /> {error}
        </p>
      )}

      {/* Photo grid */}
      {medias.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {medias.map((m, idx) => (
            <div
              key={m.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-grab ${
                m.is_couverture ? 'border-blue-500' : 'border-transparent'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.thumb_signed_url ?? m.signed_url ?? ''}
                alt={`Photo ${idx + 1}`}
                className="w-full aspect-square object-cover"
              />
              {/* Drag handle */}
              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded p-0.5">
                <GripVertical className="h-4 w-4 text-gray-600" />
              </div>
              {/* Cover badge */}
              {m.is_couverture && (
                <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                  Couverture
                </div>
              )}
              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!m.is_couverture && (
                  <button
                    type="button"
                    onClick={() => setCover(m.id)}
                    className="bg-white rounded-full p-1.5 hover:bg-blue-50"
                    title="Définir comme couverture"
                  >
                    <Star className="h-4 w-4 text-blue-600" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteMedia(m.id)}
                  className="bg-white rounded-full p-1.5 hover:bg-red-50"
                  title="Supprimer"
                >
                  <X className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {medias.length === 0 && !uploading && (
        <p className="text-sm text-gray-400 text-center py-4">Aucune photo — ajoutez-en une ci-dessus.</p>
      )}
    </div>
  )
}

'use client'

import { useRef, useState } from 'react'
import { Trash2, Upload, ImageIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface Props {
  annonceId: string
  initialPhotos: string[]
  photoLimit: number
}

export default function PhotoUploader({ annonceId, initialPhotos, photoLimit }: Props) {
  const [photos, setPhotos] = useState<string[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    if (photos.length >= photoLimit) {
      setError(`Limite de ${photoLimit} photos atteinte.`)
      return
    }

    const file = files[0]
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Format non supporté. Utilisez JPG, PNG ou WebP.')
      return
    }

    setError(null)
    setUploading(true)

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch(`/api/annonces/${annonceId}/photos`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? 'Erreur lors du téléchargement.')
      } else {
        setPhotos(data.photos)
      }
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete(url: string) {
    setError(null)
    try {
      const res = await fetch(`/api/annonces/${annonceId}/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? 'Erreur lors de la suppression.')
      } else {
        setPhotos(data.photos)
      }
    } catch {
      setError('Erreur réseau. Réessayez.')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div>
      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {photos.map((url, i) => (
            <div key={url} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
              <Image
                src={url}
                alt={`Photo ${i + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
              <button
                onClick={() => handleDelete(url)}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                title="Supprimer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <div className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">
                {i + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {photos.length < photoLimit && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Envoi en cours…</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Upload className="w-6 h-6" />
              <span className="text-sm font-medium text-gray-600">Glissez une photo ou cliquez</span>
              <span className="text-xs">JPG, PNG, WebP · max 5 Mo · {photos.length}/{photoLimit} photos</span>
            </div>
          )}
        </div>
      )}

      {photos.length >= photoLimit && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-2">
          <ImageIcon className="w-3.5 h-3.5" />
          Limite de {photoLimit} photos atteinte pour votre plan.
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  )
}

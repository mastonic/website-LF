'use client'

import { useState, useRef, useTransition } from 'react'
import { Upload, X, AlertTriangle, CheckCircle, Palette, Type, Image, User } from 'lucide-react'
import type { BrandIdentity, BrandColor, ColorRole } from '@/types/brand'
import type { QuotaInfo } from '@/lib/storage-quota'
import { FONT_KEYS } from '@/lib/fonts'

interface Props {
  brand: BrandIdentity | null
  logoUrl: string | null
  avatarUrl: string | null
  quota: QuotaInfo
}

const COLOR_ROLES: { role: ColorRole; label: string }[] = [
  { role: 'principale', label: 'Principale' },
  { role: 'secondaire', label: 'Secondaire' },
  { role: 'accent', label: 'Accent' },
  { role: 'fond', label: 'Fond' },
]

export function BrandForm({ brand, logoUrl: initialLogoUrl, avatarUrl: initialAvatarUrl, quota: initialQuota }: Props) {
  const [nomAffiche, setNomAffiche] = useState(brand?.nom_affiche ?? '')
  const [signature, setSignature] = useState(brand?.signature ?? '')
  const [charte, setCharte] = useState(brand?.charte ?? '')
  const [couleurs, setCouleurs] = useState<BrandColor[]>(
    brand?.couleurs?.length ? brand.couleurs : [
      { hex: '#1e3a5f', role: 'principale' },
      { hex: '#f5f5f0', role: 'fond' },
    ]
  )
  const [polices, setPolices] = useState(brand?.polices ?? {})
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [quota, setQuota] = useState(initialQuota)
  const [warnings, setWarnings] = useState<string[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'uploading' | 'error' | 'done'>>({})
  const [isPending, startTransition] = useTransition()

  const logoRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  function addColor() {
    if (couleurs.length >= 4) return
    const remaining = COLOR_ROLES.filter((r) => !couleurs.find((c) => c.role === r.role))
    const nextRole = remaining[0]?.role ?? 'accent'
    setCouleurs([...couleurs, { hex: '#aabbcc', role: nextRole }])
  }

  function removeColor(idx: number) {
    if (couleurs.length <= 2) return
    setCouleurs(couleurs.filter((_, i) => i !== idx))
  }

  function updateColor(idx: number, hex: string) {
    setCouleurs(couleurs.map((c, i) => i === idx ? { ...c, hex } : c))
  }

  function updateRole(idx: number, role: ColorRole) {
    setCouleurs(couleurs.map((c, i) => i === idx ? { ...c, role } : c))
  }

  async function handleSave() {
    setSaveStatus('saving')
    setWarnings([])
    try {
      const res = await fetch('/api/brand', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom_affiche: nomAffiche, signature, charte, couleurs, polices }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveStatus('error'); return }
      if (data.warnings?.length) setWarnings(data.warnings)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
    }
  }

  async function handleFileUpload(file: File, target: 'logo' | 'avatar') {
    setUploadStatus((s) => ({ ...s, [target]: 'uploading' }))
    const fd = new FormData()
    fd.append('file', file)
    fd.append('target', target)
    try {
      const res = await fetch('/api/brand/logo', { method: 'POST', body: fd })
      if (!res.ok) { setUploadStatus((s) => ({ ...s, [target]: 'error' })); return }
      const data = await res.json()
      // Fetch a signed URL for preview
      const urlRes = await fetch('/api/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: 'brand-assets', path: data.path }),
      })
      const urlData = await urlRes.json()
      if (target === 'logo') setLogoUrl(urlData.signedUrl)
      else setAvatarUrl(urlData.signedUrl)
      setUploadStatus((s) => ({ ...s, [target]: 'done' }))
    } catch {
      setUploadStatus((s) => ({ ...s, [target]: 'error' }))
    }
  }

  async function handleDelete(target: 'logo' | 'avatar') {
    const res = await fetch('/api/brand/logo', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target }),
    })
    if (res.ok) {
      if (target === 'logo') setLogoUrl(null)
      else setAvatarUrl(null)
    }
  }

  const quotaColor = quota.pct >= 90 ? 'bg-red-500' : quota.pct >= 70 ? 'bg-amber-500' : 'bg-blue-500'

  return (
    <div className="space-y-8">
      {/* Storage quota */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Stockage utilisé</span>
          <span className="text-sm text-gray-500">{quota.label}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${quotaColor}`}
            style={{ width: `${quota.pct}%` }}
          />
        </div>
        {quota.exceeded && (
          <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Quota dépassé — supprimez des fichiers pour uploader à nouveau.
          </p>
        )}
      </div>

      {/* Logo & Avatar */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Image className="h-4 w-4 text-blue-500" />
          Logo &amp; Photo de profil
        </h2>
        <div className="grid grid-cols-2 gap-6">
          {(['logo', 'avatar'] as const).map((target) => {
            const url = target === 'logo' ? logoUrl : avatarUrl
            const ref = target === 'logo' ? logoRef : avatarRef
            const label = target === 'logo' ? 'Logo' : 'Photo de profil'
            const status = uploadStatus[target]
            return (
              <div key={target}>
                <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
                <div
                  className="relative flex items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:border-blue-400 transition-colors overflow-hidden"
                  onClick={() => ref.current?.click()}
                >
                  {url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={label} className="max-h-28 max-w-full object-contain" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(target) }}
                        className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow hover:bg-red-50"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-400">
                      <Upload className="h-6 w-6" />
                      <span className="text-xs">JPG, PNG, WebP, SVG, HEIC — max 2 Mo</span>
                    </div>
                  )}
                  {status === 'uploading' && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {status === 'error' && (
                  <p className="text-xs text-red-600 mt-1">Erreur upload.</p>
                )}
                <input
                  ref={ref}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml,image/heic"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileUpload(f, target)
                    e.target.value = ''
                  }}
                />
              </div>
            )
          })}
        </div>
      </section>

      {/* Identity */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-blue-500" />
          Identité
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom affiché</label>
            <input
              type="text"
              maxLength={100}
              value={nomAffiche}
              onChange={(e) => setNomAffiche(e.target.value)}
              placeholder="Ex : Cabinet Durand Associés"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
            <textarea
              maxLength={500}
              rows={2}
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Ex : Votre partenaire immobilier de confiance"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Charte éditoriale <span className="text-gray-400 text-xs">(optionnel)</span>
            </label>
            <textarea
              maxLength={5000}
              rows={4}
              value={charte}
              onChange={(e) => setCharte(e.target.value)}
              placeholder="Décrivez votre ton, vos valeurs, vos mots à éviter..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      </section>

      {/* Colors */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Palette className="h-4 w-4 text-blue-500" />
          Couleurs de marque
        </h2>
        <div className="space-y-3">
          {couleurs.map((c, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <input
                type="color"
                value={c.hex}
                onChange={(e) => updateColor(idx, e.target.value)}
                className="h-10 w-14 rounded border border-gray-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={c.hex}
                onChange={(e) => updateColor(idx, e.target.value)}
                pattern="^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"
                className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={c.role}
                onChange={(e) => updateRole(idx, e.target.value as ColorRole)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {COLOR_ROLES.map((r) => (
                  <option key={r.role} value={r.role}>{r.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeColor(idx)}
                disabled={couleurs.length <= 2}
                className="text-gray-400 hover:text-red-500 disabled:opacity-30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {couleurs.length < 4 && (
          <button
            type="button"
            onClick={addColor}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Ajouter une couleur
          </button>
        )}
        {warnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                {w}
              </p>
            ))}
          </div>
        )}
      </section>

      {/* Fonts */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Type className="h-4 w-4 text-blue-500" />
          Polices
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {(['titre', 'texte'] as const).map((key) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                Police {key === 'titre' ? 'de titre' : 'de texte'}
              </label>
              <select
                value={polices[key] ?? ''}
                onChange={(e) => setPolices({ ...polices, [key]: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Par défaut —</option>
                {FONT_KEYS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* Save button */}
      <div className="flex items-center justify-between">
        <div>
          {saveStatus === 'error' && (
            <p className="text-sm text-red-600">Erreur lors de la sauvegarde.</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {saveStatus === 'saving' && (
            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {saveStatus === 'saved' && <CheckCircle className="h-4 w-4" />}
          {saveStatus === 'saved' ? 'Enregistré !' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

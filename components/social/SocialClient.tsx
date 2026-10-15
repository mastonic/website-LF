'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Loader2, Sparkles } from 'lucide-react'
import type { ContenuGenere, FormatContenu, IdeeContenu, Plateforme } from '@/lib/contenu-shared'
import { PLATEFORMES, dureeScript } from '@/lib/contenu-shared'

export interface ContenuRow {
  id: string
  idee: string
  format: FormatContenu
  plateforme: Plateforme | null
  titre: string | null
  contenu: ContenuGenere
  statut: 'brouillon' | 'publie' | 'abandonne'
  publie_le: string | null
  created_at: string
}

const field = 'w-full rounded-lg border border-input bg-white px-3 text-base focus:outline-none focus:ring-2 focus:ring-ring'
const STATUT: Record<ContenuRow['statut'], string> = { brouillon: 'Brouillon', publie: 'Publié', abandonne: 'Abandonné' }
const SECTEUR_KEY = 'immo.secteur'

function CopyBtn({ text, label = 'Copier' }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setOk(true)
          setTimeout(() => setOk(false), 1800)
        } catch {
          /* copie indisponible */
        }
      }}
    >
      {ok ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />} {ok ? 'Copié' : label}
    </button>
  )
}

function scriptToText(c: ContenuGenere): string {
  if (c.format === 'video') {
    return [
      c.accroche,
      '',
      ...c.sequences.map((s) => s.a_dire),
      '',
      c.legende,
      '',
      c.hashtags.map((h) => `#${h}`).join(' '),
    ].join('\n')
  }
  return [c.texte, '', c.hashtags.map((h) => `#${h}`).join(' ')].join('\n')
}

export function SocialClient({ initial, initialPiste = '' }: { initial: ContenuRow[]; initialPiste?: string }) {
  const [piste, setPiste] = useState(initialPiste)
  const [secteur, setSecteur] = useState('')
  const [idees, setIdees] = useState<IdeeContenu[]>([])
  const [idee, setIdee] = useState('')
  const [format, setFormat] = useState<FormatContenu>('video')
  const [plateforme, setPlateforme] = useState<Plateforme>('instagram')
  const [loadingIdees, setLoadingIdees] = useState(false)
  const [loadingScript, setLoadingScript] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState<ContenuRow | null>(null)
  const [history, setHistory] = useState<ContenuRow[]>(initial)

  useEffect(() => {
    try {
      setSecteur(localStorage.getItem(SECTEUR_KEY) ?? '')
    } catch {
      /* stockage indisponible */
    }
  }, [])

  const rememberSecteur = (v: string) => {
    setSecteur(v)
    try {
      localStorage.setItem(SECTEUR_KEY, v)
    } catch {
      /* stockage indisponible */
    }
  }

  async function proposerIdees() {
    setError(null)
    setLoadingIdees(true)
    try {
      const res = await fetch('/api/contenus/idees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piste: piste.trim() || undefined, secteur: secteur.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Impossible de proposer des idées.')
      setIdees(json.idees)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoadingIdees(false)
    }
  }

  async function ecrire() {
    const texte = idee.trim()
    if (texte.length < 3) return setError('Choisissez une idée ou décrivez la vôtre en quelques mots.')
    setError(null)
    setLoadingScript(true)
    setCurrent(null)
    try {
      const res = await fetch('/api/contenus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idee: texte, format, plateforme, secteur: secteur.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'La rédaction a échoué.')
      const row: ContenuRow = {
        id: json.id,
        idee: texte,
        format,
        plateforme,
        titre: json.contenu.titre,
        contenu: json.contenu,
        statut: 'brouillon',
        publie_le: null,
        created_at: json.created_at,
      }
      setCurrent(row)
      setHistory((h) => [row, ...h])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoadingScript(false)
    }
  }

  async function setStatut(id: string, statut: ContenuRow['statut']) {
    setError(null)
    try {
      const res = await fetch(`/api/contenus/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      })
      if (!res.ok) throw new Error('Mise à jour impossible.')
      const apply = (r: ContenuRow) => (r.id === id ? { ...r, statut, publie_le: statut === 'publie' ? new Date().toISOString() : null } : r)
      setHistory((h) => h.map(apply))
      setCurrent((c) => (c ? apply(c) : c))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const publies = history.filter((h) => h.statut === 'publie').length
  const ceMois = history.filter((h) => h.statut === 'publie' && h.publie_le && new Date(h.publie_le).getMonth() === new Date().getMonth()).length

  return (
    <div className="space-y-8">
      {/* Étape 1 : l'idée */}
      <section aria-labelledby="h-idee" className="rounded-xl border bg-white p-6 space-y-4">
        <div>
          <h2 id="h-idee" className="text-lg font-semibold text-gray-900">Quelle idée vous trotte dans la tête ?</h2>
          <p className="text-sm text-gray-500">Un mot, une situation vécue cette semaine, une question d’un client. Pas besoin que ce soit abouti.</p>
        </div>
        <textarea
          aria-label="Votre idée"
          className={`${field} py-2 min-h-[96px]`}
          value={piste}
          maxLength={600}
          placeholder="Ex. : un vendeur qui pensait que les travaux ne comptaient pas dans le prix…"
          onChange={(e) => setPiste(e.target.value)}
        />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="secteur" className="block text-sm font-medium mb-1">Votre secteur (facultatif)</label>
            <input id="secteur" className={`${field} min-h-[44px]`} value={secteur} maxLength={120} placeholder="Ville ou village où vous travaillez" onChange={(e) => rememberSecteur(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={piste.trim().length < 3}
            onClick={() => { setIdee(piste.trim()); setIdees([]) }}
            className="min-h-[44px] rounded-lg bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Partir de mon idée
          </button>
          <button
            type="button"
            disabled={loadingIdees}
            onClick={proposerIdees}
            className="inline-flex items-center gap-2 min-h-[44px] rounded-lg border px-5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {loadingIdees ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {piste.trim() ? 'Donnez-moi des variantes' : 'Donnez-moi des idées'}
          </button>
        </div>

        {idees.length > 0 && (
          <ul className="grid gap-2 pt-2" aria-label="Idées proposées">
            {idees.map((i, n) => (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => { setIdee(`${i.titre} — ${i.angle}`); setFormat(i.format) }}
                  className="w-full text-left rounded-lg border p-3 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <span className="block text-sm font-medium text-gray-900">{i.titre}</span>
                  <span className="block text-sm text-gray-600">{i.angle}</span>
                  <span className="block text-xs text-gray-400 mt-1">{i.format === 'video' ? 'Vidéo courte' : 'Publication'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Étape 2 : le script */}
      {idee && (
        <section aria-labelledby="h-script" className="rounded-xl border bg-white p-6 space-y-4">
          <h2 id="h-script" className="text-lg font-semibold text-gray-900">Votre contenu</h2>
          <div>
            <label htmlFor="idee-retenue" className="block text-sm font-medium mb-1">Idée retenue (modifiable)</label>
            <textarea id="idee-retenue" className={`${field} py-2 min-h-[72px]`} value={idee} maxLength={800} onChange={(e) => setIdee(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="format" className="block text-sm font-medium mb-1">Format</label>
              <select id="format" className={`${field} min-h-[44px]`} value={format} onChange={(e) => setFormat(e.target.value as FormatContenu)}>
                <option value="video">Vidéo courte à dire face caméra (≈ 45 s)</option>
                <option value="texte">Publication écrite</option>
              </select>
            </div>
            <div>
              <label htmlFor="plateforme" className="block text-sm font-medium mb-1">Réseau</label>
              <select id="plateforme" className={`${field} min-h-[44px]`} value={plateforme} onChange={(e) => setPlateforme(e.target.value as Plateforme)}>
                {(Object.keys(PLATEFORMES) as Plateforme[]).map((k) => <option key={k} value={k}>{PLATEFORMES[k]}</option>)}
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={ecrire}
            disabled={loadingScript}
            className="inline-flex items-center gap-2 min-h-[44px] rounded-lg bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loadingScript && <Loader2 className="h-4 w-4 animate-spin" />}
            {loadingScript ? 'Écriture en cours…' : format === 'video' ? 'Écrire le script' : 'Écrire la publication'}
          </button>
        </section>
      )}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {current && <ContenuCard row={current} onStatut={setStatut} />}

      {/* Historique */}
      {history.length > 0 && (
        <section aria-labelledby="h-histo">
          <div className="flex items-baseline justify-between mb-3">
            <h2 id="h-histo" className="text-lg font-semibold text-gray-900">Vos contenus</h2>
            <p className="text-sm text-gray-500">{publies} publié{publies > 1 ? 's' : ''} · {ceMois} ce mois-ci</p>
          </div>
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <button type="button" className="text-left min-w-0" onClick={() => setCurrent(h)}>
                    <span className="block text-sm font-medium text-gray-900 truncate">{h.titre || h.idee}</span>
                    <span className="block text-xs text-gray-500">
                      {h.format === 'video' ? 'Vidéo' : 'Publication'}
                      {h.plateforme ? ` · ${PLATEFORMES[h.plateforme]}` : ''} · {new Date(h.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </button>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${h.statut === 'publie' ? 'bg-emerald-100 text-emerald-800' : h.statut === 'abandonne' ? 'bg-stone-100 text-stone-600' : 'bg-gray-100 text-gray-700'}`}>
                    {STATUT[h.statut]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function ContenuCard({ row, onStatut }: { row: ContenuRow; onStatut: (id: string, s: ContenuRow['statut']) => void }) {
  const c = row.contenu
  return (
    <article aria-label="Contenu généré" className="rounded-xl border bg-white p-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h3 className="text-lg font-semibold text-gray-900">{row.titre}</h3>
        <CopyBtn text={scriptToText(c)} label="Tout copier" />
      </div>

      {c.format === 'video' ? (
        <>
          <p className="text-sm text-gray-500">
            À dire face caméra · environ {dureeScript(c.sequences)} secondes
          </p>
          <ol className="space-y-3">
            {c.sequences.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-xs text-gray-400 w-10 pt-1 shrink-0">{s.duree_s} s</span>
                <p className="text-gray-800 leading-relaxed">{s.a_dire}</p>
              </li>
            ))}
          </ol>
          {c.appel_action && <p className="text-sm text-gray-700"><strong>Pour terminer :</strong> {c.appel_action}</p>}
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">Légende</p>
            <p className="text-gray-700 whitespace-pre-line">{c.legende}</p>
          </div>
          {c.preparation.length > 0 && (
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900 mb-1">Avant de tourner</p>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-0.5">
                {c.preparation.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-800 leading-relaxed whitespace-pre-line">{c.texte}</p>
      )}

      {c.hashtags.length > 0 && <p className="text-sm text-blue-700">{c.hashtags.map((h) => `#${h}`).join(' ')}</p>}

      <div className="flex flex-wrap gap-2 pt-1">
        {row.statut !== 'publie' && (
          <button type="button" onClick={() => onStatut(row.id, 'publie')} className="min-h-[40px] rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700">
            Marquer comme publié
          </button>
        )}
        {row.statut === 'publie' && (
          <button type="button" onClick={() => onStatut(row.id, 'brouillon')} className="min-h-[40px] rounded-lg border px-4 text-sm text-gray-700 hover:bg-gray-50">
            Remettre en brouillon
          </button>
        )}
        {row.statut !== 'abandonne' && (
          <button type="button" onClick={() => onStatut(row.id, 'abandonne')} className="min-h-[40px] rounded-lg border px-4 text-sm text-gray-500 hover:bg-gray-50">
            Abandonner
          </button>
        )}
      </div>
    </article>
  )
}

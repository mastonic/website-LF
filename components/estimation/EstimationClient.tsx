'use client'

import { useMemo, useState } from 'react'
import { Loader2, Plus, Printer, Trash2, Copy, Check, FileText } from 'lucide-react'
import type { EstimationResult } from '@/lib/dvf'
import {
  computeScenarios,
  ISSUES,
  POSTES_SUGGERES,
  RAISONS_PERTE,
  type Ajustement,
  type Issue,
  type PosteTravaux,
  type RaisonPerte,
} from '@/lib/estimation'
import type { RapportEstimation } from '@/lib/estimation-report'
import type { AnalysePhotos, PhotoAffichee } from '@/lib/photos-shared'
import { PhotosBien } from '@/components/estimation/PhotosBien'

interface Props {
  id: string
  adresse: string
  typeBien: string
  surface: number
  pieces: number | null
  anneeConstruction: number | null
  dvf: EstimationResult
  initialTravaux: PosteTravaux[]
  initialAjustements: Ajustement[]
  initialEtat: string
  initialNotes: string
  initialConcurrent: string
  initialRapport: RapportEstimation | null
  initialIssue: Issue
  initialRaison: RaisonPerte | null
  initialPhotos?: PhotoAffichee[]
  initialAnalysePhotos?: AnalysePhotos | null
}

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const num = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))
const date = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random()).slice(2))

const FIABILITE = { bonne: 'bonne', moyenne: 'moyenne', faible: 'faible (peu de ventes comparables)' } as const
const input = 'min-h-[40px] rounded-md border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

export function EstimationClient(p: Props) {
  const [travaux, setTravaux] = useState<PosteTravaux[]>(p.initialTravaux)
  const [ajustements, setAjustements] = useState<Ajustement[]>(p.initialAjustements)
  const [etat, setEtat] = useState(p.initialEtat)
  const [notes, setNotes] = useState(p.initialNotes)
  const [concurrent, setConcurrent] = useState(p.initialConcurrent)
  const [rapport, setRapport] = useState<RapportEstimation | null>(p.initialRapport)
  const [stale, setStale] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issue, setIssue] = useState<Issue>(p.initialIssue)
  const [raison, setRaison] = useState<RaisonPerte | null>(p.initialRaison)
  const [issueSaved, setIssueSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const concurrentNum = concurrent.trim() ? Number(concurrent.replace(/\s/g, '').replace(',', '.')) : null
  const sc = useMemo(
    () => computeScenarios(p.dvf, p.surface, travaux, ajustements, concurrentNum && concurrentNum > 0 ? concurrentNum : null),
    [p.dvf, p.surface, travaux, ajustements, concurrentNum]
  )

  const touch = () => {
    setDirty(true)
    if (rapport) setStale(true)
  }

  const payload = () => ({
    travaux: travaux
      .filter((t) => t.label.trim() || t.montant > 0)
      .map((t) => ({ ...t, label: t.label.trim() || 'Travaux', montant: Math.max(0, t.montant || 0) })),
    ajustements: ajustements
      .filter((a) => a.label.trim() || a.valeur !== 0)
      .map((a) => ({ ...a, label: a.label.trim() || 'Ajustement', valeur: Number.isFinite(a.valeur) ? a.valeur : 0 })),
    etat: etat.trim() || null,
    notes: notes.trim() || null,
    prix_concurrent: concurrentNum && concurrentNum > 0 ? concurrentNum : null,
  })

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/estimations/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Enregistrement impossible')
  }

  async function save(): Promise<boolean> {
    setSaving(true)
    setError(null)
    try {
      await patch(payload())
      setDirty(false)
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    } finally {
      setSaving(false)
    }
  }

  async function generate() {
    setError(null)
    if (dirty && !(await save())) return
    setGenerating(true)
    try {
      const res = await fetch(`/api/estimations/${p.id}/report`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'La rédaction a échoué.')
      setRapport(json.rapport)
      setStale(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  async function saveIssue(nextIssue: Issue, nextRaison: RaisonPerte | null) {
    setIssue(nextIssue)
    setRaison(nextRaison)
    setIssueSaved(false)
    try {
      await patch({ issue: nextIssue, raison_perte: nextIssue === 'mandat_perdu' ? nextRaison : null })
      setIssueSaved(true)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function copyArgumentaire() {
    if (!rapport) return
    const text = [rapport.resume, '', ...rapport.argumentaire.map((a) => `• ${a}`)].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* copie indisponible */
    }
  }

  const ac = sc.avisConcurrent

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <header>
        <h1 className="text-2xl font-bold text-gray-900">{p.adresse}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {p.typeBien} · {p.surface} m²
          {p.pieces ? ` · ${p.pieces} pièces` : ''}
          {p.anneeConstruction ? ` · construit en ${p.anneeConstruction}` : ''}
        </p>
      </header>

      {/* Ventes officielles */}
      <section aria-labelledby="h-ventes" className="rounded-xl border bg-white p-6">
        <h2 id="h-ventes" className="text-lg font-semibold text-gray-900 mb-1">Ce que disent les ventes réelles autour du bien</h2>
        <p className="text-sm text-gray-500 mb-4">
          {p.dvf.nbVentes} ventes de {p.typeBien.toLowerCase()}s dans un rayon de {p.dvf.rayonM} m, de {date(p.dvf.periode.debut)} à{' '}
          {date(p.dvf.periode.fin)}. Fiabilité : {FIABILITE[p.dvf.fiabilite]}. Source : demandes de valeurs foncières (data.gouv.fr).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            ['Bas', p.dvf.prixM2Bas, p.dvf.estimationBasse],
            ['Médian', p.dvf.prixM2Median, p.dvf.estimationCentrale],
            ['Haut', p.dvf.prixM2Haut, p.dvf.estimationHaute],
          ].map(([l, m2, total]) => (
            <div key={l as string} className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">{l}</p>
              <p className="text-lg font-semibold">{num(m2 as number)} €/m²</p>
              <p className="text-xs text-gray-500">{eur(total as number)} pour le bien en bon état</p>
            </div>
          ))}
        </div>

        <p className="text-sm font-medium text-gray-700 mb-2 sm:hidden">Les ventes les plus proches</p>
        <ul className="sm:hidden divide-y rounded-lg border">
          {p.dvf.comparables.map((c) => (
            <li key={c.id} className="p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-medium text-gray-900">{c.voie || 'Adresse non précisée'}</span>
                <span className="whitespace-nowrap text-gray-500">{date(c.date)}</span>
              </div>
              <div className="mt-1 text-gray-600">
                {c.surface} m² · {eur(c.prix)} · {num(c.prixM2)} €/m² · à {num(c.distanceM)} m
              </div>
            </li>
          ))}
        </ul>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="text-left text-sm font-medium text-gray-700 mb-2">Les ventes les plus proches</caption>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Adresse</th>
                <th className="py-2 pr-3 font-medium text-right">Surface</th>
                <th className="py-2 pr-3 font-medium text-right">Prix</th>
                <th className="py-2 pr-3 font-medium text-right">€/m²</th>
                <th className="py-2 font-medium text-right">Distance</th>
              </tr>
            </thead>
            <tbody>
              {p.dvf.comparables.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 whitespace-nowrap">{date(c.date)}</td>
                  <td className="py-2 pr-3">{c.voie || '—'}</td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">{c.surface} m²</td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">{eur(c.prix)}</td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">{num(c.prixM2)}</td>
                  <td className="py-2 text-right whitespace-nowrap">{num(c.distanceM)} m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {p.dvf.parAnnee?.length > 1 && (
          <p className="mt-4 text-sm text-gray-600">
            Prix médian au m² par année :{' '}
            {p.dvf.parAnnee.map((a) => `${a.annee} : ${num(a.prixM2Median)} € (${a.nbVentes})`).join(' · ')}
          </p>
        )}
        <p className="mt-3 text-xs text-gray-500">
          Ces données ne disent rien de l’état des biens vendus. C’est pourquoi les travaux sont déduits ci-dessous, poste par poste.
        </p>
      </section>

      {/* Photos de la visite */}
      <PhotosBien
        estimationId={p.id}
        initialPhotos={p.initialPhotos ?? []}
        initialAnalyse={p.initialAnalysePhotos ?? null}
        postesExistants={travaux.map((t) => t.label)}
        onChange={() => { if (rapport) setStale(true) }}
        onAjouterTravaux={(t) => {
          setTravaux((prev) =>
            prev.some((x) => x.label === t.poste) ? prev : [...prev, { id: uid(), label: t.poste, montant: 0, note: t.pourquoi.slice(0, 300) }]
          )
          touch()
        }}
      />

      {/* Saisies de l'agent */}
      <section aria-labelledby="h-travaux" className="rounded-xl border bg-white p-6 print:hidden">
        <h2 id="h-travaux" className="text-lg font-semibold text-gray-900 mb-1">Travaux à prévoir</h2>
        <p className="text-sm text-gray-500 mb-4">Vos montants, après visite. Ils sont déduits de la valeur de référence.</p>

        <ul className="space-y-2">
          {travaux.map((t) => (
            <li key={t.id} className="flex gap-2 items-center flex-wrap">
              <input
                aria-label="Nature des travaux"
                className={`${input} flex-1 min-w-[180px]`}
                value={t.label}
                placeholder="Nature des travaux"
                onChange={(e) => {
                  setTravaux(travaux.map((x) => (x.id === t.id ? { ...x, label: e.target.value } : x)))
                  touch()
                }}
              />
              <input
                aria-label="Montant en euros"
                className={`${input} w-32`}
                type="number"
                min={0}
                inputMode="numeric"
                value={t.montant || ''}
                placeholder="€"
                onChange={(e) => {
                  setTravaux(travaux.map((x) => (x.id === t.id ? { ...x, montant: Number(e.target.value) } : x)))
                  touch()
                }}
              />
              <button
                type="button"
                aria-label="Supprimer ce poste"
                className="p-2 text-gray-400 hover:text-red-600"
                onClick={() => {
                  setTravaux(travaux.filter((x) => x.id !== t.id))
                  touch()
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap gap-2">
          {POSTES_SUGGERES.filter((l) => !travaux.some((t) => t.label === l)).map((l) => (
            <button
              key={l}
              type="button"
              className="rounded-full border px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
              onClick={() => {
                setTravaux([...travaux, { id: uid(), label: l, montant: 0 }])
                touch()
              }}
            >
              + {l}
            </button>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            onClick={() => {
              setTravaux([...travaux, { id: uid(), label: '', montant: 0 }])
              touch()
            }}
          >
            <Plus className="h-3 w-3" /> Autre poste
          </button>
        </div>
        <p className="mt-3 text-sm font-medium text-gray-900">Total des travaux : {eur(sc.totalTravaux)}</p>

        <h3 className="mt-8 text-base font-semibold text-gray-900">Ajustements propres au bien</h3>
        <p className="text-sm text-gray-500 mb-3">Ce qui rend ce bien meilleur ou moins bon que les ventes proches (vue, extérieur, bruit, étage…).</p>
        <ul className="space-y-2">
          {ajustements.map((a) => (
            <li key={a.id} className="flex gap-2 items-center flex-wrap">
              <input
                aria-label="Nature de l’ajustement"
                className={`${input} flex-1 min-w-[180px]`}
                value={a.label}
                placeholder="Ex. grand jardin, route passante"
                onChange={(e) => {
                  setAjustements(ajustements.map((x) => (x.id === a.id ? { ...x, label: e.target.value } : x)))
                  touch()
                }}
              />
              <select
                aria-label="Unité"
                className={`${input} w-24`}
                value={a.type}
                onChange={(e) => {
                  setAjustements(ajustements.map((x) => (x.id === a.id ? { ...x, type: e.target.value as 'pct' | 'eur' } : x)))
                  touch()
                }}
              >
                <option value="pct">%</option>
                <option value="eur">€</option>
              </select>
              <input
                aria-label="Valeur (négative si le bien perd de la valeur)"
                className={`${input} w-28`}
                type="number"
                value={a.valeur || ''}
                placeholder="+5 ou −5"
                onChange={(e) => {
                  setAjustements(ajustements.map((x) => (x.id === a.id ? { ...x, valeur: Number(e.target.value) } : x)))
                  touch()
                }}
              />
              <button
                type="button"
                aria-label="Supprimer cet ajustement"
                className="p-2 text-gray-400 hover:text-red-600"
                onClick={() => {
                  setAjustements(ajustements.filter((x) => x.id !== a.id))
                  touch()
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
          onClick={() => {
            setAjustements([...ajustements, { id: uid(), label: '', type: 'pct', valeur: 0 }])
            touch()
          }}
        >
          <Plus className="h-3 w-3" /> Ajouter un ajustement
        </button>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="etat" className="block text-sm font-medium mb-1">État général</label>
            <input id="etat" className={`${input} w-full`} value={etat} maxLength={300} onChange={(e) => { setEtat(e.target.value); touch() }} />
          </div>
          <div>
            <label htmlFor="concurrent" className="block text-sm font-medium mb-1">Autre avis de valeur reçu (€)</label>
            <input
              id="concurrent"
              className={`${input} w-full`}
              inputMode="numeric"
              value={concurrent}
              onChange={(e) => { setConcurrent(e.target.value.replace(/[^\d\s]/g, '')); touch() }}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium mb-1">Vos remarques</label>
            <textarea id="notes" className={`${input} w-full py-2 min-h-[80px]`} value={notes} maxLength={2000} onChange={(e) => { setNotes(e.target.value); touch() }} />
          </div>
        </div>
      </section>

      {/* Trois prix */}
      <section aria-labelledby="h-prix">
        <h2 id="h-prix" className="text-lg font-semibold text-gray-900 mb-3">Les trois prix possibles, en l’état</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {sc.scenarios.map((s) => (
            <div key={s.cle} className={`rounded-xl border p-5 ${s.cle === 'marche' ? 'border-blue-300 bg-blue-50/40' : 'bg-white'}`}>
              <p className="text-sm font-medium text-gray-700">{s.titre}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{eur(s.prixEnEtat)}</p>
              <p className="text-xs text-gray-500">{num(s.prixM2)} €/m²</p>
              <p className="mt-3 text-sm text-gray-600">{s.description}</p>
              <p className="mt-3 text-xs text-gray-500">
                {eur(s.reference)} en bon état − {eur(sc.totalTravaux)} de travaux
              </p>
            </div>
          ))}
        </div>

        {ac && (
          <div className="mt-4 rounded-xl border bg-white p-5 text-sm text-gray-700">
            <p className="font-medium text-gray-900">Où se situe l’autre avis de valeur ({eur(ac.prix)}, {num(ac.prixM2)} €/m²)</p>
            <p className="mt-1">
              {ac.ecartVsMarche >= 0 ? '+' : '−'}
              {eur(Math.abs(ac.ecartVsMarche))} ({ac.ecartVsMarchePct >= 0 ? '+' : ''}
              {ac.ecartVsMarchePct} %) par rapport au prix de marché en l’état.{' '}
              {ac.auDessusFourchette
                ? `Il dépasse de ${eur(ac.ecartVsHaut)} le haut de la fourchette, soit un acquéreur prêt à payer ${num(ac.prixM2)} €/m² là où les ventes proches se concluent entre ${num(p.dvf.prixM2Bas)} et ${num(p.dvf.prixM2Haut)} €/m² pour des biens en bon état.`
                : 'Il reste dans la fourchette.'}
            </p>
          </div>
        )}
      </section>

      {/* Actions */}
      <section className="flex flex-wrap items-center gap-3 print:hidden">
        <button
          type="button"
          onClick={generate}
          disabled={generating || saving}
          className="inline-flex items-center gap-2 min-h-[44px] rounded-lg bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {generating ? 'Rédaction du dossier…' : rapport ? 'Régénérer le dossier' : 'Générer le dossier'}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving || generating}
          className="min-h-[44px] rounded-lg border px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : dirty ? 'Enregistrer les modifications' : 'Modifications enregistrées'}
        </button>
        {rapport && (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 min-h-[44px] rounded-lg border px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" /> Imprimer / PDF
          </button>
        )}
      </section>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {stale && rapport && (
        <p className="text-sm text-amber-700 print:hidden">
          Vous avez modifié des éléments depuis la rédaction du dossier : régénérez-le pour qu’il tienne compte des changements.
        </p>
      )}

      {/* Dossier rédigé */}
      {rapport && (
        <article aria-labelledby="h-dossier" className="rounded-xl border bg-white p-6 space-y-6">
          <h2 id="h-dossier" className="text-xl font-semibold text-gray-900">Dossier d’estimation</h2>
          {rapport.resume && <p className="text-gray-800 leading-relaxed">{rapport.resume}</p>}
          {rapport.sections.map((s) => (
            <section key={s.titre}>
              <h3 className="text-base font-semibold text-gray-900 mb-1">{s.titre}</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{s.texte}</p>
            </section>
          ))}
          {rapport.argumentaire.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-gray-900">Ce que vous pouvez dire au propriétaire</h3>
                <button type="button" onClick={copyArgumentaire} className="print:hidden inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />} Copier
                </button>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                {rapport.argumentaire.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </section>
          )}
          {rapport.vigilance.length > 0 && (
            <section className="rounded-lg bg-amber-50 p-4">
              <h3 className="text-base font-semibold text-amber-900 mb-1">Points de vigilance</h3>
              <ul className="list-disc pl-5 space-y-1 text-amber-900/90 text-sm">
                {rapport.vigilance.map((v, i) => <li key={i}>{v}</li>)}
              </ul>
            </section>
          )}
          <p className="text-xs text-gray-500">
            Estimation indicative établie à partir des ventes enregistrées et des constats de l’agent. Elle ne constitue pas une expertise.
          </p>
        </article>
      )}

      {/* Suivi de l'issue */}
      <section aria-labelledby="h-issue" className="rounded-xl border bg-white p-6 print:hidden">
        <h2 id="h-issue" className="text-lg font-semibold text-gray-900 mb-1">Issue de ce dossier</h2>
        <p className="text-sm text-gray-500 mb-4">Pour savoir, au bout de quelques semaines, ce qui fait rentrer ou perdre des mandats.</p>
        <div className="flex flex-wrap gap-3 items-center">
          <label htmlFor="issue" className="sr-only">Issue</label>
          <select id="issue" className={`${input} w-52`} value={issue} onChange={(e) => saveIssue(e.target.value as Issue, e.target.value === 'mandat_perdu' ? raison : null)}>
            {(Object.keys(ISSUES) as Issue[]).map((k) => <option key={k} value={k}>{ISSUES[k]}</option>)}
          </select>
          {issue === 'mandat_perdu' && (
            <>
              <label htmlFor="raison" className="sr-only">Raison</label>
              <select id="raison" className={`${input} w-full sm:w-72`} value={raison ?? ''} onChange={(e) => saveIssue('mandat_perdu', (e.target.value || null) as RaisonPerte | null)}>
                <option value="">Raison (à préciser)</option>
                {(Object.keys(RAISONS_PERTE) as RaisonPerte[]).map((k) => <option key={k} value={k}>{RAISONS_PERTE[k]}</option>)}
              </select>
            </>
          )}
          {issueSaved && <span className="text-xs text-emerald-700">Enregistré</span>}
        </div>
      </section>
    </div>
  )
}

'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, Send } from 'lucide-react'
import { getAgent } from '@/lib/agents'
import { alexHref, type AlexTurn } from '@/lib/alex-shared'
import { AgentAvatar } from '@/components/agents/AgentAvatar'

const EXEMPLES = [
  'Estimer une maison à rénover',
  'J’ai une idée de publication',
  'Rédiger une annonce',
  'Qui dois-je relancer ?',
  'Trouver des vendeurs',
]

export function AlexChat() {
  const alex = getAgent('alex')
  const [texte, setTexte] = useState('')
  const [fil, setFil] = useState<AlexTurn[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fin = useRef<HTMLDivElement>(null)

  async function envoyer(message: string) {
    const m = message.trim()
    if (m.length < 2 || loading) return
    setError(null)
    setTexte('')
    const historique = fil.map(({ role, texte }) => ({ role, texte }))
    setFil((f) => [...f, { role: 'vous', texte: m }])
    setLoading(true)
    try {
      const res = await fetch('/api/alex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: m, history: historique }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Alex est indisponible.')
      setFil((f) => [...f, { role: 'alex', texte: json.route.reponse, route: json.route }])
    } catch (e) {
      setError((e as Error).message || 'Alex est indisponible. Réessayez.')
    } finally {
      setLoading(false)
      setTimeout(() => fin.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 50)
    }
  }

  return (
    <section aria-labelledby="alex-titre" className="mb-8 rounded-xl border bg-white p-5">
      <div className="flex items-center gap-3 mb-3">
        <AgentAvatar agent={alex} size="lg" />
        <div>
          <h2 id="alex-titre" className="font-semibold text-gray-900">Alex — {alex.role}</h2>
          <p className="text-sm text-gray-600">« {alex.presentation} »</p>
        </div>
      </div>

      {fil.length > 0 && (
        <div className="mb-4 space-y-3" aria-live="polite">
          {fil.map((t, i) => {
            const cible = t.route && t.route.agent !== 'alex' ? getAgent(t.route.agent) : null
            return (
              <div key={i} className={t.role === 'vous' ? 'flex justify-end' : 'flex'}>
                <div className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm ${t.role === 'vous' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                  <p className="whitespace-pre-line">{t.texte}</p>
                  {cible && t.route && (
                    cible.version === 'v2' ? (
                      <p className="mt-2 text-xs text-gray-500">{cible.prenom} n’est pas encore disponible.</p>
                    ) : (
                      <Link
                        href={alexHref(t.route)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50"
                      >
                        Ouvrir avec {cible.prenom} <ArrowRight className="h-4 w-4" />
                      </Link>
                    )
                  )}
                </div>
              </div>
            )
          })}
          {loading && (
            <div className="flex">
              <div className="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm text-gray-500 inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Alex réfléchit…
              </div>
            </div>
          )}
          <div ref={fin} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          envoyer(texte)
        }}
        className="flex gap-2"
      >
        <label htmlFor="alex-message" className="sr-only">Dites-moi ce dont vous avez besoin</label>
        <input
          id="alex-message"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          maxLength={1000}
          autoComplete="off"
          placeholder="Dites-moi ce dont vous avez besoin…"
          className="min-h-[44px] flex-1 min-w-0 rounded-lg border border-input bg-white px-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={loading || texte.trim().length < 2}
          aria-label="Envoyer"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="hidden sm:inline">Envoyer</span>
        </button>
      </form>

      {fil.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {EXEMPLES.map((e) => (
            <button key={e} type="button" onClick={() => envoyer(e)} className="rounded-full border px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
              {e}
            </button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  )
}

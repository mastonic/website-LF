import Link from 'next/link'
import { BarChart3, Plus } from 'lucide-react'
import { getWorkspaceContext } from '@/lib/workspace'
import { ISSUES, RAISONS_PERTE, summarizeSuivi, type Issue } from '@/lib/estimation'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Thomas — Estimations' }

const eur = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const ISSUE_STYLE: Record<Issue, string> = {
  en_cours: 'bg-gray-100 text-gray-700',
  mandat_signe: 'bg-emerald-100 text-emerald-800',
  mandat_perdu: 'bg-rose-100 text-rose-800',
  abandonne: 'bg-stone-100 text-stone-600',
}

export default async function EstimationPage() {
  const { supabase, workspaceId } = await getWorkspaceContext()
  const { data } = await supabase
    .from('estimations')
    .select('id, adresse, type_bien, surface, prix_min, prix_median, prix_max, issue, raison_perte, created_at, rapport')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(100)
  const list = data ?? []
  const suivi = summarizeSuivi(list.map((e) => ({ issue: e.issue ?? 'en_cours', raison_perte: e.raison_perte })))

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thomas — Estimation complète</h1>
          <p className="text-gray-500 text-sm mt-1">Un dossier chiffré, appuyé sur les ventes réelles autour du bien.</p>
        </div>
        <Link
          href="/estimation/nouvelle"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouvelle estimation
        </Link>
      </div>

      {list.length > 0 && (
        <section aria-label="Suivi" className="mb-8 grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ['Estimations', suivi.total],
            ['Mandats signés', suivi.signes],
            ['Mandats perdus', suivi.perdus],
            ['En cours', suivi.enCours],
            ['Taux de mandats', suivi.tauxTransformation === null ? '—' : `${suivi.tauxTransformation} %`],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-lg border bg-white p-4">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
            </div>
          ))}
          {suivi.raisons.length > 0 && (
            <div className="col-span-2 md:col-span-5 rounded-lg border bg-white p-4 text-sm text-gray-700">
              <p className="text-xs text-gray-500 mb-1">Pourquoi des mandats sont perdus</p>
              <ul className="flex flex-wrap gap-x-6 gap-y-1">
                {suivi.raisons.map((r) => (
                  <li key={r.raison}>
                    {RAISONS_PERTE[r.raison]} : <strong>{r.nb}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {list.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-xl">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Aucune estimation encore</h2>
          <p className="text-gray-500 text-sm mb-6">Saisissez une adresse : Thomas retrouve les ventes réelles autour du bien.</p>
          <Link
            href="/estimation/nouvelle"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Première estimation
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((e) => {
            const issue = (e.issue ?? 'en_cours') as Issue
            return (
              <li key={e.id}>
                <Link href={`/estimation/${e.id}`} className="block rounded-lg border bg-white p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{e.adresse}</p>
                      <p className="text-sm text-gray-500">
                        {e.type_bien} · {Number(e.surface)} m² · {formatDate(e.created_at)}
                        {e.rapport ? ' · dossier rédigé' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {eur(e.prix_min)} – {eur(e.prix_max)}
                      </p>
                      <span className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${ISSUE_STYLE[issue]}`}>
                        {ISSUES[issue]}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

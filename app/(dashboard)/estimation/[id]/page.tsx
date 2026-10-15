import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getWorkspaceContext } from '@/lib/workspace'
import type { EstimationResult } from '@/lib/dvf'
import type { Ajustement, Issue, PosteTravaux, RaisonPerte } from '@/lib/estimation'
import type { RapportEstimation } from '@/lib/estimation-report'
import type { AnalysePhotos, PhotoBien } from '@/lib/photos-shared'
import { photosAffichees } from '@/lib/photos'
import { EstimationClient } from '@/components/estimation/EstimationClient'

export const metadata = { title: 'Thomas — Dossier d’estimation' }

export default async function EstimationDetailPage({ params }: { params: { id: string } }) {
  const { supabase, workspaceId } = await getWorkspaceContext()
  const { data: row } = await supabase
    .from('estimations')
    .select('*')
    .eq('id', params.id)
    .eq('workspace_id', workspaceId)
    .single()
  if (!row || !row.resultat) notFound()

  const photos = await photosAffichees((row.photos ?? []) as PhotoBien[])

  return (
    <div className="p-4 sm:p-8 max-w-5xl print:p-0">
      <Link href="/estimation" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 print:hidden">
        <ArrowLeft className="h-4 w-4" /> Estimations
      </Link>
      <EstimationClient
        id={row.id}
        adresse={row.adresse}
        typeBien={row.type_bien}
        surface={Number(row.surface)}
        pieces={row.pieces}
        anneeConstruction={row.annee_construction}
        dvf={row.resultat as EstimationResult}
        initialTravaux={(row.travaux ?? []) as PosteTravaux[]}
        initialAjustements={(row.ajustements ?? []) as Ajustement[]}
        initialEtat={row.etat ?? ''}
        initialNotes={row.notes ?? ''}
        initialConcurrent={row.prix_concurrent == null ? '' : String(Number(row.prix_concurrent))}
        initialRapport={(row.rapport ?? null) as RapportEstimation | null}
        initialIssue={(row.issue ?? 'en_cours') as Issue}
        initialRaison={(row.raison_perte ?? null) as RaisonPerte | null}
        initialPhotos={photos}
        initialAnalysePhotos={(row.analyse_photos ?? null) as AnalysePhotos | null}
      />
    </div>
  )
}

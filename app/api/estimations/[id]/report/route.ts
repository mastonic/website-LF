import { NextResponse } from 'next/server'
import { consumeQuota, getApiContext } from '@/lib/api-auth'
import { generateEstimationReport } from '@/lib/estimation-report'
import { computeScenarios } from '@/lib/estimation'
import type { EstimationResult } from '@/lib/dvf'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext()
  if ('error' in ctx) return ctx.error
  const { supabase, workspaceId } = ctx

  const { data: row } = await supabase
    .from('estimations')
    .select('*')
    .eq('id', params.id)
    .eq('workspace_id', workspaceId)
    .single()
  if (!row || !row.resultat) return NextResponse.json({ error: 'Estimation introuvable' }, { status: 404 })

  const dvf = row.resultat as EstimationResult
  const scenarios = computeScenarios(dvf, Number(row.surface), row.travaux ?? [], row.ajustements ?? [], row.prix_concurrent)

  const { data: brand } = await supabase
    .from('brand_identity')
    .select('nom_affiche')
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  const quotaError = await consumeQuota(supabase, workspaceId)
  if (quotaError) return quotaError

  try {
    const { rapport, tokens } = await generateEstimationReport({
      adresse: row.adresse,
      typeBien: row.type_bien,
      surface: Number(row.surface),
      pieces: row.pieces,
      etat: row.etat,
      anneeConstruction: row.annee_construction,
      equipements: row.equipements,
      notes: row.notes,
      dvf,
      travaux: row.travaux ?? [],
      ajustements: row.ajustements ?? [],
      scenarios,
      agentNom: brand?.nom_affiche ?? null,
    })
    await supabase
      .from('estimations')
      .update({
        rapport,
        scenarios,
        tokens_used: (row.tokens_used ?? 0) + tokens,
      })
      .eq('id', params.id)
      .eq('workspace_id', workspaceId)
    return NextResponse.json({ rapport, scenarios })
  } catch {
    return NextResponse.json({ error: 'La rédaction du compte rendu a échoué. Réessayez.' }, { status: 502 })
  }
}

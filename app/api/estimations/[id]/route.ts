import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getApiContext } from '@/lib/api-auth'
import { computeScenarios } from '@/lib/estimation'
import type { EstimationResult } from '@/lib/dvf'

const montant = z.number().min(0).max(10_000_000)

const schema = z
  .object({
    travaux: z
      .array(
        z.object({
          id: z.string().min(1).max(40),
          label: z.string().min(1).max(120),
          montant,
          note: z.string().max(300).optional(),
        })
      )
      .max(30),
    ajustements: z
      .array(
        z.object({
          id: z.string().min(1).max(40),
          label: z.string().min(1).max(120),
          type: z.enum(['pct', 'eur']),
          valeur: z.number().min(-100_000_000).max(100_000_000),
        })
      )
      .max(20),
    notes: z.string().max(2000).nullable(),
    etat: z.string().max(300).nullable(),
    prix_concurrent: montant.nullable(),
    issue: z.enum(['en_cours', 'mandat_signe', 'mandat_perdu', 'abandonne']),
    raison_perte: z
      .enum(['estimation_plus_haute_ailleurs', 'autre_agence_choisie', 'vendeur_renonce', 'vendeur_reporte', 'autre'])
      .nullable(),
  })
  .partial()

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext()
  if ('error' in ctx) return ctx.error
  const { supabase, workspaceId } = ctx

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  const patch = parsed.data

  const { data: row } = await supabase
    .from('estimations')
    .select('surface, resultat, travaux, ajustements, prix_concurrent, issue')
    .eq('id', params.id)
    .eq('workspace_id', workspaceId)
    .single()
  if (!row) return NextResponse.json({ error: 'Estimation introuvable' }, { status: 404 })

  const travaux = patch.travaux ?? row.travaux ?? []
  const ajustements = patch.ajustements ?? row.ajustements ?? []
  const prixConcurrent = patch.prix_concurrent !== undefined ? patch.prix_concurrent : row.prix_concurrent
  const resultat = row.resultat as EstimationResult | null

  const update: Record<string, unknown> = {}
  if (patch.notes !== undefined) update.notes = patch.notes
  if (patch.etat !== undefined) update.etat = patch.etat
  if (patch.prix_concurrent !== undefined) update.prix_concurrent = patch.prix_concurrent

  if (patch.travaux || patch.ajustements || patch.prix_concurrent !== undefined) {
    update.travaux = travaux
    update.ajustements = ajustements
    if (resultat) {
      const scenarios = computeScenarios(resultat, Number(row.surface), travaux, ajustements, prixConcurrent)
      update.scenarios = scenarios
      update.prix_min = scenarios.scenarios[0].prixEnEtat
      update.prix_median = scenarios.scenarios[1].prixEnEtat
      update.prix_max = scenarios.scenarios[2].prixEnEtat
    }
  }

  if (patch.issue !== undefined) {
    update.issue = patch.issue
    update.issue_at = patch.issue === 'en_cours' ? null : new Date().toISOString()
    update.raison_perte = patch.issue === 'mandat_perdu' ? patch.raison_perte ?? null : null
  } else if (patch.raison_perte !== undefined && row.issue === 'mandat_perdu') {
    update.raison_perte = patch.raison_perte
  }

  const { data, error } = await supabase
    .from('estimations')
    .update(update)
    .eq('id', params.id)
    .eq('workspace_id', workspaceId)
    .select('scenarios, issue, raison_perte, prix_min, prix_median, prix_max')
    .single()
  if (error || !data) return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 500 })
  return NextResponse.json({ ok: true, ...data })
}

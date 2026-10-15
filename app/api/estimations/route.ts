import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getApiContext } from '@/lib/api-auth'
import { estimate, fetchCommuneSales, INSEE_RE } from '@/lib/dvf'
import { computeScenarios } from '@/lib/estimation'

export const runtime = 'nodejs'
export const maxDuration = 30

const schema = z.object({
  adresse: z.string().min(3).max(200),
  codeInsee: z.string().regex(INSEE_RE),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  type: z.enum(['Appartement', 'Maison']),
  surface: z.number().min(9).max(400),
  pieces: z.number().int().min(1).max(15).nullish(),
  etat: z.string().max(300).nullish(),
  annee_construction: z.number().int().min(1000).max(2100).nullish(),
  notes: z.string().max(2000).nullish(),
  prix_concurrent: z.number().min(0).max(100_000_000).nullish(),
})

export async function POST(request: Request) {
  const ctx = await getApiContext()
  if ('error' in ctx) return ctx.error
  const { supabase, user, workspaceId } = ctx

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Vérifiez l’adresse, le type de bien et la surface.' }, { status: 400 })
  }
  const d = parsed.data

  let resultat
  try {
    const year = new Date().getFullYear()
    const sales = await fetchCommuneSales(d.codeInsee, [year, year - 1, year - 2, year - 3])
    resultat = estimate({ type: d.type, surface: d.surface, pieces: d.pieces, lat: d.lat, lon: d.lon }, sales, {
      maxComparables: 10,
    })
  } catch {
    return NextResponse.json(
      { error: 'Les données de ventes officielles sont momentanément indisponibles. Réessayez plus tard.' },
      { status: 502 }
    )
  }
  if (!resultat) {
    return NextResponse.json(
      { error: 'Pas assez de ventes récentes autour de cette adresse pour une estimation fiable.' },
      { status: 422 }
    )
  }

  const scenarios = computeScenarios(resultat, d.surface, [], [], d.prix_concurrent)

  const { data, error } = await supabase
    .from('estimations')
    .insert({
      workspace_id: workspaceId,
      created_by: user.id,
      adresse: d.adresse,
      type_bien: d.type,
      surface: d.surface,
      pieces: d.pieces ?? null,
      etat: d.etat ?? null,
      annee_construction: d.annee_construction ?? null,
      notes: d.notes ?? null,
      prix_concurrent: d.prix_concurrent ?? null,
      lat: d.lat,
      lon: d.lon,
      code_insee: d.codeInsee,
      prix_min: scenarios.scenarios[0].prixEnEtat,
      prix_median: scenarios.scenarios[1].prixEnEtat,
      prix_max: scenarios.scenarios[2].prixEnEtat,
      resultat,
      scenarios,
    })
    .select('id')
    .single()
  if (error || !data) {
    return NextResponse.json({ error: 'Enregistrement impossible. Réessayez.' }, { status: 500 })
  }
  return NextResponse.json({ id: data.id })
}

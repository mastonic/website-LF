import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { estimate, fetchCommuneSales, INSEE_RE } from '@/lib/dvf'

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
})

// Limite simple par IP (best effort, par instance)
const hits = new Map<string, number[]>()
const WINDOW_MS = 10 * 60 * 1000
const MAX_HITS = 12

function limited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.delete(hits.keys().next().value as string)
  return recent.length > MAX_HITS
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (limited(ip)) {
    return NextResponse.json({ error: 'Trop de simulations. Réessayez dans quelques minutes.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Vérifiez l’adresse, le type de bien et la surface.' }, { status: 400 })
  }
  const d = parsed.data

  try {
    const year = new Date().getFullYear()
    const sales = await fetchCommuneSales(d.codeInsee, [year, year - 1, year - 2, year - 3])
    const result = estimate({ type: d.type, surface: d.surface, pieces: d.pieces, lat: d.lat, lon: d.lon }, sales)
    if (!result) {
      return NextResponse.json(
        { error: 'Pas assez de ventes récentes autour de cette adresse pour une estimation fiable.' },
        { status: 422 }
      )
    }
    return NextResponse.json({ adresse: d.adresse, ...result })
  } catch {
    return NextResponse.json(
      { error: 'Les données de ventes officielles sont momentanément indisponibles. Réessayez plus tard.' },
      { status: 502 }
    )
  }
}

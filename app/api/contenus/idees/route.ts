import { NextResponse } from 'next/server'
import { z } from 'zod'
import { consumeQuota, getApiContext, loadMarque } from '@/lib/api-auth'
import { generateIdees } from '@/lib/contenu'

export const runtime = 'nodejs'
export const maxDuration = 60

const schema = z.object({
  piste: z.string().max(600).optional(),
  secteur: z.string().max(120).optional(),
})

export async function POST(request: Request) {
  const ctx = await getApiContext()
  if ('error' in ctx) return ctx.error
  const { supabase, workspaceId } = ctx

  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })

  const quotaError = await consumeQuota(supabase, workspaceId)
  if (quotaError) return quotaError

  try {
    const marque = { ...(await loadMarque(supabase, workspaceId)), secteur: parsed.data.secteur ?? null }
    const { idees } = await generateIdees(marque, parsed.data.piste?.trim() || undefined)
    return NextResponse.json({ idees })
  } catch {
    return NextResponse.json({ error: 'Impossible de proposer des idées pour le moment. Réessayez.' }, { status: 502 })
  }
}

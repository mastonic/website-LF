import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getApiContext } from '@/lib/api-auth'
import { routeByRules, routeRequest } from '@/lib/alex'

export const runtime = 'nodejs'
export const maxDuration = 30

const schema = z.object({
  message: z.string().min(2).max(1000),
  history: z
    .array(z.object({ role: z.enum(['vous', 'alex']), texte: z.string().max(1000) }))
    .max(12)
    .optional(),
})

export async function POST(request: Request) {
  const ctx = await getApiContext()
  if ('error' in ctx) return ctx.error
  const { supabase, workspaceId } = ctx

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dites-moi ce dont vous avez besoin.' }, { status: 400 })
  const { message, history } = parsed.data

  // Quota épuisé ou indisponible : Alex oriente quand même, avec des règles simples
  const { data: quotaOk, error: quotaErr } = await supabase.rpc('increment_ai_quota', { workspace_id_input: workspaceId })
  if (quotaErr || !quotaOk) return NextResponse.json({ route: routeByRules(message) })

  const { route } = await routeRequest(message, history)
  return NextResponse.json({ route })
}

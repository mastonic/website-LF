import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getApiContext } from '@/lib/api-auth'

const schema = z.object({ statut: z.enum(['brouillon', 'publie', 'abandonne']) })

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext()
  if ('error' in ctx) return ctx.error
  const { supabase, workspaceId } = ctx

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })

  const { error } = await supabase
    .from('contenus')
    .update({
      statut: parsed.data.statut,
      publie_le: parsed.data.statut === 'publie' ? new Date().toISOString() : null,
    })
    .eq('id', params.id)
    .eq('workspace_id', workspaceId)
  if (error) return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { consumeQuota, getApiContext, loadMarque } from '@/lib/api-auth'
import { generateContenu } from '@/lib/contenu'

export const runtime = 'nodejs'
export const maxDuration = 60

const schema = z.object({
  idee: z.string().min(3).max(800),
  format: z.enum(['video', 'texte']),
  plateforme: z.enum(['instagram', 'tiktok', 'facebook', 'linkedin']),
  secteur: z.string().max(120).optional(),
})

export async function POST(request: Request) {
  const ctx = await getApiContext()
  if ('error' in ctx) return ctx.error
  const { supabase, user, workspaceId } = ctx

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Décrivez votre idée en quelques mots.' }, { status: 400 })
  const d = parsed.data

  const quotaError = await consumeQuota(supabase, workspaceId)
  if (quotaError) return quotaError

  try {
    const marque = { ...(await loadMarque(supabase, workspaceId)), secteur: d.secteur ?? null }
    const { contenu, tokens, fournisseur } = await generateContenu(marque, d.idee.trim(), d.format, d.plateforme)
    const { data, error } = await supabase
      .from('contenus')
      .insert({
        workspace_id: workspaceId,
        created_by: user.id,
        idee: d.idee.trim(),
        format: d.format,
        plateforme: d.plateforme,
        titre: contenu.titre,
        contenu,
        fournisseur,
        tokens_used: tokens,
      })
      .select('id, created_at')
      .single()
    if (error || !data) return NextResponse.json({ error: 'Enregistrement impossible. Réessayez.' }, { status: 500 })
    return NextResponse.json({ id: data.id, created_at: data.created_at, contenu })
  } catch {
    return NextResponse.json({ error: 'La rédaction a échoué. Réessayez.' }, { status: 502 })
  }
}

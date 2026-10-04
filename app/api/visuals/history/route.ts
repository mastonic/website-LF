import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Workspace introuvable' }, { status: 403 })

  const service = createServiceClient()

  const { data: renders, error } = await service
    .from('visual_renders')
    .select('id, template_id, thumb_path, taille_octets, created_at, storage_path')
    .eq('workspace_id', member.workspace_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate signed URLs for thumbnails
  const enriched = await Promise.all(
    (renders ?? []).map(async (r) => {
      let thumb_signed_url: string | null = null
      if (r.thumb_path) {
        const { data } = await service.storage.from('renders').createSignedUrl(r.thumb_path, 3600)
        thumb_signed_url = data?.signedUrl ?? null
      }
      return { ...r, thumb_signed_url }
    })
  )

  return NextResponse.json({ renders: enriched })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Workspace introuvable' }, { status: 403 })

  const { renderId } = await req.json() as { renderId: string }
  if (!renderId) return NextResponse.json({ error: 'renderId requis' }, { status: 400 })

  const service = createServiceClient()

  const { data: render } = await service
    .from('visual_renders')
    .select('storage_path, thumb_path, taille_octets')
    .eq('id', renderId)
    .eq('workspace_id', member.workspace_id)
    .single()

  if (!render) return NextResponse.json({ error: 'Export introuvable' }, { status: 404 })

  const paths = [render.storage_path, render.thumb_path].filter(Boolean) as string[]
  await service.storage.from('renders').remove(paths)
  await service.from('visual_renders').delete().eq('id', renderId)

  // Update quota
  const { data: brand } = await service
    .from('brand_identity')
    .select('storage_used_bytes')
    .eq('workspace_id', member.workspace_id)
    .single()

  const current: number = brand?.storage_used_bytes ?? 0
  await service
    .from('brand_identity')
    .update({ storage_used_bytes: Math.max(0, current - render.taille_octets), updated_at: new Date().toISOString() })
    .eq('workspace_id', member.workspace_id)

  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Workspace introuvable' }, { status: 403 })

  // ordered list of media IDs
  const { orderedIds, coverId } = await req.json() as {
    orderedIds: string[]
    coverId?: string
  }

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: 'orderedIds requis.' }, { status: 400 })
  }

  const service = createServiceClient()

  // Verify all media belong to this annonce + workspace
  const { data: medias } = await service
    .from('annonce_media')
    .select('id')
    .eq('annonce_id', params.id)
    .eq('workspace_id', member.workspace_id)

  const validIds = new Set((medias ?? []).map((m) => m.id))
  for (const id of orderedIds) {
    if (!validIds.has(id)) {
      return NextResponse.json({ error: `Média inconnu : ${id}` }, { status: 400 })
    }
  }

  // Apply new order + cover
  await Promise.all(
    orderedIds.map((id, index) =>
      service
        .from('annonce_media')
        .update({
          ordre: index,
          is_couverture: coverId ? id === coverId : index === 0,
        })
        .eq('id', id)
    )
  )

  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const PHOTO_LIMITS: Record<string, number> = {
  trial: 4,
  starter: 4,
  pro: 20,
  agence: 999,
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()
    if (!member) return NextResponse.json({ error: 'Workspace introuvable' }, { status: 404 })

    // Verify ownership and get current photos + plan
    const { data: annonce } = await supabase
      .from('annonces')
      .select('id, photos')
      .eq('id', params.id)
      .eq('workspace_id', member.workspace_id)
      .single()
    if (!annonce) return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 })

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('plan')
      .eq('id', member.workspace_id)
      .single()

    const plan = (workspace?.plan ?? 'trial') as string
    const limit = PHOTO_LIMITS[plan] ?? 4
    const currentPhotos: string[] = annonce.photos ?? []

    if (currentPhotos.length >= limit) {
      return NextResponse.json(
        { error: `Limite de ${limit} photos atteinte pour votre plan.` },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop lourd (max 5 Mo)' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const fileName = `${user.id}/${params.id}/${Date.now()}.${ext}`

    const serviceSupabase = createServiceClient()
    const { error: uploadError } = await serviceSupabase.storage
      .from('annonce-photos')
      .upload(fileName, file, { contentType: file.type, upsert: false })

    if (uploadError) throw new Error(`Upload: ${uploadError.message}`)

    const { data: urlData } = serviceSupabase.storage
      .from('annonce-photos')
      .getPublicUrl(fileName)

    const newPhotos = [...currentPhotos, urlData.publicUrl]

    await supabase
      .from('annonces')
      .update({ photos: newPhotos })
      .eq('id', params.id)
      .eq('workspace_id', member.workspace_id)

    return NextResponse.json({ success: true, url: urlData.publicUrl, photos: newPhotos })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()
    if (!member) return NextResponse.json({ error: 'Workspace introuvable' }, { status: 404 })

    const { url } = await request.json()
    if (!url) return NextResponse.json({ error: 'URL manquante' }, { status: 400 })

    const { data: annonce } = await supabase
      .from('annonces')
      .select('id, photos')
      .eq('id', params.id)
      .eq('workspace_id', member.workspace_id)
      .single()
    if (!annonce) return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 })

    // Extract storage path from public URL
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/annonce-photos/')
    const storagePath = pathParts[1]

    if (storagePath) {
      const serviceSupabase = createServiceClient()
      await serviceSupabase.storage.from('annonce-photos').remove([storagePath])
    }

    const newPhotos = (annonce.photos ?? []).filter((p: string) => p !== url)
    await supabase
      .from('annonces')
      .update({ photos: newPhotos })
      .eq('id', params.id)
      .eq('workspace_id', member.workspace_id)

    return NextResponse.json({ success: true, photos: newPhotos })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

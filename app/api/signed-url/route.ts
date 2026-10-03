import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Workspace introuvable' }, { status: 403 })

  const { bucket, path, expiresIn = 3600 } = await req.json() as {
    bucket: 'brand-assets' | 'bien-media'
    path: string
    expiresIn?: number
  }

  if (!bucket || !path) {
    return NextResponse.json({ error: 'bucket et path requis.' }, { status: 400 })
  }

  if (!['brand-assets', 'bien-media'].includes(bucket)) {
    return NextResponse.json({ error: 'Bucket non autorisé.' }, { status: 400 })
  }

  // Security: path must start with userId
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const service = createServiceClient()
  const { data, error } = await service.storage
    .from(bucket)
    .createSignedUrl(path, Math.min(expiresIn, 86400))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ signedUrl: data.signedUrl })
}

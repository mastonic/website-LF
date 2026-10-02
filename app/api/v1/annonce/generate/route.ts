import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateAnnonce } from '@/lib/claude'
import type { AnnonceGenerateInput } from '@/types'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token Bearer manquant' }, { status: 401 })
    }
    const apiKey = authHeader.slice(7)

    const supabase = createServiceClient()
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, ai_quota_used, ai_quota_limit')
      .eq('api_key', apiKey)
      .single()

    if (!workspace) return NextResponse.json({ error: 'Clé API invalide' }, { status: 401 })
    if (workspace.ai_quota_used >= workspace.ai_quota_limit) {
      return NextResponse.json({ error: 'Quota épuisé' }, { status: 429 })
    }

    const body = (await request.json()) as AnnonceGenerateInput
    const result = await generateAnnonce(body)

    await supabase.from('workspaces').update({ ai_quota_used: workspace.ai_quota_used + 1 }).eq('id', workspace.id)

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur' }, { status: 500 })
  }
}

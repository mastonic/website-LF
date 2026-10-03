import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAnnonce } from '@/lib/claude'
import type { AnnonceGenerateInput } from '@/types'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()
    if (!member) return NextResponse.json({ error: 'Workspace introuvable' }, { status: 404 })

    const workspaceId: string = member.workspace_id

    // ── Incrément atomique du quota via RPC Postgres ─────────────────────────
    // La fonction retourne TRUE si OK, FALSE si quota dépassé
    const { data: quotaOk, error: quotaErr } = await supabase.rpc(
      'increment_ai_quota',
      { workspace_id_input: workspaceId }
    )
    if (quotaErr) throw new Error(`Erreur quota: ${quotaErr.message}`)
    if (!quotaOk) {
      return NextResponse.json(
        { error: 'Quota IA épuisé. Upgradez votre plan.' },
        { status: 429 }
      )
    }

    const body = (await request.json()) as AnnonceGenerateInput & {
      annonce_id?: string
    }
    const { annonce_id, ...input } = body

    const result = await generateAnnonce(input)

    if (annonce_id) {
      // ownership check explicite en plus de RLS
      await supabase
        .from('annonces')
        .update({
          titre: result.titre,
          description_longue: result.description_longue,
          description_courte: result.description_courte,
          description_en: result.description_en,
          tokens_used: result.tokens_used,
        })
        .eq('id', annonce_id)
        .eq('workspace_id', workspaceId)
    } else {
      const { data: inserted } = await supabase.from('annonces').insert({
        workspace_id: workspaceId,
        created_by: user.id,
        type_bien: input.type_bien,
        surface: input.surface ?? null,
        pieces: input.pieces ?? null,
        localisation: input.localisation ?? null,
        prix: (input as AnnonceGenerateInput & { prix?: number }).prix ?? null,
        equipements: input.equipements ?? null,
        points_forts: input.points_forts ?? null,
        ton: input.ton,
        titre: result.titre,
        description_longue: result.description_longue,
        description_courte: result.description_courte,
        description_en: result.description_en,
        tokens_used: result.tokens_used,
      }).select('id').single()
      return NextResponse.json({ success: true, data: result, annonce_id: inserted?.id ?? null })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

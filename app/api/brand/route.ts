import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateHexColor, meetsWcagAA } from '@/lib/file-validation'
import type { BrandColor, BrandFonts } from '@/types/brand'
import { FONT_KEYS } from '@/lib/fonts'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Workspace introuvable' }, { status: 403 })

  const { data: brand, error } = await supabase
    .from('brand_identity')
    .select('*')
    .eq('workspace_id', member.workspace_id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ brand: brand ?? null })
}

export async function PUT(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Workspace introuvable' }, { status: 403 })

  let body: {
    nom_affiche?: string
    signature?: string
    charte?: string
    couleurs?: BrandColor[]
    polices?: Partial<BrandFonts>
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  // Validate colors
  if (body.couleurs !== undefined) {
    if (!Array.isArray(body.couleurs) || body.couleurs.length < 2 || body.couleurs.length > 4) {
      return NextResponse.json({ error: 'Entre 2 et 4 couleurs requises.' }, { status: 400 })
    }
    for (const c of body.couleurs) {
      if (!validateHexColor(c.hex)) {
        return NextResponse.json({ error: `Couleur invalide : ${c.hex}` }, { status: 400 })
      }
    }
    // WCAG warning (not blocking)
    const warnings: string[] = []
    const hexes = body.couleurs.map((c) => c.hex)
    for (let i = 0; i < hexes.length; i++) {
      for (let j = i + 1; j < hexes.length; j++) {
        if (!meetsWcagAA(hexes[i], hexes[j])) {
          warnings.push(`Contraste insuffisant entre ${hexes[i]} et ${hexes[j]} (WCAG AA)`)
        }
      }
    }
    if (warnings.length) {
      // Non-blocking: we save but return warnings
    }
  }

  // Validate fonts
  if (body.polices !== undefined) {
    const { titre, texte } = body.polices
    if (titre && !FONT_KEYS.includes(titre)) {
      return NextResponse.json({ error: `Police titre invalide : ${titre}` }, { status: 400 })
    }
    if (texte && !FONT_KEYS.includes(texte)) {
      return NextResponse.json({ error: `Police texte invalide : ${texte}` }, { status: 400 })
    }
  }

  // Sanitize text fields
  const nom_affiche = body.nom_affiche?.slice(0, 100) ?? undefined
  const signature = body.signature?.slice(0, 500) ?? undefined
  const charte = body.charte?.slice(0, 5000) ?? undefined

  const service = createServiceClient()
  const { data: brand, error } = await service
    .from('brand_identity')
    .upsert(
      {
        workspace_id: member.workspace_id,
        ...(nom_affiche !== undefined && { nom_affiche }),
        ...(signature !== undefined && { signature }),
        ...(charte !== undefined && { charte }),
        ...(body.couleurs !== undefined && { couleurs: body.couleurs }),
        ...(body.polices !== undefined && { polices: body.polices }),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Compute WCAG warnings to return
  const warnings: string[] = []
  const couleurs = body.couleurs ?? brand?.couleurs ?? []
  const hexes = (couleurs as BrandColor[]).map((c) => c.hex)
  for (let i = 0; i < hexes.length; i++) {
    for (let j = i + 1; j < hexes.length; j++) {
      if (!meetsWcagAA(hexes[i], hexes[j])) {
        warnings.push(`Contraste insuffisant entre ${hexes[i]} et ${hexes[j]} (WCAG AA)`)
      }
    }
  }

  return NextResponse.json({ brand, warnings })
}

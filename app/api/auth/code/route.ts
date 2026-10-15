import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { accessEmail, accessPassword, matchAccessCode, parseAccessCodes } from '@/lib/access-code'

export const runtime = 'nodejs'

const schema = z.object({ code: z.string().min(1).max(100) })

// Limite par IP (au mieux, par instance) : 8 essais / 10 minutes
const hits = new Map<string, number[]>()
function limited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.delete(hits.keys().next().value as string)
  return recent.length > 8
}

const QUOTA_TEST = 300

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (limited(ip)) return NextResponse.json({ error: 'Trop d’essais. Réessayez dans quelques minutes.' }, { status: 429 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Saisissez votre code.' }, { status: 400 })

  const entries = parseAccessCodes(process.env.ACCESS_CODES)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (entries.length === 0 || !serviceKey) {
    return NextResponse.json({ error: 'Connexion par code non configurée.' }, { status: 503 })
  }

  const entry = matchAccessCode(entries, parsed.data.code)
  if (!entry) return NextResponse.json({ error: 'Code incorrect.' }, { status: 401 })

  const email = accessEmail(entry.name)
  const password = accessPassword(entry.name, serviceKey)
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Crée le compte au premier passage (déjà confirmé : aucun email envoyé)
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { workspace_name: entry.name.charAt(0).toUpperCase() + entry.name.slice(1) },
  })
  if (created.data?.user) {
    // Espace de test : plus de marge que l'essai standard
    await admin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', created.data.user.id)
      .single()
      .then(({ data }) =>
        data ? admin.from('workspaces').update({ ai_quota_limit: QUOTA_TEST }).eq('id', data.workspace_id) : null
      )
  }

  const supabase = createClient()
  let { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    // Secret changé depuis la création : on resynchronise le mot de passe technique
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const user = list?.users.find((u) => u.email === email)
    if (user) {
      await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true })
      ;({ error } = await supabase.auth.signInWithPassword({ email, password }))
    }
  }
  if (error) return NextResponse.json({ error: 'Connexion impossible. Réessayez.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Tests pour les routes API ────────────────────────────────────────────────

describe('POST /api/annonces/generate — auth guard', () => {
  it('retourne 401 si Authorization Bearer manquant (non authentifié)', async () => {
    // Simule utilisateur non connecté
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => ({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
        from: vi.fn(),
        rpc: vi.fn(),
      }),
    }))

    vi.doMock('@/lib/claude', () => ({
      generateAnnonce: vi.fn(),
    }))

    const { POST } = await import('@/app/api/annonces/generate/route')
    const req = new NextRequest('http://localhost/api/annonces/generate', {
      method: 'POST',
      body: JSON.stringify({ type_bien: 'Appartement', ton: 'standard' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('Non autorisé')
    vi.resetModules()
  })
})

describe('POST /api/v1/annonce/generate — auth API key', () => {
  it('retourne 401 si header Authorization absent', async () => {
    vi.doMock('@/lib/claude', () => ({ generateAnnonce: vi.fn() }))
    vi.doMock('@/lib/supabase/server', () => ({
      createServiceClient: () => ({ from: vi.fn() }),
    }))

    const { POST } = await import('@/app/api/v1/annonce/generate/route')
    const req = new NextRequest('http://localhost/api/v1/annonce/generate', {
      method: 'POST',
      body: JSON.stringify({ type_bien: 'Appartement', ton: 'standard' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('Bearer')
    vi.resetModules()
  })

  it('retourne 401 si clé API introuvable en BDD', async () => {
    vi.doMock('@/lib/claude', () => ({ generateAnnonce: vi.fn() }))
    vi.doMock('@/lib/supabase/server', () => ({
      createServiceClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'Not found' } }),
            }),
          }),
        }),
      }),
    }))

    const { POST } = await import('@/app/api/v1/annonce/generate/route')
    const req = new NextRequest('http://localhost/api/v1/annonce/generate', {
      method: 'POST',
      body: JSON.stringify({ type_bien: 'Appartement', ton: 'standard' }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid-key-xxx',
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    vi.resetModules()
  })
})

describe('POST /api/v1/leads/ingest — auth API key', () => {
  it('retourne 401 si pas de header Authorization', async () => {
    vi.doMock('@/lib/claude', () => ({ scoreLeadIA: vi.fn() }))
    vi.doMock('@/lib/supabase/server', () => ({
      createServiceClient: () => ({ from: vi.fn() }),
    }))

    const { POST } = await import('@/app/api/v1/leads/ingest/route')
    const req = new NextRequest('http://localhost/api/v1/leads/ingest', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.fr' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    vi.resetModules()
  })
})

describe('POST /api/widget/chat — validation des messages', () => {
  it('retourne 401 si pas de clé API', async () => {
    vi.doMock('@/lib/claude', () => ({ scoreLeadIA: vi.fn() }))
    vi.doMock('@/lib/supabase/server', () => ({
      createServiceClient: () => ({ from: vi.fn() }),
    }))

    const { POST } = await import('@/app/api/widget/chat/route')
    const req = new NextRequest('http://localhost/api/widget/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [], session_id: 'test' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    vi.resetModules()
  })

  it('retourne 400 si messages n\'est pas un tableau', async () => {
    vi.doMock('@/lib/claude', () => ({ scoreLeadIA: vi.fn() }))
    vi.doMock('@/lib/supabase/server', () => ({
      createServiceClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'ws-1', name: 'Test' }, error: null }),
            }),
          }),
        }),
      }),
    }))

    const { POST } = await import('@/app/api/widget/chat/route')
    const req = new NextRequest('http://localhost/api/widget/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: 'pas un tableau', session_id: 'test' }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-key',
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    vi.resetModules()
  })
})

// ─── Tests utilitaires ────────────────────────────────────────────────────────
describe('lib/utils', () => {
  it('formatDate retourne une date française', async () => {
    const { formatDate } = await import('@/lib/utils')
    const result = formatDate('2025-01-15T00:00:00Z')
    expect(result).toMatch(/janv/)
  })

  it('formatCurrency formate en euros', async () => {
    const { formatCurrency } = await import('@/lib/utils')
    const result = formatCurrency(350000)
    expect(result).toContain('350')
    expect(result).toContain('€')
  })

  it('cn merge des classes Tailwind correctement', async () => {
    const { cn } = await import('@/lib/utils')
    expect(cn('px-4', 'px-2')).toBe('px-2')
    expect(cn('bg-red-500', undefined, 'text-white')).toContain('bg-red-500')
    expect(cn('bg-red-500', undefined, 'text-white')).toContain('text-white')
  })
})

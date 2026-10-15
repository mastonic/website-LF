// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  usePathname: () => '/estimation',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { signOut: vi.fn() } }) }))

import { DashboardShell } from '@/components/dashboard/shell'

afterEach(cleanup)

const ws: any = { id: '1', name: 'Agence Test', plan: 'trial', ai_quota_used: 1, ai_quota_limit: 300 }

describe('menu adaptatif', () => {
  it('ouvre et ferme le menu sur téléphone', () => {
    render(<DashboardShell workspace={ws} pendingCount={0}><p>Contenu</p></DashboardShell>)
    const btn = screen.getByRole('button', { name: 'Ouvrir le menu' })
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    const aside = document.getElementById('menu-principal')!
    expect(aside.className).toContain('-translate-x-full')

    fireEvent.click(btn)
    expect(screen.getAllByRole('button', { name: 'Fermer le menu' }).length).toBeGreaterThan(0)
    expect(aside.className).not.toContain('-translate-x-full')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(aside.className).toContain('-translate-x-full')
    expect(screen.getByText('Contenu')).toBeTruthy()
  })

  it('ferme le menu en touchant le fond', () => {
    render(<DashboardShell workspace={ws} pendingCount={0}><p>Contenu</p></DashboardShell>)
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }))
    const overlay = screen.getAllByRole('button', { name: 'Fermer le menu' }).find((b) => b.className.includes('inset-0'))!
    fireEvent.click(overlay)
    expect(document.getElementById('menu-principal')!.className).toContain('-translate-x-full')
  })
})

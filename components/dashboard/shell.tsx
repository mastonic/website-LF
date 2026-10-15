'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Building2, Menu, X } from 'lucide-react'
import { Sidebar } from '@/components/dashboard/sidebar'
import type { Workspace } from '@/types'

export function DashboardShell({
  workspace,
  pendingCount,
  children,
}: {
  workspace: Workspace
  pendingCount: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Referme le menu après chaque navigation
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="flex min-h-screen bg-background">
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 flex h-14 items-center gap-3 border-b bg-white px-4 print:hidden">
        <button
          type="button"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          aria-controls="menu-principal"
          onClick={() => setOpen((o) => !o)}
          className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <Building2 className="h-5 w-5 text-blue-600" />
        <span className="font-bold text-gray-900">ImmoAI</span>
      </header>

      {open && (
        <button
          type="button"
          aria-label="Fermer le menu"
          tabIndex={-1}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden print:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <Sidebar id="menu-principal" workspace={workspace} pendingCount={pendingCount} open={open} />

      <main className="min-w-0 flex-1 overflow-x-hidden pt-14 lg:pt-0 print:pt-0">{children}</main>
    </div>
  )
}

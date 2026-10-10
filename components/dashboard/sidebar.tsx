'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Building2, Home, CheckCircle2, Palette, Layers, Settings, LogOut, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { MVP_AGENTS, V2_AGENTS } from '@/lib/agents'
import { AgentAvatar } from '@/components/agents/AgentAvatar'
import type { Workspace } from '@/types'

interface SidebarProps {
  workspace: Workspace
  pendingCount?: number
}

const linkBase = 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors min-h-[44px]'

export function Sidebar({ workspace, pendingCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const usagePct = Math.min(100, Math.round((workspace.ai_quota_used / workspace.ai_quota_limit) * 100))
  const teamAgents = MVP_AGENTS.filter((a) => a.id !== 'alex')

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-bold text-gray-900">ImmoAI</span>
        </div>
        <div className="mt-3">
          <p className="text-sm font-medium text-gray-900 truncate">{workspace.name}</p>
          <span className="text-xs text-gray-500 capitalize">{workspace.plan}</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Navigation principale">
        <Link href="/dashboard" className={cn(linkBase, pathname === '/dashboard' ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-600 hover:bg-gray-100')}>
          <Home className="h-4 w-4 flex-shrink-0" />
          Mon équipe
        </Link>
        <Link href="/validation" className={cn(linkBase, isActive('/validation') ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-600 hover:bg-gray-100')}>
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          À valider
          {pendingCount > 0 && (
            <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">{pendingCount}</span>
          )}
        </Link>

        <p className="px-3 pt-5 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Vos collaborateurs</p>
        {teamAgents.map((agent) => (
          <Link key={agent.id} href={agent.href} className={cn(linkBase, isActive(agent.href) ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-700 hover:bg-gray-100')}>
            <AgentAvatar agent={agent} size="sm" />
            <span className="min-w-0">
              <span className="block leading-tight">{agent.prenom}</span>
              <span className="block text-xs text-gray-500 leading-tight truncate">{agent.role}</span>
            </span>
          </Link>
        ))}

        <p className="px-3 pt-5 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Outils</p>
        <Link href="/marque" className={cn(linkBase, isActive('/marque') ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-600 hover:bg-gray-100')}>
          <Palette className="h-4 w-4 flex-shrink-0" />
          Ma marque
        </Link>
        <Link href="/studio" className={cn(linkBase, isActive('/studio') ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-600 hover:bg-gray-100')}>
          <Layers className="h-4 w-4 flex-shrink-0" />
          Studio visuel
        </Link>

        <p className="px-3 pt-5 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Bientôt disponibles</p>
        {V2_AGENTS.map((agent) => (
          <Link key={agent.id} href={agent.href} className={cn(linkBase, 'text-gray-400 hover:bg-gray-50')}>
            <AgentAvatar agent={agent} size="sm" muted />
            <span className="min-w-0">
              <span className="block leading-tight">{agent.prenom}</span>
              <span className="block text-xs leading-tight truncate">{agent.role}</span>
            </span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-blue-600" />
          <span className="text-xs text-gray-500">Quota IA</span>
          <span className="text-xs text-gray-700 ml-auto">{workspace.ai_quota_used}/{workspace.ai_quota_limit}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div className={cn('h-1.5 rounded-full transition-all', usagePct > 80 ? 'bg-red-500' : 'bg-blue-600')} style={{ width: `${usagePct}%` }} />
        </div>
      </div>

      <div className="p-4 border-t border-border space-y-1">
        <Link href="/parametres" className={cn(linkBase, 'text-gray-600 hover:bg-gray-100')}>
          <Settings className="h-4 w-4" />
          Paramètres
        </Link>
        <button onClick={handleLogout} className={cn(linkBase, 'w-full text-gray-600 hover:bg-gray-100')}>
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}


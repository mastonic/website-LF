'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2, LayoutDashboard, FileText, Bot, FolderOpen,
  BarChart3, Share2, Users, Settings, LogOut, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Workspace } from '@/types'

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/annonces', label: 'Annonces IA', icon: FileText },
  { href: '/leads', label: 'Leads & Chatbot', icon: Bot },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/estimation', label: 'Estimations', icon: BarChart3 },
  { href: '/social', label: 'Contenu social', icon: Share2 },
  { href: '/crm', label: 'Suivi client', icon: Users },
]

interface SidebarProps {
  workspace: Workspace
}

export function Sidebar({ workspace }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const usagePct = Math.min(100, Math.round((workspace.ai_quota_used / workspace.ai_quota_limit) * 100))

  return (
    <aside className="w-64 min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-blue-400" />
          <span className="text-lg font-bold">ImmoAI</span>
        </div>
        <div className="mt-3">
          <p className="text-sm font-medium text-white truncate">{workspace.name}</p>
          <span className="text-xs text-gray-400 capitalize">{workspace.plan}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Quota IA */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-yellow-400" />
          <span className="text-xs text-gray-400">Quota IA</span>
          <span className="text-xs text-gray-300 ml-auto">{workspace.ai_quota_used}/{workspace.ai_quota_limit}</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-1.5">
          <div
            className={cn('h-1.5 rounded-full transition-all', usagePct > 80 ? 'bg-red-500' : 'bg-blue-500')}
            style={{ width: `${usagePct}%` }}
          />
        </div>
      </div>

      {/* Bottom */}
      <div className="p-4 border-t border-gray-800 space-y-1">
        <Link href="/parametres" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <Settings className="h-4 w-4" />
          Paramètres
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}

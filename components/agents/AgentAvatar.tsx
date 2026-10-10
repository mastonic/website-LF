import { cn } from '@/lib/utils'
import type { Agent } from '@/lib/agents'

/** Pastille ronde avec l'initiale de l'agent (jamais de visage généré). */
export function AgentAvatar({ agent, size = 'md', muted = false }: { agent: Agent; size?: 'sm' | 'md' | 'lg'; muted?: boolean }) {
  const sizes = { sm: 'h-7 w-7 text-xs', md: 'h-10 w-10 text-base', lg: 'h-14 w-14 text-xl' }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex flex-shrink-0 items-center justify-center rounded-full font-semibold',
        sizes[size],
        muted ? 'bg-gray-100 text-gray-400' : agent.tint
      )}
    >
      {agent.prenom.charAt(0)}
    </span>
  )
}

import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ChatInterface from './ChatInterface'
import type { Metadata } from 'next'

interface Props {
  params: { key: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('workspaces')
    .select('name')
    .eq('api_key', params.key)
    .single()

  return {
    title: data ? `${data.name} — Assistant immobilier` : 'Assistant immobilier',
    description: 'Discutez avec notre assistant immobilier pour trouver le bien de vos rêves.',
  }
}

export default async function ChatPage({ params }: Props) {
  const supabase = createServiceClient()
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name, brand_color')
    .eq('api_key', params.key)
    .single()

  if (!workspace) notFound()

  const brandColor = workspace.brand_color ?? '#2563EB'

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 text-white flex-shrink-0"
        style={{ backgroundColor: brandColor }}
      >
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
          {workspace.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">{workspace.name}</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block" />
            <p className="text-xs text-white/80">Assistant disponible</p>
          </div>
        </div>
      </div>

      {/* Chat */}
      <ChatInterface
        apiKey={params.key}
        agencyName={workspace.name}
        brandColor={brandColor}
      />

      {/* Footer */}
      <div className="text-center py-2 text-xs text-gray-300 flex-shrink-0">
        Propulsé par <span className="font-medium text-gray-400">ImmoAI</span>
      </div>
    </div>
  )
}

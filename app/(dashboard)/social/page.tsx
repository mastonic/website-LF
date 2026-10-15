import { getWorkspaceContext } from '@/lib/workspace'
import { SocialClient, type ContenuRow } from '@/components/social/SocialClient'

export const metadata = { title: 'Chloé — Réseaux' }

export default async function SocialPage({ searchParams }: { searchParams: { piste?: string } }) {
  const { supabase, workspaceId } = await getWorkspaceContext()
  const { data } = await supabase
    .from('contenus')
    .select('id, idee, format, plateforme, titre, contenu, statut, publie_le, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Chloé — Contenu réseaux</h1>
      <p className="text-gray-500 text-sm mb-8">
        Une idée, même vague, et Chloé prépare le texte à dire ou à publier, dans votre ton.
      </p>
      <SocialClient initial={(data ?? []) as ContenuRow[]} initialPiste={(searchParams.piste ?? '').slice(0, 600)} />
    </div>
  )
}

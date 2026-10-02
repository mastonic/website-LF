import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Copy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Annonce } from '@/types'

export const metadata = { title: 'Détail annonce' }

const TON_LABELS = { standard: 'Standard', luxe: 'Luxe', familial: 'Familial', investisseur: 'Investisseur' }
const STATUT_COLORS = {
  brouillon: 'bg-gray-100 text-gray-600',
  publie: 'bg-green-100 text-green-700',
  archive: 'bg-orange-100 text-orange-700',
}

export default async function AnnonceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) redirect('/login')

  const { data: annonce, error } = await supabase
    .from('annonces')
    .select('*')
    .eq('id', params.id)
    .eq('workspace_id', member.workspace_id)
    .single()

  if (error || !annonce) notFound()

  const a = annonce as Annonce

  const sections = [
    { label: 'Description complète (SEO)', content: a.description_longue },
    { label: 'Version réseaux sociaux', content: a.description_courte },
    { label: 'Version anglaise', content: a.description_en },
  ]

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/annonces" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{a.titre ?? 'Annonce sans titre'}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUT_COLORS[a.statut]}`}>{a.statut}</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">{TON_LABELS[a.ton]}</span>
            <span className="text-xs text-gray-400">{formatDate(a.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Résumé technique */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Type', value: a.type_bien },
          { label: 'Surface', value: a.surface ? `${a.surface} m²` : '—' },
          { label: 'Pièces', value: a.pieces?.toString() ?? '—' },
          { label: 'Localisation', value: a.localisation ?? '—' },
        ].map(item => (
          <div key={item.label} className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Titre */}
      {a.titre && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center justify-between">
              Titre
              <CopyButtonClient text={a.titre} />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-base font-semibold text-gray-900">{a.titre}</p>
          </CardContent>
        </Card>
      )}

      {/* Sections de texte */}
      <div className="space-y-6">
        {sections.filter(s => s.content).map(s => (
          <Card key={s.label}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center justify-between">
                {s.label}
                <CopyButtonClient text={s.content!} />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Composant client pour le bouton copier
function CopyButtonClient({ text }: { text: string }) {
  return (
    <a
      href={`data:text/plain,${encodeURIComponent(text)}`}
      download="annonce.txt"
      className="text-gray-400 hover:text-gray-600 transition-colors"
      title="Télécharger"
    >
      <Copy className="h-4 w-4" />
    </a>
  )
}

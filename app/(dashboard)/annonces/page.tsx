import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText, Copy, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Annonce } from '@/types'

export const metadata = { title: 'Annonces IA' }

export default async function AnnoncesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  const { data: annonces } = await supabase
    .from('annonces')
    .select('*')
    .eq('workspace_id', member?.workspace_id)
    .order('created_at', { ascending: false })

  const list = (annonces ?? []) as Annonce[]

  const tonLabels = { standard: 'Standard', luxe: 'Luxe', familial: 'Familial', investisseur: 'Investisseur' }
  const statutVariant = { brouillon: 'secondary' as const, publie: 'success' as const, archive: 'outline' as const }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Annonces IA</h1>
          <p className="text-gray-500 text-sm mt-1">{list.length} annonce{list.length > 1 ? 's' : ''} créée{list.length > 1 ? 's' : ''}</p>
        </div>
        <Link href="/annonces/nouvelle"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Nouvelle annonce
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-24">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Aucune annonce encore</h2>
          <p className="text-gray-500 text-sm mb-6">Générez votre première annonce immobilière avec l'IA Claude</p>
          <Link href="/annonces/nouvelle"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" />
            Créer ma première annonce
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {list.map((a) => (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={statutVariant[a.statut]}>{a.statut}</Badge>
                      <Badge variant="info">{tonLabels[a.ton]}</Badge>
                      <span className="text-xs text-gray-400">{formatDate(a.created_at)}</span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">
                      {a.titre ?? `${a.type_bien}${a.surface ? ` — ${a.surface}m²` : ''}`}
                    </h3>
                    {a.description_longue && (
                      <p className="text-sm text-gray-600 line-clamp-2">{a.description_longue}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                      <span>{a.type_bien}</span>
                      {a.surface && <span>{a.surface} m²</span>}
                      {a.pieces && <span>{a.pieces} pièces</span>}
                      {a.localisation && <span>{a.localisation}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/annonces/${a.id}`}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Voir">
                      <FileText className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

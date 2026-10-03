import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Globe, Archive, RotateCcw, ImageIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { revalidatePath } from 'next/cache'
import { formatDate } from '@/lib/utils'
import CopyButton from '@/components/CopyButton'
import PhotoUploader from '@/components/PhotoUploader'
import type { Annonce, Plan } from '@/types'

export const metadata = { title: 'Détail annonce' }

const TON_LABELS = { standard: 'Standard', luxe: 'Luxe', familial: 'Familial', investisseur: 'Investisseur' }
const STATUT_COLORS: Record<string, string> = {
  brouillon: 'bg-gray-100 text-gray-600',
  publie: 'bg-green-100 text-green-700',
  archive: 'bg-orange-100 text-orange-700',
}

const PHOTO_LIMITS: Record<Plan, number> = {
  trial: 4,
  starter: 4,
  pro: 20,
  agence: 99,
}

async function changeStatut(annonceId: string, workspaceId: string, statut: string) {
  'use server'
  const supabase = createClient()
  await supabase
    .from('annonces')
    .update({ statut })
    .eq('id', annonceId)
    .eq('workspace_id', workspaceId)
  revalidatePath(`/annonces/${annonceId}`)
  revalidatePath('/annonces')
}

function formatForPortal(portal: string, titre: string | null, desc: string | null): string {
  if (!titre && !desc) return ''
  const t = titre ?? ''
  const d = desc ?? ''
  switch (portal) {
    case 'seloger': return `${t.slice(0, 130)}\n\n${d.slice(0, 3000)}`
    case 'leboncoin': return `${t.slice(0, 60)}\n\n${d.slice(0, 4000)}`
    case 'pap': return `${t}\n\n${d.slice(0, 2000)}`
    case 'bienici': return `${t}\n\n${d.slice(0, 5000)}`
    default: return `${t}\n\n${d}`
  }
}

export default async function AnnonceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) redirect('/login')

  const [{ data: annonce, error }, { data: workspace }] = await Promise.all([
    supabase.from('annonces').select('*').eq('id', params.id).eq('workspace_id', member.workspace_id).single(),
    supabase.from('workspaces').select('plan').eq('id', member.workspace_id).single(),
  ])

  if (error || !annonce) notFound()

  const a = annonce as Annonce
  const plan = (workspace?.plan ?? 'trial') as Plan
  const workspaceId = member.workspace_id
  const photoLimit = PHOTO_LIMITS[plan]

  const publishAction = changeStatut.bind(null, a.id, workspaceId, 'publie')
  const archiveAction = changeStatut.bind(null, a.id, workspaceId, 'archive')
  const brouillonAction = changeStatut.bind(null, a.id, workspaceId, 'brouillon')

  const textSections = [
    { label: 'Description complète (SEO)', content: a.description_longue },
    { label: 'Version réseaux sociaux', content: a.description_courte },
    { label: 'Version anglaise', content: a.description_en },
  ]

  const portals = [
    { key: 'seloger', label: 'SeLoger', info: 'Titre 130 car. · Desc 3 000 car.' },
    { key: 'leboncoin', label: 'Leboncoin', info: 'Titre 60 car. · Desc 4 000 car.' },
    { key: 'pap', label: 'PAP.fr', info: 'Titre libre · Desc 2 000 car.' },
    { key: 'bienici', label: 'Bien ici', info: 'Titre libre · Desc 5 000 car.' },
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

        <div className="flex gap-2 flex-shrink-0">
          {a.statut !== 'publie' && (
            <form action={publishAction}>
              <button type="submit" className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
                <Globe className="h-3.5 w-3.5" />
                Publier
              </button>
            </form>
          )}
          {a.statut === 'publie' && (
            <form action={archiveAction}>
              <button type="submit" className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
                <Archive className="h-3.5 w-3.5" />
                Archiver
              </button>
            </form>
          )}
          {a.statut === 'archive' && (
            <form action={brouillonAction}>
              <button type="submit" className="flex items-center gap-1.5 bg-gray-500 hover:bg-gray-600 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
                <RotateCcw className="h-3.5 w-3.5" />
                Remettre en brouillon
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Résumé technique */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Type', value: a.type_bien },
          { label: 'Surface', value: a.surface ? `${a.surface} m²` : '—' },
          { label: 'Pièces', value: a.pieces?.toString() ?? '—' },
          { label: 'Localisation', value: a.localisation ?? '—' },
          ...(a.prix ? [{ label: 'Prix', value: `${a.prix.toLocaleString('fr-FR')} €` }] : []),
          ...(a.reference_mandat ? [{ label: 'Réf. mandat', value: a.reference_mandat }] : []),
        ].map(item => (
          <div key={item.label} className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Photos */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Photos du bien
            <span className="ml-auto text-xs font-normal text-gray-400 normal-case tracking-normal">
              {(a.photos ?? []).length}/{photoLimit} · plan {plan}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <PhotoUploader annonceId={a.id} initialPhotos={a.photos ?? []} photoLimit={photoLimit} />
        </CardContent>
      </Card>

      {/* Titre */}
      {a.titre && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center justify-between">
              Titre
              <CopyButton text={a.titre} />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-base font-semibold text-gray-900">{a.titre}</p>
          </CardContent>
        </Card>
      )}

      {/* Sections de texte */}
      <div className="space-y-6 mb-8">
        {textSections.filter(s => s.content).map(s => (
          <Card key={s.label}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center justify-between">
                {s.label}
                <CopyButton text={s.content!} />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Diffusion portails */}
      {(a.titre || a.description_longue) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Diffuser sur les portails
            </CardTitle>
            <p className="text-xs text-gray-400 mt-1">
              Copiez le texte formaté pour chaque portail, puis collez-le dans leur interface de dépôt d&apos;annonce.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {portals.map(p => (
                <div key={p.key} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{p.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.info}</p>
                  </div>
                  <CopyButton text={formatForPortal(p.key, a.titre, a.description_longue)} label="Copier" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

import { Share2 } from 'lucide-react'
export const metadata = { title: 'Contenu social' }
export default function SocialPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Contenu social</h1>
      <p className="text-gray-500 text-sm mb-8">Posts Instagram, Facebook, stories, newsletters générés en 1 clic</p>
      <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-xl">
        <Share2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Module 5 — Prochainement</h2>
        <p className="text-gray-500 text-sm">Calendrier éditorial + génération de contenu multi-canal</p>
      </div>
    </div>
  )
}

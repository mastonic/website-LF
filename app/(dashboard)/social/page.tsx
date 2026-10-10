import { Share2 } from 'lucide-react'
export const metadata = { title: 'Contenu social' }
export default function SocialPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Chloé — Contenu réseaux sociaux</h1>
      <p className="text-gray-600 text-sm mb-8">Chloé rejoindra votre équipe dans une prochaine version.</p>
      <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-xl">
        <Share2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Chloé — Bientôt disponible</h2>
        <p className="text-gray-500 text-sm">Publications Instagram et Facebook, stories et calendrier éditorial</p>
      </div>
    </div>
  )
}

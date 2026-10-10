import { FolderOpen } from 'lucide-react'
export const metadata = { title: 'Documents' }
export default function DocumentsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Hugo — Administratif</h1>
      <p className="text-gray-600 text-sm mb-8">Hugo rejoindra votre équipe dans une prochaine version.</p>
      <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-xl">
        <FolderOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Hugo — Bientôt disponible</h2>
        <p className="text-gray-500 text-sm">Résumé automatique de PDF, extraction DPE, détection des pièces manquantes</p>
      </div>
    </div>
  )
}

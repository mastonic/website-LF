import { BarChart3 } from 'lucide-react'
export const metadata = { title: 'Estimations' }
export default function EstimationPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Thomas — Estimation complète</h1>
      <p className="text-gray-600 text-sm mb-8">Thomas rejoindra votre équipe dans une prochaine version.</p>
      <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-xl">
        <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Thomas — Bientôt disponible</h2>
        <p className="text-gray-500 text-sm">Analyse de marché et fourchette de prix argumentée, avec rapport PDF exportable</p>
      </div>
    </div>
  )
}

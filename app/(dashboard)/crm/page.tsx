import { Users } from 'lucide-react'
export const metadata = { title: 'Suivi client' }
export default function CrmPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Suivi client</h1>
      <p className="text-gray-500 text-sm mb-8">CRM léger avec pipeline, rappels intelligents et compte-rendus</p>
      <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-xl">
        <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Module 6 — Prochainement</h2>
        <p className="text-gray-500 text-sm">Pipeline acheteurs/vendeurs, relances IA, comptes-rendus dictés</p>
      </div>
    </div>
  )
}

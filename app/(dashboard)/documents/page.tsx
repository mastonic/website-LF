import { FolderOpen } from 'lucide-react'
export const metadata = { title: 'Documents' }
export default function DocumentsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Documents</h1>
      <p className="text-gray-500 text-sm mb-8">Upload et analyse de PDF (dossiers, diagnostics, compromis)</p>
      <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-xl">
        <FolderOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Module 3 — Prochainement</h2>
        <p className="text-gray-500 text-sm">Résumé automatique de PDF, extraction DPE, génération de mandats</p>
      </div>
    </div>
  )
}

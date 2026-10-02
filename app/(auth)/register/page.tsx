'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', workspace_name: '', nom: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 8) { setError('Mot de passe minimum 8 caractères.'); return }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { workspace_name: form.workspace_name, nom: form.nom },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/dashboard') }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-8 w-full max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Créer votre espace</h1>
      <p className="text-gray-500 text-sm mb-6">7 jours gratuits, sans carte bancaire</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom de votre agence</label>
          <input
            type="text" required value={form.workspace_name} onChange={e => update('workspace_name', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Agence Dupont Immobilier"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Votre nom</label>
          <input
            type="text" required value={form.nom} onChange={e => update('nom', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Jean Dupont"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email professionnel</label>
          <input
            type="email" required value={form.email} onChange={e => update('email', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="jean@agence.fr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
          <input
            type="password" required value={form.password} onChange={e => update('password', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Min. 8 caractères"
          />
        </div>

        {error && (
          <div className="text-sm p-3 rounded-lg bg-red-50 text-red-700">{error}</div>
        )}

        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
          {loading ? 'Création...' : 'Créer mon espace gratuit'}
        </button>
      </form>

      <p className="text-center text-xs text-gray-400 mt-4">
        En vous inscrivant, vous acceptez nos conditions d'utilisation.
      </p>
      <p className="text-center text-sm text-gray-500 mt-4">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-blue-600 hover:underline font-medium">Se connecter</Link>
      </p>
    </div>
  )
}

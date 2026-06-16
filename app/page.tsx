import Link from 'next/link'
import { Building2, Bot, FileText, BarChart3, Share2, Users, ArrowRight, Check } from 'lucide-react'

const features = [
  { icon: FileText, title: 'Générateur d\'annonces IA', desc: 'Créez des annonces SEO optimisées en 30 secondes, dans 4 tons différents.' },
  { icon: Bot, title: 'Chatbot qualificateur', desc: 'Widget embeddable qui capture et score vos leads 24h/24.' },
  { icon: FileText, title: 'Assistant administratif', desc: 'Résumez vos PDF, extrayez les données clés, générez vos mandats.' },
  { icon: BarChart3, title: 'Estimateur de prix IA', desc: 'Rapports d\'estimation pro avec comparables et argumentaire vendeur.' },
  { icon: Share2, title: 'Contenu social', desc: 'Posts Instagram, Facebook, newsletters — générés en 1 clic.' },
  { icon: Users, title: 'Suivi client CRM', desc: 'Pipeline, rappels intelligents, compte-rendus de visite dictés.' },
]

const plans = [
  { name: 'Starter', price: '29', users: '1 utilisateur', annonces: '20 annonces IA/mois', features: ['Générateur d\'annonces', 'Chatbot widget', 'Essai 7 jours gratuit'] },
  { name: 'Pro', price: '59', users: '3 utilisateurs', annonces: 'Illimité', features: ['Tous les modules', 'Assistant documents', 'Estimateur prix', 'Essai 7 jours gratuit'], highlight: true },
  { name: 'Agence', price: '149', users: '10 utilisateurs', annonces: 'Illimité', features: ['API & widget custom', 'Branding agence', 'Support prioritaire', 'Essai 7 jours gratuit'] },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Building2 className="h-7 w-7 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">ImmoAI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Connexion</Link>
          <Link href="/register" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Essai gratuit 7 jours
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm px-4 py-2 rounded-full mb-6">
          <Bot className="h-4 w-4" />
          Propulsé par Claude IA (Anthropic)
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Le copilote IA des<br />agents immobiliers
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Annonces, leads, documents, estimations — ImmoAI automatise vos tâches
          chronophages pour que vous vous consacriez à vos clients.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register" className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
            Démarrer gratuitement <ArrowRight className="h-5 w-5" />
          </Link>
          <Link href="#fonctionnalites" className="text-gray-600 px-8 py-3 rounded-lg text-lg hover:text-gray-900 transition-colors">
            Voir les fonctionnalités
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="fonctionnalites" className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">6 modules pour votre activité</h2>
          <p className="text-gray-600 text-center mb-16">Tout ce dont un agent immobilier a besoin, en un seul outil.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Tarifs simples et transparents</h2>
          <p className="text-gray-600 text-center mb-16">7 jours d'essai gratuit, sans carte bancaire.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div key={plan.name} className={`rounded-xl p-8 border-2 ${plan.highlight ? 'border-blue-600 shadow-lg relative' : 'border-gray-200'}`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                    Plus populaire
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}€</span>
                  <span className="text-gray-500">/mois</span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{plan.users}</p>
                <p className="text-sm text-gray-600 mb-6">{plan.annonces}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className={`block w-full text-center py-3 rounded-lg font-medium transition-colors ${plan.highlight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
                  Commencer l'essai
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-gray-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-blue-600" />
          <span className="font-semibold text-gray-700">ImmoAI</span>
        </div>
        <p>© 2025 ImmoAI. Tous droits réservés.</p>
      </footer>
    </div>
  )
}

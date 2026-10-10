// Équipe d'agents ImmoAI — prénoms et rôles définis dans le PRD design.
// Les prénoms sont des propositions modifiables ; ils sont centralisés ici.

export type AgentId =
  | 'alex' | 'victor' | 'sophie' | 'julien' | 'emma'
  | 'hugo' | 'thomas' | 'chloe'

export type AgentVersion = 'mvp' | 'v2'

export interface Agent {
  id: AgentId
  prenom: string
  role: string
  presentation: string
  autonomie: string
  version: AgentVersion
  href: string
  /** Classes Tailwind de la pastille (teinte douce, jamais plus saturée que l'accent) */
  tint: string
}

export const AGENTS: Agent[] = [
  {
    id: 'alex', prenom: 'Alex', role: 'Chef d’équipe',
    presentation: 'Dites-moi ce dont vous avez besoin, je m’occupe de le confier à la bonne personne.',
    autonomie: 'Route seul, valide toute action sortante',
    version: 'mvp', href: '/dashboard', tint: 'bg-stone-200 text-stone-800',
  },
  {
    id: 'victor', prenom: 'Victor', role: 'Prospection vendeurs',
    presentation: 'Je vous amène des propriétaires qui veulent vendre.',
    autonomie: 'Propose, vous validez',
    version: 'mvp', href: '/vendeurs', tint: 'bg-amber-100 text-amber-900',
  },
  {
    id: 'sophie', prenom: 'Sophie', role: 'Qualification des contacts',
    presentation: 'Je réponds aux visiteurs et je trie les vrais projets.',
    autonomie: 'Autonome dans son cadre, transfert si doute',
    version: 'mvp', href: '/leads', tint: 'bg-rose-100 text-rose-900',
  },
  {
    id: 'julien', prenom: 'Julien', role: 'Annonces',
    presentation: 'Je rédige vos annonces, vous les relisez.',
    autonomie: 'Validation avant publication',
    version: 'mvp', href: '/annonces', tint: 'bg-sky-100 text-sky-900',
  },
  {
    id: 'emma', prenom: 'Emma', role: 'Suivi client',
    presentation: 'Je n’oublie aucune relance.',
    autonomie: 'Propose, vous envoyez',
    version: 'mvp', href: '/crm', tint: 'bg-emerald-100 text-emerald-900',
  },
  {
    id: 'hugo', prenom: 'Hugo', role: 'Administratif',
    presentation: 'Je lis vos dossiers et je repère les pièces manquantes.',
    autonomie: 'Validation avant envoi',
    version: 'v2', href: '/documents', tint: 'bg-slate-100 text-slate-700',
  },
  {
    id: 'thomas', prenom: 'Thomas', role: 'Estimation complète',
    presentation: 'Je vous donne une fourchette de prix argumentée.',
    autonomie: 'Indicatif seulement',
    version: 'v2', href: '/estimation', tint: 'bg-orange-100 text-orange-900',
  },
  {
    id: 'chloe', prenom: 'Chloé', role: 'Contenu réseaux sociaux',
    presentation: 'Je prépare vos publications.',
    autonomie: 'Validation avant publication',
    version: 'v2', href: '/social', tint: 'bg-violet-100 text-violet-900',
  },
]

export const getAgent = (id: AgentId): Agent => AGENTS.find((a) => a.id === id)!
export const MVP_AGENTS = AGENTS.filter((a) => a.version === 'mvp')
export const V2_AGENTS = AGENTS.filter((a) => a.version === 'v2')

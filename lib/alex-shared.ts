// Partie d'Alex utilisable dans le navigateur : aucune dépendance serveur.
import { getAgent, type AgentId } from '@/lib/agents'

export interface AlexRoute {
  /** Collaborateur choisi. « alex » = Alex pose une question avant d'orienter. */
  agent: AgentId
  reponse: string
  /** Idée à pré-remplir chez Chloé. */
  prefill?: string
}

export interface AlexTurn {
  role: 'vous' | 'alex'
  texte: string
  route?: AlexRoute
}

/** Lien d'ouverture du collaborateur, avec pré-remplissage éventuel. */
export function alexHref(route: AlexRoute): string {
  const base = getAgent(route.agent).href
  if (route.agent === 'chloe' && route.prefill) return `${base}?piste=${encodeURIComponent(route.prefill.slice(0, 600))}`
  return base
}

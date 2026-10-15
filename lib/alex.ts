import { claudeJSON } from '@/lib/claude'
import { AGENTS, type AgentId } from '@/lib/agents'
import type { AlexRoute } from '@/lib/alex-shared'

export * from '@/lib/alex-shared'

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Mots qui désignent chaque collaborateur, par ordre de priorité en cas d'égalité. */
const MOTS: [AgentId, RegExp][] = [
  ['thomas', /estim|combien vaut|vaut|valeur|prix (du|de mon|de ce) bien|comparable|avis de valeur|dvf|fourchette/g],
  ['julien', /annonce|redige|descriptif|texte de vente|seloger|leboncoin|titre d/g],
  ['chloe', /reseau|instagram|facebook|tiktok|linkedin|publication|publier|post\b|video|script|contenu|idee/g],
  ['emma', /relanc|rappeler|suivi|rendez-vous|\brdv\b|recontacter|pipeline|crm|compte-rendu/g],
  ['sophie', /\blead|demandes? entrantes?|contacts? entrants?|visiteur|chatbot|nouveaux? contacts?|qualif|site web|formulaire/g],
  ['victor', /vendeur|mandat|prospect|proprietaire|boitage|pige|porte-a-porte/g],
  ['hugo', /document|\bpdf\b|diagnostic|compromis|copropriete|pieces manquantes|dossier de vente/g],
]

const REPONSES: Record<Exclude<AgentId, 'alex'>, string> = {
  thomas: 'C’est pour Thomas : il retrouve les ventes réelles autour du bien et prépare le dossier chiffré, avec les travaux.',
  julien: 'C’est pour Julien : il rédige l’annonce, vous la relisez avant publication.',
  chloe: 'C’est pour Chloé : elle transforme votre idée en texte à dire ou à publier.',
  emma: 'C’est pour Emma : elle suit vos contacts et repère les relances en retard.',
  sophie: 'C’est pour Sophie : elle trie les demandes entrantes et signale les vrais projets.',
  victor: 'C’est pour Victor : il vous aide à trouver des propriétaires qui veulent vendre.',
  hugo: 'Ce serait pour Hugo, qui lira vos dossiers et repérera les pièces manquantes. Il n’est pas encore disponible.',
}

/** Orientation sans modèle : sert de repli et fonctionne hors ligne. */
export function routeByRules(message: string): AlexRoute {
  const text = normalize(message)
  let best: { agent: AgentId; score: number } | null = null
  for (const [agent, re] of MOTS) {
    const score = (text.match(re) ?? []).length
    if (score > 0 && (!best || score > best.score)) best = { agent, score }
  }
  if (!best) {
    return {
      agent: 'alex',
      reponse:
        'Dites-m’en un peu plus : s’agit-il d’une estimation, d’une annonce, d’une publication pour vos réseaux, du suivi d’un client ou de la recherche de vendeurs ?',
    }
  }
  const agent = best.agent as Exclude<AgentId, 'alex'>
  return { agent, reponse: REPONSES[agent], prefill: agent === 'chloe' ? message.trim().slice(0, 600) : undefined }
}

const SYSTEM = `Tu es Alex, chef d'équipe d'un agent immobilier indépendant en France. Ton seul rôle : comprendre ce dont il a besoin et l'orienter vers le bon collaborateur. Tu ne fais pas le travail toi-même.

Collaborateurs :
${AGENTS.filter((a) => a.id !== 'alex')
  .map((a) => `- ${a.id} (${a.prenom}) : ${a.role}. ${a.presentation}${a.version === 'v2' ? ' [PAS ENCORE DISPONIBLE]' : ''}`)
  .join('\n')}

Règles :
- Choisis UN collaborateur. Si la demande est trop floue pour choisir, réponds avec agent "alex" et pose UNE seule question courte.
- Si le bon collaborateur n'est pas encore disponible, dis-le simplement et propose le plus proche.
- Réponse : 1 à 2 phrases, vouvoiement, ton posé, sans jargon. Dis pourquoi ce collaborateur.
- Pour "chloe" uniquement, "prefill" reprend l'idée de l'agent en une ou deux phrases, avec ses mots. Sinon laisse "prefill" vide.
- Tu n'inventes aucune donnée et tu ne promets aucun résultat.
- Tu ne mentionnes jamais d'intelligence artificielle, d'outil automatique ni d'algorithme.
- Réponds UNIQUEMENT en JSON valide : {"agent":"thomas|julien|chloe|emma|sophie|victor|hugo|alex","reponse":"...","prefill":"..."}`

export function sanitizeRoute(raw: Partial<AlexRoute> | null | undefined): AlexRoute | null {
  if (!raw || typeof raw.reponse !== 'string' || !raw.reponse.trim()) return null
  const ids = AGENTS.map((a) => a.id) as string[]
  if (typeof raw.agent !== 'string' || !ids.includes(raw.agent)) return null
  const agent = raw.agent as AgentId
  const prefill = agent === 'chloe' && typeof raw.prefill === 'string' && raw.prefill.trim() ? raw.prefill.trim().slice(0, 600) : undefined
  return { agent, reponse: raw.reponse.trim().slice(0, 600), prefill }
}

/** Oriente la demande : Claude d'abord, règles simples en repli. */
export async function routeRequest(
  message: string,
  history: { role: 'vous' | 'alex'; texte: string }[] = []
): Promise<{ route: AlexRoute; via: 'claude' | 'regles' }> {
  const contexte = history
    .slice(-6)
    .map((t) => `${t.role === 'vous' ? 'Agent' : 'Alex'} : ${t.texte}`)
    .join('\n')
  try {
    const { data } = await claudeJSON<Partial<AlexRoute>>(
      SYSTEM,
      `${contexte ? `Échange en cours :\n${contexte}\n\n` : ''}Nouveau message de l'agent : « ${message} »`,
      400
    )
    const route = sanitizeRoute(data)
    if (route) return { route, via: 'claude' }
  } catch {
    /* repli ci-dessous */
  }
  return { route: routeByRules(message), via: 'regles' }
}

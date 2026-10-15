import { claudeJSON, extractJSON } from '@/lib/claude'

export * from '@/lib/contenu-shared'
import type {
  ContenuGenere,
  FormatContenu,
  IdeeContenu,
  MarqueContexte,
  Plateforme,
  PublicationTexte,
  ScriptVideo,
} from '@/lib/contenu-shared'
import { PLATEFORMES } from '@/lib/contenu-shared'

// ─── Fournisseur de rédaction ────────────────────────────────────────────────
// Scripts : OpenAI si OPENAI_API_KEY est défini, sinon (ou en cas d'échec) Claude.

async function openaiJSON<T>(system: string, user: string): Promise<{ data: T; tokens: number }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.8,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}`)
  const json = await res.json()
  const text: string = json.choices?.[0]?.message?.content ?? ''
  return { data: extractJSON(text) as T, tokens: json.usage?.total_tokens ?? 0 }
}

async function redactionJSON<T>(
  system: string,
  user: string
): Promise<{ data: T; tokens: number; fournisseur: 'openai' | 'anthropic' }> {
  if (process.env.OPENAI_API_KEY) {
    try {
      const r = await openaiJSON<T>(system, user)
      return { ...r, fournisseur: 'openai' }
    } catch {
      // repli sur Claude ci-dessous
    }
  }
  const r = await claudeJSON<T>(system, user, 2200)
  return { ...r, fournisseur: 'anthropic' }
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

function systemBase(marque: MarqueContexte): string {
  return `Tu écris des contenus pour les réseaux sociaux d'un(e) agent immobilier indépendant(e) en France${marque.secteur ? `, secteur : ${marque.secteur}` : ''}.

SA VOIX
- ${marque.nom ? `Nom affiché : ${marque.nom}. ` : ''}${marque.signature ? `Signature : ${marque.signature}. ` : ''}${marque.charte ? `Ligne éditoriale : ${marque.charte}. ` : ''}
- Elle veut des contenus qui lui ressemblent : naturels, posés, sincères, élégants, jamais racoleurs. Elle parle comme à une voisine ou un client de confiance, pas comme une publicité. Vouvoiement du public.
- Phrases courtes, mots simples, zéro jargon ni anglicisme inutile.

RÈGLES
- Tu n'inventes ni chiffres, ni statistiques, ni anecdotes présentées comme vécues. Si l'idée donnée par l'agent contient une situation vécue, tu t'appuies dessus ; sinon tu restes sur du conseil général vrai et vérifiable.
- Aucun client identifiable, aucune adresse précise d'un bien, aucun prix d'un bien réel sans que l'agent l'ait donné dans son idée.
- Aucune promesse (« vendez en 10 jours », « garanti »), aucune pression, aucune critique de confrères ou d'agences.
- Tu ne mentionnes jamais d'intelligence artificielle, d'outil automatique ni d'algorithme.
- Réponds UNIQUEMENT en JSON valide, sans markdown.`
}

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const cleanList = (v: unknown, max = 12) =>
  Array.isArray(v) ? v.map(clean).filter(Boolean).slice(0, max) : []

// ─── Idées ───────────────────────────────────────────────────────────────────

export async function generateIdees(
  marque: MarqueContexte,
  piste?: string
): Promise<{ idees: IdeeContenu[]; tokens: number; fournisseur: string }> {
  const user = `${
    piste
      ? `L'agent a une piste, même vague : « ${piste} ». Propose 5 idées de contenus qui partent de cette piste, avec des angles différents.`
      : `L'agent n'a pas d'idée. Propose 5 idées de contenus variées, tirées de son quotidien de métier : une situation de rendez-vous d'estimation (sans identifier personne), une erreur fréquente de vendeur, une question qu'un client pose souvent, un conseil de saison, un regard sur un quartier ou sur le métier.`
  }
Chaque idée doit pouvoir être tournée ou écrite en moins de 45 secondes / 120 mots, sans matériel particulier.

Retourne ce JSON exact :
{"idees": [{"titre": "titre court", "angle": "en une phrase : ce que le public retient", "format": "video ou texte"}]}`

  const r = await redactionJSON<{ idees: Partial<IdeeContenu>[] }>(systemBase(marque), user)
  const idees = (Array.isArray(r.data.idees) ? r.data.idees : [])
    .map((i) => ({
      titre: clean(i.titre),
      angle: clean(i.angle),
      format: (i.format === 'texte' ? 'texte' : 'video') as FormatContenu,
    }))
    .filter((i) => i.titre)
    .slice(0, 6)
  if (idees.length === 0) throw new Error('Aucune idée générée')
  return { idees, tokens: r.tokens, fournisseur: r.fournisseur }
}

// ─── Script / publication ────────────────────────────────────────────────────

export async function generateContenu(
  marque: MarqueContexte,
  idee: string,
  format: FormatContenu,
  plateforme: Plateforme
): Promise<{ contenu: ContenuGenere; tokens: number; fournisseur: string }> {
  if (format === 'video') {
    const user = `Idée de l'agent : « ${idee} »
Plateforme : ${PLATEFORMES[plateforme]}.

Écris le script d'une vidéo courte à tourner face caméra, d'environ 45 secondes au total (environ 110 mots à dire). Le texte « a_dire » est exactement ce qu'elle prononce, à l'oral, naturel, sans didactisme.

Retourne ce JSON exact :
{
  "titre": "titre interne court",
  "accroche": "la première phrase, qui donne envie de rester (moins de 3 secondes)",
  "sequences": [{"duree_s": 5, "a_dire": "…"}],
  "legende": "légende à publier sous la vidéo, 2 à 3 phrases",
  "hashtags": ["5 à 8 hashtags, sans #"],
  "appel_action": "une seule invitation douce, par exemple poser une question en message privé",
  "preparation": ["2 à 4 conseils pratiques : lieu, lumière, durée, point à ne pas oublier"]
}
La première séquence reprend l'accroche. 4 à 6 séquences.`
    const r = await redactionJSON<Partial<ScriptVideo>>(systemBase(marque), user)
    const sequences = (Array.isArray(r.data.sequences) ? r.data.sequences : [])
      .map((s) => ({ duree_s: Math.max(2, Math.min(20, Math.round(Number(s?.duree_s) || 6))), a_dire: clean(s?.a_dire) }))
      .filter((s) => s.a_dire)
    if (sequences.length === 0) throw new Error('Script vide')
    return {
      contenu: {
        format: 'video',
        titre: clean(r.data.titre) || idee.slice(0, 60),
        accroche: clean(r.data.accroche) || sequences[0].a_dire,
        sequences,
        legende: clean(r.data.legende),
        hashtags: cleanList(r.data.hashtags, 10).map((h) => h.replace(/^#/, '')),
        appel_action: clean(r.data.appel_action),
        preparation: cleanList(r.data.preparation, 5),
      },
      tokens: r.tokens,
      fournisseur: r.fournisseur,
    }
  }

  const user = `Idée de l'agent : « ${idee} »
Plateforme : ${PLATEFORMES[plateforme]}.

Écris une publication ${plateforme === 'linkedin' ? 'professionnelle mais humaine' : 'simple et chaleureuse'} de 80 à 140 mots, avec une première phrase qui donne envie de lire la suite, et une seule invitation douce à la fin.

Retourne ce JSON exact :
{"titre": "titre interne court", "texte": "la publication, avec des retours à la ligne \\n", "hashtags": ["3 à 6 hashtags, sans #"]}`
  const r = await redactionJSON<Partial<PublicationTexte>>(systemBase(marque), user)
  const texte = clean(r.data.texte)
  if (!texte) throw new Error('Publication vide')
  return {
    contenu: {
      format: 'texte',
      titre: clean(r.data.titre) || idee.slice(0, 60),
      texte,
      hashtags: cleanList(r.data.hashtags, 8).map((h) => h.replace(/^#/, '')),
    },
    tokens: r.tokens,
    fournisseur: r.fournisseur,
  }
}

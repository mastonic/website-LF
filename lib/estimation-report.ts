import { claudeJSON } from '@/lib/claude'
import type { EstimationResult } from '@/lib/dvf'
import type { Ajustement, PosteTravaux, ScenariosResult } from '@/lib/estimation'

export interface RapportSection {
  titre: string
  texte: string
}

export interface RapportEstimation {
  resume: string
  sections: RapportSection[]
  /** Phrases que l'agent peut dire au vendeur, courtes et factuelles. */
  argumentaire: string[]
  /** Points de vigilance : limites des données, éléments à vérifier sur place. */
  vigilance: string[]
}

export interface ReportInput {
  adresse: string
  typeBien: string
  surface: number
  pieces?: number | null
  etat?: string | null
  anneeConstruction?: number | null
  equipements?: string[] | null
  notes?: string | null
  dvf: EstimationResult
  travaux: PosteTravaux[]
  ajustements: Ajustement[]
  scenarios: ScenariosResult
  agentNom?: string | null
}

const eur = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`

const SYSTEM = `Tu rédiges, pour un agent immobilier indépendant français, le compte rendu d'une estimation qu'il présentera à un propriétaire.

RÈGLES ABSOLUES
- Tu n'inventes AUCUN chiffre. Tu n'utilises que les chiffres fournis dans les données. Si une donnée manque, tu le dis.
- Tu ne fais pas de promesse de prix ni de délai de vente.
- Les ventes officielles (DVF) ne disent rien de l'état des biens vendus : tu le rappelles dans la méthode et tu expliques que les travaux sont déduits poste par poste d'après la visite de l'agent.
- Si un autre avis de valeur est fourni, tu te contentes de situer le prix par rapport aux ventes réelles. Tu ne critiques ni l'agence ni le vendeur. Tu ne conseilles jamais de surévaluer pour obtenir le mandat : tu expliques ce qu'un prix trop haut coûte au vendeur (temps de vente plus long, négociation plus forte) sans chiffrer ce que tu ne peux pas chiffrer.
- Ton : clair, posé, factuel, en français, vouvoiement du propriétaire, phrases courtes, pas de jargon ni d'anglicismes, pas d'emphase.
- Tu ne mentionnes jamais d'intelligence artificielle, d'outil automatique ni d'algorithme.
- Réponds UNIQUEMENT en JSON valide, sans markdown.`

export function buildReportPrompt(i: ReportInput): string {
  const d = i.dvf
  const lignesTravaux = i.travaux.length
    ? i.travaux.map((t) => `- ${t.label} : ${eur(t.montant)}${t.note ? ` (${t.note})` : ''}`).join('\n')
    : '- Aucun travaux saisi'
  const lignesAdj = i.ajustements.length
    ? i.ajustements
        .map((a) => `- ${a.label} : ${a.type === 'pct' ? `${a.valeur > 0 ? '+' : ''}${a.valeur} %` : `${a.valeur > 0 ? '+' : ''}${eur(a.valeur)}`}`)
        .join('\n')
    : '- Aucun ajustement'
  const comparables = d.comparables
    .map(
      (c) =>
        `- ${c.date} · ${c.voie || 'adresse non précisée'} · ${c.surface} m² · ${eur(c.prix)} · ${Math.round(c.prixM2).toLocaleString('fr-FR')} €/m² · à ${Math.round(c.distanceM)} m`
    )
    .join('\n')
  const tendance = d.parAnnee
    .map((a) => `- ${a.annee} : ${a.prixM2Median.toLocaleString('fr-FR')} €/m² (${a.nbVentes} vente${a.nbVentes > 1 ? 's' : ''})`)
    .join('\n')
  const sc = i.scenarios.scenarios
    .map((s) => `- ${s.titre} : référence ${eur(s.reference)} − travaux = ${eur(s.prixEnEtat)} (${s.prixM2.toLocaleString('fr-FR')} €/m²)`)
    .join('\n')
  const ac = i.scenarios.avisConcurrent
  const concurrent = ac
    ? `Un autre avis de valeur reçu par le vendeur : ${eur(ac.prix)} (${ac.prixM2.toLocaleString('fr-FR')} €/m²), soit ${ac.ecartVsMarche >= 0 ? '+' : ''}${eur(ac.ecartVsMarche)} (${ac.ecartVsMarchePct >= 0 ? '+' : ''}${ac.ecartVsMarchePct} %) par rapport au prix de marché en l'état. ${ac.auDessusFourchette ? `Il dépasse le haut de la fourchette de ${eur(ac.ecartVsHaut)}.` : 'Il reste dans la fourchette.'}`
    : 'Aucun autre avis de valeur fourni.'

  return `DONNÉES DU BIEN
- Adresse : ${i.adresse}
- Type : ${i.typeBien}, ${i.surface} m²${i.pieces ? `, ${i.pieces} pièces` : ''}
- État général : ${i.etat || 'non précisé'}
- Année de construction : ${i.anneeConstruction ?? 'non précisée'}
- Équipements : ${i.equipements?.length ? i.equipements.join(', ') : 'non précisés'}
- Remarques de l'agent : ${i.notes || 'aucune'}

VENTES OFFICIELLES AUTOUR DU BIEN (demandes de valeurs foncières, data.gouv.fr)
- ${d.nbVentes} ventes de ${i.typeBien.toLowerCase()}s retenues dans un rayon de ${d.rayonM} m, entre ${d.periode.debut} et ${d.periode.fin}
- Prix au m² : bas ${d.prixM2Bas.toLocaleString('fr-FR')} · médian ${d.prixM2Median.toLocaleString('fr-FR')} · haut ${d.prixM2Haut.toLocaleString('fr-FR')} €/m²
- Fourchette brute pour ce bien (bon état) : ${eur(d.estimationBasse)} à ${eur(d.estimationHaute)}, centrale ${eur(d.estimationCentrale)}
- Fiabilité des données : ${d.fiabilite}
Ventes les plus proches :
${comparables}
Évolution du prix au m² par année :
${tendance}

TRAVAUX SAISIS PAR L'AGENT (total ${eur(i.scenarios.totalTravaux)})
${lignesTravaux}

AJUSTEMENTS SAISIS PAR L'AGENT
${lignesAdj}

PRIX EN L'ÉTAT (référence ± ajustements − travaux)
${sc}

${concurrent}

Rédige le compte rendu pour ${i.agentNom ? `${i.agentNom}, qui le présentera` : "l'agent, qui le présentera"} au propriétaire. Retourne ce JSON exact :
{
  "resume": "3 à 4 phrases : ce que disent les ventes réelles, ce que changent les travaux, et la fourchette en l'état (reprends les chiffres fournis)",
  "sections": [
    {"titre": "Le bien", "texte": "…"},
    {"titre": "Ce que montrent les ventes autour du bien", "texte": "…"},
    {"titre": "Les travaux et leur effet sur le prix", "texte": "…"},
    {"titre": "Les trois prix possibles", "texte": "explique vente rapide / prix de marché / prix d'essai et ce que chacun implique pour le vendeur"},
    {"titre": "Méthode et limites", "texte": "d'où viennent les chiffres, ce que les données ne disent pas"}
  ],
  "argumentaire": ["4 à 6 phrases courtes que l'agent peut dire au propriétaire pour justifier son estimation, chacune appuyée sur un chiffre fourni"],
  "vigilance": ["2 à 5 points à vérifier ou à rappeler (état réel, éléments non pris en compte, fiabilité des données)"]
}`
}

export async function generateEstimationReport(
  input: ReportInput
): Promise<{ rapport: RapportEstimation; tokens: number }> {
  const { data, tokens } = await claudeJSON<RapportEstimation>(SYSTEM, buildReportPrompt(input), 3000)
  return { rapport: sanitizeReport(data), tokens }
}

/** Garde uniquement la structure attendue, quoi que renvoie le modèle. */
export function sanitizeReport(raw: Partial<RapportEstimation>): RapportEstimation {
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const list = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : [])
  const sections = Array.isArray(raw.sections)
    ? raw.sections
        .map((s) => ({ titre: str(s?.titre), texte: str(s?.texte) }))
        .filter((s) => s.titre && s.texte)
    : []
  const resume = str(raw.resume)
  if (!resume && sections.length === 0) throw new Error('Compte rendu vide')
  return { resume, sections, argumentaire: list(raw.argumentaire), vigilance: list(raw.vigilance) }
}

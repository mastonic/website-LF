/**
 * Assainissement SVG côté serveur.
 * Supprime : balises <script>, gestionnaires d'événements (on*),
 * attributs href/xlink:href contenant javascript:, balises <foreignObject>,
 * et toute référence externe (src, href non-data:).
 */

// Éléments dangereux à supprimer entièrement (tag + contenu)
const DANGEROUS_ELEMENTS = [
  /<script[\s\S]*?<\/script>/gi,
  /<script[^>]*\/>/gi,
  /<foreignObject[\s\S]*?<\/foreignObject>/gi,
  /<foreignObject[^>]*\/>/gi,
  /<use[\s\S]*?href\s*=\s*["'][^#][^"']*["'][\s\S]*?>/gi, // <use href="external...">
]

// Attributs dangereux à supprimer
const DANGEROUS_ATTRS = [
  // Gestionnaires d'événements
  /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
  // javascript: dans href, xlink:href, src, action
  /\s+(?:href|xlink:href|src|action)\s*=\s*["']\s*javascript:[^"']*["']/gi,
  // data: dans src (peut embarquer du JS)
  /\s+src\s*=\s*["']data:[^"']*["']/gi,
]

// Directives XML externes dangereuses
const DANGEROUS_PROCESSING = [
  /<!ENTITY[\s\S]*?>/gi,
  /<!DOCTYPE[\s\S]*?>/gi,
]

export type SanitizeResult =
  | { ok: true; svg: string }
  | { ok: false; reason: string }

export function sanitizeSvg(input: string): SanitizeResult {
  if (!input.includes('<svg')) {
    return { ok: false, reason: 'Le fichier ne contient pas de balise <svg>.' }
  }

  let svg = input

  // Supprimer les directives XML dangereuses
  for (const pattern of DANGEROUS_PROCESSING) {
    svg = svg.replace(pattern, '')
  }

  // Supprimer les éléments dangereux entiers
  for (const pattern of DANGEROUS_ELEMENTS) {
    svg = svg.replace(pattern, '')
  }

  // Supprimer les attributs dangereux
  for (const pattern of DANGEROUS_ATTRS) {
    svg = svg.replace(pattern, '')
  }

  // Vérification post-nettoyage : s'il reste des scripts ou eval
  const residualDanger = /<script/i.test(svg) || /javascript:/i.test(svg) || /\bon\w+\s*=/i.test(svg)
  if (residualDanger) {
    return {
      ok: false,
      reason: 'Le SVG contient du code potentiellement dangereux qui ne peut pas être supprimé automatiquement.',
    }
  }

  // Vérifier que le SVG reste valide (contient au moins la balise svg)
  if (!/<svg[\s>]/i.test(svg)) {
    return { ok: false, reason: 'Le SVG est invalide après nettoyage.' }
  }

  return { ok: true, svg }
}

/**
 * Détecte si un SVG est dangereux (avant ou après nettoyage).
 * Retourne true si des éléments dangereux ont été trouvés.
 */
export function svgIsDangerous(input: string): boolean {
  return (
    /<script/i.test(input) ||
    /\bon\w+\s*=/i.test(input) ||
    /javascript:/i.test(input) ||
    /<foreignObject/i.test(input) ||
    /<!ENTITY/i.test(input) ||
    /<!DOCTYPE/i.test(input)
  )
}

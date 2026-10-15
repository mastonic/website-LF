import { createHash, createHmac, timingSafeEqual } from 'crypto'

/**
 * Connexion par code d'accès (phase de test).
 * ACCESS_CODES = "nom:code,nom2:code2". Chaque nom a son propre compte et son espace de travail.
 */
export interface AccessEntry {
  name: string
  code: string
}

export function parseAccessCodes(raw: string | undefined): AccessEntry[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const i = part.indexOf(':')
      return i > 0 ? { name: part.slice(0, i).trim().toLowerCase(), code: part.slice(i + 1).trim() } : null
    })
    .filter((e): e is AccessEntry => !!e && /^[a-z0-9-]{2,30}$/.test(e.name) && e.code.length >= 6)
}

const digest = (s: string) => createHash('sha256').update(s).digest()

/** Compare sans fuite de temps et sans tenir compte des espaces ni de la casse. */
export function matchAccessCode(entries: AccessEntry[], input: string): AccessEntry | null {
  const wanted = digest(input.trim().toLowerCase())
  let found: AccessEntry | null = null
  for (const e of entries) {
    if (timingSafeEqual(wanted, digest(e.code.toLowerCase()))) found = e
  }
  return found
}

/** Adresse technique du compte : jamais utilisée pour envoyer un email. */
export const accessEmail = (name: string) => `${name}@acces.immoai.app`

/** Mot de passe technique, dérivé d'un secret serveur : personne ne le saisit. */
export const accessPassword = (name: string, secret: string) =>
  createHmac('sha256', secret).update(`immoai-acces:${name}`).digest('hex')

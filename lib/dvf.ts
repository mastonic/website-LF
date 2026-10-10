/**
 * Estimation à partir des Demandes de Valeurs Foncières (DVF) — data.gouv.fr.
 * Source : fichiers "geo-dvf" par commune (Licence Ouverte 2.0).
 * Le résultat est une fourchette indicative, pas une expertise.
 */

export type TypeBien = 'Appartement' | 'Maison'

export interface DvfSale {
  id: string
  date: string // YYYY-MM-DD
  prix: number
  surface: number
  pieces: number | null
  type: TypeBien
  voie: string
  codePostal: string
  lat: number
  lon: number
  prixM2: number
}

export interface Comparable extends DvfSale {
  distanceM: number
}

export interface EstimationInput {
  type: TypeBien
  surface: number
  pieces?: number | null
  lat: number
  lon: number
}

export interface EstimationResult {
  prixM2Median: number
  prixM2Bas: number
  prixM2Haut: number
  estimationBasse: number
  estimationCentrale: number
  estimationHaute: number
  nbVentes: number
  rayonM: number
  periode: { debut: string; fin: string }
  fiabilite: 'faible' | 'moyenne' | 'bonne'
  comparables: Comparable[]
}

// ---------- CSV ----------

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') quoted = false
      else cur += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out
}

/**
 * Parse un CSV geo-dvf et ne garde que les ventes simples :
 * une seule mutation de type "Vente", un seul local (appartement ou maison),
 * avec surface, prix et coordonnées valides.
 */
export function parseDvfCsv(csv: string): DvfSale[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.length > 0)
  if (lines.length < 2) return []
  const header = splitCsvLine(lines[0])
  const idx = (n: string) => header.indexOf(n)
  const col = {
    id: idx('id_mutation'),
    date: idx('date_mutation'),
    nature: idx('nature_mutation'),
    valeur: idx('valeur_fonciere'),
    num: idx('adresse_numero'),
    voie: idx('adresse_nom_voie'),
    cp: idx('code_postal'),
    type: idx('type_local'),
    surface: idx('surface_reelle_bati'),
    pieces: idx('nombre_pieces_principales'),
    lon: idx('longitude'),
    lat: idx('latitude'),
  }
  if (col.id < 0 || col.valeur < 0 || col.type < 0 || col.surface < 0) return []

  // Regroupe par mutation : on exclut les mutations multi-locaux (prix non ventilable)
  const byMutation = new Map<string, string[][]>()
  for (let i = 1; i < lines.length; i++) {
    const row = splitCsvLine(lines[i])
    const id = row[col.id]
    if (!id) continue
    const list = byMutation.get(id)
    if (list) list.push(row)
    else byMutation.set(id, [row])
  }

  const sales: DvfSale[] = []
  byMutation.forEach((rows, id) => {
    if (rows[0][col.nature] !== 'Vente') return
    const locaux = rows.filter((r) => r[col.type] === 'Appartement' || r[col.type] === 'Maison')
    const autresLocaux = rows.filter((r) => r[col.type] === 'Local industriel. commercial ou assimilé')
    if (locaux.length !== 1 || autresLocaux.length > 0) return
    const r = locaux[0]
    const prix = Number(r[col.valeur])
    const surface = Number(r[col.surface])
    const lat = Number(r[col.lat])
    const lon = Number(r[col.lon])
    if (!(prix > 0) || !(surface > 0) || !Number.isFinite(lat) || !Number.isFinite(lon) || !r[col.lat] || !r[col.lon]) return
    const piecesN = Number(r[col.pieces])
    sales.push({
      id,
      date: r[col.date],
      prix,
      surface,
      pieces: piecesN > 0 ? piecesN : null,
      type: r[col.type] as TypeBien,
      voie: [r[col.num], r[col.voie]].filter(Boolean).join(' '),
      codePostal: r[col.cp] ?? '',
      lat,
      lon,
      prixM2: prix / surface,
    })
  })
  return sales
}

// ---------- Calcul ----------

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base]
}

const RAYONS_M = [300, 600, 1000, 2000, 5000]
const MIN_VENTES = 8
const SURFACE_MIN = 9
const SURFACE_MAX = 400
const PRIX_M2_MIN = 300
const PRIX_M2_MAX = 30000

/** Retire les ventes aberrantes (prix/m² hors plage, puis hors 1.5×IQR). */
export function removeOutliers(sales: DvfSale[]): DvfSale[] {
  const plausible = sales.filter(
    (s) => s.surface >= SURFACE_MIN && s.surface <= SURFACE_MAX && s.prixM2 >= PRIX_M2_MIN && s.prixM2 <= PRIX_M2_MAX
  )
  if (plausible.length < 6) return plausible
  const sorted = plausible.map((s) => s.prixM2).sort((a, b) => a - b)
  const q1 = quantile(sorted, 0.25)
  const q3 = quantile(sorted, 0.75)
  const iqr = q3 - q1
  const lo = q1 - 1.5 * iqr
  const hi = q3 + 1.5 * iqr
  return plausible.filter((s) => s.prixM2 >= lo && s.prixM2 <= hi)
}

const round = (n: number, step: number) => Math.round(n / step) * step

export function estimate(input: EstimationInput, sales: DvfSale[]): EstimationResult | null {
  const sameType = removeOutliers(sales.filter((s) => s.type === input.type))
  const withDistance: Comparable[] = sameType.map((s) => ({
    ...s,
    distanceM: haversineM(input.lat, input.lon, s.lat, s.lon),
  }))

  // Élargit le rayon jusqu'à avoir assez de ventes
  let rayonM = RAYONS_M[RAYONS_M.length - 1]
  let pool: Comparable[] = []
  for (const r of RAYONS_M) {
    const inside = withDistance.filter((s) => s.distanceM <= r)
    if (inside.length >= MIN_VENTES) {
      rayonM = r
      pool = inside
      break
    }
  }
  if (pool.length === 0) {
    pool = withDistance.filter((s) => s.distanceM <= rayonM)
    if (pool.length < 3) return null
  }

  // Priorité aux biens de surface proche (±40 %) si on en a assez
  const proches = pool.filter((s) => Math.abs(s.surface - input.surface) / input.surface <= 0.4)
  const base = proches.length >= MIN_VENTES ? proches : pool

  const prixM2 = base.map((s) => s.prixM2).sort((a, b) => a - b)
  const median = quantile(prixM2, 0.5)
  const bas = quantile(prixM2, 0.25)
  const haut = quantile(prixM2, 0.75)

  const dates = base.map((s) => s.date).sort()
  const comparables = [...base]
    .sort((a, b) => {
      const sa = Math.abs(a.surface - input.surface) / input.surface + a.distanceM / 2000
      const sb = Math.abs(b.surface - input.surface) / input.surface + b.distanceM / 2000
      return sa - sb
    })
    .slice(0, 5)

  const fiabilite: EstimationResult['fiabilite'] =
    base.length >= 30 && rayonM <= 1000 ? 'bonne' : base.length >= MIN_VENTES ? 'moyenne' : 'faible'

  return {
    prixM2Median: round(median, 10),
    prixM2Bas: round(bas, 10),
    prixM2Haut: round(haut, 10),
    estimationBasse: round(bas * input.surface, 1000),
    estimationCentrale: round(median * input.surface, 1000),
    estimationHaute: round(haut * input.surface, 1000),
    nbVentes: base.length,
    rayonM,
    periode: { debut: dates[0], fin: dates[dates.length - 1] },
    fiabilite,
    comparables,
  }
}

// ---------- Accès aux données ----------

export function dvfCsvUrl(year: number, codeInsee: string): string {
  const dept = codeInsee.startsWith('97') ? codeInsee.slice(0, 3) : codeInsee.slice(0, 2)
  return `https://files.data.gouv.fr/geo-dvf/latest/csv/${year}/communes/${dept}/${codeInsee}.csv`
}

export const INSEE_RE = /^(\d{5}|2[AB]\d{3})$/

const CACHE_TTL_MS = 12 * 60 * 60 * 1000
const cache = new Map<string, { at: number; sales: DvfSale[] }>()

export async function fetchCommuneSales(
  codeInsee: string,
  years: number[],
  fetchImpl: typeof fetch = fetch
): Promise<DvfSale[]> {
  if (!INSEE_RE.test(codeInsee)) throw new Error('Code commune invalide')
  const results = await Promise.all(
    years.map(async (year) => {
      const key = `${codeInsee}:${year}`
      const hit = cache.get(key)
      if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.sales
      const res = await fetchImpl(dvfCsvUrl(year, codeInsee), {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      })
      if (res.status === 404) return [] // pas de fichier pour cette année/commune
      if (!res.ok) throw new Error(`DVF indisponible (${res.status})`)
      const sales = parseDvfCsv(await res.text())
      if (cache.size > 200) cache.delete(cache.keys().next().value as string)
      cache.set(key, { at: Date.now(), sales })
      return sales
    })
  )
  return results.flat()
}

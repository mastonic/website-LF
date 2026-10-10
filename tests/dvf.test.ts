import { describe, it, expect, vi } from 'vitest'
import { parseDvfCsv, estimate, removeOutliers, quantile, haversineM, dvfCsvUrl, fetchCommuneSales } from '@/lib/dvf'

const HEADER = 'id_mutation,date_mutation,numero_disposition,nature_mutation,valeur_fonciere,adresse_numero,adresse_suffixe,adresse_nom_voie,adresse_code_voie,code_postal,code_commune,nom_commune,code_departement,id_parcelle,nombre_lots,type_local,surface_reelle_bati,nombre_pieces_principales,surface_terrain,longitude,latitude'
const row = (id: string, nature: string, val: string, type: string, surf: string, lon = '2.35', lat = '48.85', voie = 'Rue "Test"') =>
  `${id},2024-05-10,1,${nature},${val},12,,"${voie.replace(/"/g, '""')}",0001,75001,75101,Paris 1er,75,X,1,${type},${surf},3,,${lon},${lat}`

describe('parseDvfCsv', () => {
  it('garde les ventes simples et exclut le reste', () => {
    const csv = [
      HEADER,
      row('A', 'Vente', '300000', 'Appartement', '60'),
      row('B', 'Echange', '300000', 'Appartement', '60'),
      row('C', 'Vente', '500000', 'Appartement', '60'),
      row('C', 'Vente', '500000', 'Maison', '90'), // multi-locaux
      row('D', 'Vente', '200000', 'Dépendance', '10'),
      row('E', 'Vente', '', 'Appartement', '50'),
    ].join('\n')
    const sales = parseDvfCsv(csv)
    expect(sales.map((s) => s.id)).toEqual(['A'])
    expect(sales[0].prixM2).toBe(5000)
    expect(sales[0].voie).toBe('12 Rue "Test"')
  })
  it('renvoie [] si en-têtes manquants', () => {
    expect(parseDvfCsv('a,b\n1,2')).toEqual([])
    expect(parseDvfCsv('')).toEqual([])
  })
})

function sales(n: number, base = 5000) {
  return parseDvfCsv(
    [HEADER, ...Array.from({ length: n }, (_, i) => row(`M${i}`, 'Vente', String((base + i * 20) * 60), 'Appartement', '60', String(2.35 + i * 0.0001)))].join('\n')
  )
}

describe('estimate', () => {
  const input = { type: 'Appartement' as const, surface: 60, lon: 2.35, lat: 48.85 }
  it('calcule une fourchette cohérente', () => {
    const r = estimate(input, sales(40))!
    expect(r.nbVentes).toBe(40)
    expect(r.estimationBasse).toBeLessThan(r.estimationCentrale)
    expect(r.estimationCentrale).toBeLessThan(r.estimationHaute)
    expect(r.prixM2Median).toBeGreaterThan(5000)
    expect(r.prixM2Median).toBeLessThan(5800)
    expect(r.fiabilite).toBe('bonne')
    expect(r.comparables).toHaveLength(5)
  })
  it('retourne null sans assez de ventes', () => {
    expect(estimate(input, sales(2))).toBeNull()
  })
  it('ignore l’autre type de bien', () => {
    expect(estimate({ ...input, type: 'Maison' }, sales(40))).toBeNull()
  })
  it('écarte les prix aberrants', () => {
    const s = sales(20)
    s.push({ ...s[0], id: 'X', prix: 60 * 90000, prixM2: 90000 })
    expect(removeOutliers(s).find((x) => x.id === 'X')).toBeUndefined()
  })
})

describe('helpers', () => {
  it('quantile et distance', () => {
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3)
    expect(haversineM(48.85, 2.35, 48.85, 2.35)).toBe(0)
    expect(Math.round(haversineM(48.85, 2.35, 48.86, 2.35))).toBeGreaterThan(1000)
  })
  it('construit l’URL geo-dvf (métropole, Corse, DOM)', () => {
    expect(dvfCsvUrl(2024, '75101')).toContain('/2024/communes/75/75101.csv')
    expect(dvfCsvUrl(2024, '2A004')).toContain('/communes/2A/2A004.csv')
    expect(dvfCsvUrl(2024, '97209')).toContain('/communes/972/97209.csv')
  })
  it('fetchCommuneSales tolère 404 et rejette un code invalide', async () => {
    const f = vi.fn().mockResolvedValue({ status: 404, ok: false }) as unknown as typeof fetch
    expect(await fetchCommuneSales('69123', [2023], f)).toEqual([])
    await expect(fetchCommuneSales('../x', [2023], f)).rejects.toThrow()
  })
})

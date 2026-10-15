export interface AddressSuggestion {
  label: string
  codeInsee: string
  lat: number
  lon: number
}

const GEOCODERS = ['https://data.geopf.fr/geocodage/search', 'https://api-adresse.data.gouv.fr/search/']

/** Recherche d'adresse (Géoplateforme / Base Adresse Nationale), appelée depuis le navigateur. */
export async function searchAddress(q: string, signal: AbortSignal): Promise<AddressSuggestion[]> {
  for (const base of GEOCODERS) {
    try {
      const res = await fetch(`${base}?q=${encodeURIComponent(q)}&limit=5&autocomplete=1`, { signal })
      if (!res.ok) continue
      const json = await res.json()
      return (json.features ?? [])
        .filter((f: any) => f.properties?.citycode && f.geometry?.coordinates)
        .map((f: any) => ({
          label: f.properties.label as string,
          codeInsee: f.properties.citycode as string,
          lon: f.geometry.coordinates[0] as number,
          lat: f.geometry.coordinates[1] as number,
        }))
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
    }
  }
  return []
}

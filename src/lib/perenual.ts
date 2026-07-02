const API_KEY = import.meta.env.VITE_PERENUAL_API_KEY as string

export interface PerenualSpecies {
  id: number
  common_name: string
  scientific_name: string[]
  watering: 'Frequent' | 'Average' | 'Minimum' | 'None'
  sunlight: string[]
  default_image?: { medium_url?: string; regular_url?: string; thumbnail?: string } | null
  cycle?: string
  maintenance?: string
  care_level?: string
}

interface PerenualSearchResponse {
  data: PerenualSpecies[]
  to: number
  per_page: number
  current_page: number
  last_page: number
}

export interface PlantCareData {
  wateringInterval: number
  wateringLabel: string
  sunlight: string
}

export async function searchPerenual(query: string, page = 1): Promise<{ data: PerenualSpecies[]; lastPage: number }> {
  // In dev the Vite proxy forwards to Perenual with the local key in the query.
  // In production the /api/perenual edge function injects the key server-side so
  // it is never exposed in the browser.
  const url = import.meta.env.DEV
    ? `/perenual-api/api/species-list?key=${API_KEY}&q=${encodeURIComponent(query)}&page=${page}`
    : `/api/perenual?q=${encodeURIComponent(query)}&page=${page}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Perenual API error: ${res.status}`)
  const json: PerenualSearchResponse = await res.json()
  return { data: rankByRelevance(json.data ?? [], query), lastPage: json.last_page ?? 1 }
}

// Perenual's free-tier search returns many loosely-matched results (e.g. a
// search for "yucca" surfaces unrelated plants that only share a fragment).
// Re-rank so species whose common or scientific name actually contains the
// query appear first, without dropping anything.
function relevanceScore(species: PerenualSpecies, q: string): number {
  const common = species.common_name?.toLowerCase() ?? ''
  const scientific = (species.scientific_name ?? []).join(' ').toLowerCase()
  if (common === q) return 4
  if (common.startsWith(q)) return 3
  if (common.includes(q) || scientific.includes(q)) return 2
  return 0
}

function rankByRelevance(data: PerenualSpecies[], query: string): PerenualSpecies[] {
  const q = query.toLowerCase().trim()
  if (!q) return data
  return data
    .map((species, i) => ({ species, i, score: relevanceScore(species, q) }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(({ species }) => species)
}

export async function getPlantCareData(scientificName: string): Promise<PlantCareData | null> {
  try {
    const { data } = await searchPerenual(scientificName)
    const match = data[0]
    if (!match) return null
    return parseCareData(match)
  } catch {
    return null
  }
}

export function parseCareData(species: PerenualSpecies): PlantCareData {
  const watering = species.watering?.toLowerCase() ?? 'average'

  let wateringInterval: number
  let wateringLabel: string

  if (watering === 'frequent') {
    wateringInterval = 3
    wateringLabel = 'Every 3 days'
  } else if (watering === 'minimum') {
    wateringInterval = 14
    wateringLabel = 'Every 2 weeks'
  } else if (watering === 'none') {
    wateringInterval = 30
    wateringLabel = 'Once a month'
  } else {
    wateringInterval = 7
    wateringLabel = 'Once a week'
  }

  const sunlight = Array.isArray(species.sunlight)
    ? species.sunlight[0] ?? 'Unknown'
    : 'Unknown'

  return { wateringInterval, wateringLabel, sunlight }
}

export function getPlantImage(species: PerenualSpecies): string | null {
  return species.default_image?.medium_url
    ?? species.default_image?.thumbnail
    ?? null
}

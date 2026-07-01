const API_KEY = import.meta.env.VITE_PLANTNET_API_KEY as string

export interface PlantNetResult {
  species: {
    scientificNameWithoutAuthor: string
    commonNames: string[]
    family: { scientificNameWithoutAuthor: string }
  }
  score: number
}

export async function identifyPlant(file: File): Promise<PlantNetResult[]> {
  const formData = new FormData()
  formData.append('images', file)
  formData.append('organs', 'auto')

  const url = `/plantnet-api/v2/identify/all?api-key=${API_KEY}&lang=en&nb-results=3`

  const res = await fetch(url, { method: 'POST', body: formData })

  if (!res.ok) {
    const text = await res.text()
    console.error('PlantNet error:', res.status, text)
    throw new Error(`API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  console.log('PlantNet response:', data)

  if (!data.results?.length) throw new Error('No results returned')
  return data.results as PlantNetResult[]
}

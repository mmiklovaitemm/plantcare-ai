const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string
const MODEL = 'gemini-2.5-flash'
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}`

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  imagePreview?: string  // data URL for display only, stripped before localStorage
}

export interface ImageData {
  data: string      // base64
  mimeType: string
}

function buildContents(messages: ChatMessage[], image?: ImageData) {
  return messages.map((m, i) => {
    const isLastUser = i === messages.length - 1 && m.role === 'user'
    const parts: object[] = [{ text: m.content }]
    if (isLastUser && image) {
      parts.push({ inline_data: { mime_type: image.mimeType, data: image.data } })
    }
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts,
    }
  })
}

export interface PlantCareAnalysis {
  wateringIntervalDays: number
  analysis: string
}

// Watering intervals the Add Plant form supports; the AI answer is snapped to
// the nearest one so it always maps to a selectable option.
const ALLOWED_INTERVALS = [2, 3, 7, 10, 14, 30]

function snapInterval(days: number): number {
  return ALLOWED_INTERVALS.reduce((best, cur) =>
    Math.abs(cur - days) < Math.abs(best - days) ? cur : best
  )
}

function extractJson(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) throw new Error('No JSON in response')
  return JSON.parse(text.slice(start, end + 1))
}

/**
 * Ask Gemini for a plant-specific indoor watering recommendation and a short
 * care analysis, written in the given language. Returns null on any failure so
 * callers can fall back to other data sources.
 */
export async function analyzePlantCare(
  plantName: string,
  scientificName: string,
  lang: string,
): Promise<PlantCareAnalysis | null> {
  const language = lang.startsWith('lt') ? 'Lithuanian' : 'English'
  const prompt =
    `You are a houseplant care expert. Recommend an indoor watering schedule for ` +
    `"${plantName}" (${scientificName}). Respond with STRICT JSON only, no markdown, ` +
    `in this exact shape: {"wateringIntervalDays": <integer>, "analysis": "<text>"}. ` +
    `"wateringIntervalDays" must be one of 2, 3, 7, 10, 14, 30. ` +
    `"analysis" must be written in ${language}, at most 220 characters, explaining ` +
    `the plant's watering needs plus one key care tip.`

  try {
    const raw = await sendChatMessage([{ role: 'user', content: prompt }], 'Return only valid JSON.')
    const parsed = extractJson(raw) as { wateringIntervalDays?: unknown; analysis?: unknown }
    const days = Number(parsed.wateringIntervalDays)
    const analysis = typeof parsed.analysis === 'string' ? parsed.analysis.trim() : ''
    if (!Number.isFinite(days) || !analysis) return null
    return { wateringIntervalDays: snapInterval(days), analysis }
  } catch (err) {
    console.error('Plant care analysis failed:', err)
    return null
  }
}

export async function sendChatMessage(
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<string> {
  const res = await fetch(`${BASE_URL}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: buildContents(messages),
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err as { error?: { message?: string } }).error?.message
    throw new Error(msg ?? `Gemini API error ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response'
}

export async function sendChatMessageStream(
  messages: ChatMessage[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  image?: ImageData,
): Promise<void> {
  const res = await fetch(`${BASE_URL}:streamGenerateContent?alt=sse&key=${API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: buildContents(messages, image),
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err as { error?: { message?: string } }).error?.message
    throw new Error(msg ?? `Gemini API error ${res.status}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const jsonStr = line.slice(6).trim()
      if (!jsonStr || jsonStr === '[DONE]') continue
      try {
        const parsed = JSON.parse(jsonStr)
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) onChunk(text)
      } catch { /* ignore partial chunk parse errors */ }
    }
  }
}

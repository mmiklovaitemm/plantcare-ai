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

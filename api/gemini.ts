// Server-side proxy for the Google Gemini API.
//
// Keeps the API key on the server instead of shipping it in the browser
// bundle. The client sends the same request body it would send to Google and
// this function appends the key and forwards to the correct endpoint. The
// upstream response body (including SSE streams) is passed straight through.

export const config = { runtime: 'edge' }

const MODEL = 'gemini-2.5-flash'

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: { message: 'Method not allowed' } }, 405)
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    return json({ error: { message: 'Gemini API key not configured on the server' } }, 500)
  }

  const stream = new URL(req.url).searchParams.get('stream') === '1'
  const endpoint = stream ? `streamGenerateContent?alt=sse&key=${apiKey}` : `generateContent?key=${apiKey}`
  const target = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:${endpoint}`

  const upstream = await fetch(target, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: await req.text(),
  })

  // Stream the upstream body through unchanged (SSE for streaming requests).
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

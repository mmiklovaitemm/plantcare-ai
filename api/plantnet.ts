// Server-side proxy for the Pl@ntNet identification API.
//
// Pl@ntNet rejects requests that carry a browser Origin/Referer header
// ("CORS error: Origin not allowed"), so the call cannot be made directly
// from the client. This edge function forwards the multipart image upload
// server-to-server, without an Origin/Referer header, and injects the API
// key so it is never exposed in the browser.

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ message: 'Method not allowed' }, 405)
  }

  const apiKey = process.env.PLANTNET_API_KEY || process.env.VITE_PLANTNET_API_KEY
  if (!apiKey) {
    return json({ message: 'PlantNet API key not configured on the server' }, 500)
  }

  const incoming = new URL(req.url)
  const lang = incoming.searchParams.get('lang') ?? 'en'
  const nbResults = incoming.searchParams.get('nb-results') ?? '3'

  const target =
    `https://my-api.plantnet.org/v2/identify/all` +
    `?api-key=${encodeURIComponent(apiKey)}&lang=${encodeURIComponent(lang)}&nb-results=${encodeURIComponent(nbResults)}`

  // Forward only the content-type (which carries the multipart boundary) and
  // the raw body. Notably we do NOT forward Origin/Referer.
  const upstream = await fetch(target, {
    method: 'POST',
    headers: { 'content-type': req.headers.get('content-type') ?? 'application/octet-stream' },
    body: await req.arrayBuffer(),
  })

  const body = await upstream.text()
  return new Response(body, {
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

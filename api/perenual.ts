// Server-side proxy for the Perenual species-list endpoint.
//
// Keeps the API key on the server instead of embedding it in the client URL.
// The client passes only the search query and page; this function injects the
// key and forwards to Perenual.

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  const apiKey = process.env.PERENUAL_API_KEY || process.env.VITE_PERENUAL_API_KEY
  if (!apiKey) {
    return json({ message: 'Perenual API key not configured on the server' }, 500)
  }

  const incoming = new URL(req.url)
  const q = incoming.searchParams.get('q') ?? ''
  const page = incoming.searchParams.get('page') ?? '1'

  const target =
    `https://perenual.com/api/species-list` +
    `?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(q)}&page=${encodeURIComponent(page)}`

  const upstream = await fetch(target)
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

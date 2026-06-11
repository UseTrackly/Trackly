import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Proxies Deezer/iTunes audio preview URLs to bypass CORS.
 * Returns raw audio bytes with correct Content-Type so the browser
 * can use the response URL as an audio src directly.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  let body;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }

  const { url } = body;
  if (!url || typeof url !== 'string') {
    return new Response(JSON.stringify({ error: 'url is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const allowed = ['dzcdn.net', 'audio-ssl.itunes.apple.com', 'apreview.itunes.apple.com', 'deezer.com', 'cdnt-preview'];
  const isAllowed = allowed.some(d => url.includes(d));
  if (!isAllowed) {
    return new Response(JSON.stringify({ error: 'Domain not allowed' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const audioRes = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' },
  });

  if (!audioRes.ok) {
    return new Response(JSON.stringify({ error: `Failed to fetch audio: ${audioRes.status}` }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }

  const buffer = await audioRes.arrayBuffer();
  const contentType = audioRes.headers.get('content-type') || 'audio/mpeg';

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': buffer.byteLength.toString(),
      'Cache-Control': 'private, max-age=300',
    },
  });
});
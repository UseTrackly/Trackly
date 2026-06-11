import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Proxies Deezer/iTunes audio preview URLs to bypass CORS.
 * Returns the audio as a base64-encoded string in JSON.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { url } = body;
  if (!url || typeof url !== 'string') {
    return Response.json({ error: 'url is required' }, { status: 400 });
  }

  // Only allow known audio preview domains
  const allowed = ['dzcdn.net', 'audio-ssl.itunes.apple.com', 'apreview.itunes.apple.com', 'deezer.com'];
  const isAllowed = allowed.some(d => url.includes(d));
  if (!isAllowed) {
    return Response.json({ error: 'Domain not allowed' }, { status: 403 });
  }

  const audioRes = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!audioRes.ok) {
    return Response.json({ error: `Failed to fetch audio: ${audioRes.status}` }, { status: 502 });
  }

  const buffer = await audioRes.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Encode to base64
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return Response.json({ base64, contentType: 'audio/mpeg' });
});
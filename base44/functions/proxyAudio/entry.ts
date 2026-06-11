import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Proxies audio preview URLs to bypass CORS.
 * Returns base64-encoded audio data as JSON so it works through the SDK invoke wrapper.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== 'string') {
    return Response.json({ error: 'url is required' }, { status: 400 });
  }

  const allowed = ['dzcdn.net', 'audio-ssl.itunes.apple.com', 'apreview.itunes.apple.com', 'deezer.com', 'cdnt-preview'];
  if (!allowed.some(d => url.includes(d))) {
    return Response.json({ error: 'Domain not allowed' }, { status: 403 });
  }

  const audioRes = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' },
  });

  if (!audioRes.ok) {
    return Response.json({ error: `Upstream fetch failed: ${audioRes.status}` }, { status: 502 });
  }

  const buffer = await audioRes.arrayBuffer();
  const contentType = audioRes.headers.get('content-type') || 'audio/mpeg';

  // Convert to base64 using Deno-compatible approach
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return Response.json({ base64, contentType });
});
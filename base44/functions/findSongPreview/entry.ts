import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Deezer search API — free, no API key required.
 * Single search box: pass any combination of song title, artist, or both.
 * Returns top 10 results sorted by Deezer relevance (rank field).
 */

Deno.serve(async (req) => {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const query = (body.query || '').trim();
  if (!query) return Response.json({ error: 'query is required' }, { status: 400 });

  const encoded = encodeURIComponent(query);
  const url = `https://api.deezer.com/search?q=${encoded}&limit=25&order=RANKING`;

  const res = await fetch(url);
  if (!res.ok) return Response.json({ error: 'Deezer API error' }, { status: 502 });

  const json = await res.json();
  const items = json.data || [];

  if (items.length === 0) return Response.json({ results: [], message: 'No results found' });

  // Deezer already returns results sorted by relevance (RANKING).
  // Just map to our standard shape and return top 10.
  const results = items.slice(0, 10).map(track => ({
    track_name: track.title,
    artist_name: track.artist?.name || '',
    artwork_url: track.album?.cover_medium || track.album?.cover || null,
    preview_url: track.preview || null,
  }));

  return Response.json({ results });
});
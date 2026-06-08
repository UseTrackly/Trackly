import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Uses the iTunes Search API (free, no key) to find a 30-second preview URL
 * for a given song name/artist query.
 */
Deno.serve(async (req) => {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { query } = body;
  if (!query || typeof query !== 'string') {
    return Response.json({ error: 'query is required' }, { status: 400 });
  }

  const encoded = encodeURIComponent(query.trim());
  const url = `https://itunes.apple.com/search?term=${encoded}&media=music&entity=song&limit=5`;

  const res = await fetch(url);
  if (!res.ok) return Response.json({ error: 'iTunes API error' }, { status: 502 });

  const json = await res.json();
  const results = json.results || [];

  // Return up to 5 results with previews
  const matches = results
    .filter(r => r.previewUrl)
    .slice(0, 5)
    .map(r => ({
      preview_url: r.previewUrl,
      track_name: r.trackName,
      artist_name: r.artistName,
      artwork_url: r.artworkUrl100,
    }));

  if (matches.length === 0) return Response.json({ results: [], message: 'No previews found for this song' });

  return Response.json({ results: matches });
});
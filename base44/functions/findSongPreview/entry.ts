import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Uses the iTunes Search API (free, no key) to find song previews.
 * Fetches a large result set and sorts by popularity (trackCount) so
 * well-known tracks surface first regardless of iTunes' default ordering.
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

  // Fetch a large set so we can sort by popularity ourselves
  const url = `https://itunes.apple.com/search?term=${encoded}&media=music&entity=song&limit=50`;

  const res = await fetch(url);
  if (!res.ok) return Response.json({ error: 'iTunes API error' }, { status: 502 });

  const json = await res.json();
  const results = json.results || [];

  if (results.length === 0) return Response.json({ results: [], message: 'No results found' });

  // Sort by trackCount (album total tracks is iTunes' best popularity proxy — 
  // albums with more catalog entries / reissues = more popular artist).
  // Secondary: prefer tracks that have a preview URL.
  const sorted = results.sort((a, b) => {
    // Prioritize results that have a preview
    const aHasPreview = a.previewUrl ? 1 : 0;
    const bHasPreview = b.previewUrl ? 1 : 0;
    if (bHasPreview !== aHasPreview) return bHasPreview - aHasPreview;

    // Then sort by trackCount descending as popularity signal
    return (b.trackCount || 0) - (a.trackCount || 0);
  });

  // Return top 8 results (with or without preview — label no-preview ones)
  const matches = sorted.slice(0, 8).map(r => ({
    preview_url: r.previewUrl || null,
    track_name: r.trackName,
    artist_name: r.artistName,
    artwork_url: r.artworkUrl100 || null,
    track_count: r.trackCount || 0,
  }));

  return Response.json({ results: matches });
});
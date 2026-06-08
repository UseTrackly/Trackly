import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Deezer search — free, no API key.
 * Sorting logic:
 *   1. Exact title + artist match → highest priority
 *   2. Official artist result (no cover/remix/karaoke/instrumental junk)
 *   3. Deezer rank (popularity score) descending
 *   4. Covers / remixes / karaoke / instrumentals → pushed to bottom
 */

const JUNK_PATTERNS = /\b(cover|remake|karaoke|instrumental|tribute|originally performed|made famous|in the style of|backing track)\b/i;

function scoreTrack(track, queryLower) {
  const titleLower = (track.title || '').toLowerCase();
  const artistLower = (track.artist?.name || '').toLowerCase();
  const rank = track.rank || 0;

  const isJunk = JUNK_PATTERNS.test(titleLower) || JUNK_PATTERNS.test(track.title_version || '');

  // Split query into tokens to check for title/artist matches
  const tokens = queryLower.split(/\s+/).filter(Boolean);
  const titleTokenHits = tokens.filter(t => titleLower.includes(t)).length;
  const artistTokenHits = tokens.filter(t => artistLower.includes(t)).length;
  const totalTokens = tokens.length || 1;

  // Exact full match bonus
  const exactTitleMatch = titleLower === queryLower ? 1 : 0;
  const exactArtistMatch = artistLower === queryLower ? 0.5 : 0;

  // Partial match score (0–1)
  const partialScore = (titleTokenHits + artistTokenHits) / (totalTokens * 2);

  // Normalized rank (Deezer rank can be up to ~1,000,000)
  const normalizedRank = rank / 1_000_000;

  // Final score: exact match > partial match > popularity, junk goes last
  const score =
    (isJunk ? -10 : 0) +
    exactTitleMatch * 5 +
    exactArtistMatch * 3 +
    partialScore * 2 +
    normalizedRank;

  return score;
}

Deno.serve(async (req) => {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const query = (body.query || '').trim();
  if (!query) return Response.json({ error: 'query is required' }, { status: 400 });

  const queryLower = query.toLowerCase();
  const encoded = encodeURIComponent(query);

  // Fetch more results upfront so sorting has enough to work with
  const url = `https://api.deezer.com/search?q=${encoded}&limit=50&order=RANKING`;

  const res = await fetch(url);
  if (!res.ok) return Response.json({ error: 'Deezer API error' }, { status: 502 });

  const json = await res.json();
  const items = json.data || [];

  if (items.length === 0) return Response.json({ results: [], message: 'No results found' });

  // Sort by our custom score
  const scored = items.map(track => ({ track, score: scoreTrack(track, queryLower) }));
  scored.sort((a, b) => b.score - a.score);

  const results = scored.slice(0, 10).map(({ track }) => ({
    track_name: track.title,
    artist_name: track.artist?.name || '',
    artwork_url: track.album?.cover_medium || track.album?.cover || null,
    preview_url: track.preview || null,
  }));

  return Response.json({ results });
});
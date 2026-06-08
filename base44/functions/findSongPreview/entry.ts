import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Deezer search — free, no API key.
 *
 * Scoring priority (descending):
 *   1. Exact artist name match in query  ← biggest signal
 *   2. Exact song title match in query
 *   3. Deezer rank (popularity)          ← strong tiebreaker
 *   4. Covers / remixes / karaoke        ← heavy penalty
 */

const JUNK_PATTERNS = /\b(cover|remake|karaoke|instrumental|tribute|originally performed|made famous|in the style of|backing track)\b/i;

function normalize(str) {
  return (str || '').toLowerCase().trim();
}

function scoreTrack(track, queryTokens) {
  const title = normalize(track.title);
  const artist = normalize(track.artist?.name || '');
  const rank = track.rank || 0;

  // Junk check (title or version tag)
  const isJunk = JUNK_PATTERNS.test(title) || JUNK_PATTERNS.test(track.title_version || '');

  // --- Artist match score ---
  // Check if any query token exactly matches the artist name,
  // OR if the artist name appears as a substring in the full query string.
  const fullQuery = queryTokens.join(' ');
  const artistExact = artist === fullQuery ? 1 : 0;
  const artistInQuery = fullQuery.includes(artist) && artist.length > 2 ? 0.9 : 0;
  const artistTokenHit = queryTokens.some(t => t.length > 2 && artist.includes(t)) ? 0.5 : 0;
  const artistScore = Math.max(artistExact, artistInQuery, artistTokenHit);

  // --- Title match score ---
  const titleExact = title === fullQuery ? 1 : 0;
  const titleInQuery = queryTokens.filter(t => t.length > 2 && title.includes(t)).length / Math.max(queryTokens.length, 1);
  const titleScore = Math.max(titleExact, titleInQuery * 0.8);

  // --- Popularity (normalized, Deezer rank up to ~1,000,000) ---
  const popularityScore = rank / 1_000_000;

  // Weighted final score
  // Artist match is the strongest signal — if the query says "Drake",
  // Drake's official track should always beat a cover by someone else.
  const score =
    (isJunk ? -20 : 0) +
    artistScore * 10 +   // highest weight
    titleScore * 6 +     // second
    popularityScore * 4; // tiebreaker

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

  const queryTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  const encoded = encodeURIComponent(query);
  const url = `https://api.deezer.com/search?q=${encoded}&limit=50&order=RANKING`;

  const res = await fetch(url);
  if (!res.ok) return Response.json({ error: 'Deezer API error' }, { status: 502 });

  const json = await res.json();
  const items = json.data || [];

  if (items.length === 0) return Response.json({ results: [], message: 'No results found' });

  const scored = items.map(track => ({ track, score: scoreTrack(track, queryTokens) }));
  scored.sort((a, b) => b.score - a.score);

  const results = scored.slice(0, 10).map(({ track }) => ({
    track_name: track.title,
    artist_name: track.artist?.name || '',
    artwork_url: track.album?.cover_medium || track.album?.cover || null,
    preview_url: track.preview || null,
  }));

  return Response.json({ results });
});
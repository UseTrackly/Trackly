import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Uses the iTunes Search API to find song previews.
 * Ranks results with exact title+artist match first, filters out
 * karaoke/covers/remixes/sped-up/slowed versions unless explicitly searched.
 */

const JUNK_KEYWORDS = [
  'karaoke', 'tribute', 'cover', 'instrumental', 'remix', 'sped up', 'speed up',
  'slowed', 'reverb', 'nightcore', 'unofficial', 'made popular', 'in the style of',
  'originally performed', 'as made', 'acoustic version',
];

function normalize(str) {
  return (str || '').toLowerCase().trim();
}

function isJunk(track, query) {
  const qNorm = normalize(query);
  // Only filter junk if the user didn't explicitly search for those terms
  const userWantsJunk = JUNK_KEYWORDS.some(k => qNorm.includes(k));
  if (userWantsJunk) return false;

  const combined = normalize(`${track.trackName} ${track.artistName} ${track.collectionName || ''}`);
  return JUNK_KEYWORDS.some(k => combined.includes(k));
}

function scoreTrack(track, songQuery, artistQuery) {
  const tName = normalize(track.trackName);
  const tArtist = normalize(track.artistName);
  const qSong = normalize(songQuery);
  const qArtist = normalize(artistQuery);

  let score = 0;

  // 1. Exact title + artist match (highest priority)
  if (qSong && qArtist && tName === qSong && tArtist === qArtist) score += 1000;

  // 2. Exact title + artist contains match
  if (qSong && qArtist && tName === qSong && tArtist.includes(qArtist)) score += 800;
  if (qSong && qArtist && tName.includes(qSong) && tArtist === qArtist) score += 700;

  // 3. Exact title match alone
  if (qSong && tName === qSong) score += 500;

  // 4. Title starts with query
  if (qSong && tName.startsWith(qSong)) score += 300;

  // 5. Artist exact match
  if (qArtist && tArtist === qArtist) score += 200;
  if (qArtist && tArtist.includes(qArtist)) score += 100;

  // 6. Title contains query
  if (qSong && tName.includes(qSong)) score += 80;

  // 7. Preview availability bonus
  if (track.previewUrl) score += 50;

  // 8. Popularity via trackCount
  score += Math.min((track.trackCount || 0) / 10, 30);

  return score;
}

Deno.serve(async (req) => {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { query, songQuery: rawSong, artistQuery: rawArtist } = body;

  // Support both combined query (legacy) and split song/artist fields
  const songQ = rawSong || '';
  const artistQ = rawArtist || '';
  const searchTerm = query || [songQ, artistQ].filter(Boolean).join(' ');

  if (!searchTerm.trim()) {
    return Response.json({ error: 'query is required' }, { status: 400 });
  }

  const encoded = encodeURIComponent(searchTerm.trim());
  const url = `https://itunes.apple.com/search?term=${encoded}&media=music&entity=song&limit=50`;

  const res = await fetch(url);
  if (!res.ok) return Response.json({ error: 'iTunes API error' }, { status: 502 });

  const json = await res.json();
  const results = json.results || [];

  if (results.length === 0) return Response.json({ results: [], message: 'No results found' });

  // Filter junk unless user explicitly searched for those terms
  const filtered = results.filter(r => !isJunk(r, searchTerm));
  const pool = filtered.length > 0 ? filtered : results; // fallback if all filtered

  // Score and sort
  const scored = pool
    .map(r => ({ r, score: scoreTrack(r, songQ || searchTerm, artistQ) }))
    .sort((a, b) => b.score - a.score);

  const matches = scored.slice(0, 8).map(({ r }) => ({
    preview_url: r.previewUrl || null,
    track_name: r.trackName,
    artist_name: r.artistName,
    artwork_url: r.artworkUrl100 || null,
    track_count: r.trackCount || 0,
  }));

  return Response.json({ results: matches });
});
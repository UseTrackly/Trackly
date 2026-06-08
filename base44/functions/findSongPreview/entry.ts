import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * iTunes Search API song finder with:
 * - Multi-strategy search (combined, song-only, artist-only)
 * - Fuzzy/partial matching via relevance scoring
 * - Junk filtering (karaoke, covers, remixes, etc.)
 * - Typo tolerance via character overlap scoring
 */

const JUNK_KEYWORDS = [
  'karaoke', 'tribute', 'cover', 'instrumental', 'remix', 'sped up', 'speed up',
  'slowed', 'reverb', 'nightcore', 'unofficial', 'made popular', 'in the style of',
  'originally performed', 'as made',
];

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function isJunk(track, query) {
  const qNorm = normalize(query);
  if (JUNK_KEYWORDS.some(k => qNorm.includes(k))) return false; // user searched for this explicitly
  const combined = normalize(`${track.trackName} ${track.collectionName || ''}`);
  return JUNK_KEYWORDS.some(k => combined.includes(k));
}

// Character n-gram overlap — gives partial/typo credit (0..1)
function ngramSimilarity(a, b, n = 2) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const makeGrams = (s) => {
    const grams = new Set();
    for (let i = 0; i <= s.length - n; i++) grams.add(s.slice(i, i + n));
    return grams;
  };

  const ga = makeGrams(na);
  const gb = makeGrams(nb);
  let overlap = 0;
  for (const g of ga) if (gb.has(g)) overlap++;
  return (2 * overlap) / (ga.size + gb.size);
}

function scoreTrack(track, songQ, artistQ, fullQ) {
  const tName = normalize(track.trackName);
  const tArtist = normalize(track.artistName);
  const qs = normalize(songQ);
  const qa = normalize(artistQ);
  const qf = normalize(fullQ);

  let score = 0;

  // --- Exact / contains matches (high weight) ---
  if (qs && qa && tName === qs && tArtist === qa) score += 2000;
  if (qs && qa && tName === qs && tArtist.includes(qa)) score += 1600;
  if (qs && qa && tName.includes(qs) && tArtist === qa) score += 1400;
  if (qs && tName === qs) score += 1000;
  if (qs && tName.startsWith(qs)) score += 600;
  if (qs && tName.includes(qs)) score += 300;
  if (qa && tArtist === qa) score += 500;
  if (qa && tArtist.includes(qa)) score += 250;

  // --- Fuzzy / typo tolerance via bigram similarity ---
  if (qs) score += ngramSimilarity(tName, qs) * 400;
  if (qa) score += ngramSimilarity(tArtist, qa) * 300;

  // Combined query fuzzy (when user typed everything in one field)
  if (qf && !qs && !qa) {
    const combined = `${tName} ${tArtist}`;
    score += ngramSimilarity(combined, qf) * 500;
    if (combined.includes(qf)) score += 400;
    if (tName.includes(qf)) score += 300;
    if (tArtist.includes(qf)) score += 200;
  }

  // --- Quality signals ---
  if (track.previewUrl) score += 80;
  score += Math.min((track.trackCount || 0) / 10, 40);

  return score;
}

async function fetchResults(term) {
  const encoded = encodeURIComponent(term.trim());
  const res = await fetch(`https://itunes.apple.com/search?term=${encoded}&media=music&entity=song&limit=50`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.results || [];
}

Deno.serve(async (req) => {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { query, songQuery: rawSong, artistQuery: rawArtist } = body;

  const songQ = (rawSong || '').trim();
  const artistQ = (rawArtist || '').trim();
  const fullQ = (query || '').trim() || [songQ, artistQ].filter(Boolean).join(' ');

  if (!fullQ) return Response.json({ error: 'query is required' }, { status: 400 });

  // Multi-strategy: run up to 3 searches in parallel for better recall
  const searches = [fullQ];
  if (songQ && artistQ) {
    searches.push(songQ);   // song only
    searches.push(artistQ); // artist only
  }

  const allBatches = await Promise.all(searches.map(fetchResults));

  // Deduplicate by trackId
  const seen = new Set();
  const pool = [];
  for (const batch of allBatches) {
    for (const r of batch) {
      const key = r.trackId || `${r.trackName}|${r.artistName}`;
      if (!seen.has(key)) {
        seen.add(key);
        pool.push(r);
      }
    }
  }

  if (pool.length === 0) return Response.json({ results: [], message: 'No results found' });

  // Filter junk (fallback to full pool if everything filtered)
  const filtered = pool.filter(r => !isJunk(r, fullQ));
  const candidates = filtered.length > 0 ? filtered : pool;

  // Score and sort
  const scored = candidates
    .map(r => ({ r, score: scoreTrack(r, songQ, artistQ, fullQ) }))
    .sort((a, b) => b.score - a.score);

  const results = scored.slice(0, 8).map(({ r }) => ({
    preview_url: r.previewUrl || null,
    track_name: r.trackName,
    artist_name: r.artistName,
    artwork_url: r.artworkUrl100 || null,
    track_count: r.trackCount || 0,
  }));

  return Response.json({ results });
});
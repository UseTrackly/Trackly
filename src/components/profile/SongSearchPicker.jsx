import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, X, Music2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function SongSearchPicker({ songName, songArtist, songArtwork, songPreviewUrl, onSelect, onClear }) {
  const [query, setQuery] = useState(songName || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const doSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await base44.functions.invoke('findSongPreview', { query: q });
      const found = res.data?.results || [];
      if (found.length === 0) toast.error('No results found — try a different spelling');
      else setResults(found);
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (r) => {
    onSelect({
      song_name: `${r.track_name} – ${r.artist_name}`,
      song_artist: r.artist_name,
      song_artwork_url: r.artwork_url || '',
      song_preview_url: r.preview_url || '',
    });
    setResults([]);
    setQuery(`${r.track_name} – ${r.artist_name}`);
  };

  const handleClear = () => {
    onClear();
    setQuery('');
    setResults([]);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Profile Song</label>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // Only clear the selected song if user is actively retyping
            if (songPreviewUrl) onClear();
            setResults([]);
          }}
          placeholder="e.g. Love Blur Slayr"
          className="bg-background flex-1"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } }}
        />
        <button
          type="button"
          disabled={loading || !query.trim()}
          onClick={doSearch}
          className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity"
        >
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Selected song confirmation */}
      {songPreviewUrl && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
          {songArtwork ? (
            <img src={songArtwork} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
          ) : (
            <Music2 className="w-4 h-4 text-primary shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary truncate">✓ Selected</p>
            {songArtist && <p className="text-[10px] text-muted-foreground truncate">{songArtist}</p>}
          </div>
          <button type="button" onClick={handleClear} className="shrink-0 p-1">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Results picker */}
      {!songPreviewUrl && results.length > 0 && (
        <div className="space-y-1.5 max-h-60 overflow-y-auto rounded-lg border border-border bg-background p-1.5">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-1.5 pt-0.5">Pick the right song:</p>
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(r)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-primary/5 hover:border-primary/30 border border-transparent transition-colors text-left"
            >
              {r.artwork_url ? (
                <img src={r.artwork_url} alt="" className="w-9 h-9 rounded-md object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                  <Music2 className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{r.track_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{r.artist_name}</p>
              </div>
              {!r.preview_url && (
                <span className="text-[9px] text-muted-foreground shrink-0">no preview</span>
              )}
            </button>
          ))}
        </div>
      )}

      {!songPreviewUrl && results.length === 0 && !loading && (
        <p className="text-[10px] text-muted-foreground">Search by song name + artist — then pick from the results</p>
      )}
    </div>
  );
}
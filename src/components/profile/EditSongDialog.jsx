import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, X, Music2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function EditSongDialog({ open, onOpenChange, profile, onSave, isSaving }) {
  const [songQuery, setSongQuery] = useState('');
  const [artistQuery, setArtistQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Selected values
  const [selectedName, setSelectedName] = useState('');
  const [selectedArtist, setSelectedArtist] = useState('');
  const [selectedArtwork, setSelectedArtwork] = useState('');
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState('');

  // Pre-fill with existing profile song when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedName(profile?.song_name || '');
      setSelectedArtist(profile?.song_artist || '');
      setSelectedArtwork(profile?.song_artwork_url || '');
      setSelectedPreviewUrl(profile?.song_preview_url || '');
      setSongQuery(profile?.song_name ? profile.song_name.split(' – ')[0] || profile.song_name : '');
      setArtistQuery(profile?.song_artist || '');
      setResults([]);
    }
  }, [open]);

  const doSearch = async () => {
    const combined = [songQuery.trim(), artistQuery.trim()].filter(Boolean).join(' ');
    if (!combined) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await base44.functions.invoke('findSongPreview', { query: combined });
      const found = res.data?.results || [];
      if (found.length === 0) toast.error('No results — try different search terms');
      else setResults(found);
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (r) => {
    setSelectedName(`${r.track_name} – ${r.artist_name}`);
    setSelectedArtist(r.artist_name);
    setSelectedArtwork(r.artwork_url || '');
    setSelectedPreviewUrl(r.preview_url || '');
    setResults([]);
    setSongQuery(r.track_name);
    setArtistQuery(r.artist_name);
  };

  const handleClear = () => {
    setSelectedName('');
    setSelectedArtist('');
    setSelectedArtwork('');
    setSelectedPreviewUrl('');
    setSongQuery('');
    setArtistQuery('');
    setResults([]);
  };

  const handleSave = () => {
    onSave({
      song_name: selectedName,
      song_artist: selectedArtist,
      song_artwork_url: selectedArtwork,
      song_preview_url: selectedPreviewUrl,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music2 className="w-4 h-4 text-primary" />
            Profile Song
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Song name field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Song Name</label>
            <Input
              value={songQuery}
              onChange={(e) => { setSongQuery(e.target.value); setResults([]); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } }}
              placeholder="e.g. Love Blur"
              className="bg-background"
            />
          </div>

          {/* Artist field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Artist</label>
            <div className="flex gap-2">
              <Input
                value={artistQuery}
                onChange={(e) => { setArtistQuery(e.target.value); setResults([]); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } }}
                placeholder="e.g. Slayr"
                className="bg-background flex-1"
              />
              <button
                type="button"
                disabled={loading || (!songQuery.trim() && !artistQuery.trim())}
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
          </div>

          {/* Selected song confirmation */}
          {selectedPreviewUrl && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20">
              {selectedArtwork ? (
                <img src={selectedArtwork} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Music2 className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{selectedName}</p>
                <p className="text-[10px] text-primary font-medium flex items-center gap-1 mt-0.5">
                  <Check className="w-2.5 h-2.5" /> Preview ready
                </p>
              </div>
              <button type="button" onClick={handleClear} className="shrink-0 p-1">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Results list */}
          {results.length > 0 && (
            <div className="space-y-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-background p-1.5">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-1.5 pb-0.5">
                Select the right song:
              </p>
              {results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-colors text-left"
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
                    <span className="text-[9px] text-muted-foreground/60 shrink-0">no preview</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {!selectedPreviewUrl && results.length === 0 && !loading && (
            <p className="text-[10px] text-muted-foreground">
              Enter a song name and/or artist, then press Search or Enter
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {isSaving ? 'Saving...' : 'Save Song'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
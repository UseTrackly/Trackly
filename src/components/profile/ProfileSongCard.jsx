import React, { useState, useRef, useEffect } from 'react';
import { Music2, Play, Pause, Pencil, Lock, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Equalizer bars animation (CSS-driven)
function EqualizerBars() {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-primary"
          style={{
            animation: `eq-bar-${i} ${0.5 + i * 0.12}s ease-in-out infinite alternate`,
            height: '60%',
          }}
        />
      ))}
      <style>{`
        @keyframes eq-bar-1 { from { height: 30% } to { height: 100% } }
        @keyframes eq-bar-2 { from { height: 60% } to { height: 30% } }
        @keyframes eq-bar-3 { from { height: 40% } to { height: 90% } }
        @keyframes eq-bar-4 { from { height: 80% } to { height: 20% } }
      `}</style>
    </div>
  );
}

export default function ProfileSongCard({ songName, songArtist, previewUrl, artworkUrl, isPro = false, onEdit }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [proxyUrl, setProxyUrl] = useState(null);
  const audioRef = useRef(null);

  const displayTitle = songName?.includes(' – ') ? songName.split(' – ')[0] : songName;
  const displayArtist = songArtist || (songName?.includes(' – ') ? songName.split(' – ')[1] : null);

  // Fetch proxied blob URL when previewUrl changes (bypasses CORS on Deezer CDN)
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); }
    setPlaying(false);
    setLoading(false);
    setProxyUrl(null);

    if (!previewUrl) return;

    let cancelled = false;
    base44.functions.invoke('proxyAudio', { url: previewUrl })
      .then((res) => {
        if (cancelled) return;
        const { base64, contentType } = res.data || {};
        if (!base64) { console.warn('[ProfileSongCard] no base64 in response'); return; }
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: contentType || 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        setProxyUrl(url);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.load();
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[ProfileSongCard] proxy fetch failed:', err?.message);
        // Fallback: try direct URL
        setProxyUrl(previewUrl);
        if (audioRef.current) {
          audioRef.current.src = previewUrl;
          audioRef.current.load();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [previewUrl]);

  // Cleanup blob URLs and audio on unmount
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) { audio.pause(); audio.src = ''; }
      if (proxyUrl && proxyUrl.startsWith('blob:')) URL.revokeObjectURL(proxyUrl);
    };
  }, []);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!previewUrl) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      setLoading(true);
      const promise = audio.play();
      if (promise !== undefined) {
        promise
          .then(() => { setPlaying(true); setLoading(false); })
          .catch((err) => {
            console.warn('[ProfileSongCard] play() failed:', err?.name, err?.message);
            setPlaying(false);
            setLoading(false);
          });
      } else {
        setPlaying(true);
        setLoading(false);
      }
    }
  };

  // Free user without song - show simple locked state
  if (!songName && !isPro) {
    return (
      <div className="mt-3 w-full">
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-foreground">Profile Song</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Available with Pro</p>
          </div>
        </div>
        
        <button
          onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
          className="w-full mt-2 py-2.5 rounded-lg bg-primary/90 backdrop-blur-sm text-primary-foreground text-xs font-medium hover:bg-primary/80 transition-colors"
        >
          Upgrade to Pro
        </button>
      </div>
    );
  }

  // Free user with existing song (grandfathered) - show limited state
  if (!isPro && songName) {
    // Continue to render but with limited functionality
  }

  return (
    <div className="mt-3 w-full">
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50 transition-all"
        style={{
          boxShadow: playing ? '0 2px 8px hsl(var(--primary) / 0.1)' : 'none',
        }}
      >
        {/* Artwork */}
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
          {artworkUrl ? (
            <img src={artworkUrl} alt="artwork" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center">
              <Music2 className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Song info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate text-foreground">{displayTitle}</p>
          {displayArtist && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{displayArtist}</p>
          )}
          {playing && (
            <div className="mt-1">
              <EqualizerBars />
            </div>
          )}
        </div>

        {/* Play/Pause button */}
        {previewUrl && (
          <button
            onClick={togglePlay}
            disabled={!proxyUrl && !playing}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-secondary hover:bg-secondary/80 transition-colors active:scale-95 disabled:opacity-40"
          >
            {(!proxyUrl && !playing) || loading
              ? <Loader2 className="w-3.5 h-3.5 text-foreground animate-spin" />
              : playing
                ? <Pause className="w-3.5 h-3.5 text-foreground" />
                : <Play className="w-3.5 h-3.5 text-foreground ml-0.5" />}
          </button>
        )}

        {/* Edit button */}
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}

        <audio
          ref={audioRef}
          onEnded={() => { setPlaying(false); setLoading(false); }}
          onError={(e) => {
            console.warn('[ProfileSongCard] audio error:', e.target?.error?.message);
            setPlaying(false);
            setLoading(false);
          }}
          playsInline
        />
      </div>
    </div>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import { Music2, Play, Pause, Pencil } from 'lucide-react';

// Equalizer bars animation (CSS-driven)
function EqualizerBars() {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-violet-400"
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

export default function ProfileSongCard({ songName, songArtist, previewUrl, artworkUrl, onEdit }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const displayTitle = songName?.includes(' – ') ? songName.split(' – ')[0] : songName;
  const displayArtist = songArtist || (songName?.includes(' – ') ? songName.split(' – ')[1] : null);

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); setPlaying(false); }
  }, [previewUrl]);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!audioRef.current || !previewUrl) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  if (!songName && !previewUrl) {
    return (
      <button
        onClick={onEdit}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-dashed border-border text-muted-foreground text-xs hover:border-primary/50 hover:text-primary transition-colors mx-auto mt-3"
      >
        <Music2 className="w-3 h-3" />
        Add a profile song
      </button>
    );
  }

  return (
    <div className="mt-3 w-full">
      <div
        className="relative flex items-center gap-3 px-3 py-3 rounded-2xl overflow-hidden transition-all"
        style={{
          background: playing
            ? 'linear-gradient(135deg, rgba(109,40,217,0.28) 0%, rgba(99,102,241,0.22) 100%)'
            : 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)',
          border: playing
            ? '1px solid rgba(139,92,246,0.45)'
            : '1px solid rgba(139,92,246,0.18)',
          boxShadow: playing ? '0 0 18px rgba(139,92,246,0.2)' : 'none',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Artwork */}
        <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 relative">
          {artworkUrl ? (
            <img src={artworkUrl} alt="artwork" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-violet-900/40 flex items-center justify-center">
              <Music2 className="w-5 h-5 text-violet-400" />
            </div>
          )}
        </div>

        {/* Song info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight truncate text-foreground">{displayTitle}</p>
          {displayArtist && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{displayArtist}</p>
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
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90"
            style={{
              background: playing
                ? 'linear-gradient(135deg, #7c3aed, #6366f1)'
                : 'rgba(139,92,246,0.2)',
              border: '1px solid rgba(139,92,246,0.35)',
            }}
          >
            {playing
              ? <Pause className="w-4 h-4 text-white" />
              : <Play className="w-4 h-4 text-violet-300 ml-0.5" />}
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
          src={previewUrl}
          onEnded={() => setPlaying(false)}
          preload="none"
        />
      </div>
    </div>
  );
}
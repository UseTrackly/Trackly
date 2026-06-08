import React, { useState, useRef, useEffect } from 'react';
import { Music2, Play, Pause, Pencil, Crown, Lock } from 'lucide-react';

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

  // Free user without song - show locked state
  if (!songName && !isPro) {
    return (
      <div className="mt-3 w-full">
        <div
          className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl overflow-hidden backdrop-blur-xl border border-border/50"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--card) / 0.6) 0%, hsl(var(--card) / 0.4) 100%)',
            boxShadow: '0 4px 16px hsl(var(--primary) / 0.05)',
          }}
        >
          {/* Subtle shine overlay */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary) / 0.02) 0%, transparent 50%, hsl(var(--accent) / 0.01) 100%)',
            }}
          />
          
          {/* Locked icon */}
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
            <Lock className="w-5 h-5 text-primary" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0 ml-3">
            <p className="text-sm font-semibold leading-tight text-foreground">Profile Song</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pro Feature</p>
          </div>

          {/* Pro badge */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-primary/15 border border-primary/30">
            <Crown className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-bold text-primary">PRO</span>
          </div>
        </div>
        
        {/* Upgrade prompt */}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
          className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-primary/90 to-accent/90 text-primary-foreground text-sm font-semibold border border-primary/30 shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]"
        >
          Unlock Profile Song — Upgrade to Pro
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
        className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl overflow-hidden transition-all backdrop-blur-xl"
        style={{
          background: playing
            ? `linear-gradient(135deg, hsl(var(--primary) / 0.18) 0%, hsl(var(--accent) / 0.12) 100%)`
            : 'linear-gradient(135deg, hsl(var(--card) / 0.85) 0%, hsl(var(--card) / 0.7) 100%)',
          border: isPro ? '1px solid hsl(var(--primary) / 0.3)' : '1px solid hsl(var(--primary) / 0.2)',
          boxShadow: playing 
            ? `0 8px 32px hsl(var(--primary) / 0.2), inset 0 1px 0 hsl(var(--primary) / 0.15)`
            : isPro
              ? `0 6px 24px hsl(var(--primary) / 0.12), inset 0 1px 0 hsl(var(--primary) / 0.08)`
              : '0 4px 16px hsl(var(--primary) / 0.08), inset 0 1px 0 hsl(var(--primary) / 0.05)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Subtle shine overlay */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary) / 0.04) 0%, transparent 50%, hsl(var(--accent) / 0.03) 100%)',
          }}
        />
        
        {/* Pro badge for Pro users */}
        {isPro && (
          <div className="absolute -top-1.5 -right-1 flex items-center gap-1 px-2 py-1 rounded-full bg-primary/90 text-primary-foreground border border-primary/50 shadow-lg" style={{ zIndex: 10 }}>
            <Crown className="w-2.5 h-2.5" />
            <span className="text-[8px] font-bold">PRO</span>
          </div>
        )}
        
        {/* Artwork */}
        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative shadow-lg" style={{ border: '1px solid hsl(var(--primary) / 0.25)' }}>
          {artworkUrl ? (
            <img src={artworkUrl} alt="artwork" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary/20 flex items-center justify-center">
              <Music2 className="w-5 h-5 text-primary" />
            </div>
          )}
        </div>

        {/* Song info */}
        <div className="flex-1 min-w-0 ml-3">
          <p className="text-sm font-semibold leading-tight truncate text-foreground">{displayTitle}</p>
          {displayArtist && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{displayArtist}</p>
          )}
          {playing && (
            <div className="mt-1.5">
              <EqualizerBars />
            </div>
          )}
        </div>

        {/* Play/Pause button */}
        {previewUrl && (
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 hover:scale-105 ml-2"
            style={{
              background: playing
                ? 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))'
                : 'linear-gradient(135deg, hsl(var(--primary) / 0.18), hsl(var(--accent) / 0.12))',
              border: `1px solid ${playing ? 'transparent' : 'hsl(var(--primary) / 0.35)'}`,
              boxShadow: playing 
                ? `0 4px 20px hsl(var(--primary) / 0.35), inset 0 1px 0 hsl(white / 0.25)`
                : '0 2px 10px hsl(var(--primary) / 0.2)',
            }}
          >
            {playing
              ? <Pause className="w-4 h-4 text-white" />
              : <Play className="w-4 h-4 text-primary ml-0.5" />}
          </button>
        )}

        {/* Edit button */}
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
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
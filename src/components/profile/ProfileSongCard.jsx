import React, { useState, useRef, useEffect } from 'react';
import { Music2, Play, Pause } from 'lucide-react';

export default function ProfileSongCard({ songName, songArtist, previewUrl, artworkUrl }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Stop when previewUrl changes (e.g. profile reload)
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
    }
  }, [previewUrl]);

  if (!songName && !previewUrl) return null;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const hasPlayable = !!previewUrl;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/60 border border-border mt-3">
      {/* Artwork or music icon */}
      <div className="relative shrink-0">
        {artworkUrl ? (
          <div className="w-10 h-10 rounded-lg overflow-hidden relative">
            <img src={artworkUrl} alt="album art" className="w-full h-full object-cover" />
            {playing && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="flex gap-0.5 items-end h-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-1 bg-white rounded-full animate-bounce" style={{ height: `${8 + i * 3}px`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${playing ? 'bg-primary' : 'bg-primary/15'} transition-colors`}>
            <Music2 className={`w-4 h-4 ${playing ? 'text-primary-foreground' : 'text-primary'}`} />
          </div>
        )}
      </div>

      {/* Song info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate leading-tight">
          {songName || 'Profile Song'}
        </p>
        {songArtist && (
          <p className="text-[10px] text-muted-foreground truncate">{songArtist}</p>
        )}
        {!songArtist && hasPlayable && (
          <p className="text-[10px] text-muted-foreground">30s preview</p>
        )}
      </div>

      {/* Play/Pause button */}
      {hasPlayable && (
        <>
          <button
            onClick={togglePlay}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <audio
            ref={audioRef}
            src={previewUrl}
            onEnded={() => setPlaying(false)}
            preload="none"
          />
        </>
      )}
    </div>
  );
}
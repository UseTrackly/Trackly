import React, { useState, useRef, useEffect } from 'react';
import { Music2, Play, Pause, ChevronRight, X } from 'lucide-react';

export default function ProfileSongCard({ songName, songArtist, previewUrl, artworkUrl, onEdit }) {
  const [sheetOpen, setSheetOpen] = useState(false);
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

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
    }
  }, [previewUrl]);

  useEffect(() => {
    if (!sheetOpen && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
    }
  }, [sheetOpen]);

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

  const displayTitle = songName?.includes(' – ')
    ? songName.split(' – ')[0]
    : songName;
  const displayArtist = songArtist || (songName?.includes(' – ') ? songName.split(' – ')[1] : null);

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

  return (
    <>
      {/* Pill */}
      <button
        onClick={() => setSheetOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-full mx-auto mt-3 transition-all active:scale-95"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(168,85,247,0.14) 100%)',
          border: '1px solid rgba(139,92,246,0.25)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Music2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        <span className="text-xs font-medium text-foreground/90 max-w-[180px] truncate">
          {displayTitle}
          {displayArtist && <span className="text-muted-foreground font-normal"> · {displayArtist}</span>}
        </span>
        <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
      </button>

      {/* Bottom sheet backdrop */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setSheetOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Sheet */}
          <div
            className="relative w-full max-w-md mx-auto rounded-t-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #1a1033 0%, #0f0a1e 60%, #0a0a0a 100%)',
              border: '1px solid rgba(139,92,246,0.2)',
              borderBottom: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-1 rounded-full bg-white/20" />
            </div>

            {/* Close */}
            <button
              onClick={() => setSheetOpen(false)}
              className="absolute top-3 right-4 p-1.5 rounded-full bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="px-6 pb-10 pt-4 flex flex-col items-center gap-4">
              {/* Artwork */}
              <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-2xl"
                style={{ boxShadow: '0 8px 32px rgba(139,92,246,0.35)' }}>
                {artworkUrl ? (
                  <img src={artworkUrl} alt="album art" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-violet-900/40">
                    <Music2 className="w-10 h-10 text-violet-400" />
                  </div>
                )}
              </div>

              {/* Song info */}
              <div className="text-center">
                <p className="text-base font-bold text-white leading-tight">{displayTitle || 'Profile Song'}</p>
                {displayArtist && <p className="text-sm text-white/50 mt-0.5">{displayArtist}</p>}
              </div>

              {/* Controls */}
              {previewUrl ? (
                <div className="flex flex-col items-center gap-2 w-full">
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}
                  >
                    {playing
                      ? <Pause className="w-6 h-6 text-white" />
                      : <Play className="w-6 h-6 text-white ml-0.5" />}
                  </button>
                  <p className="text-[10px] text-white/30">30s preview</p>
                  <audio
                    ref={audioRef}
                    src={previewUrl}
                    onEnded={() => setPlaying(false)}
                    preload="none"
                  />
                </div>
              ) : (
                <p className="text-xs text-white/30">No preview available</p>
              )}

              {/* Edit link */}
              {onEdit && (
                <button
                  onClick={() => { setSheetOpen(false); onEdit(); }}
                  className="text-xs text-violet-400 underline underline-offset-2 mt-1"
                >
                  Change song
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
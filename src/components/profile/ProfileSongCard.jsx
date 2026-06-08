import React, { useState, useRef, useEffect } from 'react';
import { Music2, Play, Pause, ExternalLink } from 'lucide-react';

function getYouTubeEmbedId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return match ? match[1] : null;
}

function isDirectAudio(url) {
  return /\.(mp3|m4a|ogg|wav|aac)(\?|$)/i.test(url);
}

function isSpotify(url) {
  return url.includes('spotify.com');
}

function isAppleMusic(url) {
  return url.includes('music.apple.com');
}

export default function ProfileSongCard({ songName, previewUrl, compact = false }) {
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const audioRef = useRef(null);

  const ytId = previewUrl ? getYouTubeEmbedId(previewUrl) : null;
  const isDirect = previewUrl ? isDirectAudio(previewUrl) : false;
  const isExternal = previewUrl && !isDirect && !ytId;

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

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

  if (!songName && !previewUrl) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/60 border border-border mt-3">
      {/* Icon / waveform */}
      <div className="relative shrink-0">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${playing ? 'bg-primary' : 'bg-primary/15'} transition-colors`}>
          <Music2 className={`w-4 h-4 ${playing ? 'text-primary-foreground' : 'text-primary'}`} />
        </div>
        {playing && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
        )}
      </div>

      {/* Song info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate leading-tight">
          {songName || 'Profile Song'}
        </p>
        {previewUrl && isExternal && (
          <p className="text-[10px] text-muted-foreground truncate">
            {isSpotify(previewUrl) ? 'Spotify' : isAppleMusic(previewUrl) ? 'Apple Music' : 'Preview Link'}
          </p>
        )}
        {isDirect && (
          <p className="text-[10px] text-muted-foreground">Audio Preview</p>
        )}
      </div>

      {/* Controls */}
      {isDirect && (
        <>
          <button
            onClick={togglePlay}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <audio
            ref={audioRef}
            src={previewUrl}
            onEnded={() => setPlaying(false)}
            onCanPlay={() => setLoaded(true)}
            preload="none"
          />
        </>
      )}

      {isExternal && previewUrl && (
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-secondary border border-border hover:bg-primary/10 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
        </a>
      )}
    </div>
  );
}
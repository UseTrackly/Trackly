import React from 'react';
import { useTheme } from '@/lib/ThemeContext';

export default function AnimatedBackground() {
  const { backgroundStyle } = useTheme();

  if (backgroundStyle === 'none' || !backgroundStyle) {
    return null;
  }

  if (backgroundStyle === 'gradient') {
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div 
          className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-3xl animate-gradient-shift"
          style={{ animationDelay: '0s' }}
        />
        <div 
          className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-3xl animate-gradient-shift-reverse"
          style={{ animationDelay: '1s' }}
        />
      </div>
    );
  }

  if (backgroundStyle === 'dots') {
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0, 20px 20px',
          }}
        />
      </div>
    );
  }

  if (backgroundStyle === 'grid') {
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>
    );
  }

  if (backgroundStyle === 'particles') {
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (backgroundStyle === 'waves') {
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
        <div className="absolute inset-0 opacity-20">
          <svg className="absolute bottom-0 w-full h-64" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path 
              fill="currentColor" 
              className="text-primary/30 animate-wave"
              d="M0,160L48,144C96,128,192,96,288,106.7C384,117,480,171,576,186.7C672,203,768,181,864,154.7C960,128,1056,96,1152,90.7C1248,85,1344,107,1392,117.3L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
          <svg className="absolute bottom-0 w-full h-64" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path 
              fill="currentColor" 
              className="text-accent/20 animate-wave-reverse"
              d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,133.3C672,139,768,181,864,181.3C960,181,1056,139,1152,128C1248,117,1344,139,1392,149.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
        </div>
      </div>
    );
  }

  return null;
}
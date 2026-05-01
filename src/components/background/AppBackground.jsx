import React from 'react';
import { useTheme } from '@/lib/ThemeContext';

export default function AppBackground() {
  const { background, customBackground } = useTheme();

  // Debug log
  React.useEffect(() => {
    console.log('Background state:', { background, customBackground });
  }, [background, customBackground]);

  if (background === 'none') {
    return null;
  }

  if (background === 'custom' && customBackground) {
    return (
      <div 
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ 
          zIndex: 0,
          backgroundImage: `url(${customBackground})`,
          opacity: 0.2
        }}
      />
    );
  }

  if (background === 'default') {
    return (
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      </div>
    );
  }

  if (background === 'sunset') {
    return (
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-pink-500/10 to-purple-500/10" />
      </div>
    );
  }

  if (background === 'ocean') {
    return (
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10" />
      </div>
    );
  }

  if (background === 'forest') {
    return (
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-lime-500/10" />
      </div>
    );
  }

  if (background === 'midnight') {
    return (
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-blue-500/10" />
      </div>
    );
  }

  if (background === 'minimal') {
    return (
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 via-background to-gray-500/5" />
      </div>
    );
  }

  return null;
}
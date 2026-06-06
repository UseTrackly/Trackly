import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTabReset } from '@/lib/TabResetContext';
import { Home, Calculator, Users, Package } from 'lucide-react';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/calculator', icon: Calculator, label: 'Calculator' },
  { path: '/inventory', icon: Package, label: 'Inventory' },
  { path: '/community', icon: Users, label: 'Community' },
];

export default function BottomNav({ asFlexItem = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { resetTab } = useTabReset();

  if (location.pathname === '/onboarding' || location.pathname === '/onboarding-categories' || location.pathname === '/upgrade') return null;

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="relative z-50 border-t border-white/[0.06] shrink-0"
      style={{ overflow: 'hidden', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
    >
      {/* Animated gradient background */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: 'hsl(var(--background) / 0.55)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {/* Orb 1 */}
        <div style={{
          position: 'absolute',
          width: 180,
          height: 80,
          borderRadius: '50%',
          background: 'hsl(var(--primary) / 0.18)',
          filter: 'blur(32px)',
          top: '-20px',
          left: '-10%',
          animation: 'bnav-drift1 8s ease-in-out infinite',
          willChange: 'transform',
        }} />
        {/* Orb 2 */}
        <div style={{
          position: 'absolute',
          width: 140,
          height: 70,
          borderRadius: '50%',
          background: 'hsl(var(--primary) / 0.12)',
          filter: 'blur(28px)',
          top: '-10px',
          right: '5%',
          animation: 'bnav-drift2 10s ease-in-out infinite',
          willChange: 'transform',
        }} />
        {/* Subtle shimmer line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), transparent)',
          animation: 'bnav-shimmer 4s ease-in-out infinite',
        }} />
      </div>

      <style>{`
        @keyframes bnav-drift1 {
          0%, 100% { transform: translateX(0px) scale(1); }
          50% { transform: translateX(60px) scale(1.1); }
        }
        @keyframes bnav-drift2 {
          0%, 100% { transform: translateX(0px) scale(1); }
          50% { transform: translateX(-50px) scale(0.95); }
        }
        @keyframes bnav-shimmer {
          0%, 100% { opacity: 0.3; transform: scaleX(0.6); }
          50% { opacity: 1; transform: scaleX(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bnav-drift1, .bnav-drift2, .bnav-shimmer { animation: none !important; }
        }
      `}</style>

      <div className="relative flex items-center justify-center gap-2" style={{ zIndex: 2, paddingTop: '8px', paddingBottom: '10px' }}>
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => isActive ? resetTab(tab.path) : navigate(tab.path)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex flex-col items-center gap-1 px-6 py-2 min-h-[44px] min-w-[70px] justify-center focus-visible:outline-none"
            >
              {/* Active indicator line */}
              <div
                className="absolute top-0 h-[2px] rounded-full transition-all duration-300"
                style={{
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: isActive ? '32px' : '0px',
                  opacity: isActive ? 1 : 0,
                  backgroundColor: 'hsl(var(--primary))',
                  boxShadow: isActive ? '0 0 8px 2px hsl(var(--primary) / 0.5)' : 'none',
                }}
              />

              <Icon
                className="transition-colors duration-200"
                style={{
                  width: 22,
                  height: 22,
                  color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--foreground) / 0.55)',
                  strokeWidth: isActive ? 2 : 1.5,
                }}
                aria-hidden="true"
              />
              <span
                className="text-[10px] font-medium tracking-wider uppercase transition-colors duration-200"
                style={{ color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--foreground) / 0.55)' }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

    </nav>
  );
}
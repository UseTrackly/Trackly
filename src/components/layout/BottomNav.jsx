import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTabReset } from '@/lib/TabResetContext';
import { Home, Calculator, Users, Package, User } from 'lucide-react';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/calculator', icon: Calculator, label: 'Add Flip' },
  { path: '/inventory', icon: Package, label: 'Inventory' },
  { path: '/community', icon: Users, label: 'Community' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resetTab } = useTabReset();

  if (
    location.pathname === '/onboarding' ||
    location.pathname === '/onboarding-categories' ||
    location.pathname === '/upgrade'
  ) return null;

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="relative z-50 border-t border-white/[0.06] shrink-0 bg-background"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
      }}
    >
      {/* Subtle top shimmer */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), transparent)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="flex items-center justify-center gap-1"
        style={{ paddingTop: '8px', paddingBottom: '8px' }}
      >
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => (isActive ? resetTab(tab.path) : navigate(tab.path))}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex flex-col items-center gap-1.5 px-4 py-2 min-h-[48px] min-w-[64px] justify-center focus-visible:outline-none"
            >
              {/* Active background glow */}
              {isActive && (
                <div
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: 'hsl(var(--primary) / 0.08)',
                    boxShadow: '0 2px 8px hsl(var(--primary) / 0.15)',
                  }}
                />
              )}
              
              {/* Active indicator dot */}
              <div className="relative z-10">
                <Icon
                  className="transition-all duration-200"
                  style={{
                    width: 24,
                    height: 24,
                    color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--foreground) / 0.5)',
                    strokeWidth: isActive ? 2.5 : 1.5,
                    filter: isActive ? 'drop-shadow(0 0 6px hsl(var(--primary) / 0.4))' : 'none',
                  }}
                  aria-hidden="true"
                />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              
              <span
                className="relative z-10 text-[10px] font-semibold tracking-wide uppercase transition-all duration-200"
                style={{
                  color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--foreground) / 0.5)',
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                }}
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
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

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resetTab } = useTabReset();

  if (location.pathname === '/onboarding' || location.pathname === '/onboarding-categories' || location.pathname === '/upgrade') return null;

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-t border-white/[0.06]"
    >
      <div className="flex items-center justify-around" style={{ paddingTop: '8px', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}>
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => isActive ? resetTab(tab.path) : navigate(tab.path)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex flex-col items-center gap-1 px-5 py-2 min-h-[44px] min-w-[60px] justify-center focus-visible:outline-none"
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
                  color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.4)',
                  strokeWidth: isActive ? 2 : 1.5,
                }}
                aria-hidden="true"
              />
              <span
                className="text-[10px] font-medium tracking-wider uppercase transition-colors duration-200"
                style={{ color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.35)' }}
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
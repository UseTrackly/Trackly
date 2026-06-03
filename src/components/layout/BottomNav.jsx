import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTabReset } from '@/lib/TabResetContext';
import { Home, Calculator, Users, Package } from 'lucide-react';
import { motion } from 'framer-motion';

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

  if (location.pathname === '/onboarding' || location.pathname === '/onboarding-categories') return null;

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div
        className="flex items-center justify-around bg-background/60 backdrop-blur-3xl border-t border-white/[0.06]"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)', paddingTop: '8px' }}
      >
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          const handlePress = () => {
            if (isActive) resetTab(tab.path);
            else navigate(tab.path);
          };
          return (
            <button
              key={tab.path}
              onClick={handlePress}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex flex-col items-center gap-1 px-5 py-2 min-h-[44px] min-w-[60px] justify-center focus-visible:outline-none"
            >
              {/* Active glow dot above icon */}
              {isActive && (
                <motion.div
                  layoutId="navDot"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-primary"
                  style={{ boxShadow: '0 0 8px 2px hsl(var(--primary) / 0.6)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}

              <Icon
                className={`w-[22px] h-[22px] transition-all duration-300 ${
                  isActive ? 'text-primary' : 'text-muted-foreground/40'
                }`}
                strokeWidth={isActive ? 2 : 1.5}
                aria-hidden="true"
              />
              <span
                className={`text-[10px] font-medium tracking-wider uppercase transition-all duration-300 ${
                  isActive ? 'text-primary' : 'text-muted-foreground/35'
                }`}
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
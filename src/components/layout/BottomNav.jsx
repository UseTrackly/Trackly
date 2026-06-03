import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTabReset } from '@/lib/TabResetContext';
import { Home, Calculator, Users, Package } from 'lucide-react';
import { motion } from 'framer-motion';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/calculator', icon: Calculator, label: 'Calc' },
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
      {/* Frosted glass pill container */}
      <div className="mx-3 mb-3">
        <div className="flex items-center justify-around bg-card/70 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl px-2 py-1.5">
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
                className="relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl min-h-[44px] min-w-[44px] justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-all duration-200"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/15 rounded-xl"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon
                  className={`relative w-[22px] h-[22px] transition-all duration-200 ${
                    isActive ? 'text-primary' : 'text-muted-foreground/60'
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  aria-hidden="true"
                />
                <span
                  className={`relative text-[10px] font-semibold tracking-wide transition-all duration-200 ${
                    isActive ? 'text-primary' : 'text-muted-foreground/50'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
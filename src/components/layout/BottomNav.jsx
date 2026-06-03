import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTabReset } from '@/lib/TabResetContext';
import { Home, Calculator, Users, User, Package } from 'lucide-react';
import { motion } from 'framer-motion';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/calculator', icon: Calculator, label: 'Calculator' },
  { path: '/inventory', icon: Package, label: 'Inventory' },
  { path: '/community', icon: Users, label: 'Community' },
  { path: '/profile', icon: User, label: 'Profile' },
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
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around max-w-2xl mx-auto px-2 py-0.5">
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
              className="flex flex-col items-center gap-0.5 py-2 px-3 relative min-h-[44px] min-w-[44px] justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-lg"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                className={`w-5 h-5 transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
                strokeWidth={isActive ? 2.5 : 1.5}
                aria-hidden="true"
              />
              <span
                className={`text-xs font-medium transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
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
import React, { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const ROUTE_TABS = {
  '/calculator': [
    { value: 'calculator', label: 'Flip', emoji: '🔄' },
    { value: 'casino', label: 'Casino', emoji: '🎰' },
    { value: 'sports', label: 'Bets', emoji: '🏈' },
    { value: 'ai', label: 'AI', emoji: '✨' },
  ],
  '/inventory': [
    { value: 'inventory', label: 'Items', emoji: '📦' },
    { value: 'history', label: 'History', emoji: '📈' },
    { value: 'expenses', label: 'Expenses', emoji: '🧾' },
    { value: 'ai', label: 'AI', emoji: '✨' },
  ],
  '/community': [
    { value: 'community', label: 'Feed', emoji: '🔥' },
    { value: 'featured', label: 'Featured', emoji: '⭐' },
    { value: 'alerts', label: 'Alerts', emoji: '🔔' },
    { value: 'manage', label: 'Manage', emoji: '⚙️' },
  ],
};

export default function PageTabBar({ activeTab, onTabChange }) {
  const location = useLocation();
  const tabs = ROUTE_TABS[location.pathname];
  const activeRef = useRef(null);

  if (!tabs) return null;

  const activeIndex = tabs.findIndex(t => t.value === activeTab);

  return (
    <div
      className="shrink-0 z-30 relative"
      style={{
        background: 'hsl(var(--background) / 0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid hsl(var(--border))',
      }}
    >
      {/* Tab row */}
      <div className="flex items-stretch relative px-2">
        {tabs.map((tab, i) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              ref={isActive ? activeRef : null}
              onClick={() => onTabChange(tab.value)}
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all duration-200 focus-visible:outline-none"
              style={{ minWidth: 0 }}
            >
              {/* Active pill background */}
              {isActive && (
                <motion.div
                  layoutId="tab-pill"
                  className="absolute inset-x-1 inset-y-1 rounded-xl"
                  style={{
                    background: 'hsl(var(--primary) / 0.12)',
                    border: '1px solid hsl(var(--primary) / 0.25)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}

              {/* Emoji */}
              <span
                className="relative z-10 text-base leading-none transition-transform duration-200"
                style={{ transform: isActive ? 'scale(1.15)' : 'scale(1)' }}
              >
                {tab.emoji}
              </span>

              {/* Label */}
              <span
                className="relative z-10 text-[10px] font-semibold tracking-wide transition-colors duration-200"
                style={{
                  color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--foreground) / 0.45)',
                  letterSpacing: '0.04em',
                }}
              >
                {tab.label}
              </span>

              {/* Active dot indicator */}
              {isActive && (
                <motion.div
                  layoutId="tab-dot"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: 'hsl(var(--primary))' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
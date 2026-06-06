import React from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, History, Receipt, Package } from 'lucide-react';

// Per-route tab configs
const ROUTE_TABS = {
  '/calculator': [
    { value: 'calculator', label: 'Flip' },
    { value: 'casino', label: '🎰 Casino' },
    { value: 'sports', label: '🏈 Bets' },
    { value: 'ai', label: '💬 AI' },
  ],
  '/inventory': [
    { value: 'inventory', label: 'Items' },
    { value: 'history', label: 'History' },
    { value: 'expenses', label: 'Expenses' },
    { value: 'ai', label: '💬 AI' },
  ],
  '/community': [
    { value: 'community', label: 'Trackly' },
    { value: 'featured', label: 'Featured' },
    { value: 'alerts', label: 'Alerts' },
    { value: 'manage', label: 'Manage' },
  ],
};

export default function PageTabBar({ activeTab, onTabChange }) {
  const location = useLocation();
  const tabs = ROUTE_TABS[location.pathname];
  if (!tabs) return null;

  return (
    <div
      className="shrink-0 grid bg-card border-b border-border z-30"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
    >
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={`py-2.5 text-xs font-medium transition-colors border-b-2 ${
            activeTab === tab.value
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calculator, Users, History, User, ChevronDown, Package } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/calculator', icon: Calculator, label: 'Calculator' },
  { path: '/inventory', icon: Package, label: 'Inventory' },
  { path: '/community', icon: Users, label: 'Community' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function HeaderNav() {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on onboarding
  if (location.pathname === '/onboarding' || location.pathname === '/onboarding-categories') return null;

  return (
    <div className="fixed left-3 z-50" style={{ top: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/95 backdrop-blur-xl border border-border hover:border-primary/50 transition-colors">
          <img 
            src="https://media.base44.com/images/public/69bfd92e3db7d48eec6c8062/c29d404d0_logo_no_bg_final.png" 
            alt="Trackly" 
            className="h-5"
          />
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 bg-card/95 backdrop-blur-xl border-border">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <DropdownMenuItem
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 cursor-pointer ${
                  isActive ? 'bg-primary/10 text-primary' : ''
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
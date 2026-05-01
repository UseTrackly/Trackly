import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';

const CHILD_ROUTES = ['/terms', '/privacy'];
const ROOT_TABS = ['/', '/calculator', '/inventory', '/history', '/community', '/profile'];

export default function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === '/onboarding' || location.pathname === '/onboarding-categories') return null;

  const isChildPage = CHILD_ROUTES.includes(location.pathname);

  const PAGE_TITLES = {
    '/terms': 'Terms of Service',
    '/privacy': 'Privacy Policy',
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 bg-background/80 backdrop-blur-xl border-b border-border"
      style={{ paddingTop: 'calc(0.625rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.625rem' }}
    >
      {isChildPage ? (
        <>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <span className="text-sm font-semibold absolute left-1/2 -translate-x-1/2">
            {PAGE_TITLES[location.pathname] || ''}
          </span>
          <div className="w-12" />
        </>
      ) : (
        <>
          <img
            src="https://media.base44.com/images/public/69bfd92e3db7d48eec6c8062/c29d404d0_logo_no_bg_final.png"
            alt="Trackly"
            className="h-8"
          />
          <NotificationBell />
        </>
      )}
    </div>
  );
}
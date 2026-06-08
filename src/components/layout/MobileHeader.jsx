import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/notifications/NotificationBell';
import MessageInbox from '@/components/community/MessageInbox';
import SideDrawer from './SideDrawer';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useUserProfile } from '@/lib/useUserProfile';

const CHILD_ROUTES = ['/terms', '/privacy'];
const PAGE_TITLES = {
  '/terms': 'Terms of Service',
  '/privacy': 'Privacy Policy',
};

export default function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [inboxOpen, setInboxOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: profile } = useUserProfile(user);
  const avatarUrl = profile?.avatar_url || user?.profile_picture;

  const { data: messagesRaw = [] } = useQuery({
    queryKey: ['myMessages'],
    queryFn: () => base44.entities.Message.list('-created_date', 200),
    enabled: !!user,
    refetchInterval: 10000,
  });
  const unreadMsgCount = messagesRaw.filter(m => !m.is_read && m.recipient_email === user?.email).length;

  if (
    location.pathname === '/onboarding' ||
    location.pathname === '/onboarding-categories' ||
    location.pathname === '/upgrade'
  ) return null;

  const isChildPage = CHILD_ROUTES.includes(location.pathname);

  return (
    <>
      <div className="relative z-50 bg-background/80 backdrop-blur-xl border-b border-border shrink-0">
        <div
          className="flex items-center justify-between px-3"
          style={{
            paddingTop: 'max(env(safe-area-inset-top, 0px), 10px)',
            paddingBottom: '0.5rem',
          }}
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
              {/* Left: app logo / brand */}
              <div className="flex items-center gap-2">
                <img
                  src="https://media.base44.com/images/public/69bfd92e3db7d48eec6c8062/c29d404d0_logo_no_bg_final.png"
                  alt="Trackly"
                  style={{ height: 28, width: 'auto' }}
                />
              </div>

              {/* Right: notifications + hamburger */}
              <div className="flex items-center gap-1">
                <NotificationBell />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open navigation"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <MessageInbox open={inboxOpen} onClose={() => setInboxOpen(false)} />

      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenMessages={() => setInboxOpen(true)}
        user={user}
        profile={profile}
        unreadMsgCount={unreadMsgCount}
      />
    </>
  );
}
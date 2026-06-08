import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MessageCircle, History, Home, Calculator, Package, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/notifications/NotificationBell';
import MessageInbox from '@/components/community/MessageInbox';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useUserProfile } from '@/lib/useUserProfile';
import { useTabReset } from '@/lib/TabResetContext';

const CHILD_ROUTES = ['/terms', '/privacy'];

const NAV_ITEMS = [
  { path: '/',           icon: Home,       label: 'Home' },
  { path: '/calculator', icon: Calculator, label: 'Calc' },
  { path: '/inventory',  icon: Package,    label: 'Inventory' },
  { path: '/community',  icon: Users,      label: 'Community' },
];

export default function MobileHeader({ asFlexItem = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetTab } = useTabReset();
  const [inboxOpen, setInboxOpen] = useState(false);
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

  if (location.pathname === '/onboarding' || location.pathname === '/onboarding-categories' || location.pathname === '/upgrade') return null;

  const isChildPage = CHILD_ROUTES.includes(location.pathname);

  const PAGE_TITLES = {
    '/terms': 'Terms of Service',
    '/privacy': 'Privacy Policy',
  };

  const handleNav = (path) => {
    if (location.pathname === path) {
      resetTab(path);
    } else {
      navigate(path);
    }
  };

  return (
    <>
      <div
        className="relative z-50 bg-background/80 backdrop-blur-xl border-b border-border shrink-0"
      >
        {/* Top strip */}
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
              {/* Left: profile avatar */}
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 rounded-full bg-secondary border border-border overflow-hidden shrink-0 pr-2.5"
                aria-label="Profile"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {user?.full_name?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-xs font-semibold text-foreground">Profile</span>
              </button>

              {/* Right: history, messages, notifications */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/history')}
                  aria-label="History"
                >
                  <History className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => setInboxOpen(true)}
                >
                  <MessageCircle className="w-5 h-5" />
                  {unreadMsgCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                    </span>
                  )}
                </Button>
                <NotificationBell />
              </div>
            </>
          )}
        </div>

        {/* Bottom nav tab bar — only on main pages */}
        {!isChildPage && (
          <div className="flex items-center border-t border-border/50">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-2 relative"
                  aria-label={item.label}
                >
                  {isActive && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-primary"
                      style={{ boxShadow: '0 0 6px hsl(var(--primary) / 0.6)' }}
                    />
                  )}
                  <Icon
                    size={20}
                    style={{
                      color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--foreground) / 0.5)',
                      strokeWidth: isActive ? 2.2 : 1.6,
                    }}
                  />
                  <span
                    className="text-[10px] font-medium tracking-wide"
                    style={{ color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--foreground) / 0.5)' }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <MessageInbox open={inboxOpen} onClose={() => setInboxOpen(false)} />
    </>
  );
}
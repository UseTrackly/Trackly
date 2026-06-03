import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MessageCircle, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/notifications/NotificationBell';
import MessageInbox from '@/components/community/MessageInbox';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useTabReset } from '@/lib/TabResetContext';

const CHILD_ROUTES = ['/terms', '/privacy'];

export default function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [inboxOpen, setInboxOpen] = useState(false);
  const { resetTab } = useTabReset();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: messagesRaw = [] } = useQuery({
    queryKey: ['myMessages'],
    queryFn: () => base44.entities.Message.list('-created_date', 200),
    enabled: !!user,
    refetchInterval: 10000,
  });

  const unreadMsgCount = messagesRaw.filter(m => !m.is_read && m.recipient_email === user?.email).length;

  if (location.pathname === '/onboarding' || location.pathname === '/onboarding-categories') return null;

  const isChildPage = CHILD_ROUTES.includes(location.pathname);

  const PAGE_TITLES = {
    '/terms': 'Terms of Service',
    '/privacy': 'Privacy Policy',
  };

  return (
    <>
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
            {/* Left: profile avatar */}
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary border border-border overflow-hidden shrink-0"
              aria-label="Profile"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">
                  {user?.full_name?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </button>

            {/* Right: messages, notifications, history */}
            <div className="flex items-center gap-1">
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (location.pathname === '/history') resetTab('/history');
                  else navigate('/history');
                }}
                aria-label="History"
                className={location.pathname === '/history' ? 'text-primary' : ''}
              >
                <History className="w-5 h-5" />
              </Button>
            </div>
          </>
        )}
      </div>

      <MessageInbox open={inboxOpen} onClose={() => setInboxOpen(false)} />
    </>
  );
}
import React, { useState, useEffect, createContext, useContext } from 'react';
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

// Context for opening messages with a specific recipient
export const MessageContext = createContext(null);

export function MessageProvider({ children }) {
  const [messageState, setMessageState] = useState({ open: false, recipientEmail: null });
  
  const openMessagesWithUser = (recipientEmail) => {
    setMessageState({ open: true, recipientEmail });
  };
  
  const closeMessages = () => {
    setMessageState({ open: false, recipientEmail: null });
  };
  
  return (
    <MessageContext.Provider value={{ messageState, openMessagesWithUser, closeMessages }}>
      {children}
    </MessageContext.Provider>
  );
}

export function useMessageContext() {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessageContext must be used within MessageProvider');
  }
  return context;
}

export default function UnifiedHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { messageState, openMessagesWithUser, closeMessages } = useMessageContext();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [inboxPrefillUser, setInboxPrefillUser] = useState(null);

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
  
  // Handle navigation state from profile pages
  useEffect(() => {
    if (location.state?.openMessages && location.state?.prefillRecipient) {
      console.log('[UnifiedHeader] Opening messages with prefill:', location.state.prefillRecipient);
      setInboxPrefillUser(location.state.prefillRecipient);
      openMessagesWithUser(location.state.prefillRecipient);
      // Clear the state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  if (
    location.pathname === '/onboarding' ||
    location.pathname === '/onboarding-categories' ||
    location.pathname === '/upgrade'
  ) return null;

  const isChildPage = CHILD_ROUTES.includes(location.pathname);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          {isChildPage ? (
            <>
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px]"
                type="button"
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
              <div className="flex items-center gap-0.5">
                <NotificationBell />
                <button
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open navigation"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-secondary transition-colors text-foreground"
                >
                  <Menu className="w-4 h-4" />
                  <span className="text-sm font-semibold">Menu</span>
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <MessageInbox 
        open={messageState.open} 
        onClose={closeMessages} 
        preselectRecipientEmail={messageState.recipientEmail} 
      />

      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenMessages={() => openMessagesWithUser(null)}
        user={user}
        profile={profile}
        unreadMsgCount={unreadMsgCount}
      />
    </>
  );
}
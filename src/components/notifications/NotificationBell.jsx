import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import MessageInbox from '@/components/community/MessageInbox';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxFlipId, setInboxFlipId] = useState(null);
  const [inboxSenderEmail, setInboxSenderEmail] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: notificationsRaw } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.filter({
      user_email: user.email
    }, '-created_date', 50),
    enabled: !!user,
    initialData: [],
    refetchInterval: 10000,
  });
  const notifications = Array.isArray(notificationsRaw) ? notificationsRaw : [];

  useEffect(() => {
    if (!user) return;
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data.user_email === user.email) {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    });
    return unsubscribe;
  }, [user, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Notification.update(id, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notification) => {
    markReadMutation.mutate(notification.id);
    setOpen(false);
    if (notification.type === 'new_message') {
      setInboxFlipId(notification.metadata?.flip_id || null);
      setInboxSenderEmail(notification.metadata?.sender || null);
      setInboxOpen(true);
      return;
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-md text-foreground hover:bg-secondary transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel — fixed to avoid overflow:hidden clipping */}
      {open && (
        <div
          ref={panelRef}
          className="fixed right-3 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          style={{ top: 56, width: 300, zIndex: 99999, maxHeight: 400 }}
        >
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{unreadCount} unread</p>
            )}
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 340, WebkitOverflowScrolling: 'touch' }}>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No notifications yet</p>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left px-4 py-3 border-b border-border/40 last:border-0 transition-colors ${
                    notif.is_read ? 'hover:bg-secondary/40' : 'bg-primary/5 hover:bg-primary/10'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${notif.is_read ? 'bg-transparent' : 'bg-primary'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-snug">{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-snug">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">{format(new Date(notif.created_date), 'MMM d, h:mm a')}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <MessageInbox
        open={inboxOpen}
        onClose={() => { setInboxOpen(false); setInboxFlipId(null); setInboxSenderEmail(null); }}
        initialFlipId={inboxFlipId}
        initialSenderEmail={inboxSenderEmail}
      />
    </>
  );
}
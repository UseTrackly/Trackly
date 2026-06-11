import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0 bg-card border-border shadow-xl" align="end" sideOffset={8}>
          <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{unreadCount} unread</p>
              )}
            </div>
          </div>
          <div className="max-h-[360px] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                No notifications yet
              </p>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 last:border-0 transition-colors ${
                    notif.is_read ? 'hover:bg-secondary/40' : 'bg-primary/5 hover:bg-primary/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {!notif.is_read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                    {notif.is_read && <div className="w-1.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(notif.created_date), 'MMM d, h:mm a')}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      <MessageInbox
        open={inboxOpen}
        onClose={() => { setInboxOpen(false); setInboxFlipId(null); setInboxSenderEmail(null); }}
        initialFlipId={inboxFlipId}
        initialSenderEmail={inboxSenderEmail}
      />
    </>
  );
}
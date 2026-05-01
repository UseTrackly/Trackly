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

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.filter({
      user_email: user.email
    }, '-created_date', 50),
    enabled: !!user,
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Subscribe to real-time updates
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
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
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
      <PopoverContent className="w-80 p-0 bg-card border-border" align="end">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Notifications</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {unreadCount} unread
          </p>
        </div>
        <ScrollArea className="h-[400px]">
          <div className="p-2">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No notifications yet
              </p>
            ) : (
              <AnimatePresence>
                {notifications.map((notif, i) => (
                  <motion.button
                    key={notif.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left p-3 rounded-lg transition-colors mb-1 ${
                      notif.is_read
                        ? 'hover:bg-secondary/50'
                        : 'bg-primary/10 hover:bg-primary/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-medium text-sm">{notif.title}</h4>
                      {!notif.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(notif.created_date), 'MMM d, h:mm a')}
                    </p>
                  </motion.button>
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
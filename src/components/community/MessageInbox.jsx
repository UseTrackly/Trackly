import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Thread list item
function ThreadItem({ thread, onClick }) {
  const hasUnread = thread.messages.some(m => !m.is_read && m.recipient_email === thread.currentUserEmail);
  const latest = thread.messages[0];
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg mb-1.5 transition-colors ${hasUnread ? 'bg-primary/10' : 'bg-card hover:bg-secondary/50'} border border-border`}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-semibold text-sm truncate">{thread.otherName}</span>
        {hasUnread && <div className="w-2 h-2 rounded-full bg-primary shrink-0 ml-2" />}
      </div>
      <p className="text-xs text-muted-foreground truncate">{latest?.content}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        Re: {thread.flipName} · {latest ? format(new Date(latest.created_date), 'MMM d') : ''}
      </p>
    </button>
  );
}

// Conversation view
function Conversation({ thread, currentUser, onBack }) {
  const [text, setText] = useState('');
  const queryClient = useQueryClient();

  const { data: messagesRaw = [] } = useQuery({
    queryKey: ['messages', thread.flipId],
    queryFn: () => base44.entities.Message.filter({ community_flip_id: thread.flipId }, 'created_date', 200),
  });

  const messages = messagesRaw.filter(m =>
    (m.sender_email === currentUser.email && m.recipient_email === thread.otherEmail) ||
    (m.sender_email === thread.otherEmail && m.recipient_email === currentUser.email)
  );

  // Mark unread as read
  useEffect(() => {
    messages.filter(m => !m.is_read && m.recipient_email === currentUser.email).forEach(m => {
      base44.entities.Message.update(m.id, { is_read: true }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['myMessages'] });
      });
    });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (content) => base44.entities.Message.create({
      community_flip_id: thread.flipId,
      sender_email: currentUser.email,
      sender_name: currentUser.full_name,
      recipient_email: thread.otherEmail,
      content,
      is_read: false,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', thread.flipId] });
      queryClient.invalidateQueries({ queryKey: ['myMessages'] });
      setText('');
    },
    onError: () => toast.error('Failed to send'),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 pb-3 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <p className="font-semibold text-sm">{thread.otherName}</p>
          <p className="text-[10px] text-muted-foreground truncate">Re: {thread.flipName}</p>
        </div>
      </div>

      <ScrollArea className="flex-1 my-3">
        <div className="space-y-2 pr-2">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
          )}
          {messages.map(msg => {
            const isMe = msg.sender_email === currentUser.email;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-xl px-3 py-2 ${isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs opacity-70 mt-0.5">{format(new Date(msg.created_date), 'h:mm a')}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="flex gap-2 shrink-0">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && text.trim() && sendMutation.mutate(text)}
          placeholder="Type a message..."
          className="bg-background"
        />
        <Button
          onClick={() => text.trim() && sendMutation.mutate(text)}
          disabled={!text.trim() || sendMutation.isPending}
          size="icon"
          className="bg-primary hover:bg-primary/90 shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function MessageInbox({ open, onClose, initialFlipId = null }) {
  const [activeThread, setActiveThread] = useState(null);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: messagesRaw = [] } = useQuery({
    queryKey: ['myMessages'],
    queryFn: () => base44.entities.Message.list('-created_date', 200),
    enabled: !!user && open,
    refetchInterval: 8000,
  });

  const { data: flipsRaw = [] } = useQuery({
    queryKey: ['communityFlips'],
    queryFn: () => base44.entities.CommunityFlip.list('-created_date', 200),
    enabled: !!user && open,
  });

  // Build threads grouped by (flip_id, other_user)
  const threads = useMemo(() => {
    if (!user) return [];
    const myMessages = messagesRaw.filter(m =>
      m.sender_email === user.email || m.recipient_email === user.email
    );
    const threadMap = {};
    myMessages.forEach(m => {
      const otherEmail = m.sender_email === user.email ? m.recipient_email : m.sender_email;
      const otherName = m.sender_email === user.email ? m.recipient_email : m.sender_name;
      const key = `${m.community_flip_id}__${otherEmail}`;
      if (!threadMap[key]) {
        const flip = flipsRaw.find(f => f.id === m.community_flip_id);
        threadMap[key] = {
          key,
          flipId: m.community_flip_id,
          flipName: flip?.item_name || 'Flip',
          otherEmail,
          otherName,
          currentUserEmail: user.email,
          messages: [],
        };
      }
      threadMap[key].messages.push(m);
    });
    return Object.values(threadMap).sort((a, b) =>
      new Date(b.messages[0]?.created_date) - new Date(a.messages[0]?.created_date)
    );
  }, [messagesRaw, flipsRaw, user]);

  // Auto-open thread when initialFlipId provided
  useEffect(() => {
    if (!open || !initialFlipId || threads.length === 0) return;
    const match = threads.find(t => t.flipId === initialFlipId);
    if (match) setActiveThread(match);
  }, [open, initialFlipId, threads]);

  // Reset on close
  useEffect(() => {
    if (!open) setActiveThread(null);
  }, [open]);

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    return messagesRaw.filter(m => !m.is_read && m.recipient_email === user.email).length;
  }, [messagesRaw, user]);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-4 gap-0">
        <SheetHeader className="pb-3 shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Messages
            {unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          {activeThread ? (
            <Conversation
              thread={activeThread}
              currentUser={user}
              onBack={() => setActiveThread(null)}
            />
          ) : (
            <ScrollArea className="h-full">
              {threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageCircle className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Message sellers from the Community tab
                  </p>
                </div>
              ) : (
                <div className="pr-1">
                  {threads.map(thread => (
                    <motion.div
                      key={thread.key}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <ThreadItem thread={thread} onClick={() => setActiveThread(thread)} />
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
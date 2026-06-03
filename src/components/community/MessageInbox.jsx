import React, { useState, useMemo, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, MessageCircle, Image, Loader2, Ban, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
      <p className="text-xs text-muted-foreground truncate">{latest?.content || (latest?.image_url ? '📷 Image' : '')}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        Re: {thread.flipName} · {latest ? format(parseISO(latest.created_date.endsWith('Z') ? latest.created_date : latest.created_date + 'Z'), 'MMM d') : ''}
      </p>
    </button>
  );
}

// Conversation view
function Conversation({ thread, currentUser, onBack, onBlock, blockedUsers }) {
  const [text, setText] = useState('');
  const [uploadingImg, setUploadingImg] = useState(false);
  const queryClient = useQueryClient();
  const bottomRef = useRef(null);
  const isBlocked = blockedUsers?.includes(thread.otherEmail);

  const { data: messagesRaw = [] } = useQuery({
    queryKey: ['messages', thread.flipId],
    queryFn: () => base44.entities.Message.filter({ community_flip_id: thread.flipId }, 'created_date', 200),
    refetchInterval: 5000,
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

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (payload) => base44.entities.Message.create({
      community_flip_id: thread.flipId,
      sender_email: currentUser.email,
      sender_name: currentUser.full_name,
      recipient_email: thread.otherEmail,
      is_read: false,
      ...payload,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', thread.flipId] });
      queryClient.invalidateQueries({ queryKey: ['myMessages'] });
      setText('');
    },
    onError: () => toast.error('Failed to send'),
  });

  const handleSendText = () => {
    if (!text.trim()) return;
    sendMutation.mutate({ content: text });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingImg(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      sendMutation.mutate({ content: '📷 Image', image_url: file_url });
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImg(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <p className="font-semibold text-sm">{thread.otherName}</p>
            <p className="text-[10px] text-muted-foreground truncate">Re: {thread.flipName}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onBlock(thread.otherEmail, thread.otherName)}
          title={isBlocked ? 'Unblock user' : 'Block user'}
        >
          <Ban className="w-4 h-4" />
        </Button>
      </div>

      {isBlocked && (
        <div className="my-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs text-center">
          You have blocked this user. Unblock to send messages.
        </div>
      )}

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
                  {msg.image_url ? (
                    <img
                      src={msg.image_url}
                      alt="Sent image"
                      className="rounded-lg max-w-full max-h-48 object-cover cursor-pointer"
                      onClick={() => window.open(msg.image_url, '_blank')}
                    />
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                  <p className="text-xs opacity-70 mt-0.5">{format(parseISO(msg.created_date.endsWith('Z') ? msg.created_date : msg.created_date + 'Z'), 'h:mm a')}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {!isBlocked && (
      <div className="flex gap-2 shrink-0">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={uploadingImg}
          onClick={() => document.getElementById('msg-img-upload').click()}
        >
          {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4 text-muted-foreground" />}
        </Button>
        <input
          id="msg-img-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            e.stopPropagation();
            if (e.key === 'Enter' && text.trim()) handleSendText();
          }}
          placeholder="Type a message..."
          className="bg-background flex-1"
        />
          <Button
            onClick={handleSendText}
            disabled={!text.trim() || sendMutation.isPending}
            size="icon"
            className="bg-primary hover:bg-primary/90 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function MessageInbox({ open, onClose, initialFlipId = null, initialSenderEmail = null }) {
  const [activeThread, setActiveThread] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  // Fetch user's own profile to get blocked list
  const { data: myProfile } = useQuery({
    queryKey: ['myProfile'],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user.email }, '-created_date', 1),
    enabled: !!user && open,
    select: (data) => Array.isArray(data) ? data[0] : null,
  });
  const blockedUsers = myProfile?.blocked_users || [];

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

  const blockMutation = useMutation({
    mutationFn: async (emailToBlock) => {
      const currentBlocked = blockedUsers;
      const isBlocked = currentBlocked.includes(emailToBlock);
      const updated = isBlocked
        ? currentBlocked.filter(e => e !== emailToBlock)
        : [...currentBlocked, emailToBlock];

      if (myProfile?.id) {
        await base44.entities.UserProfile.update(myProfile.id, { blocked_users: updated });
      } else {
        await base44.entities.UserProfile.create({ user_email: user.email, blocked_users: updated });
      }
      return !isBlocked;
    },
    onSuccess: (nowBlocked, emailToBlock) => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      toast.success(nowBlocked ? `User blocked` : `User unblocked`);
    },
    onError: () => toast.error('Failed to update block status'),
  });

  const handleBlock = (email, name) => {
    const isBlocked = blockedUsers.includes(email);
    const label = isBlocked ? `Unblock ${name}?` : `Block ${name}?`;
    if (window.confirm(label + (isBlocked ? '' : ' They will no longer be able to message you or see your posts.'))) {
      blockMutation.mutate(email);
    }
  };

  // Fetch all user profiles to resolve display names
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['allProfiles'],
    queryFn: () => base44.entities.UserProfile.list('-created_date', 500),
    enabled: !!user && open,
  });

  const getDisplayName = (email, fallbackName) => {
    const profile = allProfiles.find(p => p.user_email === email);
    return profile?.display_name || profile?.username || fallbackName || email;
  };

  // Build threads grouped by other_user only (one tab per person)
  const threads = useMemo(() => {
    if (!user) return [];
    const myMessages = messagesRaw.filter(m =>
      m.sender_email === user.email || m.recipient_email === user.email
    );
    const threadMap = {};
    myMessages.forEach(m => {
      const otherEmail = m.sender_email === user.email ? m.recipient_email : m.sender_email;
      const fallbackName = m.sender_email === user.email ? m.recipient_email : m.sender_name;
      const key = otherEmail; // one thread per person
      if (!threadMap[key]) {
        const flip = flipsRaw.find(f => f.id === m.community_flip_id);
        threadMap[key] = {
          key,
          flipId: m.community_flip_id,
          flipName: flip?.item_name || 'Flip',
          otherEmail,
          otherName: getDisplayName(otherEmail, fallbackName),
          currentUserEmail: user.email,
          messages: [],
        };
      }
      threadMap[key].messages.push(m);
    });
    return Object.values(threadMap).sort((a, b) =>
      new Date(b.messages[0]?.created_date) - new Date(a.messages[0]?.created_date)
    );
  }, [messagesRaw, flipsRaw, user, allProfiles]);

  // Auto-open thread when initialFlipId + optional senderEmail provided
  useEffect(() => {
    if (!open || !initialFlipId || threads.length === 0) return;
    let match;
    if (initialSenderEmail) {
      match = threads.find(t => t.flipId === initialFlipId && t.otherEmail === initialSenderEmail);
    }
    if (!match) {
      match = threads.find(t => t.flipId === initialFlipId);
    }
    if (match) setActiveThread(match);
  }, [open, initialFlipId, initialSenderEmail, threads]);

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
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-4 gap-0"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 16px, 52px)' }}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader className="pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Messages
              {unreadCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10 rounded-full shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          {activeThread ? (
            <Conversation
              thread={activeThread}
              currentUser={user}
              onBack={() => setActiveThread(null)}
              onBlock={handleBlock}
              blockedUsers={blockedUsers}
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
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, MessageCircle, Image, Loader2, X, Search, Package } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimestamp(dateStr) {
  if (!dateStr) return '';
  try {
    const d = parseISO(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    return format(d, 'MMM d');
  } catch { return ''; }
}

// ─── Thread List Item ─────────────────────────────────────────────────────────

function ThreadItem({ thread, onClick, navigate, onClose }) {
  const hasUnread = thread.messages.some(m => !m.is_read && m.recipient_email === thread.currentUserEmail);
  const unreadCount = thread.messages.filter(m => !m.is_read && m.recipient_email === thread.currentUserEmail).length;
  const latest = thread.messages[0];
  const timestamp = latest ? formatTimestamp(latest.created_date) : '';

  const getPreview = () => {
    if (!latest) return 'Start a conversation';
    if (latest.image_url) return '📷 Sent an image';
    return latest.content;
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 transition-colors border-b border-border ${
        hasUnread ? 'bg-primary/5' : ''
      }`}
    >
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary border-2 border-border shrink-0">
          {thread.avatarUrl ? (
            <img src={thread.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
              {(thread.otherName || 'U')[0].toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="font-semibold text-sm truncate text-foreground">{thread.otherName}</span>
            <span className={`text-xs shrink-0 ${hasUnread ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
              {timestamp}
            </span>
          </div>

          {thread.flipName && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <Package className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate flex-1">{thread.flipName}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm truncate flex-1 ${hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {getPreview()}
            </p>
            {unreadCount > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Conversation View ────────────────────────────────────────────────────────

function Conversation({ thread, currentUser, onBack, navigate, onClose }) {
  const [text, setText] = useState('');
  const [uploadingImg, setUploadingImg] = useState(false);
  const queryClient = useQueryClient();
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const userEmail = currentUser?.email ?? '';

  const { data: messagesRaw = [] } = useQuery({
    queryKey: ['messages', thread.otherEmail],
    queryFn: () => base44.entities.Message.list('created_date', 500),
    refetchInterval: 5000,
    enabled: !!userEmail,
  });

  const messages = messagesRaw.filter(m =>
    (m.sender_email === userEmail && m.recipient_email === thread.otherEmail) ||
    (m.sender_email === thread.otherEmail && m.recipient_email === userEmail)
  );

  // Mark incoming as read
  useEffect(() => {
    if (!userEmail) return;
    messages
      .filter(m => !m.is_read && m.recipient_email === userEmail)
      .forEach(m => {
        base44.entities.Message.update(m.id, { is_read: true })
          .then(() => queryClient.invalidateQueries({ queryKey: ['myMessages'] }))
          .catch(() => {});
      });
  }, [messages.length, userEmail]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (payload) =>
      base44.entities.Message.create({
        community_flip_id: thread.flipId,
        sender_email: userEmail,
        sender_name: currentUser?.full_name || 'User',
        recipient_email: thread.otherEmail,
        is_read: false,
        ...payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', thread.flipId, thread.otherEmail] });
      queryClient.invalidateQueries({ queryKey: ['myMessages'] });
      setText('');
    },
    onError: () => toast.error('Failed to send'),
  });

  if (!userEmail) return null;

  const handleSend = () => {
    if (!text.trim() || sendMutation.isPending) return;
    sendMutation.mutate({ content: text.trim() });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadingImg(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      sendMutation.mutate({ content: '📷 Photo', image_url: file_url });
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImg(false);
    }
  };

  const handleFileButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  return (
    <div
      className="flex flex-col"
      style={{ flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: 'hsl(var(--background))' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 border-b border-border shrink-0 bg-background/90 backdrop-blur-sm" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)', paddingBottom: '12px' }}>
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 -ml-2 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <button
          type="button"
          onClick={() => {
            const routeParam = thread.otherUsername || thread.otherEmail;
            if (routeParam) {
              onClose?.();
              navigate(`/profile/${encodeURIComponent(routeParam)}`);
            }
          }}
          className="flex-1 min-w-0 text-left"
        >
          <p className="font-semibold text-base truncate">{thread.otherName}</p>
          {thread.flipName && (
            <p className="text-xs text-muted-foreground truncate">{thread.flipName}</p>
          )}
        </button>
      </div>

      {/* Messages — native scroll */}
      <div
        className="flex-1 px-4 py-4 space-y-3 overflow-y-auto"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', minHeight: 0 }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-3">
              <MessageCircle className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">No messages yet</p>
            <p className="text-xs text-muted-foreground">Start the conversation!</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_email === userEmail;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                }`}>
                  {msg.image_url ? (
                    <img
                      src={msg.image_url}
                      alt=""
                      className="rounded-xl max-w-full max-h-64 object-cover cursor-pointer"
                      onClick={() => window.open(msg.image_url, '_blank')}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-3 py-3 border-t border-border bg-background shrink-0"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
      >
        <button
          type="button"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary text-muted-foreground shrink-0"
          onPointerDown={handleFileButtonClick}
          disabled={uploadingImg}
        >
          {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
        </button>

        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Message..."
          className="flex-1 h-10 rounded-full bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-white shrink-0 disabled:opacity-40"
        >
          {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          onClick={e => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

// ─── Main MessageInbox ────────────────────────────────────────────────────────

export default function MessageInbox({ open, onClose, preselectRecipientEmail, preselectFlipId }) {
  const [selectedThread, setSelectedThread] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: messages = [] } = useQuery({
    queryKey: ['myMessages'],
    queryFn: () => base44.entities.Message.list('-created_date', 200),
    enabled: open && !!user,
    refetchInterval: 10000,
  });

  const { data: flips = [] } = useQuery({
    queryKey: ['communityFlips'],
    queryFn: () => base44.entities.CommunityFlip.list('-created_date', 200),
    enabled: open,
    initialData: [],
  });

  const { data: allProfiles = [] } = useQuery({
    queryKey: ['allProfilesForMessages'],
    queryFn: () => base44.entities.UserProfile.list('-created_date', 500),
    enabled: open,
    staleTime: 60_000,
  });

  // Build threads grouped by (otherEmail, flipId) — one thread per unique conversation
  const threads = useMemo(() => {
    if (!user) return [];
    // Key = otherEmail so we show one thread per person (latest flip context)
    const map = new Map();
    messages.forEach(m => {
      const otherEmail = m.sender_email === user.email ? m.recipient_email : m.sender_email;
      const key = otherEmail; // group by person, not flip

      if (!map.has(key)) {
        const flip = flips.find(f => f.id === m.community_flip_id);
        const profile = allProfiles.find(p => p.user_email === otherEmail);

        // Resolve display name: profile > flip.posted_by_name (if other is seller) > sender_name field
        let displayName = profile?.display_name || profile?.username;
        if (!displayName) {
          // try to get name from flip data
          if (flip && flip.posted_by === otherEmail) displayName = flip.posted_by_name;
        }
        if (!displayName) {
          // fall back to sender_name stored on a message from that person
          const theirMsg = messages.find(msg => msg.sender_email === otherEmail);
          displayName = theirMsg?.sender_name;
        }
        if (!displayName || displayName === 'User') displayName = profile?.username || otherEmail.split('@')[0];

        map.set(key, {
          otherEmail,
          otherName: displayName,
          otherUsername: profile?.username,
          flipId: m.community_flip_id,
          flipName: flip?.item_name,
          flipPrice: flip?.price,
          messages: [],
          currentUserEmail: user.email,
          avatarUrl: profile?.avatar_url,
        });
      }
      map.get(key).messages.push(m);
    });

    return Array.from(map.values()).sort((a, b) => {
      const aDate = a.messages[0]?.created_date || '';
      const bDate = b.messages[0]?.created_date || '';
      return bDate.localeCompare(aDate);
    });
  }, [messages, flips, user, allProfiles]);

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(t =>
      t.otherName?.toLowerCase().includes(q) ||
      t.flipName?.toLowerCase().includes(q) ||
      t.messages.some(m => m.content?.toLowerCase().includes(q))
    );
  }, [threads, searchQuery]);

  // Auto-select thread when Contact Seller provides a preselect
  useEffect(() => {
    if (!open || !user || !preselectRecipientEmail) return;

    const existing = threads.find(t => t.otherEmail === preselectRecipientEmail);
    if (existing) {
      setSelectedThread(existing);
      return;
    }

    // No existing thread yet — build a placeholder from known data
    const recipientProfile = allProfiles.find(p => p.user_email === preselectRecipientEmail);
    const flip = preselectFlipId ? flips.find(f => f.id === preselectFlipId) : null;

    let displayName = recipientProfile?.display_name || recipientProfile?.username;
    if (!displayName && flip?.posted_by === preselectRecipientEmail) displayName = flip?.posted_by_name;
    if (!displayName || displayName === 'User') displayName = preselectRecipientEmail.split('@')[0];

    setSelectedThread({
      otherEmail: preselectRecipientEmail,
      otherName: displayName,
      otherUsername: recipientProfile?.username,
      flipId: preselectFlipId || null,
      flipName: flip?.item_name,
      flipPrice: flip?.price,
      messages: [],
      currentUserEmail: user.email,
      avatarUrl: recipientProfile?.avatar_url,
    });
  }, [open, preselectRecipientEmail, preselectFlipId, user, threads.length, allProfiles.length, flips.length]);

  // Reset selected thread when inbox closes
  useEffect(() => {
    if (!open) {
      setSelectedThread(null);
      setSearchQuery('');
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="p-0 border-l border-border"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: 480,
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'hsl(var(--background))',
        }}
      >
        {/* ── Thread list header ─────────────────────── */}
        {!selectedThread && (
          <div
            className="flex flex-col gap-3 px-4 border-b border-border shrink-0 bg-background"
            style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)', paddingBottom: '12px' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Messages</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="pl-9 h-10 bg-secondary border-0"
              />
            </div>
          </div>
        )}

        {/* ── Content ────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {!selectedThread ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 overflow-y-auto"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {filteredThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-3">
                    <MessageCircle className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-base font-semibold mb-1">
                    {searchQuery ? 'No matching conversations' : 'No messages yet'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'Try a different search term' : 'Express interest on a listing to start chatting!'}
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {filteredThreads.map(thread => (
                    <ThreadItem
                      key={thread.otherEmail}
                      thread={thread}
                      onClick={() => setSelectedThread(thread)}
                      navigate={navigate}
                      onClose={onClose}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="conversation"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col"
              style={{ minHeight: 0, overflow: 'hidden' }}
            >
              <Conversation
                thread={selectedThread}
                currentUser={user}
                onBack={() => setSelectedThread(null)}
                navigate={navigate}
                onClose={onClose}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
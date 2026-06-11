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
import ProfileLink from '@/components/shared/ProfileLink';
import EmptyState from '@/components/shared/EmptyState';


function ThreadItem({ thread, onClick, navigate, onClose }) {
  const hasUnread = thread.messages.some(m => !m.is_read && m.recipient_email === thread.currentUserEmail);
  const latest = thread.messages[0];
  const timestamp = latest ? format(parseISO(latest.created_date.endsWith('Z') ? latest.created_date : latest.created_date + 'Z'), 'MMM d') : '';
  const unreadCount = thread.messages.filter(m => !m.is_read && m.recipient_email === thread.currentUserEmail).length;
  
  const handleProfileClick = (e) => {
    e.stopPropagation();
    const routeParam = thread.otherUsername || thread.otherEmail;
    if (routeParam) {
      onClose?.();
      navigate(`/profile/${encodeURIComponent(routeParam)}`);
    }
  };
  
  // Generate preview text
  const getPreview = () => {
    if (!latest) return 'Start a conversation';
    if (latest.image_url) return '📷 Sent an image';
    return latest.content;
  };
  
  const preview = getPreview();
  
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 transition-colors border-b border-border ${
        hasUnread ? 'bg-primary/5' : 'hover:bg-secondary/50'
      }`}
    >
      <div className="flex gap-3">
        {/* User avatar - always show user's profile photo or initial */}
        <button
          onClick={handleProfileClick}
          className="cursor-pointer shrink-0 hover:opacity-80"
          type="button"
        >
          <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary border-2 border-border">
            {thread.avatarUrl ? (
              <img src={thread.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                {thread.otherName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
        </button>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header: name + date */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="font-semibold text-sm truncate text-foreground">{thread.otherName}</span>
            <span className={`text-xs shrink-0 ${hasUnread ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
              {timestamp}
            </span>
          </div>
          
          {/* Listing title + price (grouped together) */}
          {thread.flipName && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <Package className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate flex-1">{thread.flipName}</span>
              {thread.flipPrice && (
                <span className="text-xs font-semibold text-primary shrink-0">${thread.flipPrice.toFixed(0)}</span>
              )}
            </div>
          )}
          
          {/* Message preview + unread indicator */}
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm truncate flex-1 ${hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {preview}
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

function Conversation({ thread, currentUser, onBack, onBlock, blockedUsers, navigate, onClose }) {
  const [text, setText] = useState('');
  const [uploadingImg, setUploadingImg] = useState(false);

  const queryClient = useQueryClient();
  const bottomRef = useRef(null);
  const isBlocked = blockedUsers?.includes(thread.otherEmail);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingImg(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      sendMutation.mutate({ content: '📷 Photo', image_url: file_url });
    } catch { toast.error('Failed to upload'); }
    finally { setUploadingImg(false); }
  };

  const { data: messagesRaw = [] } = useQuery({
    queryKey: ['messages', thread.flipId],
    queryFn: () => base44.entities.Message.filter({ community_flip_id: thread.flipId }, 'created_date', 200),
    refetchInterval: 5000,
  });

  const messages = messagesRaw.filter(m =>
    (m.sender_email === currentUser.email && m.recipient_email === thread.otherEmail) ||
    (m.sender_email === thread.otherEmail && m.recipient_email === currentUser.email)
  );

  useEffect(() => {
    messages.filter(m => !m.is_read && m.recipient_email === currentUser.email).forEach(m => {
      base44.entities.Message.update(m.id, { is_read: true }).then(() => queryClient.invalidateQueries({ queryKey: ['myMessages'] }));
    });
  }, [messages.length]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (payload) => {
      const senderDisplayName = currentUser?.full_name || 'User';
      return base44.entities.Message.create({
        community_flip_id: thread.flipId,
        sender_email: currentUser.email,
        sender_name: senderDisplayName,
        recipient_email: thread.otherEmail,
        is_read: false,
        ...payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', thread.flipId], queryKey: ['myMessages'] });
      setText('');
    },
    onError: () => toast.error('Failed to send'),
  });

  return (
    <div className="flex flex-col bg-background" style={{ height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div 
        className="flex items-center gap-3 px-4 border-b border-border shrink-0 bg-background/80 backdrop-blur-sm"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)', paddingBottom: '12px' }}
      >
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <button
          onClick={() => {
            const routeParam = thread.otherUsername || thread.otherEmail;
            console.log('[Conversation Header] Profile click:', {
              selectedUserEmail: thread.otherEmail,
              selectedUsername: thread.otherUsername,
              selectedName: thread.otherName,
              routeParam,
              finalRoute: `/profile/${encodeURIComponent(routeParam)}`
            });
            if (routeParam) {
              // Close sheet first, then navigate
              onClose?.();
              navigate(`/profile/${encodeURIComponent(routeParam)}`);
            }
          }}
          className="flex-1 min-w-0 text-left cursor-pointer hover:opacity-80"
          type="button"
        >
          <div className="min-w-0">
            <p className="font-semibold text-base truncate text-foreground">{thread.otherName}</p>
            {thread.otherUsername && (
              <p className="text-[10px] text-muted-foreground">@{thread.otherUsername}</p>
            )}
          </div>
        </button>
      </div>

      {isBlocked && (
        <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
          You have blocked this user.
        </div>
      )}

      {/* Messages — native scroll for iOS compatibility */}
      <div
        ref={(el) => { if (el) el._scrollEl = el; }}
        className="flex-1 px-4 py-4 space-y-3 overflow-y-auto"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', minHeight: 0 }}
      >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-base font-semibold text-foreground mb-1">No messages yet</p>
              <p className="text-sm text-muted-foreground">Start the conversation!</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.sender_email === currentUser.email;
              return (
                <motion.div 
                  key={msg.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMe 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-foreground'
                  }`}>
                    {msg.image_url ? (
                      <img src={msg.image_url} alt="" className="rounded-xl max-w-full max-h-64 object-cover" onClick={() => window.open(msg.image_url, '_blank')} />
                    ) : (
                      <p className="text-base leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!isBlocked && (
        <div 
          className="flex items-center gap-2 px-4 border-t border-border bg-background shrink-0"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)', paddingTop: '12px' }}
        >
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 shrink-0" 
            disabled={uploadingImg} 
            onClick={() => document.getElementById('msg-img-upload').click()}
          >
            {uploadingImg ? <Loader2 className="w-5 h-5 animate-spin" /> : <Image className="w-5 h-5 text-muted-foreground" />}
          </Button>
          <Input 
            value={text} 
            onChange={e => setText(e.target.value)} 
            onKeyPress={e => e.key === 'Enter' && !e.shiftKey && text.trim() && sendMutation.mutate({ content: text })} 
            placeholder="Message..." 
            className="flex-1 h-10 rounded-full bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary" 
          />
          <Button 
            type="button" 
            onClick={() => text.trim() && sendMutation.mutate({ content: text })} 
            disabled={!text.trim() || sendMutation.isPending} 
            className="h-10 w-10 rounded-full shrink-0 bg-primary hover:bg-primary/90"
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
          <input id="msg-img-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </div>
      )}


    </div>
  );
}

export default function MessageInbox({ open, onClose, preselectRecipientEmail, preselectFlipId }) {
  const [selectedThread, setSelectedThread] = useState(null);
  const [blockDialog, setBlockDialog] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: myProfileRaw = [] } = useQuery({ queryKey: ['myProfile'], queryFn: () => base44.entities.UserProfile.filter({ user_email: user?.email }, '-created_date', 1), enabled: !!user });
  const blockedUsers = myProfileRaw?.[0]?.blocked_users || [];
  const { data: messages = [] } = useQuery({ queryKey: ['myMessages'], queryFn: () => base44.entities.Message.list('-created_date', 200), enabled: open, refetchInterval: 10000 });
  const { data: flips = [] } = useQuery({ queryKey: ['communityFlips'], queryFn: () => base44.entities.CommunityFlip.list('-created_date', 200), enabled: open });
  
  // Fetch all user profiles for consistent identity display
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['allProfilesForMessages'],
    queryFn: () => base44.entities.UserProfile.list('-created_date', 500),
    enabled: open,
    initialData: [],
  });

  const threads = useMemo(() => {
    if (!user) return [];
    const map = new Map();
    messages.forEach(m => {
      const otherEmail = m.sender_email === user.email ? m.recipient_email : m.sender_email;
      if (!map.has(otherEmail)) {
        const flip = flips.find(f => f.id === m.community_flip_id);
        const profile = allProfiles.find(p => p.user_email === otherEmail);
        const displayName = profile?.display_name || profile?.username || (m.sender_email === user.email ? m.recipient_name : m.sender_name) || 'User';
        const username = profile?.username;
        const avatarUrl = profile?.avatar_url;
        map.set(otherEmail, { 
          otherEmail, 
          otherName: displayName,
          otherUsername: username,
          flipId: m.community_flip_id, 
          flipName: flip?.item_name,
          flipPrice: flip?.price,
          flipImage: flip?.image_url,
          messages: [], 
          currentUserEmail: user.email, 
          avatarUrl
        });
      }
      map.get(otherEmail).messages.push(m);
    });
    return Array.from(map.values()).sort((a, b) => {
      const aUnread = a.messages.some(m => !m.is_read && m.recipient_email === user.email);
      const bUnread = b.messages.some(m => !m.is_read && m.recipient_email === user.email);
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;
      return b.messages[0]?.created_date.localeCompare(a.messages[0]?.created_date);
    });
  }, [messages, flips, user, allProfiles]);
  
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const query = searchQuery.toLowerCase();
    return threads.filter(t => 
      t.otherName?.toLowerCase().includes(query) ||
      t.flipName?.toLowerCase().includes(query) ||
      t.messages.some(m => m.content?.toLowerCase().includes(query))
    );
  }, [threads, searchQuery]);

  // Auto-select conversation when preselectRecipientEmail is provided
  useEffect(() => {
    if (preselectRecipientEmail && open && user && !selectedThread) {
      const recipientEmail = preselectRecipientEmail;
      // Find existing thread with this user for this flip (or any thread with this user)
      const existingThread = preselectFlipId
        ? threads.find(t => t.otherEmail === recipientEmail && t.flipId === preselectFlipId)
          || threads.find(t => t.otherEmail === recipientEmail)
        : threads.find(t => t.otherEmail === recipientEmail);

      if (existingThread) {
        setSelectedThread(existingThread);
      } else {
        // No existing thread — create a placeholder thread for new conversation
        const recipientProfile = allProfiles.find(p => p.user_email === recipientEmail);
        const flip = preselectFlipId ? flips.find(f => f.id === preselectFlipId) : null;
        const newThread = {
          otherEmail: recipientEmail,
          otherName: recipientProfile?.display_name || recipientProfile?.username || 'User',
          otherUsername: recipientProfile?.username,
          flipId: preselectFlipId || null,
          flipName: flip?.item_name,
          flipPrice: flip?.price,
          flipImage: flip?.image_url,
          messages: [],
          currentUserEmail: user.email,
          avatarUrl: recipientProfile?.avatar_url,
        };
        setSelectedThread(newThread);
      }
    }
  }, [preselectRecipientEmail, preselectFlipId, open, user, threads.length, allProfiles]);

  const confirmBlock = async () => {
    try {
      const current = myProfileRaw?.[0]?.blocked_users || [];
      const updated = current.includes(blockDialog.email) ? current.filter(e => e !== blockDialog.email) : [...current, blockDialog.email];
      await base44.entities.UserProfile.update(myProfileRaw[0].id, { blocked_users: updated });
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      toast.success(updated.includes(blockDialog.email) ? 'User blocked' : 'User unblocked');
    } catch { toast.error('Failed'); }
    setBlockDialog(null);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full max-w-md p-0 bg-background border-l border-border flex flex-col" style={{ height: '100dvh', maxHeight: '100dvh' }}>
          <SheetHeader className="px-4 border-b border-border shrink-0" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)', paddingBottom: '12px' }}>
            <div className="flex items-center justify-between mb-3">
              <SheetTitle className="text-2xl font-bold text-foreground">Messages</SheetTitle>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="pl-9 h-10 bg-secondary border-0"
              />
            </div>
          </SheetHeader>
          <AnimatePresence mode="wait">
            {!selectedThread ? (
              <motion.div 
                key="list" 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }} 
                className="flex-1 overflow-y-auto"
              >
                {filteredThreads.length === 0 ? (
                  searchQuery ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                      <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-base font-semibold text-foreground mb-1">No matching conversations</p>
                      <p className="text-sm text-muted-foreground">Try a different search term</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                      <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                        <MessageCircle className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-base font-semibold text-foreground mb-1">No messages yet</p>
                      <p className="text-sm text-muted-foreground">Express interest on a listing to start chatting!</p>
                    </div>
                  )
                ) : (
                  <div className="py-2">
                    {filteredThreads.map(thread => (
                      <ThreadItem key={thread.otherEmail} thread={thread} onClick={() => setSelectedThread(thread)} navigate={navigate} onClose={onClose} />
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
              >
                <Conversation thread={selectedThread} currentUser={user} onBack={() => setSelectedThread(null)} onBlock={(email, name) => setBlockDialog({ email, name })} blockedUsers={blockedUsers} navigate={navigate} onClose={onClose} />
              </motion.div>
            )}
          </AnimatePresence>
        </SheetContent>
      </Sheet>
      {blockDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setBlockDialog(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-80 max-w-[90vw] rounded-2xl bg-card border border-border p-6 shadow-2xl">
            <h3 className="text-base font-semibold mb-2">{blockedUsers?.includes(blockDialog.email) ? 'Unblock User?' : 'Block User?'}</h3>
            <p className="text-sm text-muted-foreground mb-4">{blockedUsers?.includes(blockDialog.email) ? `You will be able to receive messages from ${blockDialog.name} again.` : `You won't be able to send or receive messages from ${blockDialog.name}.`}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBlockDialog(null)} className="flex-1">Cancel</Button>
              <Button variant={blockedUsers?.includes(blockDialog.email) ? 'default' : 'destructive'} onClick={confirmBlock} className="flex-1">{blockedUsers?.includes(blockDialog.email) ? 'Unblock' : 'Block'}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
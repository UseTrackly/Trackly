import React, { useState, useMemo, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, MessageCircle, Image, Loader2, Ban, X, User, UserCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import ProfileLink from '@/components/shared/ProfileLink';
import EmptyState from '@/components/shared/EmptyState';
import ConversationProfilePanel from '@/components/community/ConversationProfilePanel';

function ThreadItem({ thread, onClick, onProfileClick }) {
  const hasUnread = thread.messages.some(m => !m.is_read && m.recipient_email === thread.currentUserEmail);
  const latest = thread.messages[0];
  const timestamp = latest ? format(parseISO(latest.created_date.endsWith('Z') ? latest.created_date : latest.created_date + 'Z'), 'MMM d') : '';
  
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl mb-1.5 transition-all border ${
        hasUnread ? 'bg-primary/5 border-primary/20' : 'bg-card/60 backdrop-blur-xl border-border/50 hover:bg-card/80'
      }`}
    >
      <div className="flex items-start gap-3">
        <div onClick={(e) => { e.stopPropagation(); onProfileClick?.(); }} className="cursor-pointer shrink-0 hover:opacity-80">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary border-2 border-border/50">
            {thread.avatarUrl ? (
              <img src={thread.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                {thread.otherName[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <ProfileLink userEmail={thread.otherEmail} username={thread.otherName} userName={thread.otherName} showAvatar={false} onClick={(e) => { e.stopPropagation(); onProfileClick?.(); }} className="flex-1 min-w-0">
              <span className="font-semibold text-sm truncate block hover:text-primary">{thread.otherName}</span>
            </ProfileLink>
            <span className="text-[10px] text-muted-foreground shrink-0">{timestamp}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate mb-1">{latest?.content || (latest?.image_url ? '📷 Photo' : '')}</p>
          <p className="text-[9px] text-muted-foreground/70">Re: {thread.flipName}</p>
        </div>
        {hasUnread && <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 ml-1 mt-1" />}
      </div>
    </button>
  );
}

function Conversation({ thread, currentUser, senderName, onBack, onBlock, blockedUsers, onViewProfile }) {
  const [text, setText] = useState('');
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
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
    mutationFn: (payload) => base44.entities.Message.create({
      community_flip_id: thread.flipId,
      sender_email: currentUser.email,
      sender_name: senderName || currentUser.full_name || currentUser.email.split('@')[0],
      recipient_email: thread.otherEmail,
      is_read: false,
      ...payload,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', thread.flipId], queryKey: ['myMessages'] });
      setText('');
    },
    onError: () => toast.error('Failed to send'),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
          <ProfileLink userEmail={thread.otherEmail} username={thread.otherName} userName={thread.otherName} showAvatar={true} className="flex-1 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{thread.otherName}</p>
              <p className="text-[10px] text-muted-foreground truncate">Re: {thread.flipName}</p>
            </div>
          </ProfileLink>
          <Button variant="ghost" size="sm" onClick={() => setShowProfilePanel(true)} className="h-8 px-2 text-xs gap-1"><UserCircle className="w-3.5 h-3.5" /> Profile</Button>
          <Button variant="ghost" size="icon" onClick={() => onBlock(thread.otherEmail, thread.otherName)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Ban className="w-4 h-4" /></Button>
        </div>
      </div>

      {isBlocked && <div className="my-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs text-center">You have blocked this user.</div>}

      <ScrollArea className="flex-1 my-3">
        <div className="space-y-2 pr-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-3"><MessageCircle className="w-6 h-6 text-muted-foreground" /></div>
              <p className="text-sm font-medium text-foreground mb-1">No messages yet</p>
              <p className="text-xs text-muted-foreground">Start the conversation!</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.sender_email === currentUser.email;
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-xl px-3 py-2.5 ${isMe ? 'bg-primary text-primary-foreground' : 'bg-card/80 backdrop-blur-xl border border-border/50'}`}>
                    {msg.image_url ? (
                      <img src={msg.image_url} alt="" className="rounded-lg max-w-full max-h-48 object-cover cursor-pointer" onClick={() => window.open(msg.image_url, '_blank')} />
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    )}
                    <p className={`text-[10px] mt-1 ${isMe ? 'opacity-70' : 'text-muted-foreground'}`}>{format(parseISO(msg.created_date.endsWith('Z') ? msg.created_date : msg.created_date + 'Z'), 'h:mm a')}</p>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {!isBlocked && (
        <div className="flex gap-2 shrink-0 pt-2 border-t border-border">
          <Button type="button" variant="outline" size="icon" className="h-10 w-10" disabled={uploadingImg} onClick={() => document.getElementById('msg-img-upload').click()}>
            {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4 text-muted-foreground" />}
          </Button>
          <Input value={text} onChange={e => setText(e.target.value)} onKeyPress={e => e.key === 'Enter' && !e.shiftKey && text.trim() && sendMutation.mutate({ content: text })} placeholder="Type a message..." className="flex-1 bg-background/50" />
          <Button type="button" onClick={() => text.trim() && sendMutation.mutate({ content: text })} disabled={!text.trim() || sendMutation.isPending} className="h-10 px-4">
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
          <input id="msg-img-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </div>
      )}

      <ConversationProfilePanel
        open={showProfilePanel}
        onClose={() => setShowProfilePanel(false)}
        otherEmail={thread.otherEmail}
        currentUser={currentUser}
      />
    </div>
  );
}

export default function MessageInbox({ open, onClose }) {
  const [selectedThread, setSelectedThread] = useState(null);
  const [blockDialog, setBlockDialog] = useState(null);
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: myProfileRaw = [] } = useQuery({ queryKey: ['myProfile'], queryFn: () => base44.entities.UserProfile.filter({ user_email: user?.email }, '-created_date', 1), enabled: !!user });
  const blockedUsers = myProfileRaw?.[0]?.blocked_users || [];
  const { data: messages = [] } = useQuery({ queryKey: ['myMessages'], queryFn: () => base44.entities.Message.list('-created_date', 200), enabled: open, refetchInterval: 10000 });
  const { data: flips = [] } = useQuery({ queryKey: ['communityFlips'], queryFn: () => base44.entities.CommunityFlip.list('-created_date', 200), enabled: open });

  const threads = useMemo(() => {
    if (!user) return [];
    const map = new Map();
    messages.forEach(m => {
      const otherEmail = m.sender_email === user.email ? m.recipient_email : m.sender_email;
      const otherName = m.sender_email === user.email ? m.recipient_name : m.sender_name;
      if (!map.has(otherEmail)) {
        const flip = flips.find(f => f.id === m.community_flip_id);
        map.set(otherEmail, { otherEmail, otherName: otherName || otherEmail.split('@')[0], flipId: m.community_flip_id, flipName: flip?.item_name || 'Flip', messages: [], currentUserEmail: user.email, avatarUrl: null });
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
  }, [messages, flips, user]);

  useEffect(() => {
    threads.forEach(t => {
      base44.entities.UserProfile.filter({ user_email: t.otherEmail }, '-created_date', 1).then(p => { if (p?.[0]?.avatar_url) t.avatarUrl = p[0].avatar_url; });
    });
  }, [threads.length]);

  const handleViewProfile = () => { if (selectedThread) window.open(`/profile/${encodeURIComponent(selectedThread.otherName)}`, '_blank'); };

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
        <SheetContent side="right" className="w-full max-w-md p-0 bg-background border-l border-border flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold">Messages</SheetTitle>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
          </SheetHeader>
          <AnimatePresence mode="wait">
            {!selectedThread ? (
              <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 overflow-y-auto p-4">
                {threads.length === 0 ? (
                  <EmptyState icon={MessageCircle} title="No messages yet" description="Start a conversation on a community flip!" />
                ) : (
                  <div className="space-y-1">
                    {threads.map(thread => (
                      <ThreadItem key={thread.otherEmail} thread={thread} onClick={() => setSelectedThread(thread)} onProfileClick={() => window.open(`/profile/${encodeURIComponent(thread.otherName)}`, '_blank')} />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="conversation" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex-1 flex flex-col p-4">
                <Conversation thread={selectedThread} currentUser={user} senderName={user?.full_name || user?.email.split('@')[0]} onBack={() => setSelectedThread(null)} onBlock={(email, name) => setBlockDialog({ email, name })} blockedUsers={blockedUsers} onViewProfile={handleViewProfile} />
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
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MapPin, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function FlipDetailsDialog({ flip, open, onClose }) {
  const [messageText, setMessageText] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', flip.id],
    queryFn: () => base44.entities.Message.filter({
      community_flip_id: flip.id
    }, '-created_date', 100),
    enabled: open,
  });

  const sendMutation = useMutation({
    mutationFn: async (content) => {
      await base44.entities.Message.create({
        community_flip_id: flip.id,
        sender_email: user.email,
        sender_name: user.full_name,
        recipient_email: flip.posted_by,
        content,
        is_read: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', flip.id] });
      setMessageText('');
      toast.success('Message sent');
    },
  });

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMutation.mutate(messageText);
  };

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('analyzeFlipOpportunity', {
        flip_id: flip.id
      });
      return response.data.analysis;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      setShowAnalysis(true);
    },
    onError: () => {
      toast.error('Failed to analyze flip');
    },
  });

  // Filter messages to show conversation
  const conversation = messages.filter(m => 
    (m.sender_email === user.email && m.recipient_email === flip.posted_by) ||
    (m.sender_email === flip.posted_by && m.recipient_email === user.email)
  );

  const isMyPost = flip.posted_by === user.email;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-card border-border max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">{flip.item_name}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pr-6">
            {/* Flip Details */}
            <div className="space-y-3">

            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold text-primary">${flip.price?.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Posted by {flip.posted_by_name}</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {flip.category}
              </span>
            </div>

            {flip.description && (
              <p className="text-sm text-foreground">{flip.description}</p>
            )}

            {flip.location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {flip.location}
              </div>
            )}
            </div>

            {/* Messages */}
            {!isMyPost && (
              <>
                <div className="border-t border-border pt-3">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Messages
                  </h4>
                </div>
                <div className="space-y-3">
                  {conversation.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No messages yet. Start the conversation!
                    </p>
                  ) : (
                    conversation.map((msg) => {
                      const isMe = msg.sender_email === user.email;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-xl px-3 py-2 ${
                              isMe
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-foreground'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {format(new Date(msg.created_date), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="bg-background"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!messageText.trim() || sendMutation.isPending}
                    size="icon"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                </>
                )}

                {isMyPost && (
                <div className="space-y-3">
                <div className="text-center py-2 text-sm text-muted-foreground">
                  This is your post. Interested users can message you.
                </div>

                <Button
                  onClick={() => analyzeMutation.mutate()}
                  disabled={analyzeMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Get AI Profit Advice
                    </>
                  )}
                </Button>

                {showAnalysis && analysis && (
                  <div className="bg-secondary/50 rounded-xl p-4 space-y-3 text-sm">
                    <div>
                      <h4 className="font-semibold mb-1">Best Platform</h4>
                      <p className="text-muted-foreground">{analysis.best_platform}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Optimal Price</h4>
                      <p className="text-primary font-bold">${analysis.optimal_price?.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Est. Profit: ${analysis.estimated_profit?.toFixed(2)} ({analysis.profit_margin})</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Timing</h4>
                      <p className="text-muted-foreground">{analysis.timing_advice}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Marketing Tips</h4>
                      <p className="text-muted-foreground">{analysis.marketing_tips}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Shipping</h4>
                      <p className="text-muted-foreground">{analysis.shipping_tips}</p>
                    </div>
                    {analysis.summary && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-muted-foreground italic">{analysis.summary}</p>
                      </div>
                    )}
                  </div>
                )}
                </div>
                )}
                </div>
                </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
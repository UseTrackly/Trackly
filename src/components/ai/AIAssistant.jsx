import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Send, Loader2, Calculator, Trash2, Archive, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { calculateFlip } from '@/lib/platformFees';

export default function AIAssistant({ onOpenCalculator }) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.filter({ user_email: user.email }, 'created_date', 100),
    enabled: !!user,
  });

  const sendMutation = useMutation({
    mutationFn: async (userMessage) => {
      await base44.entities.ChatMessage.create({
        user_email: user.email,
        role: 'user',
        content: userMessage,
      });

      setIsTyping(true);

      const conversationHistory = messages
        .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
        .join('\n');

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a flip tracking assistant. Be very concise — 1-3 sentences max.

Your job: extract flip data from the conversation. Ask for missing info ONE question at a time. Don't repeat what you already know.

Required fields (must have ALL before flip_ready=true):
- item_name (string)
- category: cards | sneakers | clothing | electronics | collectibles | games | technology | vintage | other
- buy_price (number)
- sale_price (number)
- platform: ebay | stockx | goat | poshmark | depop | whatnot | mercari | facebook | offerup | goldin | amazon | other
- shipping_cost (number — always ask if not provided, even if it might be 0)

Rules:
- Auto-detect category from item type. Never ask for category.
- If buy_price and sale_price are known but platform is missing → ask what platform they sold on.
- If platform is now known but shipping_cost is not → ask if they paid for shipping and how much (mention they can say 0 if none).
- Only set flip_ready: true when item_name, buy_price, sale_price, platform, AND shipping_cost are all confirmed.
- When inventory_ready: item_name + buy_price + category are known (sale not needed).
- When flip_ready, confirm the details briefly and ask if they'd like to save to history, inventory, or open in calculator.

CONVERSATION:
${conversationHistory}
User: ${userMessage}`,
        response_json_schema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            flip_data: {
              type: 'object',
              properties: {
                buy_price: { type: 'number' },
                sale_price: { type: 'number' },
                platform: { type: 'string' },
                shipping_cost: { type: 'number' },
                item_name: { type: 'string' },
                category: { type: 'string' },
              }
            },
            flip_ready: { type: 'boolean' },
            inventory_ready: { type: 'boolean' },
          }
        }
      });

      await base44.entities.ChatMessage.create({
        user_email: user.email,
        role: 'assistant',
        content: response.message,
        flip_data: response.flip_data || null,
        flip_ready: response.flip_ready || false,
        inventory_ready: response.inventory_ready || false,
      });

      setIsTyping(false);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    },
    onError: () => {
      setIsTyping(false);
      toast.error('Failed to send message');
    },
  });

  const normalizePlatform = (p) => {
    if (!p) return 'other';
    const lower = p.toLowerCase().replace(/\s/g, '');
    const map = { stockx: 'stockx', goat: 'goat', ebay: 'ebay', poshmark: 'poshmark',
      depop: 'depop', whatnot: 'whatnot', mercari: 'mercari', facebook: 'facebook',
      offerup: 'offerup', goldin: 'goldin', amazon: 'amazon' };
    return map[lower] || 'other';
  };

  const saveToHistoryMutation = useMutation({
    mutationFn: async (flipData) => {
      const platform = normalizePlatform(flipData.platform);
      const calc = calculateFlip(
        flipData.buy_price,
        flipData.sale_price,
        platform,
        flipData.shipping_cost || 0
      );
      await base44.entities.Flip.create({
        item_name: flipData.item_name,
        category: flipData.category || 'other',
        buy_price: flipData.buy_price,
        sale_price: flipData.sale_price,
        platform,
        shipping_cost: flipData.shipping_cost || 0,
        platform_fee: calc.platformFee,
        processing_fee: calc.processingFee,
        net_profit: calc.netProfit,
        roi: calc.roi,
        date_sold: new Date().toISOString().split('T')[0],
      });
    },
    onMutate: async (flipData) => {
      await queryClient.cancelQueries({ queryKey: ['flips'] });
      const previous = queryClient.getQueryData(['flips']);
      const platform = normalizePlatform(flipData.platform);
      const calc = calculateFlip(flipData.buy_price, flipData.sale_price, platform, flipData.shipping_cost || 0);
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        item_name: flipData.item_name,
        category: flipData.category || 'other',
        buy_price: flipData.buy_price,
        sale_price: flipData.sale_price,
        platform,
        shipping_cost: flipData.shipping_cost || 0,
        platform_fee: calc.platformFee,
        processing_fee: calc.processingFee,
        net_profit: calc.netProfit,
        roi: calc.roi,
        date_sold: new Date().toISOString().split('T')[0],
        created_date: new Date().toISOString(),
      };
      queryClient.setQueryData(['flips'], (old = []) => [optimistic, ...old]);
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flips'] });
      toast.success('Saved to flip history!');
    },
    onError: (e, _vars, context) => {
      queryClient.setQueryData(['flips'], context.previous);
      toast.error('Failed to save: ' + e.message);
    },
  });

  const saveToInventoryMutation = useMutation({
    mutationFn: async (flipData) => {
      await base44.entities.Inventory.create({
        item_name: flipData.item_name,
        category: flipData.category || 'other',
        cost_basis: flipData.buy_price,
        date_acquired: new Date().toISOString().split('T')[0],
        condition: 'good',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Saved to inventory!');
    },
  });

  const handleGoToCalculator = (flipData) => {
    if (onOpenCalculator) {
      onOpenCalculator(flipData);
    } else {
      sessionStorage.setItem('ai_flip_data', JSON.stringify(flipData));
      navigate('/calculator');
    }
  };

  const handleClearChat = async () => {
    if (!user) return;
    for (const msg of messages) {
      try { await base44.entities.ChatMessage.delete(msg.id); } catch (_) {}
    }
    queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMutation.mutate(input);
    setInput('');
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)] bg-card border border-border rounded-2xl">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold">AI Flip Assistant</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Tell me about a flip and I'll help you track it</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={handleClearChat} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm space-y-1">
              <p className="font-medium">👋 What did you flip?</p>
              <p className="text-xs">e.g. "Bought Jordan 4s for $120, sold for $200 on StockX"</p>
            </div>
          )}

          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            const showActions = !isUser && (msg.flip_ready || msg.inventory_ready) && msg.flip_data;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[88%] space-y-2">
                  <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                    isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                  }`}>
                    {msg.content}
                  </div>

                  {showActions && (
                    <div className="flex flex-wrap gap-2">
                      {msg.flip_ready && (
                        <Button size="sm" variant="outline" onClick={() => saveToHistoryMutation.mutate(msg.flip_data)} disabled={saveToHistoryMutation.isPending} className="text-xs h-7 gap-1">
                          <TrendingUp className="w-3 h-3" /> Save to History
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => saveToInventoryMutation.mutate(msg.flip_data)} disabled={saveToInventoryMutation.isPending} className="text-xs h-7 gap-1">
                        <Archive className="w-3 h-3" /> Save to Inventory
                      </Button>
                      {msg.flip_ready && (
                        <Button size="sm" variant="outline" onClick={() => handleGoToCalculator(msg.flip_data)} className="text-xs h-7 gap-1">
                          <Calculator className="w-3 h-3" /> Open in Calculator
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  {[0, 150, 300].map((delay) => (
                    <div key={delay} className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Describe your flip..."
            className="bg-background"
            disabled={sendMutation.isPending || isTyping}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending || isTyping}
            size="icon"
            className="bg-primary hover:bg-primary/90 shrink-0"
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
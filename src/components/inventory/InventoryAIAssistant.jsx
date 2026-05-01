import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Send, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function InventoryAIAssistant() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: async (userMessage) => {
      setIsTyping(true);

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an inventory management assistant for a resale business tracking app.

Help the user add items to their inventory by extracting the following information:
- item_name (string)
- category (cards, sneakers, clothing, electronics, collectibles, games, technology, vintage, other)
- cost_basis (number - what they paid)
- condition (new, like_new, excellent, good, fair, poor)
- quantity (number, default 1)
- location (optional storage location)
- target_price (optional - what they want to sell for)
- notes (optional details)

User message: "${userMessage}"

Respond conversationally. If you have complete data (at minimum: item_name, category, cost_basis), include it in inventory_data. Otherwise, ask for missing info.`,
        response_json_schema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            inventory_data: {
              type: 'object',
              properties: {
                item_name: { type: 'string' },
                category: { type: 'string' },
                cost_basis: { type: 'number' },
                condition: { type: 'string' },
                quantity: { type: 'number' },
                location: { type: 'string' },
                target_price: { type: 'number' },
                notes: { type: 'string' },
              }
            }
          }
        }
      });

      setIsTyping(false);
      return response;
    },
    onSuccess: (response) => {
      setMessages(prev => [
        ...prev.slice(-10),
        { role: 'user', content: input },
        { role: 'assistant', content: response.message, data: response.inventory_data }
      ]);
      setInput('');
    },
    onError: () => {
      setIsTyping(false);
      toast.error('Failed to send message');
    },
  });

  const handleSend = () => {
    if (!input.trim()) return;
    sendMutation.mutate(input);
  };

  const handleAddItem = async (data) => {
    try {
      await base44.entities.Inventory.create({
        ...data,
        date_acquired: new Date().toISOString().split('T')[0],
      });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item added to inventory');
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)] bg-card border border-border rounded-2xl">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">AI Inventory Assistant</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tell me what you want to add and I'll help track it
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p className="mb-2">👋 Hi! I can help you add items to inventory.</p>
            <p className="text-xs">Example: "I bought Jordan 4s for $150"</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[85%] space-y-2">
                <div
                  className={`rounded-2xl px-4 py-2.5 ${
                    isUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>

                {!isUser && msg.data && Object.keys(msg.data).length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => handleAddItem(msg.data)}
                    className="text-xs gap-1.5"
                  >
                    <Plus className="w-3 h-3" />
                    Add to Inventory
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Describe what you bought..."
            className="bg-background"
            disabled={sendMutation.isPending || isTyping}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending || isTyping}
            size="icon"
            className="bg-primary hover:bg-primary/90 shrink-0"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
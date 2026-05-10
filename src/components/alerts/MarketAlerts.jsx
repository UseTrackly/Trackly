import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, Trash2, TrendingDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CATEGORIES = [
  { value: 'sneakers', label: 'Sneakers' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'cards', label: 'Cards' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'collectibles', label: 'Collectibles' },
  { value: 'games', label: 'Games' },
  { value: 'technology', label: 'Technology' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'other', label: 'Other' },
];

export default function MarketAlerts() {
  const [showCreate, setShowCreate] = useState(false);
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('sneakers');
  const [targetPrice, setTargetPrice] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: alertsRaw, isLoading } = useQuery({
    queryKey: ['marketAlerts'],
    queryFn: () => base44.entities.MarketAlert.filter({ user_email: user.email }, '-created_date', 50),
    enabled: !!user,
    initialData: [],
  });
  const alerts = Array.isArray(alertsRaw) ? alertsRaw : [];

  const createMutation = useMutation({
    mutationFn: async (alertData) => {
      return await base44.entities.MarketAlert.create(alertData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketAlerts'] });
      toast.success('Price alert created');
      setShowCreate(false);
      setItemName('');
      setTargetPrice('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MarketAlert.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketAlerts'] });
      toast.success('Alert deleted');
    },
  });

  const handleCreate = () => {
    if (!itemName.trim() || !targetPrice) return;
    createMutation.mutate({
      item_name: itemName,
      category,
      target_price: parseFloat(targetPrice),
      user_email: user.email,
      is_active: true,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Price Alerts</h3>
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="bg-primary hover:bg-primary/90 text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Alert
        </Button>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No price alerts"
          description="Get notified when items drop to your target price"
          action={
            <Button onClick={() => setShowCreate(true)} size="sm" className="bg-primary hover:bg-primary/90">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create Alert
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {alerts.map((alert, i) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-4 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">{alert.item_name}</h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">{alert.category}</span>
                      <span>Target: ${alert.target_price?.toFixed(2)}</span>
                    </div>
                    {alert.current_market_price && (
                      <div className="flex items-center gap-2 mt-2">
                        <TrendingDown className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium text-primary">
                          Current: ${alert.current_market_price.toFixed(2)} on {alert.platform}
                        </span>
                      </div>
                    )}
                    {alert.last_scanned && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last checked: {format(new Date(alert.last_scanned), 'MMM d, h:mm a')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(alert.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Alert Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm mx-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create Price Alert</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Item Name
              </label>
              <Input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Jordan 4 Retro"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Category
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Target Price
              </label>
              <Input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="0.00"
                className="bg-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreate}
              disabled={!itemName.trim() || !targetPrice || createMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Alert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
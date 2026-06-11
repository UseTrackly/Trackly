import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'cards', label: 'Cards', emoji: '🎴' },
  { value: 'sneakers', label: 'Sneakers', emoji: '👟' },
  { value: 'clothing', label: 'Clothing', emoji: '👕' },
  { value: 'electronics', label: 'Electronics', emoji: '📱' },
  { value: 'collectibles', label: 'Collectibles', emoji: '🎁' },
  { value: 'games', label: 'Games', emoji: '🎮' },
  { value: 'technology', label: 'Technology', emoji: '💻' },
  { value: 'vintage', label: 'Vintage', emoji: '🕰️' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

export default function CategoriesEditor({ user }) {
  const [selected, setSelected] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user?.selected_categories) {
      setSelected(Array.isArray(user.selected_categories) ? user.selected_categories : []);
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async (categories) => {
      await base44.auth.updateMe({ selected_categories: categories });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setIsEditing(false);
      toast.success('Categories updated');
    },
    onError: () => {
      toast.error('Failed to update categories');
    },
  });

  const toggleCategory = (value) => {
    setSelected(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const handleSave = () => {
    if (selected.length === 0) {
      toast.error('Select at least one category');
      return;
    }
    updateMutation.mutate(selected);
  };

  if (!isEditing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Flip Categories
          </h3>
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Edit
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {selected.length > 0 ? (
            selected.map(cat => {
              const category = CATEGORIES.find(c => c.value === cat);
              return (
                <div
                  key={cat}
                  className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                >
                  {category?.emoji} {category?.label}
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground">No categories selected</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold">Select Categories</h3>
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((cat, index) => {
          const isSelected = selected.includes(cat.value);
          return (
            <motion.button
              key={cat.value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => toggleCategory(cat.value)}
              className={`relative p-3 rounded-lg border-2 transition-all text-sm ${
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-muted-foreground/30'
              }`}
            >
              <div className="text-lg mb-1">{cat.emoji}</div>
              <div className={`text-xs font-medium ${
                isSelected ? 'text-primary' : 'text-foreground'
              }`}>
                {cat.label}
              </div>
              {isSelected && (
                <motion.div
                  layoutId="selected"
                  className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          onClick={() => setIsEditing(false)}
          className="flex-1"
          disabled={updateMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={selected.length === 0 || updateMutation.isPending}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
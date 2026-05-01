import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

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

export default function OnboardingCategories() {
  const [selected, setSelected] = useState([]);
  const navigate = useNavigate();

  const toggleCategory = (value) => {
    setSelected(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const handleContinue = async () => {
    if (selected.length === 0) {
      toast.error('Please select at least one category');
      return;
    }
    localStorage.setItem('trackly-categories', JSON.stringify(selected));
    localStorage.setItem('trackly-onboarded', 'true');
    
    // Save categories to user profile
    try {
      await base44.auth.updateMe({ selected_categories: selected });
    } catch (error) {
      console.error('Failed to save categories:', error);
    }
    
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-8">
      <div className="flex-1 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            What do you flip?
          </h1>
          <p className="text-sm text-muted-foreground">
            Select all categories that apply to your business
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {CATEGORIES.map((cat, index) => {
            const isSelected = selected.includes(cat.value);
            return (
              <motion.button
                key={cat.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => toggleCategory(cat.value)}
                className={`relative p-5 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-muted-foreground/30'
                }`}
              >
                <div className="text-3xl mb-2">{cat.emoji}</div>
                <div className={`text-sm font-medium ${
                  isSelected ? 'text-primary' : 'text-foreground'
                }`}>
                  {cat.label}
                </div>
                {isSelected && (
                  <motion.div
                    layoutId="selected"
                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                  >
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="mt-auto pb-8">
          <Button
            onClick={handleContinue}
            disabled={selected.length === 0}
            className="w-full h-12 bg-primary hover:bg-primary/90"
          >
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
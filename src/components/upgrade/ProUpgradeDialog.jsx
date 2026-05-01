import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { isIOSApp } from '@/lib/platformDetect';

const PRO_FEATURES = [
  'Unlimited flip tracking',
  'Advanced analytics & reports',
  'Priority AI assistant access',
  'Export data to CSV/Excel',
  'Custom backgrounds',
  'Multi-platform sync',
  'Ad-free experience',
  'Priority customer support',
];

export default function ProUpgradeDialog() {
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  useEffect(() => {
    // Show popup on first visit or every 7 days
    const lastShown = localStorage.getItem('pro-upgrade-shown');
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    if (!lastShown || now - parseInt(lastShown) > sevenDays) {
      const timer = setTimeout(() => {
        setOpen(true);
        localStorage.setItem('pro-upgrade-shown', now.toString());
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Never show the upgrade dialog on iOS — external payment links violate Apple 3.1.1
  if (isIOSApp()) return null;

  const handleUpgrade = () => {
    const STRIPE_LINKS = {
      monthly: 'https://buy.stripe.com/fZu6oA4CVdaZ47N35K2ZO00',
      lifetime: 'https://buy.stripe.com/fZu8wIglDdaZ9s77m02ZO01',
    };
    window.open(STRIPE_LINKS[selectedPlan] || STRIPE_LINKS.monthly, '_blank');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[90vw] w-full mx-auto bg-card border-border p-0 overflow-hidden max-h-[85vh] overflow-y-auto">
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 z-10 p-1 rounded-lg hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-primary/20 via-accent/10 to-primary/10 p-4 pb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3"
          >
            <Sparkles className="w-6 h-6 text-primary" />
          </motion.div>
          <DialogTitle className="text-center text-xl font-bold mb-1">
            Upgrade to Pro
          </DialogTitle>
          <p className="text-center text-xs text-muted-foreground">
            Unlock advanced features and maximize your profits
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Plan Selection */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedPlan === 'monthly'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-muted-foreground/30'
              }`}
            >
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Monthly</p>
                <p className="text-xl font-bold">$9.99</p>
                <p className="text-[10px] text-muted-foreground">/month</p>
              </div>
            </button>

            <button
              onClick={() => setSelectedPlan('lifetime')}
              className={`p-3 rounded-lg border-2 transition-all relative ${
                selectedPlan === 'lifetime'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-muted-foreground/30'
              }`}
            >
              <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full">
                BEST
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Lifetime</p>
                <p className="text-xl font-bold">$99.99</p>
                <p className="text-[10px] text-muted-foreground">one-time</p>
              </div>
            </button>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              What's Included
            </h4>
            <div className="grid grid-cols-1 gap-1.5">
              {PRO_FEATURES.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center gap-2 text-xs"
                >
                  <div className="shrink-0 w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary" />
                  </div>
                  <span>{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-1.5">
            <Button
              onClick={handleUpgrade}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-sm font-semibold"
            >
              Upgrade Now
            </Button>
            <Button
              onClick={() => setOpen(false)}
              variant="ghost"
              className="w-full text-xs text-muted-foreground h-8"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
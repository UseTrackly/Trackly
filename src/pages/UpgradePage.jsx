import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Check, Crown, RotateCcw, TrendingUp, BarChart3,
  Package, Palette, Download, Shield, ArrowLeft, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { isIOSApp } from '@/lib/platformDetect';
import { purchasePlan, restorePurchases, getAppUserID, loadProducts } from '@/lib/iap';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Unlimited Flip Tracking',
    description: 'Remove the 3-flip/day limit — track every deal with no restrictions.',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics & Reports',
    description: 'Unlock win rates, ROI distribution, weekly trend reports, and category breakdowns — beyond the basic charts.',
  },
  {
    icon: Package,
    title: 'Unlimited Inventory',
    description: 'Free users are capped at 10 items. Go unlimited with Pro — cost basis, grading details, target prices, and more.',
  },
  {
    icon: Download,
    title: 'Export to CSV / PDF',
    description: 'Download your flip data anytime for taxes, accounting, or your own records.',
  },
  {
    icon: Palette,
    title: 'Custom Themes & Backgrounds',
    description: 'Personalize the app with premium color themes and animated backgrounds.',
  },
  {
    icon: Shield,
    title: 'Support Indie Development',
    description: 'Trackly is built by a small team. Pro keeps the app growing, fast, and ad-free forever.',
  },
];

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$10',
    period: '/month',
    note: '7-day free trial',
    badge: null,
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: '$100',
    period: '/year',
    note: '2 months free',
    badge: 'BEST VALUE',
    highlight: true,
  },
  {
    id: 'lifetime',
    label: 'Lifetime',
    price: '$200',
    period: 'one-time',
    note: 'Pay once, own forever',
    badge: null,
  },
];

export default function UpgradePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const onIOS = isIOSApp();

  // Redirect if already pro
  useEffect(() => {
    if (user?.is_pro) navigate('/', { replace: true });
  }, [user?.is_pro]);

  const handlePurchase = async () => {
    if (onIOS) {
      setPurchasing(true);
      try {
        const appUserID = await purchasePlan(selectedPlan);
        const res = await base44.functions.invoke('verifyAppleIAP', { appUserID, plan: selectedPlan });
        if (res.data?.error) throw new Error(res.data.error);
        queryClient.invalidateQueries({ queryKey: ['me'] });
        toast.success('Welcome to Pro! 🎉');
        navigate('/');
      } catch (err) {
        const msg = err.message || '';
        if (msg.toLowerCase().includes('cancel') || msg.includes('1')) return;
        toast.error(msg || 'Purchase failed. Please try again.');
      } finally {
        setPurchasing(false);
      }
    } else {
      const STRIPE_LINKS = {
        monthly: 'https://buy.stripe.com/fZu6oA4CVdaZ47N35K2ZO00',
        yearly: 'https://buy.stripe.com/eVqcMY3yR1sheMrayc2ZO02',
        lifetime: 'https://buy.stripe.com/fZu8wIglDdaZ9s77m02ZO01',
      };
      window.open(STRIPE_LINKS[selectedPlan], '_blank');
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const customerInfo = await restorePurchases();
      if (!customerInfo) { toast.error('No previous purchases found'); return; }
      const appUserID = await getAppUserID();
      const res = await base44.functions.invoke('verifyAppleIAP', { appUserID, plan: 'restore' });
      if (res.data?.error) throw new Error(res.data.error);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Purchase restored!');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  };

  const selectedPlanData = PLANS.find(p => p.id === selectedPlan);

  return (
    <div className="flex flex-col h-full">
      {/* Back button */}
      <div className="flex items-center px-4 pt-4 pb-2 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="flex-1 px-5 pb-40">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center pt-4 pb-8"
        >
          <div className="relative inline-flex">
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl scale-150 opacity-60" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-5">
              <Crown className="w-9 h-9 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            Trackly <span className="text-primary">Pro</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            Everything you need to run a serious reselling business — all in one place.
          </p>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-1 mt-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ))}
            <span className="text-xs text-muted-foreground ml-2">Loved by resellers</span>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="space-y-3 mb-8"
        >
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Everything included
          </p>
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                className="flex items-start gap-3.5 bg-card border border-border rounded-xl px-4 py-3.5"
              >
                <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center mt-0.5">
                  <Icon className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">{feat.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{feat.description}</p>
                </div>
                <div className="shrink-0 ml-auto">
                  <Check className="w-4 h-4 text-primary mt-1" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Plan selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Choose your plan
          </p>
          <div className="space-y-3">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-xl border-2 transition-all ${
                  selectedPlan === plan.id
                    ? 'border-primary bg-primary/8'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
                style={{ background: selectedPlan === plan.id ? 'hsl(var(--primary) / 0.08)' : undefined }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedPlan === plan.id ? 'border-primary' : 'border-muted-foreground/40'
                  }`}>
                    {selectedPlan === plan.id && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{plan.label}</span>
                      {plan.badge && (
                        <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold tracking-wide">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{plan.note}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xl font-extrabold ${selectedPlan === plan.id ? 'text-primary' : 'text-foreground'}`}>
                    {plan.price}
                  </span>
                  <span className="text-xs text-muted-foreground block">{plan.period}</span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Sticky bottom CTA */}
      <div
        className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border px-5 pt-4 shrink-0"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)' }}
      >
        <Button
          onClick={handlePurchase}
          disabled={purchasing}
          className="w-full h-14 text-base font-bold bg-primary hover:bg-primary/90 rounded-2xl shadow-lg shadow-primary/25"
        >
          {purchasing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Get Pro — {selectedPlanData?.price}{selectedPlanData?.period === 'one-time' ? ' one-time' : selectedPlanData?.period}
            </>
          )}
        </Button>

        {onIOS && (
          <button
            onClick={handleRestore}
            disabled={restoring}
            className="w-full mt-2 py-2.5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            {restoring ? 'Restoring...' : 'Restore Purchases'}
          </button>
        )}

        <p className="text-center text-[10px] text-muted-foreground mt-2 pb-1">
          Cancel anytime · Secure payment · Instant access
        </p>
      </div>
    </div>
  );
}
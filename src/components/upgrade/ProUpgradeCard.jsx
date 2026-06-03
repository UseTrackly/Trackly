import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Crown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';

export default function ProUpgradeCard({ compact = false }) {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const navigate = useNavigate();

  if (user?.is_pro) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-2 border-primary/30 rounded-xl p-4"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/20 shrink-0">
          <Crown className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm">Upgrade to Trackly Pro</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Unlimited tracking, AI, analytics & more
          </p>
        </div>
        <button
          onClick={() => navigate('/upgrade')}
          className="shrink-0 flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Upgrade
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
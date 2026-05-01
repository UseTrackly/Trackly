import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currencyFormatter';

export default function ExpenseBreakdown({ flip, currency = 'USD' }) {
  const [expanded, setExpanded] = useState(false);

  const expenses = [];
  
  if (flip.platform_fee) expenses.push({ label: 'Platform Fee', amount: flip.platform_fee });
  if (flip.processing_fee) expenses.push({ label: 'Processing Fee', amount: flip.processing_fee });
  if (flip.shipping_cost) expenses.push({ label: 'Shipping', amount: flip.shipping_cost });
  
  if (flip.custom_expenses && flip.custom_expenses.length > 0) {
    flip.custom_expenses.forEach(exp => {
      expenses.push({ label: exp.label || 'Custom', amount: exp.amount });
    });
  }

  if (expenses.length === 0) return null;

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="mt-2 border-t border-border pt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="w-full justify-between text-xs h-7 px-2"
      >
        <div className="flex items-center gap-1.5">
          <Receipt className="w-3 h-3" />
          <span>Expense Breakdown</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-destructive font-medium">-{formatCurrency(totalExpenses, currency)}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </Button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-1 mt-2 px-2">
              {expenses.map((exp, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{exp.label}</span>
                  <span className="font-medium text-destructive">-{formatCurrency(exp.amount, currency)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
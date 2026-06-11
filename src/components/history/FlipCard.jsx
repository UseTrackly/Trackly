import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Trash2, Pencil } from 'lucide-react';
import PlatformBadge from '@/components/shared/PlatformBadge';
import ExpenseBreakdown from './ExpenseBreakdown';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/currencyFormatter';

export default function FlipCard({ flip, index, onDelete, onEdit, currency = 'USD' }) {
  const isProfitable = flip.net_profit >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-card border border-border rounded-xl p-4 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{flip.item_name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <PlatformBadge platform={flip.platform} />
            {flip.date_sold && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(flip.date_sold), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold tracking-tight ${
            isProfitable ? 'text-primary' : 'text-destructive'
          }`}>
            {isProfitable ? '+' : ''}{formatCurrency(flip.net_profit, currency)}
          </p>
          <div className="flex items-center gap-1 justify-end">
            {isProfitable ? (
              <TrendingUp className="w-3 h-3 text-primary" />
            ) : (
              <TrendingDown className="w-3 h-3 text-destructive" />
            )}
            <span className={`text-xs font-medium ${
              isProfitable ? 'text-primary' : 'text-destructive'
            }`}>
              {flip.roi?.toFixed(1)}% ROI
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex gap-3">
          <span>Buy: {formatCurrency(flip.buy_price, currency)}</span>
          <span>Sell: {formatCurrency(flip.sale_price, currency)}</span>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1 opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={() => onEdit(flip)}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(flip)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      <ExpenseBreakdown flip={flip} currency={currency} />
    </motion.div>
  );
}
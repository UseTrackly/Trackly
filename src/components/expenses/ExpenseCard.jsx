import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Pencil, Calendar, Receipt } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORY_LABELS = {
  shipping_supplies: 'Shipping Supplies',
  gas_sourcing: 'Gas/Sourcing',
  subscriptions: 'Subscriptions',
  storage: 'Storage',
  tools_equipment: 'Tools/Equipment',
  marketing: 'Marketing',
  packaging: 'Packaging',
  other: 'Other',
};

const CATEGORY_ICONS = {
  shipping_supplies: '📦',
  gas_sourcing: '⛽',
  subscriptions: '💳',
  storage: '🏢',
  tools_equipment: '🛠️',
  marketing: '📢',
  packaging: '📋',
  other: '💰',
};

export default function ExpenseCard({ expense, index, onEdit, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-card border border-border rounded-xl p-4 group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{CATEGORY_ICONS[expense.category]}</span>
            <h3 className="font-semibold text-sm truncate">{expense.description}</h3>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground">
            {CATEGORY_LABELS[expense.category]}
          </span>
        </div>
        <div className="text-right ml-2">
          <p className="text-base font-bold text-destructive">-${expense.amount?.toFixed(2)}</p>
        </div>
      </div>

      {expense.date && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <Calendar className="w-3 h-3" />
          {format(new Date(expense.date), 'MMM d, yyyy')}
        </div>
      )}

      {expense.notes && (
        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
          {expense.notes}
        </p>
      )}

      {expense.receipt_url && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <Receipt className="w-3 h-3" />
          <span>Receipt attached</span>
        </div>
      )}

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit?.(expense)}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete?.(expense)}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
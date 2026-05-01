import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Pencil, Calendar, Package } from 'lucide-react';
import { format } from 'date-fns';

const CONDITION_LABELS = {
  new: 'New',
  like_new: 'Like New',
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

const CONDITION_COLORS = {
  new: 'bg-green-500/10 text-green-500 border-green-500/20',
  like_new: 'bg-green-500/10 text-green-500 border-green-500/20',
  excellent: 'bg-primary/10 text-primary border-primary/20',
  good: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  fair: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  poor: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function InventoryCard({ item, index, onEdit, onDelete }) {
  const totalValue = (item.cost_basis || 0) * (item.quantity || 1);
  const potentialProfit = item.target_price ? (item.target_price - item.cost_basis) * (item.quantity || 1) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-card border border-border rounded-xl p-4 group cursor-pointer hover:border-primary/50 transition-colors"
    >
      <div className="flex gap-4">
        {/* Image */}
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.item_name}
            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
          />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{item.item_name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {item.category}
                </span>
                {item.condition && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${CONDITION_COLORS[item.condition]}`}>
                    {CONDITION_LABELS[item.condition]}
                  </span>
                )}
                {item.quantity > 1 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {item.quantity}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right ml-2">
              <p className="text-base font-bold">${totalValue.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">cost basis</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-1 text-xs text-muted-foreground mb-2">
            {item.date_acquired && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Acquired {format(new Date(item.date_acquired), 'MMM d, yyyy')}
              </div>
            )}
            {item.location && (
              <p>Location: {item.location}</p>
            )}
            {item.notes && (
              <p className="line-clamp-1">Notes: {item.notes}</p>
            )}
            {potentialProfit !== null && (
              <p className={`font-medium ${potentialProfit > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                Target: ${item.target_price.toFixed(2)} ({potentialProfit > 0 ? '+' : ''}${potentialProfit.toFixed(2)} potential)
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit?.(item)}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete?.(item)}
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
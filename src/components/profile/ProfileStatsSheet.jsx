import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, ShoppingBag, TrendingUp, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/currencyFormatter';
import { PLATFORMS } from '@/lib/platformFees';

export default function ProfileStatsSheet({ open, onClose, type, items, isOwner, currency }) {
  const title = type === 'inventory'
    ? (isOwner ? 'My Inventory' : 'Storefront')
    : 'Flip History';

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed z-[61] bottom-0 left-0 right-0 max-h-[80vh] border-t border-border rounded-t-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{
              backgroundColor: 'hsl(0 0% 7%)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              willChange: 'transform',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0" style={{ backgroundColor: 'hsl(0 0% 7%)' }}>
              <div className="flex items-center gap-2">
                {type === 'inventory' ? (
                  <ShoppingBag className="w-4 h-4 text-primary" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-primary" />
                )}
                <h3 className="text-base font-bold">{title}</h3>
                <span className="text-xs text-muted-foreground">({items.length})</span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4" style={{ backgroundColor: 'hsl(0 0% 7%)', WebkitOverflowScrolling: 'touch' }}>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  {type === 'inventory' ? (
                    <ShoppingBag className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  ) : (
                    <Package className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {type === 'inventory'
                      ? (isOwner ? 'No inventory items yet' : 'No items in storefront')
                      : 'No flips yet'}
                  </p>
                </div>
              ) : type === 'inventory' ? (
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
                      <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.item_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground capitalize">{item.category?.replace('_', ' ')}</span>
                          {item.condition && (
                            <span className="text-xs text-muted-foreground">· {item.condition.replace('_', ' ')}</span>
                          )}
                          {item.is_graded && item.grade && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                              {item.grading_company} {item.grade}
                            </span>
                          )}
                          {isOwner && item.is_public && (
                            <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              <Eye className="w-2.5 h-2.5" /> Public
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {isOwner && item.cost_basis != null && (
                          <p className="text-xs text-muted-foreground">
                            Paid: {formatCurrency(item.cost_basis, currency)}
                          </p>
                        )}
                        {item.target_price ? (
                          <p className="text-sm font-bold text-primary">
                            {formatCurrency(item.target_price, currency)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {items.map((flip) => (
                    <div key={flip.id} className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <TrendingUp className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{flip.item_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {PLATFORMS[flip.platform]?.name || flip.platform}
                          {flip.date_sold ? ` · ${new Date(flip.date_sold).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-bold ${(flip.net_profit || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {(flip.net_profit || 0) >= 0 ? '+' : ''}{formatCurrency(flip.net_profit || 0, currency)}
                        </p>
                        {flip.roi != null && (
                          <p className="text-xs text-muted-foreground">{flip.roi.toFixed(1)}% ROI</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
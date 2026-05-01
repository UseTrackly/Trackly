import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export default function CostBreakdown({ calculation }) {
  if (!calculation || !calculation.salePrice) return null;

  const { netProfit, roi, feeDetails, shippingCost, hiddenFees, salePrice, buyPrice } = calculation;
  const isProfitable = netProfit > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-4"
    >
      {/* Fee Breakdown */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Fee Breakdown
        </h3>
        <div className="space-y-2.5">
          {feeDetails?.map((fee, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {fee.name} ({fee.description})
              </span>
              <span className="text-sm font-medium text-destructive">
                -${fee.amount.toFixed(2)}
              </span>
            </div>
          ))}
          {shippingCost > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Shipping Cost</span>
              <span className="text-sm font-medium text-destructive">
                -${shippingCost.toFixed(2)}
              </span>
            </div>
          )}
          <div className="h-px bg-border my-2" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Deductions</span>
            <span className="text-sm font-semibold text-destructive">
              -${(salePrice - buyPrice - netProfit).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Net Profit Card */}
      <div className={`rounded-xl p-5 border ${
        isProfitable 
          ? 'bg-primary/5 border-primary/20' 
          : 'bg-destructive/5 border-destructive/20'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Net Profit
            </p>
            <p className="text-sm text-muted-foreground">Return on Investment</p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold tracking-tight ${
              isProfitable ? 'text-primary' : 'text-destructive'
            }`}>
              {isProfitable ? '+' : ''}${netProfit.toFixed(2)}
            </p>
            <div className="flex items-center gap-1 justify-end mt-0.5">
              {isProfitable ? (
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-destructive" />
              )}
              <span className={`text-sm font-semibold ${
                isProfitable ? 'text-primary' : 'text-destructive'
              }`}>
                {isProfitable ? '+' : ''}{roi.toFixed(1)}% ROI
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Fees Alert */}
      {hiddenFees > 5 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 bg-card border border-border rounded-xl p-3"
        >
          <div className="p-2 rounded-lg bg-accent/10">
            <AlertTriangle className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">${hiddenFees.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">in hidden fees found</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
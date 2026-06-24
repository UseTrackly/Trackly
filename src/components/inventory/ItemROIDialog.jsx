import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, TrendingUp, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLATFORMS } from '@/lib/platformFees';
import { calculateFlip } from '@/lib/platformFees';
import { formatCurrency } from '@/lib/currencyFormatter';

const MAJOR_PLATFORMS = ['ebay', 'whatnot', 'facebook', 'stockx'];

export default function ItemROIDialog({ item, open, onClose, currency = 'USD' }) {
  const [analysis, setAnalysis] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const costBasis = item.cost_basis || 0;
      const targetROI = 0.10; // 10% minimum

      // Calculate required sale prices for each platform
      const recommendations = {};
      
      for (const platform of MAJOR_PLATFORMS) {
        // Start with a price that gives exactly 10% ROI after fees
        let salePrice = costBasis * 1.15; // Initial guess
        let iterations = 0;
        const maxIterations = 20;

        // Binary search to find the right sale price
        while (iterations < maxIterations) {
          const calc = calculateFlip(costBasis, salePrice, platform, 0);
          const actualROI = calc.roi / 100;

          if (Math.abs(actualROI - targetROI) < 0.001) {
            break;
          }

          if (actualROI < targetROI) {
            salePrice *= 1.05;
          } else {
            salePrice *= 0.98;
          }

          iterations++;
        }

        const finalCalc = calculateFlip(costBasis, salePrice, platform, 0);
        
        recommendations[platform] = {
          platform: PLATFORMS[platform]?.name || platform,
          icon: PLATFORMS[platform]?.icon || '🏪',
          salePrice: Math.ceil(salePrice * 100) / 100,
          profit: finalCalc.netProfit,
          roi: finalCalc.roi,
          fees: finalCalc.totalFees,
        };
      }

      return recommendations;
    },
    onSuccess: (data) => {
      setAnalysis(data);
    },
  });

  useEffect(() => {
    if (open && item && !analysis) {
      analyzeMutation.mutate();
    }
    if (!open) {
      setAnalysis(null);
    }
  }, [open, item]);

  if (!item) return null;

  const recs = analysis ? Object.values(analysis) : [];
  const best = recs.length > 0 ? recs.reduce((a, b) => a.profit > b.profit ? a : b) : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-base">ROI Analysis — {item.item_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Return button */}
          <Button onClick={onClose} variant="outline" size="sm" className="w-full h-9">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Return to Inventory
          </Button>

          {/* Loading */}
          {analyzeMutation.isPending && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
              <p className="text-sm text-muted-foreground">Calculating prices...</p>
            </div>
          )}

          {analysis && (
            <>
              {/* Top summary card */}
              {best && (
                <div className="bg-primary/8 border border-primary/25 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Recommended Target</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{best.icon}</span>
                      <span className="text-sm font-bold text-foreground">{best.platform}</span>
                    </div>
                    <span className="text-xl font-bold text-primary">{formatCurrency(best.salePrice, currency)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Profit <span className="text-primary font-semibold">+{formatCurrency(best.profit, currency)}</span>
                    {' '}• ROI <span className="font-semibold">{best.roi.toFixed(1)}%</span>
                  </p>
                </div>
              )}

              {/* Cost basis line */}
              <p className="text-xs text-muted-foreground px-0.5">
                Paid: <span className="font-semibold text-foreground">{formatCurrency(item.cost_basis, currency)}</span>
                {' '}• Min 10% ROI after fees
              </p>

              {/* Compact rows */}
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                {recs.map((rec) => {
                  const isExpanded = expandedRow === rec.platform;
                  return (
                    <div key={rec.platform} className="bg-card">
                      <button
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                        onClick={() => setExpandedRow(isExpanded ? null : rec.platform)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{rec.icon}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-tight">{rec.platform}</p>
                            <p className="text-[11px] text-muted-foreground">
                              Profit <span className="text-primary font-medium">+{formatCurrency(rec.profit, currency)}</span>
                              {' '}• ROI <span className="font-medium">{rec.roi.toFixed(1)}%</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 ml-2 shrink-0">
                          <span className="text-sm font-bold text-primary">{formatCurrency(rec.salePrice, currency)}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-2.5 pt-0 grid grid-cols-2 gap-2 bg-secondary/30">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Total Fees</p>
                            <p className="text-xs font-semibold text-destructive">-{formatCurrency(rec.fees, currency)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Net Profit</p>
                            <p className="text-xs font-semibold text-primary">+{formatCurrency(rec.profit, currency)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
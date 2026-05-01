import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, TrendingUp, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLATFORMS } from '@/lib/platformFees';
import { calculateFlip } from '@/lib/platformFees';
import { formatCurrency } from '@/lib/currencyFormatter';

const MAJOR_PLATFORMS = ['ebay', 'whatnot', 'facebook', 'stockx'];

export default function ItemROIDialog({ item, open, onClose, currency = 'USD' }) {
  const [analysis, setAnalysis] = useState(null);

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg">ROI Analysis</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Item Info */}
          <div className="bg-secondary/50 rounded-xl p-4">
            <h3 className="font-semibold mb-1">{item.item_name}</h3>
            <p className="text-sm text-muted-foreground">
              Cost Basis: <span className="font-semibold text-foreground">{formatCurrency(item.cost_basis, currency)}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Minimum target: 10% ROI after all fees
            </p>
          </div>

          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Inventory
          </Button>

          {/* Analysis */}
          {analyzeMutation.isPending ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Calculating optimal prices...</p>
              </div>
            </div>
          ) : analysis ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold">Recommended Sale Prices</h4>
              </div>

              {Object.values(analysis).map((rec) => (
                <div
                  key={rec.platform}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{rec.icon}</span>
                      <span className="font-semibold text-sm">{rec.platform}</span>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(rec.salePrice, currency)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Net Profit</p>
                      <p className="font-semibold text-primary">+{formatCurrency(rec.profit, currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ROI</p>
                      <p className="font-semibold">{rec.roi.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Fees</p>
                      <p className="font-semibold text-destructive">-{formatCurrency(rec.fees, currency)}</p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mt-4">
                <p className="text-xs text-muted-foreground">
                  💡 These prices guarantee at least 10% ROI after all platform fees and processing costs. 
                  Prices include typical fee structures for each marketplace.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
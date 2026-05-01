import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart3, Download, Share2, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import ProfitChart from '@/components/dashboard/ProfitChart';
import PlatformChart from '@/components/dashboard/PlatformChart';
import { PLATFORMS } from '@/lib/platformFees';
import { format, subDays, isAfter } from 'date-fns';
import { toast } from 'sonner';

const DATE_RANGES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'All', days: null },
];

export default function ReportsPage() {
  const [range, setRange] = useState(3); // default all time

  const { data: allFlips = [], isLoading } = useQuery({
    queryKey: ['flips'],
    queryFn: () => base44.entities.Flip.list('-created_date', 500),
  });

  const flips = useMemo(() => {
    const days = DATE_RANGES[range].days;
    if (!days) return allFlips;
    const cutoff = subDays(new Date(), days);
    return allFlips.filter(f => {
      const date = f.date_sold || f.created_date;
      return date && isAfter(new Date(date), cutoff);
    });
  }, [allFlips, range]);

  const stats = useMemo(() => {
    if (flips.length === 0) return null;
    const totalRevenue = flips.reduce((s, f) => s + (f.sale_price || 0), 0);
    const totalCost = flips.reduce((s, f) => s + (f.buy_price || 0), 0);
    const totalProfit = flips.reduce((s, f) => s + (f.net_profit || 0), 0);
    const avgRoi = flips.reduce((s, f) => s + (f.roi || 0), 0) / flips.length;
    const totalFees = flips.reduce((s, f) => s + (f.platform_fee || 0) + (f.processing_fee || 0), 0);
    
    const sorted = [...flips].sort((a, b) => (b.net_profit || 0) - (a.net_profit || 0));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    return { totalRevenue, totalCost, totalProfit, avgRoi, totalFees, best, worst };
  }, [flips]);

  const exportCSV = () => {
    const headers = ['Item Name', 'Category', 'Platform', 'Buy Price', 'Sale Price', 'Shipping', 'Platform Fee', 'Processing Fee', 'Net Profit', 'ROI %', 'Date Sold'];
    const rows = flips.map(f => [
      f.item_name,
      f.category,
      PLATFORMS[f.platform]?.name || f.platform,
      f.buy_price?.toFixed(2),
      f.sale_price?.toFixed(2),
      f.shipping_cost?.toFixed(2),
      f.platform_fee?.toFixed(2),
      f.processing_fee?.toFixed(2),
      f.net_profit?.toFixed(2),
      f.roi?.toFixed(1),
      f.date_sold || '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trackly-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-xl font-bold tracking-tight">Reports</h1>
        {flips.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="text-xs gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        )}
      </motion.div>

      {allFlips.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No data yet"
          description="Start logging flips to see your reports and analytics here."
        />
      ) : (
        <>
          {/* Date Range */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
            {DATE_RANGES.map((r, i) => (
              <button
                key={r.label}
                onClick={() => setRange(i)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                  range === i
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {stats && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Revenue"
                  value={`$${stats.totalRevenue.toFixed(2)}`}
                  delay={0}
                />
                <StatCard
                  label="Total Cost"
                  value={`$${stats.totalCost.toFixed(2)}`}
                  delay={0.05}
                />
                <StatCard
                  label="Net Profit"
                  value={`$${stats.totalProfit.toFixed(2)}`}
                  icon={stats.totalProfit >= 0 ? TrendingUp : TrendingDown}
                  delay={0.1}
                />
                <StatCard
                  label="Avg ROI"
                  value={`${stats.avgRoi.toFixed(1)}%`}
                  delay={0.15}
                />
              </div>

              <ProfitChart flips={flips} />
              <PlatformChart flips={flips} />

              {/* Best & Worst */}
              <div className="space-y-3">
                {stats.best && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Best Flip
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">{stats.best.item_name}</span>
                      <span className="text-primary font-bold">+${stats.best.net_profit?.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                {stats.worst && stats.worst.net_profit < 0 && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-4 h-4 text-destructive" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Worst Flip
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">{stats.worst.item_name}</span>
                      <span className="text-destructive font-bold">${stats.worst.net_profit?.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
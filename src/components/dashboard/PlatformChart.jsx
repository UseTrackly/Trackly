import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { PLATFORMS } from '@/lib/platformFees';

export default function PlatformChart({ flips: flipsProp }) {
  const flips = Array.isArray(flipsProp) ? flipsProp : [];
  const platformData = {};
  flips.forEach(flip => {
    const p = flip.platform;
    if (!platformData[p]) platformData[p] = { platform: PLATFORMS[p]?.name || p, profit: 0, count: 0 };
    platformData[p].profit += flip.net_profit || 0;
    platformData[p].count += 1;
  });

  const data = Object.values(platformData)
    .sort((a, b) => b.profit - a.profit)
    .map(d => ({ ...d, profit: Math.round(d.profit * 100) / 100 }));

  if (data.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Profit by Platform
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <XAxis
              type="number"
              tickFormatter={(v) => `$${v}`}
              tick={{ fontSize: 10, fill: 'hsl(0,0%,55%)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="platform"
              tick={{ fontSize: 11, fill: 'hsl(0,0%,75%)' }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0,0%,7%)',
                border: '1px solid hsl(0,0%,14%)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value) => [`$${value.toFixed(2)}`, 'Profit']}
            />
            <Bar
              dataKey="profit"
              fill="hsl(160, 84%, 39%)"
              radius={[0, 6, 6, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
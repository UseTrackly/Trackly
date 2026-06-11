import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { format } from 'date-fns';

export default function ProfitChart({ flips: flipsProp }) {
  const flips = Array.isArray(flipsProp) ? flipsProp : [];
  // Group flips by date and sum profit
  const dataMap = {};
  flips.forEach(flip => {
    const date = flip.date_sold || flip.created_date?.split('T')[0];
    if (!date) return;
    if (!dataMap[date]) dataMap[date] = { date, profit: 0, count: 0 };
    dataMap[date].profit += flip.net_profit || 0;
    dataMap[date].count += 1;
  });

  const data = Object.values(dataMap)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .reduce((acc, item) => {
      const cumProfit = (acc.length > 0 ? acc[acc.length - 1].cumProfit : 0) + item.profit;
      acc.push({ ...item, cumProfit: Math.round(cumProfit * 100) / 100 });
      return acc;
    }, []);

  if (data.length < 2) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Cumulative Profit
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={(d) => format(new Date(d), 'MMM d')}
              tick={{ fontSize: 10, fill: 'hsl(0,0%,55%)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${v}`}
              tick={{ fontSize: 10, fill: 'hsl(0,0%,55%)' }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0,0%,7%)',
                border: '1px solid hsl(0,0%,14%)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value) => [`$${value.toFixed(2)}`, 'Total Profit']}
              labelFormatter={(d) => format(new Date(d), 'MMM d, yyyy')}
            />
            <Area
              type="monotone"
              dataKey="cumProfit"
              stroke="hsl(160, 84%, 39%)"
              strokeWidth={2}
              fill="url(#profitGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
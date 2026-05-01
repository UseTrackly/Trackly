import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Crown, TrendingUp, Target, Calendar, Award, Zap } from 'lucide-react';
import { formatCurrency } from '@/lib/currencyFormatter';
import { format, subDays, eachWeekOfInterval, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

const COLORS = ['hsl(160,84%,39%)', 'hsl(200,80%,50%)', 'hsl(280,65%,60%)', 'hsl(40,90%,55%)', 'hsl(340,75%,55%)'];

function SectionTitle({ children }) {
  return (
    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
      <Crown className="w-3 h-3 text-primary" />
      {children}
    </h3>
  );
}

export default function ProAnalytics({ flips = [], currency }) {
  // Weekly profit trend (last 8 weeks)
  const weeklyData = useMemo(() => {
    const weeks = eachWeekOfInterval({ start: subDays(new Date(), 56), end: new Date() });
    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart);
      const weekFlips = flips.filter(f => {
        const d = new Date(f.date_sold || f.created_date);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      });
      return {
        week: format(weekStart, 'MMM d'),
        profit: Math.round(weekFlips.reduce((s, f) => s + (f.net_profit || 0), 0) * 100) / 100,
        count: weekFlips.length,
      };
    });
  }, [flips]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const map = {};
    flips.forEach(f => {
      const cat = f.category || 'other';
      if (!map[cat]) map[cat] = { name: cat, profit: 0, count: 0 };
      map[cat].profit += f.net_profit || 0;
      map[cat].count++;
    });
    return Object.values(map)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)
      .map(d => ({ ...d, profit: Math.round(d.profit * 100) / 100 }));
  }, [flips]);

  // ROI distribution buckets
  const roiData = useMemo(() => {
    const buckets = [
      { label: '<0%', min: -Infinity, max: 0 },
      { label: '0-20%', min: 0, max: 20 },
      { label: '20-50%', min: 20, max: 50 },
      { label: '50-100%', min: 50, max: 100 },
      { label: '>100%', min: 100, max: Infinity },
    ];
    return buckets.map(b => ({
      label: b.label,
      count: flips.filter(f => (f.roi || 0) > b.min && (f.roi || 0) <= b.max).length,
    }));
  }, [flips]);

  // Best day of week
  const dayOfWeekData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const map = {};
    days.forEach(d => { map[d] = { day: d, profit: 0, count: 0 }; });
    flips.forEach(f => {
      const d = new Date(f.date_sold || f.created_date);
      const day = days[d.getDay()];
      map[day].profit += f.net_profit || 0;
      map[day].count++;
    });
    return days.map(d => ({ ...map[d], profit: Math.round(map[d].profit * 100) / 100 }));
  }, [flips]);

  // Key stats
  const stats = useMemo(() => {
    if (!flips.length) return null;
    const profitable = flips.filter(f => (f.net_profit || 0) > 0);
    const winRate = (profitable.length / flips.length) * 100;
    const avgProfit = flips.reduce((s, f) => s + (f.net_profit || 0), 0) / flips.length;
    const avgRoi = flips.reduce((s, f) => s + (f.roi || 0), 0) / flips.length;
    const topCategory = categoryData[0];
    return { winRate, avgProfit, avgRoi, topCategory };
  }, [flips, categoryData]);

  if (!flips.length) return null;

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { Icon: Target, label: 'Win Rate', value: `${stats.winRate.toFixed(0)}%`, sub: 'profitable flips' },
            { Icon: TrendingUp, label: 'Avg Profit', value: formatCurrency(stats.avgProfit, currency), sub: 'per flip' },
            { Icon: Zap, label: 'Avg ROI', value: `${stats.avgRoi.toFixed(1)}%`, sub: 'return on investment' },
            { Icon: Award, label: 'Top Category', value: stats.topCategory?.name || '—', sub: `${stats.topCategory?.count || 0} flips` },
          ].map(({ Icon, label, value, sub }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-3"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
              </div>
              <p className="text-lg font-bold leading-tight">{value}</p>
              <p className="text-[10px] text-muted-foreground">{sub}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Weekly Profit Trend */}
      {weeklyData.some(w => w.count > 0) && (
        <div className="bg-card border border-border rounded-xl p-4">
          <SectionTitle>Weekly Profit Trend</SectionTitle>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'hsl(0,0%,55%)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 9, fill: 'hsl(0,0%,55%)' }} axisLine={false} tickLine={false} width={42} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(0,0%,7%)', border: '1px solid hsl(0,0%,14%)', borderRadius: '8px', fontSize: '11px' }}
                  formatter={v => [`$${v}`, 'Profit']}
                />
                <Line type="monotone" dataKey="profit" stroke="hsl(160,84%,39%)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(160,84%,39%)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Profit Breakdown */}
      {categoryData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <SectionTitle>Profit by Category</SectionTitle>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" tickFormatter={v => `$${v}`} tick={{ fontSize: 9, fill: 'hsl(0,0%,55%)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(0,0%,55%)' }} axisLine={false} tickLine={false} width={60} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(0,0%,7%)', border: '1px solid hsl(0,0%,14%)', borderRadius: '8px', fontSize: '11px' }}
                  formatter={v => [`$${v}`, 'Profit']}
                />
                <Bar dataKey="profit" fill="hsl(160,84%,39%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ROI Distribution */}
      {roiData.some(d => d.count > 0) && (
        <div className="bg-card border border-border rounded-xl p-4">
          <SectionTitle>ROI Distribution</SectionTitle>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roiData}>
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(0,0%,55%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(0,0%,55%)' }} axisLine={false} tickLine={false} width={24} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(0,0%,7%)', border: '1px solid hsl(0,0%,14%)', borderRadius: '8px', fontSize: '11px' }}
                  formatter={v => [v, 'Flips']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {roiData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Best Day of Week */}
      {dayOfWeekData.some(d => d.count > 0) && (
        <div className="bg-card border border-border rounded-xl p-4">
          <SectionTitle>Profit by Day of Week</SectionTitle>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekData}>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'hsl(0,0%,55%)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 9, fill: 'hsl(0,0%,55%)' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(0,0%,7%)', border: '1px solid hsl(0,0%,14%)', borderRadius: '8px', fontSize: '11px' }}
                  formatter={v => [`$${v}`, 'Profit']}
                />
                <Bar dataKey="profit" fill="hsl(200,80%,50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
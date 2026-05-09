import React, { useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, Hash, AlertTriangle, Calculator, ArrowRight, MessageSquare, Users, User as UserIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/currencyFormatter';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import FlipCard from '@/components/history/FlipCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, isToday, subDays, isAfter } from 'date-fns';
import AIAssistant from '@/components/ai/AIAssistant';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import ProUpgradeCard from '@/components/upgrade/ProUpgradeCard';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('today');
  const queryClient = useQueryClient();
  const handleRefresh = useCallback(() => queryClient.invalidateQueries(), [queryClient]);
  const { pullDistance, isRefreshing, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh(handleRefresh);
  const navigate = useNavigate();

  const { isAuthenticated } = useAuth();

  const { data: allFlips = [], isLoading } = useQuery({
    queryKey: ['flips'],
    queryFn: () => base44.entities.Flip.list('-created_date', 500),
    enabled: isAuthenticated,
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
  });

  const { data: communityFlips = [] } = useQuery({
    queryKey: ['communityFlips'],
    queryFn: () => base44.entities.CommunityFlip.list('-created_date', 10),
  });

  const todayFlips = useMemo(() => {
    return allFlips.filter(f => {
      const date = f.date_sold || f.created_date;
      return date && isToday(new Date(date));
    });
  }, [allFlips]);

  const last7DaysFlips = useMemo(() => {
    const cutoff = subDays(new Date(), 7);
    return allFlips.filter(f => {
      const date = f.date_sold || f.created_date;
      return date && isAfter(new Date(date), cutoff);
    });
  }, [allFlips]);

  const todayStats = useMemo(() => {
    const totalProfit = todayFlips.reduce((s, f) => s + (f.net_profit || 0), 0);
    const avgRoi = todayFlips.length > 0
      ? todayFlips.reduce((s, f) => s + (f.roi || 0), 0) / todayFlips.length
      : 0;
    const totalFees = todayFlips.reduce((s, f) => s + (f.platform_fee || 0) + (f.processing_fee || 0), 0);

    return {
      totalFlips: todayFlips.length,
      totalProfit: Math.round(totalProfit * 100) / 100,
      avgRoi: Math.round(avgRoi * 10) / 10,
      totalFees: Math.round(totalFees * 100) / 100,
    };
  }, [todayFlips]);

  const weekStats = useMemo(() => {
    const totalProfit = last7DaysFlips.reduce((s, f) => s + (f.net_profit || 0), 0);
    const avgRoi = last7DaysFlips.length > 0
      ? last7DaysFlips.reduce((s, f) => s + (f.roi || 0), 0) / last7DaysFlips.length
      : 0;

    return {
      totalFlips: last7DaysFlips.length,
      totalProfit: Math.round(totalProfit * 100) / 100,
      avgRoi: Math.round(avgRoi * 10) / 10,
    };
  }, [last7DaysFlips]);

  const firstName = user?.full_name?.split(' ')[0] || 'Reseller';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="px-3 py-4 space-y-4"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div className="flex justify-center pt-1" style={{ height: isRefreshing ? 32 : pullDistance * 0.45 }}>
          <div className={`w-5 h-5 border-2 border-primary border-t-transparent rounded-full ${isRefreshing ? 'animate-spin' : ''}`} />
        </div>
      )}
      {/* Header with Profile Picture */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        {user?.profile_picture ? (
          <img
            src={user.profile_picture}
            alt={user.full_name}
            className="w-10 h-10 rounded-full object-cover border-2 border-primary"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary">
            <UserIcon className="w-5 h-5 text-primary" />
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">Welcome back,</p>
          <h1 className="text-lg font-bold tracking-tight">{firstName}</h1>
        </div>
      </motion.div>

      {/* Pro Upgrade */}
      <ProUpgradeCard compact />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="ai">
            <MessageSquare className="w-4 h-4 mr-1.5" />
            AI
          </TabsTrigger>
        </TabsList>

        {/* Today Tab */}
        <TabsContent value="today" className="space-y-4">
          {todayFlips.length === 0 ? (
            allFlips.length === 0 ? (
              <EmptyState
                icon={Calculator}
                title="No flips yet"
                description="Run your first calculation and save it to start tracking your profit."
                action={
                  <Button onClick={() => navigate('/calculator')} className="bg-primary hover:bg-primary/90">
                    Open Calculator <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center py-4">
                  No flips today yet. Last activity: {format(new Date(allFlips[0].date_sold || allFlips[0].created_date), 'MMM d, yyyy')}
                </p>
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Recent Flips
                  </h3>
                  {allFlips.slice(0, 3).map((flip, i) => (
                    <FlipCard key={flip.id} flip={flip} index={i} />
                  ))}
                </div>
              </div>
            )
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Today's Flips"
                  value={todayStats.totalFlips}
                  icon={Hash}
                  delay={0}
                />
                <StatCard
                  label="Today's Profit"
                  value={formatCurrency(todayStats.totalProfit, user?.currency)}
                  icon={DollarSign}
                  delay={0.1}
                />
                <StatCard
                  label="Avg ROI"
                  value={`${todayStats.avgRoi}%`}
                  icon={TrendingUp}
                  delay={0.2}
                />
                <StatCard
                  label="Fees Paid"
                  value={formatCurrency(todayStats.totalFees, user?.currency)}
                  icon={AlertTriangle}
                  delay={0.3}
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Today's Flips
                </h3>
                {todayFlips.map((flip, i) => (
                  <FlipCard key={flip.id} flip={flip} index={i} currency={user?.currency} />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Week Tab */}
        <TabsContent value="week" className="space-y-4">
          {last7DaysFlips.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No activity this week"
              description="Start logging flips to see your weekly performance."
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="This Week"
                  value={weekStats.totalFlips}
                  icon={Hash}
                  delay={0}
                />
                <StatCard
                  label="Weekly Profit"
                  value={formatCurrency(weekStats.totalProfit, user?.currency)}
                  icon={DollarSign}
                  delay={0.1}
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Last 7 Days
                </h3>
                {last7DaysFlips.map((flip, i) => (
                  <FlipCard key={flip.id} flip={flip} index={i} currency={user?.currency} />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai">
          <AIAssistant />
        </TabsContent>
      </Tabs>

      {/* Community Listings Scroll */}
      {communityFlips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Community Flips</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/community')}
              className="text-xs"
            >
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-2">
              {communityFlips.map((flip) => (
                <div
                  key={flip.id}
                  onClick={() => navigate('/community')}
                  className="flex-shrink-0 w-48 bg-card border border-border rounded-xl p-3 cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {flip.image_url && (
                    <img
                      src={flip.image_url}
                      alt={flip.item_name}
                      className="w-full h-28 object-cover rounded-lg mb-2"
                    />
                  )}
                  <h4 className="font-semibold text-sm line-clamp-1 mb-1">{flip.item_name}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{flip.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary capitalize">
                      {flip.category}
                    </span>
                    <span className="text-sm font-bold text-primary">${flip.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </div>
  );
}
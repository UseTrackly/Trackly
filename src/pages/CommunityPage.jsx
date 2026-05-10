import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Heart, MessageCircle, MapPin, TrendingUp, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmptyState from '@/components/shared/EmptyState';
import PostFlipDialog from '@/components/community/PostFlipDialog';
import FlipDetailsDialog from '@/components/community/FlipDetailsDialog';
import FeaturedListings from '@/components/community/FeaturedListings';
import MarketAlerts from '@/components/alerts/MarketAlerts';
import ManagePosts from '@/components/community/ManagePosts';

const CATEGORIES = [
  { value: 'all', label: 'All', count: 0 },
  { value: 'cards', label: 'Cards', count: 0 },
  { value: 'sneakers', label: 'Sneakers', count: 0 },
  { value: 'technology', label: 'Tech', count: 0 },
  { value: 'games', label: 'Games', count: 0 },
  { value: 'clothing', label: 'Clothing', count: 0 },
  { value: 'electronics', label: 'Computers', count: 0 },
  { value: 'vintage', label: 'Vintage', count: 0 },
];

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState('community');
  const [showPost, setShowPost] = useState(false);
  const [selectedFlip, setSelectedFlip] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: communityFlipsRaw, isLoading } = useQuery({
    queryKey: ['communityFlips'],
    queryFn: () => base44.entities.CommunityFlip.list('-created_date', 100),
    initialData: [],
  });
  const communityFlips = Array.isArray(communityFlipsRaw) ? communityFlipsRaw : [];

  const requireAuth = () => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.href);
      return false;
    }
    return true;
  };

  const interestMutation = useMutation({
    mutationFn: async (flipId) => {
      const flip = communityFlips.find(f => f.id === flipId);
      const interested = flip.interested_users || [];
      const isInterested = interested.includes(user?.email);
      const updated = isInterested
        ? interested.filter(e => e !== user?.email)
        : [...interested, user?.email];
      await base44.entities.CommunityFlip.update(flipId, { interested_users: updated });
    },
    onMutate: async (flipId) => {
      await queryClient.cancelQueries({ queryKey: ['communityFlips'] });
      const previous = queryClient.getQueryData(['communityFlips']);
      queryClient.setQueryData(['communityFlips'], (old = []) =>
      old.map(f => {
        if (f.id !== flipId) return f;
        const interested = f.interested_users || [];
        const isInterested = interested.includes(user?.email);
          return {
            ...f,
            interested_users: isInterested
            ? interested.filter(e => e !== user?.email)
            : [...interested, user?.email],
          };
        })
      );
      return { previous };
    },
    onError: (_err, _flipId, context) => {
      queryClient.setQueryData(['communityFlips'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['communityFlips'] });
    },
  });

  // Sort by user's categories first, then by date
  const sortedFlips = useMemo(() => {
    if (!user?.selected_categories) return communityFlips;
    
    return [...communityFlips].sort((a, b) => {
      const aMatch = user.selected_categories.includes(a.category);
      const bMatch = user.selected_categories.includes(b.category);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  }, [communityFlips, user]);

  const filteredFlips = useMemo(() => {
    if (categoryFilter === 'all') return sortedFlips;
    return sortedFlips.filter(f => f.category === categoryFilter);
  }, [sortedFlips, categoryFilter]);

  // Calculate category counts
  const categoriesWithCounts = useMemo(() => {
    return CATEGORIES.map(cat => ({
      ...cat,
      count: cat.value === 'all' ? communityFlips.length : communityFlips.filter(f => f.category === cat.value).length
    }));
  }, [communityFlips]);

  const totalInterests = communityFlips.reduce((sum, f) => sum + (f.interested_users?.length || 0), 0);
  const avgMargin = communityFlips.length > 0
    ? communityFlips.reduce((sum, f) => {
        const margin = f.price > 0 ? ((f.price * 0.15) / f.price) * 100 : 0;
        return sum + margin;
      }, 0) / communityFlips.length
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-3 py-4 space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pl-32"
      >
        <h1 className="text-lg font-bold tracking-tight">Community</h1>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-card border border-border">
          <TabsTrigger value="community">Trackly</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="manage">Manage</TabsTrigger>
        </TabsList>

        <TabsContent value="community" className="space-y-3">
          <div className="pb-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Community Showcase</p>
            <h2 className="text-lg font-bold tracking-tight">
              What the community is flipping
            </h2>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-1.5 bg-card border border-border rounded-lg p-2.5">
        <div className="text-center">
          <p className="text-lg font-bold">{communityFlips.length}</p>
          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Listings</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{totalInterests}+</p>
          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Interests</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{categoriesWithCounts.filter(c => c.count > 0).length - 1}</p>
          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Categories</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{avgMargin.toFixed(0)}%</p>
          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Margin</p>
          </div>
          </div>

          {/* Post Button */}
          <Button
        onClick={() => requireAuth() && setShowPost(true)}
        className="w-full h-9 text-sm font-semibold bg-primary hover:bg-primary/90 rounded-lg"
      >
            <Plus className="w-4 h-4 mr-2" />
            Post Your Flip
          </Button>

          {/* Category Filters */}
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-3 px-3">
        {categoriesWithCounts.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategoryFilter(cat.value)}
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
              categoryFilter === cat.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-foreground border-border hover:border-muted-foreground/30'
            }`}
          >
            {cat.label}
            <span className="ml-1 text-[10px] opacity-70">{cat.count}</span>
            </button>
          ))}
          </div>

          {/* Flips Grid */}
          {filteredFlips.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No flips in this category yet"
              description="Be the first to share a flip opportunity."
              action={
                <Button onClick={() => requireAuth() && setShowPost(true)} className="bg-primary hover:bg-primary/90">
                  Post Your First Flip
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
          <AnimatePresence>
            {filteredFlips.map((flip, i) => {
              const isInterested = flip.interested_users?.includes(user?.email);
              const interestCount = flip.interested_users?.length || 0;
              const buyPrice = flip.price * 0.6;
              const margin = ((flip.price - buyPrice) / buyPrice * 100).toFixed(0);
              const isPosterPro = flip.is_poster_pro;

              return (
                <motion.div
                  key={flip.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  {/* Image */}
                  {flip.image_url && (
                    <div className="relative">
                      <img
                        src={flip.image_url}
                        alt={flip.item_name}
                        className="w-full h-20 object-cover"
                      />
                      <div className="absolute top-1.5 left-1.5 flex gap-1">
                        <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-[8px] font-medium uppercase tracking-wider">
                          {flip.category}
                        </span>
                        {i < 3 && (
                          <span className="px-2 py-0.5 rounded-full bg-orange-500/90 backdrop-blur-sm text-white text-[8px] font-bold uppercase tracking-wider">
                            HOT
                          </span>
                        )}
                      </div>
                      <div className="absolute top-1.5 right-1.5">
                        <span className="px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-[8px] font-medium">
                          {flip.posted_by_name?.[0] || 'U'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-2 space-y-1">
                    <div>
                      <div className="flex items-start justify-between mb-0.5">
                        <div className="flex items-center gap-1">
                          <p className="text-[8px] text-muted-foreground">
                            {flip.posted_by_name} · {new Date(flip.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          {flip.is_poster_pro && (
                            <Crown className="w-2.5 h-2.5 text-primary shrink-0" />
                          )}
                        </div>
                      </div>
                      <h3 className="font-bold text-xs leading-tight line-clamp-1">{flip.item_name}</h3>
                    </div>

                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {flip.description}
                    </p>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-1 pt-1">
                      <div>
                        <p className="text-[8px] text-muted-foreground">Buy</p>
                        <p className="text-[10px] font-semibold">${buyPrice.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-muted-foreground">Sell</p>
                        <p className="text-[10px] font-semibold">${flip.price?.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-muted-foreground">Margin</p>
                        <p className="text-[10px] font-semibold text-primary">+{margin}%</p>
                      </div>
                    </div>

                    {flip.location && (
                      <div className="flex items-center gap-0.5 text-[8px] text-muted-foreground pt-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        <span className="truncate">{flip.location}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-1 pt-1">
                      <Button
                       variant={isInterested ? "default" : "outline"}
                       size="sm"
                       onClick={() => requireAuth() && interestMutation.mutate(flip.id)}
                       className="flex-1 h-6 text-[10px]"
                      >
                        <Heart className={`w-3 h-3 mr-0.5 ${isInterested ? 'fill-current' : ''}`} />
                        Interested
                        {interestCount > 0 && (
                          <span className="ml-0.5">{interestCount}</span>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => requireAuth() && setSelectedFlip(flip)}
                        className="h-6 w-6 p-0"
                      >
                        <MessageCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
              })}
            </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="featured">
          <FeaturedListings />
        </TabsContent>

        <TabsContent value="alerts">
          <MarketAlerts />
        </TabsContent>

        <TabsContent value="manage">
          <ManagePosts />
        </TabsContent>
      </Tabs>

      <PostFlipDialog
        open={showPost}
        onClose={() => setShowPost(false)}
      />

      {selectedFlip && (
        <FlipDetailsDialog
          flip={selectedFlip}
          open={!!selectedFlip}
          onClose={() => setSelectedFlip(null)}
        />
      )}
    </div>
  );
}
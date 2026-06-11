import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ExternalLink, RefreshCw, TrendingUp, MapPin, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PlatformBadge from '@/components/shared/PlatformBadge';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'sneakers', label: 'Sneakers' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'cards', label: 'Cards' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'collectibles', label: 'Collectibles' },
  { value: 'games', label: 'Games' },
  { value: 'technology', label: 'Technology' },
  { value: 'vintage', label: 'Vintage' },
];

export default function FeaturedListings() {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['featuredListings'],
    queryFn: () => base44.entities.CommunityFlip.list('-created_date', 100),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      queryClient.invalidateQueries({ queryKey: ['featuredListings'] });
    },
    onSuccess: () => {
      toast.success('Featured listings refreshed');
    },
  });

  const safeListings = Array.isArray(listings) ? listings : [];
  const filteredListings = safeListings
    .filter(l => categoryFilter === 'all' || l.category === categoryFilter)
    .sort((a, b) => (b.interested_users?.length || 0) - (a.interested_users?.length || 0));

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 bg-card border-border text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshMutation.isPending}
          className="text-xs gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {filteredListings.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No featured listings"
          description="Check back soon for new marketplace opportunities"
          action={
            <Button onClick={handleRefresh} size="sm" className="bg-primary hover:bg-primary/90">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Load Listings
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filteredListings.map((listing, i) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-lg p-3 space-y-1.5 hover:border-primary/50 transition-colors cursor-pointer"
            >
              {listing.image_url && (
                <img
                  src={listing.image_url}
                  alt={listing.item_name}
                  className="w-full h-24 object-cover rounded-md"
                />
              )}
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-xs line-clamp-1">
                    {listing.item_name}
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary capitalize font-medium shrink-0 whitespace-nowrap">
                    {listing.category}
                  </span>
                </div>

                <p className="text-[10px] text-muted-foreground line-clamp-1">
                  {listing.description || `By ${listing.posted_by_name}`}
                </p>

                {listing.location && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <MapPin className="w-2.5 h-2.5" />
                    <span className="truncate">{listing.location}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <p className="text-xs font-bold text-primary">
                    ${listing.price?.toFixed(0)}
                  </p>
                  {listing.interested_users?.length > 0 && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-primary" />
                      <span className="text-[10px] text-primary font-medium">{listing.interested_users.length}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Heart, MessageCircle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/shared/EmptyState';
import PostFlipDialog from './PostFlipDialog';
import FlipDetailsDialog from './FlipDetailsDialog';

export default function CommunityFeed() {
  const [showPost, setShowPost] = useState(false);
  const [selectedFlip, setSelectedFlip] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: communityFlips = [], isLoading } = useQuery({
    queryKey: ['communityFlips'],
    queryFn: () => base44.entities.CommunityFlip.list('-created_date', 100),
  });

  const interestMutation = useMutation({
    mutationFn: async (flipId) => {
      const flip = communityFlips.find(f => f.id === flipId);
      const interested = flip.interested_users || [];
      const isInterested = interested.includes(user.email);
      
      const updated = isInterested
        ? interested.filter(e => e !== user.email)
        : [...interested, user.email];

      await base44.entities.CommunityFlip.update(flipId, {
        interested_users: updated
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityFlips'] });
    },
  });

  // Sort by user's categories
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {sortedFlips.length} flip{sortedFlips.length !== 1 ? 's' : ''} available
        </p>
        <Button
          onClick={() => setShowPost(true)}
          size="sm"
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Post Flip
        </Button>
      </div>

      {sortedFlips.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No community flips yet"
          description="Be the first to share a flip opportunity with the community."
          action={
            <Button onClick={() => setShowPost(true)} className="bg-primary hover:bg-primary/90">
              Post Your First Flip
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {sortedFlips.map((flip, i) => {
            const isInterested = flip.interested_users?.includes(user.email);
            const interestCount = flip.interested_users?.length || 0;

            return (
              <motion.div
                key={flip.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-lg p-2 space-y-1 hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => setSelectedFlip(flip)}
              >
                {flip.image_url && (
                  <img
                    src={flip.image_url}
                    alt={flip.item_name}
                    className="w-full h-16 object-cover rounded-md"
                  />
                )}
                
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-xs line-clamp-1">{flip.item_name}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {flip.posted_by_name}
                      </p>
                    </div>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0 whitespace-nowrap">
                      {flip.category}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {flip.description}
                  </p>

                  {flip.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-2.5 h-2.5" />
                      <span className="truncate">{flip.location}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <p className="text-xs font-bold text-primary">${flip.price?.toFixed(0)}</p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant={isInterested ? "default" : "ghost"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          interestMutation.mutate(flip.id);
                        }}
                        className="h-8 px-2 text-xs min-w-[44px]"
                      >
                        <Heart className={`w-3 h-3 ${isInterested ? 'fill-current' : ''}`} />
                      </Button>
                      {interestCount > 0 && (
                        <span className="text-xs font-medium text-primary">{interestCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

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
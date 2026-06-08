import React, { useState } from 'react';
import { usePageTab } from '@/lib/PageTabContext';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';
import PostFlipDialog from '@/components/community/PostFlipDialog';
import FlipDetailsDialog from '@/components/community/FlipDetailsDialog';
import FeaturedListings from '@/components/community/FeaturedListings';
import MarketAlerts from '@/components/alerts/MarketAlerts';
import ManagePosts from '@/components/community/ManagePosts';
import CommunityFeed from '@/components/community/CommunityFeed';


export default function CommunityPage() {
  const [activeTab, setActiveTab] = usePageTab('/community');
  const [showPost, setShowPost] = useState(false);
  const [selectedFlip, setSelectedFlip] = useState(null);
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

  // Fetch current user's blocked list — use shared profile cache key
  const { data: myProfile } = useQuery({
    queryKey: ['userProfile', user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user?.email }, '-created_date', 1).then(r => r?.[0] ?? null),
    enabled: !!user?.email,
    staleTime: 60_000,
  });
  const blockedUsers = myProfile?.blocked_users || [];

  const communityFlips = (Array.isArray(communityFlipsRaw) ? communityFlipsRaw : [])
    .filter(f => !blockedUsers.includes(f.posted_by));

  const totalInterests = communityFlips.reduce((sum, f) => sum + (f.interested_users?.length || 0), 0);

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
      queryClient.setQueryData(['communityFlips'], (old) =>
      (Array.isArray(old) ? old : []).map(f => {
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



  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header with activity stats */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3 pt-4 pb-2"
      >
        <h1 className="text-lg font-bold tracking-tight">Community</h1>
        {communityFlips.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {communityFlips.length} active listings • {totalInterests} collectors interested
          </p>
        )}
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="hidden" />

        <TabsContent value="community" className="px-0 pb-0">
          <CommunityFeed
            user={user}
            blockedUsers={blockedUsers}
            onPostFlip={() => setShowPost(true)}
            onFlipClick={setSelectedFlip}
            onInterest={(flipId) => interestMutation.mutate(flipId)}
          />
        </TabsContent>

        <TabsContent value="featured" className="px-3 pb-24">
          <FeaturedListings />
        </TabsContent>

        <TabsContent value="alerts" className="px-3 pb-24">
          <MarketAlerts />
        </TabsContent>

        <TabsContent value="manage" className="px-3 pb-24">
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
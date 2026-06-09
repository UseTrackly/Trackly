import React, { useState, useEffect } from 'react';
import { usePageTab } from '@/lib/PageTabContext';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';

import PostFlipDialog from '@/components/community/PostFlipDialog';
import FlipDetailsSheet from '@/components/community/FlipDetailsSheet';
import MessageInbox from '@/components/community/MessageInbox';

import CommunityFeed from '@/components/community/CommunityFeed';


export default function CommunityPage() {
  const [activeTab, setActiveTab] = usePageTab('/community', 'discover');
  const [showPost, setShowPost] = useState(false);
  const [selectedFlip, setSelectedFlip] = useState(null);
  const [showInbox, setShowInbox] = useState(false);
  const [inboxContactEmail, setInboxContactEmail] = useState(null);
  const queryClient = useQueryClient();
  const location = useLocation();

  // Auto-open inbox when navigated here from "Contact Seller"
  useEffect(() => {
    if (location.state?.openInbox) {
      setInboxContactEmail(location.state.contactEmail || null);
      setShowInbox(true);
      // Clear the state so back/forward nav doesn't re-trigger
      window.history.replaceState({}, '');
    }
  }, [location.state]);

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
        className="px-3 pt-3 pb-2"
      >
        <h1 className="text-lg font-bold tracking-tight">Community</h1>
        {communityFlips.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {communityFlips.length} active listings • {totalInterests} collectors interested
          </p>
        )}
      </motion.div>

      <CommunityFeed
        user={user}
        flips={communityFlips}
        blockedUsers={blockedUsers}
        activeTab={activeTab}
        onPostFlip={() => setShowPost(true)}
        onFlipClick={setSelectedFlip}
        onInterest={(flipId) => interestMutation.mutate(flipId)}
      />

      <PostFlipDialog
        open={showPost}
        onClose={() => setShowPost(false)}
      />

      {selectedFlip && (
        <FlipDetailsSheet
          flip={selectedFlip}
          open={!!selectedFlip}
          onClose={() => setSelectedFlip(null)}
        />
      )}

      <MessageInbox
        open={showInbox}
        onClose={() => { setShowInbox(false); setInboxContactEmail(null); }}
        preselectRecipientEmail={inboxContactEmail}
      />
    </div>
  );
}
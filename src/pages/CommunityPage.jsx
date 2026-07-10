import React, { useState, useEffect } from 'react';
import { usePageTab } from '@/lib/PageTabContext';
import { useModal } from '@/lib/ModalContext';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import PostFlipDialog from '@/components/community/PostFlipDialog';
import FlipDetailsSheet from '@/components/community/FlipDetailsSheet';
import MessageInbox from '@/components/community/MessageInbox';

import CommunityFeed from '@/components/community/CommunityFeed';


export default function CommunityPage() {
  const [activeTab, setActiveTab] = usePageTab('/community', 'discover');
  const [selectedFlip, setSelectedFlip] = useState(null);
  const [inboxContactEmail, setInboxContactEmail] = useState(null);
  const [inboxFlipId, setInboxFlipId] = useState(null);
  const { isOpen, open, close } = useModal();
  const queryClient = useQueryClient();
  const location = useLocation();

  // Auto-open inbox when navigated here from "Contact Seller"
  useEffect(() => {
    if (location.state?.openInbox) {
      setInboxContactEmail(location.state.contactEmail || null);
      setInboxFlipId(location.state.flipId || null);
      open('community-inbox');
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
      // Use backend function — bypasses RLS so any user can toggle interest on any listing
      const res = await base44.functions.invoke('toggleInterest', { flip_id: flipId });
      if (!res.data?.success) throw new Error(res.data?.error || 'Failed to update interest');
      return { flipId, updated: res.data.interested_users };
    },
    onMutate: async (flipId) => {
      // Optimistic update so UI feels instant
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
      toast.error('Failed to update interest');
    },
    onSuccess: ({ flipId, updated }) => {
      // Patch cache with confirmed server value
      queryClient.setQueryData(['communityFlips'], (old) =>
        (Array.isArray(old) ? old : []).map(f =>
          f.id === flipId ? { ...f, interested_users: updated } : f
        )
      );
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
        onPostFlip={() => open('community-post')}
        onFlipClick={(flip) => { setSelectedFlip(flip); open('community-details'); }}
        onInterest={(flipId) => interestMutation.mutate(flipId)}
      />

      <PostFlipDialog
        open={isOpen('community-post')}
        onClose={() => close('community-post')}
      />

      {selectedFlip && (
        <FlipDetailsSheet
          flip={selectedFlip}
          open={isOpen('community-details')}
          onClose={() => { close('community-details'); setSelectedFlip(null); }}
          onInterest={(flipId) => requireAuth() && interestMutation.mutate(flipId)}
        />
      )}

      <MessageInbox
        open={isOpen('community-inbox')}
        onClose={() => { close('community-inbox'); setInboxContactEmail(null); setInboxFlipId(null); }}
        preselectRecipientEmail={inboxContactEmail}
        preselectFlipId={inboxFlipId}
      />
    </div>
  );
}
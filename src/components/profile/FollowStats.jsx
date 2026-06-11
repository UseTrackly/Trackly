import React, { useState } from 'react';
import { base44, ensureTokenSynced, nativeStorage } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function FollowStats({ profile, currentUserEmail, isOwnProfile, compact, onOpenPreview }) {
  const queryClient = useQueryClient();
  const followers = Array.isArray(profile?.followers) ? profile.followers : [];
  const following = Array.isArray(profile?.following) ? profile.following : [];
  const isFollowing = currentUserEmail ? followers.includes(currentUserEmail) : false;

  const followMutation = useMutation({
    mutationFn: async () => {
      await ensureTokenSynced();
      const token = await nativeStorage.get();
      const res = await base44.functions.invoke('profileManager', {
        action: isFollowing ? 'unfollow' : 'follow',
        target_email: profile.user_email,
        token,
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.target_profile) {
        queryClient.setQueryData(['userProfile', profile.user_email], data.target_profile);
      }
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      toast.success(isFollowing ? 'Unfollowed' : 'Following!');
    },
    onError: (e) => toast.error(e.message || 'Failed to update follow'),
  });

  if (compact) {
    return (
      <>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenPreview?.('followers'); }}
          className="text-center group"
        >
          <p className="text-base font-bold group-hover:text-primary transition-colors">{followers.length}</p>
          <p className="text-[11px] text-muted-foreground">Followers</p>
        </button>
        <div className="w-px h-8 bg-border" />
        <button
          onClick={(e) => { e.stopPropagation(); onOpenPreview?.('following'); }}
          className="text-center group"
        >
          <p className="text-base font-bold group-hover:text-primary transition-colors">{following.length}</p>
          <p className="text-[11px] text-muted-foreground">Following</p>
        </button>
      </>
    );
  }

  return (
    <div className="flex items-center gap-5 mt-4">
      <button
        onClick={(e) => { e.stopPropagation(); onOpenPreview?.('followers'); }}
        className="text-center group"
      >
        <p className="text-base font-bold group-hover:text-primary transition-colors">{followers.length}</p>
        <p className="text-[11px] text-muted-foreground">Followers</p>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onOpenPreview?.('following'); }}
        className="text-center group"
      >
        <p className="text-base font-bold group-hover:text-primary transition-colors">{following.length}</p>
        <p className="text-[11px] text-muted-foreground">Following</p>
      </button>

      {!isOwnProfile && currentUserEmail && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => followMutation.mutate()}
          disabled={followMutation.isPending}
          className={`ml-auto px-5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            isFollowing
              ? 'bg-secondary border-border text-foreground hover:border-destructive/50 hover:text-destructive'
              : 'bg-primary border-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {followMutation.isPending ? '...' : isFollowing ? 'Following' : 'Follow'}
        </motion.button>
      )}
    </div>
  );
}
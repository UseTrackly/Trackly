import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44, ensureTokenSynced, nativeStorage } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/currencyFormatter';
import {
  MapPin, MessageCircle, UserPlus, UserCheck, Package, TrendingUp, Lock, Crown, User, X, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProfileSongCard from '@/components/profile/ProfileSongCard';
import FollowStats from '@/components/profile/FollowStats';
import ProfitVisibilityToggle from '@/components/profile/ProfitVisibilityToggle';
import { toast } from 'sonner';
import ProfileLink from '@/components/shared/ProfileLink';

export default function ViewProfilePage() {
  const { userProfile: profileParam } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({ 
    queryKey: ['me'], 
    queryFn: () => base44.auth.me(),
  });

  const decodedParam = profileParam ? decodeURIComponent(profileParam) : null;
  
  console.log('[ViewProfilePage] Route param received:', { profileParam, decodedParam, currentUserEmail: currentUser?.email });
  
  // Lookup profile by username or email - profileManager will handle both
  const { data: otherProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ['otherProfile', decodedParam],
    queryFn: async () => {
      if (!decodedParam) return null;
      console.log('[ViewProfilePage] Looking up profile for:', decodedParam);
      const token = await nativeStorage.get();
      const res = await base44.functions.invoke('profileManager', { 
        action: 'getByParam', 
        viewer_email: currentUser?.email,
        lookup_param: decodedParam,
        token 
      });
      console.log('[ViewProfilePage] Profile lookup result:', { 
        requestedParam: decodedParam, 
        foundProfileEmail: res.data?.profile?.user_email,
        foundProfileUsername: res.data?.profile?.username 
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data?.profile;
    },
    enabled: !!decodedParam && !!currentUser,
  });

  // Check if viewing own profile - compare the route param to current user's email
  const isOwnProfile = decodedParam === currentUser?.email || decodedParam === currentUser?.full_name;
  
  console.log('[ViewProfilePage] isOwnProfile check:', { decodedParam, currentUserEmail: currentUser?.email, result: isOwnProfile });

  // Redirect to own profile page if viewing own profile
  useEffect(() => {
    if (isOwnProfile && otherProfile) {
      console.log('[ViewProfilePage] Redirecting to /profile (own profile)');
      navigate('/profile', { replace: true });
    }
  }, [isOwnProfile, otherProfile, navigate]);

  const [showFollowers, setShowFollowers] = useState(null);

  // Fetch other user's flips (public data only)
  const { data: flipsRaw = [] } = useQuery({
    queryKey: ['otherFlips', decodedParam],
    queryFn: () => base44.entities.Flip.filter({ created_by_email: decodedParam }, '-created_date', 50),
    enabled: !!decodedParam && !!otherProfile,
  });
  const flips = Array.isArray(flipsRaw) ? flipsRaw : [];

  // Fetch all profiles for username lookup in followers/following lists
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['allProfiles'],
    queryFn: () => base44.entities.UserProfile.list('-created_date', 500),
    initialData: [],
  });

  // Fetch other user's inventory
  const { data: inventoryRaw = [] } = useQuery({
    queryKey: ['otherInventory', decodedParam],
    queryFn: () => base44.entities.Inventory.filter({ created_by_email: decodedParam }, '-created_date', 50),
    enabled: !!decodedParam && !!otherProfile,
  });
  const inventory = Array.isArray(inventoryRaw) ? inventoryRaw : [];

  const totalProfit = flips.reduce((s, f) => s + (f.net_profit || 0), 0);
  const totalFlips = flips.length;
  const totalInventory = inventory.length;

  // Check if current user is following
  const isFollowing = currentUser && otherProfile?.followers?.includes(currentUser.email);
  console.log('[ViewProfilePage] Follow state:', {
    currentUserEmail: currentUser?.email,
    targetUserEmail: otherProfile?.user_email,
    targetFollowers: otherProfile?.followers,
    isFollowing
  });

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      const token = await nativeStorage.get();
      console.log('[ViewProfilePage] Follow mutation:', {
        currentUserEmail: currentUser?.email,
        currentUserFullname: currentUser?.full_name,
        targetUserEmail: otherProfile?.user_email,
        targetUsername: otherProfile?.username,
        action: isFollowing ? 'unfollow' : 'follow'
      });
      const res = await base44.functions.invoke('profileManager', {
        action: isFollowing ? 'unfollow' : 'follow',
        target_email: otherProfile?.user_email,
        token,
      });
      console.log('[ViewProfilePage] Follow mutation response:', res.data);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data?.profile;
    },
    onSuccess: (updatedProfile) => {
      console.log('[ViewProfilePage] Follow success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['otherProfile', decodedParam] });
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      toast.success(isFollowing ? 'Unfollowed' : 'Following!');
    },
    onError: (error) => {
      console.error('[ViewProfilePage] Follow mutation error:', error);
    },
  });

  // Message button
  const handleMessage = () => {
    navigate('/community', { state: { openMessages: true, prefillRecipient: otherProfile?.user_email } });
  };

  if (!decodedParam) {
    console.log('[ViewProfilePage] No route param, returning null');
    return null;
  }
  
  if (loadingProfile) {
    return null;
  }
  
  // Don't render if profile not found (but don't redirect - let the "not found" state handle it)
  if (!otherProfile) {
    console.log('[ViewProfilePage] Profile not found for:', decodedParam);
    return null;
  }
  
  // Don't render if it's own profile (should have redirected already)
  if (isOwnProfile) {
    console.log('[ViewProfilePage] Is own profile, skipping render');
    return null;
  }

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!otherProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <h1 className="text-xl font-bold mb-2">Profile Not Found</h1>
        <p className="text-muted-foreground text-center mb-4">
          This collector hasn't joined Trackly yet.
        </p>
        <Button onClick={() => navigate('/')} variant="outline">
          Back to Home
        </Button>
      </div>
    );
  }

  const displayName = otherProfile.display_name || otherProfile.username || otherProfile.user_email.split('@')[0];
  const avatarUrl = otherProfile.avatar_url;
  const bannerUrl = otherProfile.banner_url;
  const locationVal = otherProfile.location;
  const bio = otherProfile.bio;
  const isPro = otherProfile.is_pro || false;
  const profitVisible = otherProfile.profit_visibility !== 'private';

  // Category breakdown
  const categoryCount = {};
  flips.forEach(f => {
    categoryCount[f.category] = (categoryCount[f.category] || 0) + 1;
  });

  return (
    <div className="pb-24">
      {/* Banner */}
      <div className="relative w-full" style={{ height: 160 }}>
        {bannerUrl ? (
          <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary) / 0.25) 0%, hsl(var(--primary) / 0.05) 100%)',
            }}
          />
        )}
        {isPro && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/90 text-primary-foreground text-[11px] font-bold">
            <Crown className="w-3 h-3" />
            PRO
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="relative px-4 pb-4">
        <div className="flex items-end justify-between" style={{ marginTop: -40 }}>
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-background bg-secondary">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-muted-foreground">
                    {displayName[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handleMessage}
              className="w-10 h-10 rounded-full"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            <Button
              variant={isFollowing ? 'outline' : 'default'}
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              className="h-10 px-4 rounded-full"
            >
              {followMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isFollowing ? (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Follow
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Name & Username */}
        <div className="mt-3">
          <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
          {otherProfile.username && (
            <p className="text-sm text-muted-foreground">@{otherProfile.username}</p>
          )}
          {locationVal && (
            <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-xs">{locationVal}</span>
            </div>
          )}
          {otherProfile?.created_date && (
            <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-xs">Joined {new Date(otherProfile.created_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          )}
        </div>

        {/* Bio */}
        {bio && (
          <p className="text-sm text-foreground mt-3 leading-relaxed">{bio}</p>
        )}

        {/* Follow Stats */}
        <div className="flex items-center gap-5 mt-4">
          <button
            onClick={() => setShowFollowers('followers')}
            className="text-center group"
          >
            <p className="text-base font-bold group-hover:text-primary transition-colors">{otherProfile?.followers?.length || 0}</p>
            <p className="text-[11px] text-muted-foreground">Followers</p>
          </button>
          <button
            onClick={() => setShowFollowers('following')}
            className="text-center group"
          >
            <p className="text-base font-bold group-hover:text-primary transition-colors">{otherProfile?.following?.length || 0}</p>
            <p className="text-[11px] text-muted-foreground">Following</p>
          </button>
        </div>

        {/* Profile Song */}
        <ProfileSongCard
          songName={otherProfile.song_name}
          songArtist={otherProfile.song_artist}
          previewUrl={otherProfile.song_preview_url}
          artworkUrl={otherProfile.song_artwork_url}
          isPro={isPro}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl p-3 text-center">
            <Package className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{totalInventory}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Items</p>
          </div>
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{totalFlips}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Flips</p>
          </div>
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl p-3 text-center">
            {profitVisible ? (
              <>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(totalProfit, 'USD')}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Profit</p>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Private</p>
              </>
            )}
          </div>
        </div>

        {/* Collection Categories */}
        {Object.keys(categoryCount).length > 0 && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold mb-2">Collects</h2>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(categoryCount).slice(0, 6).map(([cat, count]) => (
                <div
                  key={cat}
                  className="px-2.5 py-1.5 rounded-lg bg-card/60 backdrop-blur-xl border border-border/50"
                >
                  <p className="text-[10px] font-medium text-foreground capitalize">{cat}</p>
                  <p className="text-[9px] text-muted-foreground">{count} items</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Followers/Following Dialog */}
        {showFollowers && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowFollowers(null)}
            />
            <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 max-w-[90vw] rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-base font-semibold">
                  {showFollowers === 'followers' ? 'Followers' : 'Following'}
                </h3>
                <button
                  onClick={() => setShowFollowers(null)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 max-h-80 overflow-y-auto">
                {showFollowers === 'followers' ? (
                  otherProfile?.followers?.length > 0 ? (
                    <div className="space-y-2">
                      {otherProfile.followers.map((email, i) => {
                        const followerProfile = allProfiles.find(p => p.user_email === email);
                        const displayName = followerProfile?.display_name || followerProfile?.username || email.split('@')[0];
                        return (
                          <ProfileLink
                            key={i}
                            userEmail={email}
                            username={followerProfile?.username || displayName}
                            userName={displayName}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 -mx-2"
                          >
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <span className="text-sm font-medium truncate">{displayName}</span>
                          </ProfileLink>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No followers yet</p>
                  )
                ) : otherProfile?.following?.length > 0 ? (
                  <div className="space-y-2">
                    {otherProfile.following.map((email, i) => {
                      const followingProfile = allProfiles.find(p => p.user_email === email);
                      const displayName = followingProfile?.display_name || followingProfile?.username || email.split('@')[0];
                      return (
                        <ProfileLink
                          key={i}
                          userEmail={email}
                          username={followingProfile?.username || displayName}
                          userName={displayName}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 -mx-2"
                        >
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium truncate">{displayName}</span>
                        </ProfileLink>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Not following anyone yet</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
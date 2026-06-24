import React, { useState } from 'react';
import { base44, ensureTokenSynced, nativeStorage } from '@/api/base44Client';
import { useUserProfile } from '@/lib/useUserProfile';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useCameraPicker } from '@/lib/useCameraPicker';
import { formatCurrency } from '@/lib/currencyFormatter';
import {
  MapPin, Edit3, Camera, User, Image as ImageIcon, Calendar,
  Package, TrendingUp, Users, ShoppingBag, X, Lock, Crown,
} from 'lucide-react';
import ProfileLink from '@/components/shared/ProfileLink';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import ProfileSongCard from '@/components/profile/ProfileSongCard';
import { canUseProfileSong } from '@/lib/proGate';
import FollowStats from '@/components/profile/FollowStats';
import SongSearchPicker from '@/components/profile/SongSearchPicker';
import EditSongDialog from '@/components/profile/EditSongDialog';
import ProfitVisibilityToggle from '@/components/profile/ProfitVisibilityToggle';
import SocialLinksEditor from '@/components/profile/SocialLinks';
import ProfileStatsSheet from '@/components/profile/ProfileStatsSheet';

const CATEGORIES = [
  { value: 'cards', label: 'Cards', emoji: '🎴' },
  { value: 'sneakers', label: 'Sneakers', emoji: '👟' },
  { value: 'clothing', label: 'Clothing', emoji: '👕' },
  { value: 'electronics', label: 'Electronics', emoji: '📱' },
  { value: 'collectibles', label: 'Collectibles', emoji: '🎁' },
  { value: 'games', label: 'Games', emoji: '🎮' },
  { value: 'technology', label: 'Technology', emoji: '💻' },
  { value: 'vintage', label: 'Vintage', emoji: '🕰️' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { isAuthenticated, navigateToLogin } = useAuth();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showEditSong, setShowEditSong] = useState(false);
  const [showStats, setShowStats] = useState(null);
  const [showFollowers, setShowFollowers] = useState(null); // 'followers' | 'following' | null
  const [bio, setBio] = useState('');
  const [locationVal, setLocationVal] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const queryClient = useQueryClient();

  const getToken = async () => await nativeStorage.get();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
  });

  const { data: profile } = useUserProfile(user);
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['allProfilesForProfilePage'],
    queryFn: () => base44.entities.UserProfile.list('-created_date', 500),
    initialData: [],
  });

  const { data: flipsRaw = [] } = useQuery({
    queryKey: ['flips'],
    queryFn: () => base44.entities.Flip.list('-created_date', 500),
    initialData: [],
  });
  const flips = Array.isArray(flipsRaw) ? flipsRaw : [];

  const { data: inventoryRaw = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.Inventory.list('-created_date', 500),
    initialData: [],
  });
  const inventory = Array.isArray(inventoryRaw) ? inventoryRaw : [];

  const totalProfit = flips.reduce((s, f) => s + (f.net_profit || 0), 0);
  const recentActivity = flips.slice(0, 5);

  // For own profile, always show profit. When viewing other profiles, check visibility.
  const isOwnProfile = true; // This page is for own profile only
  const canSeeProfit = isOwnProfile || profile?.profit_visibility === 'public';
  const displayProfit = canSeeProfit ? totalProfit : 0;
  const profitHidden = !canSeeProfit;

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      await ensureTokenSynced();
      const token = await getToken();
      const res = await base44.functions.invoke('profileManager', { action: 'save', data, token });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data?.profile;
    },
    onSuccess: (savedProfile) => {
      if (savedProfile) queryClient.setQueryData(['userProfile', user?.email], savedProfile);
      setShowEditProfile(false);
      toast.success('Profile updated');
    },
    onError: (e) => toast.error(e?.message || 'Failed to save profile'),
  });

  const doUploadAvatar = async (file) => {
    if (!user?.email || !file) return;
    setUploading(true);
    try {
      await ensureTokenSynced();
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (!file_url) throw new Error('Upload returned no file_url');
      const token = await getToken();
      const res = await base44.functions.invoke('profileManager', { action: 'setAvatar', file_url, token });
      if (res.data?.error) throw new Error(res.data.error);
      const updatedProfile = res.data?.profile;
      if (updatedProfile) queryClient.setQueryData(['userProfile', user.email], updatedProfile);
      await queryClient.invalidateQueries({ queryKey: ['userProfile', user.email] });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile picture updated');
    } catch (error) {
      toast.error('Upload failed: ' + (error?.message || 'unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const doUploadBanner = async (file) => {
    if (!user?.email || !file) return;
    setUploadingBanner(true);
    try {
      await ensureTokenSynced();
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (!file_url) throw new Error('No file_url');
      const token = await getToken();
      const res = await base44.functions.invoke('profileManager', { action: 'save', data: { banner_url: file_url }, token });
      if (res.data?.error) throw new Error(res.data.error);
      const updatedProfile = res.data?.profile;
      if (updatedProfile) queryClient.setQueryData(['userProfile', user.email], updatedProfile);
      toast.success('Banner updated');
    } catch (error) {
      toast.error('Banner upload failed');
    } finally {
      setUploadingBanner(false);
    }
  };

  const { openCameraPicker, isUploading: isCameraUploading } = useCameraPicker({
    onImageSelected: async (file) => { await doUploadAvatar(file); },
  });

  const handleEditProfile = () => {
    setBio(profile?.bio || '');
    setLocationVal(profile?.location || '');
    setUsername(profile?.username || '');
    setDisplayName(profile?.display_name || '');
    setShowEditProfile(true);
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      bio,
      location: locationVal,
      username,
      display_name: displayName,
    });
  };

  const handleSaveSong = (songData) => {
    updateProfileMutation.mutate(songData, {
      onSuccess: (savedProfile) => {
        if (savedProfile) queryClient.setQueryData(['userProfile', user?.email], savedProfile);
        setShowEditSong(false);
        toast.success('Song updated');
      },
    });
  };

  const handleUpdateProfitVisibility = (visibility) => {
    updateProfileMutation.mutate({ profit_visibility: visibility }, {
      onSuccess: (savedProfile) => {
        if (savedProfile) queryClient.setQueryData(['userProfile', user?.email], savedProfile);
        toast.success('Privacy setting updated');
      },
    });
  };

  const avatarUrl = profile?.avatar_url || user?.profile_picture;
  const bannerUrl = profile?.banner_url;
  const selectedCats = Array.isArray(user?.selected_categories) ? user.selected_categories : [];
  const isPro = user?.is_pro || false;

  if (!isAuthenticated) {
    return (
      <div className="px-3 py-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6 flex flex-col items-center gap-4 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-base">Sign in to view your profile</p>
            <p className="text-sm text-muted-foreground mt-1">Join the community of serious resellers.</p>
          </div>
          <button
            onClick={navigateToLogin}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            Sign In / Create Account
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pb-24" style={{ marginTop: -16 }}>
      {/* Banner */}
      <div
        className="relative w-full"
        style={{ height: bannerUrl ? 120 : 64 }}
      >
        {bannerUrl ? (
          <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--primary) / 0.03) 100%)',
            }}
          />
        )}
        {/* Banner upload button */}
        <label
          className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-medium cursor-pointer border border-white/20"
          style={uploadingBanner ? { pointerEvents: 'none', opacity: 0.5 } : {}}
        >
          <input
            type="file"
            accept="image/*"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) doUploadBanner(f); }}
            className="hidden"
          />
          {uploadingBanner ? (
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <ImageIcon className="w-3 h-3" />
          )}
          Edit Banner
        </label>

        {/* Pro badge */}
        {user?.is_pro && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/90 text-primary-foreground text-[11px] font-bold">
            <Crown className="w-3 h-3" />
            PRO
          </div>
        )}
      </div>

      {/* Avatar + Edit button row */}
      <div className="relative px-4 pb-0">
        <div className="flex items-end justify-between" style={{ marginTop: -28 }}>
          {/* Avatar */}
          <div className="relative">
            <div
              className="w-14 h-14 rounded-full overflow-hidden border-3 border-background bg-secondary"
              style={{ boxShadow: '0 0 0 2px hsl(var(--border))', borderWidth: 3 }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-lg font-bold text-muted-foreground">
                    {(profile?.display_name || user?.full_name || '?')[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <label
              className="absolute -bottom-0.5 -right-0.5 p-1 rounded-full bg-primary text-primary-foreground cursor-pointer border-2 border-background"
              style={(uploading || isCameraUploading) ? { pointerEvents: 'none', opacity: 0.5 } : {}}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!uploading && !isCameraUploading) openCameraPicker({ inputId: 'profile-avatar-input' });
              }}
            >
              <input
                id="profile-avatar-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) doUploadAvatar(f); }}
                className="hidden"
              />
              {(uploading || isCameraUploading) ? (
                <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-2.5 h-2.5" />
              )}
            </label>
          </div>

          {/* Edit profile button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleEditProfile}
            className="mb-1 text-xs gap-1.5 rounded-full px-3 h-7"
          >
            <Edit3 className="w-3 h-3" />
            Edit Profile
          </Button>
        </div>

        {/* Name + username + location */}
        <div className="mt-1.5 space-y-0.5">
          <h2 className="text-base font-bold leading-tight">
            {profile?.display_name || user?.full_name || 'Reseller'}
          </h2>
          <p className="text-sm text-primary font-medium">
            @{profile?.username 
              || (profile?.display_name ? profile.display_name.toLowerCase().replace(/\s+/g, '') : null)
              || (user?.full_name ? user.full_name.toLowerCase().replace(/\s+/g, '') : null)
              || `user${(profile?.id || user?.id || '').slice(-6)}`}
          </p>
          {profile?.location && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{profile.location}</span>
            </div>
          )}
          {user?.created_date && (
            <div className="flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Joined {new Date(user.created_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          )}
        </div>

        {/* Bio */}
        {profile?.bio && (
          <p className="mt-3 text-sm text-foreground/80 leading-relaxed">{profile.bio}</p>
        )}

        {/* Social Links */}
        <div className="mt-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Socials & Storefronts</p>
          <SocialLinksEditor
            socialLinks={profile?.social_links}
            onSave={(links) => updateProfileMutation.mutate({ social_links: links }, {
              onSuccess: (savedProfile) => {
                if (savedProfile) queryClient.setQueryData(['userProfile', user?.email], savedProfile);
                queryClient.invalidateQueries({ queryKey: ['userProfile', user?.email] });
                toast.success('Links saved');
              },
            })}
            isSaving={updateProfileMutation.isPending}
          />
        </div>

        {/* Profile Song Card (Pro Feature) */}
        <div className="flex justify-center mt-3">
          <ProfileSongCard
            songName={profile?.song_name}
            songArtist={profile?.song_artist}
            previewUrl={profile?.song_preview_url}
            artworkUrl={profile?.song_artwork_url}
            isPro={isPro}
            onEdit={() => {
              if (!isPro) {
                navigate('/upgrade');
                toast.info('Profile Song is a Pro feature');
              } else {
                setShowEditSong(true);
              }
            }}
          />
        </div>

        {/* Collectors Section */}
        <div className="mt-6">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Collectors</p>
          <div className="flex items-center justify-center gap-6">
            <FollowStats
              profile={profile}
              currentUserEmail={user?.email}
              isOwnProfile={true}
              compact
              onOpenPreview={(type) => setShowFollowers(type)}
            />
          </div>
        </div>

        {/* Track Record Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Track Record</p>
            <ProfitVisibilityToggle
              profile={profile}
              onUpdate={handleUpdateProfitVisibility}
              isUpdating={updateProfileMutation.isPending}
            />
          </div>
          <div className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-xl border border-primary/20 rounded-2xl p-5 text-center">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Net Profit</p>
            {profitHidden ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Lock className="w-6 h-6" />
                <span className="text-2xl font-bold">Hidden</span>
              </div>
            ) : (
              <p className={`text-3xl font-bold ${displayProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(displayProfit, user?.currency)}
              </p>
            )}
          </div>
        </div>

        {/* Collection Section */}
        <div className="mt-6">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Collection</p>
          <div className="flex gap-4">
            <button onClick={() => setShowStats('flips')} className="flex-1 bg-card/60 backdrop-blur-xl border border-border rounded-xl p-4 text-center hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Package className="w-4 h-4 text-muted-foreground" />
                <p className="text-2xl font-bold">{flips.length}</p>
              </div>
              <p className="text-[11px] text-muted-foreground">Flips</p>
            </button>
            <button onClick={() => setShowStats('inventory')} className="flex-1 bg-card/60 backdrop-blur-xl border border-border rounded-xl p-4 text-center hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-center gap-2 mb-1">
                <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                <p className="text-2xl font-bold">{inventory.length}</p>
              </div>
              <p className="text-[11px] text-muted-foreground">In Stock</p>
            </button>
          </div>
        </div>

        {/* Specialties */}
        {selectedCats.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Specialties</p>
            <div className="flex flex-wrap gap-2">
              {selectedCats.map(cat => {
                const c = CATEGORIES.find(x => x.value === cat);
                return c ? (
                  <span key={cat} className="px-2.5 py-1 rounded-full bg-card/50 backdrop-blur-sm text-xs font-medium text-foreground border border-border/50">
                    {c.emoji} {c.label}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-border mx-4 mt-5 mb-4" />

      {/* Recent Activity */}
      <div className="px-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</p>
        {recentActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <TrendingUp className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No flips yet. Start tracking!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((flip, i) => (
              <motion.div
                key={flip.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
              >
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{flip.item_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {flip.platform} · {flip.date_sold ? new Date(flip.date_sold).toLocaleDateString() : 'No date'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-bold ${(flip.net_profit || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {(flip.net_profit || 0) >= 0 ? '+' : ''}{formatCurrency(flip.net_profit || 0, user?.currency)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Song Dialog */}
      <EditSongDialog
        open={showEditSong}
        onOpenChange={setShowEditSong}
        profile={profile}
        onSave={handleSaveSong}
        isSaving={updateProfileMutation.isPending}
      />

      {/* Followers/Following Bottom Sheet */}
      <AnimatePresence>
        {showFollowers && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowFollowers(null)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed z-50 bottom-0 left-0 right-0 max-h-[85vh] bg-card border-t border-border rounded-t-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                <h3 className="text-lg font-bold text-foreground">
                  {showFollowers === 'followers' ? 'Followers' : 'Following'}
                </h3>
                <button
                  onClick={() => setShowFollowers(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable List */}
              <div className="flex-1 overflow-y-auto p-4">
                {showFollowers === 'followers' ? (
                  profile?.followers && profile.followers.length > 0 ? (
                    <div className="space-y-1">
                      {profile.followers.map((email, i) => {
                        const followerProfile = allProfiles?.find(p => p.user_email === email);
                        const displayName = followerProfile?.display_name || followerProfile?.username || 'User';
                        const followerHandle = followerProfile?.username
                          || (followerProfile?.display_name ? followerProfile.display_name.toLowerCase().replace(/\s+/g, '') : null)
                          || `user${(followerProfile?.id || '').slice(-6)}`;
                        return (
                          <ProfileLink
                            key={i}
                            userEmail={email}
                            username={followerProfile?.username}
                            userName={displayName}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 -mx-2"
                          >
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                              {followerProfile?.avatar_url ? (
                                <img src={followerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-base font-medium truncate block">{displayName}</span>
                              <span className="text-xs text-muted-foreground">@{followerHandle}</span>
                            </div>
                          </ProfileLink>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                        <Users className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <p className="text-base font-semibold text-foreground mb-1">No followers yet</p>
                      <p className="text-sm text-muted-foreground">When people follow you, they'll appear here</p>
                    </div>
                  )
                ) : profile?.following && profile.following.length > 0 ? (
                  <div className="space-y-1">
                    {profile.following.map((email, i) => {
                      const followingProfile = allProfiles?.find(p => p.user_email === email);
                      const displayName = followingProfile?.display_name || followingProfile?.username || 'User';
                      const followingHandle = followingProfile?.username
                        || (followingProfile?.display_name ? followingProfile.display_name.toLowerCase().replace(/\s+/g, '') : null)
                        || `user${(followingProfile?.id || '').slice(-6)}`;
                      return (
                        <ProfileLink
                          key={i}
                          userEmail={email}
                          username={followingProfile?.username}
                          userName={displayName}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 -mx-2"
                        >
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                            {followingProfile?.avatar_url ? (
                              <img src={followingProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-base font-medium truncate block">{displayName}</span>
                            <span className="text-xs text-muted-foreground">@{followingHandle}</span>
                          </div>
                        </ProfileLink>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                      <Users className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="text-base font-semibold text-foreground mb-1">Not following anyone yet</p>
                    <p className="text-sm text-muted-foreground">Start following collectors to see their activity</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Stats Bottom Sheet */}
      <ProfileStatsSheet
        open={!!showStats}
        onClose={() => setShowStats(null)}
        type={showStats}
        items={showStats === 'inventory' ? inventory : flips}
        isOwner={true}
        currency={user?.currency}
      />

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="max-w-sm mx-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Display Name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Username</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" className="bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bio</label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell your story..." className="bg-background resize-none" rows={3} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</label>
              <Input value={locationVal} onChange={(e) => setLocationVal(e.target.value)} placeholder="e.g. New York, NY" className="bg-background" />
            </div>

          </div>
          <DialogFooter>
            <Button
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
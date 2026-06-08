import React, { useState } from 'react';
import { base44, ensureTokenSynced, nativeStorage } from '@/api/base44Client';
import { useUserProfile } from '@/lib/useUserProfile';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useCameraPicker } from '@/lib/useCameraPicker';
import { formatCurrency } from '@/lib/currencyFormatter';
import {
  MapPin, Edit3, Camera, User, Image as ImageIcon,
  Package, TrendingUp, Search, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Crown } from 'lucide-react';
import ProfileSongCard from '@/components/profile/ProfileSongCard';
import FollowStats from '@/components/profile/FollowStats';

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
  const [bio, setBio] = useState('');
  const [locationVal, setLocationVal] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [songName, setSongName] = useState('');
  const [songPreviewUrl, setSongPreviewUrl] = useState('');
  const [songArtwork, setSongArtwork] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [findingPreview, setFindingPreview] = useState(false);
  const [songResults, setSongResults] = useState([]);
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
    setSongName(profile?.song_name || '');
    setSongPreviewUrl(profile?.song_preview_url || '');
    setSongArtwork(profile?.song_artwork_url || '');
    setSongArtist(profile?.song_artist || '');
    setShowEditProfile(true);
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      bio,
      location: locationVal,
      username,
      display_name: displayName,
      song_name: songName,
      song_preview_url: songPreviewUrl,
      song_artwork_url: songArtwork,
      song_artist: songArtist,
    });
  };

  const avatarUrl = profile?.avatar_url || user?.profile_picture;
  const bannerUrl = profile?.banner_url;
  const selectedCats = Array.isArray(user?.selected_categories) ? user.selected_categories : [];

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
    <div className="pb-24">
      {/* Banner */}
      <div
        className="relative w-full"
        style={{ height: 160 }}
      >
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
        <div className="flex items-end justify-between" style={{ marginTop: -40 }}>
          {/* Avatar */}
          <div className="relative">
            <div
              className="w-20 h-20 rounded-full overflow-hidden border-4 border-background bg-secondary"
              style={{ boxShadow: '0 0 0 2px hsl(var(--border))' }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-muted-foreground">
                    {(profile?.display_name || user?.full_name || '?')[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <label
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground cursor-pointer border-2 border-background"
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
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-3 h-3" />
              )}
            </label>
          </div>

          {/* Edit profile button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleEditProfile}
            className="mb-1 text-xs gap-1.5 rounded-full px-4"
          >
            <Edit3 className="w-3 h-3" />
            Edit Profile
          </Button>
        </div>

        {/* Name + username + location */}
        <div className="mt-3 space-y-0.5">
          <h2 className="text-lg font-bold leading-tight">
            {profile?.display_name || user?.full_name || 'Reseller'}
          </h2>
          {profile?.username && (
            <p className="text-sm text-primary font-medium">@{profile.username}</p>
          )}
          {profile?.location && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{profile.location}</span>
            </div>
          )}
          
        </div>

        {/* Bio */}
        {profile?.bio && (
          <p className="mt-3 text-sm text-foreground/80 leading-relaxed">{profile.bio}</p>
        )}

        {/* Profile Song Card */}
        <ProfileSongCard
          songName={profile?.song_name}
          songArtist={profile?.song_artist}
          previewUrl={profile?.song_preview_url}
          artworkUrl={profile?.song_artwork_url}
        />

        {/* Followers / Following */}
        <FollowStats
          profile={profile}
          currentUserEmail={user?.email}
          isOwnProfile={true}
        />

        {/* Stats row */}
        <div className="flex gap-5 mt-3">
          <div className="text-center">
            <p className="text-base font-bold">{flips.length}</p>
            <p className="text-[11px] text-muted-foreground">Flips</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold">{inventory.length}</p>
            <p className="text-[11px] text-muted-foreground">In Stock</p>
          </div>
          <div className="text-center">
            <p className={`text-base font-bold ${totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(totalProfit, user?.currency)}
            </p>
            <p className="text-[11px] text-muted-foreground">Net Profit</p>
          </div>
        </div>

        {/* Favorite Categories */}
        {selectedCats.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Specialties</p>
            <div className="flex flex-wrap gap-2">
              {selectedCats.map(cat => {
                const c = CATEGORIES.find(x => x.value === cat);
                return c ? (
                  <span key={cat} className="px-2.5 py-1 rounded-full bg-secondary text-xs font-medium text-foreground border border-border">
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
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Profile Song</label>
              <div className="flex gap-2">
                <Input
                  value={songName}
                  onChange={(e) => { setSongName(e.target.value); setSongPreviewUrl(''); setSongArtwork(''); setSongArtist(''); setSongResults([]); }}
                  placeholder="e.g. Money Longer – Lil Uzi Vert"
                  className="bg-background flex-1"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && songName.trim()) {
                      e.preventDefault();
                      setFindingPreview(true);
                      setSongResults([]);
                      setSongPreviewUrl(''); setSongArtwork(''); setSongArtist('');
                      try {
                        const res = await base44.functions.invoke('findSongPreview', { query: songName });
                        if (res.data?.results?.length) setSongResults(res.data.results);
                        else toast.error('No results found');
                      } catch { toast.error('Could not search'); }
                      finally { setFindingPreview(false); }
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={findingPreview || !songName.trim()}
                  onClick={async () => {
                    if (!songName.trim()) return;
                    setFindingPreview(true);
                    setSongResults([]);
                    setSongPreviewUrl(''); setSongArtwork(''); setSongArtist('');
                    try {
                      const res = await base44.functions.invoke('findSongPreview', { query: songName });
                      if (res.data?.results?.length) setSongResults(res.data.results);
                      else toast.error('No results found');
                    } catch { toast.error('Could not search'); }
                    finally { setFindingPreview(false); }
                  }}
                  className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-50"
                >
                  {findingPreview ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              {/* Selected song confirmation */}
              {songPreviewUrl && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                  {songArtwork && <img src={songArtwork} alt="" className="w-8 h-8 rounded object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary truncate">✓ Preview ready</p>
                    {songArtist && <p className="text-[10px] text-muted-foreground truncate">{songArtist}</p>}
                  </div>
                  <button onClick={() => { setSongPreviewUrl(''); setSongArtwork(''); setSongArtist(''); setSongResults([]); }} className="shrink-0">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              )}

              {/* Search results picker */}
              {!songPreviewUrl && songResults.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Pick the right song:</p>
                  {songResults.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSongPreviewUrl(r.preview_url);
                        setSongArtwork(r.artwork_url || '');
                        setSongArtist(r.artist_name || '');
                        setSongName(`${r.track_name} – ${r.artist_name}`);
                        setSongResults([]);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-secondary border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                    >
                      {r.artwork_url && <img src={r.artwork_url} alt="" className="w-9 h-9 rounded-md object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{r.track_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{r.artist_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!songPreviewUrl && songResults.length === 0 && (
                <p className="text-[10px] text-muted-foreground">Type a song name and press Search or Enter — pick from results</p>
              )}
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
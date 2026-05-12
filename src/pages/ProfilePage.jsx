import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/currencyFormatter';
import {
  User,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  Bell,
  Mail,
  Globe,
  MapPin,
  Edit3,
  Settings as SettingsIcon,
  Camera,
  FileText,
  Shield,
  Instagram,
  Twitter,
  Youtube,
  MessageCircle } from
'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/lib/ThemeContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
"@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import ProUpgradeCard from '@/components/upgrade/ProUpgradeCard';
import ThemePicker from '@/components/settings/ThemePicker';
import CategoriesEditor from '@/components/settings/CategoriesEditor';
import { Crown } from 'lucide-react';

export default function ProfilePage() {
  const { theme, toggleTheme, background, changeBackground, uploadCustomBackground } = useTheme();
  const navigate = useNavigate();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOther, setCancelOther] = useState('');
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const { isAuthenticated, navigateToLogin, logout } = useAuth();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
  });

  // UserProfile entity stores editable profile fields (bio, username, display_name, location)
  // RLS is keyed on created_by so we list() — the user only sees their own record.
  const { data: profileRecords, refetch: refetchProfile } = useQuery({
    queryKey: ['userProfile', user?.email],
    queryFn: () => base44.entities.UserProfile.list(),
    enabled: !!user?.email,
  });
  const profile = Array.isArray(profileRecords) ? profileRecords[0] || null : null;

  const { data: flipsRaw } = useQuery({
    queryKey: ['flips'],
    queryFn: () => base44.entities.Flip.list('-created_date', 500),
    initialData: [],
  });
  const flips = Array.isArray(flipsRaw) ? flipsRaw : [];

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates) => {
      await base44.auth.updateMe(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Settings updated');
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      // Write to UserProfile entity — persists across sessions
      if (profile?.id) {
        await base44.entities.UserProfile.update(profile.id, data);
      } else {
        // First-time create: include user_email as metadata
        await base44.entities.UserProfile.create({ user_email: user.email, ...data });
      }
    },
    onSuccess: async () => {
      // Wait for the fresh record before closing the dialog
      await refetchProfile();
      toast.success('Profile updated');
      setShowEditProfile(false);
    },
    onError: (e) => {
      toast.error(e?.message || 'Failed to save profile');
    },
  });

  const totalProfit = flips.reduce((s, f) => s + (f.net_profit || 0), 0);

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('deleteAccount', {});
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      toast.success('Account data deleted');
      base44.auth.logout('/');
    },
    onError: (e) => toast.error(e.message || 'Failed to delete account'),
  });

  const cancelMutation = useMutation({
    mutationFn: async (reason) => {
      const res = await base44.functions.invoke('cancelSubscription', { reason });
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Membership cancelled. You will retain access until the end of your billing period.');
      setShowCancelDialog(false);
      setCancelReason('');
      setCancelOther('');
    },
    onError: (e) => toast.error(e.message || 'Failed to cancel membership'),
  });

  const handleCancelMembership = () => {
    const reason = cancelReason === 'other' ? cancelOther : cancelReason;
    if (!reason.trim()) { toast.error('Please select a reason'); return; }
    cancelMutation.mutate(reason);
  };

  const handleLogout = () => {
    logout();
  };

  const handleEditProfile = () => {
    setBio(profile?.bio || '');
    setLocation(profile?.location || '');
    setUsername(profile?.username || '');
    setDisplayName(profile?.display_name || user?.full_name || '');
    setShowEditProfile(true);
  };

  const handleSaveProfile = async () => {
    // Check if username changed and needs moderation
    if (username && username !== profile?.username) {
      try {
        const modResult = await base44.integrations.Core.InvokeLLM({
          prompt: `Is this username appropriate and safe for a professional reselling app? Username: "${username}"\n\nRespond with only "approved" or "rejected". Reject if it contains profanity, hate speech, offensive content, or impersonation.`
        });

        if (typeof modResult === 'string' && modResult.toLowerCase().includes('rejected')) {
          toast.error('Username not allowed. Please choose a different one.');
          return;
        }
      } catch (error) {
        toast.error('Failed to validate username');
        return;
      }
    }

    updateProfileMutation.mutate({ bio, location, username, display_name: displayName });
  };

  const handleAvatarButtonPress = () => {
    // Programmatic click avoids the Capacitor iOS crash caused by <label htmlFor>
    fileInputRef.current?.click();
  };

  const handleUploadProfilePicture = async (e) => {
    const file = e.target.files?.[0];
    // Reset immediately so the same file can be re-selected later
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      // Upload the File object directly — base44 SDK handles multipart internally
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // 1. Save to auth user record (profile_picture field)
      await base44.auth.updateMe({ profile_picture: file_url });

      // 2. Also save to UserProfile entity so it survives RLS-based reads
      if (profile?.id) {
        await base44.entities.UserProfile.update(profile.id, { avatar_url: file_url });
      } else {
        await base44.entities.UserProfile.create({ user_email: user.email, avatar_url: file_url });
      }

      // Refresh both caches
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        refetchProfile(),
      ]);
      toast.success('Profile picture updated');
    } catch (error) {
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadBackground = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if user has pro
    if (!user?.is_pro) {
      toast.error('Custom backgrounds are a Pro feature');
      return;
    }

    setUploadingBg(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadCustomBackground(file_url);
      toast.success('Background updated');
    } catch (error) {
      toast.error('Failed to upload background');
    } finally {
      setUploadingBg(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="px-3 py-4 space-y-4 pb-20">
        <h1 className="text-lg font-bold tracking-tight">Profile</h1>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6 flex flex-col items-center gap-4 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-base">Sign in to unlock everything</p>
            <p className="text-sm text-muted-foreground mt-1">Save flips, track history, access community & Pro features.</p>
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
    <div className="px-3 py-4 space-y-4 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        >
        <h1 className="text-lg font-bold tracking-tight">Profile</h1>
      </motion.div>

      {/* User Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-5">
        
        <div className="flex items-center gap-4">
          <div className="relative">
            {user?.profile_picture ?
            <img
              src={user.profile_picture}
              alt={user.full_name}
              className="w-14 h-14 rounded-full object-cover border-2 border-primary" /> :


            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary">
                <User className="w-6 h-6 text-primary" />
              </div>
            }
            {/* Hidden file input — triggered programmatically to avoid Capacitor iOS crash */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleUploadProfilePicture}
              className="hidden"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={handleAvatarButtonPress}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors disabled:opacity-50">
              {uploading ? (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-3 h-3" />
              )}
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{profile?.display_name || user?.full_name || 'Reseller'}</h2>
            {profile?.username && (
              <p className="text-xs text-primary truncate">@{profile.username}</p>
            )}
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            {profile?.location &&
            <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{profile.location}</p>
              </div>
            }
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleEditProfile}
            className="shrink-0">
            
            <Edit3 className="w-4 h-4" />
          </Button>
        </div>

        {profile?.bio &&
        <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border">
            {profile.bio}
          </p>
        }

        <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-border">
          <div className="text-center">
            <p className="text-2xl font-bold tracking-tight">{flips.length}</p>
            <p className="text-xs text-muted-foreground">Total Flips</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold tracking-tight ${totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(totalProfit, user?.currency)}
            </p>
            <p className="text-xs text-muted-foreground">Net Profit</p>
          </div>
        </div>
      </motion.div>

      {/* Pro Upgrade */}
      {!user?.is_pro &&
      <ProUpgradeCard />
      }

      {/* Pro Status */}
      {user?.is_pro &&
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-2 border-primary/30 rounded-xl p-4">
        
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Pro Member</h3>
              <p className="text-xs text-muted-foreground">
                {user.pro_expires_at ?
              `Renews ${new Date(user.pro_expires_at).toLocaleDateString()}` :
              'Lifetime access'}
              </p>
            </div>
          </div>
        </motion.div>
      }

      {/* Categories */}
      <CategoriesEditor user={user} />

      {/* Preferences */}
      <div className="space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-3">
          Preferences
        </h3>

        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {theme === 'dark' ?
              <Moon className="w-4 h-4 text-muted-foreground" /> :

              <Sun className="w-4 h-4 text-muted-foreground" />
              }
              <div>
                <span className="text-sm font-medium">Dark Mode</span>
                <p className="text-xs text-muted-foreground">Toggle dark theme</p>
              </div>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme} />
            
          </div>

          {/* Color Themes */}
          <div className="p-4">
            {user?.is_pro ? (
              <ThemePicker />
            ) : (
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Color Themes
                </h3>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
                  <Crown className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Custom color themes are a <span className="text-primary font-semibold">Pro feature</span>. Upgrade to unlock.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Currency */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium">Currency</span>
                <p className="text-xs text-muted-foreground">Display currency</p>
              </div>
            </div>
            <Select
              value={user?.currency || 'USD'}
              onValueChange={(value) => updateSettingsMutation.mutate({ currency: value })}>
              
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="CAD">CAD (C$)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-3">
          Notifications
        </h3>

        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {/* Email Notifications */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium">Email Notifications</span>
                <p className="text-xs text-muted-foreground">Community activity alerts</p>
              </div>
            </div>
            <Switch
              checked={user?.notifications_enabled !== false}
              onCheckedChange={(checked) =>
              updateSettingsMutation.mutate({ notifications_enabled: checked })
              } />
            
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium">Push Notifications</span>
                <p className="text-xs text-muted-foreground">Mobile app alerts</p>
              </div>
            </div>
            <Switch
              checked={user?.push_notifications === true}
              onCheckedChange={(checked) =>
              updateSettingsMutation.mutate({ push_notifications: checked })
              } />
            
          </div>

          {/* Weekly Summary */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium">Weekly Summary</span>
                <p className="text-xs text-muted-foreground">Performance recap email</p>
              </div>
            </div>
            <Switch
              checked={user?.weekly_summary !== false}
              onCheckedChange={(checked) =>
              updateSettingsMutation.mutate({ weekly_summary: checked })
              } />
            
          </div>
        </div>
      </div>

      {/* Legal */}
      <div className="space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-3">
          Legal
        </h3>

        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          <button
            onClick={() => navigate('/terms')}
            className="flex items-center justify-between p-4 w-full hover:bg-secondary/50 transition-colors">
            
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Terms of Service</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate('/privacy')}
            className="flex items-center justify-between p-4 w-full hover:bg-secondary/50 transition-colors">
            
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Privacy Policy</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Cancel Membership */}
      {user?.is_pro && !user?.pro_cancel_scheduled && (
        <div className="space-y-1">
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            <button
              onClick={() => setShowCancelDialog(true)}
              className="flex items-center justify-between p-4 w-full hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-destructive">Cancel Membership</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {user?.pro_cancel_scheduled && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <p className="text-sm text-destructive font-medium">Cancellation Scheduled</p>
          <p className="text-xs text-muted-foreground mt-1">Your Pro access will end at the end of your current billing period.</p>
        </div>
      )}

      {/* Account */}
      <div className="space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-3">
          Account
        </h3>
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          <button
            onClick={handleLogout}
            className="flex items-center justify-between p-4 w-full hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <LogOut className="w-4 h-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Sign Out</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setShowDeleteAccount(true)}
            className="flex items-center justify-between p-4 w-full hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-destructive">Delete Account</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Support */}
      <div className="space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-3">
          Support
        </h3>

        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          <a
            href="mailto:support@trackly.to"
            className="flex items-center justify-between p-4 w-full hover:bg-secondary/50 transition-colors">
            
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Contact Support</span>
            </div>
            <span className="text-xs text-muted-foreground">support@trackly.to</span>
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-8 pb-24">
        <img
          src="https://media.base44.com/images/public/69bfd92e3db7d48eec6c8062/c29d404d0_logo_no_bg_final.png"
          alt="Trackly"
          className="h-6 mx-auto mb-2" />
        
        <p className="text-xs text-muted-foreground">
          Built for serious resellers
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          v1.0.0
        </p>
        
        {/* Social Links */}
        <div className="mt-6 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Follow Us
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://instagram.com/usetrackly"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-secondary transition-colors">
              
              <Instagram className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
            </a>
            <a
              href="https://x.com/usetrackly"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-secondary transition-colors">
              
              <Twitter className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
            </a>
            <a
              href="https://tiktok.com/@usetrackly"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-secondary transition-colors">
              
              <Youtube className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
            </a>
          </div>
        </div>
      </div>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount}>
        <AlertDialogContent className="bg-card border-border max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your flips, inventory, expenses, and profile data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Everything'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Membership Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-sm mx-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle>Cancel Membership</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">We're sorry to see you go. Please let us know why you're cancelling.</p>
            <div className="space-y-2">
              {[
                { value: 'no_longer_needed', label: 'No longer needed' },
                { value: 'not_enough_benefits', label: 'Not enough premium benefits' },
                { value: 'too_expensive', label: 'Too expensive' },
                { value: 'switching_app', label: 'Switching to another app' },
                { value: 'technical_issues', label: 'Technical issues' },
                { value: 'other', label: 'Other' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setCancelReason(opt.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                    cancelReason === opt.value
                      ? 'border-destructive bg-destructive/10 text-destructive'
                      : 'border-border bg-background hover:bg-secondary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              {cancelReason === 'other' && (
                <Textarea
                  value={cancelOther}
                  onChange={(e) => setCancelOther(e.target.value)}
                  placeholder="Tell us more..."
                  className="bg-background resize-none"
                  rows={3}
                />
              )}
            </div>
          </div>
          <DialogFooter className="flex-col gap-2">
            <Button
              onClick={handleCancelMembership}
              disabled={cancelMutation.isPending || !cancelReason}
              variant="destructive"
              className="w-full">
              {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} className="w-full">
              Keep My Membership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="max-w-sm mx-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Display Name
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Username
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                className="bg-background" />
              <p className="text-[10px] text-muted-foreground">
                Your display name in the community
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Bio
              </label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                className="bg-background resize-none"
                rows={3} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Location
              </label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. New York, NY"
                className="bg-background" />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90">
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}
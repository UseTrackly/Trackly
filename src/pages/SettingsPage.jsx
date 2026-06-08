import React, { useState } from 'react';
import { base44, ensureTokenSynced } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTheme } from '@/lib/ThemeContext';
import { useNavigate } from 'react-router-dom';
import {
  Moon, Sun, Globe, Bell, Mail, FileText, Shield,
  LogOut, Trash2, ChevronRight, Crown, MessageCircle,
  Settings, Instagram, Twitter, Youtube,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import ThemePicker from '@/components/settings/ThemePicker';
import CategoriesEditor from '@/components/settings/CategoriesEditor';
import ProUpgradeCard from '@/components/upgrade/ProUpgradeCard';

function Section({ title, children }) {
  return (
    <div className="space-y-1">
      {title && (
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
          {title}
        </h3>
      )}
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

function SettingRow({ icon: Icon, label, description, right, onClick, danger }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-4 ${onClick ? 'cursor-pointer active:bg-secondary/50' : ''}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {Icon && <Icon className={`w-4 h-4 shrink-0 ${danger ? 'text-destructive' : 'text-muted-foreground'}`} />}
        <div className="min-w-0">
          <span className={`text-sm font-medium ${danger ? 'text-destructive' : 'text-foreground'}`}>{label}</span>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {right !== undefined ? right : onClick ? <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" /> : null}
    </div>
  );
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOther, setCancelOther] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates) => {
      await ensureTokenSynced();
      await base44.auth.updateMe(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Settings updated');
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('deleteAccount', {});
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      toast.success('Account deleted');
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
      toast.success('Membership cancelled.');
      setShowCancelDialog(false);
      setCancelReason('');
      setCancelOther('');
    },
    onError: (e) => toast.error(e.message || 'Failed to cancel'),
  });

  const handleCancelMembership = () => {
    const reason = cancelReason === 'other' ? cancelOther : cancelReason;
    if (!reason.trim()) { toast.error('Please select a reason'); return; }
    cancelMutation.mutate(reason);
  };

  if (!isAuthenticated) {
    return (
      <div className="px-3 py-4 pb-24">
        <h1 className="text-lg font-bold mb-4">Settings</h1>
        <p className="text-sm text-muted-foreground">Sign in to access settings.</p>
      </div>
    );
  }

  return (
    <div className="px-3 py-4 space-y-5 pb-24">
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-lg font-bold tracking-tight"
      >
        Settings
      </motion.h1>

      {/* Pro upgrade */}
      {!user?.is_pro && <ProUpgradeCard />}
      {user?.is_pro && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <div className="p-2 rounded-lg bg-primary/20">
            <Crown className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold">Pro Member</p>
            <p className="text-xs text-muted-foreground">
              {user.pro_expires_at ? `Renews ${new Date(user.pro_expires_at).toLocaleDateString()}` : 'Lifetime access'}
            </p>
          </div>
        </div>
      )}

      {/* Categories */}
      <CategoriesEditor user={user} />

      {/* Appearance */}
      <Section title="Appearance">
        <SettingRow
          icon={theme === 'dark' ? Moon : Sun}
          label="Dark Mode"
          description="Toggle dark theme"
          right={<Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />}
        />
        <div className="p-4">
          {user?.is_pro ? (
            <ThemePicker />
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Color Themes</p>
              <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
                <Crown className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Custom themes are a <span className="text-primary font-semibold">Pro feature</span>.
                </p>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Currency */}
      <Section title="Preferences">
        <SettingRow
          icon={Globe}
          label="Currency"
          description="Display currency for profits"
          right={
            <Select
              value={user?.currency || 'USD'}
              onValueChange={(v) => updateSettingsMutation.mutate({ currency: v })}
            >
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="CAD">CAD (C$)</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <SettingRow
          icon={Mail}
          label="Email Notifications"
          description="Community activity alerts"
          right={
            <Switch
              checked={user?.notifications_enabled !== false}
              onCheckedChange={(v) => updateSettingsMutation.mutate({ notifications_enabled: v })}
            />
          }
        />
        <SettingRow
          icon={Bell}
          label="Push Notifications"
          description="Mobile app alerts"
          right={
            <Switch
              checked={user?.push_notifications === true}
              onCheckedChange={(v) => updateSettingsMutation.mutate({ push_notifications: v })}
            />
          }
        />
        <SettingRow
          icon={Settings}
          label="Weekly Summary"
          description="Performance recap email"
          right={
            <Switch
              checked={user?.weekly_summary !== false}
              onCheckedChange={(v) => updateSettingsMutation.mutate({ weekly_summary: v })}
            />
          }
        />
      </Section>

      {/* Support */}
      <Section title="Support">
        <a
          href="mailto:support@trackly.to"
          className="flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <div>
              <span className="text-sm font-medium">Contact Support</span>
              <p className="text-xs text-muted-foreground">support@trackly.to</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </a>
        <SettingRow icon={MessageCircle} label="Send Feedback" description="Help us improve Trackly" onClick={() => {}} />
      </Section>

      {/* Legal */}
      <Section title="Legal">
        <SettingRow icon={FileText} label="Terms of Service" onClick={() => navigate('/terms')} />
        <SettingRow icon={Shield} label="Privacy Policy" onClick={() => navigate('/privacy')} />
      </Section>

      {/* Cancel membership */}
      {user?.is_pro && !user?.pro_cancel_scheduled && (
        <Section title="Membership">
          <SettingRow
            label="Cancel Membership"
            danger
            onClick={() => setShowCancelDialog(true)}
          />
        </Section>
      )}
      {user?.pro_cancel_scheduled && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <p className="text-sm text-destructive font-medium">Cancellation Scheduled</p>
          <p className="text-xs text-muted-foreground mt-1">Access continues until end of billing period.</p>
        </div>
      )}

      {/* Account */}
      <Section title="Account">
        <SettingRow icon={LogOut} label="Sign Out" danger onClick={logout} />
        <SettingRow icon={Trash2} label="Delete Account" danger onClick={() => setShowDeleteAccount(true)} />
      </Section>

      {/* Footer */}
      <div className="text-center pt-6 pb-4">
        <img
          src="https://media.base44.com/images/public/69bfd92e3db7d48eec6c8062/c29d404d0_logo_no_bg_final.png"
          alt="Trackly"
          className="h-6 mx-auto mb-2"
        />
        <p className="text-xs text-muted-foreground">Built for serious resellers</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">v1.0.0</p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <a href="https://instagram.com/usetrackly" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-secondary transition-colors">
            <Instagram className="w-5 h-5 text-muted-foreground" />
          </a>
          <a href="https://x.com/usetrackly" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-secondary transition-colors">
            <Twitter className="w-5 h-5 text-muted-foreground" />
          </a>
          <a href="https://tiktok.com/@usetrackly" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-secondary transition-colors">
            <Youtube className="w-5 h-5 text-muted-foreground" />
          </a>
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
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
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
            <p className="text-sm text-muted-foreground">Please let us know why you're cancelling.</p>
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
              className="w-full"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} className="w-full">
              Keep My Membership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
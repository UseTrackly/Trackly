import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function ProfitVisibilityToggle({ profile, onUpdate, isUpdating }) {
  const [open, setOpen] = React.useState(false);
  const visibility = profile?.profit_visibility || 'public';

  const visibilityConfig = {
    public: {
      icon: Eye,
      label: 'Public',
      description: 'Anyone can see your net profit',
      color: 'text-primary',
    },
    private: {
      icon: Lock,
      label: 'Private',
      description: 'Only you can see your net profit',
      color: 'text-muted-foreground',
    },
  };

  const config = visibilityConfig[visibility];
  const Icon = config.icon;

  const handleUpdate = (newVisibility) => {
    onUpdate(newVisibility);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 border border-border hover:border-primary/50 transition-colors"
      >
        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
        <span className="text-xs font-medium">{config.label}</span>
        <Edit3 className="w-3 h-3 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm mx-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle>Profit Visibility</DialogTitle>
            <DialogDescription className="text-xs">
              Choose who can see your net profit on your profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-3">
            {/* Public */}
            <button
              onClick={() => handleUpdate('public')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                visibility === 'public'
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-card border-border hover:border-primary/30'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                visibility === 'public' ? 'bg-primary/20' : 'bg-secondary'
              }`}>
                <Eye className={`w-4 h-4 ${visibility === 'public' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">Public</p>
                <p className="text-xs text-muted-foreground">Anyone can see your net profit</p>
              </div>
              {visibility === 'public' && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                </div>
              )}
            </button>



            {/* Private */}
            <button
              onClick={() => handleUpdate('private')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                visibility === 'private'
                  ? 'bg-muted/50 border-muted-foreground/30'
                  : 'bg-card border-border hover:border-primary/30'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                visibility === 'private' ? 'bg-muted' : 'bg-secondary'
              }`}>
                <Lock className={`w-4 h-4 ${visibility === 'private' ? 'text-muted-foreground' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">Private</p>
                <p className="text-xs text-muted-foreground">Only you can see your net profit</p>
              </div>
              {visibility === 'private' && (
                <div className="w-5 h-5 rounded-full bg-muted-foreground flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-background" />
                </div>
              )}
            </button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="w-full">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44, nativeStorage } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currencyFormatter';
import {
  User, Package, TrendingUp, Lock, Crown, MapPin, Calendar,
  UserPlus, UserCheck, Music2, Play, Pause, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ConversationProfilePanel({ open, onClose, otherEmail, currentUser }) {
  const queryClient = useQueryClient();
  const [playing, setPlaying] = React.useState(false);
  const audioRef = React.useRef(null);

  const { data: otherProfile } = useQuery({
    queryKey: ['otherProfile', otherEmail],
    queryFn: async () => {
      if (!otherEmail) return null;
      const token = await nativeStorage.get();
      const res = await base44.functions.invoke('profileManager', {
        action: 'get',
        targetEmail: otherEmail,
        token,
      });
      return res.data?.profile;
    },
    enabled: !!otherEmail && open,
  });

  const { data: flipsRaw = [] } = useQuery({
    queryKey: ['otherFlips', otherEmail],
    queryFn: () => base44.entities.Flip.filter({ created_by_email: otherEmail }, '-created_date', 50),
    enabled: !!otherEmail && open,
  });
  const flips = Array.isArray(flipsRaw) ? flipsRaw : [];

  const { data: inventoryRaw = [] } = useQuery({
    queryKey: ['otherInventory', otherEmail],
    queryFn: () => base44.entities.Inventory.filter({ created_by_email: otherEmail }, '-created_date', 50),
    enabled: !!otherEmail && open,
  });
  const inventory = Array.isArray(inventoryRaw) ? inventoryRaw : [];

  const totalProfit = flips.reduce((s, f) => s + (f.net_profit || 0), 0);
  const isFollowing = currentUser && otherProfile?.followers?.includes(currentUser.email);

  const followMutation = useMutation({
    mutationFn: async () => {
      const token = await nativeStorage.get();
      const res = await base44.functions.invoke('profileManager', {
        action: isFollowing ? 'unfollow' : 'follow',
        targetEmail: otherEmail,
        token,
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data?.profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['otherProfile', otherEmail] });
      toast.success(isFollowing ? 'Unfollowed' : 'Following!');
    },
  });

  const displayTitle = otherProfile?.song_name?.includes(' – ')
    ? otherProfile.song_name.split(' – ')[0]
    : otherProfile?.song_name;
  const displayArtist = otherProfile?.song_artist
    || (otherProfile?.song_name?.includes(' – ') ? otherProfile.song_name.split(' – ')[1] : null);

  const togglePlay = () => {
    if (!audioRef.current || !otherProfile?.song_preview_url) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
    }
  }, [otherProfile?.song_preview_url]);

  const avatarUrl = otherProfile?.avatar_url;
  const displayName = otherProfile?.display_name || otherEmail.split('@')[0];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full max-w-sm p-0 bg-background border-l border-border">
        <SheetHeader className="px-4 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-secondary border-2 border-border/50">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base truncate">{displayName}</p>
              {otherProfile?.username && (
                <p className="text-xs text-muted-foreground">@{otherProfile.username}</p>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-140px)]">
          <div className="p-4 space-y-4">
            {/* Follow Button */}
            {currentUser?.email !== otherEmail && (
              <Button
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
                className={`w-full ${isFollowing ? 'bg-secondary hover:bg-secondary/80 text-foreground' : 'bg-primary hover:bg-primary/90'}`}
              >
                {isFollowing ? (
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
            )}

            {/* Location & Join Date */}
            <div className="space-y-1.5">
              {otherProfile?.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{otherProfile.location}</span>
                </div>
              )}
              {otherProfile?.created_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    Joined {new Date(otherProfile.created_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>

            {/* Bio */}
            {otherProfile?.bio && (
              <p className="text-sm text-foreground/80 leading-relaxed">{otherProfile.bio}</p>
            )}

            {/* Profile Song */}
            {otherProfile?.song_name && (
              <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary shrink-0">
                    {otherProfile.song_artwork_url ? (
                      <img src={otherProfile.song_artwork_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{displayTitle}</p>
                    {displayArtist && (
                      <p className="text-[10px] text-muted-foreground truncate">{displayArtist}</p>
                    )}
                  </div>
                  {otherProfile.song_preview_url && (
                    <button
                      onClick={togglePlay}
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      {playing ? (
                        <Pause className="w-3.5 h-3.5 text-foreground" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-foreground ml-0.5" />
                      )}
                    </button>
                  )}
                  <audio
                    ref={audioRef}
                    src={otherProfile.song_preview_url}
                    onEnded={() => setPlaying(false)}
                    preload="none"
                  />
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl p-3 text-center">
                <Package className="w-4 h-4 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{inventory.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Items</p>
              </div>
              <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl p-3 text-center">
                <TrendingUp className="w-4 h-4 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{flips.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Flips</p>
              </div>
              <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl p-3 text-center">
                {otherProfile?.profit_visibility === 'public' ? (
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

            {/* Shared Flips */}
            {flips.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Shared Flips</h3>
                <div className="space-y-2">
                  {flips.slice(0, 5).map(flip => (
                    <div
                      key={flip.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50"
                    >
                      {flip.image_url ? (
                        <img src={flip.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{flip.item_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(flip.net_profit || 0, 'USD')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View Full Profile */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                window.open(`/profile/${encodeURIComponent(otherEmail)}`, '_blank');
                onClose();
              }}
            >
              <ExternalLink className="w-4 h-4" />
              View Full Profile
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
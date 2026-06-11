import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MapPin, Sparkles, Loader2, Ban, Crown, Heart,
  MessageCircle, CreditCard, Shirt, Cpu, Trophy, Gamepad2, Watch, Tag, Image,
  MoreVertical, Pencil, Trash2, CheckCircle, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ProfileLink from '@/components/shared/ProfileLink';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import EditListingDialog from './EditListingDialog';

const CATEGORY_META = {
  cards:       { icon: CreditCard, gradient: 'from-blue-900/80 to-indigo-900/80' },
  sneakers:    { icon: Trophy,     gradient: 'from-orange-900/80 to-red-900/80' },
  clothing:    { icon: Shirt,      gradient: 'from-purple-900/80 to-pink-900/80' },
  electronics: { icon: Cpu,        gradient: 'from-cyan-900/80 to-teal-900/80' },
  collectibles:{ icon: Trophy,     gradient: 'from-yellow-900/80 to-amber-900/80' },
  games:       { icon: Gamepad2,   gradient: 'from-green-900/80 to-emerald-900/80' },
  technology:  { icon: Cpu,        gradient: 'from-sky-900/80 to-blue-900/80' },
  vintage:     { icon: Watch,      gradient: 'from-stone-800/80 to-zinc-900/80' },
  other:       { icon: Tag,        gradient: 'from-gray-800/80 to-slate-900/80' },
};



export default function FlipDetailsSheet({ flip, open, onClose }) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: posterProfile } = useQuery({
    queryKey: ['posterProfile', flip?.posted_by],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: flip?.posted_by }, '-created_date', 1).then(r => r?.[0] ?? null),
    enabled: !!flip?.posted_by && open,
  });
  const posterDisplayName = posterProfile?.display_name || posterProfile?.username || flip?.posted_by_name;
  const posterUsername = posterProfile?.username;
  const isAiImage = !!flip?.is_ai_generated_image;
  const isReferenceImage = !!flip?.is_reference_image;

  const { data: myProfileRaw = [] } = useQuery({
    queryKey: ['myProfile'],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user?.email }, '-created_date', 1),
    enabled: !!user && open,
  });
  const blockedUsers = myProfileRaw?.[0]?.blocked_users || [];
  const isBlocked = blockedUsers.includes(flip?.posted_by);



  const interestMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('toggleInterest', { flip_id: flip.id });
      return res.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['communityFlips'] });
      const previous = queryClient.getQueryData(['communityFlips']);
      queryClient.setQueryData(['communityFlips'], (old) =>
        (Array.isArray(old) ? old : []).map(f => {
          if (f.id !== flip.id) return f;
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
    onError: (_err, _v, context) => {
      queryClient.setQueryData(['communityFlips'], context.previous);
      toast.error('Failed to update interest');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['communityFlips'] }),
  });

  const handleContactSeller = () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    onClose();
    navigate('/community', { state: { openInbox: true, contactEmail: flip.posted_by, flipId: flip.id } });
  };

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('analyzeFlipOpportunity', { flip_id: flip.id });
      return response.data.analysis;
    },
    onSuccess: (data) => { setAnalysis(data); setShowAnalysis(true); },
    onError: () => toast.error('Failed to analyze flip'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.CommunityFlip.delete(flip.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityFlips'] });
      toast.success('Listing deleted');
      onClose();
    },
    onError: () => toast.error('Failed to delete listing'),
  });

  const markSoldMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.CommunityFlip.update(flip.id, { is_sold: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityFlips'] });
      toast.success('Listing marked as sold');
    },
    onError: () => toast.error('Failed to mark as sold'),
  });

  const renewMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.CommunityFlip.update(flip.id, {
        created_date: new Date().toISOString(),
        is_sold: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityFlips'] });
      toast.success('Listing renewed');
    },
    onError: () => toast.error('Failed to renew listing'),
  });

  if (!flip) return null;

  // Always read interest state from the live query cache, not the stale prop
  const communityFlipsCache = queryClient.getQueryData(['communityFlips']) || [];
  const liveFlip = communityFlipsCache.find(f => f.id === flip.id) || flip;

  const isMyPost = flip.posted_by === user?.email;
  const isInterested = liveFlip.interested_users?.includes(user?.email);
  const interestCount = liveFlip.interested_users?.length || 0;
  const meta = CATEGORY_META[flip.category] || CATEGORY_META.other;
  const CategoryIcon = meta.icon;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl p-0 max-h-[92dvh] flex flex-col">
        {/* Close pill */}
        <div className="flex justify-center pt-2 pb-0 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="pb-8">
            {/* Hero image OR compact no-photo header */}
            {flip.image_url ? (
              <>
                <div className="relative w-full h-52">
                  <img src={flip.image_url} alt={flip.item_name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-4 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium uppercase">
                      {flip.category}
                    </span>
                    {isReferenceImage && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/90 backdrop-blur-sm text-white text-[10px] font-medium flex items-center gap-1">
                        <Image className="w-2.5 h-2.5" /> Reference Image
                      </span>
                    )}
                    {isAiImage && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/90 backdrop-blur-sm text-white text-[10px] font-medium">
                        AI Generated
                      </span>
                    )}
                  </div>
                </div>
                {/* Title + price — below image */}
                <div className="px-4 pt-4 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold leading-tight">{flip.item_name}</h2>
                      {flip.is_sold && (
                        <span className="px-2 py-0.5 rounded-full bg-destructive text-white text-[10px] font-bold uppercase">SOLD</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-primary shrink-0">${flip.price?.toFixed(0)}</p>
                    {isMyPost && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Listing
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => markSoldMutation.mutate()} disabled={flip.is_sold}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {flip.is_sold ? 'Marked as Sold' : 'Mark as Sold'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => renewMutation.mutate()}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Renew Listing
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Listing
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* No photo: compact banner + title+price inline */
              <div className={`bg-gradient-to-r ${meta.gradient}`}>
                <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
                  <CategoryIcon className="w-3.5 h-3.5 text-white/50 shrink-0" />
                  <span className="text-white/40 text-[9px] font-medium uppercase tracking-wider">{flip.category}</span>
                </div>
                <div className="px-4 pb-3 flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold leading-tight flex-1 text-white">{flip.item_name}</h2>
                  <p className="text-2xl font-bold text-white shrink-0">${flip.price?.toFixed(0)}</p>
                </div>
              </div>
            )}

            {/* Main info */}
            <div className="px-4 pt-3 space-y-3">
              {/* Title + price row — only for photo listings (already rendered above for no-photo) */}

              {/* Seller row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden">
                    {posterProfile?.avatar_url ? (
                      <img src={posterProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {(posterDisplayName || '?')[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <ProfileLink userEmail={flip.posted_by} username={posterUsername} userName={posterDisplayName}>
                      <p className="text-sm font-medium">{posterDisplayName}</p>
                    </ProfileLink>
                    {posterUsername && <p className="text-[10px] text-muted-foreground">@{posterUsername}</p>}
                  </div>
                  {flip.is_poster_pro && <Crown className="w-3.5 h-3.5 text-primary" />}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(flip.created_date), 'MMM d')}
                </p>
              </div>

              {/* Badges row */}
              <div className="flex flex-wrap gap-1.5">
                {flip.condition && (
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-medium capitalize">
                    {flip.condition.replace('_', ' ')}
                  </span>
                )}
                {flip.grade && flip.grading_company && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                    {flip.grading_company} {flip.grade}
                  </span>
                )}
                {flip.cert_number && (
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-medium text-muted-foreground">
                    Cert #{flip.cert_number}
                  </span>
                )}
              </div>

              {/* Reference/AI Image disclaimer */}
              {isReferenceImage && (
                <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-xl">
                  <Image className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    <span className="font-medium text-primary">Reference image from official sources.</span> This is a product image found online, not an actual photo of the item's specific condition. Contact the seller for real photos.
                  </p>
                </div>
              )}
              {isAiImage && !isReferenceImage && (
                <div className="flex items-start gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    <span className="font-medium text-purple-500">AI-generated preview image.</span> This is a synthetic image based on the item name, not an actual photo of the item's condition. Contact the seller for real photos.
                  </p>
                </div>
              )}

              {/* Location + date — prominent, before description */}
              {(flip.location || flip.created_date) && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {flip.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {flip.location}
                    </span>
                  )}
                  {flip.created_date && (
                    <span className="text-xs">Posted {format(new Date(flip.created_date), 'MMM d, yyyy')}</span>
                  )}
                </div>
              )}

              {/* Description */}
              {flip.description && (
                <p className="text-sm text-foreground/80 leading-relaxed">{flip.description}</p>
              )}

              {/* Interest count */}
              <p className="text-xs text-muted-foreground">
                {interestCount} {interestCount === 1 ? 'person' : 'people'} interested
              </p>
            </div>

            {/* Action buttons */}
            {!isMyPost && !isBlocked && user && (
              <div className="px-4 pt-3 space-y-2">
                <Button
                  onClick={handleContactSeller}
                  className="w-full bg-primary hover:bg-primary/90 gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  Contact Seller
                </Button>
                <Button
                  variant={isInterested ? 'default' : 'outline'}
                  onClick={() => interestMutation.mutate()}
                  disabled={interestMutation.isPending}
                  className="w-full gap-1.5"
                  size="sm"
                >
                  <Heart className={`w-4 h-4 ${isInterested ? 'fill-current' : ''}`} />
                  {isInterested ? 'Interested' : 'Mark Interested'}
                </Button>
              </div>
            )}

            {!isMyPost && isBlocked && (
              <div className="px-4 pt-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/60 rounded-xl px-3 py-3">
                  <Ban className="w-4 h-4 text-destructive" />
                  You have blocked this user.
                </div>
              </div>
            )}

            {!user && (
              <div className="px-4 pt-3">
                <Button onClick={() => base44.auth.redirectToLogin()} className="w-full">
                  Sign in to contact seller
                </Button>
              </div>
            )}



            {/* My post: AI analysis */}
            {isMyPost && (
              <div className="px-4 pt-4 space-y-3">
                <div className="text-center text-xs text-muted-foreground py-1">This is your listing.</div>
                <Button
                  onClick={() => analyzeMutation.mutate()}
                  disabled={analyzeMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {analyzeMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />AI Selling Tips</>

                  )}
                </Button>
                {showAnalysis && analysis && (
                  <div className="bg-secondary/50 rounded-xl p-4 space-y-3 text-sm">
                    {analysis.best_platform && <div><h4 className="font-semibold mb-1">Best Platform</h4><p className="text-muted-foreground">{analysis.best_platform}</p></div>}
                    {analysis.optimal_price && <div><h4 className="font-semibold mb-1">Optimal Price</h4><p className="text-primary font-bold">${analysis.optimal_price?.toFixed(2)}</p><p className="text-xs text-muted-foreground">Est. Profit: ${analysis.estimated_profit?.toFixed(2)} ({analysis.profit_margin})</p></div>}
                    {analysis.timing_advice && <div><h4 className="font-semibold mb-1">Timing</h4><p className="text-muted-foreground">{analysis.timing_advice}</p></div>}
                    {analysis.marketing_tips && <div><h4 className="font-semibold mb-1">Marketing Tips</h4><p className="text-muted-foreground">{analysis.marketing_tips}</p></div>}
                    {analysis.summary && <div className="pt-2 border-t border-border"><p className="text-muted-foreground italic">{analysis.summary}</p></div>}
                  </div>
                )}
              </div>
            )}

            {/* Edit Listing Dialog */}
            <EditListingDialog
              open={showEditDialog}
              onClose={() => setShowEditDialog(false)}
              flip={flip}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your listing and remove all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
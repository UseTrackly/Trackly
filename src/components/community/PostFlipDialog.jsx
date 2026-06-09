import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, Crown, CheckCircle2, ExternalLink, ImageIcon, X, Eye, ArrowLeft, MapPin, Heart, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CertImagePreview from '@/components/grading/CertImagePreview';
import { toast } from 'sonner';
import { canPostCommunity, FREE_LIMITS } from '@/lib/proGate';

// Mini preview card — mirrors how the post will look in the community feed
function PreviewCard({ itemName, price, category, description, imageUrl, posterName, posterAvatar }) {
  const buyPrice = price * 0.6;
  const margin = price > 0 ? ((price - buyPrice) / buyPrice * 100).toFixed(0) : '—';
  return (
    <div className="bg-card border-2 border-primary/30 rounded-xl overflow-hidden shadow-lg">
      {imageUrl ? (
        <div className="relative">
          <img src={imageUrl} alt={itemName} className="w-full h-32 object-cover" />
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[9px] font-medium uppercase">{category}</span>
        </div>
      ) : (
        <div className="w-full h-20 bg-secondary flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
            {(posterName || '?')[0]?.toUpperCase()}
          </div>
          <p className="text-[9px] text-muted-foreground truncate">{posterName}</p>
        </div>
        <p className="font-bold text-xs leading-tight">{itemName || 'Item name'}</p>
        {description && <p className="text-[10px] text-muted-foreground line-clamp-2">{description}</p>}
        <div className="grid grid-cols-3 gap-1">
          <div>
            <p className="text-[8px] text-muted-foreground">Buy Est.</p>
            <p className="text-[10px] font-semibold">${buyPrice.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-[8px] text-muted-foreground">Sell</p>
            <p className="text-[10px] font-semibold">${price > 0 ? price.toFixed(0) : '—'}</p>
          </div>
          <div>
            <p className="text-[8px] text-muted-foreground">Margin</p>
            <p className="text-[10px] font-semibold text-primary">+{margin}%</p>
          </div>
        </div>
        <div className="flex gap-1 pt-1">
          <div className="flex-1 h-6 rounded-md border border-border flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <Heart className="w-3 h-3" /> Interested
          </div>
          <div className="h-6 w-6 rounded-md border border-border flex items-center justify-center">
            <MessageCircle className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PostFlipDialog({ open, onClose, prefillData = null }) {
  const navigate = useNavigate();
  // step: 'edit' | 'preview' | 'done'
  const [step, setStep] = useState('edit');

  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [prefillImageUrl, setPrefillImageUrl] = useState(null);
  const [costBasis, setCostBasis] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isGraded, setIsGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState('PSA');
  const [grade, setGrade] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [certImageUrl, setCertImageUrl] = useState(null);
  const [category, setCategory] = useState('other');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && prefillData) {
      setItemName(prefillData.item_name || '');
      setCategory(prefillData.category || 'other');
      setPrice(prefillData.price ? String(prefillData.price) : '');
      setDescription(prefillData.notes || '');
      setPrefillImageUrl(prefillData.image_url || null);
      setCostBasis(prefillData.cost_basis ?? null);
      setLocation(prefillData.location || '');
      setIsGraded(!!prefillData.is_graded);
      setGradingCompany(prefillData.grading_company || 'PSA');
      setGrade(prefillData.grade || '');
      setCertNumber(prefillData.cert_number || '');
      setImageFile(null);
      setCertImageUrl(null);
      setStep('edit');
    }
    if (!open) {
      setStep('edit');
      setItemName(''); setCategory('other'); setDescription(''); setPrice('');
      setLocation(''); setImageFile(null); setPrefillImageUrl(null); setCostBasis(null);
      setIsGraded(false); setGradingCompany('PSA');
      setGrade(''); setCertNumber(''); setCertImageUrl(null);
    }
  }, [open, prefillData]);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: myPosts = [] } = useQuery({
    queryKey: ['communityFlips'],
    queryFn: () => base44.entities.CommunityFlip.list('-created_date', 100),
    select: (data) => data.filter(f => f.posted_by === user?.email),
    enabled: !!user,
  });

  const { data: myProfile } = useQuery({
    queryKey: ['myProfile', user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user?.email }, '-created_date', 1).then(r => r?.[0] ?? null),
    enabled: !!user?.email,
  });

  const postAllowed = canPostCommunity(user, myPosts);

  const postMutation = useMutation({
    mutationFn: async (initialData) => {
      let data = { ...initialData };

      const textToCheck = [data.item_name, data.description].filter(Boolean).join(' ');
      const textModResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Is the following text appropriate for a professional reselling marketplace? Check for slurs, hate speech, profanity, or offensive content. Text: "${textToCheck}"\n\nRespond with only "approved" or "rejected".`
      });
      if (textModResult.toLowerCase().includes('rejected')) {
        throw new Error('Your post contains inappropriate content. Please revise and try again.');
      }

      const VALID_CATS = ['cards','sneakers','clothing','electronics','collectibles','games','technology','vintage','other'];
      const catResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Classify this resale item into exactly one of these categories: cards, sneakers, clothing, electronics, collectibles, games, technology, vintage, other.\nItem: "${data.item_name}"\nRespond with only the single category word, lowercase.`
      });
      const detectedCat = catResult.trim().toLowerCase().split(/\s/)[0];
      data = { ...data, category: VALID_CATS.includes(detectedCat) ? detectedCat : data.category };

      let imageUrl = null;
      if (imageFile) {
        setUploading(true);
        const result = await base44.integrations.Core.UploadFile({ file: imageFile });
        imageUrl = result.file_url;
        const moderationResult = await base44.functions.invoke('moderateImage', { image_url: imageUrl });
        setUploading(false);
        if (!moderationResult.data.approved) {
          throw new Error(moderationResult.data.reason || 'Image contains inappropriate content');
        }
      } else if (certImageUrl) {
        imageUrl = certImageUrl;
      } else if (prefillImageUrl) {
        imageUrl = prefillImageUrl;
      }

      const posterName = myProfile?.display_name || myProfile?.username || user.full_name || user.email.split('@')[0];

      const created = await base44.entities.CommunityFlip.create({
        ...data,
        image_url: imageUrl,
        posted_by: user.email,
        posted_by_name: posterName,
        is_poster_pro: !!user.is_pro,
        interested_users: [],
      });
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityFlips'] });
      setStep('done');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to post flip');
    },
  });

  const handleGoToPreview = () => {
    if (!itemName || !price) { toast.error('Please fill in item name and price'); return; }
    if (!postAllowed) { toast.error(`Free plan allows ${FREE_LIMITS.community_posts} active posts. Upgrade to Pro for unlimited.`); return; }
    setStep('preview');
  };

  const handleConfirmPost = () => {
    postMutation.mutate({
      item_name: itemName,
      category,
      description,
      price: parseFloat(price),
      location,
      is_graded: category === 'cards' ? isGraded : false,
      grading_company: category === 'cards' && isGraded ? gradingCompany : undefined,
      grade: category === 'cards' && isGraded ? grade : undefined,
      cert_number: category === 'cards' && isGraded ? certNumber : undefined,
    });
  };

  // Resolve the active image URL for display
  const activeImageUrl = imageFile
    ? URL.createObjectURL(imageFile)
    : certImageUrl || prefillImageUrl || null;

  const posterName = myProfile?.display_name || myProfile?.username || user?.full_name || '—';
  const priceNum = parseFloat(price) || 0;
  const potentialProfit = costBasis != null && priceNum > 0 ? (priceNum - costBasis).toFixed(2) : null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92dvh] overflow-y-auto p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            {step === 'preview' && (
              <button onClick={() => setStep('edit')} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <SheetTitle className="text-base">
              {step === 'done' ? 'Posted!' : step === 'preview' ? 'Preview Listing' : 'Share to Community'}
            </SheetTitle>
            {step === 'edit' && (
              <span className="ml-auto text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Step 1 of 2</span>
            )}
            {step === 'preview' && (
              <span className="ml-auto text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Step 2 of 2</span>
            )}
          </div>
        </SheetHeader>

        {/* ── Done ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-4 py-8 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Your listing is live!</p>
              <p className="text-sm text-muted-foreground mt-1">The community can now see your item.</p>
            </div>
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={onClose}>Done</Button>
              <Button className="flex-1 bg-primary" onClick={() => { onClose(); navigate('/community'); }}>
                <ExternalLink className="w-4 h-4 mr-1" /> View in Community
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 1: Edit ── */}
        {step === 'edit' && (
          <div className="px-4 pt-3 pb-6 space-y-4">
            {!user?.is_pro && (
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                <Crown className="w-3.5 h-3.5 text-primary shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  Free plan: <span className="font-semibold text-foreground">{myPosts.length}/{FREE_LIMITS.community_posts}</span> posts used.
                </p>
              </div>
            )}

            {/* Item summary row */}
            <div className="flex gap-3 items-center p-3 bg-secondary/50 rounded-xl border border-border">
              <div className="w-14 h-14 rounded-lg border border-border bg-background flex items-center justify-center shrink-0 overflow-hidden">
                {activeImageUrl ? (
                  <img src={activeImageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{itemName || 'Unnamed Item'}</p>
                <p className="text-xs text-muted-foreground capitalize">{category}</p>
                {costBasis != null && (
                  <p className="text-xs text-muted-foreground">Cost basis: <span className="font-medium text-foreground">${costBasis.toFixed(2)}</span></p>
                )}
                {potentialProfit !== null && (
                  <p className={`text-xs font-medium ${parseFloat(potentialProfit) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    Potential: {parseFloat(potentialProfit) >= 0 ? '+' : ''}${potentialProfit}
                  </p>
                )}
              </div>
              {/* Replace image */}
              <div className="shrink-0">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={(e) => { setImageFile(e.target.files?.[0] || null); }}
                  className="hidden"
                  id="flip-image"
                />
                <label htmlFor="flip-image" className="flex flex-col items-center gap-0.5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-[9px]">{imageFile ? 'Replace' : prefillImageUrl ? 'Replace' : 'Add photo'}</span>
                </label>
                {imageFile && (
                  <button type="button" onClick={() => setImageFile(null)} className="flex items-center justify-center mt-1">
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </div>
            </div>

            {/* Ask price + location */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Ask Price *</label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="bg-background" style={{ fontSize: 16 }} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Location <span className="text-muted-foreground/60">(optional)</span></label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" className="bg-background" style={{ fontSize: 16 }} />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Description <span className="text-muted-foreground/60">(optional)</span></label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Condition, details, why it's a good flip..."
                className="bg-background min-h-[60px] text-sm"
                style={{ fontSize: 16 }}
              />
            </div>

            {/* Graded card */}
            {category === 'cards' && (
              <div className="space-y-3 border border-border rounded-xl p-3 bg-background">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Graded Card</label>
                  <button
                    type="button"
                    onClick={() => setIsGraded(v => !v)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isGraded ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${isGraded ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {isGraded && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Company</label>
                        <select value={gradingCompany} onChange={(e) => setGradingCompany(e.target.value)} className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm" style={{ fontSize: 16 }}>
                          {['PSA','BGS','CGC','SGC','GMA','HGA','CSG','AGS','other'].map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Grade</label>
                        <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. 9.5" className="bg-card h-9" style={{ fontSize: 16 }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cert Number</label>
                      <Input value={certNumber} onChange={(e) => setCertNumber(e.target.value)} placeholder="Certificate / serial number" className="bg-card h-9" style={{ fontSize: 16 }} />
                    </div>
                    <CertImagePreview certNumber={certNumber} gradingCompany={gradingCompany} currentImageUrl={certImageUrl} onImageFound={(url, name) => { setCertImageUrl(url); if (name && !itemName) setItemName(name); }} />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button onClick={handleGoToPreview} className="flex-1 bg-primary hover:bg-primary/90">
                <Eye className="w-4 h-4 mr-1.5" /> Preview Listing
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Preview ── */}
        {step === 'preview' && (
          <div className="px-4 pt-4 pb-6 space-y-4">
            <p className="text-xs text-muted-foreground text-center">This is how your listing will appear in the community feed.</p>

            <div className="max-w-[200px] mx-auto">
              <PreviewCard
                itemName={itemName}
                price={priceNum}
                category={category}
                description={description}
                imageUrl={activeImageUrl}
                posterName={posterName}
              />
            </div>

            {location && (
              <div className="flex items-center gap-1.5 justify-center text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />{location}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setStep('edit')} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-1" /> Edit
              </Button>
              <Button onClick={handleConfirmPost} className="flex-1 bg-primary hover:bg-primary/90" disabled={postMutation.isPending || uploading}>
                {postMutation.isPending || uploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{uploading ? 'Uploading...' : 'Posting...'}</>
                ) : 'Post to Community'}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
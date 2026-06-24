import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, Crown, X, CreditCard, Shirt, Cpu, Trophy, Gamepad2, Watch, Tag, Sparkles, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CertImagePreview from '@/components/grading/CertImagePreview';
import AIImageSearch from '@/components/community/AIImageSearch';
import { toast } from 'sonner';
import { canPostCommunity, FREE_LIMITS } from '@/lib/proGate';

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

export default function PostFlipDialog({ open, onClose, prefillData = null }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('edit');

  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [prefillImageUrl, setPrefillImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isGraded, setIsGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState('PSA');
  const [grade, setGrade] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [certImageUrl, setCertImageUrl] = useState(null);
  const [aiSuggestedImageUrl, setAiSuggestedImageUrl] = useState(null);
  const [referenceImageType, setReferenceImageType] = useState(null); // 'reference' or 'ai_generated'
  const [category, setCategory] = useState('other');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && prefillData) {
      setItemName(prefillData.item_name || '');
      setCategory(prefillData.category || 'other');
      setPrice(prefillData.price ? String(prefillData.price) : '');
      setDescription(prefillData.notes || '');
      setPrefillImageUrl(prefillData.image_url || null);
      setLocation(prefillData.location || '');
      setIsGraded(!!prefillData.is_graded);
      setGradingCompany(prefillData.grading_company || 'PSA');
      setGrade(prefillData.grade || '');
      setCertNumber(prefillData.cert_number || '');
      setImageFile(null);
      setCertImageUrl(null);
      setAiSuggestedImageUrl(null);
      setReferenceImageType(null);
      setStep('edit');
    }
    if (!open) {
      setStep('edit');
      setItemName(''); setCategory('other'); setDescription(''); setPrice('');
      setLocation(''); setImageFile(null); setPrefillImageUrl(null);
      setIsGraded(false); setGradingCompany('PSA');
      setGrade(''); setCertNumber(''); setCertImageUrl(null);
      setAiSuggestedImageUrl(null);
      setReferenceImageType(null);
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
      } else if (aiSuggestedImageUrl) {
        imageUrl = aiSuggestedImageUrl;
      } else if (prefillImageUrl) {
        imageUrl = prefillImageUrl;
      }

      const posterName = myProfile?.display_name || myProfile?.username || user.full_name || user.email.split('@')[0];

      const created = await base44.entities.CommunityFlip.create({
        ...data,
        image_url: imageUrl,
        is_ai_generated_image: referenceImageType === 'ai_generated',
        is_reference_image: referenceImageType === 'reference',
        posted_by: user.email,
        posted_by_name: posterName,
        is_poster_pro: !!user.is_pro,
        interested_users: [],
      });
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityFlips'] });
      toast.success('Your listing is live!');
      onClose();
      navigate('/community');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to post flip');
    },
  });

  const handlePost = () => {
    if (!itemName || !price) { toast.error('Please fill in item name and price'); return; }
    if (!postAllowed) { toast.error(`Free plan allows ${FREE_LIMITS.community_posts} active posts. Upgrade to Pro for unlimited.`); return; }
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

  // Resolve the active image URL for display (priority: upload > cert > AI > prefill)
  const activeImageUrl = imageFile
    ? URL.createObjectURL(imageFile)
    : certImageUrl || aiSuggestedImageUrl || prefillImageUrl || null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92dvh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
          <SheetTitle className="text-base">Share to Community</SheetTitle>
        </SheetHeader>

        {(
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
              <div className="w-14 h-14 rounded-lg border border-border bg-background flex items-center justify-center shrink-0 overflow-hidden relative">
                {activeImageUrl ? (
                  <>
                    <img src={activeImageUrl} alt="" className="w-full h-full object-cover" />
                    {aiSuggestedImageUrl && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white/90" />
                      </div>
                    )}
                  </>
                ) : (
                  (() => {
                    const meta = CATEGORY_META[category] || CATEGORY_META.other;
                    const CatIcon = meta.icon;
                    return (
                      <div className={`w-full h-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}>
                        <CatIcon className="w-5 h-5 text-white/60" />
                      </div>
                    );
                  })()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold truncate">{itemName || 'Unnamed Item'}</p>
                  {aiSuggestedImageUrl && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium whitespace-nowrap">
                      AI image
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground capitalize">{category}</p>
                {prefillData?.condition && (
                  <p className="text-xs text-muted-foreground capitalize">{prefillData.condition.replace('_', ' ')}</p>
                )}
                {isGraded && grade && (
                  <p className="text-xs text-primary font-medium">{gradingCompany} {grade}</p>
                )}
              </div>
              {/* Replace image */}
              <div className="shrink-0">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={(e) => { setImageFile(e.target.files?.[0] || null); setAiSuggestedImageUrl(null); }}
                  className="hidden"
                  id="flip-image"
                />
                <label htmlFor="flip-image" className="flex flex-col items-center gap-0.5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-[9px]">{imageFile ? 'Replace' : prefillImageUrl ? 'Replace' : aiSuggestedImageUrl ? 'Replace' : 'Add photo'}</span>
                </label>
                {(imageFile || aiSuggestedImageUrl) && (
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setAiSuggestedImageUrl(null); }}
                    className="flex items-center justify-center mt-1"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </div>
            </div>

            {/* Reference Image Lookup - shown when no image exists */}
            {!activeImageUrl && (
              <div className="space-y-2">
                <AIImageSearch
                  itemName={itemName}
                  category={category}
                  onImageFound={(url, type) => {
                    setAiSuggestedImageUrl(url);
                    setReferenceImageType(type);
                    setImageFile(null); // Clear any manual upload
                  }}
                />
              </div>
            )}

            {/* Reference image disclaimer when shown */}
            {aiSuggestedImageUrl && (
              <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                {referenceImageType === 'reference' ? (
                  <Image className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                ) : (
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {referenceImageType === 'reference' ? (
                      <>
                        <span className="font-medium text-primary">Reference image from official sources.</span> This is a product image found online, not an actual photo of your item's specific condition. Upload a real photo for better buyer trust.
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-primary">AI-generated reference image.</span> This is a synthetic image based on your item name, not an actual photo of your item. Upload a real photo for better buyer trust.
                      </>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setAiSuggestedImageUrl(null); setReferenceImageType(null); }}
                    className="text-[10px] text-muted-foreground underline mt-1"
                  >
                    Remove image
                  </button>
                </div>
              </div>
            )}

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
              <Button onClick={handlePost} className="flex-1 bg-primary hover:bg-primary/90" disabled={postMutation.isPending || uploading}>
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
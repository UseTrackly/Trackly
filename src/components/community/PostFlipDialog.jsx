import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, Crown, CheckCircle2, ExternalLink, ImageIcon, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CertImagePreview from '@/components/grading/CertImagePreview';
import { toast } from 'sonner';
import { canPostCommunity, FREE_LIMITS } from '@/lib/proGate';

export default function PostFlipDialog({ open, onClose, prefillData = null }) {
  const navigate = useNavigate();
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [prefillImageUrl, setPrefillImageUrl] = useState(null);
  const [useInventoryImage, setUseInventoryImage] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isGraded, setIsGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState('PSA');
  const [grade, setGrade] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [certImageUrl, setCertImageUrl] = useState(null);
  const [category, setCategory] = useState('other');
  const [postedFlipId, setPostedFlipId] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && prefillData) {
      setItemName(prefillData.item_name || '');
      setCategory(prefillData.category || 'other');
      setPrice(prefillData.price ? String(prefillData.price) : '');
      setDescription(prefillData.notes || '');
      setPrefillImageUrl(prefillData.image_url || null);
      setUseInventoryImage(!!prefillData.image_url);
      setIsGraded(!!prefillData.is_graded);
      setGradingCompany(prefillData.grading_company || 'PSA');
      setGrade(prefillData.grade || '');
      setCertNumber(prefillData.cert_number || '');
      setImageFile(null);
      setCertImageUrl(null);
    }
    if (!open) {
      // reset on close
      setItemName(''); setCategory('other'); setDescription(''); setPrice('');
      setLocation(''); setImageFile(null); setPrefillImageUrl(null);
      setUseInventoryImage(true); setIsGraded(false); setGradingCompany('PSA');
      setGrade(''); setCertNumber(''); setCertImageUrl(null); setPostedFlipId(null);
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

      // Moderate text
      const textToCheck = [data.item_name, data.description].filter(Boolean).join(' ');
      const textModResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Is the following text appropriate for a professional reselling marketplace? Check for slurs, hate speech, profanity, or offensive content. Text: "${textToCheck}"\n\nRespond with only "approved" or "rejected".`
      });
      if (textModResult.toLowerCase().includes('rejected')) {
        throw new Error('Your post contains inappropriate content. Please revise and try again.');
      }

      // Auto-classify category
      const VALID_CATS = ['cards','sneakers','clothing','electronics','collectibles','games','technology','vintage','other'];
      const catResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Classify this resale item into exactly one of these categories: cards, sneakers, clothing, electronics, collectibles, games, technology, vintage, other.\nItem: "${data.item_name}"\nRespond with only the single category word, lowercase.`
      });
      const detectedCat = catResult.trim().toLowerCase().split(/\s/)[0];
      data = { ...data, category: VALID_CATS.includes(detectedCat) ? detectedCat : data.category };

      // Resolve image
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
      } else if (prefillImageUrl && useInventoryImage) {
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
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['communityFlips'] });
      setPostedFlipId(created?.id || true);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to post flip');
    },
  });

  const handleSubmit = () => {
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

  // Determine what image is "active"
  const activeImageUrl = imageFile
    ? URL.createObjectURL(imageFile)
    : certImageUrl
    ? certImageUrl
    : (useInventoryImage && prefillImageUrl)
    ? prefillImageUrl
    : null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92dvh] overflow-y-auto p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
          <SheetTitle className="text-base">
            {postedFlipId ? 'Posted!' : 'Share to Community'}
          </SheetTitle>
        </SheetHeader>

        {/* ── Success ── */}
        {postedFlipId && (
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

        {/* ── Form ── */}
        {!postedFlipId && (
          <div className="px-4 pt-3 pb-6 space-y-4">

            {/* Free tier warning */}
            {!user?.is_pro && (
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                <Crown className="w-3.5 h-3.5 text-primary shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  Free plan: <span className="font-semibold text-foreground">{myPosts.length}/{FREE_LIMITS.community_posts}</span> posts used.
                </p>
              </div>
            )}

            {/* Image preview + controls */}
            <div className="flex gap-3 items-start">
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-xl border border-border bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                {activeImageUrl ? (
                  <img src={activeImageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              {/* Image options */}
              <div className="flex-1 space-y-1.5">
                {prefillImageUrl && !imageFile && (
                  <button
                    type="button"
                    onClick={() => setUseInventoryImage(v => !v)}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-colors ${useInventoryImage ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border text-muted-foreground'}`}
                  >
                    {useInventoryImage ? '✓ Using inventory image' : 'Use inventory image'}
                  </button>
                )}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={(e) => { setImageFile(e.target.files?.[0] || null); setUseInventoryImage(false); }}
                    className="hidden"
                    id="flip-image"
                  />
                  <label
                    htmlFor="flip-image"
                    className="flex items-center gap-1.5 w-full text-left text-xs px-3 py-2 rounded-lg border border-border text-muted-foreground cursor-pointer hover:bg-secondary transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    {imageFile ? imageFile.name : 'Upload photo'}
                  </label>
                </div>
                {imageFile && (
                  <button type="button" onClick={() => { setImageFile(null); setUseInventoryImage(!!prefillImageUrl); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                    <X className="w-3 h-3" /> Remove photo
                  </button>
                )}
              </div>
            </div>

            {/* Item name + price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Item Name *</label>
                <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Jordan 4 Retro" className="bg-background" style={{ fontSize: 16 }} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Ask Price *</label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="bg-background" style={{ fontSize: 16 }} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Location</label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" className="bg-background" style={{ fontSize: 16 }} />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Condition, details, why it's a good flip..."
                className="bg-background min-h-[72px] text-sm"
                style={{ fontSize: 16 }}
              />
            </div>

            {/* Graded card section (cards only) */}
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
                        <select
                          value={gradingCompany}
                          onChange={(e) => setGradingCompany(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm"
                          style={{ fontSize: 16 }}
                        >
                          {['PSA', 'BGS', 'CGC', 'SGC', 'GMA', 'HGA', 'CSG', 'AGS', 'other'].map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
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
                    <CertImagePreview
                      certNumber={certNumber}
                      gradingCompany={gradingCompany}
                      currentImageUrl={certImageUrl}
                      onImageFound={(url, name) => {
                        setCertImageUrl(url);
                        if (name && !itemName) setItemName(name);
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={onClose} className="flex-1" disabled={postMutation.isPending || uploading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="flex-1 bg-primary hover:bg-primary/90" disabled={postMutation.isPending || uploading}>
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
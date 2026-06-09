import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, Crown, Sparkles, CheckCircle2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AIImageSearch from '@/components/community/AIImageSearch';
import CertImagePreview from '@/components/grading/CertImagePreview';
import { toast } from 'sonner';
import { canPostCommunity, FREE_LIMITS } from '@/lib/proGate';

const CATEGORIES = [
  { value: 'cards', label: 'Cards' },
  { value: 'sneakers', label: 'Sneakers' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'collectibles', label: 'Collectibles' },
  { value: 'games', label: 'Games' },
  { value: 'technology', label: 'Technology' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'other', label: 'Other' },
];

export default function PostFlipDialog({ open, onClose, prefillData = null }) {
  const navigate = useNavigate();
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('other');
  const [aiCategory, setAiCategory] = useState(null);
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
  const [aiImageUrl, setAiImageUrl] = useState(null);
  const [postedFlipId, setPostedFlipId] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && prefillData) {
      setItemName(prefillData.item_name || '');
      setCategory(prefillData.category || 'other');
      setPrice(prefillData.price ? String(prefillData.price) : '');
      setDescription(prefillData.notes || '');
      setPrefillImageUrl(prefillData.image_url || null);
      setIsGraded(!!prefillData.is_graded);
      setGradingCompany(prefillData.grading_company || 'PSA');
      setGrade(prefillData.grade || '');
      setCertNumber(prefillData.cert_number || '');
    }
  }, [open, prefillData]);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

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
      let imageUrl = null;

      // Moderate item name and description
      const textToCheck = [data.item_name, data.description].filter(Boolean).join(' ');
      const textModResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Is the following text appropriate for a professional reselling marketplace? Check for slurs, hate speech, profanity, or offensive content. Text: "${textToCheck}"\n\nRespond with only "approved" or "rejected".`
      });
      if (textModResult.toLowerCase().includes('rejected')) {
        throw new Error('Your post contains inappropriate content. Please revise and try again.');
      }

      // AI auto-classify category
      const VALID_CATS = ['cards','sneakers','clothing','electronics','collectibles','games','technology','vintage','other'];
      const catResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Classify this resale item into exactly one of these categories: cards, sneakers, clothing, electronics, collectibles, games, technology, vintage, other.\nItem: "${data.item_name}"\nDescription: "${data.description || ''}"\nRespond with only the single category word, lowercase.`
      });
      const detectedCat = catResult.trim().toLowerCase().split(/\s/)[0];
      const resolvedCategory = VALID_CATS.includes(detectedCat) ? detectedCat : 'other';
      data = { ...data, category: resolvedCategory };
      setAiCategory(resolvedCategory);

      if (aiImageUrl && !imageFile) {
        imageUrl = aiImageUrl;
      } else if (certImageUrl && !imageFile) {
        imageUrl = certImageUrl;
      } else if (prefillImageUrl && !imageFile) {
        imageUrl = prefillImageUrl;
      }

      if (imageFile) {
        setUploading(true);
        const result = await base44.integrations.Core.UploadFile({ file: imageFile });
        imageUrl = result.file_url;
        
        // Moderate the image
        const moderationResult = await base44.functions.invoke('moderateImage', {
          image_url: imageUrl
        });
        
        if (!moderationResult.data.approved) {
          setUploading(false);
          throw new Error(moderationResult.data.reason || 'Image contains inappropriate content');
        }
        
        setUploading(false);
      }

      // Use display_name from profile for consistency, fallback to username
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
    if (!itemName || !price) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!postAllowed) {
      toast.error(`Free plan allows ${FREE_LIMITS.community_posts} active posts. Upgrade to Pro for unlimited.`);
      return;
    }

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

  const handleClose = () => {
    setItemName('');
    setCategory('other');
    setDescription('');
    setPrice('');
    setLocation('');
    setImageFile(null);
    setPrefillImageUrl(null);
    setIsGraded(false);
    setGradingCompany('PSA');
    setGrade('');
    setCertNumber('');
    setCertImageUrl(null);
    setAiImageUrl(null);
    setAiCategory(null);
    setPostedFlipId(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg">{postedFlipId ? 'Posted!' : 'Post to Community'}</DialogTitle>
        </DialogHeader>

        {/* ── Success screen ─────────────────────────── */}
        {postedFlipId && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-base">Your listing is live!</p>
              <p className="text-sm text-muted-foreground mt-1">The community can now see and interact with your flip.</p>
            </div>
            <div className="flex gap-2 w-full">
              <button
                onClick={handleClose}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                Done
              </button>
              <button
                onClick={() => { handleClose(); navigate('/community'); }}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View in Community
              </button>
            </div>
          </div>
        )}

        {!postedFlipId && <><div className="space-y-4 py-2">
          {/* Free tier warning */}
          {!user?.is_pro && (
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <Crown className="w-3.5 h-3.5 text-primary shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                Free plan: <span className="font-semibold text-foreground">{myPosts.length}/{FREE_LIMITS.community_posts}</span> posts used. Upgrade for unlimited.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Item Name *
            </label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Jordan 4 Retro"
              className="bg-background"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Category
              </label>
              <div className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-background text-sm text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="capitalize">{aiCategory || 'AI will detect'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Price *
              </label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="bg-background"
              />
            </div>
          </div>

          {/* Graded Card Section */}
          {category === 'cards' && (
            <div className="space-y-3 border border-border rounded-xl p-3 bg-background">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Graded Card
                </label>
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
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Grading Company</label>
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
                      <Input
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        placeholder="e.g. 9.5, 10"
                        className="bg-card h-9"
                        style={{ fontSize: 16 }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cert Number</label>
                    <Input
                      value={certNumber}
                      onChange={(e) => setCertNumber(e.target.value)}
                      placeholder="Certificate / serial number"
                      className="bg-card h-9"
                      style={{ fontSize: 16 }}
                    />
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

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Location
            </label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State"
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell the community about this flip opportunity..."
              className="bg-background min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Image
            </label>
            {aiImageUrl && !imageFile ? (
              <div className="flex items-center gap-3 p-3 border border-primary/30 rounded-xl bg-primary/5">
                <img src={aiImageUrl} alt="AI" className="w-12 h-12 object-cover rounded-lg border border-border bg-background" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-primary mb-1">AI-generated image</p>
                  <button type="button" onClick={() => setAiImageUrl(null)} className="text-xs text-muted-foreground underline cursor-pointer">
                    Remove
                  </button>
                </div>
              </div>
            ) : prefillImageUrl && !imageFile && !certImageUrl ? (
              <div className="flex items-center gap-3 p-3 border border-primary/30 rounded-xl bg-primary/5">
                <img src={prefillImageUrl} alt="Item" className="w-12 h-12 object-cover rounded-lg border border-border bg-background" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-primary mb-1">From inventory</p>
                  <div className="relative">
                    <input type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" onChange={(e) => { try { setImageFile(e.target.files?.[0] || null); } catch(_) {} }} className="hidden" id="flip-image" />
                    <label htmlFor="flip-image" className="text-xs text-muted-foreground underline cursor-pointer">Replace with your own</label>
                  </div>
                </div>
              </div>
            ) : certImageUrl && !imageFile ? (
              <div className="flex items-center gap-3 p-3 border border-primary/30 rounded-xl bg-primary/5">
                <img src={certImageUrl} alt="Card" className="w-12 h-16 object-contain rounded-lg border border-border bg-background" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-primary mb-1">Auto-fetched from {gradingCompany}</p>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      onChange={(e) => { try { setImageFile(e.target.files?.[0] || null); } catch(_) {} }}
                      className="hidden"
                      id="flip-image"
                    />
                    <label htmlFor="flip-image" className="text-xs text-muted-foreground underline cursor-pointer">
                      Replace with your own
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={(e) => { try { setImageFile(e.target.files?.[0] || null); } catch(_) {} }}
                    className="hidden"
                    id="flip-image"
                  />
                  <label
                    htmlFor="flip-image"
                    className="flex items-center gap-2 px-4 py-3 border border-border rounded-xl bg-background cursor-pointer hover:bg-secondary transition-colors"
                  >
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {imageFile ? imageFile.name : 'Upload image'}
                    </span>
                  </label>
                </div>
                <AIImageSearch
                  itemName={itemName}
                  category={category}
                  onImageFound={(url) => setAiImageUrl(url)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
            disabled={postMutation.isPending || uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-primary hover:bg-primary/90"
            disabled={postMutation.isPending || uploading}
          >
            {postMutation.isPending || uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploading ? 'Uploading...' : 'Checking...'}
              </>
            ) : (
              'Post to Community'
            )}
          </Button>
        </div>
        </>}
      </DialogContent>
    </Dialog>
  );
}
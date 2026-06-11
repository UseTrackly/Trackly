import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import CertImagePreview from '@/components/grading/CertImagePreview';

export default function EditListingDialog({ open, onClose, flip }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [isGraded, setIsGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState('PSA');
  const [grade, setGrade] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [certImageUrl, setCertImageUrl] = useState(null);

  useEffect(() => {
    if (open && flip) {
      setItemName(flip.item_name || '');
      setPrice(flip.price ? String(flip.price) : '');
      setDescription(flip.description || '');
      setLocation(flip.location || '');
      setCurrentImageUrl(flip.image_url || null);
      setIsGraded(!!flip.is_graded);
      setGradingCompany(flip.grading_company || 'PSA');
      setGrade(flip.grade || '');
      setCertNumber(flip.cert_number || '');
      setImageFile(null);
      setRemoveImage(false);
      setCertImageUrl(null);
    }
  }, [open, flip]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      let imageUrl = currentImageUrl;

      // Handle image removal
      if (removeImage) {
        imageUrl = null;
      } else if (imageFile) {
        // Upload new image
        setUploading(true);
        const result = await base44.integrations.Core.UploadFile({ file: imageFile });
        imageUrl = result.file_url;
        setUploading(false);

        // Moderate image
        const moderationResult = await base44.functions.invoke('moderateImage', { image_url: imageUrl });
        if (!moderationResult.data.approved) {
          throw new Error(moderationResult.data.reason || 'Image contains inappropriate content');
        }
      } else if (certImageUrl) {
        imageUrl = certImageUrl;
      }

      const updateData = {
        ...data,
        image_url: imageUrl,
        is_ai_generated_image: false, // Reset AI flag when manually editing
      };

      await base44.entities.CommunityFlip.update(flip.id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityFlips'] });
      toast.success('Listing updated');
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update listing');
    },
  });

  const handleSave = () => {
    if (!itemName || !price) {
      toast.error('Please fill in item name and price');
      return;
    }

    updateMutation.mutate({
      item_name: itemName,
      description,
      price: parseFloat(price),
      location,
      is_graded: isGraded,
      grading_company: gradingCompany,
      grade,
      cert_number: certNumber,
    });
  };

  const activeImageUrl = imageFile
    ? URL.createObjectURL(imageFile)
    : certImageUrl || currentImageUrl;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92dvh] overflow-y-auto p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
          <SheetTitle className="text-base">Edit Listing</SheetTitle>
        </SheetHeader>

        <div className="px-4 pt-3 pb-6 space-y-4">
          {/* Image preview */}
          {activeImageUrl ? (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-background border border-border">
              <img src={activeImageUrl} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setCertImageUrl(null);
                  setRemoveImage(true);
                  setCurrentImageUrl(null);
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <div className="w-full aspect-video rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center bg-secondary/30">
              <Upload className="w-6 h-6 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">No image</p>
            </div>
          )}

          {/* Upload new image */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              onChange={(e) => {
                setImageFile(e.target.files?.[0] || null);
                setRemoveImage(false);
              }}
              className="hidden"
              id="edit-image"
            />
            <label htmlFor="edit-image">
              <Button type="button" variant="outline" size="sm" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {imageFile || certImageUrl ? 'Replace Image' : currentImageUrl ? 'Replace Image' : 'Upload Image'}
                </span>
              </Button>
            </label>
            {(imageFile || certImageUrl) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setImageFile(null);
                  setCertImageUrl(null);
                  setRemoveImage(false);
                }}
              >
                Cancel
              </Button>
            )}
          </div>

          {/* Item name + price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Item Name *</label>
              <Input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Item name"
                className="bg-background"
                style={{ fontSize: 16 }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Price *</label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="bg-background"
                style={{ fontSize: 16 }}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Location</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State"
              className="bg-background"
              style={{ fontSize: 16 }}
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Condition, details, etc."
              className="bg-background min-h-[80px] text-sm"
              style={{ fontSize: 16 }}
            />
          </div>

          {/* Graded card section */}
          {flip.category === 'cards' && (
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
                        {['PSA','BGS','CGC','SGC','GMA','HGA','CSG','AGS','other'].map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Grade</label>
                      <Input
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        placeholder="e.g. 9.5"
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

          {/* Save button */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={updateMutation.isPending || uploading}
            >
              {updateMutation.isPending || uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : 'Save Changes'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
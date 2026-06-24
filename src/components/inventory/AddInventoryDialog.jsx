import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, DollarSign, X } from 'lucide-react';
import CertImagePreview from '@/components/grading/CertImagePreview';
import { toast } from 'sonner';

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

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

export default function AddInventoryDialog({ open, onClose, editingItem }) {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('other');
  const [costBasis, setCostBasis] = useState('');
  const [dateAcquired, setDateAcquired] = useState(new Date().toISOString().split('T')[0]);
  const [condition, setCondition] = useState('good');
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [location, setLocation] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isGraded, setIsGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState('PSA');
  const [grade, setGrade] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [certImageUrl, setCertImageUrl] = useState(null);
  const [isPublic, setIsPublic] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (editingItem) {
      setItemName(editingItem.item_name || '');
      setCategory(editingItem.category || 'other');
      setCostBasis(editingItem.cost_basis?.toString() || '');
      setDateAcquired(editingItem.date_acquired || new Date().toISOString().split('T')[0]);
      setCondition(editingItem.condition || 'good');
      setNotes(editingItem.notes || '');
      setQuantity(editingItem.quantity?.toString() || '1');
      setLocation(editingItem.location || '');
      setTargetPrice(editingItem.target_price?.toString() || '');
      setIsGraded(editingItem.is_graded || false);
      setGradingCompany(editingItem.grading_company || 'PSA');
      setGrade(editingItem.grade || '');
      setCertNumber(editingItem.cert_number || '');
      setIsPublic(editingItem.is_public || false);
    } else {
      resetForm();
    }
  }, [editingItem, open]);

  const resetForm = () => {
    setItemName('');
    setCategory('other');
    setCostBasis('');
    setDateAcquired(new Date().toISOString().split('T')[0]);
    setCondition('good');
    setNotes('');
    setQuantity('1');
    setLocation('');
    setTargetPrice('');
    setImageFile(null);
    setImagePreviewUrl(null);
    setIsGraded(false);
    setGradingCompany('PSA');
    setGrade('');
    setCertNumber('');
    setCertImageUrl(null);
    setIsPublic(false);
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let imageUrl = editingItem?.image_url || null;
      if (imageFile) {
        setUploading(true);
        const result = await base44.integrations.Core.UploadFile({ file: imageFile });
        imageUrl = result.file_url;
        setUploading(false);
      } else if (certImageUrl) {
        imageUrl = certImageUrl;
      }
      const itemData = { ...data, image_url: imageUrl };
      if (editingItem) {
        await base44.entities.Inventory.update(editingItem.id, itemData);
      } else {
        await base44.entities.Inventory.create(itemData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(editingItem ? 'Item updated' : 'Item added to inventory');
      handleClose();
    },
  });

  const handleSubmit = () => {
    if (!itemName || !costBasis || !dateAcquired) {
      toast.error('Please fill in all required fields');
      return;
    }
    saveMutation.mutate({
      item_name: itemName,
      category,
      cost_basis: parseFloat(costBasis),
      date_acquired: dateAcquired,
      condition,
      notes,
      quantity: parseInt(quantity) || 1,
      location,
      target_price: targetPrice ? parseFloat(targetPrice) : undefined,
      is_graded: category === 'cards' ? isGraded : false,
      grading_company: category === 'cards' && isGraded ? gradingCompany : undefined,
      grade: category === 'cards' && isGraded ? grade : undefined,
      cert_number: category === 'cards' && isGraded ? certNumber : undefined,
      is_public: isPublic,
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      try { setImagePreviewUrl(URL.createObjectURL(file)); } catch { setImagePreviewUrl(null); }
      toast.success('Photo selected');
    }
    setIsPickingPhoto(false);
    e.target.value = '';
  };

  const triggerFilePicker = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPickingPhoto(true);
    fileInputRef.current?.click();
  };

  if (!open) return null;

  return createPortal(
    <>
      {/* Hidden file input — positioned off-screen, never inside a modal */}
      <input
        ref={fileInputRef}
        id="inventory-image-input"
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
        onChange={handleFileChange}
        style={{ position: 'fixed', top: -9999, left: -9999, opacity: 0, pointerEvents: 'none' }}
      />

      {/* Full-screen overlay — fixed to viewport. Rendered inline (not portaled
          to body) so body's position:fixed / height:100% can't clip the bottom
          safe area. No ancestor has a transform, so fixed anchors to viewport. */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          backgroundColor: 'hsl(0 0% 4%)',
          display: 'flex',
          alignItems: 'flex-end',
          overflow: 'hidden',
          overscrollBehavior: 'contain',
        }}
      >
        {/* Sheet panel */}
        <div
          style={{
            width: '100%',
            maxHeight: '95dvh',
            minHeight: '40dvh',
            backgroundColor: 'hsl(var(--card))',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Handle bar */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'hsl(var(--border))' }} />
          </div>

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 12px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'hsl(var(--foreground))' }}>
              {editingItem ? 'Edit Item' : 'Add to Inventory'}
            </h2>
            <button onClick={handleClose} style={{ padding: 6, borderRadius: 20, color: 'hsl(var(--muted-foreground))' }}>
              <X style={{ width: 20, height: 20 }} />
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: '0 16px' }}>
            <div className="space-y-2.5 pb-4">

              {/* Photo */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Photo</label>
                {certImageUrl && !imageFile ? (
                  <div className="flex items-center gap-3 p-3 border border-primary/30 rounded-xl bg-primary/5">
                    <img src={certImageUrl} alt="Card" className="w-12 h-16 object-contain rounded-lg border border-border bg-background" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-primary mb-1">Auto-fetched from {gradingCompany}</p>
                      <button type="button" onClick={triggerFilePicker} disabled={isPickingPhoto} className="text-xs text-muted-foreground underline">
                        {isPickingPhoto ? 'Loading...' : 'Replace with your own'}
                      </button>
                    </div>
                  </div>
                ) : (imageFile || editingItem?.image_url) ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={imagePreviewUrl || editingItem?.image_url}
                      alt="Item"
                      className="w-24 h-28 object-cover rounded-xl border border-border shrink-0"
                    />
                    <button type="button" onClick={triggerFilePicker} disabled={isPickingPhoto}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50">
                      {isPickingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      Change Photo
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={triggerFilePicker} disabled={isPickingPhoto}
                    className="flex items-center justify-center gap-2 w-full h-20 border-2 border-dashed border-primary/40 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-50">
                    {isPickingPhoto ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-foreground">{isPickingPhoto ? 'Loading...' : 'Add a Photo'}</span>
                  </button>
                )}
              </div>

              {/* Item Name */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Item Name *</label>
                <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Jordan 4 Retro" className="bg-background" />
              </div>

              {/* Category & Condition — native selects, never close the sheet */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                    style={{ fontSize: 16 }}
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                    style={{ fontSize: 16 }}
                  >
                    {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Graded Card Section */}
              {category === 'cards' && (
                <div className="space-y-3 border border-border rounded-xl p-3 bg-background">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Graded Card</label>
                    <button type="button" onClick={() => setIsGraded(v => !v)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isGraded ? 'bg-primary' : 'bg-muted'}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${isGraded ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  {isGraded && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Grading Co.</label>
                          <select value={gradingCompany} onChange={(e) => setGradingCompany(e.target.value)}
                            className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm" style={{ fontSize: 16 }}>
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
                      <CertImagePreview
                        certNumber={certNumber}
                        gradingCompany={gradingCompany}
                        currentImageUrl={certImageUrl || editingItem?.image_url}
                        onImageFound={(url, name) => { setCertImageUrl(url); if (name && !itemName) setItemName(name); }}
                        onCardInfoFound={({ card_name, grade: g, year, set_name }) => {
                          if (card_name && !itemName) setItemName([year, set_name, card_name].filter(Boolean).join(' ') || card_name);
                          if (g && !grade) setGrade(g);
                        }}
                        onManualUpload={triggerFilePicker}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Cost & Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Paid *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" value={costBasis} onChange={(e) => setCostBasis(e.target.value)} placeholder="0.00" className="bg-background pl-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity</label>
                  <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1" className="bg-background" />
                </div>
              </div>

              {/* Date Acquired — full width, compact to prevent horizontal overflow on small screens */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date Acquired *</label>
                <Input type="date" value={dateAcquired} onChange={(e) => setDateAcquired(e.target.value)} className="bg-background h-9 text-sm" style={{ fontSize: 16, maxWidth: '100%' }} />
              </div>

              {/* Target Price — full width */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Target Price</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="number" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} placeholder="0.00" className="bg-background pl-9" />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Storage Location</label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Shelf A, Box 3" className="bg-background" />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Condition details, flaws, or other notes..." className="bg-background min-h-[80px]" />
              </div>

              {/* Public Storefront Toggle */}
              <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-background">
                <div>
                  <p className="text-sm font-medium text-foreground">Show on Storefront</p>
                  <p className="text-xs text-muted-foreground">Make this item visible on your public profile</p>
                </div>
                <button type="button" onClick={() => setIsPublic(v => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isPublic ? 'bg-primary' : 'bg-muted'}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${isPublic ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>

            </div>
          </div>

          {/* Footer buttons — safe-area padding here so the footer extends to the home indicator */}
          <div className="flex gap-2 px-4 py-3 border-t border-border bg-card shrink-0" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}>
            <Button variant="outline" onClick={handleClose} className="flex-1" disabled={saveMutation.isPending || uploading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1 bg-primary hover:bg-primary/90" disabled={saveMutation.isPending || uploading}>
              {saveMutation.isPending || uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{uploading ? 'Uploading...' : 'Saving...'}</>
              ) : (
                editingItem ? 'Update Item' : 'Add Item'
              )}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
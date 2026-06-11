import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCameraPicker } from '@/lib/useCameraPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Upload, Loader2, DollarSign } from 'lucide-react';
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
  const [uploading, setUploading] = useState(false);
  const [isGraded, setIsGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState('PSA');
  const [grade, setGrade] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [certImageUrl, setCertImageUrl] = useState(null);
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const [showConditionDrawer, setShowConditionDrawer] = useState(false);
  const queryClient = useQueryClient();

  const { openCameraPicker, isUploading: isCameraUploading } = useCameraPicker({
    onImageSelected: (file) => {
      setImageFile(file);
      toast.success('Image selected');
    },
  });

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
    setIsGraded(false);
    setGradingCompany('PSA');
    setGrade('');
    setCertNumber('');
    setCertImageUrl(null);
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
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DrawerContent
        className="bg-card border-border"
        style={{ maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DrawerHeader className="shrink-0 pb-0">
          <DrawerTitle className="text-lg">
            {editingItem ? 'Edit Item' : 'Add to Inventory'}
          </DrawerTitle>
        </DrawerHeader>

        {/* Scrollable form body */}
        <div
          className="overflow-y-auto flex-1 px-4"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="space-y-4 py-3">

            {/* ── Photo ── */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Photo</label>
              {certImageUrl && !imageFile ? (
                <div className="flex items-center gap-3 p-3 border border-primary/30 rounded-xl bg-primary/5">
                  <img src={certImageUrl} alt="Card" className="w-12 h-16 object-contain rounded-lg border border-border bg-background" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-primary mb-1">Auto-fetched from {gradingCompany}</p>
                    <button
                      type="button"
                      onClick={() => openCameraPicker({ inputId: 'inventory-image' })}
                      disabled={isCameraUploading}
                      className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
                    >
                      {isCameraUploading ? 'Loading...' : 'Replace with your own'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setImageFile(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                    id="inventory-image"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {(imageFile || editingItem?.image_url) ? (
                    <div className="relative rounded-xl overflow-hidden border border-border">
                      <img
                        src={imageFile ? URL.createObjectURL(imageFile) : editingItem.image_url}
                        alt="Item"
                        className="w-full h-40 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <button
                        type="button"
                        onClick={() => openCameraPicker({ inputId: 'inventory-image' })}
                        disabled={isCameraUploading}
                        className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium hover:bg-black/80 transition-colors"
                      >
                        {isCameraUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        Change photo
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openCameraPicker({ inputId: 'inventory-image' })}
                      disabled={isCameraUploading}
                      className="flex flex-col items-center justify-center gap-3 w-full h-44 border-2 border-dashed border-primary/40 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-50"
                    >
                      {isCameraUploading ? (
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <Upload className="w-7 h-7 text-primary" />
                        </div>
                      )}
                      <div className="space-y-0.5 text-center">
                        <p className="text-sm font-semibold text-foreground">
                          {isCameraUploading ? 'Loading...' : 'Add a Photo'}
                        </p>
                        <p className="text-xs text-muted-foreground">Tap to upload · carries through to listings</p>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Item Name */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Item Name *</label>
              <Input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Jordan 4 Retro"
                className="bg-background"
              />
            </div>

            {/* Category & Condition */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category *</label>
                <button
                  type="button"
                  onClick={() => setShowCategoryDrawer(true)}
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <span>{CATEGORIES.find(c => c.value === category)?.label || 'Select'}</span>
                  <span className="text-muted-foreground opacity-50">▾</span>
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Condition</label>
                <button
                  type="button"
                  onClick={() => setShowConditionDrawer(true)}
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <span>{CONDITIONS.find(c => c.value === condition)?.label || 'Select'}</span>
                  <span className="text-muted-foreground opacity-50">▾</span>
                </button>
              </div>
            </div>

            {/* Category Drawer */}
            <Drawer open={showCategoryDrawer} onOpenChange={setShowCategoryDrawer}>
              <DrawerContent className="bg-card">
                <DrawerHeader><DrawerTitle>Select Category</DrawerTitle></DrawerHeader>
                <div className="px-4 pb-6 space-y-1">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.value}
                      onClick={() => { setCategory(c.value); setShowCategoryDrawer(false); }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${category === c.value ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary'}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </DrawerContent>
            </Drawer>

            {/* Condition Drawer */}
            <Drawer open={showConditionDrawer} onOpenChange={setShowConditionDrawer}>
              <DrawerContent className="bg-card">
                <DrawerHeader><DrawerTitle>Select Condition</DrawerTitle></DrawerHeader>
                <div className="px-4 pb-6 space-y-1">
                  {CONDITIONS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => { setCondition(c.value); setShowConditionDrawer(false); }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${condition === c.value ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary'}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </DrawerContent>
            </Drawer>

            {/* Graded Card Section */}
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
                      currentImageUrl={certImageUrl || editingItem?.image_url}
                      onImageFound={(url, name) => {
                        setCertImageUrl(url);
                        if (name && !itemName) setItemName(name);
                      }}
                      onCardInfoFound={({ card_name, grade: g, year, set_name }) => {
                        if (card_name && !itemName) {
                          const fullName = [year, set_name, card_name].filter(Boolean).join(' ');
                          setItemName(fullName || card_name);
                        }
                        if (g && !grade) setGrade(g);
                      }}
                      onManualUpload={() => document.getElementById('inventory-image')?.click()}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Cost & Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cost Basis *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={costBasis}
                    onChange={(e) => setCostBasis(e.target.value)}
                    placeholder="0.00"
                    className="bg-background pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity</label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                  className="bg-background"
                />
              </div>
            </div>

            {/* Date & Target Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date Acquired *</label>
                <Input
                  type="date"
                  value={dateAcquired}
                  onChange={(e) => setDateAcquired(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Target Price</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="0.00"
                    className="bg-background pl-9"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Storage Location</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Shelf A, Box 3"
                className="bg-background"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Condition details, flaws, or other notes..."
                className="bg-background min-h-[80px]"
              />
            </div>

          </div>
        </div>

        {/* Sticky footer buttons */}
        <div
          className="flex gap-2 px-4 py-4 shrink-0 border-t border-border bg-card"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
        >
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
            disabled={saveMutation.isPending || uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-primary hover:bg-primary/90"
            disabled={saveMutation.isPending || uploading}
          >
            {saveMutation.isPending || uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploading ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              editingItem ? 'Update Item' : 'Add Item'
            )}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
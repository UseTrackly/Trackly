import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { PLATFORMS, calculateFlip } from '@/lib/platformFees';

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

export default function EditFlipDialog({ open, onClose, onSave, flip }) {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('other');
  const [buyPrice, setBuyPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [platform, setPlatform] = useState('ebay');
  const [shippingCost, setShippingCost] = useState('');
  const [dateSold, setDateSold] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (flip) {
      setItemName(flip.item_name || '');
      setCategory(flip.category || 'other');
      setBuyPrice(flip.buy_price ?? '');
      setSalePrice(flip.sale_price ?? '');
      setPlatform(flip.platform || 'ebay');
      setShippingCost(flip.shipping_cost ?? '');
      setDateSold(flip.date_sold || '');
    }
  }, [flip]);

  const handleSave = async () => {
    if (!itemName.trim()) return;
    setSaving(true);
    const bp = parseFloat(buyPrice) || 0;
    const sp = parseFloat(salePrice) || 0;
    const sc = parseFloat(shippingCost) || 0;
    const calc = calculateFlip(bp, sp, platform, sc);
    await onSave(flip.id, {
      item_name: itemName,
      category,
      buy_price: bp,
      sale_price: sp,
      platform,
      shipping_cost: sc,
      platform_fee: calc.platformFee,
      processing_fee: calc.processingFee,
      net_profit: calc.netProfit,
      roi: calc.roi,
      date_sold: dateSold,
    });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg">Edit Flip</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Item Name</label>
            <Input value={itemName} onChange={(e) => setItemName(e.target.value)} className="bg-background" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Platform</label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORMS).map(([k, p]) => (
                    <SelectItem key={k} value={k}>{p.icon} {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Buy Price</label>
              <Input type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sale Price</label>
              <Input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className="bg-background" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Shipping</label>
              <Input type="number" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date Sold</label>
              <Input type="date" value={dateSold} onChange={(e) => setDateSold(e.target.value)} className="bg-background" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!itemName.trim() || saving} className="flex-1 bg-primary hover:bg-primary/90">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
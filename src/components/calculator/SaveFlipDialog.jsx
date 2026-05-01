import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from 'lucide-react';

const CATEGORIES = [
  { value: "cards", label: "Cards" },
  { value: "sneakers", label: "Sneakers" },
  { value: "clothing", label: "Clothing" },
  { value: "electronics", label: "Electronics" },
  { value: "collectibles", label: "Collectibles" },
  { value: "games", label: "Games" },
  { value: "technology", label: "Technology" },
  { value: "vintage", label: "Vintage" },
  { value: "other", label: "Other" },
];

export default function SaveFlipDialog({ open, onClose, onSave, calculation, platform, customExpenses = [] }) {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('other');
  const [dateSold, setDateSold] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!itemName.trim()) return;
    setSaving(true);
    await onSave({
      item_name: itemName,
      category,
      buy_price: calculation.buyPrice,
      sale_price: calculation.salePrice,
      platform,
      shipping_cost: calculation.shippingCost,
      platform_fee: calculation.platformFee,
      processing_fee: calculation.processingFee,
      custom_expenses: customExpenses,
      net_profit: calculation.netProfit,
      roi: calculation.roi,
      date_sold: dateSold,
    });
    setSaving(false);
    setItemName('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg">Save This Flip</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Item Name
            </label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Jordan 4 Retro"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Category
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Date Sold
            </label>
            <Input
              type="date"
              value={dateSold}
              onChange={(e) => setDateSold(e.target.value)}
              className="bg-background"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={!itemName.trim() || saving}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Flip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
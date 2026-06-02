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
import { Save, Users } from 'lucide-react';
import PostFlipDialog from '@/components/community/PostFlipDialog';

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
  const [postToCommunity, setPostToCommunity] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);

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
    if (postToCommunity) {
      setShowPostDialog(true);
    } else {
      setItemName('');
      setPostToCommunity(false);
      onClose();
    }
  };

  const handlePostClose = () => {
    setShowPostDialog(false);
    setItemName('');
    setPostToCommunity(false);
    onClose();
  };

  if (showPostDialog) {
    return (
      <PostFlipDialog
        open={showPostDialog}
        onClose={handlePostClose}
        prefillData={{ item_name: itemName, category }}
      />
    );
  }

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
        {/* Post to community toggle */}
        <div
          className="flex items-center justify-between px-3 py-2.5 border border-border rounded-xl bg-secondary/30 cursor-pointer"
          onClick={() => setPostToCommunity(v => !v)}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs font-medium">Post to Community</p>
              <p className="text-[10px] text-muted-foreground">Share this flip with the Trackly community</p>
            </div>
          </div>
          <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${postToCommunity ? 'bg-primary' : 'bg-muted'}`}>
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${postToCommunity ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={!itemName.trim() || saving}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : postToCommunity ? 'Save & Post to Community' : 'Save Flip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
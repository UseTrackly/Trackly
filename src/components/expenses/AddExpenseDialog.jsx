import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Upload, Loader2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'shipping_supplies', label: '📦 Shipping Supplies' },
  { value: 'gas_sourcing', label: '⛽ Gas/Sourcing' },
  { value: 'subscriptions', label: '💳 Subscriptions' },
  { value: 'storage', label: '🏢 Storage' },
  { value: 'tools_equipment', label: '🛠️ Tools/Equipment' },
  { value: 'marketing', label: '📢 Marketing' },
  { value: 'packaging', label: '📋 Packaging' },
  { value: 'other', label: '💰 Other' },
];

export default function AddExpenseDialog({ open, onClose, editingExpense }) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (editingExpense) {
      setDescription(editingExpense.description || '');
      setCategory(editingExpense.category || 'other');
      setAmount(editingExpense.amount?.toString() || '');
      setDate(editingExpense.date || new Date().toISOString().split('T')[0]);
      setNotes(editingExpense.notes || '');
    } else {
      resetForm();
    }
  }, [editingExpense, open]);

  const resetForm = () => {
    setDescription('');
    setCategory('other');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setReceiptFile(null);
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let receiptUrl = editingExpense?.receipt_url || null;
      
      if (receiptFile) {
        setUploading(true);
        const result = await base44.integrations.Core.UploadFile({ file: receiptFile });
        receiptUrl = result.file_url;
        setUploading(false);
      }

      const expenseData = {
        ...data,
        receipt_url: receiptUrl,
      };

      if (editingExpense) {
        await base44.entities.Expense.update(editingExpense.id, expenseData);
      } else {
        await base44.entities.Expense.create(expenseData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(editingExpense ? 'Expense updated' : 'Expense added');
      handleClose();
    },
  });

  const handleSubmit = () => {
    if (!description || !amount || !date) {
      toast.error('Please fill in all required fields');
      return;
    }

    saveMutation.mutate({
      description,
      category,
      amount: parseFloat(amount),
      date,
      notes,
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {editingExpense ? 'Edit Expense' : 'Add Expense'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Description *
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Bubble mailers"
              className="bg-background"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Category *
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
                Amount *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-background pl-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Date *
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details..."
              className="bg-background min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Receipt (Optional)
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setReceiptFile(e.target.files[0])}
                className="hidden"
                id="expense-receipt"
              />
              <label
                htmlFor="expense-receipt"
                className="flex items-center gap-2 px-4 py-3 border border-border rounded-xl bg-background cursor-pointer hover:bg-secondary transition-colors"
              >
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {receiptFile ? receiptFile.name : editingExpense?.receipt_url ? 'Change receipt' : 'Upload receipt'}
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
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
              editingExpense ? 'Update Expense' : 'Add Expense'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
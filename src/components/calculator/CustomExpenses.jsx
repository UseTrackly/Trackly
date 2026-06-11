import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PRESET_LABELS = ['Packaging', 'Authentication', 'Cleaning', 'Repairs', 'Storage', 'Gas/Travel'];

export default function CustomExpenses({ expenses = [], onChange }) {
  const addExpense = (label = '', amount = 0) => {
    onChange([...expenses, { label, amount }]);
  };

  const updateExpense = (index, field, value) => {
    const updated = [...expenses];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeExpense = (index) => {
    onChange(expenses.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Additional Expenses
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => addExpense()}
          className="h-7 text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add
        </Button>
      </div>

      <AnimatePresence>
        {expenses.map((expense, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-[1fr_100px_auto] gap-2"
          >
            <Input
              placeholder="Label (e.g., Packaging)"
              value={expense.label}
              onChange={(e) => updateExpense(index, 'label', e.target.value)}
              className="h-9 text-sm bg-background"
              list={`expense-labels-${index}`}
              style={{ fontSize: 16 }}
            />
            <datalist id={`expense-labels-${index}`}>
              {PRESET_LABELS.map(label => (
                <option key={label} value={label} />
              ))}
            </datalist>
            <Input
              type="number"
              placeholder="0.00"
              value={expense.amount || ''}
              onChange={(e) => updateExpense(index, 'amount', parseFloat(e.target.value) || 0)}
              className="h-9 text-sm bg-background"
              style={{ fontSize: 16 }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeExpense(index)}
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>

      {expenses.length === 0 && (
        <div className="text-center py-4 border border-dashed border-border rounded-lg">
          <p className="text-xs text-muted-foreground">
            Track extra costs like packaging, gas, or authentication
          </p>
        </div>
      )}
    </div>
  );
}
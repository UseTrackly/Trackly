import React, { useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Package, Search, SlidersHorizontal, ArrowUpDown, MessageSquare, Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/currencyFormatter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmptyState from '@/components/shared/EmptyState';
import InventoryCard from '@/components/inventory/InventoryCard';
import AddInventoryDialog from '@/components/inventory/AddInventoryDialog';
import InventoryAIAssistant from '@/components/inventory/InventoryAIAssistant';
import ItemROIDialog from '@/components/inventory/ItemROIDialog';
import ExpenseCard from '@/components/expenses/ExpenseCard';
import AddExpenseDialog from '@/components/expenses/AddExpenseDialog';
import { toast } from 'sonner';

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'cost-desc', label: 'Highest Cost' },
  { value: 'cost-asc', label: 'Lowest Cost' },
  { value: 'name-asc', label: 'Name A-Z' },
];

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('cost-desc');
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();
  const handleRefresh = useCallback(() => queryClient.invalidateQueries(), [queryClient]);
  const { pullDistance, isRefreshing, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh(handleRefresh);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: itemsRaw, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.Inventory.list('-created_date', 500),
    initialData: [],
  });
  const items = Array.isArray(itemsRaw) ? itemsRaw : [];

  const { data: expensesRaw } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 500),
    initialData: [],
  });
  const expenses = Array.isArray(expensesRaw) ? expensesRaw : [];

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Inventory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item removed from inventory');
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense deleted');
    },
  });

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(item => 
        item.item_name?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(item => item.category === categoryFilter);
    }

    // Sort
    const [field, direction] = sortBy.split('-');
    result.sort((a, b) => {
      let aVal, bVal;
      if (field === 'date') {
        aVal = new Date(a.date_acquired || a.created_date);
        bVal = new Date(b.date_acquired || b.created_date);
      } else if (field === 'cost') {
        aVal = a.cost_basis || 0;
        bVal = b.cost_basis || 0;
      } else if (field === 'name') {
        aVal = a.item_name?.toLowerCase() || '';
        bVal = b.item_name?.toLowerCase() || '';
      }
      return direction === 'desc' ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
    });

    return result;
  }, [items, search, categoryFilter, sortBy]);

  const totalValue = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.cost_basis || 0) * (item.quantity || 1), 0);
  }, [items]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }, [expenses]);

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowAdd(true);
  };

  const handleCloseDialog = () => {
    setShowAdd(false);
    setEditingItem(null);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowAddExpense(true);
  };

  const handleCloseExpenseDialog = () => {
    setShowAddExpense(false);
    setEditingExpense(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="px-3 py-4 space-y-4 pb-20"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div className="flex justify-center pt-1" style={{ height: isRefreshing ? 32 : pullDistance * 0.45 }}>
          <div className={`w-5 h-5 border-2 border-primary border-t-transparent rounded-full ${isRefreshing ? 'animate-spin' : ''}`} />
        </div>
      )}
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-lg font-bold tracking-tight">Inventory</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {items.length} item{items.length !== 1 ? 's' : ''} · {formatCurrency(totalValue, user?.currency)} total value
        </p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="expenses">
            <Receipt className="w-4 h-4 mr-1.5" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="ai">
            <MessageSquare className="w-4 h-4 mr-1.5" />
            AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Button
            onClick={() => setShowAdd(true)}
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Item to Inventory
          </Button>

          {items.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No inventory yet"
              description="Start tracking items you own before they're sold."
            />
          ) : (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inventory..."
              className="pl-9 bg-card border-border"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-xs text-muted-foreground font-medium hover:text-foreground transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3 pb-2">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="bg-card border-border text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="cards">Cards</SelectItem>
                      <SelectItem value="sneakers">Sneakers</SelectItem>
                      <SelectItem value="clothing">Clothing</SelectItem>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="collectibles">Collectibles</SelectItem>
                      <SelectItem value="games">Games</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="bg-card border-border text-xs">
                      <ArrowUpDown className="w-3 h-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Inventory List */}
          <div className="space-y-3">
            <AnimatePresence>
              {filteredItems.map((item, i) => (
                <div key={item.id} onClick={() => setSelectedItem(item)}>
                  <InventoryCard
                    item={item}
                    index={i}
                    onEdit={handleEdit}
                    onDelete={(item) => deleteMutation.mutate(item.id)}
                  />
                </div>
              ))}
            </AnimatePresence>
            {filteredItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No items match your filters.
              </p>
            )}
          </div>
        </>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Button
            onClick={() => setShowAddExpense(true)}
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Business Expense
          </Button>

          {expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses tracked"
              description="Log overhead costs like shipping supplies, gas, and subscriptions to calculate true net profit."
            />
          ) : (
            <>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Overhead</p>
                <p className="text-2xl font-bold text-destructive">-{formatCurrency(totalExpenses, user?.currency)}</p>
                <p className="text-xs text-muted-foreground mt-1">{expenses.length} expense{expenses.length !== 1 ? 's' : ''} logged</p>
              </div>

              <div className="space-y-3">
                <AnimatePresence>
                  {expenses.map((expense, i) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      index={i}
                      onEdit={handleEditExpense}
                      onDelete={(exp) => deleteExpenseMutation.mutate(exp.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="ai">
          <InventoryAIAssistant />
        </TabsContent>
      </Tabs>

      <AddInventoryDialog
        open={showAdd}
        onClose={handleCloseDialog}
        editingItem={editingItem}
      />

      <ItemROIDialog
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        currency={user?.currency}
      />

      <AddExpenseDialog
        open={showAddExpense}
        onClose={handleCloseExpenseDialog}
        editingExpense={editingExpense}
      />
    </div>
  );
}
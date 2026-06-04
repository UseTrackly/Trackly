import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Package, Search, SlidersHorizontal, ArrowUpDown, MessageSquare, Receipt, History, TrendingUp, TrendingDown, Download, Lock, Crown } from 'lucide-react';
import FlipCard from '@/components/history/FlipCard';
import EditFlipDialog from '@/components/history/EditFlipDialog';
import StatCard from '@/components/shared/StatCard';
import ProfitChart from '@/components/dashboard/ProfitChart';
import PlatformChart from '@/components/dashboard/PlatformChart';
import ProAnalytics from '@/components/reports/ProAnalytics';
import { PLATFORMS } from '@/lib/platformFees';
import { format, subDays, isAfter } from 'date-fns';
import { canExport } from '@/lib/proGate';
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
  // History tab state
  const [editingFlip, setEditingFlip] = useState(null);
  const [histSearch, setHistSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [histSortBy, setHistSortBy] = useState('date-desc');
  const [showHistFilters, setShowHistFilters] = useState(false);
  const [histTab, setHistTab] = useState('history');
  const [range, setRange] = useState(3);
  const queryClient = useQueryClient();
  const scrollContainerRef = useRef(null);
  const handleRefresh = useCallback(() => queryClient.invalidateQueries(), [queryClient]);

  // Point pull-to-refresh at the actual scrollable <main> container
  React.useEffect(() => {
    scrollContainerRef.current = document.getElementById('main-content');
  }, []);

  const { pullDistance, isRefreshing, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh(handleRefresh, scrollContainerRef);

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

  const { data: flipsRaw } = useQuery({
    queryKey: ['flips'],
    queryFn: () => base44.entities.Flip.list('-created_date', 500),
    initialData: [],
  });
  const flips = Array.isArray(flipsRaw) ? flipsRaw : [];

  const deleteFlipMutation = useMutation({
    mutationFn: (id) => base44.entities.Flip.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flips'] });
      toast.success('Flip deleted');
    },
  });

  const editFlipMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Flip.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flips'] });
      toast.success('Flip updated');
    },
  });

  const DATE_RANGES = [
    { label: '7D', days: 7 },
    { label: '30D', days: 30 },
    { label: '90D', days: 90 },
    { label: 'All', days: null },
  ];

  const HIST_SORT_OPTIONS = [
    { value: 'date-desc', label: 'Newest First' },
    { value: 'date-asc', label: 'Oldest First' },
    { value: 'profit-desc', label: 'Highest Profit' },
    { value: 'profit-asc', label: 'Lowest Profit' },
    { value: 'roi-desc', label: 'Highest ROI' },
  ];

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

  const filteredFlips = useMemo(() => {
    let result = [...flips];
    if (histSearch) {
      const q = histSearch.toLowerCase();
      result = result.filter(f => f.item_name?.toLowerCase().includes(q));
    }
    if (platformFilter !== 'all') result = result.filter(f => f.platform === platformFilter);
    const [field, direction] = histSortBy.split('-');
    result.sort((a, b) => {
      let aVal, bVal;
      if (field === 'date') { aVal = new Date(a.date_sold || a.created_date); bVal = new Date(b.date_sold || b.created_date); }
      else if (field === 'profit') { aVal = a.net_profit || 0; bVal = b.net_profit || 0; }
      else if (field === 'roi') { aVal = a.roi || 0; bVal = b.roi || 0; }
      return direction === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return result;
  }, [flips, histSearch, platformFilter, histSortBy]);

  const rangeFlips = useMemo(() => {
    const days = DATE_RANGES[range].days;
    if (!days) return flips;
    const cutoff = subDays(new Date(), days);
    return flips.filter(f => {
      const date = f.date_sold || f.created_date;
      return date && isAfter(new Date(date), cutoff);
    });
  }, [flips, range]);

  const histStats = useMemo(() => {
    if (rangeFlips.length === 0) return null;
    const totalRevenue = rangeFlips.reduce((s, f) => s + (f.sale_price || 0), 0);
    const totalCost = rangeFlips.reduce((s, f) => s + (f.buy_price || 0), 0);
    const totalProfit = rangeFlips.reduce((s, f) => s + (f.net_profit || 0), 0);
    const avgRoi = rangeFlips.reduce((s, f) => s + (f.roi || 0), 0) / rangeFlips.length;
    const sorted = [...rangeFlips].sort((a, b) => (b.net_profit || 0) - (a.net_profit || 0));
    return { totalRevenue, totalCost, totalProfit, avgRoi, best: sorted[0], worst: sorted[sorted.length - 1] };
  }, [rangeFlips]);

  const exportCSV = () => {
    if (!canExport(user)) { toast.error('CSV export is a Pro feature. Upgrade to unlock!'); return; }
    const headers = ['Item Name', 'Category', 'Platform', 'Buy Price', 'Sale Price', 'Shipping', 'Platform Fee', 'Processing Fee', 'Net Profit', 'ROI %', 'Date Sold'];
    const rows = rangeFlips.map(f => [f.item_name, f.category, PLATFORMS[f.platform]?.name || f.platform, f.buy_price?.toFixed(2), f.sale_price?.toFixed(2), f.shipping_cost?.toFixed(2), f.platform_fee?.toFixed(2), f.processing_fee?.toFixed(2), f.net_profit?.toFixed(2), f.roi?.toFixed(1), f.date_sold || '']);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trackly-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
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
        <TabsList className="grid w-full grid-cols-4 bg-card border border-border">
          <TabsTrigger value="inventory">Items</TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-3.5 h-3.5 mr-1" />
            History
          </TabsTrigger>
          <TabsTrigger value="expenses">
            <Receipt className="w-3.5 h-3.5 mr-1" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="ai">
            <MessageSquare className="w-3.5 h-3.5 mr-1" />
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

        {/* ── History Tab ─────────────────────────────── */}
        <TabsContent value="history" className="space-y-4">
          {flips.length === 0 ? (
            <EmptyState icon={History} title="No flips yet" description="Save a flip from the calculator and it'll show up here." />
          ) : (
            <>
              <Tabs value={histTab} onValueChange={setHistTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 bg-card border border-border">
                  <TabsTrigger value="history">History</TabsTrigger>
                  <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="history" className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={histSearch} onChange={e => setHistSearch(e.target.value)} placeholder="Search flips..." className="pl-9 bg-card border-border" />
                  </div>
                  <button onClick={() => setShowHistFilters(!showHistFilters)} className="flex items-center gap-2 text-xs text-muted-foreground font-medium hover:text-foreground transition-colors">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    {showHistFilters ? 'Hide Filters' : 'Show Filters'}
                  </button>
                  <AnimatePresence>
                    {showHistFilters && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="grid grid-cols-2 gap-3 pb-2">
                          <Select value={platformFilter} onValueChange={setPlatformFilter}>
                            <SelectTrigger className="bg-card border-border text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Platforms</SelectItem>
                              {Object.entries(PLATFORMS).map(([key, p]) => (
                                <SelectItem key={key} value={key}>{p.icon} {p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={histSortBy} onValueChange={setHistSortBy}>
                            <SelectTrigger className="bg-card border-border text-xs"><ArrowUpDown className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {HIST_SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="space-y-3">
                    <AnimatePresence>
                      {filteredFlips.map((flip, i) => (
                        <div key={flip.id}>
                          <FlipCard flip={flip} index={i} currency={user?.currency} onDelete={f => deleteFlipMutation.mutate(f.id)} onEdit={f => setEditingFlip(f)} />
                        </div>
                      ))}
                    </AnimatePresence>
                    {filteredFlips.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No flips match your filters.</p>}
                  </div>
                </TabsContent>

                <TabsContent value="reports" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 flex-1 max-w-xs">
                      {DATE_RANGES.map((r, i) => (
                        <button key={r.label} onClick={() => setRange(i)} className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${range === i ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{r.label}</button>
                      ))}
                    </div>
                    {rangeFlips.length > 0 && (
                      <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs gap-1.5">
                        {canExport(user) ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                        Export
                      </Button>
                    )}
                  </div>
                  {histStats && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <StatCard label="Revenue" value={formatCurrency(histStats.totalRevenue, user?.currency)} delay={0} />
                        <StatCard label="Total Cost" value={formatCurrency(histStats.totalCost, user?.currency)} delay={0.05} />
                        <StatCard label="Net Profit" value={formatCurrency(histStats.totalProfit, user?.currency)} icon={histStats.totalProfit >= 0 ? TrendingUp : TrendingDown} delay={0.1} />
                        <StatCard label="Avg ROI" value={`${histStats.avgRoi.toFixed(1)}%`} delay={0.15} />
                      </div>
                      <ProfitChart flips={rangeFlips} />
                      <PlatformChart flips={rangeFlips} />
                      {user?.is_pro ? (
                        <ProAnalytics flips={rangeFlips} currency={user?.currency} />
                      ) : (
                        <div className="bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20 rounded-xl p-5 text-center space-y-2">
                          <Crown className="w-7 h-7 text-primary mx-auto" />
                          <p className="font-semibold text-sm">Advanced Analytics</p>
                          <p className="text-xs text-muted-foreground">Win rate, weekly trends, ROI distribution & more — Pro only.</p>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>
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
      <EditFlipDialog
        open={!!editingFlip}
        onClose={() => setEditingFlip(null)}
        onSave={(id, data) => editFlipMutation.mutateAsync({ id, data })}
        flip={editingFlip}
      />
    </div>
  );
}
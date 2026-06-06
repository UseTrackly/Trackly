import React, { useState, useMemo } from 'react';
import { usePageTab } from '@/lib/PageTabContext';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, RotateCcw, TrendingUp, TrendingDown, DollarSign, MessageSquare, Lock } from 'lucide-react';
import { formatCurrency } from '@/lib/currencyFormatter';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SaveFlipDialog from '@/components/calculator/SaveFlipDialog';
import AIAssistant from '@/components/ai/AIAssistant';
import CustomExpenses from '@/components/calculator/CustomExpenses';
import CasinoTracker from '@/components/calculator/CasinoTracker';
import SportsBetTracker from '@/components/calculator/SportsBetTracker';
import { calculateFlip, PLATFORMS } from '@/lib/platformFees';
import { canSaveFlip, countTodayFlips, FREE_LIMITS } from '@/lib/proGate';

export default function CalculatorPage() {
  const [activeTab, setActiveTab] = usePageTab('/calculator');

  const handleOpenCalculator = (flipData) => {
    setBuyPrice(flipData.buy_price || 0);
    setSalePrice(flipData.sale_price || 0);
    setPlatform(flipData.platform || 'ebay');
    setShippingCost(flipData.shipping_cost || 0);
    setActiveTab('calculator');
  };

  // Check for AI-provided data
  const aiData = React.useMemo(() => {
    const stored = sessionStorage.getItem('ai_flip_data');
    if (stored) {
      sessionStorage.removeItem('ai_flip_data');
      setActiveTab('calculator');
      return JSON.parse(stored);
    }
    return null;
  }, []);

  const [buyPrice, setBuyPrice] = useState(aiData?.buy_price || 0);
  const [salePrice, setSalePrice] = useState(aiData?.sale_price || 0);
  const [platform, setPlatform] = useState(aiData?.platform || 'ebay');
  const [shippingCost, setShippingCost] = useState(aiData?.shipping_cost || 0);
  const [customExpenses, setCustomExpenses] = useState([]);
  const [showSave, setShowSave] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: flipsRaw } = useQuery({
    queryKey: ['flips'],
    queryFn: () => base44.entities.Flip.list('-created_date', 500),
    initialData: [],
  });
  const flips = Array.isArray(flipsRaw) ? flipsRaw : [];

  const todayCount = countTodayFlips(flips);
  const flipAllowed = canSaveFlip(user, flips);

  const calculation = useMemo(() => {
    if (!salePrice) return null;
    const baseCalc = calculateFlip(buyPrice, salePrice, platform, shippingCost);
    const customTotal = customExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    return {
      ...baseCalc,
      customExpenses: customTotal,
      totalFees: baseCalc.totalFees + customTotal,
      netProfit: baseCalc.netProfit - customTotal,
      roi: buyPrice > 0 ? ((baseCalc.netProfit - customTotal) / buyPrice) * 100 : 0
    };
  }, [buyPrice, salePrice, platform, shippingCost, customExpenses]);

  const handleReset = () => {
    setBuyPrice(0);
    setSalePrice(0);
    setShippingCost(0);
    setCustomExpenses([]);
  };

  const handleSaveFlip = async (flipData) => {
    await base44.entities.Flip.create(flipData);
    queryClient.invalidateQueries({ queryKey: ['flips'] });
    toast.success('Flip saved to history');
  };

  const isProfitable = calculation?.netProfit > 0;

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3 pt-4 pb-3"
      >
        <h1 className="text-lg font-bold tracking-tight">Calculator</h1>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="hidden" />

        <TabsContent value="calculator" className="space-y-5 px-3 pb-24">
          <div className="flex items-center justify-end">
            <button
              onClick={handleReset}
              className="p-2.5 rounded-xl hover:bg-card border border-border transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-5 space-y-5"
      >
        {/* Platform Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Platform
          </label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="h-12 text-base bg-background">
              <div className="flex items-center gap-2">
                <span className="text-lg">{PLATFORMS[platform]?.icon}</span>
                <span className="font-medium">{PLATFORMS[platform]?.name}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PLATFORMS).map(([key, p]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{p.icon}</span>
                    <span>{p.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price Inputs - Side by Side */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Buy Price
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="number"
                value={buyPrice || ''}
                onChange={(e) => setBuyPrice(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full h-12 bg-background border border-border rounded-xl pl-10 pr-4 text-base font-semibold placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                style={{ fontSize: 16 }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Sale Price
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="number"
                value={salePrice || ''}
                onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full h-12 bg-background border border-border rounded-xl pl-10 pr-4 text-base font-semibold placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                style={{ fontSize: 16 }}
              />
            </div>
          </div>
        </div>

        {/* Shipping */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Shipping Cost (Optional)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
            type="number"
            value={shippingCost || ''}
            onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="w-full h-12 bg-background border border-border rounded-xl pl-10 pr-4 text-base font-semibold placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            style={{ fontSize: 16 }}
            />
          </div>
        </div>

        {/* Custom Expenses */}
        <CustomExpenses expenses={customExpenses} onChange={setCustomExpenses} />
      </motion.div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {calculation && calculation.salePrice > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Big Profit Display */}
            <div className={`rounded-2xl p-6 border-2 ${
              isProfitable 
                ? 'bg-primary/5 border-primary/30' 
                : 'bg-destructive/5 border-destructive/30'
            }`}>
              <div className="text-center space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Your Profit
                </p>
                <div className="flex items-center justify-center gap-2">
                  {isProfitable ? (
                    <TrendingUp className="w-6 h-6 text-primary" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-destructive" />
                  )}
                  <p className={`text-4xl font-bold tracking-tight ${
                    isProfitable ? 'text-primary' : 'text-destructive'
                  }`}>
                    {isProfitable ? '+' : ''}{formatCurrency(calculation.netProfit, user?.currency)}
                  </p>
                </div>
                <p className={`text-sm font-semibold ${
                  isProfitable ? 'text-primary' : 'text-destructive'
                }`}>
                  {isProfitable ? '+' : ''}{calculation.roi.toFixed(1)}% ROI
                </p>
              </div>
            </div>

            {/* Fee Breakdown */}
            {calculation.feeDetails && calculation.feeDetails.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Fee Breakdown
                </h3>
                <div className="space-y-2">
                  {calculation.feeDetails.map((fee, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{fee.name}</span>
                      <span className="font-medium text-destructive">
                        -{formatCurrency(fee.amount, user?.currency)}
                      </span>
                    </div>
                  ))}
                  {shippingCost > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="font-medium text-destructive">
                        -{formatCurrency(shippingCost, user?.currency)}
                      </span>
                    </div>
                  )}
                  {customExpenses.map((exp, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{exp.label || 'Custom'}</span>
                      <span className="font-medium text-destructive">
                        -{formatCurrency(exp.amount || 0, user?.currency)}
                      </span>
                    </div>
                  ))}
                  <div className="h-px bg-border my-2" />
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="text-foreground">Total Fees</span>
                    <span className="text-destructive">
                      -{formatCurrency(calculation.totalFees, user?.currency)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            {flipAllowed ? (
              <Button
                onClick={() => setShowSave(true)}
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 rounded-xl"
              >
                <Save className="w-4 h-4 mr-2" />
                Save This Flip
              </Button>
            ) : (
              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold">Daily limit reached</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Free plan: {FREE_LIMITS.flips_per_day} flips/day. Upgrade to Pro for unlimited tracking.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

        </TabsContent>

        <TabsContent value="casino" className="px-3 pb-24">
          <CasinoTracker user={user} />
        </TabsContent>

        <TabsContent value="sports" className="px-3 pb-24">
          <SportsBetTracker user={user} />
        </TabsContent>

        <TabsContent value="ai" className="px-3 pb-24">
          <AIAssistant onOpenCalculator={handleOpenCalculator} />
        </TabsContent>
      </Tabs>

      <SaveFlipDialog
        open={showSave}
        onClose={() => setShowSave(false)}
        onSave={handleSaveFlip}
        calculation={calculation || {}}
        platform={platform}
        customExpenses={customExpenses}
      />
    </div>
  );
}
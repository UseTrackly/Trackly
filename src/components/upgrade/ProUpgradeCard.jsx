import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check, Crown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/lib/currencyFormatter';
import { isIOSApp } from '@/lib/platformDetect';
import { purchasePlan, restorePurchases, getAppUserID, loadProducts } from '@/lib/iap';
import { toast } from 'sonner';

// RC public (publishable) SDK key — safe to ship in client code.
// This is NOT a secret key; it cannot read subscriber data or make server-side changes.
const RC_API_KEY = 'appl_LvOdjdFZAxsdbnWOzMlhPVyCOyZ';

const PRO_FEATURES = [
  'Unlimited flips tracking',
  'Advanced analytics & reports',
  'Custom expense categories',
  'Priority AI assistant',
  'Custom backgrounds',
  'Export to CSV/PDF',

];

export default function ProUpgradeCard({ compact = false }) {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });
  const queryClient = useQueryClient();
  const [purchasing, setPurchasing] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [rcDebug, setRcDebug] = useState([]);

  const onIOS = isIOSApp();

  // On iOS, probe RevenueCat offerings on mount and log everything
  useEffect(() => {
    if (!onIOS) return;
    const lines = [];
    const log = (msg) => {
      console.log('[RC-DEBUG]', msg);
      lines.push(msg);
    };

    (async () => {
      log(`Platform: ${window?.Capacitor?.getPlatform?.() ?? 'unknown'}`);
      log(`RC plugin present: ${!!(window?.Capacitor?.Plugins?.Purchases)}`);
      log(`RC API key: ${RC_API_KEY.substring(0, 20)}...`);

      try {
        // Wait briefly for AuthContext to initialize RC with the real userId
        await new Promise(r => setTimeout(r, 1500));

        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        const { offerings } = await Purchases.getOfferings();
        const allKeys = Object.keys(offerings?.all || {});
        log(`Offering keys: [${allKeys.join(', ') || 'none'}]`);
        log(`Current offering: ${offerings?.current?.identifier ?? 'null'}`);
        log(`Current pkg count: ${offerings?.current?.availablePackages?.length ?? 0}`);

        const packages = await loadProducts();
        log(`Total packages loaded: ${packages.length}`);
        if (packages.length === 0) {
          log('⚠️ No packages — verify products exist in App Store Connect & RC dashboard');
        } else {
          packages.forEach((pkg, i) => {
            log(`[${i}] type=${pkg.packageType} id=${pkg.identifier} productId=${pkg.product?.productIdentifier} price=${pkg.product?.priceString}`);
          });
        }
      } catch (err) {
        log(`❌ loadProducts error: ${err?.message} (code: ${err?.code ?? 'n/a'})`);
      }

      setRcDebug([...lines]);
    })();
  }, [onIOS]);

  if (user?.is_pro) return null;

  const handleIOSPurchase = async (plan) => {
    console.log(`[RC-DEBUG] Tapped plan: ${plan}`);
    console.log(`[RC-DEBUG] RC plugin present: ${!!(window?.Capacitor?.Plugins?.Purchases)}`);
    setPurchasing(plan);
    try {
      const appUserID = await purchasePlan(plan);
      console.log(`[RC-DEBUG] Purchase success, appUserID: ${appUserID}`);
      const res = await base44.functions.invoke('verifyAppleIAP', { appUserID, plan });
      if (res.data?.error) throw new Error(res.data.error);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Welcome to Pro! 🎉');
    } catch (err) {
      const msg = err.message || '';
      console.log(`[RC-DEBUG] Purchase error: ${msg} | code: ${err?.code ?? 'n/a'}`);
      if (msg.toLowerCase().includes('cancel') || msg.includes('1')) return;
      toast.error(msg || 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const customerInfo = await restorePurchases();
      if (!customerInfo) { toast.error('No previous purchases found'); return; }
      const appUserID = await getAppUserID();
      const res = await base44.functions.invoke('verifyAppleIAP', { appUserID, plan: 'restore' });
      if (res.data?.error) throw new Error(res.data.error);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Purchase restored!');
    } catch (err) {
      toast.error(err.message || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  };

  const handleUpgrade = (plan) => {
    if (onIOS) {
      handleIOSPurchase(plan);
      return;
    }
    const STRIPE_LINKS = {
      monthly: 'https://buy.stripe.com/fZu6oA4CVdaZ47N35K2ZO00',
      yearly: 'https://buy.stripe.com/eVqcMY3yR1sheMrayc2ZO02',
      lifetime: 'https://buy.stripe.com/fZu8wIglDdaZ9s77m02ZO01',
    };
    window.open(STRIPE_LINKS[plan], '_blank');
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-2 border-primary/30 rounded-xl p-4"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm mb-1">Upgrade to Pro</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Unlock advanced features and unlimited tracking
            </p>
            <div className="flex gap-1.5">
                <Button
                  size="sm"
                  onClick={() => handleUpgrade('monthly')}
                  disabled={!!purchasing}
                  variant="outline"
                  className="text-[11px] h-7 px-2"
                >
                  {purchasing === 'monthly' ? '...' : `${formatCurrency(10, user?.currency, true)}/mo`}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleUpgrade('yearly')}
                  disabled={!!purchasing}
                  variant="outline"
                  className="text-[11px] h-7 px-2 border-primary/50 text-primary"
                >
                  {purchasing === 'yearly' ? '...' : `${formatCurrency(100, user?.currency, true)}/yr`}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleUpgrade('lifetime')}
                  disabled={!!purchasing}
                  className="bg-primary hover:bg-primary/90 text-[11px] h-7 px-2"
                >
                  {purchasing === 'lifetime' ? '...' : `${formatCurrency(200, user?.currency, true)} Life`}
                </Button>
              </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-2 border-primary/30 rounded-xl p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/20">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Go Pro</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Take your reselling to the next level with premium features
      </p>

      <div className="space-y-2 mb-6">
        {PRO_FEATURES.map((feature, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-primary shrink-0" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
          <button
             onClick={() => handleUpgrade('monthly')}
             disabled={!!purchasing}
             className="p-3 rounded-xl border-2 border-border hover:border-primary/50 transition-all bg-card disabled:opacity-60"
           >
             <p className="text-[10px] text-muted-foreground mb-1">Monthly</p>
             <p className="text-base font-bold">{purchasing === 'monthly' ? '...' : formatCurrency(10, user?.currency, true)}</p>
             <p className="text-[10px] text-muted-foreground mt-0.5">/month</p>
             <p className="text-[9px] text-primary font-semibold mt-1.5">7-day trial</p>
           </button>
           <button
             onClick={() => handleUpgrade('yearly')}
             disabled={!!purchasing}
             className="p-3 rounded-xl border-2 border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all relative overflow-hidden disabled:opacity-60"
           >
             <div className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded-full bg-primary/20 text-primary text-[8px] font-bold">
               -17%
             </div>
             <p className="text-[10px] text-muted-foreground mb-1">Yearly</p>
             <p className="text-base font-bold text-primary">{purchasing === 'yearly' ? '...' : formatCurrency(100, user?.currency, true)}</p>
             <p className="text-[10px] text-muted-foreground mt-0.5">/year</p>
             <p className="text-[9px] text-primary font-semibold mt-1.5">2 mo. free</p>
           </button>
           <button
             onClick={() => handleUpgrade('lifetime')}
             disabled={!!purchasing}
             className="p-3 rounded-xl border-2 border-border hover:border-primary/50 transition-all bg-card relative overflow-hidden disabled:opacity-60"
           >
             <div className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold">
               BEST
             </div>
             <p className="text-[10px] text-muted-foreground mb-1">Lifetime</p>
             <p className="text-base font-bold">{purchasing === 'lifetime' ? '...' : formatCurrency(200, user?.currency, true)}</p>
             <p className="text-[10px] text-muted-foreground mt-0.5">one-time</p>
             <p className="text-[9px] text-muted-foreground mt-1.5">Forever</p>
           </button>
        </div>

        {onIOS && (
          <button
            onClick={handleRestore}
            disabled={restoring}
            className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <RotateCcw className="w-3 h-3" />
            {restoring ? 'Restoring...' : 'Restore Purchases'}
          </button>
        )}

        {/* RevenueCat debug panel — visible in TestFlight builds */}
        {onIOS && rcDebug.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-black/60 border border-yellow-500/40">
            <p className="text-[10px] font-bold text-yellow-400 mb-1">RC DEBUG</p>
            {rcDebug.map((line, i) => (
              <p key={i} className="text-[9px] text-yellow-200 font-mono leading-4 break-all">{line}</p>
            ))}
          </div>
        )}
    </motion.div>
  );
}
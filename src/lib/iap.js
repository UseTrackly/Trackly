/**
 * In-App Purchase bridge using @revenuecat/purchases-capacitor
 * Falls back gracefully if the plugin isn't available (web).
 */

export const PRODUCT_IDS = {
  monthly: 'trackly.pro.monthly',
  yearly: 'trackly.pro.yearly',
  lifetime: 'trackly.pro.lifetime',
};

function getPlugin() {
  const plugins = window?.Capacitor?.Plugins ?? {};
  // Try all known RevenueCat plugin registration names
  const plugin = plugins.PurchasesPlugin ?? plugins.Purchases ?? plugins.RevenueCat ?? null;
  if (!plugin) {
    console.warn('[IAP] RevenueCat plugin not found. Available plugins:', Object.keys(plugins));
  }
  return plugin;
}

/**
 * Initialize RevenueCat — call this once on app start (inside native only)
 */
export async function initRevenueCat(apiKey, userId) {
  const plugin = getPlugin();
  if (!plugin) return;
  await plugin.configure({ apiKey, appUserID: userId });
}

/**
 * Load offerings from RevenueCat
 */
export async function loadProducts() {
  const plugin = getPlugin();
  if (!plugin) throw new Error('IAP plugin not available');
  const { offerings } = await plugin.getOfferings();
  return offerings?.current?.availablePackages ?? [];
}

// RevenueCat package type identifiers
const PACKAGE_TYPES = {
  monthly: '$rc_monthly',
  yearly: '$rc_annual',
  lifetime: '$rc_lifetime',
};

/**
 * Initiate a purchase for a given plan ('monthly' | 'yearly' | 'lifetime')
 * Returns the appUserID so the backend can verify via RevenueCat REST API
 */
export async function purchasePlan(plan) {
  const plugin = getPlugin();
  if (!plugin) throw new Error('IAP plugin not available');

  // Get current offerings
  const { offerings } = await plugin.getOfferings();

  // Log raw offerings for debugging
  console.log('[IAP] Raw offerings keys:', JSON.stringify(Object.keys(offerings ?? {})));
  console.log('[IAP] Current offering:', JSON.stringify(offerings?.current));

  // The RC Capacitor plugin may return packages nested differently
  // Try current.availablePackages first, then flatten all offerings
  let packages = offerings?.current?.availablePackages ?? [];
  if (packages.length === 0 && offerings?.all) {
    packages = Object.values(offerings.all).flatMap(o =>
      Object.values(o).filter(p => p && typeof p === 'object' && p.packageType)
    );
  }

  // Log available packages for debugging
  console.log('[IAP] Available packages:', JSON.stringify(packages.map(p => ({
    id: p.packageType ?? p.identifier,
    productId: p.product?.productIdentifier,
  }))));

  // Try matching by package type first, then by product identifier
  const productIdentifier = PRODUCT_IDS[plan];
  const packageType = PACKAGE_TYPES[plan];

  let pkg = packages.find(p =>
    p.packageType === packageType || p.identifier === packageType
  );

  // Fallback: match by product identifier (full or suffix)
  if (!pkg) {
    pkg = packages.find(p =>
      p.product?.productIdentifier === productIdentifier ||
      p.product?.productIdentifier?.endsWith(`.${plan}`)
    );
  }

  if (!pkg) throw new Error(`Product not found in offerings: ${productIdentifier}. Available: ${packages.map(p => p.product?.productIdentifier).join(', ')}`);

  // Use purchasePackage (RevenueCat v11+ API)
  const { customerInfo } = await plugin.purchasePackage({ aPackage: pkg });

  if (!customerInfo) throw new Error('Purchase failed or was cancelled');

  const { appUserID } = await plugin.getAppUserID();
  return appUserID;
}

/**
 * Restore previous purchases — returns customerInfo
 */
export async function restorePurchases() {
  const plugin = getPlugin();
  if (!plugin) throw new Error('IAP plugin not available');
  const { customerInfo } = await plugin.restorePurchases();
  return customerInfo;
}
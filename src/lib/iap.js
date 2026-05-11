/**
 * In-App Purchase bridge using @revenuecat/purchases-capacitor
 * Falls back gracefully if the plugin isn't available (web).
 */
import { Purchases } from '@revenuecat/purchases-capacitor';

export const PRODUCT_IDS = {
  monthly: 'trackly.pro.monthly',
  yearly: 'trackly.pro.yearly',
  lifetime: 'trackly.pro.lifetime',
};

const isNative = () => !!(window?.Capacitor?.isNativePlatform?.());

function getPlugin() {
  // Only use IAP on native — RevenueCat throws "not implemented on web" otherwise
  if (!isNative()) return null;
  // Use the directly imported Purchases plugin (self-registers on native bridge)
  if (Purchases) return Purchases;
  // Fallback to Capacitor.Plugins registry
  const plugins = window?.Capacitor?.Plugins ?? {};
  const plugin = plugins.Purchases ?? plugins.PurchasesPlugin ?? null;
  if (!plugin) {
    console.warn('[IAP] RevenueCat plugin not found. Available plugins:', Object.keys(plugins));
  }
  return plugin;
}

/**
 * Poll for the plugin up to ~1s — fail fast if unavailable.
 */
async function waitForPlugin(timeoutMs = 1000) {
  const interval = 50;
  let elapsed = 0;
  while (elapsed < timeoutMs) {
    const p = getPlugin();
    if (p) return p;
    await new Promise(r => setTimeout(r, interval));
    elapsed += interval;
  }
  return null;
}

let _rcConfigured = false;

/**
 * Ensure RevenueCat is configured before any purchase call.
 * Safe to call multiple times — only configures once.
 */
async function ensureConfigured() {
  const plugin = await waitForPlugin();
  if (!plugin) {
    throw new Error('In-App Purchases not available. Please ensure the app is running on a physical iOS device with App Store configured.');
  }
  if (_rcConfigured) return plugin;
  // Re-configure with stored key/userId in case initRevenueCat ran before user loaded
  const apiKey = 'appl_LvOdjdFZAxsdbnWOzMlhPVyCOyZ';
  try {
    // getAppUserID throws if not configured yet
    await plugin.getAppUserID();
    _rcConfigured = true;
  } catch {
    // Not configured — configure now
    await plugin.configure({ apiKey });
    _rcConfigured = true;
  }
  return plugin;
}

/**
 * Initialize RevenueCat — call this once on app start (inside native only)
 * Wrapped in a 3s timeout so it never blocks the auth flow.
 */
export async function initRevenueCat(apiKey, userId) {
  const plugin = await waitForPlugin(3000);
  if (!plugin) { console.warn('[IAP] initRevenueCat: plugin not found after 3s'); return; }
  try {
    await Promise.race([
      plugin.configure({ apiKey, appUserID: userId }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('RevenueCat init timeout')), 3000)),
    ]);
    _rcConfigured = true;
  } catch (e) {
    console.warn('[IAP] initRevenueCat failed or timed out:', e?.message);
  }
}

/**
 * Load offerings from RevenueCat
 */
export async function loadProducts() {
  const plugin = await ensureConfigured();
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
  const plugin = await ensureConfigured();

  // Get current offerings — fail fast if none available
  const { offerings } = await plugin.getOfferings();

  let packages = offerings?.current?.availablePackages ?? [];
  if (packages.length === 0 && offerings?.all) {
    packages = Object.values(offerings.all).flatMap(o =>
      Object.values(o).filter(p => p && typeof p === 'object' && p.packageType)
    );
  }

  if (packages.length === 0) {
    throw new Error('No products available. Please ensure you are signed into the App Store and try again.');
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
  const plugin = await ensureConfigured();
  const { customerInfo } = await plugin.restorePurchases();
  return customerInfo;
}
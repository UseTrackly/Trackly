/**
 * In-App Purchase bridge using @revenuecat/purchases-capacitor
 * Falls back gracefully if the plugin isn't available (web).
 */
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

export const PRODUCT_IDS = {
  monthly: 'trackly.pro.monthly',
  yearly: 'trackly.pro.yearly',
  lifetime: 'trackly.pro.lifetime',
};

const isNative = () => !!(window?.Capacitor?.isNativePlatform?.());

// RevenueCat package type identifiers
const PACKAGE_TYPES = {
  monthly: '$rc_monthly',
  yearly: '$rc_annual',
  lifetime: '$rc_lifetime',
};

let _rcConfigured = false;

/**
 * Initialize RevenueCat — call once on app start (native only).
 * Safe to call multiple times.
 */
export async function initRevenueCat(apiKey, userId) {
  if (!isNative()) return;
  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({ apiKey, appUserID: userId });
    _rcConfigured = true;
    console.log('[IAP] RevenueCat configured for user:', userId);
  } catch (e) {
    console.warn('[IAP] initRevenueCat failed:', e?.message);
  }
}

/**
 * Ensure RevenueCat is configured. Throws if not on native.
 */
async function ensureConfigured() {
  if (!isNative()) {
    throw new Error('In-App Purchases are only available on iOS.');
  }
  if (!_rcConfigured) {
    // Configure without userId — will be anonymous
    const apiKey = 'appl_LvOdjdFZAxsdbnWOzMlhPVyCOyZ';
    await Purchases.configure({ apiKey });
    _rcConfigured = true;
  }
}

/**
 * Load available packages from RevenueCat offerings.
 */
export async function loadProducts() {
  await ensureConfigured();
  const { offerings } = await Purchases.getOfferings();
  return offerings?.current?.availablePackages ?? [];
}

/**
 * Purchase a plan ('monthly' | 'yearly' | 'lifetime').
 * Returns the RevenueCat appUserID for server-side verification.
 */
export async function purchasePlan(plan) {
  await ensureConfigured();

  const { offerings } = await Purchases.getOfferings();
  let packages = offerings?.current?.availablePackages ?? [];

  // Fallback: collect from all offerings
  if (packages.length === 0 && offerings?.all) {
    packages = Object.values(offerings.all).flatMap(o =>
      (o.availablePackages ?? [])
    );
  }

  if (packages.length === 0) {
    throw new Error('No products available. Make sure you are signed into the App Store.');
  }

  console.log('[IAP] Available packages:', packages.map(p => ({
    type: p.packageType,
    id: p.product?.productIdentifier,
  })));

  const packageType = PACKAGE_TYPES[plan];
  const productId = PRODUCT_IDS[plan];

  // Match by package type, then by product identifier
  let pkg = packages.find(p => p.packageType === packageType || p.identifier === packageType);
  if (!pkg) {
    pkg = packages.find(p =>
      p.product?.productIdentifier === productId ||
      p.product?.productIdentifier?.endsWith(`.${plan}`)
    );
  }

  if (!pkg) {
    throw new Error(`Product "${productId}" not found. Available: ${packages.map(p => p.product?.productIdentifier).join(', ')}`);
  }

  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });

  if (!customerInfo) throw new Error('Purchase failed or was cancelled.');

  const { appUserID } = await Purchases.getAppUserID();
  return appUserID;
}

/**
 * Restore previous purchases.
 */
export async function restorePurchases() {
  await ensureConfigured();
  const { customerInfo } = await Purchases.restorePurchases();
  return customerInfo;
}

/**
 * Get the current RevenueCat app user ID.
 */
export async function getAppUserID() {
  await ensureConfigured();
  const { appUserID } = await Purchases.getAppUserID();
  return appUserID;
}
/**
 * In-App Purchase bridge using @revenuecat/purchases-capacitor
 *
 * The error "Purchases plugin is not implemented on iOS" means the native
 * plugin wasn't linked into the Xcode build. We guard every call with
 * isPluginAvailable() so the app never crashes — it throws a clear message
 * instead. After running `npx cap sync ios` and rebuilding the Xcode project
 * the plugin will be available and these calls will work.
 */
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

export const PRODUCT_IDS = {
  monthly: 'trackly.pro.monthly',
  yearly: 'trackly.pro.yearly',
  lifetime: 'trackly.pro.lifetime',
};

const PACKAGE_TYPES = {
  monthly: '$rc_monthly',
  yearly: '$rc_annual',
  lifetime: '$rc_lifetime',
};

let _rcConfigured = false;
let _rcUserId = null;

const isNative = () => !!(window?.Capacitor?.isNativePlatform?.());

/**
 * Returns true only if the RevenueCat native plugin is actually registered.
 */
const isPluginAvailable = () => {
  if (!isNative()) return false;
  return !!(window?.Capacitor?.Plugins?.Purchases);
};

/**
 * Initialize RevenueCat — call once on app start (native only).
 * Re-configures if called with a new userId (e.g. after login).
 */
export async function initRevenueCat(apiKey, userId) {
  if (!isPluginAvailable()) {
    console.warn('[IAP] RevenueCat plugin not available — skipping init. Run `npx cap sync ios` and rebuild.');
    return;
  }
  // Re-configure if we now have a real userId and previously didn't (or it changed)
  if (_rcConfigured && _rcUserId === userId) return;
  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({ apiKey, appUserID: userId || undefined });
    _rcConfigured = true;
    _rcUserId = userId;
    console.log('[IAP] RevenueCat configured for user:', userId);
  } catch (e) {
    console.warn('[IAP] initRevenueCat failed:', e?.message);
  }
}

/**
 * Ensure the plugin is available and configured. Throws with actionable messages.
 * Waits up to 3s for initRevenueCat to be called by AuthContext first.
 */
async function ensureReady() {
  if (!isNative()) {
    throw new Error('In-App Purchases are only available on iOS.');
  }
  if (!isPluginAvailable()) {
    throw new Error(
      'The RevenueCat plugin is not linked in this build.\n' +
      'Run: npx cap sync ios\n' +
      'Then rebuild in Xcode.'
    );
  }
  // Wait for initRevenueCat to be called by AuthContext (with a real userId)
  if (!_rcConfigured) {
    console.log('[IAP] Waiting for RC to be configured by AuthContext...');
    await new Promise((resolve) => {
      const start = Date.now();
      const check = setInterval(() => {
        if (_rcConfigured || Date.now() - start > 3000) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
  }
  // Fallback: if still not configured after wait, configure anonymously
  if (!_rcConfigured) {
    const apiKey = 'appl_LvOdjdFZAxsdbnWOzMlhPVyCOyZ';
    console.log('[IAP] Fallback: configuring RC anonymously');
    await Purchases.configure({ apiKey });
    _rcConfigured = true;
  }
}

/**
 * Load available packages from RevenueCat offerings.
 */
export async function loadProducts() {
  await ensureReady();
  console.log('[IAP] Fetching offerings from RevenueCat...');
  const { offerings } = await Purchases.getOfferings();
  console.log('[IAP] Offerings received:', JSON.stringify(offerings, null, 2));

  // Try current first, then explicit 'default', then all offerings
  let packages = offerings?.current?.availablePackages ?? [];

  if (packages.length === 0 && offerings?.all?.default) {
    console.log('[IAP] current is empty, using default offering');
    packages = offerings.all.default.availablePackages ?? [];
  }

  if (packages.length === 0 && offerings?.all) {
    const allKeys = Object.keys(offerings.all);
    console.log('[IAP] Falling back to all offerings:', allKeys);
    packages = allKeys.flatMap(key => offerings.all[key].availablePackages ?? []);
  }

  console.log('[IAP] Total packages found:', packages.length);
  packages.forEach((pkg, i) => {
    console.log(`[IAP] Package[${i}]:`, {
      type: pkg.packageType,
      identifier: pkg.identifier,
      productId: pkg.product?.productIdentifier,
      title: pkg.product?.title,
      price: pkg.product?.priceString,
    });
  });

  return packages;
}

/**
 * Purchase a plan ('monthly' | 'yearly' | 'lifetime').
 * Returns the RevenueCat appUserID for server-side verification.
 */
export async function purchasePlan(plan) {
  await ensureReady();

  const { offerings } = await Purchases.getOfferings();
  let packages = offerings?.current?.availablePackages ?? [];

  if (packages.length === 0 && offerings?.all?.default) {
    packages = offerings.all.default.availablePackages ?? [];
  }

  if (packages.length === 0 && offerings?.all) {
    packages = Object.values(offerings.all).flatMap(o => o.availablePackages ?? []);
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

  let pkg = packages.find(p => p.packageType === packageType || p.identifier === packageType);
  if (!pkg) {
    pkg = packages.find(p =>
      p.product?.productIdentifier === productId ||
      p.product?.productIdentifier?.endsWith(`.${plan}`)
    );
  }

  if (!pkg) {
    throw new Error(
      `Product "${productId}" not found.\n` +
      `Available: ${packages.map(p => p.product?.productIdentifier).join(', ')}`
    );
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
  await ensureReady();
  const { customerInfo } = await Purchases.restorePurchases();
  return customerInfo;
}

/**
 * Get the current RevenueCat app user ID.
 */
export async function getAppUserID() {
  await ensureReady();
  const { appUserID } = await Purchases.getAppUserID();
  return appUserID;
}
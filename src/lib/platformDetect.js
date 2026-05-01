/**
 * Detects if the app is running on an iOS/iPadOS device.
 * Apple 3.1.1 prohibits linking to external payment providers (Stripe) for
 * digital goods purchases on ANY iOS device — IAP must be used instead.
 * We cast a wide net: any iOS/iPadOS signal forces IAP.
 */
export function isIOSApp() {
  const ua = navigator.userAgent || '';
  // Any iOS/iPadOS device — includes Safari, WKWebView, Capacitor, TestFlight
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ reports as Macintosh but has touch support
  const isIPadOS = (navigator.platform === 'MacIntel' || navigator.platform === 'iPad') && navigator.maxTouchPoints > 1;
  // Explicit native flags
  const hasNativeFlag = ua.includes('TracklyNative') || ua.includes('TracklyiOS');
  // Detect RevenueCat Purchases plugin (try all known names)
  const plugins = window?.Capacitor?.Plugins ?? {};
  const hasIAPPlugin = !!(plugins.PurchasesPlugin ?? plugins.Purchases ?? plugins.RevenueCat);
  // Detect if running inside any Capacitor native context
  const isCapacitorNative = window?.Capacitor?.isNativePlatform?.() === true;
  // Detect WKWebView (used by all iOS native apps including TestFlight & App Store review)
  const isWKWebView = !!(window.webkit?.messageHandlers);
  return isIOS || isIPadOS || hasNativeFlag || hasIAPPlugin || isCapacitorNative || isWKWebView;
}

export function isAndroidApp() {
  const ua = navigator.userAgent || '';
  return /android/i.test(ua) && (ua.includes('TracklyNative') || ua.includes('wv'));
}
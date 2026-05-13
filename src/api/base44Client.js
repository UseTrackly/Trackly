import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, functionsVersion, appBaseUrl } = appParams;

const HARDCODED_APP_ID = '69bfd92e3db7d48eec6c8062';
const TOKEN_KEY = 'base44_access_token';

// ─── Native-safe storage ─────────────────────────────────────────────────────
// On iOS Capacitor, WKWebView can silently wipe localStorage under memory
// pressure. Capacitor Preferences uses native NSUserDefaults which persists
// reliably. We import lazily so the web build is unaffected.

const isNative = () => !!(window?.Capacitor?.isNativePlatform?.());

export const nativeStorage = {
  async get() {
    if (isNative()) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const { value } = await Preferences.get({ key: TOKEN_KEY });
        return value || null;
      } catch { /* fall through */ }
    }
    return localStorage.getItem(TOKEN_KEY) || appParams.token || null;
  },
  async set(token) {
    // Always write to localStorage (web / fallback)
    localStorage.setItem(TOKEN_KEY, token);
    try { sessionStorage.setItem(TOKEN_KEY, token); } catch {}
    if (isNative()) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.set({ key: TOKEN_KEY, value: token });
      } catch {}
    }
  },
  async remove() {
    localStorage.removeItem(TOKEN_KEY);
    try { sessionStorage.removeItem(TOKEN_KEY); } catch {}
    if (isNative()) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.remove({ key: TOKEN_KEY });
      } catch {}
    }
  },
};

// Synchronous fallback for SDK init (Preferences is async, localStorage is sync)
const getTokenSync = () =>
  localStorage.getItem(TOKEN_KEY) || appParams.token || null;

export const base44 = createClient({
  appId: appId || HARDCODED_APP_ID,
  token: getTokenSync(),
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl,
});

/**
 * Called after login — persists the token to ALL storage layers and pushes it
 * into the live SDK client so all subsequent calls carry the correct header.
 */
export const reinitializeBase44Token = async (token) => {
  if (!token) return;
  await nativeStorage.set(token);
  base44.auth.setToken(token, false);
};

/**
 * Reads the latest token from the best available storage and injects it into
 * the SDK client. Must be awaited before any authenticated operation.
 */
export const ensureTokenSynced = async () => {
  const token = await nativeStorage.get();
  if (token) {
    base44.auth.setToken(token, false);
  }
  return token;
};
import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, functionsVersion, appBaseUrl } = appParams;

const HARDCODED_APP_ID = '69bfd92e3db7d48eec6c8062';

const getToken = () =>
  localStorage.getItem('base44_access_token') || appParams.token || null;

export const base44 = createClient({
  appId: appId || HARDCODED_APP_ID,
  token: getToken(),
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

/**
 * Called after login — persists the token to localStorage AND pushes it
 * into the live SDK client via base44.auth.setToken() so all subsequent
 * entity/integration/auth calls carry the correct Authorization header.
 */
export const reinitializeBase44Token = (token) => {
  if (!token) return;
  localStorage.setItem('base44_access_token', token);
  // base44.auth.setToken is the correct API (not base44.setToken)
  base44.auth.setToken(token, false); // false = don't double-save to storage
};

/**
 * Reads the latest token from localStorage and pushes it into the SDK client.
 * Call this before any authenticated operation (profile save, file upload, etc.)
 * to guard against the Capacitor singleton being stale after a native login.
 */
export const ensureTokenSynced = () => {
  const token = getToken();
  if (token) {
    base44.auth.setToken(token, false);
  }
};
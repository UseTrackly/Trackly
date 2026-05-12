import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, functionsVersion, appBaseUrl } = appParams;

const HARDCODED_APP_ID = '69bfd92e3db7d48eec6c8062';

// Always read the latest token from localStorage so the singleton client
// stays authenticated even after a native login that happened post-init.
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

// Called after login — persists token and updates the SDK client.
export const reinitializeBase44Token = (token) => {
  if (!token) return;
  localStorage.setItem('base44_access_token', token);
  if (base44.setToken) {
    base44.setToken(token);
  }
};

// Call before any authenticated SDK operation to ensure the client
// always carries the latest stored token (critical for Capacitor native builds).
export const ensureTokenSynced = () => {
  const token = getToken();
  if (token && base44.setToken) {
    base44.setToken(token);
  }
};
import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, functionsVersion, appBaseUrl } = appParams;

// Hardcode the app ID as a fallback - it's a public value, not a secret.
// This ensures the Capacitor/iOS build works even when VITE_BASE44_APP_ID
// is not injected by the CI environment.
const HARDCODED_APP_ID = '69bfd92e3db7d48eec6c8062';

export const base44 = createClient({
  appId: appId || HARDCODED_APP_ID,
  token: appParams.token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// Called after login redirect so the client uses the new token
export const reinitializeBase44Token = (token) => {
  if (token && base44.setToken) {
    base44.setToken(token);
  }
};
import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, functionsVersion, appBaseUrl } = appParams;

// Read token fresh from localStorage every time (not frozen at module load)
// This ensures that after login redirect, the new token is picked up.
const getToken = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('access_token') || localStorage.getItem('base44_access_token') || appParams.token;
};

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token: getToken(),
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// Expose a way to update the token on the client after login
export const reinitializeBase44Token = (token) => {
  if (token && base44.setToken) {
    base44.setToken(token);
  }
};
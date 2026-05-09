import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, functionsVersion, appBaseUrl } = appParams;

// appParams already reads access_token from URL (and removes it) + localStorage at module load.
// So appParams.token is always the freshest token available at startup.
export const base44 = createClient({
  appId,
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
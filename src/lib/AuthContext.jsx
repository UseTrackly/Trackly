import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { base44, reinitializeBase44Token } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { initRevenueCat } from '@/lib/iap';
import { Browser } from '@capacitor/browser';

const getLoginRedirectUrl = () => {
  return appParams.appBaseUrl || import.meta.env.VITE_BASE44_APP_BASE_URL || window.location.href;
};

// Extract access_token from a URL string (query param or hash fragment)
const extractToken = (url) => {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    // Check query string first
    const qToken = urlObj.searchParams.get('access_token');
    if (qToken) return qToken;
    // Check hash fragment (Supabase-style: #access_token=...)
    const hash = urlObj.hash.startsWith('#') ? urlObj.hash.slice(1) : urlObj.hash;
    const hashParams = new URLSearchParams(hash);
    return hashParams.get('access_token') || null;
  } catch {
    return null;
  }
};

// Get the freshest stored token
const getStoredToken = () => {
  return localStorage.getItem('base44_access_token') || appParams.token || null;
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const checkingRef = useRef(false);

  // Run auth check on mount
  useEffect(() => {
    checkAppState();
  }, []);

  // Listen for the Capacitor in-app browser closing.
  // AuthCallback (loaded inside the browser) writes the token to localStorage
  // and calls window.close(). Browser fires `browserFinished` here, we read
  // the token and re-authenticate.
  useEffect(() => {
    const isCapacitor = !!(window?.Capacitor?.isNativePlatform?.());
    if (!isCapacitor) return;

    let handle;
    const setup = async () => {
      handle = await Browser.addListener('browserFinished', async () => {
        console.log('[Auth] browserFinished — checking for token in localStorage');
        // Token was written by AuthCallback page before closing
        const token = localStorage.getItem('base44_access_token');
        if (token) {
          reinitializeBase44Token(token);
        }
        checkAppState();
      });
    };
    setup();
    return () => { if (handle) handle.remove(); };
  }, []);

  // Also re-check when app becomes visible (Safari/browser OAuth flow)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !isAuthenticated) {
        checkAppState();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isAuthenticated]);

  const checkAppState = async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    setIsLoadingAuth(true);
    setAuthError(null);

    // Safety timeout — never block the app more than 2.5 seconds
    const safetyTimer = setTimeout(() => {
      if (checkingRef.current) {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setUser(null);
        checkingRef.current = false;
      }
    }, 2500);

    try {
      // app-params.js already scraped ?access_token= from the URL at module load
      // and saved it to localStorage as base44_access_token.
      // But also check the current URL in case we're being called after a navigation
      // that app-params.js didn't catch (e.g. hash-based token).
      const urlToken = extractToken(window.location.href);
      if (urlToken) {
        localStorage.setItem('base44_access_token', urlToken);
        reinitializeBase44Token(urlToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const token = getStoredToken();

      if (!token) {
        // No token — allow guest access, don't block the app
        setIsAuthenticated(false);
        setUser(null);
        setAuthError(null);
        return;
      }

      reinitializeBase44Token(token);

      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAuthenticated(true);
        setAuthError(null);
        // Fire-and-forget — don't await so it never blocks auth resolution
        initRevenueCat('appl_LvOdjdFZAxsdbnWOzMlhPVyCOyZ', currentUser.id);
      } catch (error) {
        console.error('Auth check failed:', error);
        // Token invalid/expired — fall back to guest mode, don't block
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('base44_access_token');
        setAuthError(null);
      }
    } finally {
      clearTimeout(safetyTimer);
      setIsLoadingAuth(false);
      checkingRef.current = false;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('base44_access_token');
    base44.auth.logout('/');
  };

  const navigateToLogin = async () => {
    const isCapacitor = !!(window?.Capacitor?.isNativePlatform?.());
    if (isCapacitor) {
      // Open the Base44 login page inside the Capacitor in-app browser.
      // After login Base44 redirects to the `next` URL — we point it at
      // our /auth-callback page on the SAME origin as the app.
      // AuthCallback writes the token to localStorage then calls window.close().
      // The `browserFinished` listener above picks it up and authenticates.
      const appId = '69bfd92e3db7d48eec6c8062';
      const callbackUrl = 'https://usetrackly.base44.app/auth-callback';
      const loginUrl = `https://usetrackly.base44.app/login?next=${encodeURIComponent(callbackUrl)}&app_id=${appId}`;
      await Browser.open({ url: loginUrl, presentationStyle: 'fullscreen' });
    } else {
      const callbackUrl = appParams.appBaseUrl || import.meta.env.VITE_BASE44_APP_BASE_URL || window.location.origin;
      base44.auth.redirectToLogin(callbackUrl);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      logout,
      navigateToLogin,
      checkAppState,
      getLoginRedirectUrl,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { base44, reinitializeBase44Token } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { initRevenueCat } from '@/lib/iap';
import { Browser } from '@capacitor/browser';

// Custom URL scheme registered in capacitor.config.json ios.scheme = "trackly"
// Capacitor automatically registers "trackly://" in Info.plist CFBundleURLSchemes.
// When Base44 redirects to trackly://app?access_token=XXX, iOS intercepts it
// and fires appUrlOpen inside the Capacitor app with that URL — no Safari
// hand-off problem.
const IOS_CALLBACK_URL = 'trackly://app';

const getLoginRedirectUrl = () => {
  const isCapacitor = !!(window?.Capacitor?.isNativePlatform?.());
  if (isCapacitor) {
    // Use the custom scheme so Base44's redirect comes back INTO the app
    // instead of staying in Safari.
    return IOS_CALLBACK_URL;
  }
  const appBaseUrl = appParams.appBaseUrl || import.meta.env.VITE_BASE44_APP_BASE_URL;
  if (appBaseUrl) return appBaseUrl;
  return window.location.href;
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

  // Listen for Capacitor App becoming active (foreground resume after Safari login)
  useEffect(() => {
    if (!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App)) return;
    const CapApp = window.Capacitor.Plugins.App;
    let handle;
    const setup = async () => {
      handle = await CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) checkAppState();
      });
    };
    setup();
    return () => { if (handle) handle.remove(); };
  }, []);

  // Listen for Capacitor deep-link (iOS: app opened via trackly:// scheme after login)
  // Base44 redirects to trackly://app?access_token=XXX which iOS routes here.
  useEffect(() => {
    if (!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App)) return;

    const CapApp = window.Capacitor.Plugins.App;
    let handle;

    const setupListener = async () => {
      handle = await CapApp.addListener('appUrlOpen', async (event) => {
        console.log('[Auth] appUrlOpen:', event.url);
        // Close the in-app browser if it's still open
        try { await Browser.close(); } catch (_) {}
        const token = extractToken(event.url);
        if (token) {
          localStorage.setItem('base44_access_token', token);
          reinitializeBase44Token(token);
          checkAppState();
        } else {
          checkAppState();
        }
      });
    };

    setupListener();
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
    // Use Base44 SDK's redirectToLogin — it handles the correct endpoint
    // and handles the callback URL properly
    base44.auth.redirectToLogin(getLoginRedirectUrl());
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
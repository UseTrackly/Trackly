import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { base44, reinitializeBase44Token } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { initRevenueCat } from '@/lib/iap';

// The custom URL scheme used as the OAuth callback on iOS.
// Must match the bundle ID in capacitor.config.json / Info.plist.
const IOS_SCHEME = 'com.base69bfd92e3db7d48eec6c8062.app';

// Base44's redirectToLogin(callbackUrl) sends the user to the login page,
// then redirects back to callbackUrl with ?access_token= appended.
// On iOS native, window.location.href = "https://app/" — Base44's server
// won't redirect back to that internal hostname.
// 
// The correct approach: pass the app's real published URL as the callback.
// When Base44 redirects to e.g. https://trackly.base44.app?access_token=XXX,
// Capacitor's WKWebView intercepts that navigation and the page re-loads
// with the token in the URL — app-params.js scrapes it on load.
const getLoginRedirectUrl = () => {
  const appBaseUrl = appParams.appBaseUrl || import.meta.env.VITE_BASE44_APP_BASE_URL;
  if (appBaseUrl) {
    return appBaseUrl;
  }
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

  // Listen for Capacitor deep-link (iOS: app opened via custom URL scheme after login)
  useEffect(() => {
    if (!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App)) return;

    const CapApp = window.Capacitor.Plugins.App;
    let handle;

    const setupListener = async () => {
      handle = await CapApp.addListener('appUrlOpen', (event) => {
        const token = extractToken(event.url);
        if (token) {
          localStorage.setItem('base44_access_token', token);
          reinitializeBase44Token(token);
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
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthError({ type: 'auth_required', message: 'Login required' });
      checkingRef.current = false;
      return;
    }

    reinitializeBase44Token(token);

    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
      await initRevenueCat('appl_LvOdjdFZAxsdbnWOzMlhPVyCOyZ', currentUser.id);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('base44_access_token');
      setAuthError({ type: 'auth_required', message: 'Session expired' });
    } finally {
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

  const navigateToLogin = () => {
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
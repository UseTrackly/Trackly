import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { base44, reinitializeBase44Token } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { initRevenueCat } from '@/lib/iap';

const isCapacitorNative = () => !!(window?.Capacitor?.isNativePlatform?.());

// Extract access_token from a URL string (query param or hash fragment)
const extractToken = (url) => {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const qToken = urlObj.searchParams.get('access_token');
    if (qToken) return qToken;
    const hash = urlObj.hash.startsWith('#') ? urlObj.hash.slice(1) : urlObj.hash;
    return new URLSearchParams(hash).get('access_token') || null;
  } catch {
    return null;
  }
};

const getStoredToken = () =>
  localStorage.getItem('base44_access_token') || appParams.token || null;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  // Controls whether the native in-app auth screen is shown (Capacitor only)
  const [showNativeAuth, setShowNativeAuth] = useState(false);
  const checkingRef = useRef(false);

  useEffect(() => {
    checkAppState();
  }, []);

  // Web-only: re-check on tab visibility change (OAuth redirect flow)
  useEffect(() => {
    if (isCapacitorNative()) return;
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

    const safetyTimer = setTimeout(() => {
      if (checkingRef.current) {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setUser(null);
        checkingRef.current = false;
      }
    }, 2500);

    try {
      // Pick up token from URL (web redirect flow)
      const urlToken = extractToken(window.location.href);
      if (urlToken) {
        localStorage.setItem('base44_access_token', urlToken);
        reinitializeBase44Token(urlToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const token = getStoredToken();
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        // On native with no token ever stored: show login screen
        if (isCapacitorNative()) {
          setShowNativeAuth(true);
        }
        return;
      }

      reinitializeBase44Token(token);

      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAuthenticated(true);
        setShowNativeAuth(false);
        // Init RevenueCat fire-and-forget
        initRevenueCat('appl_LvOdjdFZAxsdbnWOzMlhPVyCOyZ', currentUser.id);
      } catch {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('base44_access_token');
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
    // On native: clear state and stay in-app (guest mode — user can still use free features)
    // On web: redirect to home as guest
    if (!isCapacitorNative()) {
      base44.auth.logout('/');
    }
    // setShowNativeAuth is intentionally NOT called — logout returns to guest mode,
    // not the login screen. Pages prompt sign-in when a protected action is attempted.
  };

  // Called by NativeAuthScreen after a successful login — sets state directly
  // without going through checkAppState (which has a debounce guard).
  const onNativeAuthSuccess = ({ token, user: loggedInUser }) => {
    reinitializeBase44Token(token);
    setUser(loggedInUser);
    setIsAuthenticated(true);
    setShowNativeAuth(false);
    setAuthError(null);
    // Init RevenueCat for the newly signed-in user
    initRevenueCat('appl_LvOdjdFZAxsdbnWOzMlhPVyCOyZ', loggedInUser.id);
  };

  const navigateToLogin = async () => {
    if (isCapacitorNative()) {
      setShowNativeAuth(true);
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
      showNativeAuth,
      setShowNativeAuth,
      onNativeAuthSuccess,
      logout,
      navigateToLogin,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
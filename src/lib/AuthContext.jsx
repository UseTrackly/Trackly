import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { base44, reinitializeBase44Token, ensureTokenSynced, nativeStorage } from '@/api/base44Client';
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

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
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
        await reinitializeBase44Token(urlToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Read from native storage (falls back to localStorage on web)
      const token = await nativeStorage.get();
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        if (isCapacitorNative()) {
          setShowNativeAuth(true);
        }
        return;
      }

      await ensureTokenSynced();

      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAuthenticated(true);
        setShowNativeAuth(false);
        // RC_PUBLIC_KEY is the publishable (client) SDK key — not a secret.
      initRevenueCat('appl_LvOdjdFZAxsdbnWOzMlhPVyCOyZ', currentUser.id);
      } catch {
        setIsAuthenticated(false);
        setUser(null);
        await nativeStorage.remove();
      }
    } finally {
      clearTimeout(safetyTimer);
      setIsLoadingAuth(false);
      checkingRef.current = false;
    }
  };

  const logout = async () => {
    setUser(null);
    setIsAuthenticated(false);
    await nativeStorage.remove();
    if (!isCapacitorNative()) {
      base44.auth.logout('/');
    }
  };

  const onNativeAuthSuccess = async ({ token, user: loggedInUser }) => {
    await reinitializeBase44Token(token);
    setUser(loggedInUser);
    setIsAuthenticated(true);
    setShowNativeAuth(false);
    setAuthError(null);
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
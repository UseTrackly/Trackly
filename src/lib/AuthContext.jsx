import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44, reinitializeBase44Token } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { initRevenueCat } from '@/lib/iap';

// Get the freshest token: appParams already scraped URL + localStorage at module load.
// On visibility change (returning from login), check localStorage again for a new token.
const getFreshToken = () => {
  return localStorage.getItem('base44_access_token') || appParams.token;
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);

    const token = getFreshToken();

    if (!token) {
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthError({ type: 'auth_required', message: 'Login required' });
      return;
    }

    // Make sure the client has the latest token
    reinitializeBase44Token(token);

    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
      // Initialize RevenueCat
      await initRevenueCat('appl_LvOdjdFZAxsdbnWOzMlhPVyCOyZ', currentUser.id);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      // Clear bad token
      localStorage.removeItem('base44_access_token');
      setAuthError({ type: 'auth_required', message: 'Session expired' });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    base44.auth.logout('/');
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false, // no longer needed
      authError,
      logout,
      navigateToLogin,
      checkAppState
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
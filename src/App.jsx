import { base44 } from '@/api/base44Client';
import { Toaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { ThemeProvider } from '@/lib/ThemeContext';
import AppBackground from '@/components/background/AppBackground';
import SplashScreen from '@/components/SplashScreen';
import React, { useState, useEffect } from 'react';

import AppLayout from '@/components/layout/AppLayout';
import Onboarding from '@/pages/Onboarding';
import OnboardingCategories from '@/pages/OnboardingCategories';
import Dashboard from '@/pages/Dashboard';
import CalculatorPage from '@/pages/CalculatorPage';
import HistoryPage from '@/pages/HistoryPage';
import InventoryPage from '@/pages/InventoryPage';
import CommunityPage from '@/pages/CommunityPage';
import ProfilePage from '@/pages/ProfilePage';
import TermsOfService from '@/pages/TermsOfService';
import PrivacyPolicy from '@/pages/PrivacyPolicy';

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, checkAppState, getLoginRedirectUrl } = useAuth();

  // When user returns to the app after external login, re-check auth
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && authError?.type === 'auth_required') {
        checkAppState();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [authError, checkAppState]);

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground font-medium tracking-wider uppercase">Trackly</p>
        </div>
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/onboarding-categories" element={<OnboardingCategories />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}
          <Router>
            <AppBackground />
            <AuthenticatedApp />
          </Router>
          <Toaster theme="dark" toastOptions={{ className: 'bg-card text-foreground border-border' }} />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App
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
  const { isLoadingAuth, authError, checkAppState } = useAuth();

  // When user returns to the app after external login, re-check auth
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAppState();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkAppState]);

  // Don't block — let the app render even while loading auth
  // The individual pages handle the unauthenticated state gracefully
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
          {/* Splash overlays the app — app mounts immediately underneath */}
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
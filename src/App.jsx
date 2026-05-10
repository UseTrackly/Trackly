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
import React, { useEffect } from 'react';

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

  // Signal to main.jsx that React has mounted and is rendering
  useEffect(() => {
    // Clear the pre-react diagnostic banner and watchdog
    if (typeof window.__tracklyMountWatchdog !== 'undefined') {
      clearTimeout(window.__tracklyMountWatchdog);
    }
    const banner = document.getElementById('pre-react-banner');
    if (banner) banner.remove();
  }, []);

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

  if (isLoadingAuth) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <img
          src="https://media.base44.com/images/public/69bfd92e3db7d48eec6c8062/c29d404d0_logo_no_bg_final.png"
          alt="Trackly"
          style={{ height: 48, width: 'auto' }}
        />
        <div style={{ width: 24, height: 24, border: '2px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          {/* Splash is a pure overlay — app always renders underneath */}
          <SplashScreen onComplete={() => {}} />
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
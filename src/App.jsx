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

// ─── React Error Boundary ─────────────────────────────────────────────────────
// Catches any render-time crash (including TypeError: x.filter is not a function)
// and shows a visible diagnostic screen instead of a silent black screen.
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // Also clear the mount watchdog so it doesn't double-fire
    if (window.__tracklyMountWatchdog) clearTimeout(window.__tracklyMountWatchdog);
    console.error('[Trackly] Render crash:', error, info);
  }
  render() {
    if (this.state.error) {
      const err = this.state.error;
      return (
        <div style={{ background: '#0a0a0a', color: '#fff', minHeight: '100vh', padding: '32px 24px', fontFamily: 'system-ui,sans-serif', boxSizing: 'border-box' }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              TRACKLY — RENDER ERROR
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px' }}>App crashed during render</h1>
            <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>Error</div>
              <div style={{ fontSize: 13, color: '#ff6b6b', wordBreak: 'break-word' }}>{String(err)}</div>
            </div>
            {err?.stack && (
              <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>Stack</div>
                <pre style={{ fontSize: 11, color: '#aaa', whiteSpace: 'pre-wrap', margin: 0, wordBreak: 'break-all' }}>{err.stack}</pre>
              </div>
            )}
            <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>App Config</div>
              <div style={{ fontSize: 12, color: '#ccc', fontFamily: 'monospace', lineHeight: 1.8 }}>
                APP_ID: {import.meta.env.VITE_BASE44_APP_ID || '(not set)'}<br/>
                BASE_URL: {import.meta.env.VITE_BASE44_APP_BASE_URL || '(not set)'}<br/>
                FN_VER: {import.meta.env.VITE_BASE44_FUNCTIONS_VERSION || '(not set)'}
              </div>
            </div>
            <button
              onClick={() => this.setState({ error: null })}
              style={{ background: '#22c55e', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import AppLayout from '@/components/layout/AppLayout';
import NativeAuthScreen from '@/components/auth/NativeAuthScreen';
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
import AuthCallback from '@/pages/AuthCallback';

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, checkAppState, showNativeAuth, setShowNativeAuth, onNativeAuthSuccess } = useAuth();

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

  // Native in-app auth screen (Capacitor iOS — replaces browser flow)
  if (showNativeAuth) {
    return <NativeAuthScreen onSuccess={onNativeAuthSuccess} />;
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/onboarding-categories" element={<OnboardingCategories />} />
      <Route path="/auth-callback" element={<AuthCallback />} />
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
    <AppErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClientInstance}>
            {/* Splash is a pure overlay — app always renders underneath */}
            <SplashScreen onComplete={() => {}} />
            <Router>
              <AppBackground />
              <AppErrorBoundary>
                <AuthenticatedApp />
              </AppErrorBoundary>
            </Router>
            <Toaster theme="dark" toastOptions={{ className: 'bg-card text-foreground border-border' }} />
          </QueryClientProvider>
        </ThemeProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}

export default App
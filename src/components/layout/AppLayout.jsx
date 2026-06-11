import React, { Suspense, lazy, useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
const GlowOrbs = lazy(() => import('@/components/background/GlowOrbs'));
import UnifiedHeader, { MessageProvider } from './UnifiedHeader';
import { TabResetProvider, useTabReset } from '@/lib/TabResetContext';
import { PageTabProvider, usePageTab } from '@/lib/PageTabContext';
import PageTabBar from './PageTabBar';
import BottomNav from './BottomNav';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const CalculatorPage = lazy(() => import('@/pages/CalculatorPage'));
const InventoryPage = lazy(() => import('@/pages/InventoryPage'));
const HistoryPage = lazy(() => import('@/pages/HistoryPage'));
const CommunityPage = lazy(() => import('@/pages/CommunityPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));

const TAB_ROUTES = [
  { path: '/', component: Dashboard },
  { path: '/calculator', component: CalculatorPage },
  { path: '/inventory', component: InventoryPage },
  { path: '/history', component: HistoryPage },
  { path: '/community', component: CommunityPage },
  { path: '/profile', component: ProfilePage },
  { path: '/settings', component: SettingsPage },
];

const TAB_PATHS = TAB_ROUTES.map(r => r.path);
const FULLSCREEN_PATHS = ['/upgrade'];

const TabSpinner = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function AppLayoutInner() {
  const location = useLocation();
  const { tabKeys } = useTabReset();
  const [calcTab, setCalcTab] = usePageTab('/calculator');
  const [invTab, setInvTab] = usePageTab('/inventory');
  const [commTab, setCommTab] = usePageTab('/community');

  const activeTab = { '/calculator': calcTab, '/inventory': invTab, '/community': commTab }[location.pathname] ?? '';
  const setActiveTab = { '/calculator': setCalcTab, '/inventory': setInvTab, '/community': setCommTab }[location.pathname] ?? (() => {});
  const isChildPage = !TAB_PATHS.includes(location.pathname);
  const isFullscreen = FULLSCREEN_PATHS.includes(location.pathname);

  // Track which tabs have been visited so we only mount them once they're first accessed
  const [mountedTabs, setMountedTabs] = useState(() => new Set([location.pathname]));

  useEffect(() => {
    if (!isChildPage) {
      setMountedTabs(prev => {
        if (prev.has(location.pathname)) return prev;
        const next = new Set(prev);
        next.add(location.pathname);
        return next;
      });
    }
  }, [location.pathname, isChildPage]);

  return (
    <div
      className="bg-background text-sm"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: '100%',
        height: '100dvh',
        // Ensure background fills the safe-area inset on notched iPhones
        backgroundColor: 'hsl(var(--background))',
      }}
    >
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>

      {/* Grid background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.35,
        }}
      />
      <Suspense fallback={null}><GlowOrbs /></Suspense>

      {/* Header — part of flex column, does NOT scroll */}
      {!isFullscreen && <UnifiedHeader />}

      {/* Page tab bar — sits between header and content, never scrolls */}
      {!isFullscreen && <PageTabBar activeTab={activeTab} onTabChange={setActiveTab} />}

      {/* Scrollable content — flex-1, ONLY this scrolls */}
      <main
        id="main-content"
        className="relative z-10"
        style={{
          flex: '1 1 0',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'none',
          touchAction: 'pan-y',
        }}
      >
        <div className="max-w-2xl w-full mx-auto" style={{ paddingTop: '8px', paddingBottom: '24px' }}>
        {/* Tab pages — mounted once, toggled via display to preserve state & scroll */}
        {TAB_ROUTES.map(({ path, component: Comp }) => {
          if (!mountedTabs.has(path)) return null;
          const isActive = location.pathname === path && !isChildPage;
          return (
            <div key={`${path}-${tabKeys[path] || 0}`} className={isActive ? 'block' : 'hidden'}>
              <Suspense fallback={<TabSpinner />}>
                <Comp />
              </Suspense>
            </div>
          );
        })}

        {/* Child pages (Terms, Privacy, etc.) */}
        {isChildPage && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        )}
        </div>
      </main>

      {/* Bottom navigation — part of flex column, covers safe area */}
      {!isFullscreen && <BottomNav />}

    </div>
  );
}

export default function AppLayout() {
  return (
    <TabResetProvider>
      <PageTabProvider>
        <MessageProvider>
          <AppLayoutInner />
        </MessageProvider>
      </PageTabProvider>
    </TabResetProvider>
  );
}
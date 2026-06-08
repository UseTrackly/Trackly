import React, { createContext, useContext, useState, useCallback } from 'react';

const PageTabContext = createContext(null);

export function PageTabProvider({ children }) {
  const [tabs, setTabs] = useState({
    '/calculator': 'calculator',
    '/inventory': 'inventory',
    '/community': 'discover',
  });

  const setTab = useCallback((route, value) => {
    setTabs(prev => ({ ...prev, [route]: value }));
  }, []);

  return (
    <PageTabContext.Provider value={{ tabs, setTab }}>
      {children}
    </PageTabContext.Provider>
  );
}

export function usePageTab(route) {
  const ctx = useContext(PageTabContext);
  return [ctx.tabs[route] ?? '', (val) => ctx.setTab(route, val)];
}
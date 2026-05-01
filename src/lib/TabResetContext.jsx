import React, { createContext, useContext, useState, useCallback } from 'react';

const TabResetContext = createContext({ tabKeys: {}, resetTab: () => {} });

export function TabResetProvider({ children }) {
  const [tabKeys, setTabKeys] = useState({});

  const resetTab = useCallback((path) => {
    setTabKeys(prev => ({ ...prev, [path]: (prev[path] || 0) + 1 }));
  }, []);

  return (
    <TabResetContext.Provider value={{ tabKeys, resetTab }}>
      {children}
    </TabResetContext.Provider>
  );
}

export function useTabReset() {
  return useContext(TabResetContext);
}
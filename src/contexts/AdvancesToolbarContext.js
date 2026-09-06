import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'advancesPageFiltersCollapsed';

const AdvancesToolbarContext = createContext(null);

export function AdvancesToolbarProvider({ children }) {
  const [filtersCollapsed, setFiltersCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, filtersCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [filtersCollapsed]);

  const toggleFiltersCollapsed = useCallback(() => {
    setFiltersCollapsed((v) => !v);
  }, []);

  const value = useMemo(
    () => ({ filtersCollapsed, setFiltersCollapsed, toggleFiltersCollapsed }),
    [filtersCollapsed, toggleFiltersCollapsed]
  );

  return <AdvancesToolbarContext.Provider value={value}>{children}</AdvancesToolbarContext.Provider>;
}

export function useAdvancesToolbar() {
  const ctx = useContext(AdvancesToolbarContext);
  if (!ctx) {
    return {
      filtersCollapsed: false,
      setFiltersCollapsed: () => {},
      toggleFiltersCollapsed: () => {},
    };
  }
  return ctx;
}

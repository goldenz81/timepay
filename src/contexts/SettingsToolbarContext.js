import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'settingsPageHeaderCollapsed';

const SettingsToolbarContext = createContext(null);

export function SettingsToolbarProvider({ children }) {
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

  return (
    <SettingsToolbarContext.Provider value={value}>
      {children}
    </SettingsToolbarContext.Provider>
  );
}

export function useSettingsToolbar() {
  const ctx = useContext(SettingsToolbarContext);
  if (!ctx) {
    return {
      filtersCollapsed: false,
      setFiltersCollapsed: () => {},
      toggleFiltersCollapsed: () => {},
    };
  }
  return ctx;
}

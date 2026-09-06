import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'fingerprintPageHeaderCollapsed';

const FingerprintToolbarContext = createContext(null);

export function FingerprintToolbarProvider({ children }) {
  const [filtersCollapsed, setFiltersCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [integrationStats, setIntegrationStats] = useState(null);
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [importStats, setImportStats] = useState(null);
  const refreshIntegrationRef = useRef(null);

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

  const setRefreshIntegration = useCallback((fn) => {
    refreshIntegrationRef.current = typeof fn === 'function' ? fn : null;
  }, []);

  const refreshIntegration = useCallback(() => {
    refreshIntegrationRef.current?.();
  }, []);

  const clearIntegrationHeader = useCallback(() => {
    setIntegrationStats(null);
    setIntegrationLoading(false);
    refreshIntegrationRef.current = null;
  }, []);

  const clearImportHeader = useCallback(() => {
    setImportStats(null);
  }, []);

  const value = useMemo(
    () => ({
      filtersCollapsed,
      setFiltersCollapsed,
      toggleFiltersCollapsed,
      integrationStats,
      setIntegrationStats,
      integrationLoading,
      setIntegrationLoading,
      setRefreshIntegration,
      refreshIntegration,
      clearIntegrationHeader,
      importStats,
      setImportStats,
      clearImportHeader,
    }),
    [
      filtersCollapsed,
      toggleFiltersCollapsed,
      integrationStats,
      integrationLoading,
      setRefreshIntegration,
      refreshIntegration,
      clearIntegrationHeader,
      importStats,
      clearImportHeader,
    ]
  );

  return (
    <FingerprintToolbarContext.Provider value={value}>
      {children}
    </FingerprintToolbarContext.Provider>
  );
}

export function useFingerprintToolbar() {
  const ctx = useContext(FingerprintToolbarContext);
  if (!ctx) {
    return {
      filtersCollapsed: false,
      setFiltersCollapsed: () => {},
      toggleFiltersCollapsed: () => {},
      integrationStats: null,
      setIntegrationStats: () => {},
      integrationLoading: false,
      setIntegrationLoading: () => {},
      setRefreshIntegration: () => {},
      refreshIntegration: () => {},
      clearIntegrationHeader: () => {},
      importStats: null,
      setImportStats: () => {},
      clearImportHeader: () => {},
    };
  }
  return ctx;
}

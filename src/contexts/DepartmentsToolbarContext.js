import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'departmentsPageHeaderCollapsed';

const DepartmentsToolbarContext = createContext(null);

export function DepartmentsToolbarProvider({ children }) {
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
    <DepartmentsToolbarContext.Provider value={value}>
      {children}
    </DepartmentsToolbarContext.Provider>
  );
}

export function useDepartmentsToolbar() {
  const ctx = useContext(DepartmentsToolbarContext);
  if (!ctx) {
    return {
      filtersCollapsed: false,
      setFiltersCollapsed: () => {},
      toggleFiltersCollapsed: () => {},
    };
  }
  return ctx;
}

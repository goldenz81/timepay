import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'employeesPageFiltersCollapsed';

const EmployeesToolbarContext = createContext(null);

export function EmployeesToolbarProvider({ children }) {
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

  return <EmployeesToolbarContext.Provider value={value}>{children}</EmployeesToolbarContext.Provider>;
}

export function useEmployeesToolbar() {
  const ctx = useContext(EmployeesToolbarContext);
  if (!ctx) {
    return {
      filtersCollapsed: false,
      setFiltersCollapsed: () => {},
      toggleFiltersCollapsed: () => {},
    };
  }
  return ctx;
}

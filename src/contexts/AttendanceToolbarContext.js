import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'attendancePageFiltersCollapsed';

const AttendanceToolbarContext = createContext(null);

export function AttendanceToolbarProvider({ children }) {
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

  return <AttendanceToolbarContext.Provider value={value}>{children}</AttendanceToolbarContext.Provider>;
}

export function useAttendanceToolbar() {
  const ctx = useContext(AttendanceToolbarContext);
  if (!ctx) {
    return {
      filtersCollapsed: false,
      setFiltersCollapsed: () => {},
      toggleFiltersCollapsed: () => {},
    };
  }
  return ctx;
}

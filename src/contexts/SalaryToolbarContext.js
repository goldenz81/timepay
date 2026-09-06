import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_WEEKLY = 'weeklySalaryPageHeaderCollapsed';
const STORAGE_MONTHLY = 'monthlySalaryPageHeaderCollapsed';

const SalaryToolbarContext = createContext(null);

export function SalaryToolbarProvider({ children }) {
  const [weeklySalaryHeaderCollapsed, setWeeklySalaryHeaderCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_WEEKLY) === '1';
    } catch {
      return false;
    }
  });
  const [monthlySalaryHeaderCollapsed, setMonthlySalaryHeaderCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_MONTHLY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_WEEKLY, weeklySalaryHeaderCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [weeklySalaryHeaderCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MONTHLY, monthlySalaryHeaderCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [monthlySalaryHeaderCollapsed]);

  const toggleWeeklySalaryHeaderCollapsed = useCallback(() => {
    setWeeklySalaryHeaderCollapsed((v) => !v);
  }, []);

  const toggleMonthlySalaryHeaderCollapsed = useCallback(() => {
    setMonthlySalaryHeaderCollapsed((v) => !v);
  }, []);

  const value = useMemo(
    () => ({
      weeklySalaryHeaderCollapsed,
      setWeeklySalaryHeaderCollapsed,
      toggleWeeklySalaryHeaderCollapsed,
      monthlySalaryHeaderCollapsed,
      setMonthlySalaryHeaderCollapsed,
      toggleMonthlySalaryHeaderCollapsed,
    }),
    [
      weeklySalaryHeaderCollapsed,
      monthlySalaryHeaderCollapsed,
      toggleWeeklySalaryHeaderCollapsed,
      toggleMonthlySalaryHeaderCollapsed,
    ]
  );

  return <SalaryToolbarContext.Provider value={value}>{children}</SalaryToolbarContext.Provider>;
}

export function useSalaryToolbar() {
  const ctx = useContext(SalaryToolbarContext);
  if (!ctx) {
    return {
      weeklySalaryHeaderCollapsed: false,
      setWeeklySalaryHeaderCollapsed: () => {},
      toggleWeeklySalaryHeaderCollapsed: () => {},
      monthlySalaryHeaderCollapsed: false,
      setMonthlySalaryHeaderCollapsed: () => {},
      toggleMonthlySalaryHeaderCollapsed: () => {},
    };
  }
  return ctx;
}

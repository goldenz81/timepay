import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiUrl } from '../../utils/apiUrlHelper';
import { debugLog, debugWarn, debugError } from '../../utils/debugLog';
import {
  deduplicateEntitlementsColumns,
  deduplicateDeductionColumns,
} from '../../utils/salary/deduplicateSalaryColumns';
import {
  DEFAULT_WEEKLY_MAIN_COLUMNS,
  LEGACY_WEEKLY_MAIN_COLUMNS_STORAGE_KEY,
  WEEKLY_MAIN_COLUMNS_STORAGE_KEY,
  WEEKLY_SALARY_MAIN_COLUMNS_SETTING_KEY,
} from '../../utils/salary/weeklySalaryConstants';
import {
  filterMealAllowanceColumns,
  filterMealAllowanceColumnIds,
  isMealAllowanceColumn,
} from '../../utils/systemFeatureFlags';

function mergeWeeklyMainColumnsFromSaved(savedList) {
  if (!Array.isArray(savedList) || savedList.length === 0) return DEFAULT_WEEKLY_MAIN_COLUMNS;
  const allowedIds = new Set(DEFAULT_WEEKLY_MAIN_COLUMNS.map((c) => c.id));
  const defaultById = Object.fromEntries(DEFAULT_WEEKLY_MAIN_COLUMNS.map((c) => [c.id, c]));
  const seen = new Set();
  const out = [];
  for (const s of savedList) {
    if (!s || typeof s.id !== 'string' || !allowedIds.has(s.id) || seen.has(s.id)) continue;
    seen.add(s.id);
    const d = defaultById[s.id];
    out.push({
      id: d.id,
      label: d.label,
      visible: typeof s.visible === 'boolean' ? s.visible : d.visible,
    });
  }
  for (const d of DEFAULT_WEEKLY_MAIN_COLUMNS) {
    if (!seen.has(d.id)) out.push({ ...d });
  }
  return out;
}

export function useWeeklySalaryColumns({ toast, onRefreshData, mealAllowanceEnabled = true } = {}) {
  const [dynamicColumns, setDynamicColumns] = useState([]);
  const [entitlementsColumns, setEntitlementsColumns] = useState([]);
  const [rawEntitlementsColumns, setRawEntitlementsColumns] = useState([]);
  const [deductionsColumns, setDeductionsColumns] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [visibleDeductionColumns, setVisibleDeductionColumns] = useState([]);

  const applyEntitlementsColumns = useCallback((columns) => {
    const raw = columns || [];
    setRawEntitlementsColumns(raw);
    setEntitlementsColumns(filterMealAllowanceColumns(raw, mealAllowanceEnabled));
  }, [mealAllowanceEnabled]);

  useEffect(() => {
    setEntitlementsColumns(filterMealAllowanceColumns(rawEntitlementsColumns, mealAllowanceEnabled));
    setVisibleColumns((prev) => filterMealAllowanceColumnIds(prev, rawEntitlementsColumns, mealAllowanceEnabled));
  }, [mealAllowanceEnabled, rawEntitlementsColumns]);

  const [weeklyMainColumns, setWeeklyMainColumns] = useState(() => {
    try {
      let raw = localStorage.getItem(WEEKLY_MAIN_COLUMNS_STORAGE_KEY);
      let fromLegacy = false;
      if (!raw) {
        raw = localStorage.getItem(LEGACY_WEEKLY_MAIN_COLUMNS_STORAGE_KEY);
        fromLegacy = Boolean(raw);
      }
      if (!raw) return DEFAULT_WEEKLY_MAIN_COLUMNS;
      const parsed = JSON.parse(raw);
      const merged = mergeWeeklyMainColumnsFromSaved(parsed);
      try {
        localStorage.setItem(WEEKLY_MAIN_COLUMNS_STORAGE_KEY, JSON.stringify(merged));
        if (fromLegacy) localStorage.removeItem(LEGACY_WEEKLY_MAIN_COLUMNS_STORAGE_KEY);
      } catch { /* ignore */ }
      return merged;
    } catch {
      return DEFAULT_WEEKLY_MAIN_COLUMNS;
    }
  });
  const [weeklyMainColumnsServerHydrated, setWeeklyMainColumnsServerHydrated] = useState(false);
  const weeklyMainColumnsPersistTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          getApiUrl('/api/comprehensive_settings_api.php?action=get_settings_by_category&category=salary')
        );
        const data = await res.json();
        if (cancelled || !data.success || !Array.isArray(data.settings)) return;
        const row = data.settings.find((s) => s.setting_key === WEEKLY_SALARY_MAIN_COLUMNS_SETTING_KEY);
        const rawVal = row?.setting_value;
        if (rawVal && String(rawVal).trim()) {
          const parsed = JSON.parse(rawVal);
          const merged = mergeWeeklyMainColumnsFromSaved(parsed);
          setWeeklyMainColumns(merged);
          try {
            localStorage.setItem(WEEKLY_MAIN_COLUMNS_STORAGE_KEY, JSON.stringify(merged));
            localStorage.removeItem(LEGACY_WEEKLY_MAIN_COLUMNS_STORAGE_KEY);
          } catch { /* ignore */ }
        }
      } catch (e) {
        debugError(e);
      } finally {
        if (!cancelled) setWeeklyMainColumnsServerHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(WEEKLY_MAIN_COLUMNS_STORAGE_KEY, JSON.stringify(weeklyMainColumns));
    } catch { /* ignore */ }
    if (!weeklyMainColumnsServerHydrated) return;
    if (weeklyMainColumnsPersistTimerRef.current) clearTimeout(weeklyMainColumnsPersistTimerRef.current);
    weeklyMainColumnsPersistTimerRef.current = setTimeout(async () => {
      weeklyMainColumnsPersistTimerRef.current = null;
      try {
        await fetch(getApiUrl('/api/comprehensive_settings_api.php'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_multiple_settings',
            category: 'salary',
            settings: [{
              key: WEEKLY_SALARY_MAIN_COLUMNS_SETTING_KEY,
              value: JSON.stringify(weeklyMainColumns),
              category: 'salary',
            }],
          }),
        });
      } catch (e) {
        debugError(e);
      }
    }, 800);
    return () => {
      if (weeklyMainColumnsPersistTimerRef.current) {
        clearTimeout(weeklyMainColumnsPersistTimerRef.current);
        weeklyMainColumnsPersistTimerRef.current = null;
      }
    };
  }, [weeklyMainColumns, weeklyMainColumnsServerHydrated]);

  const toggleWeeklyMainColumn = (id) => {
    setWeeklyMainColumns((cols) => cols.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));
  };

  const moveWeeklyMainColumn = (id, direction) => {
    setWeeklyMainColumns((cols) => {
      const idx = cols.findIndex((c) => c.id === id);
      if (idx < 0) return cols;
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= cols.length) return cols;
      const newCols = [...cols];
      [newCols[idx], newCols[swapWith]] = [newCols[swapWith], newCols[idx]];
      return newCols;
    });
  };

  const fetchDynamicColumns = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php?action=get_columns&table_name=net_weekly_wage'));
      
      const result = await response.json();
      if (result.success) {
        // 7?7?7?8y7? 7?87?7?8&7?7? 7?7?7? display_order
        const sortedColumns = result.data.sort((a, b) => {
          const orderA = parseInt(a.order) || 0;
          const orderB = parseInt(b.order) || 0;
          return orderA - orderB;
        });
        setDynamicColumns(sortedColumns);
        debugLog('? Dynamic columns loaded successfully!');
        debugLog('Total dynamic columns:', sortedColumns.length);
        debugLog('Visible columns (is_visible=1):', sortedColumns.filter(col => col.is_visible === 1).length);
        debugLog('Dynamic columns details:', sortedColumns.map(col => ({
          id: col.id,
          name: col.display_name_ar,
          is_visible: col.is_visible,
          order: col.order
        })));
      }
    } catch (error) {
      debugError('Error fetching dynamic columns:', error);
    }
  }, []);

  // Fetch all columns from new salary tables
  const fetchAllSalaryColumns = useCallback(async () => {
    try {
      // 7?7?8&8y8 7?8&8y7? 7?87?7?8&7?7? 8&8  7?87?7?7?8?8 7?87?7?8y7?7?
      const [netWeekly, entitlements, deductions] = await Promise.all([
        fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php?action=get_columns&table_name=net_weekly_wage')).then(r => r.json()),
        fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php?action=get_columns&table_name=weekly_wage_entitlements')).then(r => r.json()),
        fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php?action=get_columns&table_name=weekly_wage_deductions')).then(r => r.json())
      ]);
      
      const allColumns = [
        ...(netWeekly.success ? netWeekly.data : []),
        ...(entitlements.success ? entitlements.data : []),
        ...(deductions.success ? deductions.data : [])
      ];
      
      // 7?7?7?87? 7?87?8?7?7?7? 7?8 7?789 7?880 ID
      const uniqueColumns = allColumns.filter((column, index, self) => 
        index === self.findIndex(col => col.id === column.id)
      );
      
      // 7?7?7?8y7? 7?87?7?8&7?7? 7?7?7? display_order
      const sortedColumns = uniqueColumns.sort((a, b) => {
        const orderA = parseInt(a.order) || 0;
        const orderB = parseInt(b.order) || 0;
        return orderA - orderB;
      });
      
      setDynamicColumns(sortedColumns);
      debugLog('All salary columns loaded:', sortedColumns.length, 'columns');
      debugLog('All columns:', sortedColumns.map(col => ({id: col.id, name: col.display_name_ar, table_id: col.table_id})));
    } catch (error) {
      debugError('Error fetching all salary columns:', error);
    }
  }, []);

  // Fetch columns for entitlements table (weekly_wage_entitlements)
  const fetchEntitlementsColumns = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php?action=get_columns&table_name=weekly_wage_entitlements'));
      const result = await response.json();
      if (result.success) {
        debugLog('Raw API response for entitlements columns:', result.data);
        const sorted = result.data.sort((a, b) => {
          const orderA = parseInt(a.display_order || a.order) || 0;
          const orderB = parseInt(b.display_order || b.order) || 0;
          return orderA - orderB;
        });
        const uniqueColumns = deduplicateEntitlementsColumns(sorted);
        debugLog('Processed entitlements columns (after deduplication):', uniqueColumns.map(col => ({
          id: col.id,
          name: col.display_name_ar || col.column_name_ar,
          column_key: col.column_key || col.column_name || col.name,
          type: col.type,
          is_visible: col.is_visible
        })));
        return uniqueColumns;
      }
    } catch (error) {
      debugError('Error fetching entitlements columns:', error);
    }
    return [];
  }, []);

  // Fetch columns for deductions table (weekly_wage_deductions)
  const fetchDeductionsColumns = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php?action=get_columns&table_name=weekly_wage_deductions'));
      const result = await response.json();
      if (result.success) {
        const sorted = result.data.sort((a, b) => {
          const orderA = parseInt(a.display_order) || 0;
          const orderB = parseInt(b.display_order) || 0;
          return orderA - orderB;
        });
        return deduplicateDeductionColumns(sorted);
      }
    } catch (error) {
      debugError('Error fetching deductions columns:', error);
    }
    return [];
  }, []);

  const toggleColumnVisibility = (columnId) => {
    setVisibleColumns(prev => {
      if (prev.includes(columnId)) {
        return prev.filter(id => id !== columnId);
      }
      return [...prev, columnId];
    });
  };

  const savePreferences = useCallback(async () => {
    try {
      if (entitlementsColumns.length > 0) {
        const columnsToSave = entitlementsColumns.map((col, index) => {
          const isVisible = columnVisibility[col.id] !== undefined 
            ? columnVisibility[col.id] 
            : col.is_visible;
          const displayOrder = visibleColumns.indexOf(col.id) >= 0 
            ? visibleColumns.indexOf(col.id) + 1 
            : col.display_order || index + 1;
          
          return {
            id: col.id,
            display_order: displayOrder,
            is_visible: isVisible ? 1 : 0
          };
        });
        
        try {
          const dbResponse = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'update_columns_order_and_visibility',
              table_name: 'weekly_wage_entitlements',
              columns: columnsToSave
            })
          });
          
          const dbResult = await dbResponse.json();
          if (dbResult.success) {
            debugLog('?? ??? ????? ????? ????????? ?? ????? ????????');
            await fetchEntitlementsColumns();
          } else {
            debugError('??? ?? ??? ????? ???????:', dbResult.message);
          }
        } catch (dbError) {
          debugError('Error saving columns to database:', dbError);
        }
      }

      // 7?8~7? 7?7?7?8y7? 7?7?8&7?7? 7?88&7?7?87?7?7?7? 8?7?7?87? 7?87?7?8!7?7?
      if (deductionsColumns.length > 0) {
        const deductionColumnsToSave = deductionsColumns.map((col, index) => {
          const isVisible = visibleDeductionColumns.includes(col.id);
          const displayOrder = visibleDeductionColumns.indexOf(col.id) >= 0 
            ? visibleDeductionColumns.indexOf(col.id) + 1 
            : col.display_order || index + 1;
          return {
            id: col.id,
            display_order: displayOrder,
            is_visible: isVisible ? 1 : 0
          };
        });
        try {
          const dbResponse = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_columns_order_and_visibility',
              table_name: 'weekly_wage_deductions',
              columns: deductionColumnsToSave
            })
          });
          const dbResult = await dbResponse.json();
          if (dbResult.success) {
            await fetchDeductionsColumns();
          } else {
            debugError('??? ?? ??? ????? ????? ??????????:', dbResult.message);
          }
        } catch (dbError) {
          debugError('Error saving deduction columns to database:', dbError);
        }
      }
    } catch (error) {
      debugError('Error saving preferences:', error);
      toast?.({
        title: '??? ?? ?????',
        description: '??? ??? ????? ??? ?????????',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [visibleColumns, visibleDeductionColumns, entitlementsColumns, deductionsColumns, columnVisibility, fetchEntitlementsColumns, fetchDeductionsColumns, toast]);

  const loadPreferences = async () => {
    try {
      // 7?7?8&8y8 7?7?8&7?7? 7?88&7?7?7?87?7?
      const columnsResponse = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php?action=get_columns&table_name=weekly_wage_entitlements'));
      const columnsResult = await columnsResponse.json();
      
      if (columnsResult.success && columnsResult.data) {
        const orderedColumns = columnsResult.data
          .filter(col => col.is_visible !== 0)
          .sort((a, b) => {
            const orderA = parseInt(a.display_order) || 0;
            const orderB = parseInt(b.display_order) || 0;
            return orderA - orderB;
          });
        const columnOrder = orderedColumns
          .map(col => col.id)
          .filter((id, idx, arr) => arr.indexOf(id) === idx);
        if (columnOrder.length > 0) {
          setVisibleColumns(columnOrder);
        }
      }

      // 7?7?8&8y8 7?7?8&7?7? 7?88&7?7?87?7?7?7? (7?7?7?8y7? 8?7?7?87? 7?87?7?8!7?7?)
      try {
        const dedResponse = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php?action=get_columns&table_name=weekly_wage_deductions'));
        const dedResult = await dedResponse.json();
        if (dedResult.success && dedResult.data) {
          const orderedDed = dedResult.data
            .filter(col => col.is_visible !== 0)
            .sort((a, b) => (parseInt(a.display_order) || 0) - (parseInt(b.display_order) || 0));
          const deductionOrder = orderedDed.map(col => col.id).filter((id, idx, arr) => arr.indexOf(id) === idx);
          if (deductionOrder.length > 0) {
            setVisibleDeductionColumns(deductionOrder);
          }
        }
      } catch (e) {
        debugError('Error loading deduction preferences:', e);
      }
    } catch (error) {
      debugError('Error loading preferences:', error);
    }
  };

  // 7?8?7?8 7?7?7?8y7? 7?7?8y7?7? 887?7?8&7?7? 7?88&7?7?8y7? (8&7?7?8 7? 887?7?7?7)
  const moveColumnUp = useCallback((columnId) => {
    debugLog('moveColumnUp called with columnId:', columnId);
    
    setVisibleColumns(prev => {
      // 7?7?7?87? 7?8y 7?8?7?7?7? 7?8?87?89
      const uniquePrev = prev.filter((id, idx) => prev.indexOf(id) === idx);
      const index = uniquePrev.indexOf(columnId);
      
      // 7?7?7? 8?7?8  7?87?8&8?7? 78y7? 8&8?7?8?7? 8~8y visibleColumns7R 7?7?8~8! 8~8y 7?87?7?7?8y7?
      if (index === -1) {
        const newColumns = [columnId, ...uniquePrev];
        setTimeout(() => savePreferences(), 100);
        return newColumns;
      }
      
      // 7?7?7? 8?7?8  7?87?8&8?7? 8~8y 7?87?7?7?8y7?7R 87? 8y8&8?8  8 888! 87?7?880
      if (index === 0) {
        debugLog('Cannot move up - already at top');
        return uniquePrev;
      }
      
      // 7?8 7?7?7 87?7?8&7? 7?7?8y7?7? 8?7?7?7?8y8 7?87?8&8?7? 8&7? 7?87?8&8?7? 7?87?7?7?8
      const newColumns = [...uniquePrev];
      [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
      
      debugLog('Moved up:', columnId, 'New order:', newColumns);
      setTimeout(() => savePreferences(), 100);
      return newColumns;
    });
  }, [savePreferences]);

  const moveColumnDown = useCallback((columnId) => {
    debugLog('moveColumnDown called with columnId:', columnId);
    
    setVisibleColumns(prev => {
      // 7?7?7?87? 7?8y 7?8?7?7?7? 7?8?87?89
      const uniquePrev = prev.filter((id, idx) => prev.indexOf(id) === idx);
      const index = uniquePrev.indexOf(columnId);
      
      // 7?7?7? 8?7?8  7?87?8&8?7? 78y7? 8&8?7?8?7? 8~8y visibleColumns7R 7?7?8~8! 8~8y 7?88 8!7?8y7?
      if (index === -1) {
        const newColumns = [...uniquePrev, columnId];
        setTimeout(() => savePreferences(), 100);
        return newColumns;
      }
      
      // 7?7?7? 8?7?8  7?87?8&8?7? 8~8y 7?88 8!7?8y7?7R 87? 8y8&8?8  8 888! 87?7?8~8
      if (index === uniquePrev.length - 1) {
        debugLog('Cannot move down - already at bottom');
        return uniquePrev;
      }
      
      // 7?8 7?7?7 87?7?8&7? 7?7?8y7?7? 8?7?7?7?8y8 7?87?8&8?7? 8&7? 7?87?8&8?7? 7?87?7?88y
      const newColumns = [...uniquePrev];
      [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
      
      debugLog('Moved down:', columnId, 'New order:', newColumns);
      setTimeout(() => savePreferences(), 100);
      return newColumns;
    });
  }, [savePreferences]);

  // 7?8?7?8 7?7?7?8y7? 7?7?8y7?7? 87?7?8&7?7? 7?88&7?7?87?7?7?7? (8&7?7?8 7? 887?7?7?7)
  const moveDeductionColumnUp = useCallback((columnId) => {
    debugLog('moveDeductionColumnUp called with columnId:', columnId);
    debugLog('Current visibleDeductionColumns:', visibleDeductionColumns);
    setVisibleDeductionColumns(prev => {
      const index = prev.indexOf(columnId);
      debugLog('Found index:', index, 'for columnId:', columnId);
      if (index > 0) {
        const newColumns = [...prev];
        // ????? ????
        [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
        debugLog('Moved deduction up:', columnId, 'New order:', newColumns);
        setTimeout(() => savePreferences(), 100);
        return newColumns;
      }
      debugLog('Cannot move deduction up - already at top or not found');
      return prev;
    });
  }, [visibleDeductionColumns]);

  const moveDeductionColumnDown = useCallback((columnId) => {
    debugLog('moveDeductionColumnDown called with columnId:', columnId);
    debugLog('Current visibleDeductionColumns:', visibleDeductionColumns);
    setVisibleDeductionColumns(prev => {
      const index = prev.indexOf(columnId);
      debugLog('Found index:', index, 'for columnId:', columnId);
      if (index < prev.length - 1) {
        const newColumns = [...prev];
        // ????? ????
        [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
        debugLog('Moved deduction down:', columnId, 'New order:', newColumns);
        setTimeout(() => savePreferences(), 100);
        return newColumns;
      }
      debugLog('Cannot move deduction down - already at bottom or not found');
      return prev;
    });
  }, [visibleDeductionColumns]);

  // 7?8?7?8 7?8 7?8y8& 7?7?8&7?7? 7?88&7?7?87?7?7?7?
  const toggleDeductionColumnVisibility = (columnId) => {
    setVisibleDeductionColumns(prev => {
      if (prev.includes(columnId)) {
        return prev.filter(id => id !== columnId);
      }
      return [...prev, columnId];
    });
  };

  // إعادة تحميل الأعمدة عند العودة من نظام أعمدة الرواتب
  useEffect(() => {
    const handleFocus = () => {
      fetchEntitlementsColumns().then((columns) => {
        applyEntitlementsColumns(columns || []);
        loadPreferences();
      });
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchEntitlementsColumns, applyEntitlementsColumns]);

  // 7?7?8~8y7? 7?87?7?8&7?7? 7?8 7?789 7?880 is_visible 8&8  87?7?7?7? 7?87?8y7?8 7?7?
  useEffect(() => {
    if (dynamicColumns.length > 0 && visibleColumns.length > 0) {
      debugLog('Filtering columns based on is_visible from database...');
      debugLog('Current visibleColumns:', visibleColumns);
      debugLog('Dynamic columns with is_visible:', dynamicColumns.map(col => ({
        id: col.id,
        name: col.display_name_ar,
        is_visible: col.is_visible
      })));
      
      // 7?7?8~8y7? 7?87?7?8&7?7? 7?8 7?789 7?880 is_visible
      const filteredColumns = visibleColumns.filter(columnId => {
        const column = dynamicColumns.find(col => col.id === columnId);
        const isVisible = column ? column.is_visible !== 0 : true; // 7?8~7?7?7?7?8y true 887?7?8&7?7? 7?88&7?7?7?7?
        debugLog(`Column ${columnId} (${column?.display_name_ar}): is_visible=${column?.is_visible}, filtered=${isVisible}`);
        return isVisible;
      });
      
      debugLog('Filtered columns:', filteredColumns);
      
      if (filteredColumns.length !== visibleColumns.length) {
        debugLog('Updating visibleColumns due to visibility filter');
        setVisibleColumns(filteredColumns);
      }
    }
  }, [dynamicColumns]); // 7?7?7?87? visibleColumns 8&8  dependencies 87?7?8 7? loop

  // 7?8~7? 7?887?7?8y 7?8 7? 7?78y8y7? 7?7?7?8y7? 7?87?7?8&7?7? 8~8y 87?7?7?7? 7?87?8y7?8 7?7? 8~87? (7?7?8?8  localStorage)
  useEffect(() => {
    if (visibleColumns.length > 0 || visibleDeductionColumns.length > 0) {
      const timeout = setTimeout(() => {
        // 7?8~7? 8~8y 87?7?7?7? 7?87?8y7?8 7?7? 8~87?
        savePreferences();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [visibleColumns, visibleDeductionColumns, savePreferences]);

  useEffect(() => {
    if (entitlementsColumns.length > 0 && visibleColumns.length === 0) {
      const orderedColumns = entitlementsColumns
        .filter(col => col.is_visible !== 0)
        .sort((a, b) => (parseInt(a.display_order) || 0) - (parseInt(b.display_order) || 0));
      const columnOrder = orderedColumns
        .map(col => col.id)
        .filter((id, idx, arr) => arr.indexOf(id) === idx);
      if (columnOrder.length > 0) {
        setVisibleColumns(columnOrder);
      }
    }
  }, [entitlementsColumns.length, visibleColumns.length]);

  useEffect(() => {
    fetchDynamicColumns();
    fetchEntitlementsColumns().then((columns) => {
      applyEntitlementsColumns(columns || []);
      loadPreferences();
    });
  }, [fetchDynamicColumns, fetchEntitlementsColumns, applyEntitlementsColumns]);


  return {
    dynamicColumns,
    setDynamicColumns,
    entitlementsColumns,
    setEntitlementsColumns,
    deductionsColumns,
    setDeductionsColumns,
    columnVisibility,
    setColumnVisibility,
    visibleColumns,
    setVisibleColumns,
    visibleDeductionColumns,
    setVisibleDeductionColumns,
    weeklyMainColumns,
    toggleWeeklyMainColumn,
    moveWeeklyMainColumn,
    fetchDynamicColumns,
    fetchAllSalaryColumns,
    fetchEntitlementsColumns,
    fetchDeductionsColumns,
    toggleColumnVisibility,
    savePreferences,
    moveColumnUp,
    moveColumnDown,
    moveDeductionColumnUp,
    moveDeductionColumnDown,
    toggleDeductionColumnVisibility,
  };
}

export default useWeeklySalaryColumns;

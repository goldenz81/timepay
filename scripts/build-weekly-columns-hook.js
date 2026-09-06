/**
 * يستخرج منطق الأعمدة من PremiumWeeklySalary.js وينشئ useWeeklySalaryColumns.js
 * تشغيل مرة واحدة: node scripts/build-weekly-columns-hook.js
 */
const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '../src/pages/PremiumWeeklySalary.js');
const outPath = path.join(__dirname, '../src/hooks/salary/useWeeklySalaryColumns.js');

const lines = fs.readFileSync(pagePath, 'utf8').split(/\r?\n/);

// استخراج دوال الأعمدة: من fetchDynamicColumns حتى قبل Filter data
const startIdx = lines.findIndex((l) => l.includes('const fetchDynamicColumns = useCallback'));
const endIdx = lines.findIndex((l) => l.includes('// Filter data + sorting'));
if (startIdx < 0 || endIdx < 0) {
  console.error('Markers not found', { startIdx, endIdx });
  process.exit(1);
}

let body = lines.slice(startIdx, endIdx).join('\n');

// استبدالات داخل الجسم المستخرج
body = body.replace(
  /const fetchEntitlementsColumns = useCallback\(async \(\) => \{[\s\S]*?return \[\];\s*\}, \[\]\);/,
  `const fetchEntitlementsColumns = useCallback(async () => {
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
  }, []);`
);

body = body.replace(
  /const fetchDeductionsColumns = useCallback\(async \(\) => \{[\s\S]*?return \[\];\s*\}, \[\]\);/,
  `const fetchDeductionsColumns = useCallback(async () => {
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
  }, []);`
);

const header = `import { useState, useEffect, useCallback, useRef } from 'react';
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

export function useWeeklySalaryColumns({ toast, onRefreshData } = {}) {
  const [dynamicColumns, setDynamicColumns] = useState([]);
  const [entitlementsColumns, setEntitlementsColumns] = useState([]);
  const [deductionsColumns, setDeductionsColumns] = useState([]);
  const [customColumns, setCustomColumns] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [visibleDeductionColumns, setVisibleDeductionColumns] = useState([]);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isDeductionColumnManagerOpen, setIsDeductionColumnManagerOpen] = useState(false);
  const [isMainTableColumnManagerOpen, setIsMainTableColumnManagerOpen] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState(null);
  const [isBadgeColorModalOpen, setIsBadgeColorModalOpen] = useState(false);
  const [editingBadgeColumn, setEditingBadgeColumn] = useState(null);
  const [isMainTableBadgeColorModalOpen, setIsMainTableBadgeColorModalOpen] = useState(false);
  const [editingMainTableBadgeColumn, setEditingMainTableBadgeColumn] = useState(null);
  const [isImportColumnModalOpen, setIsImportColumnModalOpen] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [importableColumns, setImportableColumns] = useState([]);
  const [importMode, setImportMode] = useState('reference');

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

  useEffect(() => {
    if (editingBadgeColumn) debugLog('editingBadgeColumn updated:', editingBadgeColumn);
  }, [editingBadgeColumn]);

`;

const footer = `
  return {
    dynamicColumns,
    setDynamicColumns,
    entitlementsColumns,
    setEntitlementsColumns,
    deductionsColumns,
    setDeductionsColumns,
    customColumns,
    setCustomColumns,
    columnVisibility,
    setColumnVisibility,
    visibleColumns,
    setVisibleColumns,
    visibleDeductionColumns,
    setVisibleDeductionColumns,
    isColumnManagerOpen,
    setIsColumnManagerOpen,
    isDeductionColumnManagerOpen,
    setIsDeductionColumnManagerOpen,
    isMainTableColumnManagerOpen,
    setIsMainTableColumnManagerOpen,
    isBadgeColorModalOpen,
    setIsBadgeColorModalOpen,
    editingBadgeColumn,
    setEditingBadgeColumn,
    isMainTableBadgeColorModalOpen,
    setIsMainTableBadgeColorModalOpen,
    editingMainTableBadgeColumn,
    setEditingMainTableBadgeColumn,
    isImportColumnModalOpen,
    setIsImportColumnModalOpen,
    availableTables,
    selectedTable,
    setSelectedTable,
    importableColumns,
    importMode,
    weeklyMainColumns,
    toggleWeeklyMainColumn,
    moveWeeklyMainColumn,
    fetchDynamicColumns,
    fetchAllSalaryColumns,
    fetchEntitlementsColumns,
    fetchDeductionsColumns,
    fetchAvailableTables,
    fetchImportableColumns,
    importColumn,
    addCustomColumn,
    removeCustomColumn,
    toggleColumnVisibility,
    addColumnFromSystem,
    removeColumnFromDisplay,
    savePreferences,
    debouncedSave,
    loadPreferences,
    createDefaultPreferences,
    updateBadgeColor,
    resetPreferences,
    handleMoveColumn,
    handleToggleColumnVisibility,
    handleDeleteColumn,
    moveColumnUp,
    moveColumnDown,
    moveDeductionColumnUp,
    moveDeductionColumnDown,
    toggleDeductionColumnVisibility,
    addDeductionColumnFromSystem,
    removeDeductionColumnFromDisplay,
  };
}

export default useWeeklySalaryColumns;
`;

// استبدال fetchData() بـ onRefreshData?.()
body = body.replace(/\bfetchData\(\)/g, 'onRefreshData?.()');

const initEffect = `
  useEffect(() => {
    fetchDynamicColumns();
    fetchEntitlementsColumns().then((columns) => {
      setEntitlementsColumns(columns || []);
      loadPreferences();
    });
  }, [fetchDynamicColumns, fetchEntitlementsColumns]);

`;

const full = header + body + initEffect + footer;
fs.writeFileSync(outPath, full, 'utf8');
console.log('Wrote', outPath, 'lines:', full.split('\n').length);

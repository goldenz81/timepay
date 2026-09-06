import { getApiUrl } from '../apiUrlHelper';
import { debugLog, debugError } from '../debugLog';
import {
  DISCRIMINATION_INCENTIVE_COL_ID,
  DISCRIMINATION_INCENTIVE_REF_COLUMN,
  insertDiscriminationIncentiveInVisible,
  normalizeSalaryColumn,
} from './normalizeSalaryColumn';

/**
 * جلب وتحضير أعمدة المستحقات/المستقطعات عند فتح مودال التفاصيل.
 */
export async function prepareWeeklyDetailsColumns({
  fetchEntitlementsColumns,
  fetchDeductionsColumns,
  setVisibleColumns,
}) {
  let entitlementsCols = (await fetchEntitlementsColumns()).map(normalizeSalaryColumn).filter(Boolean);

  const referenceCols = entitlementsCols.filter(
    (col) =>
      col.type === 'reference' ||
      col.column_key === 'total_entitlements' ||
      col.display_name_ar === 'إجمالي المستحقات'
  );
  debugLog(
    'Reference columns in entitlementsCols (after normalizeColumn):',
    referenceCols.map((col) => ({
      id: col.id,
      name: col.display_name_ar,
      column_key: col.column_key,
      type: col.type,
    }))
  );

  const hasDiscriminationIncentive = entitlementsCols.some((col) => {
    const key = col.column_key || col.column_name || col.name;
    const name = col.display_name_ar || col.column_name_ar || '';
    return key === 'discrimination_incentive_allowance' || name === 'التمييز والحوافز';
  });

  if (!hasDiscriminationIncentive) {
    entitlementsCols.push({ ...DISCRIMINATION_INCENTIVE_REF_COLUMN });
    setVisibleColumns((prev) => insertDiscriminationIncentiveInVisible(prev, entitlementsCols));
  }

  const hasTotalEntitlements = entitlementsCols.some((col) => {
    const key = col.column_key || col.column_name || col.name;
    const name = col.display_name_ar || col.column_name_ar || '';
    return key === 'total_entitlements' || name === 'إجمالي المستحقات';
  });

  if (!hasTotalEntitlements) {
    try {
      const response = await fetch(
        getApiUrl(
          '/api/dynamic_system/dynamic_system_api.php?action=get_columns&table_name=weekly_wage_entitlements'
        )
      );
      const result = await response.json();
      if (result.success) {
        const totalEntitlementsCol = result.data.find((col) => {
          const key = col.column_key || col.column_name || col.name;
          const name = col.display_name_ar || col.column_name_ar || '';
          return key === 'total_entitlements' || name === 'إجمالي المستحقات';
        });
        if (totalEntitlementsCol) {
          entitlementsCols.push(normalizeSalaryColumn(totalEntitlementsCol));
          debugLog('Added total_entitlements column manually:', totalEntitlementsCol);
        }
      }
    } catch (error) {
      debugError('Error fetching total_entitlements column:', error);
    }
  }

  const deductionsCols = (await fetchDeductionsColumns()).map(normalizeSalaryColumn).filter(Boolean);

  debugLog('Loaded deductions columns in handleViewDetails:', deductionsCols);
  debugLog(
    'Loaded entitlements columns in handleViewDetails (including total_entitlements):',
    entitlementsCols.map((col) => ({
      id: col.id,
      name: col.display_name_ar || col.column_name_ar,
      column_key: col.column_key || col.column_name || col.name,
      type: col.type,
    }))
  );

  if (entitlementsCols.find((col) => col.id === DISCRIMINATION_INCENTIVE_COL_ID)) {
    setVisibleColumns((prev) => insertDiscriminationIncentiveInVisible(prev, entitlementsCols));
  }

  const totalEntitlementsAfterSet = entitlementsCols.find((col) => {
    if (!col) return false;
    const key = col.column_key || col.column_name || col.name;
    const name = col.display_name_ar || col.column_name_ar || '';
    return key === 'total_entitlements' || name === 'إجمالي المستحقات';
  });
  debugLog(
    '🔍 total_entitlements after setEntitlementsColumns:',
    totalEntitlementsAfterSet
      ? {
          id: totalEntitlementsAfterSet.id,
          name: totalEntitlementsAfterSet.display_name_ar,
          column_key: totalEntitlementsAfterSet.column_key,
          type: totalEntitlementsAfterSet.type,
          is_visible: totalEntitlementsAfterSet.is_visible,
        }
      : 'NOT FOUND'
  );

  return { entitlementsCols, deductionsCols };
}

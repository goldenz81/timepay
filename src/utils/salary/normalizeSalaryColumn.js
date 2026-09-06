/** توحيد شكل عمود الراتب كما تتوقعه الواجهة */
export function normalizeSalaryColumn(col) {
  if (!col) return null;
  return {
    id: col.id,
    display_name_ar: col.display_name_ar || col.column_name_ar || col.name || '',
    display_name_en: col.display_name_en || col.column_name_en || '',
    column_name: col.column_name || col.column_key || col.name || '',
    column_key: col.column_key || col.column_name || col.name || '',
    data_type: col.data_type || col.type || 'number',
    type: col.type || col.data_type || 'number',
    is_calculated: col.is_calculated ?? 0,
    is_editable: col.is_editable ?? 1,
    is_required: col.is_required ?? 0,
    is_active: (col.is_active ?? col.is_visible) ?? 1,
    is_visible: col.is_visible ?? 1,
    display_order: col.display_order ?? col.order ?? 0,
    table_id: col.table_id,
    table_name: col.table_name,
    table_display_name_ar: col.table_display_name_ar,
    badge_color: col.badge_color || 'blue',
    badge_variant: col.badge_variant || 'solid',
    is_currency: (col.is_currency ?? 0) ? 1 : 0,
  };
}

export const DISCRIMINATION_INCENTIVE_COL_ID = 'discrimination_incentive_allowance_ref';

export const DISCRIMINATION_INCENTIVE_REF_COLUMN = {
  id: DISCRIMINATION_INCENTIVE_COL_ID,
  display_name_ar: 'التمييز والحوافز',
  display_name_en: 'Discrimination and Incentives',
  column_name: 'discrimination_incentive_allowance',
  column_key: 'discrimination_incentive_allowance',
  data_type: 'decimal',
  type: 'reference',
  is_calculated: 0,
  is_editable: 0,
  is_required: 0,
  is_active: 1,
  is_visible: 1,
  display_order: 2,
  table_id: null,
  table_name: 'employees',
  table_display_name_ar: 'الموظفين',
  badge_color: 'orange',
  badge_variant: 'solid',
  is_currency: 1,
};

/** إدراج عمود التمييز والحوافز في visibleColumns عند الحاجة */
export function insertDiscriminationIncentiveInVisible(prev, entitlementsCols) {
  if (prev.includes(DISCRIMINATION_INCENTIVE_COL_ID)) return prev;

  const baseSalaryIndex = prev.findIndex((id) => {
    const col = entitlementsCols.find((c) => c.id === id);
    return col && (col.column_key === 'base_salary' || col.column_name === 'base_salary');
  });
  const hourlyWageIndex = prev.findIndex((id) => {
    const col = entitlementsCols.find((c) => c.id === id);
    return col && (col.column_key === 'hourly_wage' || col.column_name === 'hourly_wage');
  });

  const next = [...prev];
  if (baseSalaryIndex >= 0) {
    next.splice(baseSalaryIndex + 1, 0, DISCRIMINATION_INCENTIVE_COL_ID);
  } else if (hourlyWageIndex >= 0) {
    next.splice(hourlyWageIndex, 0, DISCRIMINATION_INCENTIVE_COL_ID);
  } else {
    next.unshift(DISCRIMINATION_INCENTIVE_COL_ID);
  }
  return next;
}

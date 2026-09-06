/** مفاتيح الأعمدة/الحقول المرتبطة ببدل الوجبة والانتظام */
export const MEAL_ALLOWANCE_FIELD_KEYS = new Set([
  'meal_allowance',
  'on_time_days',
  'on_time_days_calculation',
  'regularity_days',
  'regularity_pay',
  'punctuality_bonus',
  'attendance_bonus_value',
  'attendance_bonus',
  'meal_allowance_per_day',
]);

/** أسماء عربية لأعمدة الانتظام/الوجبة */
export const MEAL_ALLOWANCE_DISPLAY_NAMES = new Set([
  'أيام الانتظام',
  'أجر الانتظام',
  'حساب أيام الانتظام',
  'قيمة مكافأة الانتظام',
  'قيمة الانتظام',
  'مكافأة الانتظام',
  'الوجبة',
  'بدل الوجبة',
]);

export function parseSystemBooleanFlag(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  return !['0', 'false', 'no', 'off', 'disabled'].includes(normalized);
}

export function isMealAllowanceEnabled(settings) {
  if (!settings) return true;
  const raw = settings.mealAllowanceEnabled ?? settings.meal_allowance_enabled;
  return parseSystemBooleanFlag(raw, true);
}

function getMealColumnKey(column) {
  return (column?.column_key || column?.column_name || column?.name || column?.key || column?.id || '')
    .toString()
    .trim();
}

function getMealColumnNameAr(column) {
  return (column?.display_name_ar || column?.column_name_ar || '').toString().trim();
}

export function isMealAllowanceColumn(column, mealEnabled) {
  if (mealEnabled || !column) return false;

  const key = getMealColumnKey(column);
  const keyLower = key.toLowerCase();
  const nameAr = getMealColumnNameAr(column);

  if (MEAL_ALLOWANCE_FIELD_KEYS.has(key) || MEAL_ALLOWANCE_FIELD_KEYS.has(keyLower)) {
    return true;
  }
  if (MEAL_ALLOWANCE_DISPLAY_NAMES.has(nameAr)) {
    return true;
  }
  if (
    keyLower.includes('on_time')
    || keyLower.includes('regularity')
    || keyLower.includes('meal_allowance')
    || keyLower.includes('attendance_bonus')
  ) {
    return true;
  }
  if (nameAr.includes('انتظام') && !nameAr.includes('إجمالي')) {
    return true;
  }
  return false;
}

export function filterMealAllowanceColumns(columns, mealEnabled) {
  if (mealEnabled || !Array.isArray(columns)) return columns || [];
  return columns.filter((col) => !isMealAllowanceColumn(col, mealEnabled));
}

export function filterMealAllowanceFields(items, mealEnabled, getKey = (item) => item.key || item.id || item.column_key || item.column_name) {
  if (mealEnabled) return items;
  return items.filter((item) => !isMealAllowanceColumn({ column_key: getKey(item) }, mealEnabled));
}

export function filterMealAllowanceColumnIds(columnIds, columns, mealEnabled) {
  if (mealEnabled || !Array.isArray(columnIds)) return columnIds || [];
  const mealIdSet = new Set(
    (columns || []).filter((col) => isMealAllowanceColumn(col, mealEnabled)).map((col) => col.id)
  );
  return columnIds.filter((id) => !mealIdSet.has(id));
}

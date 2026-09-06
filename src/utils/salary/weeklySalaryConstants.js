export const WEEKLY_MAIN_COLUMNS_STORAGE_KEY = 'timepayWeeklySalaryMainColumns_v1';
export const LEGACY_WEEKLY_MAIN_COLUMNS_STORAGE_KEY = 'weeklyMainColumns';
export const WEEKLY_SALARY_MAIN_COLUMNS_SETTING_KEY = 'weekly_salary_main_columns_json';

export const WEEKLY_MAIN_TABLE_ALLOWED = [
  { key: 'employee_code', label: 'كود الموظف' },
  { key: 'name', label: 'الاسم' },
  { key: 'base_salary', label: 'الأساسي' },
  { key: 'total_entitlements', label: 'إجمالي المستحقات' },
  { key: 'total_deductions', label: 'إجمالي المستقطعات' },
  { key: 'net_salary', label: 'صافي المرتب' },
  { key: 'cost_center', label: 'مركز التكلفة' },
];

export const DEFAULT_WEEKLY_MAIN_COLUMNS = WEEKLY_MAIN_TABLE_ALLOWED.map((a) => ({
  id: a.key,
  label: a.label,
  visible: true,
}));

/** أسماء الأيام بالعربية (ترتيب dayjs: 0=الأحد … 6=السبت) */
export const DAY_NAME_AR_BY_DAYJS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

/** ترتيب أعمدة أسبوع الدفع: الجمعة → الخميس */
export const PAY_WEEK_COLUMN_LABELS = [
  'الجمعة',
  'السبت',
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
];

export const DETAILS_MODAL_BADGE_SCHEMES = new Set([
  'blue',
  'green',
  'red',
  'orange',
  'purple',
  'cyan',
  'teal',
  'pink',
  'yellow',
  'gray',
]);

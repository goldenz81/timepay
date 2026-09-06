/** إعدادات التخطيط: القائمة الجانبية، مسارات الصفحات، وعرض المحتوى */

export const SIDEBAR_COLLAPSED_LS = 'timepay_sidebar_collapsed';
export const SIDEBAR_COLLAPSED_WIDTH = '80px';

export const MENU_GROUPS = [
  {
    id: 'main',
    label: 'الرئيسية',
    items: [{ key: '/', label: 'لوحة التحكم' }],
  },
  {
    id: 'hr',
    label: 'الموارد البشرية',
    items: [
      { key: '/unified-employees', label: 'الموظفين' },
      { key: '/unified-attendance', label: 'الحضور والانصراف' },
      { key: '/departments', label: 'الأقسام' },
    ],
  },
  {
    id: 'finance',
    label: 'المالية',
    items: [
      { key: '/weekly-salary', label: 'الراتب الأسبوعي' },
      { key: '/monthly-salary', label: 'الراتب الشهري' },
      { key: '/advances', label: 'السلف' },
    ],
  },
  {
    id: 'system',
    label: 'النظام',
    items: [
      { key: '/dynamic-system-manager', label: 'أعمدة الرواتب' },
      { key: '/fingerprint-management', label: 'إدارة البصمة' },
      { key: '/system-settings', label: 'الإعدادات' },
    ],
  },
];

/** صفحات الجداول — عرض كامل بدون max-width */
export const FULL_WIDTH_PATHS = new Set([
  '/unified-employees',
  '/unified-attendance',
  '/weekly-salary',
  '/monthly-salary',
  '/advances',
]);

const CRUMB_HOME = { label: 'لوحة التحكم', path: '/' };

export const ROUTE_META = {
  '/': { title: 'لوحة التحكم', crumbs: [CRUMB_HOME] },
  '/unified-employees': {
    title: 'الموظفين',
    crumbs: [CRUMB_HOME, { label: 'الموظفين' }],
  },
  '/unified-attendance': {
    title: 'الحضور والانصراف',
    crumbs: [CRUMB_HOME, { label: 'الحضور والانصراف' }],
  },
  '/departments': {
    title: 'الأقسام',
    crumbs: [CRUMB_HOME, { label: 'الأقسام' }],
  },
  '/weekly-salary': {
    title: 'الراتب الأسبوعي',
    crumbs: [CRUMB_HOME, { label: 'المالية', path: null }, { label: 'الراتب الأسبوعي' }],
  },
  '/monthly-salary': {
    title: 'الراتب الشهري',
    crumbs: [CRUMB_HOME, { label: 'المالية', path: null }, { label: 'الراتب الشهري' }],
  },
  '/advances': {
    title: 'السلف',
    crumbs: [CRUMB_HOME, { label: 'المالية', path: null }, { label: 'السلف' }],
  },
  '/dynamic-system-manager': {
    title: 'نظام أعمدة الرواتب',
    crumbs: [CRUMB_HOME, { label: 'نظام أعمدة الرواتب' }],
  },
  '/fingerprint-management': {
    title: 'إدارة البصمة',
    crumbs: [CRUMB_HOME, { label: 'إدارة البصمة' }],
  },
  '/system-settings': {
    title: 'إعدادات النظام',
    crumbs: [CRUMB_HOME, { label: 'إعدادات النظام' }],
  },
  '/settings': {
    title: 'إعدادات النظام',
    crumbs: [CRUMB_HOME, { label: 'إعدادات النظام' }],
  },
  '/register-user': {
    title: 'تسجيل مستخدم',
    crumbs: [CRUMB_HOME, { label: 'تسجيل مستخدم' }],
  },
};

export const flatMenuItems = () => MENU_GROUPS.flatMap((g) => g.items);

export const normalizePath = (pathname) => {
  const p = pathname.replace(/\/$/, '');
  return p === '' ? '/' : p;
};

export const getRouteMeta = (pathname) => {
  const key = normalizePath(pathname);
  return ROUTE_META[key] || { title: 'TimePay', crumbs: [CRUMB_HOME, { label: 'الصفحة' }] };
};

export const isFullWidthPath = (pathname) => FULL_WIDTH_PATHS.has(normalizePath(pathname));

/** صفحات بتبويبات أفقية (إعدادات، إدارة البصمة) — نفس إطار التمرير والمسافات */
export const isSettingsPath = (pathname) => {
  const key = normalizePath(pathname);
  return (
    key === '/settings' ||
    key === '/system-settings' ||
    key === '/fingerprint-management' ||
    key === '/departments' ||
    key === '/dynamic-system-manager'
  );
};

export const isActiveMenuRoute = (itemKey, pathname) => {
  const key = normalizePath(pathname);
  if (itemKey === '/system-settings') {
    return key === '/settings' || key === '/system-settings';
  }
  if (itemKey === '/') return key === '/';
  return key === itemKey;
};

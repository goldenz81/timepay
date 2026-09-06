import { getApiBaseUrl } from './apiUrlHelper';

export const PAGE_BACKGROUND_TARGETS = {
  login: {
    label: 'خلفية صفحة الدخول',
    keys: {
      image: 'login_background_image',
      mode: 'login_background_mode',
      opacity: 'login_background_opacity',
    },
  },
  dashboard: {
    label: 'خلفية صفحات النظام',
    keys: {
      image: 'dashboard_background_image',
      mode: 'dashboard_background_mode',
      opacity: 'dashboard_background_opacity',
    },
  },
  header: {
    label: 'خلفية الهيدر',
    keys: {
      image: 'header_background_image',
      mode: 'header_background_mode',
      opacity: 'header_background_opacity',
    },
  },
  sidebar: {
    label: 'خلفية الشريط الجانبي',
    keys: {
      image: 'sidebar_background_image',
      mode: 'sidebar_background_mode',
      opacity: 'sidebar_background_opacity',
    },
  },
};

export const BG_MODE_LABELS = {
  cover: 'تغطية كاملة',
  fixed: 'ثابتة عند التمرير',
  'full-width': 'عرض كامل',
  repeat: 'تكرار',
  'no-repeat': 'بدون تكرار',
};

export const bgModeStyles = {
  cover: {
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundAttachment: 'scroll',
  },
  fixed: {
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  },
  'full-width': {
    backgroundSize: '100% auto',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundAttachment: 'scroll',
  },
  repeat: {
    backgroundSize: 'auto',
    backgroundRepeat: 'repeat',
    backgroundPosition: '0 0',
    backgroundAttachment: 'scroll',
  },
  'no-repeat': {
    backgroundSize: 'auto',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundAttachment: 'scroll',
  },
};

export const resolveBackgroundImageUrl = (path) => {
  if (!path || !String(path).trim()) return '';
  const trimmed = String(path).trim();
  if (trimmed.startsWith('http')) return trimmed;
  const base = getApiBaseUrl().replace(/\/$/, '');
  return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

export const parseBackgroundOpacity = (value, fallback = 100) =>
  Math.min(100, Math.max(0, parseInt(value, 10) || fallback));

export const readPageBackgroundFromSettings = (settings = {}, target = 'login') => {
  const keys = PAGE_BACKGROUND_TARGETS[target]?.keys;
  if (!keys) {
    return { image: '', mode: 'cover', opacity: 100 };
  }
  const base = {
    image: settings[keys.image] || '',
    mode: settings[keys.mode] || 'cover',
    opacity: parseBackgroundOpacity(settings[keys.opacity], 100),
  };
  return base;
};

export const readAllPageBackgroundsFromSettings = (settings = {}) => ({
  login: readPageBackgroundFromSettings(settings, 'login'),
  dashboard: readPageBackgroundFromSettings(settings, 'dashboard'),
  header: readPageBackgroundFromSettings(settings, 'header'),
  sidebar: readPageBackgroundFromSettings(settings, 'sidebar'),
});

export const buildBackgroundLayerStyle = (effectiveBg, options = {}) => {
  const { clipToZone = false } = options;
  const url = resolveBackgroundImageUrl(effectiveBg?.image);
  if (!url) return null;
  const mode = effectiveBg?.mode || 'cover';
  const modeStyle = bgModeStyles[mode] || bgModeStyles.cover;
  return {
    url,
    opacity: parseBackgroundOpacity(effectiveBg?.opacity, 100) / 100,
    style: {
      backgroundImage: `url("${url}")`,
      backgroundSize: modeStyle.backgroundSize,
      backgroundRepeat: modeStyle.backgroundRepeat,
      backgroundPosition: modeStyle.backgroundPosition,
      // fixed على طبقة الهيدر/الـ Sidebar يُرسَم على كامل الشاشة — نُبقيه scroll داخل المنطقة فقط
      backgroundAttachment: clipToZone ? 'scroll' : modeStyle.backgroundAttachment,
    },
  };
};

export const getZoneBackgroundLayerProps = (effectiveBg) => buildBackgroundLayerStyle(effectiveBg);

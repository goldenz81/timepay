import { DETAILS_MODAL_BADGE_SCHEMES } from './weeklySalaryConstants';

/** يطابق colorScheme مع Chakra حتى لا تُمرَّر أسماء ألوان من DB غير مدعومة */
export function normalizeDetailsModalBadgeScheme(raw, fallback = 'blue') {
  if (raw == null || raw === '' || raw === 'none') return fallback;
  const s = String(raw).toLowerCase();
  return DETAILS_MODAL_BADGE_SCHEMES.has(s) ? s : fallback;
}

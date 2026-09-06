/**
 * تحويل مفتاح/اسم الخط المحفوظ إلى اسم CSS (Google Fonts).
 * يدعم المفاتيح القديمة (ArefRuqaa) والأسماء الكاملة (Aref Ruqaa).
 */

const FONT_CSS_MAP = {
  Cairo: 'Cairo',
  Tajawal: 'Tajawal',
  Amiri: 'Amiri',
  Changa: 'Changa',
  Harmattan: 'Harmattan',
  Lalezar: 'Lalezar',
  Vibes: 'Vibes',
  Lateef: 'Lateef',
  Mirza: 'Mirza',
  Rubik: 'Rubik',
  Almarai: 'Almarai',
  Mada: 'Mada',
  Rasa: 'Rasa',
  Kufam: 'Kufam',
  Lemonada: 'Lemonada',
  Scheherazade: 'Scheherazade New',
  'Scheherazade New': 'Scheherazade New',
  NotoSansArabic: 'Noto Sans Arabic',
  'Noto Sans Arabic': 'Noto Sans Arabic',
  ElMessiri: 'El Messiri',
  'El Messiri': 'El Messiri',
  MarkaziText: 'Markazi Text',
  'Markazi Text': 'Markazi Text',
  ArefRuqaa: 'Aref Ruqaa',
  'Aref Ruqaa': 'Aref Ruqaa',
  ReemKufi: 'Reem Kufi',
  'Reem Kufi': 'Reem Kufi',
  AmiriQuran: 'Amiri Quran',
  'Amiri Quran': 'Amiri Quran',
  PlaypenSansArabic: 'Playpen Sans Arabic',
  'Playpen Sans Arabic': 'Playpen Sans Arabic',
  NotoNaskhArabic: 'Noto Naskh Arabic',
  'Noto Naskh Arabic': 'Noto Naskh Arabic',
  NotoKufiArabic: 'Noto Kufi Arabic',
  'Noto Kufi Arabic': 'Noto Kufi Arabic',
  IBMPlexSansArabic: 'IBM Plex Sans Arabic',
  'IBM Plex Sans Arabic': 'IBM Plex Sans Arabic',
  CairoPlay: 'Cairo Play',
  'Cairo Play': 'Cairo Play',
  'Baloo Bhaijaan 2': 'Baloo Bhaijaan 2',
  'Readex Pro': 'Readex Pro',
};

const FALLBACK_FONT = 'Cairo';
const FONT_STACK_SUFFIX = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif";

export const resolveFontFamilyCss = (fontKey) => {
  if (fontKey == null || fontKey === '' || fontKey === 'system') return null;
  const key = String(fontKey).trim();
  if (FONT_CSS_MAP[key]) return FONT_CSS_MAP[key];
  if (/^[A-Za-z][\w\s-]*$/.test(key)) return key;
  return FALLBACK_FONT;
};

export const applySystemFont = (fontKey) => {
  const fontFamilyValue = resolveFontFamilyCss(fontKey) || FALLBACK_FONT;
  const stack = `'${fontFamilyValue}', ${FONT_STACK_SUFFIX}`;
  document.documentElement.style.setProperty('--font-family', `'${fontFamilyValue}'`);
  document.body.style.fontFamily = stack;
  document.documentElement.style.fontFamily = stack;
  const root = document.getElementById('root');
  if (root) root.style.fontFamily = stack;
  return fontFamilyValue;
};

export const applyTableFont = (tableFontKey, systemFontKey) => {
  const resolved =
    tableFontKey === 'system'
      ? resolveFontFamilyCss(systemFontKey) || FALLBACK_FONT
      : resolveFontFamilyCss(tableFontKey) || FALLBACK_FONT;
  document.documentElement.style.setProperty(
    '--table-font-family',
    `'${resolved}', ${FONT_STACK_SUFFIX}`
  );
  return resolved;
};

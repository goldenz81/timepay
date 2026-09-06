/** سجلات التطوير فقط — لا تُطبع في production */
const isDev = process.env.NODE_ENV === 'development';

export const debugLog = (...args) => {
  if (isDev) console.log(...args);
};

export const debugWarn = (...args) => {
  if (isDev) console.warn(...args);
};

export const debugError = (...args) => {
  if (isDev) console.error(...args);
};

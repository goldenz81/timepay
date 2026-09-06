/**
 * Helper function to get API URL
 * Works in both development and production automatically
 * 
 * @param {string} path - API path (e.g., '/api/attendance_logs.php' or 'api/attendance_logs.php')
 * @returns {string} Full API URL
 * 
 * @example
 * getApiUrl('/api/attendance_logs.php') 
 * // Development: 'http://localhost/TimePay/api/attendance_logs.php'
 * // Production: 'https://yourdomain.com/api/attendance_logs.php'
 */
export const getApiUrl = (path) => {
  // Normalize path (ensure it starts with /)
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Priority 1: Check environment variable (if set)
  if (process.env.REACT_APP_API_BASE_URL) {
    const url = `${process.env.REACT_APP_API_BASE_URL}${cleanPath}`;
    console.log('[getApiUrl] Using REACT_APP_API_BASE_URL:', url);
    return url;
  }
  
  // Priority 2: Check window.location (most reliable for runtime detection)
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const origin = window.location.origin;

    // React dev server — API على AMPPS تحت /TimePay
    if (port === '3000') {
      const host =
        hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
          ? 'localhost'
          : hostname;
      const url = `http://${host}/TimePay${cleanPath}`;
      return url;
    }

    // Check if we're on localhost
    const isLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '' ||
      hostname === '::1';

    // If we're on localhost, use localhost API
    if (isLocalhost) {
      const url = `http://localhost/TimePay${cleanPath}`;
      return url;
    }

    // Otherwise, use the current origin (production)
    const url = `${origin}${cleanPath}`;
    return url;
  }
  
  // Priority 3: Fallback for server-side rendering or edge cases
  // In production build, NODE_ENV is 'production'
  if (process.env.NODE_ENV === 'production') {
    // Try to get origin from window if available
    if (typeof window !== 'undefined' && window.location) {
      const url = `${window.location.origin}${cleanPath}`;
      console.log('[getApiUrl] Production fallback, using:', url);
      return url;
    }
    // If window is not available, we can't determine the origin
    // This should not happen in browser environment
    console.warn('[getApiUrl] Window not available, returning relative path:', cleanPath);
    return cleanPath; // Return relative path as fallback
  }
  
  // Priority 4: Development fallback
  const url = `http://localhost/TimePay${cleanPath}`;
  console.log('[getApiUrl] Development fallback, using:', url);
  return url;
};

/**
 * Legacy function for backward compatibility
 * Use this if you need the full API base URL
 * Works the same way as getApiUrl() but returns only the base URL
 */
export const getApiBaseUrl = () => {
  // Always check window.location first (most reliable)
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const port = window.location.port;

    // React dev server (npm start) — الملفات الثابتة و API على AMPPS تحت /TimePay
    if (port === '3000') {
      const host =
        hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
          ? 'localhost'
          : hostname;
      return `http://${host}/TimePay`;
    }

    // Check if we're on localhost
    const isLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '' ||
      hostname === '::1';

    // If we're on localhost, use localhost API
    if (isLocalhost) {
      return 'http://localhost/TimePay';
    }

    // Otherwise, use the current origin (production)
    return window.location.origin;
  }
  
  // Fallback for server-side rendering or edge cases
  if (process.env.NODE_ENV === 'production') {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.origin;
    }
    return '';
  }
  
  // Development fallback
  return 'http://localhost/TimePay';
};


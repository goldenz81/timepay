/**
 * إعدادات API النظام الديناميكي
 * Dynamic System API Configuration
 */

// Base URL for the dynamic system API
// Use environment variable in production, fallback to localhost for development
const getBaseUrl = () => {
  if (process.env.REACT_APP_API_BASE_URL) {
    return `${process.env.REACT_APP_API_BASE_URL}/api/dynamic_system`;
  }
  if (process.env.NODE_ENV === 'production') {
    return `${window.location.origin}/api/dynamic_system`;
  }
  return 'http://localhost/TimePay/api/dynamic_system';
};

const DYNAMIC_SYSTEM_BASE_URL = getBaseUrl();

// API endpoints
export const DYNAMIC_SYSTEM_API = {
    BASE_URL: DYNAMIC_SYSTEM_BASE_URL,
    TABLES: `${DYNAMIC_SYSTEM_BASE_URL}/dynamic_system_api.php?action=get_tables`,
    COLUMNS: (tableId) => `${DYNAMIC_SYSTEM_BASE_URL}/dynamic_system_api.php?action=get_columns&table_id=${tableId}`,
    FORMULAS: `${DYNAMIC_SYSTEM_BASE_URL}/dynamic_system_api.php?action=get_formulas`,
    VARIABLES: `${DYNAMIC_SYSTEM_BASE_URL}/dynamic_system_api.php?action=get_variables`,
    CREATE_TABLE: `${DYNAMIC_SYSTEM_BASE_URL}/dynamic_system_api.php`,
    CREATE_COLUMN: `${DYNAMIC_SYSTEM_BASE_URL}/dynamic_system_api.php`,
    CREATE_FORMULA: `${DYNAMIC_SYSTEM_BASE_URL}/dynamic_system_api.php`,
    CREATE_VARIABLE: `${DYNAMIC_SYSTEM_BASE_URL}/dynamic_system_api.php`,
    TEST_FORMULA: `${DYNAMIC_SYSTEM_BASE_URL}/dynamic_system_api.php`,
    VALIDATE_FORMULA: `${DYNAMIC_SYSTEM_BASE_URL}/dynamic_system_api.php`,
    COLUMN_MAPPINGS: `${DYNAMIC_SYSTEM_BASE_URL}/dynamic_system_api.php`
};

// Helper function to make API calls
export const makeDynamicSystemApiCall = async (url, options = {}) => {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Dynamic System API Error:', error);
        throw error;
    }
};

// Helper function to create API call options
export const createApiOptions = (action, data = {}) => ({
    method: 'POST',
    body: JSON.stringify({ action, ...data })
});

export default DYNAMIC_SYSTEM_API;

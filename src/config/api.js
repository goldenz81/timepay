// API Configuration
// Use environment variable in production, fallback to localhost for development
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 
  (process.env.NODE_ENV === 'production' 
    ? window.location.origin 
    : 'http://localhost/TimePay');

// API Endpoints
export const API_ENDPOINTS = {
  // Settings
  LOAD_SETTINGS: `${API_BASE_URL}/api/load_system_settings.php`,
  SAVE_SETTING: `${API_BASE_URL}/api/save_setting.php`,
  SAVE_SYSTEM_SETTINGS: `${API_BASE_URL}/api/save_system_settings.php`,
  
  // Employees
  EMPLOYEES: `${API_BASE_URL}/api/unified_employees_api.php?action=get_employees`,
  SYNC_EMPLOYEE_NAMES: `${API_BASE_URL}/api/sync_employee_names.php`,
  
  // Attendance
  ATTENDANCE: `${API_BASE_URL}/api/attendance_logs.php`,
  GET_CALCULATION_SETTINGS: `${API_BASE_URL}/api/get_calculation_settings.php`,
  
  // Elements and Constants
  GET_ELEMENTS_ONLY: `${API_BASE_URL}/api/get_elements_only.php`,
  CONSTANT_VALUES: `${API_BASE_URL}/api/constant_values.php`,
  
  // Fingerprint
  FINGERPRINT_SYNC: `${API_BASE_URL}/api/fingerprint_sync.php`,
  GET_SETTINGS: `${API_BASE_URL}/api/get_settings.php`,
  
  // System
  UPLOAD_LOGO: `${API_BASE_URL}/api/upload_logo.php`,
  CLEAN_DATABASE: `${API_BASE_URL}/api/clean_database.php`,
  
  // Font and Settings
  FONT_SETTINGS: `${API_BASE_URL}/test_font_settings.php`,
  CHECK_DATABASE: `${API_BASE_URL}/check_database_structure.php`,
  TEST_FONT_SAVE: `${API_BASE_URL}/test_direct_font_save.php`,
  
  // Advanced Salary Calculation
  ADVANCED_SALARY_CALCULATION: `${API_BASE_URL}/api/advanced_salary_calculation.php`,
  UPDATE_SALARY_SETTINGS: `${API_BASE_URL}/api/update_salary_settings.php`,
  INITIALIZE_SALARY_SETTINGS: `${API_BASE_URL}/api/initialize_salary_settings.php`
};

// Helper function to get API URL
export const getApiUrl = (endpoint) => {
  return API_ENDPOINTS[endpoint] || `${API_BASE_URL}${endpoint}`;
};

// Legacy function for backward compatibility
export const buildApiUrl = (path) => {
  return `${API_BASE_URL}${path}`;
};

// Helper function for fetch with error handling
export const apiFetch = async (endpoint, options = {}) => {
  const url = typeof endpoint === 'string' && endpoint.startsWith('http') 
    ? endpoint 
    : getApiUrl(endpoint);
    
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
    
    return response;
  } catch (error) {
    console.error('API Fetch Error:', error);
    throw error;
  }
};

export default API_ENDPOINTS;
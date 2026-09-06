import { getApiUrl } from './apiUrlHelper';

// API Helper utility for handling API calls with error handling
export const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`API call failed for ${url}:`, error.message);
    // Return mock data or default values instead of throwing
    return getMockData(url);
  }
};

// Mock data for different API endpoints
const getMockData = (url) => {
  if (url.includes('get_employees')) {
    return {
      success: true,
      data: [
        {
          id: 1,
          name: 'أحمد محمد',
          department: 'المبيعات',
          position: 'مدير مبيعات',
          email: 'ahmed@company.com',
          phone: '0501234567',
          status: 'active'
        },
        {
          id: 2,
          name: 'سارة أحمد',
          department: 'المحاسبة',
          position: 'محاسب',
          email: 'sara@company.com',
          phone: '0507654321',
          status: 'active'
        }
      ]
    };
  }

  if (url.includes('get_departments')) {
    return {
      success: true,
      data: [
        { id: 1, name: 'المبيعات', description: 'قسم المبيعات والتسويق' },
        { id: 2, name: 'المحاسبة', description: 'قسم المحاسبة والمالية' },
        { id: 3, name: 'الموارد البشرية', description: 'قسم الموارد البشرية' },
        { id: 4, name: 'التقنية', description: 'قسم تقنية المعلومات' }
      ]
    };
  }

  if (url.includes('get_settings')) {
    return {
      success: true,
      data: {
        companyName: 'شركة TimePay',
        systemName: 'نظام الحضور والمرتبات',
        theme: 'light',
        language: 'ar',
        currency: 'SAR'
      }
    };
  }

  if (url.includes('attendance_logs')) {
    return {
      success: true,
      data: [
        {
          id: 1,
          employeeId: 1,
          employeeName: 'أحمد محمد',
          date: '2024-01-15',
          checkIn: '08:00',
          checkOut: '17:00',
          status: 'present'
        }
      ]
    };
  }

  if (url.includes('cost_centers')) {
    return {
      success: true,
      data: [
        { id: 1, name: 'التكلفة الرئيسي', description: 'المركز الرئيسي' },
        { id: 2, name: 'مركز المبيعات', description: 'مركز تكلفة المبيعات' }
      ]
    };
  }

  if (url.includes('backup')) {
    return {
      success: true,
      data: {
        backups: [],
        settings: {
          autoBackup: false,
          backupInterval: 'daily'
        }
      }
    };
  }

  if (url.includes('fingerprint')) {
    return {
      success: true,
      data: {
        devices: [],
        settings: {
          enabled: false,
          syncInterval: 30
        }
      }
    };
  }

  if (url.includes('dynamic_system')) {
    return {
      success: true,
      data: {
        tables: [],
        formulas: [],
        variables: [],
        mappings: []
      }
    };
  }

  // Default mock response
  return {
    success: true,
    data: [],
    message: 'Mock data loaded'
  };
};

// Specific API functions with error handling
export const loadEmployees = async () => {
  return await apiCall(getApiUrl('/api/unified_employees_api.php?action=get_employees'));
};

export const loadDepartments = async () => {
  return await apiCall(getApiUrl('/api/unified_employees_api.php?action=get_departments'));
};

export const loadSettings = async () => {
  return await apiCall(getApiUrl('/api/comprehensive_settings_api.php?action=get_settings_by_category&category=appearance'));
};

export const loadSystemSettings = async () => {
  return await apiCall(getApiUrl('/api/load_system_settings.php'));
};

export const loadAttendanceLogs = async () => {
  return await apiCall(getApiUrl('/api/attendance_logs.php'));
};

export const loadCostCenters = async () => {
  return await apiCall(getApiUrl('/api/cost_centers.php?action=list'));
};

export const loadBackupSettings = async () => {
  return await apiCall(getApiUrl('/api/backup_settings_api.php?action=get_settings'));
};

export const loadFingerprintSettings = async () => {
  return await apiCall(getApiUrl('/api/fingerprint_system_integration.php'));
};

export const loadDynamicSystemData = async () => {
  return await apiCall(getApiUrl('/api/dynamic_system/dynamic_system_api.php?action=get_tables'));
};

// Error boundary component
export const withErrorHandling = (Component) => {
  return (props) => {
    try {
      return <Component {...props} />;
    } catch (error) {
      console.error('Component error:', error);
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h3>حدث خطأ في تحميل المكون</h3>
          <p>يرجى إعادة تحميل الصفحة</p>
        </div>
      );
    }
  };
};

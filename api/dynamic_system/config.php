<?php
/**
 * إعدادات النظام الديناميكي
 * Dynamic System Configuration
 */

// تضمين إعدادات قاعدة البيانات الرئيسية
require_once __DIR__ . '/../config_unified.php';

// إعدادات النظام الديناميكي
define('DYNAMIC_SYSTEM_VERSION', '1.0.0');
define('DYNAMIC_SYSTEM_DEBUG', true);

// مسارات النظام
define('DYNAMIC_SYSTEM_PATH', __DIR__);
define('DYNAMIC_SYSTEM_API_PATH', DYNAMIC_SYSTEM_PATH . '/dynamic_system_api.php');
define('DYNAMIC_SYSTEM_ENGINE_PATH', DYNAMIC_SYSTEM_PATH . '/DynamicFormulaEngine.php');

// إعدادات المعادلات
define('MAX_FORMULA_LENGTH', 10000);
define('MAX_VARIABLE_NAME_LENGTH', 100);
define('MAX_TABLE_NAME_LENGTH', 100);

// أنواع البيانات المدعومة
$SUPPORTED_DATA_TYPES = [
    'number' => 'رقم',
    'text' => 'نص',
    'date' => 'تاريخ',
    'boolean' => 'منطقي',
    'currency' => 'عملة',
    'time' => 'وقت'
];

// أنواع المعادلات المدعومة
$SUPPORTED_FORMULA_TYPES = [
    'calculation' => 'حسابي',
    'validation' => 'تحقق',
    'display' => 'عرض'
];

// أنواع الإرجاع المدعومة
$SUPPORTED_RETURN_TYPES = [
    'number' => 'رقم',
    'text' => 'نص',
    'boolean' => 'منطقي',
    'currency' => 'عملة'
];

// فئات المتغيرات
$VARIABLE_CATEGORIES = [
    'salary' => 'راتب',
    'attendance' => 'حضور',
    'system' => 'نظام',
    'calculation' => 'حساب',
    'employee' => 'موظف',
    'department' => 'قسم'
];

// أنواع الجداول
$TABLE_TYPES = [
    'main' => 'رئيسي',
    'virtual' => 'افتراضي',
    'calculation' => 'حسابي'
];

// دوال مساعدة
function getSupportedDataTypes() {
    global $SUPPORTED_DATA_TYPES;
    return $SUPPORTED_DATA_TYPES;
}

function getSupportedFormulaTypes() {
    global $SUPPORTED_FORMULA_TYPES;
    return $SUPPORTED_FORMULA_TYPES;
}

function getSupportedReturnTypes() {
    global $SUPPORTED_RETURN_TYPES;
    return $SUPPORTED_RETURN_TYPES;
}

function getVariableCategories() {
    global $VARIABLE_CATEGORIES;
    return $VARIABLE_CATEGORIES;
}

function getTableTypes() {
    global $TABLE_TYPES;
    return $TABLE_TYPES;
}

// دالة تسجيل الأخطاء
function logDynamicSystemError($message, $context = []) {
    if (DYNAMIC_SYSTEM_DEBUG) {
        $logMessage = date('Y-m-d H:i:s') . " - Dynamic System Error: " . $message;
        if (!empty($context)) {
            $logMessage .= " - Context: " . json_encode($context);
        }
        error_log($logMessage);
    }
}

// دالة تسجيل العمليات
function logDynamicSystemAction($action, $details = []) {
    if (DYNAMIC_SYSTEM_DEBUG) {
        $logMessage = date('Y-m-d H:i:s') . " - Dynamic System Action: " . $action;
        if (!empty($details)) {
            $logMessage .= " - Details: " . json_encode($details);
        }
        error_log($logMessage);
    }
}

// دالة التحقق من صحة البيانات
function validateDynamicSystemData($data, $rules) {
    $errors = [];
    
    foreach ($rules as $field => $rule) {
        if (isset($rule['required']) && $rule['required'] && empty($data[$field])) {
            $errors[] = "الحقل {$field} مطلوب";
        }
        
        if (isset($rule['max_length']) && strlen($data[$field]) > $rule['max_length']) {
            $errors[] = "الحقل {$field} يجب أن يكون أقل من {$rule['max_length']} حرف";
        }
        
        if (isset($rule['type']) && $rule['type'] === 'number' && !is_numeric($data[$field])) {
            $errors[] = "الحقل {$field} يجب أن يكون رقماً";
        }
    }
    
    return $errors;
}

// دالة تنظيف البيانات
function sanitizeDynamicSystemData($data) {
    $sanitized = [];
    
    foreach ($data as $key => $value) {
        if (is_string($value)) {
            $sanitized[$key] = trim($value);
        } else {
            $sanitized[$key] = $value;
        }
    }
    
    return $sanitized;
}

// دالة التحقق من وجود الجداول
function checkDynamicSystemTables($pdo) {
    $requiredTables = [
        'dynamic_tables',
        'dynamic_columns',
        'dynamic_formulas',
        'column_formula_mappings',
        'system_variables'
    ];
    
    $missingTables = [];
    
    foreach ($requiredTables as $table) {
        try {
            $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
            if ($stmt->rowCount() === 0) {
                $missingTables[] = $table;
            }
        } catch (Exception $e) {
            $missingTables[] = $table;
        }
    }
    
    return $missingTables;
}

// دالة إرجاع استجابة JSON
function returnJsonResponse($success, $data = null, $message = '') {
    header('Content-Type: application/json; charset=utf-8');
    
    $response = [
        'success' => $success,
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    if ($message) {
        $response['message'] = $message;
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

// دالة إرجاع خطأ JSON
function returnJsonError($message, $code = 400) {
    http_response_code($code);
    returnJsonResponse(false, null, $message);
}

// دالة إرجاع نجاح JSON
function returnJsonSuccess($data = null, $message = '') {
    returnJsonResponse(true, $data, $message);
}

?>

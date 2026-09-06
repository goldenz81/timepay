<?php
/**
 * إعدادات الاختبار المشتركة
 * 
 * يحتوي على إعدادات ووظائف مشتركة لجميع ملفات الاختبار
 */

// إعدادات الاختبار
define('TEST_MODE', true);
define('TEST_LOG_FILE', __DIR__ . '/test_results.log');
define('TEST_DATA_DIR', __DIR__ . '/test_data/');

// إنشاء مجلد البيانات إذا لم يكن موجوداً
if (!is_dir(TEST_DATA_DIR)) {
    mkdir(TEST_DATA_DIR, 0755, true);
}

/**
 * تسجيل نتيجة اختبار
 */
function logTestResult($testName, $result, $details = []) {
    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'test_name' => $testName,
        'result' => $result,
        'details' => $details,
        'memory_usage' => memory_get_usage(true),
        'execution_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT']
    ];
    
    $logLine = json_encode($logEntry, JSON_UNESCAPED_UNICODE) . "\n";
    file_put_contents(TEST_LOG_FILE, $logLine, FILE_APPEND | LOCK_EX);
    
    return $logEntry;
}

/**
 * تنظيف بيانات الاختبار
 */
function cleanupTestData() {
    $files = glob(TEST_DATA_DIR . '*');
    foreach ($files as $file) {
        if (is_file($file)) {
            unlink($file);
        }
    }
}

/**
 * إنشاء بيانات اختبار وهمية
 */
function createTestData($type, $count = 1) {
    $testData = [];
    
    switch ($type) {
        case 'employee':
            for ($i = 0; $i < $count; $i++) {
                $testData[] = [
                    'name' => 'موظف اختبار ' . ($i + 1),
                    'employee_id' => 'TEST' . str_pad($i + 1, 3, '0', STR_PAD_LEFT),
                    'department' => 'قسم الاختبار',
                    'salary' => 5000 + ($i * 1000),
                    'hire_date' => date('Y-m-d', strtotime('-' . rand(1, 365) . ' days'))
                ];
            }
            break;
            
        case 'attendance':
            for ($i = 0; $i < $count; $i++) {
                $testData[] = [
                    'employee_id' => 'TEST' . str_pad($i + 1, 3, '0', STR_PAD_LEFT),
                    'date' => date('Y-m-d', strtotime('-' . rand(1, 30) . ' days')),
                    'check_in' => '08:00:00',
                    'check_out' => '17:00:00',
                    'status' => 'present'
                ];
            }
            break;
            
        case 'salary':
            for ($i = 0; $i < $count; $i++) {
                $testData[] = [
                    'employee_id' => 'TEST' . str_pad($i + 1, 3, '0', STR_PAD_LEFT),
                    'base_salary' => 5000 + ($i * 1000),
                    'bonus' => rand(0, 1000),
                    'deductions' => rand(0, 500),
                    'period' => date('Y-m')
                ];
            }
            break;
    }
    
    return $testData;
}

/**
 * مقارنة النتائج
 */
function compareResults($expected, $actual, $tolerance = 0.01) {
    if (is_array($expected) && is_array($actual)) {
        if (count($expected) !== count($actual)) {
            return false;
        }
        
        foreach ($expected as $key => $value) {
            if (!array_key_exists($key, $actual)) {
                return false;
            }
            
            if (is_numeric($value) && is_numeric($actual[$key])) {
                if (abs($value - $actual[$key]) > $tolerance) {
                    return false;
                }
            } else {
                if ($value !== $actual[$key]) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    return $expected === $actual;
}

/**
 * قياس الأداء
 */
function measurePerformance($callback) {
    $startTime = microtime(true);
    $startMemory = memory_get_usage(true);
    
    $result = $callback();
    
    $endTime = microtime(true);
    $endMemory = memory_get_usage(true);
    
    return [
        'result' => $result,
        'execution_time' => $endTime - $startTime,
        'memory_usage' => $endMemory - $startMemory,
        'peak_memory' => memory_get_peak_usage(true)
    ];
}

/**
 * إعدادات CORS للاختبار
 */
function setTestHeaders() {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    
    if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
        exit(0);
    }
}

/**
 * معلومات النظام للاختبار
 */
function getTestSystemInfo() {
    return [
        'php_version' => PHP_VERSION,
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
        'memory_limit' => ini_get('memory_limit'),
        'max_execution_time' => ini_get('max_execution_time'),
        'test_mode' => TEST_MODE,
        'test_directory' => __DIR__,
        'timestamp' => date('Y-m-d H:i:s')
    ];
}

// إعدادات افتراضية للاختبار
setTestHeaders();

// تسجيل بداية الاختبار
if (!isset($_GET['no_log'])) {
    logTestResult('test_start', 'info', [
        'request_uri' => $_SERVER['REQUEST_URI'],
        'request_method' => $_SERVER['REQUEST_METHOD'],
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
        'system_info' => getTestSystemInfo()
    ]);
}
?>

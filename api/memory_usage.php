<?php
// تضمين ملف CORS المشترك
require_once 'cors_headers.php';

// Get memory usage information
$memoryInfo = [];

// PHP memory usage
$memoryInfo['php_memory_usage'] = memory_get_usage(true);
$memoryInfo['php_memory_peak'] = memory_get_peak_usage(true);
$memoryInfo['php_memory_limit'] = ini_get('memory_limit');

// Convert bytes to MB
$memoryInfo['php_memory_usage_mb'] = round($memoryInfo['php_memory_usage'] / (1024 * 1024), 2);
$memoryInfo['php_memory_peak_mb'] = round($memoryInfo['php_memory_peak'] / (1024 * 1024), 2);

// Calculate memory usage percentage
$memoryLimitBytes = $memoryInfo['php_memory_usage'];
if (preg_match('/(\d+)(.)/', $memoryInfo['php_memory_limit'], $matches)) {
    $value = intval($matches[1]);
    $unit = strtoupper($matches[2]);
    
    switch ($unit) {
        case 'G':
            $memoryLimitBytes = $value * 1024 * 1024 * 1024;
            break;
        case 'M':
            $memoryLimitBytes = $value * 1024 * 1024;
            break;
        case 'K':
            $memoryLimitBytes = $value * 1024;
            break;
        default:
            $memoryLimitBytes = $value;
    }
}

$usagePercent = round(($memoryInfo['php_memory_usage'] / $memoryLimitBytes) * 100, 2);
$memoryInfo['usage_percent'] = $usagePercent;

// System memory info (if available)
if (function_exists('sys_getloadavg')) {
    $memoryInfo['system_load'] = sys_getloadavg();
}

// Determine status based on usage
if ($usagePercent < 50) {
    $status = 'connected';
    $message = $usagePercent . '% مستخدمة';
} elseif ($usagePercent < 80) {
    $status = 'warning';
    $message = $usagePercent . '% مستخدمة (تحذير)';
} else {
    $status = 'error';
    $message = $usagePercent . '% مستخدمة (حرج)';
}

$response = [
    'status' => $status,
    'message' => $message,
    'usage' => $usagePercent,
    'memory_info' => $memoryInfo,
    'timestamp' => date('Y-m-d H:i:s')
];

echo json_encode($response);
?>
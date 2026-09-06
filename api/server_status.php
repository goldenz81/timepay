<?php
// تضمين ملف CORS المشترك
require_once 'cors_headers.php';

// Check server status
$serverInfo = [
    'status' => 'online',
    'message' => 'الخادم يعمل بشكل طبيعي',
    'timestamp' => date('Y-m-d H:i:s'),
    'php_version' => phpversion(),
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
    'uptime' => 'Running',
    'load_average' => function_exists('sys_getloadavg') ? implode(', ', sys_getloadavg()) : 'N/A'
];

// Check if server is responsive
if (function_exists('apache_get_modules')) {
    $serverInfo['apache_modules'] = count(apache_get_modules());
}

// Check disk space
$diskFree = disk_free_space('.');
$diskTotal = disk_total_space('.');
if ($diskFree && $diskTotal) {
    $diskUsed = $diskTotal - $diskFree;
    $diskPercent = round(($diskUsed / $diskTotal) * 100, 2);
    $serverInfo['disk_usage'] = [
        'free' => round($diskFree / (1024 * 1024 * 1024), 2) . ' GB',
        'total' => round($diskTotal / (1024 * 1024 * 1024), 2) . ' GB',
        'used_percent' => $diskPercent . '%'
    ];
}

echo json_encode($serverInfo);
?>
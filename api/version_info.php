<?php
// تضمين ملف CORS المشترك
require_once 'cors_headers.php';

// Version information
$versionInfo = [
    'version' => '1.0.0',
    'build' => '2025.09.08',
    'last_updated' => '2025-09-08T10:00:00Z',
    'php_version' => phpversion(),
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
    'features' => [
        'attendance_management' => true,
        'payroll_calculation' => true,
        'backup_restore' => true,
        'system_monitoring' => true,
        'multi_language' => true
    ],
    'database_version' => 'MySQL 8.0+',
    'supported_formats' => [
        'date' => 'Gregorian',
        'time' => '12/24 hour',
        'currency' => 'EGP, USD, EUR'
    ]
];

echo json_encode([
    'success' => true,
    'version' => $versionInfo,
    'timestamp' => date('Y-m-d H:i:s')
]);
?>
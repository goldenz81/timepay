<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $config = require_once '../config/database_config.php';
    
    $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
    $username = $config['username'];
    $password = $config['password'];
    $options = $config['options'];
    
    $pdo = new PDO($dsn, $username, $password, $options);
    
    // التحقق من إعدادات البصمة
    $stmt = $pdo->prepare("SELECT * FROM system_settings WHERE setting_key = 'fingerprint_enabled'");
    $stmt->execute();
    $fingerprintEnabled = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // التحقق من الأجهزة المتصلة
    $stmt = $pdo->prepare("SELECT COUNT(*) as total_devices, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_devices FROM fingerprint_devices");
    $stmt->execute();
    $deviceStats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // التحقق من آخر مزامنة
    $stmt = $pdo->prepare("SELECT MAX(sync_date) as last_sync FROM fingerprint_attendance");
    $stmt->execute();
    $lastSync = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $status = 'offline';
    $message = 'أجهزة البصمة غير مفعلة';
    
    if ($fingerprintEnabled && $fingerprintEnabled['setting_value'] == '1') {
        if ($deviceStats['active_devices'] > 0) {
            $status = 'online';
            $message = 'أجهزة البصمة متصلة ومفعلة';
        } else {
            $status = 'warning';
            $message = 'البصمة مفعلة لكن لا توجد أجهزة نشطة';
        }
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'status' => $status,
            'message' => $message,
            'fingerprint_enabled' => $fingerprintEnabled ? (bool)$fingerprintEnabled['setting_value'] : false,
            'total_devices' => (int)$deviceStats['total_devices'],
            'active_devices' => (int)$deviceStats['active_devices'],
            'last_sync' => $lastSync['last_sync'] ?: null
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في تحميل حالة أجهزة البصمة: ' . $e->getMessage(),
        'data' => [
            'status' => 'error',
            'message' => 'خطأ في الاتصال',
            'fingerprint_enabled' => false,
            'total_devices' => 0,
            'active_devices' => 0,
            'last_sync' => null
        ]
    ]);
}
?>

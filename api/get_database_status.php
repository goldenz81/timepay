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
    
    // اختبار الاتصال بقاعدة البيانات
    $stmt = $pdo->query("SELECT 1");
    $test = $stmt->fetch();
    
    // التحقق من الجداول الأساسية
    $tables = ['employees', 'attendance_logs', 'departments', 'fingerprint_devices'];
    $existingTables = [];
    
    foreach ($tables as $table) {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($stmt->fetch()) {
            $existingTables[] = $table;
        }
    }
    
    // التحقق من عدد السجلات في الجداول الرئيسية
    $recordCounts = [];
    foreach ($existingTables as $table) {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$table`");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $recordCounts[$table] = (int)$result['count'];
    }
    
    $status = 'online';
    $message = 'قاعدة البيانات متصلة';
    
    if (count($existingTables) < count($tables)) {
        $status = 'warning';
        $message = 'بعض الجداول مفقودة';
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'status' => $status,
            'message' => $message,
            'connection' => true,
            'tables' => $existingTables,
            'record_counts' => $recordCounts,
            'total_tables' => count($existingTables),
            'expected_tables' => count($tables)
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في الاتصال بقاعدة البيانات: ' . $e->getMessage(),
        'data' => [
            'status' => 'error',
            'message' => 'خطأ في الاتصال',
            'connection' => false,
            'tables' => [],
            'record_counts' => [],
            'total_tables' => 0,
            'expected_tables' => 4
        ]
    ]);
}
?>

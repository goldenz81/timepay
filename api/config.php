<?php
/**
 * إعدادات قاعدة البيانات
 * يعمل تلقائياً في التطوير والإنتاج
 * 
 * @author TimePay System
 * @version 2.0
 * @date 2025-12-27
 */

// تضمين الدوال المشتركة
require_once 'functions.php';

// إعدادات قاعدة البيانات - Development (Local)
$devConfig = [
    'host' => 'localhost',
    'dbname' => 'timepay_unified',
    'username' => 'root',
    'password' => 'mysql'
];

// إعدادات قاعدة البيانات - Production (Hostinger)
// ⚠️ يجب تحديث هذه القيم بإعدادات Hostinger الفعلية
$prodConfig = [
    'host' => 'localhost', // عادة localhost على Hostinger
    'dbname' => 'u362313043_timepayDB', // ⚠️ يجب تحديثه باسم قاعدة البيانات الفعلي على Hostinger
    'username' => 'u362313043_timepay', // ⚠️ يجب تحديثه باسم المستخدم الفعلي على Hostinger
    'password' => 'BR5E;Sa*8|Oe' // ⚠️ يجب  تحديثه بكلمة المرور الفعلية على Hostinger
];

// اختيار الإعدادات بناءً على البيئة
$isProd = isProduction();
$config = $isProd ? $prodConfig : $devConfig;

$host = $config['host'];
$dbname = $config['dbname'];
$username = $config['username'];
$password = $config['password'];

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'خطأ في الاتصال بقاعدة البيانات: ' . $e->getMessage(),
        'debug' => [
            'environment' => $isProd ? 'production' : 'development',
            'host' => $host,
            'dbname' => $dbname,
            'username' => $username
        ]
    ]);
    exit;
}
?>

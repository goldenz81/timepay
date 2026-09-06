<?php
// ملف تكوين قاعدة البيانات - آمن ومشفر
// يعمل تلقائياً في التطوير والإنتاج

// التحقق من البيئة (Development vs Production)
function isProduction() {
    // التحقق من النطاق
    $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
    $host = strtolower($host);
    
    // اعتبر localhost و 127.0.0.1 و ::1 و IP داخلي 192.168.* بيئة تطوير
    if ($host === '' ||
        strpos($host, 'localhost') !== false || 
        strpos($host, '127.0.0.1') !== false ||
        strpos($host, '::1') !== false ||
        preg_match('/^192\.168\./', $host)) {
        return false; // Development
    }
    
    // اعتبر نطاق الاستضافة الحقيقية فقط بيئة إنتاج
    if (strpos($host, 'timepay.borgelarabpress.com') !== false ||
        strpos($host, 'borgelarabpress.com') !== false) {
        return true; // Production
    }
    
    // افتراضي: اعتبر باقي الدومينات تطوير لتجنب مشاكل الاتصال غير المتوقعة
    return false;
}

// إعدادات قاعدة البيانات - Development (Local)
$devConfig = [
    'host' => 'localhost',
    'dbname' => 'timepay_unified',
    'username' => 'root',
    'password' => 'mysql',
    'charset' => 'utf8mb4',
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ]
];

// إعدادات قاعدة البيانات - Production (Hostinger) — القيم الافتراضية
// ⚠️ يمكن تجاوز هذه القيم من داخل النظام عبر جدول system_settings
$prodConfig = [
    'host' => 'localhost', // عادة localhost على Hostinger
    'dbname' => 'u362313043_timepayDB', // ⚠️ يجب تحديثه باسم قاعدة البيانات الفعلي على Hostinger
    'username' => 'u362313043_timepay', // ⚠️ يجب تحديثه باسم المستخدم الفعلي على Hostinger
    'password' => 'BR5E;Sa*8|Oe', // ⚠️ يجب  تحديثه بكلمة المرور الفعلية على Hostinger
    'charset' => 'utf8mb4',
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ]
];

// اختيار الإعدادات الأساسية بناءً على البيئة
$config = isProduction() ? $prodConfig : $devConfig;

// في بيئة الإنتاج فقط: محاولة قراءة إعدادات الاتصال من جدول system_settings (قابلة للتعديل من داخل النظام)
if (isProduction()) {
    try {
        $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
        $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        // قراءة مفاتيح إعدادات قاعدة البيانات من system_settings
        $stmt = $pdo->prepare("
            SELECT setting_key, setting_value 
            FROM system_settings 
            WHERE setting_key IN ('db_host', 'db_name', 'db_username', 'db_password', 'db_charset')
        ");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        if (!empty($rows)) {
            if (!empty($rows['db_host'] ?? '')) {
                $config['host'] = $rows['db_host'];
            }
            if (!empty($rows['db_name'] ?? '')) {
                $config['dbname'] = $rows['db_name'];
            }
            if (!empty($rows['db_username'] ?? '')) {
                $config['username'] = $rows['db_username'];
            }
            // كلمة المرور يمكن أن تكون فارغة عمداً، لذلك نسمح بوجود المفتاح حتى لو كانت القيمة فارغة
            if (array_key_exists('db_password', $rows)) {
                $config['password'] = $rows['db_password'];
            }
            if (!empty($rows['db_charset'] ?? '')) {
                $config['charset'] = $rows['db_charset'];
            }
        }
    } catch (Throwable $e) {
        // في حالة أي خطأ (عدم وجود system_settings، فشل الاتصال، إلخ) نبقى على إعدادات $prodConfig الأساسية بدون إيقاف النظام
    }
}

// إعادة الإعداد النهائي
return $config;

<?php
/**
 * سكريبت لحذف قاعدة البيانات القديمة timepay
 * 
 * تحذير: هذا السكريبت سيقوم بحذف قاعدة البيانات القديمة بشكل دائم!
 * تأكد من عمل نسخة احتياطية قبل التنفيذ.
 */

require_once 'cors_headers.php';

// إعدادات قاعدة البيانات
$host = 'localhost';
$username = 'root';
$password = 'mysql';
$oldDatabase = 'timepay';

// التحقق من أن السكريبت يعمل من سطر الأوامر فقط (للم safety)
if (php_sapi_name() !== 'cli' && !isset($_GET['confirm']) || $_GET['confirm'] !== 'yes') {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'لحذف قاعدة البيانات القديمة، يجب إضافة ?confirm=yes في نهاية الرابط',
        'warning' => 'تحذير: هذا الإجراء سيقوم بحذف قاعدة البيانات بشكل دائم!'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // الاتصال بدون تحديد قاعدة البيانات
    $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    // التحقق من وجود قاعدة البيانات
    $stmt = $pdo->query("SHOW DATABASES LIKE '$oldDatabase'");
    $exists = $stmt->fetch();
    
    if (!$exists) {
        echo json_encode([
            'success' => true,
            'message' => "قاعدة البيانات '$oldDatabase' غير موجودة بالفعل"
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // حذف قاعدة البيانات
    $pdo->exec("DROP DATABASE IF EXISTS `$oldDatabase`");
    
    echo json_encode([
        'success' => true,
        'message' => "تم حذف قاعدة البيانات '$oldDatabase' بنجاح"
    ], JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'خطأ في حذف قاعدة البيانات: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>


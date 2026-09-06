<?php
// تضمين ملف CORS المشترك
require_once 'cors_headers.php';

// إعدادات قاعدة البيانات
$host = 'localhost';
$database = 'timepay_unified';
$username = 'root';
$password = 'mysql';

try {
    // الاتصال بقاعدة البيانات
    $pdo = new PDO("mysql:host=$host;dbname=$database;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // جلب إعدادات الحسابات من system_settings
    $stmt = $pdo->query("SELECT setting_key, setting_value FROM system_settings WHERE category IN ('calculation', 'egypt_salary', 'salary', 'allowance', 'penalty', 'insurance', 'tax', 'system')");
    $calculationSettings = $stmt->fetchAll();
    
    // جلب أوقات العمل من system_settings
    $stmt = $pdo->query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('work_start_time', 'work_end_time')");
    $workTimeSettings = $stmt->fetchAll();
    
    // تحويل إلى مصفوفة مفاتيح
    $settingsArray = [];
    
    // إضافة إعدادات الحسابات
    foreach ($calculationSettings as $setting) {
        $settingsArray[$setting['setting_key']] = $setting['setting_value'];
    }
    
    // إضافة أوقات العمل من system_settings
    foreach ($workTimeSettings as $setting) {
        $settingsArray[$setting['setting_key']] = $setting['setting_value'];
    }
    
    echo json_encode([
        'success' => true,
        'data' => $settingsArray
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * دالة مساعدة لجلب إعداد معين
 */
function getSetting($pdo, $key, $default = null) {
    try {
        $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = ?");
        $stmt->execute([$key]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['setting_value'] : $default;
    } catch (Exception $e) {
        return $default;
    }
}
?>

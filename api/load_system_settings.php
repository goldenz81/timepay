<?php
/**
 * API لتحميل إعدادات النظام
 * 
 * @author TimePay System
 * @version 1.0
 * @date 2025-09-19
 */

require_once 'cors_headers.php';

// إضافة headers لمسح cache
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// إعداد قاعدة البيانات
require_once 'config_unified.php';
require_once 'feature_flags.php';

try {
    ensureMealAllowanceEnabledVariable($pdo);
    // الحصول على جميع الإعدادات من النظام الجديد
    $stmt = $pdo->query("SELECT variable_key, variable_value FROM system_variables WHERE is_active = 1");
    $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    echo json_encode([
        'success' => true,
        'settings' => $settings
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'خطأ في تحميل الإعدادات: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>

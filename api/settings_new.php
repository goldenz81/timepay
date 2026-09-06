<?php
/**
 * API للإعدادات الجديدة
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

try {
    // الحصول على اسم الشركة من النظام الجديد
    $stmt = $pdo->query("SELECT variable_value FROM system_variables WHERE variable_key = 'company_name' AND is_active = 1");
    $company_name = $stmt->fetchColumn() ?: 'TimePay';
    
    echo json_encode([
        'success' => true,
        'data' => [
            'company_name' => $company_name
        ]
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'خطأ في تحميل الإعدادات: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>

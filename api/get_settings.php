<?php
/**
 * API للحصول على إعدادات النظام
 * 
 * @author TimePay System
 * @version 1.0
 * @date 2025-09-10
 */

require_once 'cors_headers.php';

// إعداد قاعدة البيانات
require_once 'config_unified.php';

try {
    // الحصول على جميع الإعدادات (النظام الجديد)
    $stmt = $pdo->query("SELECT variable_key, variable_value FROM system_variables WHERE is_active = 1");
    $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    // إعدادات افتراضية في حالة عدم وجودها
    $defaultSettings = [
        'system_name' => 'نظام الحضور والمرتبات والأجور',
        'company_name' => 'شركة برج العرب',
        'currency' => 'EGP',
        'timezone' => 'Africa/Cairo',
        'time_format' => '12',
        'city' => 'Alexandria',
        'work_start_time' => '08:30',
        'work_end_time' => '18:30',
        'insurance_rate' => '14',
        'meal_allowance' => '50',
        'auto_backup' => 'false',
        'backup_frequency' => 'daily',
        'backup_time' => '02:00',
        'time_edit_lock' => '2025-09-04 10:59:21',
        'fingerprint_enabled' => 'false',
        'fingerprint_auto_sync' => 'true',
        'fingerprint_sync_interval' => '5',
        'fingerprint_timeout' => '30',
        'fingerprint_retry_attempts' => '3',
        'fingerprint_backup_enabled' => 'true'
    ];
    
    // دمج الإعدادات مع الافتراضية
    $mergedSettings = array_merge($defaultSettings, $settings);
    
    echo json_encode([
        'success' => true,
        'settings' => $mergedSettings,
        'message' => 'تم تحميل الإعدادات بنجاح'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في تحميل الإعدادات: ' . $e->getMessage()
    ]);
}
?>

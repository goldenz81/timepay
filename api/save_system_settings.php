<?php
/**
 * API لحفظ إعدادات النظام
 * 
 * @author TimePay System
 * @version 1.0
 * @date 2025-01-19
 */

require_once 'cors_headers.php';

// إعداد قاعدة البيانات
require_once 'config.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['settings'])) {
        throw new Exception('بيانات الإعدادات مطلوبة');
    }
    
    $settings = $input['settings'];
    $savedCount = 0;
    
    foreach ($settings as $key => $value) {
        // التحقق من وجود الإعداد
        $stmt = $pdo->prepare("SELECT id FROM system_settings WHERE setting_key = ?");
        $stmt->execute([$key]);
        
        if ($stmt->rowCount() > 0) {
            // تحديث الإعداد الموجود
            $stmt = $pdo->prepare("UPDATE system_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?");
            $stmt->execute([$value, $key]);
        } else {
            // إضافة إعداد جديد
            $stmt = $pdo->prepare("INSERT INTO system_settings (setting_key, setting_value, created_at, updated_at) VALUES (?, ?, NOW(), NOW())");
            $stmt->execute([$key, $value]);
        }
        
        $savedCount++;
    }
    
    echo json_encode([
        'success' => true,
        'message' => "تم حفظ $savedCount إعداد بنجاح",
        'saved_count' => $savedCount
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في حفظ الإعدادات: ' . $e->getMessage()
    ]);
}
?>
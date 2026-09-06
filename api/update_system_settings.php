<?php
/**
 * API لتحديث إعدادات النظام
 * 
 * @author TimePay System
 * @version 1.0
 * @date 2025-09-26
 */

require_once 'cors_headers.php';

// إضافة headers لمسح cache
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// إعداد قاعدة البيانات
require_once 'config_unified.php';

try {
    // التحقق من نوع الطلب
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('طريقة الطلب غير صحيحة');
    }
    
    // قراءة البيانات المرسلة
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('بيانات غير صحيحة');
    }
    
    $action = $input['action'] ?? '';
    
    if ($action === 'update_multiple_settings') {
        $settings = $input['settings'] ?? [];
        
        if (empty($settings)) {
            throw new Exception('لا توجد إعدادات للتحديث');
        }
        
        $updatedCount = 0;
        
        foreach ($settings as $setting) {
            $key = $setting['key'] ?? '';
            $value = $setting['value'] ?? '';
            
            if (empty($key)) {
                continue;
            }
            
            // التحقق من وجود الإعداد
            $stmt = $pdo->prepare("SELECT id FROM system_variables WHERE variable_key = ?");
            $stmt->execute([$key]);
            $exists = $stmt->fetch();
            
            if ($exists) {
                // تحديث الإعداد الموجود
                $stmt = $pdo->prepare("UPDATE system_variables SET variable_value = ?, updated_at = NOW() WHERE variable_key = ?");
                $stmt->execute([$value, $key]);
            } else {
                // إضافة إعداد جديد
                $stmt = $pdo->prepare("
                    INSERT INTO system_variables 
                    (variable_key, variable_name_ar, variable_name_en, variable_value, variable_type, 
                     category, is_editable, is_required, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 'text', 'general', 1, 0, 1, NOW(), NOW())
                ");
                $stmt->execute([$key, $key, $key, $value]);
            }
            
            $updatedCount++;
        }
        
        echo json_encode([
            'success' => true,
            'message' => "تم تحديث $updatedCount إعداد بنجاح",
            'updated_count' => $updatedCount
        ], JSON_UNESCAPED_UNICODE);
        
    } else {
        throw new Exception('إجراء غير صحيح');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>

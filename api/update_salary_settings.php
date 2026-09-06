<?php
/**
 * API لتحديث إعدادات الحساب
 * Update Salary Calculation Settings API
 */

require_once 'cors_headers.php';

require_once 'config_unified.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? '';
    
    switch ($action) {
        case 'update_setting':
            $settingKey = $input['setting_key'] ?? '';
            $settingValue = $input['setting_value'] ?? '';
            $description = $input['description'] ?? '';
            $settingType = $input['setting_type'] ?? 'percentage';
            $category = $input['category'] ?? 'general';
            $isEnabled = $input['is_enabled'] ?? 1;
            $displayOrder = $input['display_order'] ?? 0;
            
            if (empty($settingKey)) {
                throw new Exception('مفتاح الإعداد مطلوب');
            }
            
            // التحقق من وجود الإعداد
            $stmt = $pdo->prepare("SELECT id FROM system_settings WHERE setting_key = ?");
            $stmt->execute([$settingKey]);
            $exists = $stmt->fetch();
            
            if ($exists) {
                // تحديث الإعداد الموجود
                $stmt = $pdo->prepare("
                    UPDATE system_settings 
                    SET setting_value = ?, description = ?, setting_type = ?, 
                        category = ?, updated_at = NOW()
                    WHERE setting_key = ?
                ");
                $stmt->execute([$settingValue, $description, $settingType, $category, $settingKey]);
            } else {
                // إدراج إعداد جديد
                $stmt = $pdo->prepare("
                    INSERT INTO system_settings 
                    (setting_key, setting_name, setting_value, description, setting_type, category, is_editable, is_required) 
                    VALUES (?, ?, ?, ?, ?, ?, 1, 0)
                ");
                $settingName = ucwords(str_replace('_', ' ', $settingKey));
                $stmt->execute([$settingKey, $settingName, $settingValue, $description, $settingType, $category]);
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'تم تحديث الإعداد بنجاح'
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_all_settings':
            $stmt = $pdo->query("
                SELECT * FROM system_settings 
                WHERE category IN ('calculation', 'egypt_salary', 'salary', 'allowance', 'penalty', 'insurance', 'tax', 'system')
                ORDER BY category, setting_key
            ");
            $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => $settings
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'delete_setting':
            $settingKey = $input['setting_key'] ?? '';
            
            if (empty($settingKey)) {
                throw new Exception('مفتاح الإعداد مطلوب');
            }
            
            $stmt = $pdo->prepare("DELETE FROM system_settings WHERE setting_key = ?");
            $stmt->execute([$settingKey]);
            
            echo json_encode([
                'success' => true,
                'message' => 'تم حذف الإعداد بنجاح'
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_categories':
            $stmt = $pdo->query("
                SELECT DISTINCT category 
                FROM system_settings 
                WHERE category IN ('calculation', 'egypt_salary', 'salary', 'allowance', 'penalty', 'insurance', 'tax', 'system')
                ORDER BY category
            ");
            $categories = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            echo json_encode([
                'success' => true,
                'data' => $categories
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        default:
            echo json_encode([
                'success' => false,
                'error' => 'إجراء غير صحيح'
            ], JSON_UNESCAPED_UNICODE);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'خطأ في تحديث الإعدادات: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>

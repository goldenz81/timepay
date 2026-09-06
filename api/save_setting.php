<?php
// تضمين ملف CORS المشترك
require_once 'cors_headers.php';

// إعداد قاعدة البيانات
require_once 'config_unified.php';

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['key']) || !isset($input['value'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Missing required parameters',
            'received_input' => $input
        ]);
        exit;
    }
    
    $key = $input['key'];
    $value = $input['value'];
    
    // Convert boolean values to 1/0 for database storage
    $originalValue = $value;
    if ($value === true || $value === 'true') {
        $value = '1';
    } elseif ($value === false || $value === 'false') {
        $value = '0';
    }
    
    error_log("Save Setting: $key = $originalValue -> $value");
    
    // Special logging for font_family
    if ($key === 'font_family') {
        error_log("=== FONT SAVE DEBUG ===");
        error_log("Font key: $key");
        error_log("Font value: $value");
        error_log("Original value: $originalValue");
        error_log("=======================");
    }
    
    // حذف أي إعدادات قديمة قد تكون موجودة (النظام الجديد)
    if ($key === 'work_start_time') {
        $stmt = $pdo->prepare("DELETE FROM system_variables WHERE variable_key = 'workStartTime'");
        $stmt->execute();
    }
    if ($key === 'work_end_time') {
        $stmt = $pdo->prepare("DELETE FROM system_variables WHERE variable_key = 'workEndTime'");
        $stmt->execute();
    }
    
    // Check if setting exists (النظام الجديد)
    $stmt = $pdo->prepare("SELECT id FROM system_variables WHERE variable_key = ?");
    $stmt->execute([$key]);
    
    if ($stmt->rowCount() > 0) {
        // Update existing setting
        $stmt = $pdo->prepare("UPDATE system_variables SET variable_value = ?, updated_at = NOW() WHERE variable_key = ?");
        $result = $stmt->execute([$value, $key]);
        
        if ($key === 'font_family') {
            error_log("Font UPDATE executed: " . ($result ? 'SUCCESS' : 'FAILED'));
            error_log("Rows affected: " . $stmt->rowCount());
        }
    } else {
        // Insert new setting
        $stmt = $pdo->prepare("INSERT INTO system_variables (variable_key, variable_name_ar, variable_name_en, variable_value, variable_type, category, is_editable, is_required, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 'text', 'general', 1, 0, 1, NOW(), NOW())");
        $result = $stmt->execute([$key, $key, $key, $value]);
        
        if ($key === 'font_family') {
            error_log("Font INSERT executed: " . ($result ? 'SUCCESS' : 'FAILED'));
            error_log("Rows affected: " . $stmt->rowCount());
        }
    }
    
    // Verify the save for font_family
    if ($key === 'font_family') {
        $verifyStmt = $pdo->prepare("SELECT variable_value FROM system_variables WHERE variable_key = ?");
        $verifyStmt->execute([$key]);
        $savedValue = $verifyStmt->fetchColumn();
        error_log("Font verification - Saved value: $savedValue");
    }
    
    // مزامنة أوقات العمل مع الإعدادات المتقدمة
    if ($key === 'work_start_time' || $key === 'work_end_time') {
        try {
            // تحويل من HH:MM إلى عشري
            function timeToDecimal($time) {
                list($hours, $minutes) = explode(':', $time);
                return floatval($hours) + (floatval($minutes) / 60);
            }
            
            $decimalValue = timeToDecimal($value);
            
            // تحديث الإعدادات المتقدمة
            $stmt = $pdo->prepare("
                INSERT INTO salary_calculation_settings (setting_key, setting_value, description, setting_type, is_enabled, category, display_order, updated_at) 
                VALUES (?, ?, ?, 'time', 1, 'جدولة العمل', ?, NOW())
                ON DUPLICATE KEY UPDATE 
                    setting_value = VALUES(setting_value),
                    updated_at = NOW()
            ");
            
            $description = $key === 'work_start_time' ? 'وقت بداية العمل الرسمي (ساعة:دقيقة)' : 'وقت انتهاء العمل الرسمي (ساعة:دقيقة)';
            $displayOrder = $key === 'work_start_time' ? 1 : 2;
            
            $stmt->execute([$key, $decimalValue, $description, $displayOrder]);
            
            error_log("تم مزامنة $key مع الإعدادات المتقدمة: $value -> $decimalValue");
            
        } catch (Exception $e) {
            error_log("خطأ في مزامنة أوقات العمل: " . $e->getMessage());
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Setting saved successfully',
        'key' => $key,
        'value' => $value
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>

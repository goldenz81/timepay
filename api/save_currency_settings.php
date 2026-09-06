<?php
/**
 * API لحفظ إعدادات العملة
 * تم إنشاؤه في: 2025-01-27
 */

require_once "cors_headers.php";
require_once "config_unified.php";

try {
    $input = json_decode(file_get_contents("php://input"), true);
    
    if (!$input || !isset($input["settings"])) {
        throw new Exception("بيانات غير صحيحة");
    }
    
    $settings = $input["settings"];
    $results = [];
    
    $pdo->beginTransaction();
    
    try {
        foreach ($settings as $key => $value) {
            if (strpos($key, "currency.") === 0) {
                $stmt = $pdo->prepare("
                    INSERT INTO system_settings (setting_key, setting_value, setting_type) 
                    VALUES (?, ?, "string")
                    ON DUPLICATE KEY UPDATE 
                        setting_value = VALUES(setting_value),
                        updated_at = CURRENT_TIMESTAMP
                ");
                
                $stmt->execute([$key, $value]);
                $results[$key] = "saved";
            }
        }
        
        $pdo->commit();
        
        echo json_encode([
            "success" => true,
            "message" => "تم حفظ إعدادات العملة بنجاح",
            "results" => $results
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "خطأ في حفظ إعدادات العملة: " . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
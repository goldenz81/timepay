<?php
/**
 * API لإدارة إعدادات العملة الموحدة
 * تم إنشاؤه في: 2025-01-27
 */

require_once "cors_headers.php";
require_once "config_unified.php";

try {
    $action = $_GET["action"] ?? $_POST["action"] ?? "";
    
    switch ($action) {
        case "get_currency_config":
            getCurrencyConfig();
            break;
        case "update_currency_config":
            updateCurrencyConfig();
            break;
        default:
            throw new Exception("إجراء غير صحيح");
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

function getCurrencyConfig() {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("
            SELECT setting_value 
            FROM system_settings 
            WHERE setting_key = "currency_config"
        ");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            $config = json_decode($result["setting_value"], true);
        } else {
            // إعدادات افتراضية
            $config = [
                "enabled" => true,
                "symbol" => "ج.م",
                "name" => "جنيه مصري",
                "code" => "EGP",
                "position" => "after",
                "decimals" => 0,
                "thousands_separator" => ",",
                "decimal_separator" => ".",
                "format" => "{amount} {symbol}",
                "show_symbol" => true,
                "show_name" => false
            ];
        }
        
        echo json_encode([
            "success" => true,
            "config" => $config,
            "message" => "تم تحميل إعدادات العملة بنجاح"
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        throw new Exception("خطأ في تحميل إعدادات العملة: " . $e->getMessage());
    }
}

function updateCurrencyConfig() {
    global $pdo;
    
    try {
        $input = json_decode(file_get_contents("php://input"), true);
        
        if (!$input || !isset($input["config"])) {
            throw new Exception("بيانات غير صحيحة");
        }
        
        $config = $input["config"];
        
        // التحقق من صحة البيانات
        $requiredFields = ["enabled", "symbol", "name", "code", "position", "decimals"];
        foreach ($requiredFields as $field) {
            if (!isset($config[$field])) {
                throw new Exception("الحقل $field مطلوب");
            }
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO system_settings (
                setting_key, 
                setting_name, 
                setting_value, 
                setting_type, 
                category, 
                description, 
                is_editable, 
                is_required
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                setting_value = VALUES(setting_value),
                updated_at = CURRENT_TIMESTAMP
        ");
        
        $stmt->execute([
            "currency_config",
            "إعدادات العملة",
            json_encode($config, JSON_UNESCAPED_UNICODE),
            "json",
            "general",
            "إعدادات شاملة للعملة تشمل التفعيل والرمز والاسم والتنسيق",
            1,
            0
        ]);
        
        echo json_encode([
            "success" => true,
            "message" => "تم حفظ إعدادات العملة بنجاح"
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        throw new Exception("خطأ في حفظ إعدادات العملة: " . $e->getMessage());
    }
}

// دالة تنسيق العملة
function formatCurrency($amount, $config = null) {
    if (!$config) {
        // تحميل الإعدادات إذا لم يتم توفيرها
        $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = "currency_config"");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $config = $result ? json_decode($result["setting_value"], true) : [];
    }
    
    if (!$config["enabled"]) {
        return $amount;
    }
    
    $amount = floatval($amount);
    $decimals = intval($config["decimals"] ?? 0);
    $thousandsSep = $config["thousands_separator"] ?? ",";
    $decimalSep = $config["decimal_separator"] ?? ".";
    
    // تنسيق الرقم
    $formattedAmount = number_format($amount, $decimals, $decimalSep, $thousandsSep);
    
    // إضافة رمز العملة
    $symbol = $config["show_symbol"] ? $config["symbol"] : "";
    $name = $config["show_name"] ? $config["name"] : "";
    
    // تطبيق التنسيق
    $format = $config["format"] ?? "{amount} {symbol}";
    $format = str_replace("{amount}", $formattedAmount, $format);
    $format = str_replace("{symbol}", $symbol, $format);
    $format = str_replace("{name}", $name, $format);
    
    return $format;
}
?>
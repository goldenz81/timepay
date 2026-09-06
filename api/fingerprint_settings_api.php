<?php
// إخفاء أخطاء PHP لمنع HTML من الظهور
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $config = require '../config/database_config.php';
    $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
    $username = $config['username'];
    $password = $config['password'];
    $options = $config['options'];

    $pdo = new PDO($dsn, $username, $password, $options);
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? '';
    
    switch ($action) {
        case 'get_settings':
            getFingerprintSettings($pdo);
            break;
            
        case 'save_settings':
            saveFingerprintSettings($pdo, $input);
            break;
            
        case 'update_setting':
            updateFingerprintSetting($pdo, $input);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Action not supported']);
    }
    
} catch (Exception $e) {
    error_reporting(0);
    ini_set('display_errors', 0);

    echo json_encode([
        'success' => false,
        'message' => 'خطأ في الخادم: ' . $e->getMessage(),
        'error_code' => $e->getCode()
    ], JSON_UNESCAPED_UNICODE);
}

function getFingerprintSettings($pdo) {
    try {
        // إنشاء الجدول إذا لم يكن موجوداً
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS fingerprint_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT,
                setting_type ENUM('boolean', 'number', 'string') DEFAULT 'string',
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        ");
        
        // إدراج الإعدادات الافتراضية إذا لم تكن موجودة
        $defaultSettings = [
            ['fingerprint_enabled', '0', 'boolean', 'تفعيل البصمة'],
            ['auto_sync_enabled', '0', 'boolean', 'المزامنة التلقائية'],
            ['sync_interval', '5', 'number', 'فترة المزامنة (دقائق)'],
            ['connection_timeout', '30', 'number', 'مهلة الاتصال (ثواني)'],
            ['retry_attempts', '3', 'number', 'محاولات إعادة المحاولة'],
            ['backup_enabled', '0', 'boolean', 'النسخ الاحتياطي']
        ];
        
        foreach ($defaultSettings as $setting) {
            $stmt = $pdo->prepare("
                INSERT IGNORE INTO fingerprint_settings 
                (setting_key, setting_value, setting_type, description) 
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute($setting);
        }
        
        // جلب جميع الإعدادات
        $stmt = $pdo->prepare("SELECT * FROM fingerprint_settings ORDER BY id");
        $stmt->execute();
        $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // تحويل إلى مصفوفة مفاتيح
        $settingsArray = [];
        foreach ($settings as $setting) {
            $value = $setting['setting_value'];
            
            // تحويل القيم حسب النوع
            switch ($setting['setting_type']) {
                case 'boolean':
                    $value = (bool) $value;
                    break;
                case 'number':
                    $value = (int) $value;
                    break;
            }
            
            $settingsArray[$setting['setting_key']] = [
                'value' => $value,
                'type' => $setting['setting_type'],
                'description' => $setting['description']
            ];
        }
        
        echo json_encode([
            'success' => true,
            'settings' => $settingsArray
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function saveFingerprintSettings($pdo, $input) {
    try {
        if (empty($input['settings']) || !is_array($input['settings'])) {
            throw new Exception('الإعدادات مطلوبة');
        }
        
        $pdo->beginTransaction();
        
        foreach ($input['settings'] as $key => $value) {
            // تحويل القيمة إلى نص
            $stringValue = is_bool($value) ? ($value ? '1' : '0') : (string) $value;
            
            $stmt = $pdo->prepare("
                INSERT INTO fingerprint_settings (setting_key, setting_value) 
                VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE 
                setting_value = VALUES(setting_value),
                updated_at = CURRENT_TIMESTAMP
            ");
            $stmt->execute([$key, $stringValue]);
        }
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'تم حفظ الإعدادات بنجاح'
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateFingerprintSetting($pdo, $input) {
    try {
        if (empty($input['key']) || !isset($input['value'])) {
            throw new Exception('مفتاح الإعداد والقيمة مطلوبان');
        }
        
        $key = $input['key'];
        $value = $input['value'];
        
        // تحويل القيمة إلى نص
        $stringValue = is_bool($value) ? ($value ? '1' : '0') : (string) $value;
        
        $stmt = $pdo->prepare("
            INSERT INTO fingerprint_settings (setting_key, setting_value) 
            VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE 
            setting_value = VALUES(setting_value),
            updated_at = CURRENT_TIMESTAMP
        ");
        $stmt->execute([$key, $stringValue]);
        
        echo json_encode([
            'success' => true,
            'message' => 'تم تحديث الإعداد بنجاح'
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>

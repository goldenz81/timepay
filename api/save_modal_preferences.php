<?php
// إيقاف عرض الأخطاء
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    require_once '../config/database_config.php';
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في تحميل إعدادات قاعدة البيانات'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('خطأ في تحليل البيانات المرسلة');
    }
    
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'save_preferences':
            $preferences = $input['preferences'] ?? [];
            $userId = $input['user_id'] ?? 'default'; // يمكن استخدام معرف المستخدم
            
            // إنشاء جدول التفضيلات إذا لم يكن موجوداً
            $createTable = "
                CREATE TABLE IF NOT EXISTS modal_preferences (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id VARCHAR(100) NOT NULL,
                    preferences JSON NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_user (user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ";
            $pdo->exec($createTable);
            
            // حفظ أو تحديث التفضيلات
            $stmt = $pdo->prepare("
                INSERT INTO modal_preferences (user_id, preferences) 
                VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE 
                preferences = VALUES(preferences), 
                updated_at = CURRENT_TIMESTAMP
            ");
            
            $stmt->execute([$userId, json_encode($preferences, JSON_UNESCAPED_UNICODE)]);
            
            echo json_encode([
                'success' => true,
                'message' => 'تم حفظ التفضيلات بنجاح'
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'load_preferences':
            $userId = $input['user_id'] ?? 'default';
            
            $stmt = $pdo->prepare("SELECT preferences FROM modal_preferences WHERE user_id = ?");
            $stmt->execute([$userId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result) {
                $preferences = json_decode($result['preferences'], true);
                echo json_encode([
                    'success' => true,
                    'preferences' => $preferences
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => true,
                    'preferences' => null
                ], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'delete_preferences':
            $userId = $input['user_id'] ?? 'default';
            
            $stmt = $pdo->prepare("DELETE FROM modal_preferences WHERE user_id = ?");
            $stmt->execute([$userId]);
            
            echo json_encode([
                'success' => true,
                'message' => 'تم حذف التفضيلات بنجاح'
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        default:
            echo json_encode([
                'success' => false,
                'message' => 'إجراء غير صحيح'
            ], JSON_UNESCAPED_UNICODE);
    }
    
} catch (Exception $e) {
    // تسجيل الخطأ في ملف log
    error_log('Modal Preferences API Error: ' . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في الخادم: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} catch (Error $e) {
    // تسجيل الخطأ في ملف log
    error_log('Modal Preferences API Fatal Error: ' . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => 'خطأ فادح في الخادم'
    ], JSON_UNESCAPED_UNICODE);
}
?>

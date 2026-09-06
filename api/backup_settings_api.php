<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? '';

    switch ($action) {
        case 'save_settings':
            $settings = $input['settings'] ?? [];
            
            // حفظ الإعدادات في قاعدة البيانات
            $stmt = $pdo->prepare("
                INSERT INTO backup_settings (setting_key, setting_value, updated_at) 
                VALUES (?, ?, NOW())
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
            ");
            
            foreach ($settings as $key => $value) {
                $stmt->execute([$key, json_encode($value)]);
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'تم حفظ إعدادات النسخ الاحتياطية بنجاح'
            ]);
            break;
            
        case 'get_settings':
            $stmt = $pdo->prepare("SELECT setting_key, setting_value FROM backup_settings");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $settings = [];
            foreach ($rows as $row) {
                $settings[$row['setting_key']] = json_decode($row['setting_value'], true);
            }
            
            // إعدادات افتراضية إذا لم توجد
            if (empty($settings)) {
                $settings = [
                    'autoBackup' => false,
                    'backupFrequency' => 'daily',
                    'backupTime' => '03:00',
                    'backupRetention' => 30,
                    'backupEncryption' => true
                ];
            }
            
            echo json_encode([
                'success' => true,
                'settings' => $settings
            ]);
            break;
            
        default:
            echo json_encode([
                'success' => false,
                'message' => 'إجراء غير صحيح'
            ]);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في الخادم: ' . $e->getMessage()
    ]);
}
?>

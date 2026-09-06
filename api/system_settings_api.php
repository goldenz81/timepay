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
    $action = $input['action'] ?? '';

    switch ($action) {
        case 'save_theme_settings':
            saveThemeSettings($input['settings']);
            break;
            
        case 'get_theme_settings':
            getThemeSettings();
            break;
            
        case 'apply_theme_settings':
            applyThemeSettings($input['settings']);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Action not found']);
            break;
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function saveThemeSettings($settings) {
    global $pdo;
    
    try {
        // بدء المعاملة
        $pdo->beginTransaction();
        
        // حفظ إعدادات الخلفية
        if (isset($settings['backgroundType'])) {
            saveSetting('background_type', $settings['backgroundType']);
        }
        
        if (isset($settings['pageBackgroundGradient'])) {
            saveSetting('page_background_gradient', $settings['pageBackgroundGradient']);
        }
        
        if (isset($settings['pageBackgroundSolid'])) {
            saveSetting('page_background_solid', $settings['pageBackgroundSolid']);
        }
        
        // حفظ إعدادات الخطوط
        if (isset($settings['typography'])) {
            foreach ($settings['typography'] as $key => $value) {
                saveSetting('typography_' . $key, $value);
            }
        }
        
        // حفظ إعدادات الألوان
        if (isset($settings['colors'])) {
            foreach ($settings['colors'] as $key => $value) {
                saveSetting('color_' . $key, $value);
            }
        }
        
        // حفظ إعدادات المكونات
        if (isset($settings['components'])) {
            foreach ($settings['components'] as $key => $value) {
                saveSetting('component_' . $key, $value);
            }
        }
        
        // حفظ timestamp آخر تحديث
        saveSetting('theme_last_updated', date('Y-m-d H:i:s'));
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true, 
            'message' => 'تم حفظ إعدادات المظهر بنجاح'
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode([
            'success' => false, 
            'message' => 'خطأ في حفظ الإعدادات: ' . $e->getMessage()
        ]);
    }
}

function getThemeSettings() {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'theme_%' OR setting_key LIKE 'background_%' OR setting_key LIKE 'page_%' OR setting_key LIKE 'typography_%' OR setting_key LIKE 'color_%' OR setting_key LIKE 'component_%'");
        $stmt->execute();
        $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formattedSettings = [];
        foreach ($settings as $setting) {
            $key = $setting['setting_key'];
            $value = $setting['setting_value'];
            
            // تحويل المفاتيح إلى هيكل منظم
            if (strpos($key, 'typography_') === 0) {
                $formattedSettings['typography'][substr($key, 10)] = $value;
            } elseif (strpos($key, 'color_') === 0) {
                $formattedSettings['colors'][substr($key, 6)] = $value;
            } elseif (strpos($key, 'component_') === 0) {
                $formattedSettings['components'][substr($key, 10)] = $value;
            } else {
                $formattedSettings[$key] = $value;
            }
        }
        
        echo json_encode([
            'success' => true,
            'settings' => $formattedSettings
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'خطأ في جلب الإعدادات: ' . $e->getMessage()
        ]);
    }
}

function applyThemeSettings($settings) {
    try {
        // تطبيق إعدادات الخلفية
        if (isset($settings['backgroundType'])) {
            if ($settings['backgroundType'] === 'gradient' && isset($settings['pageBackgroundGradient'])) {
                // تطبيق التدرج
                echo json_encode([
                    'success' => true,
                    'css' => [
                        '--app-background' => $settings['pageBackgroundGradient'],
                        'body-background' => $settings['pageBackgroundGradient']
                    ]
                ]);
            } elseif ($settings['backgroundType'] === 'solid' && isset($settings['pageBackgroundSolid'])) {
                // تطبيق اللون الواحد
                echo json_encode([
                    'success' => true,
                    'css' => [
                        '--app-background' => $settings['pageBackgroundSolid'],
                        'body-background' => $settings['pageBackgroundSolid']
                    ]
                ]);
            }
        }
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'خطأ في تطبيق الإعدادات: ' . $e->getMessage()
        ]);
    }
}

function saveSetting($key, $value) {
    global $pdo;
    
    // التحقق من وجود الإعداد
    $stmt = $pdo->prepare("SELECT id FROM system_settings WHERE setting_key = ?");
    $stmt->execute([$key]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        // تحديث الإعداد الموجود
        $stmt = $pdo->prepare("UPDATE system_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?");
        $stmt->execute([$value, $key]);
    } else {
        // إضافة إعداد جديد
        $stmt = $pdo->prepare("INSERT INTO system_settings (setting_key, setting_value, setting_type, created_at, updated_at) VALUES (?, ?, 'theme', NOW(), NOW())");
        $stmt->execute([$key, $value]);
    }
}

// إنشاء جدول system_settings إذا لم يكن موجوداً
function createSystemSettingsTable() {
    global $pdo;
    
    $sql = "CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(50) DEFAULT 'general',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )";
    
    $pdo->exec($sql);
}

// استدعاء دالة إنشاء الجدول
createSystemSettingsTable();
?>
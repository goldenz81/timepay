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

// قراءة البيانات المرسلة
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'بيانات غير صحيحة'], JSON_UNESCAPED_UNICODE);
    exit;
}

$action = $data['action'] ?? '';
$userId = $data['user_id'] ?? 'default';
$preferences = $data['preferences'] ?? [];

// ملف لحفظ التفضيلات
$preferencesFile = __DIR__ . '/../data/modal_preferences.json';

// إنشاء مجلد البيانات إذا لم يكن موجوداً
$dataDir = dirname($preferencesFile);
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

switch ($action) {
    case 'save_preferences':
        try {
            $allPreferences = [];
            if (file_exists($preferencesFile)) {
                $content = file_get_contents($preferencesFile);
                $allPreferences = json_decode($content, true) ?: [];
            }
            
            $allPreferences[$userId] = $preferences;
            
            $result = file_put_contents($preferencesFile, json_encode($allPreferences, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            
            if ($result !== false) {
                echo json_encode(['success' => true, 'message' => 'تم حفظ التفضيلات بنجاح'], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode(['success' => false, 'message' => 'فشل في حفظ التفضيلات'], JSON_UNESCAPED_UNICODE);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'خطأ في الحفظ: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;
        
    case 'load_preferences':
        try {
            if (file_exists($preferencesFile)) {
                $content = file_get_contents($preferencesFile);
                $allPreferences = json_decode($content, true) ?: [];
                
                if (isset($allPreferences[$userId])) {
                    echo json_encode(['success' => true, 'preferences' => $allPreferences[$userId]], JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode(['success' => true, 'preferences' => null], JSON_UNESCAPED_UNICODE);
                }
            } else {
                echo json_encode(['success' => true, 'preferences' => null], JSON_UNESCAPED_UNICODE);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'خطأ في التحميل: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;
        
    case 'delete_preferences':
        try {
            if (file_exists($preferencesFile)) {
                $content = file_get_contents($preferencesFile);
                $allPreferences = json_decode($content, true) ?: [];
                
                if (isset($allPreferences[$userId])) {
                    unset($allPreferences[$userId]);
                    file_put_contents($preferencesFile, json_encode($allPreferences, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
                }
            }
            
            echo json_encode(['success' => true, 'message' => 'تم حذف التفضيلات بنجاح'], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'خطأ في الحذف: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;
        
    default:
        echo json_encode(['success' => false, 'message' => 'إجراء غير صحيح'], JSON_UNESCAPED_UNICODE);
}
?>

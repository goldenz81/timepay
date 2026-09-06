<?php
/**
 * API إدارة الإعدادات الشاملة
 * تم إنشاؤه في: 2025-01-27
 */

// إعداد CORS headers - يعمل في التطوير والإنتاج
$allowedOrigins = [
    'http://localhost:3000',
    'http://localhost',
    'https://timepay.borgelarabpress.com',
    'http://timepay.borgelarabpress.com'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // Fallback: allow current origin if it's a known domain
    $currentOrigin = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
    if (strpos($currentOrigin, 'timepay.borgelarabpress.com') !== false || strpos($currentOrigin, 'localhost') !== false) {
        header("Access-Control-Allow-Origin: $currentOrigin");
    }
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// إعداد قاعدة البيانات
require_once 'config_unified.php';

try {
    $rawInput = file_get_contents("php://input");
    $input = json_decode($rawInput, true) ?: [];
    
    // Get action from multiple sources
    $action = $_GET['action'] ?? $_POST['action'] ?? ($input['action'] ?? '');
    
    // If action is still empty, try to parse from raw input
    if (empty($action) && !empty($rawInput)) {
        $tempInput = json_decode($rawInput, true);
        if ($tempInput && isset($tempInput['action'])) {
            $action = $tempInput['action'];
            $input = $tempInput;
        }
    }
    
    switch ($action) {
        case 'get_settings_by_category':
            getSettingsByCategory($pdo);
            break;
        case 'get_all_categories':
            getAllCategories($pdo);
            break;
        case 'update_setting':
            updateSetting($pdo);
            break;
        case 'update_multiple_settings':
            updateMultipleSettings($pdo);
            break;
        case 'get_setting':
            getSetting($pdo);
            break;
        case 'reset_to_default':
            resetToDefault($pdo);
            break;
        default:
            echo json_encode(['success' => false, 'message' => 'إجراء غير صحيح: ' . $action], JSON_UNESCAPED_UNICODE);
            break;
    }
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'خطأ في الاتصال: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
}

function getSettingsByCategory($pdo) {
    try {
        $category = $_GET['category'] ?? '';
        
        if (empty($category)) {
            echo json_encode(['success' => false, 'message' => 'فئة الإعدادات مطلوبة'], JSON_UNESCAPED_UNICODE);
            return;
        }
        
        // Support multiple categories separated by comma
        $categories = array_map('trim', explode(',', $category));
        $placeholders = str_repeat('?,', count($categories) - 1) . '?';
        
        $stmt = $pdo->prepare("
            SELECT variable_key as setting_key, variable_name_ar as setting_name, variable_value as setting_value, variable_type as setting_type, category 
            FROM system_variables 
            WHERE category IN ($placeholders) AND is_active = 1
            ORDER BY variable_name_ar ASC
        ");
        $stmt->execute($categories);
        $settings = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'settings' => $settings
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'خطأ في تحميل الإعدادات: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

function getAllCategories($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT category, COUNT(*) as count 
            FROM system_variables 
            WHERE is_active = 1
            GROUP BY category 
            ORDER BY category ASC
        ");
        $categories = $stmt->fetchAll();
        
        // إضافة أسماء الفئات بالعربية
        $categoryNames = [
            'general' => 'الإعدادات العامة',
            'appearance' => 'المظهر والخطوط',
            'currency' => 'إعدادات العملة',
            'notifications' => 'الإشعارات',
            'security' => 'الأمان',
            'backup' => 'النسخ الاحتياطي',
            'fingerprint' => 'البصمة',
            'salary' => 'الرواتب',
            'calculation' => 'الحسابات',
            'system' => 'النظام'
        ];
        
        foreach ($categories as &$cat) {
            $cat['name_ar'] = $categoryNames[$cat['category']] ?? $cat['category'];
        }
        
        echo json_encode([
            'success' => true,
            'categories' => $categories
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'خطأ في تحميل الفئات: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

function updateSetting($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $settingKey = $input['setting_key'] ?? '';
        $settingValue = $input['setting_value'] ?? '';
        
        if (empty($settingKey)) {
            throw new Exception('مفتاح الإعداد مطلوب');
        }
        
        $stmt = $pdo->prepare("
            UPDATE system_variables 
            SET variable_value = ?, updated_at = NOW() 
            WHERE variable_key = ?
        ");
        $stmt->execute([$settingValue, $settingKey]);
        
        echo json_encode([
            'success' => true,
            'message' => 'تم تحديث الإعداد بنجاح'
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'خطأ في تحديث الإعداد: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

function updateMultipleSettings($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $settings = $input['settings'] ?? [];
        $category = $input['category'] ?? 'appearance'; // الفئة الافتراضية
        
        if (empty($settings)) {
            throw new Exception('لا توجد إعدادات للتحديث');
        }
        
        $pdo->beginTransaction();
        
        // أسماء الإعدادات بالعربية والإنجليزية
        $settingNames = [
            'color_theme' => ['ar' => 'قالب الألوان', 'en' => 'Color Theme'],
            'font_family' => ['ar' => 'نوع الخط', 'en' => 'Font Family'],
            'table_font_family' => ['ar' => 'خط الجداول', 'en' => 'Table Font Family'],
            'table_font_size' => ['ar' => 'حجم خط الجدول', 'en' => 'Table Font Size'],
            'table_font_weight' => ['ar' => 'سمك خط الجدول', 'en' => 'Table Font Weight'],
            'show_english_keys' => ['ar' => 'إظهار المفاتيح بالإنجليزية', 'en' => 'Show English Keys'],
            'background_type' => ['ar' => 'نوع الخلفية', 'en' => 'Background Type'],
            'background_color' => ['ar' => 'لون الخلفية', 'en' => 'Background Color'],
            'gradient_start' => ['ar' => 'بداية التدرج', 'en' => 'Gradient Start'],
            'gradient_end' => ['ar' => 'نهاية التدرج', 'en' => 'Gradient End'],
            'gradient_direction' => ['ar' => 'اتجاه التدرج', 'en' => 'Gradient Direction'],
            'weekly_salary_main_columns_json' => ['ar' => 'أعمدة جدول الراتب الأسبوعي', 'en' => 'Weekly salary main table columns'],
            'monthly_salary_list_columns_json' => ['ar' => 'أعمدة جدول الراتب الشهري', 'en' => 'Monthly salary list table columns'],
        ];
        
        // استخدام INSERT ... ON DUPLICATE KEY UPDATE لضمان إنشاء الإعداد إذا لم يكن موجوداً
        $upsertStmt = $pdo->prepare("
            INSERT INTO system_variables (variable_key, variable_name_ar, variable_name_en, variable_value, category, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
            ON DUPLICATE KEY UPDATE 
                variable_value = VALUES(variable_value),
                category = VALUES(category),
                variable_name_ar = VALUES(variable_name_ar),
                variable_name_en = VALUES(variable_name_en),
                updated_at = NOW()
        ");
        
        $updated = 0;
        foreach ($settings as $setting) {
            $key = $setting['key'] ?? '';
            $value = $setting['value'] ?? '';
            $settingCategory = $setting['category'] ?? $category;
            $nameAr = $settingNames[$key]['ar'] ?? $key;
            $nameEn = $settingNames[$key]['en'] ?? $key;
            
            if (!empty($key)) {
                $upsertStmt->execute([$key, $nameAr, $nameEn, $value, $settingCategory]);
                $updated++;
            }
        }
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => "تم تحديث $updated إعداد بنجاح"
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'خطأ في تحديث الإعدادات: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

function getSetting($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $settingKey = $input['setting_key'] ?? '';
        
        if (!$settingKey) {
            throw new Exception("مفتاح الإعداد مطلوب");
        }
        
        $stmt = $pdo->prepare("SELECT * FROM system_variables WHERE variable_key = ? AND is_active = 1");
        $stmt->execute([$settingKey]);
        $setting = $stmt->fetch();
        
        if ($setting) {
            echo json_encode([
                'success' => true,
                'setting' => $setting
            ], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'الإعداد غير موجود'
            ], JSON_UNESCAPED_UNICODE);
        }
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'خطأ في تحميل الإعداد: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

function resetToDefault($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $category = $input['category'] ?? '';
        
        if (empty($category)) {
            throw new Exception("فئة الإعدادات غير صحيحة");
        }
        
        // Default values for each category
        $defaultValues = [
            'appearance' => [
                'font_family' => 'Cairo',
                'primary_color' => '#1890ff',
                'secondary_color' => '#52c41a',
                'background_color' => '#ffffff',
                'text_color' => '#000000',
                'border_radius' => '8px',
                'shadow_enabled' => 'true',
                'animation_enabled' => 'true'
            ],
            'general' => [
                'system_name' => 'نظام الحضور والمرتبات والأجور',
                'company_name' => 'شركة TimePay',
                'timezone' => 'Africa/Cairo',
                'city' => 'Cairo',
                'time_format' => '24'
            ]
        ];
        
        if (!isset($defaultValues[$category])) {
            throw new Exception("فئة الإعدادات غير صحيحة");
        }
        
        $pdo->beginTransaction();
        
        $stmt = $pdo->prepare("
            UPDATE system_variables 
            SET variable_value = ?, updated_at = NOW() 
            WHERE variable_key = ? AND category = ?
        ");
        
        $updated = 0;
        foreach ($defaultValues[$category] as $key => $value) {
            $stmt->execute([
                $value,
                $key,
                $category
            ]);
            $updated++;
        }
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => "تم إعادة تعيين $updated إعداد إلى القيم الافتراضية"
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'خطأ في إعادة التعيين: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}
?>

<?php
/**
 * API إدارة القوالب المخصصة
 */

// إعداد CORS headers
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
    $currentOrigin = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
    if (strpos($currentOrigin, 'timepay.borgelarabpress.com') !== false || strpos($currentOrigin, 'localhost') !== false) {
        header("Access-Control-Allow-Origin: $currentOrigin");
    }
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Cache-Control, Pragma, Expires');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config_unified.php';

try {
    // إنشاء الجدول إذا لم يكن موجوداً
    $createTableSQL = "CREATE TABLE IF NOT EXISTS `custom_themes` (
      `id` INT(11) NOT NULL AUTO_INCREMENT,
      `theme_id` VARCHAR(100) NOT NULL COMMENT 'معرف القالب الأساسي',
      `theme_name` VARCHAR(255) NOT NULL COMMENT 'اسم القالب المخصص',
      `theme_name_ar` VARCHAR(255) DEFAULT NULL COMMENT 'اسم القالب بالعربية',
      `colors` MEDIUMTEXT NOT NULL COMMENT 'JSON للألوان المخصصة (يدعم صورة خلفية base64)',
      `typography` TEXT DEFAULT NULL COMMENT 'JSON لإعدادات الخطوط',
      `is_active` TINYINT(1) DEFAULT 0 COMMENT 'هل القالب مفعّل',
      `is_custom` TINYINT(1) DEFAULT 1 COMMENT 'هل القالب مخصص',
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      UNIQUE KEY `unique_theme_id` (`theme_id`),
      KEY `idx_is_active` (`is_active`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='القوالب المخصصة للنظام'";
    
    $pdo->exec($createTableSQL);
    // توسيع عمود colors ليدعم صورة خلفية base64 (قد تتجاوز 64KB)
    try {
        $pdo->exec("ALTER TABLE `custom_themes` MODIFY COLUMN `colors` MEDIUMTEXT NOT NULL COMMENT 'JSON للألوان المخصصة'");
    } catch (Exception $e) {
        // تجاهل إذا فشل التعديل (جدول قديم أو صلاحيات)
    }
    
    $rawInput = file_get_contents("php://input");
    $input = json_decode($rawInput, true) ?: [];
    $action = $_GET['action'] ?? $_POST['action'] ?? ($input['action'] ?? '');
    
    switch ($action) {
        case 'get_custom_theme':
            // جلب قالب مخصص معين
            $themeId = $_GET['theme_id'] ?? $input['theme_id'] ?? '';
            if (empty($themeId)) {
                echo json_encode(['success' => false, 'message' => 'معرف القالب مطلوب']);
                exit;
            }
            
            $stmt = $pdo->prepare("SELECT * FROM custom_themes WHERE theme_id = ?");
            $stmt->execute([$themeId]);
            $theme = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($theme) {
                $theme['colors'] = json_decode($theme['colors'], true);
                $theme['typography'] = $theme['typography'] ? json_decode($theme['typography'], true) : null;
                echo json_encode(['success' => true, 'theme' => $theme]);
            } else {
                echo json_encode(['success' => false, 'message' => 'القالب غير موجود']);
            }
            break;
            
        case 'get_all_custom_themes':
            // جلب جميع القوالب المخصصة
            $stmt = $pdo->query("SELECT * FROM custom_themes ORDER BY created_at DESC");
            $themes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($themes as &$theme) {
                $theme['colors'] = json_decode($theme['colors'], true);
                $theme['typography'] = $theme['typography'] ? json_decode($theme['typography'], true) : null;
            }
            
            echo json_encode(['success' => true, 'themes' => $themes]);
            break;
            
        case 'save_custom_theme':
            // حفظ قالب مخصص
            $themeId = $input['theme_id'] ?? '';
            $themeName = $input['theme_name'] ?? '';
            $themeNameAr = $input['theme_name_ar'] ?? '';
            $colors = $input['colors'] ?? [];
            $typography = $input['typography'] ?? null;
            $isActive = isset($input['is_active']) ? (int)$input['is_active'] : 0;
            
            if (empty($themeId) || empty($themeName) || empty($colors)) {
                echo json_encode(['success' => false, 'message' => 'بيانات غير كاملة']);
                exit;
            }
            
            // التحقق من وجود القالب
            $stmt = $pdo->prepare("SELECT id FROM custom_themes WHERE theme_id = ?");
            $stmt->execute([$themeId]);
            $existing = $stmt->fetch();
            
            if ($existing) {
                // تحديث القالب الموجود
                $stmt = $pdo->prepare("UPDATE custom_themes SET 
                    theme_name = ?, 
                    theme_name_ar = ?, 
                    colors = ?, 
                    typography = ?,
                    is_active = ?,
                    updated_at = CURRENT_TIMESTAMP
                    WHERE theme_id = ?");
                $stmt->execute([
                    $themeName,
                    $themeNameAr,
                    json_encode($colors, JSON_UNESCAPED_UNICODE),
                    $typography ? json_encode($typography, JSON_UNESCAPED_UNICODE) : null,
                    $isActive,
                    $themeId
                ]);
            } else {
                // إضافة قالب جديد
                $stmt = $pdo->prepare("INSERT INTO custom_themes 
                    (theme_id, theme_name, theme_name_ar, colors, typography, is_active, is_custom) 
                    VALUES (?, ?, ?, ?, ?, ?, 1)");
                $stmt->execute([
                    $themeId,
                    $themeName,
                    $themeNameAr,
                    json_encode($colors, JSON_UNESCAPED_UNICODE),
                    $typography ? json_encode($typography, JSON_UNESCAPED_UNICODE) : null,
                    $isActive
                ]);
            }
            
            echo json_encode(['success' => true, 'message' => 'تم حفظ القالب بنجاح']);
            break;
            
        case 'delete_custom_theme':
            // حذف قالب مخصص
            $themeId = $input['theme_id'] ?? $_GET['theme_id'] ?? '';
            if (empty($themeId)) {
                echo json_encode(['success' => false, 'message' => 'معرف القالب مطلوب']);
                exit;
            }
            
            $stmt = $pdo->prepare("DELETE FROM custom_themes WHERE theme_id = ?");
            $stmt->execute([$themeId]);
            
            echo json_encode(['success' => true, 'message' => 'تم حذف القالب بنجاح']);
            break;
            
        case 'set_active_theme':
            // تفعيل قالب معين (إلغاء تفعيل الباقي)
            $themeId = $input['theme_id'] ?? '';
            if (empty($themeId)) {
                echo json_encode(['success' => false, 'message' => 'معرف القالب مطلوب']);
                exit;
            }
            
            // إلغاء تفعيل جميع القوالب
            $pdo->exec("UPDATE custom_themes SET is_active = 0");
            
            // تفعيل القالب المحدد
            $stmt = $pdo->prepare("UPDATE custom_themes SET is_active = 1 WHERE theme_id = ?");
            $stmt->execute([$themeId]);
            
            echo json_encode(['success' => true, 'message' => 'تم تفعيل القالب بنجاح']);
            break;

        case 'reset_soft_light_theme':
            // استعادة قالب الضوء الناعم إلى التصميم الافتراضي (بسيط، فاتح، واضح)
            $softLightColors = [
                'bgPrimary' => '#f0f4f8',
                'bgSecondary' => '#e8ecf1',
                'bgCard' => '#fafbfd',
                'bgHover' => '#dce2e9',
                'borderPrimary' => '#d4dae2',
                'borderSecondary' => '#b8c1cc',
                'textPrimary' => '#1e293b',
                'textSecondary' => '#475569',
                'accent' => '#2563eb',
                'success' => '#059669',
                'error' => '#dc2626',
                'warning' => '#d97706',
                'sidebarBgStart' => '#e8ecf2',
                'sidebarBgEnd' => '#dce2eb',
                'tableHeaderStart' => '#eef2f7',
                'tableHeaderEnd' => '#e2e8f0',
                'modalHeaderStart' => '#e8ecf2',
                'modalHeaderEnd' => '#dce2eb',
                'cardGradientStart' => '#fcfdfe',
                'cardGradientEnd' => '#f5f7fa',
                'gradientMode' => [
                    'bgPrimary' => false, 'bgSecondary' => false, 'bgCard' => false, 'bgHover' => false,
                    'borderPrimary' => false, 'borderSecondary' => false, 'textPrimary' => false, 'textSecondary' => false
                ],
                'gradientData' => [
                    'sidebarBg' => ['color1' => '#e8ecf2', 'color2' => '#dce2eb', 'direction' => '90deg'],
                    'headerBg' => ['color1' => '#eef2f7', 'color2' => '#e2e8f0', 'direction' => '180deg'],
                    'bgPrimary' => ['color1' => '#f5f7fa', 'color2' => '#eef2f7', 'direction' => '180deg']
                ]
            ];
            $typography = json_encode([
                'fontFamily' => 'Cairo',
                'tableFontFamily' => 'Cairo',
                'tableFontSize' => 14,
                'tableFontWeight' => 600
            ], JSON_UNESCAPED_UNICODE);
            $stmt = $pdo->prepare("UPDATE custom_themes SET theme_name = ?, theme_name_ar = ?, colors = ?, typography = ?, updated_at = CURRENT_TIMESTAMP WHERE theme_id = 'soft-light'");
            $stmt->execute(['Soft Light', 'الضوء الناعم', json_encode($softLightColors, JSON_UNESCAPED_UNICODE), $typography]);
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'تم استعادة قالب الضوء الناعم إلى التصميم الافتراضي']);
            } else {
                $stmt = $pdo->prepare("INSERT INTO custom_themes (theme_id, theme_name, theme_name_ar, colors, typography, is_custom) VALUES ('soft-light', ?, ?, ?, ?, 0)");
                $stmt->execute(['Soft Light', 'الضوء الناعم', json_encode($softLightColors, JSON_UNESCAPED_UNICODE), $typography]);
                echo json_encode(['success' => true, 'message' => 'تم إنشاء قالب الضوء الناعم بالتصميم الافتراضي']);
            }
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'إجراء غير معروف']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في الخادم: ' . $e->getMessage()
    ]);
}


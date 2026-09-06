<?php
/**
 * سكريبت لتهيئة القوالب الافتراضية في قاعدة البيانات
 * يتم تشغيله مرة واحدة لإنشاء قوالب مخصصة لجميع القوالب الافتراضية
 */

require_once __DIR__ . '/config_unified.php';

// $pdo متاح بالفعل من config_unified.php

// القوالب الافتراضية
$defaultThemes = [
    [
        'id' => 'dark-ocean',
        'name' => 'Dark Ocean',
        'nameAr' => 'المحيط الداكن',
        'colors' => [
            'bgPrimary' => '#0b1324',
            'bgSecondary' => '#111827',
            'bgCard' => '#1a2234',
            'bgHover' => '#243b5c',
            'borderPrimary' => '#2d3a4d',
            'textPrimary' => '#f1f5f9',
            'textSecondary' => '#94a3b8',
            'accent' => '#3b82f6',
            'success' => '#22c55e',
            'error' => '#ef4444',
            'warning' => '#f59e0b',
            'sidebarBgStart' => '#0b1324',
            'sidebarBgEnd' => '#111827',
            'activeButtonBg' => '#243b5c',
            'activeButtonText' => '#ffffff',
            'activeButtonIcon' => '#ffffff',
            'tableBg' => '#1a2234',
            'tableHeaderBg' => '#111827',
            'tableHeaderText' => '#f1f5f9'
        ],
        'typography' => [
            'fontFamily' => 'Cairo',
            'tableFontFamily' => 'Cairo',
            'tableFontSize' => 14,
            'tableFontWeight' => 600
        ]
    ],
    [
        'id' => 'soft-light',
        'name' => 'Soft Light',
        'nameAr' => 'الضوء الناعم',
        'colors' => [
            'bgPrimary' => '#f8f9fa',
            'bgSecondary' => '#ffffff',
            'bgCard' => '#ffffff',
            'bgHover' => '#f1f3f5',
            'borderPrimary' => '#e9ecef',
            'borderSecondary' => '#dee2e6',
            'textPrimary' => '#212529',
            'textSecondary' => '#6c757d',
            'accent' => '#4b7cf3',
            'success' => '#28a745',
            'error' => '#dc3545',
            'warning' => '#ffc107',
            'sidebarBgStart' => '#ffffff',
            'sidebarBgEnd' => '#ffffff',
            'tableHeaderStart' => '#f8f9fa',
            'tableHeaderEnd' => '#f8f9fa',
            'modalHeaderStart' => '#ffffff',
            'modalHeaderEnd' => '#ffffff',
            'cardGradientStart' => '#ffffff',
            'cardGradientEnd' => '#ffffff',
            'gradientMode' => [
                'bgPrimary' => false,
                'bgSecondary' => false,
                'bgCard' => false,
                'bgHover' => false,
                'borderPrimary' => false,
                'borderSecondary' => false,
                'textPrimary' => false,
                'textSecondary' => false
            ],
            'gradientData' => [
                'sidebarBg' => ['color1' => '#ffffff', 'color2' => '#ffffff', 'direction' => '90deg'],
                'headerBg' => ['color1' => '#ffffff', 'color2' => '#ffffff', 'direction' => '180deg'],
                'bgPrimary' => ['color1' => '#f8f9fa', 'color2' => '#f8f9fa', 'direction' => '180deg']
            ],
            'activeButtonBg' => '#e9ecef',
            'activeButtonText' => '#212529',
            'activeButtonIcon' => '#212529',
            'tableBg' => '#ffffff',
            'tableHeaderBg' => '#f8f9fa',
            'tableHeaderText' => '#212529'
        ],
        'typography' => [
            'fontFamily' => 'Cairo',
            'tableFontFamily' => 'Cairo',
            'tableFontSize' => 14,
            'tableFontWeight' => 600
        ]
    ],
    [
        'id' => 'modern-gradient',
        'name' => 'Modern Gradient',
        'nameAr' => 'التدرج العصري',
        'colors' => [
            'bgPrimary' => '#1e1e2f',
            'bgSecondary' => '#252538',
            'bgCard' => '#2d2d44',
            'bgHover' => '#3a3a55',
            'borderPrimary' => 'rgba(139, 92, 246, 0.2)',
            'textPrimary' => '#ffffff',
            'textSecondary' => '#a5b4fc',
            'accent' => '#8b5cf6',
            'accentSecondary' => '#ec4899',
            'success' => '#10b981',
            'error' => '#f43f5e',
            'warning' => '#fb923c',
            'sidebarBgStart' => '#1e1e2f',
            'sidebarBgEnd' => '#252538'
        ],
        'typography' => [
            'fontFamily' => 'Cairo',
            'tableFontFamily' => 'Cairo',
            'tableFontSize' => 14,
            'tableFontWeight' => 600
        ]
    ],
    [
        'id' => 'emerald-dark',
        'name' => 'Emerald Dark',
        'nameAr' => 'الزمرد الداكن',
        'colors' => [
            'bgPrimary' => '#0c1f1f',
            'bgSecondary' => '#132626',
            'bgCard' => '#1a3333',
            'bgHover' => '#234545',
            'borderPrimary' => '#1f4040',
            'textPrimary' => '#ffffff',
            'textSecondary' => '#6ee7b7',
            'accent' => '#10b981',
            'success' => '#10b981',
            'error' => '#f87171',
            'warning' => '#fbbf24',
            'sidebarBgStart' => '#0c1f1f',
            'sidebarBgEnd' => '#132626'
        ],
        'typography' => [
            'fontFamily' => 'Cairo',
            'tableFontFamily' => 'Cairo',
            'tableFontSize' => 14,
            'tableFontWeight' => 600
        ]
    ]
];

try {
    // إنشاء الجدول إذا لم يكن موجوداً
    $createTableSQL = "CREATE TABLE IF NOT EXISTS custom_themes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        theme_id VARCHAR(255) UNIQUE NOT NULL,
        theme_name VARCHAR(255) NOT NULL,
        theme_name_ar VARCHAR(255),
        theme_icon VARCHAR(50),
        theme_description TEXT,
        colors JSON,
        typography JSON,
        is_active BOOLEAN DEFAULT FALSE,
        is_custom BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_theme_id` (`theme_id`),
        KEY `idx_is_active` (`is_active`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='القوالب المخصصة للنظام'";
    
    $pdo->exec($createTableSQL);
    
    $created = 0;
    $updated = 0;
    $skipped = 0;
    
    foreach ($defaultThemes as $theme) {
        // التحقق من وجود القالب
        $stmt = $pdo->prepare("SELECT id FROM custom_themes WHERE theme_id = ?");
        $stmt->execute([$theme['id']]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            // تحديث القالب الموجود (إذا كان موجوداً بالفعل)
            $stmt = $pdo->prepare("UPDATE custom_themes SET 
                theme_name = ?, 
                theme_name_ar = ?, 
                colors = ?, 
                typography = ?,
                is_custom = 0,
                updated_at = CURRENT_TIMESTAMP
                WHERE theme_id = ?");
            $stmt->execute([
                $theme['name'],
                $theme['nameAr'],
                json_encode($theme['colors'], JSON_UNESCAPED_UNICODE),
                json_encode($theme['typography'], JSON_UNESCAPED_UNICODE),
                $theme['id']
            ]);
            $updated++;
        } else {
            // إنشاء قالب جديد
            $stmt = $pdo->prepare("INSERT INTO custom_themes 
                (theme_id, theme_name, theme_name_ar, colors, typography, is_custom) 
                VALUES (?, ?, ?, ?, ?, 0)");
            $stmt->execute([
                $theme['id'],
                $theme['name'],
                $theme['nameAr'],
                json_encode($theme['colors'], JSON_UNESCAPED_UNICODE),
                json_encode($theme['typography'], JSON_UNESCAPED_UNICODE)
            ]);
            $created++;
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => "تم تهيئة القوالب بنجاح",
        'created' => $created,
        'updated' => $updated,
        'total' => count($defaultThemes)
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'خطأ: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>


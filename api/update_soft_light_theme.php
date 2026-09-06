<?php
/**
 * تحديث قالب "الضوء الناعم" في جدول custom_themes إلى الألوان والنمط الهندسي الحالي.
 * شغّل هذا الملف مرة واحدة من المتصفح أو عبر سطر الأوامر ثم احذفه أو تجاهله.
 */

require_once __DIR__ . '/config_unified.php';

header('Content-Type: application/json; charset=utf-8');

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
        'sidebarBg' => ['color1' => '#e8ecf2', 'color2' => '#dce2eb', 'direction' => '90deg'],
        'headerBg' => ['color1' => '#eef2f7', 'color2' => '#e2e8f0', 'direction' => '180deg'],
        'bgPrimary' => ['color1' => '#f5f7fa', 'color2' => '#eef2f7', 'direction' => '180deg']
    ]
];

try {
    $colorsJson = json_encode($softLightColors, JSON_UNESCAPED_UNICODE);
    $stmt = $pdo->prepare("UPDATE custom_themes SET theme_name = ?, theme_name_ar = ?, colors = ?, updated_at = CURRENT_TIMESTAMP WHERE theme_id = 'soft-light'");
    $stmt->execute(['Soft Light', 'الضوء الناعم', $colorsJson]);
    $updated = $stmt->rowCount() > 0;

    if ($updated) {
        echo json_encode([
            'success' => true,
            'message' => 'تم تحديث ألوان قالب الضوء الناعم في قاعدة البيانات بنجاح.',
            'updated' => true
        ], JSON_UNESCAPED_UNICODE);
    } else {
        $stmt = $pdo->prepare("INSERT INTO custom_themes (theme_id, theme_name, theme_name_ar, colors, is_custom) VALUES ('soft-light', 'Soft Light', 'الضوء الناعم', ?, 0)");
        $stmt->execute([$colorsJson]);
        echo json_encode([
            'success' => true,
            'message' => 'تم إنشاء سجل قالب الضوء الناعم في قاعدة البيانات.',
            'inserted' => true
        ], JSON_UNESCAPED_UNICODE);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'خطأ: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

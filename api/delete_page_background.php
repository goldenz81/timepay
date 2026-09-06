<?php

/**
 * حذف صورة خلفية صفحة من القرص وقاعدة البيانات
 */

require_once 'cors_headers.php';
require_once 'config_unified.php';
require_once 'page_background_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$target = isset($input['target']) ? trim((string) $input['target']) : '';

$targets = page_background_targets_map();
if (!isset($targets[$target])) {
    echo json_encode(['success' => false, 'message' => 'هدف الحذف غير صالح']);
    exit;
}

$targetConfig = $targets[$target];
$variableKey = $targetConfig['variable_key'];

try {
    $currentUrl = get_page_background_image_url($pdo, $variableKey);
    $fileDeleted = false;

    if ($currentUrl !== '') {
        $fileDeleted = delete_page_background_file($currentUrl);
    }

    clear_page_background_setting($pdo, $targetConfig);

    echo json_encode([
        'success' => true,
        'target' => $target,
        'fileDeleted' => $fileDeleted,
        'hadImage' => $currentUrl !== '',
        'message' => 'تم حذف صورة الخلفية بنجاح',
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'فشل حذف صورة الخلفية من قاعدة البيانات']);
}

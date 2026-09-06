<?php

/**
 * رفع صورة خلفية صفحة (الدخول / صفحات النظام / الهيدر / Sidebar)
 */

require_once 'cors_headers.php';
require_once 'config_unified.php';
require_once 'page_background_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$targets = page_background_targets_map();
$target = isset($_POST['target']) ? trim($_POST['target']) : 'login';

if (!isset($targets[$target])) {
    echo json_encode(['success' => false, 'message' => 'هدف الرفع غير صالح']);
    exit;
}

$targetConfig = $targets[$target];
$fileKey = isset($_FILES['background']) ? 'background' : (isset($_FILES['image']) ? 'image' : null);

if (!$fileKey || $_FILES[$fileKey]['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'لم يتم رفع ملف أو حدث خطأ في الرفع']);
    exit;
}

$file = $_FILES[$fileKey];
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
if (!in_array($file['type'], $allowedTypes)) {
    echo json_encode(['success' => false, 'message' => 'نوع الملف غير مدعوم. المسموح: JPG, PNG, GIF, WebP']);
    exit;
}

$maxSize = 5 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    echo json_encode(['success' => false, 'message' => 'حجم الملف كبير. أقصى 5 ميجابايت']);
    exit;
}

$uploadDir = page_background_uploads_dir() . DIRECTORY_SEPARATOR;
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$ext = pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'png';
$fileName = $targetConfig['file_prefix'] . time() . '_' . uniqid() . '.' . strtolower($ext);
$filePath = $uploadDir . $fileName;

if (move_uploaded_file($file['tmp_name'], $filePath)) {
    $imageUrl = '/uploads/backgrounds/' . $fileName;
    $variableKey = $targetConfig['variable_key'];

    try {
        $oldUrl = get_page_background_image_url($pdo, $variableKey);
        if ($oldUrl !== '' && $oldUrl !== $imageUrl) {
            delete_page_background_file($oldUrl);
        }

        $stmt = $pdo->prepare('SELECT id FROM system_variables WHERE variable_key = ?');
        $stmt->execute([$variableKey]);

        if ($stmt->rowCount() > 0) {
            $stmt = $pdo->prepare('UPDATE system_variables SET variable_value = ?, updated_at = NOW() WHERE variable_key = ?');
            $stmt->execute([$imageUrl, $variableKey]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO system_variables (variable_key, variable_name_ar, variable_name_en, variable_value, variable_type, category, is_editable, is_required, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 'text', 'general', 1, 0, 1, NOW(), NOW())");
            $stmt->execute([$variableKey, $targetConfig['name_ar'], $variableKey, $imageUrl]);
        }

        echo json_encode(['success' => true, 'imageUrl' => $imageUrl, 'target' => $target], JSON_UNESCAPED_UNICODE);
    } catch (PDOException $e) {
        @unlink($filePath);
        echo json_encode(['success' => false, 'message' => 'فشل حفظ الرابط في قاعدة البيانات']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'فشل رفع الملف']);
}

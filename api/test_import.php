<?php
require_once 'cors_headers.php';
require_once 'config.php';

error_log("=== بدء اختبار الاستيراد ===");

try {
    $input = json_decode(file_get_contents('php://input'), true);
    error_log("Input decoded successfully");

    echo json_encode([
        'success' => true,
        'message' => 'الاستيراد يعمل'
    ]);
} catch (Exception $e) {
    error_log("Exception: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'خطأ: ' . $e->getMessage()
    ]);
}
?>
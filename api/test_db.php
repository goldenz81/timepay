<?php
require_once 'cors_headers.php';
require_once 'config.php';

try {
    // اختبار الاتصال
    $stmt = $pdo->query("SELECT 1");
    echo json_encode([
        'success' => true,
        'message' => 'الاتصال بقاعدة البيانات يعمل',
        'pdo_connected' => isset($pdo)
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'خطأ في قاعدة البيانات: ' . $e->getMessage()
    ]);
}
?>
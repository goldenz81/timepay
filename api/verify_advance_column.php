<?php
require_once 'config_unified.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // التحقق من عمود السلفة في الجدول الشهري
    $stmt = $pdo->query("
        SELECT * FROM monthly_salary_entitlements_columns 
        WHERE column_key = 'advance_amount'
    ");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'عمود السلفة موجود في الجدول الشهري',
            'data' => $result
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'عمود السلفة غير موجود في الجدول الشهري'
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}


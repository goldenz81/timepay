<?php
require_once 'config_unified.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // التحقق من معادلات المستحقات
    $entitlements = $pdo->query("
        SELECT column_key, column_name_ar, formula, is_calculated
        FROM monthly_salary_entitlements_columns
        WHERE is_calculated = 1 AND formula IS NOT NULL AND formula != ''
        ORDER BY display_order
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    // التحقق من معادلات المستقطعات
    $deductions = $pdo->query("
        SELECT column_key, column_name_ar, formula, is_calculated
        FROM monthly_salary_deductions_columns
        WHERE is_calculated = 1 AND formula IS NOT NULL AND formula != ''
        ORDER BY display_order
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'entitlements' => [
            'count' => count($entitlements),
            'formulas' => $entitlements
        ],
        'deductions' => [
            'count' => count($deductions),
            'formulas' => $deductions
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}


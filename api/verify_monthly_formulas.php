<?php
require_once 'config_unified.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // التحقق من معادلات daily_wage و hourly_wage
    $stmt = $pdo->query("
        SELECT column_key, formula 
        FROM monthly_salary_entitlements_columns 
        WHERE column_key IN ('daily_wage', 'hourly_wage')
    ");
    
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'formulas' => $results
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}


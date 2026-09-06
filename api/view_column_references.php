<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

try {
    require_once 'config.php';
    
    // جلب جميع المراجع
    $stmt = $pdo->query("
        SELECT 
            id,
            source_table,
            source_column_key,
            target_table,
            target_column_key,
            display_name_ar,
            display_name_en,
            is_active,
            created_at,
            updated_at
        FROM column_references
        ORDER BY target_table, target_column_key
    ");
    $allReferences = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // جلب المراجع النشطة فقط
    $stmt = $pdo->query("
        SELECT 
            id,
            source_table,
            source_column_key,
            target_table,
            target_column_key,
            display_name_ar,
            display_name_en,
            is_active,
            created_at,
            updated_at
        FROM column_references
        WHERE is_active = 1
        ORDER BY target_table, target_column_key
    ");
    $activeReferences = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // جلب المراجع الخاصة بـ weekly_wage_entitlements
    $stmt = $pdo->prepare("
        SELECT 
            id,
            source_table,
            source_column_key,
            target_table,
            target_column_key,
            display_name_ar,
            display_name_en,
            is_active,
            created_at,
            updated_at
        FROM column_references
        WHERE target_table = 'weekly_wage_entitlements'
        ORDER BY target_column_key
    ");
    $stmt->execute();
    $entitlementsReferences = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // التحقق من وجود مرجع "إجمالي المستحقات"
    $stmt = $pdo->prepare("
        SELECT 
            id,
            source_table,
            source_column_key,
            target_table,
            target_column_key,
            display_name_ar,
            display_name_en,
            is_active,
            created_at,
            updated_at
        FROM column_references
        WHERE target_table = 'weekly_wage_entitlements' 
          AND (target_column_key = 'total_entitlements' OR display_name_ar LIKE '%إجمالي المستحقات%')
    ");
    $stmt->execute();
    $totalEntitlementsRefs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // التحقق من وجود العمود في net_weekly_wage
    $stmt = $pdo->prepare("
        SELECT 
            id,
            column_key,
            column_name_ar,
            column_name_en,
            is_visible,
            is_calculated,
            display_order
        FROM net_weekly_wage
        WHERE column_key = 'total_entitlements'
    ");
    $stmt->execute();
    $netWeeklyWageColumn = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'summary' => [
            'all_references_count' => count($allReferences),
            'active_references_count' => count($activeReferences),
            'entitlements_references_count' => count($entitlementsReferences),
            'total_entitlements_references_count' => count($totalEntitlementsRefs),
            'net_weekly_wage_column_exists' => $netWeeklyWageColumn !== false
        ],
        'all_references' => $allReferences,
        'active_references' => $activeReferences,
        'entitlements_references' => $entitlementsReferences,
        'total_entitlements_references' => $totalEntitlementsRefs,
        'net_weekly_wage_column' => $netWeeklyWageColumn
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'خطأ: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_UNESCAPED_UNICODE);
}
?>


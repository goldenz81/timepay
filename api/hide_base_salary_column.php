<?php
/**
 * إخفاء عمود base_salary العادي في net_monthly_salary
 * لأننا نريد استخدامه كمرجع فقط
 */

require_once __DIR__ . '/../models/Database.php';

try {
    $pdo = Database::connect();
    
    if (!$pdo) {
        throw new Exception('فشل الاتصال بقاعدة البيانات');
    }
    
    $targetTable = 'net_monthly_salary';
    $columnKey = 'base_salary';
    
    echo "=== إخفاء عمود base_salary العادي ===\n\n";
    
    // 1. التحقق من وجود العمود
    $checkStmt = $pdo->prepare("
        SELECT id, column_key, column_name_ar, is_visible
        FROM {$targetTable}
        WHERE column_key = ?
    ");
    $checkStmt->execute([$columnKey]);
    $column = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$column) {
        echo "⚠️ العمود '{$columnKey}' غير موجود في {$targetTable}\n";
        exit(1);
    }
    
    echo "العمود الحالي:\n";
    echo "  - ID: {$column['id']}\n";
    echo "  - column_name_ar: {$column['column_name_ar']}\n";
    echo "  - is_visible: {$column['is_visible']}\n\n";
    
    if ($column['is_visible'] == 0) {
        echo "✓ العمود مخفي بالفعل\n";
    } else {
        // 2. إخفاء العمود
        $pdo->beginTransaction();
        
        try {
            $updateStmt = $pdo->prepare("
                UPDATE {$targetTable}
                SET is_visible = 0,
                    updated_at = NOW()
                WHERE column_key = ?
            ");
            $updateStmt->execute([$columnKey]);
            
            $pdo->commit();
            
            echo "✓ تم إخفاء العمود العادي بنجاح\n";
            echo "  الآن سيظهر base_salary كمرجع فقط من net_monthly_salary\n";
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
    
    // 3. التحقق من المراجع
    echo "\n=== التحقق من المراجع ===\n";
    $refStmt = $pdo->prepare("
        SELECT id, source_table, source_column_key, is_active
        FROM column_references
        WHERE target_table = ?
        AND source_column_key = ?
        AND is_active = 1
    ");
    $refStmt->execute([$targetTable, $columnKey]);
    $refs = $refStmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($refs) > 0) {
        foreach ($refs as $ref) {
            if ($ref['source_table'] === 'net_monthly_salary') {
                echo "✓ المرجع الصحيح موجود (ID: {$ref['id']})\n";
                echo "  - source_table: net_monthly_salary ✓\n";
            } else {
                echo "⚠️ المرجع خاطئ (ID: {$ref['id']})\n";
                echo "  - source_table: {$ref['source_table']} (يجب أن يكون net_monthly_salary)\n";
            }
        }
    } else {
        echo "⚠️ لا توجد مراجع نشطة لـ base_salary\n";
    }
    
    echo "\n✓ تمت العملية بنجاح!\n";
    echo "الآن base_salary سيظهر كمرجع واحد فقط من net_monthly_salary\n";
    
} catch (Exception $e) {
    echo "\n✗ خطأ: " . $e->getMessage() . "\n";
    exit(1);
}
?>


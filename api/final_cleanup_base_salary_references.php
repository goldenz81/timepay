<?php
/**
 * تنظيف نهائي لجميع المراجع المتعلقة بـ base_salary في net_monthly_salary
 */

require_once __DIR__ . '/../models/Database.php';

try {
    $pdo = Database::connect();
    
    if (!$pdo) {
        throw new Exception('فشل الاتصال بقاعدة البيانات');
    }
    
    $targetTable = 'net_monthly_salary';
    $columnKey = 'base_salary';
    
    echo "=== تنظيف نهائي لمراجع base_salary في {$targetTable} ===\n\n";
    
    // 1. حذف جميع المراجع (نشطة ومعطلة) من أي source_table
    $deleteStmt = $pdo->prepare("
        DELETE FROM column_references
        WHERE target_table = ?
        AND (source_column_key = ? OR target_column_key = ?)
    ");
    $deleteStmt->execute([$targetTable, $columnKey, $columnKey]);
    $deletedCount = $deleteStmt->rowCount();
    echo "✅ تم حذف {$deletedCount} مرجع\n\n";
    
    // 2. التحقق من عدم وجود مراجع متبقية
    $checkStmt = $pdo->prepare("
        SELECT COUNT(*) as count
        FROM column_references
        WHERE target_table = ?
        AND (source_column_key = ? OR target_column_key = ?)
    ");
    $checkStmt->execute([$targetTable, $columnKey, $columnKey]);
    $remainingCount = $checkStmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($remainingCount == 0) {
        echo "✅ لا توجد مراجع متبقية\n\n";
    } else {
        echo "⚠️ يوجد {$remainingCount} مرجع متبقي\n\n";
    }
    
    // 3. التحقق من وجود العمود كعمود عادي
    $columnStmt = $pdo->prepare("
        SELECT 
            id,
            column_key,
            column_name_ar,
            is_visible,
            is_editable,
            is_calculated
        FROM {$targetTable}
        WHERE column_key = ?
    ");
    $columnStmt->execute([$columnKey]);
    $column = $columnStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($column) {
        echo "✅ العمود موجود كعمود عادي:\n";
        echo "   ID: {$column['id']}\n";
        echo "   column_key: {$column['column_key']}\n";
        echo "   column_name_ar: {$column['column_name_ar']}\n";
        echo "   is_visible: {$column['is_visible']}\n";
        echo "   is_editable: {$column['is_editable']}\n";
        echo "   is_calculated: {$column['is_calculated']}\n\n";
        
        // التأكد من أن العمود ليس محسوباً (ليس مرجعاً)
        if ($column['is_calculated'] == 1) {
            $updateStmt = $pdo->prepare("
                UPDATE {$targetTable}
                SET is_calculated = 0
                WHERE id = ?
            ");
            $updateStmt->execute([$column['id']]);
            echo "✅ تم تحديث is_calculated إلى 0 (عمود عادي)\n\n";
        }
    } else {
        echo "❌ العمود غير موجود\n\n";
    }
    
    echo "=== تم بنجاح ===\n";
    
} catch (Exception $e) {
    echo "❌ خطأ: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}


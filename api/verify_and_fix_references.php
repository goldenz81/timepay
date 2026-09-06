<?php
/**
 * التحقق الشامل من جميع المراجع وإصلاحها
 */

require_once __DIR__ . '/../models/Database.php';

try {
    $pdo = Database::connect();
    
    if (!$pdo) {
        throw new Exception('فشل الاتصال بقاعدة البيانات');
    }
    
    $targetTable = 'net_monthly_salary';
    
    echo "=== التحقق الشامل من المراجع ===\n\n";
    
    // 1. جلب جميع المراجع (بما في ذلك المعطلة)
    $stmt = $pdo->prepare("
        SELECT id, source_table, source_column_key, target_table, target_column_key, is_active, created_at, updated_at
        FROM column_references
        WHERE target_table = ?
        ORDER BY is_active DESC, id DESC
    ");
    $stmt->execute([$targetTable]);
    $allRefs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "إجمالي المراجع: " . count($allRefs) . "\n\n";
    
    $wrongRefs = [];
    $correctRefs = [];
    
    foreach ($allRefs as $ref) {
        $status = ($ref['is_active'] == 1) ? '✓ نشط' : '✗ معطل';
        
        if ($ref['source_table'] === 'net_weekly_wage') {
            $wrongRefs[] = $ref;
            echo "  {$status} ID: {$ref['id']}, source_table: {$ref['source_table']} ⚠️ خطأ\n";
        } else if ($ref['source_table'] === 'net_monthly_salary') {
            $correctRefs[] = $ref;
            echo "  {$status} ID: {$ref['id']}, source_table: {$ref['source_table']} ✓ صحيح\n";
        }
    }
    
    // 2. حذف جميع المراجع الخاطئة
    if (count($wrongRefs) > 0) {
        echo "\n=== حذف المراجع الخاطئة ===\n";
        $pdo->beginTransaction();
        
        try {
            $wrongIds = array_column($wrongRefs, 'id');
            $placeholders = str_repeat('?,', count($wrongIds) - 1) . '?';
            
            $deleteStmt = $pdo->prepare("
                DELETE FROM column_references
                WHERE id IN ($placeholders)
            ");
            $deleteStmt->execute($wrongIds);
            
            $pdo->commit();
            echo "✓ تم حذف " . count($wrongRefs) . " مرجع خاطئ\n";
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
    
    // 3. التأكد من وجود مرجع صحيح لـ base_salary
    $baseSalaryRef = array_filter($correctRefs, function($ref) {
        return $ref['source_column_key'] === 'base_salary' && $ref['is_active'] == 1;
    });
    
    if (empty($baseSalaryRef)) {
        echo "\n=== إنشاء مرجع صحيح لـ base_salary ===\n";
        
        // التحقق من وجود العمود
        $checkColStmt = $pdo->prepare("
            SELECT column_key, column_name_ar, column_name_en
            FROM net_monthly_salary
            WHERE column_key = 'base_salary'
        ");
        $checkColStmt->execute();
        $column = $checkColStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($column) {
            $pdo->beginTransaction();
            
            try {
                $insertStmt = $pdo->prepare("
                    INSERT INTO column_references 
                    (source_table, source_column_key, target_table, target_column_key, display_name_ar, display_name_en, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
                ");
                
                $displayNameAr = $column['column_name_ar'] . ' (مرجع)';
                $displayNameEn = ($column['column_name_en'] ?? 'base_salary') . ' (Reference)';
                
                $insertStmt->execute([
                    'net_monthly_salary',
                    'base_salary',
                    $targetTable,
                    'base_salary',
                    $displayNameAr,
                    $displayNameEn
                ]);
                
                $newRefId = $pdo->lastInsertId();
                $pdo->commit();
                
                echo "✓ تم إنشاء المرجع الصحيح (ID: {$newRefId})\n";
            } catch (Exception $e) {
                $pdo->rollBack();
                if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
                    echo "⚠️ المرجع موجود بالفعل (مكرر)\n";
                } else {
                    throw $e;
                }
            }
        } else {
            echo "⚠️ العمود base_salary غير موجود في net_monthly_salary\n";
        }
    } else {
        echo "\n✓ المرجع الصحيح لـ base_salary موجود بالفعل\n";
    }
    
    // 4. التحقق النهائي
    echo "\n=== التحقق النهائي ===\n";
    $finalStmt = $pdo->prepare("
        SELECT id, source_table, source_column_key, is_active
        FROM column_references
        WHERE target_table = ?
        ORDER BY is_active DESC, id DESC
    ");
    $finalStmt->execute([$targetTable]);
    $finalRefs = $finalStmt->fetchAll(PDO::FETCH_ASSOC);
    
    $activeCount = 0;
    $wrongActiveCount = 0;
    
    foreach ($finalRefs as $ref) {
        $status = ($ref['is_active'] == 1) ? '✓ نشط' : '✗ معطل';
        $sourceStatus = '';
        
        if ($ref['is_active'] == 1) {
            $activeCount++;
            if ($ref['source_table'] === 'net_weekly_wage') {
                $wrongActiveCount++;
            }
        }
        
        if ($ref['source_table'] === 'net_monthly_salary') {
            $sourceStatus = ' ✓ صحيح';
        } else if ($ref['source_table'] === 'net_weekly_wage') {
            $sourceStatus = ' ⚠️ خطأ';
        }
        
        echo "  {$status} ID: {$ref['id']}, source_table: {$ref['source_table']}, source_column_key: {$ref['source_column_key']}{$sourceStatus}\n";
    }
    
    echo "\n=== ملخص ===\n";
    echo "المراجع النشطة: {$activeCount}\n";
    if ($wrongActiveCount > 0) {
        echo "⚠️ المراجع الخاطئة النشطة: {$wrongActiveCount}\n";
        echo "✗ لا يزال يوجد مراجع خاطئة!\n";
    } else {
        echo "✓ جميع المراجع النشطة صحيحة (من net_monthly_salary)\n";
    }
    
} catch (Exception $e) {
    echo "\n✗ خطأ: " . $e->getMessage() . "\n";
    exit(1);
}
?>


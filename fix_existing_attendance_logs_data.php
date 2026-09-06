<?php
/**
 * سكريبت لإصلاح البيانات الموجودة في attendance_logs
 * المشكلة: بعض السجلات تحتوي على AC-No. (كود البصمة) في employee_id بدلاً من ID الحقيقي
 * 
 * @author TimePay System
 * @date 2026-01-12
 */

require_once 'api/config.php';

try {
    echo "بدء إصلاح بيانات attendance_logs...\n\n";
    
    // 1. إضافة عمود employee_code إذا لم يكن موجوداً
    try {
        // التحقق من وجود العمود أولاً
        $checkColumn = $pdo->query("
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'attendance_logs' 
            AND COLUMN_NAME = 'employee_code'
        ");
        $columnExists = $checkColumn->fetch(PDO::FETCH_ASSOC)['count'] > 0;
        
        if (!$columnExists) {
            $pdo->exec("ALTER TABLE `attendance_logs` 
                ADD COLUMN `employee_code` VARCHAR(50) NULL COMMENT 'كود الموظف' AFTER `employee_id`");
            echo "✓ تم إضافة عمود employee_code\n";
        } else {
            echo "✓ عمود employee_code موجود بالفعل\n";
        }
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column') === false && strpos($e->getMessage(), 'already exists') === false) {
            throw $e;
        }
        echo "✓ عمود employee_code موجود بالفعل\n";
    }
    
    // 2. البحث عن السجلات التي تحتوي على employee_id غير موجود في جدول employees
    $stmt = $pdo->query("
        SELECT DISTINCT al.employee_id, al.id, al.attendance_date
        FROM attendance_logs al
        LEFT JOIN employees e ON al.employee_id = e.id
        WHERE e.id IS NULL
        LIMIT 100
    ");
    $problematicRecords = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "\nتم العثور على " . count($problematicRecords) . " سجل مشكوك فيه\n\n";
    
    if (count($problematicRecords) > 0) {
        $fixed = 0;
        $notFound = 0;
        
        foreach ($problematicRecords as $record) {
            $employee_id_value = $record['employee_id'];
            
            // محاولة البحث عن الموظف بعدة طرق
            $employee = null;
            
            // 1. البحث مباشرة باستخدام employee_id (في حالة كان رقم غير موجود)
            if (is_numeric($employee_id_value)) {
                $empStmt = $pdo->prepare("
                    SELECT id, employee_code, `AC-No.`, name, name_ar
                    FROM employees 
                    WHERE id = ? AND status = 'active'
                    LIMIT 1
                ");
                $empStmt->execute([$employee_id_value]);
                $employee = $empStmt->fetch(PDO::FETCH_ASSOC);
            }
            
            // 2. إذا لم يتم العثور عليه، البحث باستخدام AC-No. أو fingerprint_id أو employee_code
            if (!$employee) {
                $empStmt = $pdo->prepare("
                    SELECT id, employee_code, `AC-No.`, name, name_ar
                    FROM employees 
                    WHERE (`AC-No.` = ? OR fingerprint_id = ? OR employee_code = ?) AND status = 'active'
                    LIMIT 1
                ");
                $empStmt->execute([$employee_id_value, $employee_id_value, $employee_id_value]);
                $employee = $empStmt->fetch(PDO::FETCH_ASSOC);
            }
            
            if ($employee) {
                // تحديث جميع السجلات التي تحتوي على نفس employee_id الخاطئ
                $updateStmt = $pdo->prepare("
                    UPDATE attendance_logs 
                    SET employee_id = ?, employee_code = ?
                    WHERE employee_id = ? AND id = ?
                ");
                $updateStmt->execute([
                    $employee['id'],
                    $employee['employee_code'],
                    $employee_id_value,
                    $record['id']
                ]);
                
                $fixed++;
                echo "✓ تم إصلاح السجل ID: {$record['id']} - Employee ID القديم: {$employee_id_value} -> Employee ID الجديد: {$employee['id']} (الاسم: {$employee['name']})\n";
            } else {
                $notFound++;
                echo "✗ لم يتم العثور على موظف لـ Employee ID: {$employee_id_value} (السجل ID: {$record['id']})\n";
            }
        }
        
        echo "\n=== ملخص الإصلاح ===\n";
        echo "تم إصلاح: $fixed سجل\n";
        echo "لم يتم العثور على موظف: $notFound سجل\n";
    } else {
        echo "لا توجد سجلات تحتاج إصلاح\n";
    }
    
    // 3. تحديث employee_code للسجلات التي لا تحتوي عليه
    $updateStmt = $pdo->prepare("
        UPDATE attendance_logs al
        INNER JOIN employees e ON al.employee_id = e.id
        SET al.employee_code = e.employee_code
        WHERE al.employee_code IS NULL AND e.employee_code IS NOT NULL
    ");
    $updateStmt->execute();
    $updated = $updateStmt->rowCount();
    
    echo "\n✓ تم تحديث employee_code لـ $updated سجل\n";
    
    echo "\n✓ تم الانتهاء من إصلاح البيانات بنجاح!\n";
    
} catch (Exception $e) {
    echo "✗ خطأ: " . $e->getMessage() . "\n";
    echo "الملف: " . $e->getFile() . "\n";
    echo "السطر: " . $e->getLine() . "\n";
    exit(1);
}
?>


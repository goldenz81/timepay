<?php
/**
 * تحديث معادلات المستقطعات الأسبوعية
 * هذا الملف يحدث المعادلات في جدول weekly_wage_deductions
 */

require_once 'cors_headers.php';

// إعدادات قاعدة البيانات
$host = 'localhost';
$dbname = 'timepay_unified';
$username = 'root';
$password = 'mysql';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "بدء تحديث معادلات المستقطعات الأسبوعية...\n\n";
    
    // ملاحظة: هذه المعادلات للراتب الأسبوعي (weekly salary)
    $formulas = [
        // خصم الغياب: أيام الغياب × الأجر اليومي
        'absence_deduction' => 'absent_days * daily_wage',
        
        // خصم التأخير: ساعات التأخير × أجر الساعة
        'late_deduction' => 'late_hours * hourly_wage',
        
        // خصم التأمين: قيمة ثابتة من weekly_insurance_amount (من system_variables)
        'insurance_deduction' => 'weekly_insurance_amount',
        
        // خصم السلفة: قيمة مباشرة من advance_payment
        'advance_deduction' => 'advance_payment',
        
        // إجمالي المستقطعات: مجموع جميع المستقطعات
        'total_deductions' => 'absence_deduction + late_deduction + insurance_deduction + advance_deduction'
    ];
    
    $updated = 0;
    $notFound = [];
    
    foreach ($formulas as $columnKey => $formula) {
        try {
            // التحقق من وجود العمود أولاً
            $checkStmt = $pdo->prepare("
                SELECT id, column_key, column_name_ar 
                FROM weekly_wage_deductions 
                WHERE column_key = ?
            ");
            $checkStmt->execute([$columnKey]);
            $column = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($column) {
                // تحديث المعادلة
                $updateStmt = $pdo->prepare("
                    UPDATE weekly_wage_deductions 
                    SET formula = ?, 
                        is_calculated = 1,
                        updated_at = NOW()
                    WHERE column_key = ?
                ");
                $updateStmt->execute([$formula, $columnKey]);
                
                echo "✓ تم تحديث: {$column['column_name_ar']} ({$columnKey})\n";
                echo "  المعادلة: {$formula}\n\n";
                $updated++;
            } else {
                echo "✗ لم يتم العثور على: {$columnKey}\n\n";
                $notFound[] = $columnKey;
            }
        } catch (PDOException $e) {
            echo "✗ خطأ في تحديث {$columnKey}: " . $e->getMessage() . "\n\n";
        }
    }
    
    echo "\n=== ملخص التحديث ===\n";
    echo "تم تحديث: {$updated} عمود\n";
    if (!empty($notFound)) {
        echo "لم يتم العثور على: " . implode(', ', $notFound) . "\n";
    }
    
    // التحقق من القيم المحدثة
    echo "\n=== التحقق من القيم المحدثة ===\n";
    $verifyStmt = $pdo->prepare("
        SELECT column_key, column_name_ar, formula, is_calculated 
        FROM weekly_wage_deductions 
        WHERE is_calculated = 1
        ORDER BY display_order
    ");
    $verifyStmt->execute();
    $results = $verifyStmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($results as $row) {
        echo "{$row['column_name_ar']} ({$row['column_key']}): {$row['formula']}\n";
    }
    
} catch (PDOException $e) {
    echo "خطأ في الاتصال بقاعدة البيانات: " . $e->getMessage() . "\n";
    exit(1);
}


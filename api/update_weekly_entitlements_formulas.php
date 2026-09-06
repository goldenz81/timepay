<?php
/**
 * سكريبت لتحديث المعادلات الصحيحة لأعمدة المستحقات الأسبوعية
 * Script to update correct formulas for weekly wage entitlements columns
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
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    
    // بدء المعاملة
    $pdo->beginTransaction();
    
    echo "بدء تحديث معادلات أعمدة المستحقات الأسبوعية...\n\n";
    
    // تعريف المعادلات الصحيحة لكل عمود (بناءً على الأعمدة الموجودة في الجدول)
    // ملاحظة: هذه المعادلات للراتب الأسبوعي (weekly salary)
    $formulas = [
        // الأعمدة الأساسية
        'base_salary' => 'base_salary', // قيمة مباشرة
        'daily_wage' => 'base_salary / weekly_work_days', // الراتب الأساسي ÷ عدد أيام العمل في الأسبوع (وليس 30 يوم)
        'weekly_wage' => 'base_salary', // الأجر الأسبوعي = الراتب الأساسي مباشرة (لأن الراتب الأساسي أسبوعي)
        'hourly_wage' => 'daily_wage / daily_work_hours', // الأجر اليومي ÷ ساعات العمل اليومية
        
        // ساعات الإضافي
        'overtime_hours' => 'regular_overtime_hours + holiday_overtime_hours', // إجمالي الساعات الإضافية (الأيام العادية + أيام العطلات)
        'overtime_pay' => '(regular_overtime_hours * hourly_wage * regular_overtime_multiplier) + (holiday_overtime_hours * hourly_wage * holiday_work_multiplier)', // أجر الإضافي = (الساعات الإضافية العادية × أجر الساعة × مضاعف الأضافي في العمل) + (الساعات الإضافية في العطلات × أجر الساعة × مضاعف الأضافي في العطلة)
        
        // أيام الانتظام وأجر الانتظام
        'regularity_days' => 'on_time_days', // أيام الانتظام (محسوبة من attendance_logs)
        'regularity_pay' => 'on_time_days * meal_allowance_per_day', // أيام الانتظام × مكافأة الانتظام اليومية
        
        // بدل المواصلات والمكافآت
        'transport_allowance' => 'transport_allowance', // قيمة مباشرة (من attendance_logs)
        'special_bonus' => 'special_bonus', // مكافأة خاصة أسبوعية (قيمة مباشرة)
        'advance_payment' => 'advance_amount' // سلفة (قيمة مباشرة)
    ];
    
    $updated = 0;
    $notFound = [];
    
    foreach ($formulas as $columnKey => $formula) {
        try {
            // التحقق من وجود العمود
            $checkStmt = $pdo->prepare("SELECT id, column_key FROM weekly_wage_entitlements WHERE column_key = ?");
            $checkStmt->execute([$columnKey]);
            $column = $checkStmt->fetch();
            
            if ($column) {
                // تحديث المعادلة
                // إذا كانت المعادلة قيمة مباشرة (مثل 'base_salary' أو 'transport_allowance')، لا نحتاج is_calculated = 1
                $isCalculated = ($formula === $columnKey || strpos($formula, $columnKey) === 0) ? 0 : 1;
                
                // استثناءات: بعض الأعمدة يجب أن تكون محسوبة حتى لو كانت قيم مباشرة
                if (in_array($columnKey, ['regularity_days', 'overtime_hours'])) {
                    $isCalculated = 1;
                }
                
                $updateStmt = $pdo->prepare("
                    UPDATE weekly_wage_entitlements 
                    SET formula = ?, is_calculated = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE column_key = ?
                ");
                $updateStmt->execute([$formula, $isCalculated, $columnKey]);
                
                if ($updateStmt->rowCount() > 0) {
                    echo "✓ تم تحديث معادلة '{$columnKey}': {$formula}\n";
                    $updated++;
                } else {
                    echo "- لم يتم تحديث '{$columnKey}' (لا توجد تغييرات)\n";
                }
            } else {
                $notFound[] = $columnKey;
                echo "⚠ العمود '{$columnKey}' غير موجود في الجدول\n";
            }
        } catch (Exception $e) {
            echo "✗ خطأ في تحديث '{$columnKey}': " . $e->getMessage() . "\n";
        }
    }
    
    // تأكيد المعاملة
    $pdo->commit();
    
    echo "\n";
    echo "✓ تم تحديث {$updated} معادلة بنجاح\n";
    
    if (!empty($notFound)) {
        echo "⚠ الأعمدة التالية غير موجودة: " . implode(', ', $notFound) . "\n";
    }
    
    echo "\n✓ تم إكمال العملية بنجاح!\n";
    
    echo json_encode([
        'success' => true,
        'message' => 'تم تحديث معادلات أعمدة المستحقات بنجاح',
        'updated_count' => $updated,
        'not_found' => $notFound
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // إلغاء المعاملة في حالة الخطأ
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'خطأ: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_UNESCAPED_UNICODE);
}

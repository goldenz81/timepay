<?php
/**
 * سكريبت لإعادة حساب grace_period_late_hours_calculated لجميع سجلات الحضور
 */

require_once 'cors_headers.php';
require_once 'config_unified.php'; // يستخدم إعدادات قاعدة البيانات الديناميكية

// جلب دالة computeLatePenaltyHours من attendance_logs.php
require_once 'attendance_logs.php';

echo "بدء إعادة حساب ساعات التأخير...\n\n";

// جلب جميع سجلات الحضور التي لديها check_in
$stmt = $pdo->prepare("
    SELECT 
        id, 
        employee_id, 
        attendance_date, 
        check_in
    FROM attendance_logs 
    WHERE check_in IS NOT NULL
    ORDER BY attendance_date DESC
");
$stmt->execute();
$records = $stmt->fetchAll(PDO::FETCH_ASSOC);

$updated = 0;
$errors = 0;

foreach ($records as $record) {
    try {
        // حساب grace_period_late_minutes
        $officialStart = getSystemVar($pdo, 'official_start_time', '08:30:00');
        $graceMinutesCfg = (int)getSystemVar($pdo, 'grace_period', 5);
        $graceLateMinutes = computeGracePeriodLateMinutes($record['check_in'], $officialStart, $graceMinutesCfg);
        
        // حساب grace_period_late_hours_calculated
        $lateHours = computeLatePenaltyHours($graceLateMinutes, $pdo);
        
        // تحديث السجل
        $updateStmt = $pdo->prepare("
            UPDATE attendance_logs 
            SET 
                grace_period_late_hours_calculated = ?,
                late_hours_calculated = ?,
                updated_at = NOW()
            WHERE id = ?
        ");
        $updateStmt->execute([
            $lateHours,
            $lateHours, // للتوافق مع late_hours_calculated
            $record['id']
        ]);
        
        $updated++;
        
        if ($updated % 100 == 0) {
            echo "تم تحديث {$updated} سجل...\n";
        }
    } catch (Exception $e) {
        $errors++;
        echo "خطأ في تحديث السجل ID {$record['id']}: " . $e->getMessage() . "\n";
    }
}

echo "\n=== ملخص العملية ===\n";
echo "تم تحديث: {$updated} سجل\n";
echo "الأخطاء: {$errors}\n";
echo "\n✓ تم إكمال العملية بنجاح!\n";


<?php
require_once 'config_unified.php';

try {
    // البحث عن السجلات التي قد تحتاج إعادة حساب للساعات الإضافية
    $stmt = $pdo->prepare("
        SELECT id, attendance_date, check_in, check_out, work_hours, overtime_hours
        FROM attendance_logs
        WHERE check_in IS NOT NULL
        AND check_out IS NOT NULL
        AND check_in != ''
        AND check_out != ''
        AND work_hours > 0
        ORDER BY attendance_date DESC
        LIMIT 50
    ");

    $stmt->execute();
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "=== إعادة حساب الساعات الإضافية ===\n";
    $fixed = 0;

    foreach ($records as $record) {
        // حساب إجمالي ساعات العمل
        $checkIn = preg_replace('/[^0-9:]/', '', $record['check_in']);
        $checkOut = preg_replace('/[^0-9:]/', '', $record['check_out']);

        try {
            $start = new DateTime($checkIn);
            $end = new DateTime($checkOut);
            $diff = $start->diff($end);
            $totalWorkHours = $diff->h + ($diff->i / 60.0);

            // الحد الأقصى لساعات العمل اليومية
            $dailyWorkHours = 10.0;

            // إعادة حساب ساعات العمل والإضافية
            $correctWorkHours = min($totalWorkHours, $dailyWorkHours);
            $correctOvertimeHours = max(0, $totalWorkHours - $dailyWorkHours);

            // التحقق من وجود اختلاف
            $currentWorkHours = (float)$record['work_hours'];
            $currentOvertimeHours = (float)$record['overtime_hours'];

            if (abs($currentWorkHours - $correctWorkHours) > 0.01 ||
                abs($currentOvertimeHours - $correctOvertimeHours) > 0.01) {

                echo sprintf(
                    "ID: %d, Date: %s - Current: Work=%.2f, OT=%.2f | Correct: Work=%.2f, OT=%.2f\n",
                    $record['id'],
                    $record['attendance_date'],
                    $currentWorkHours,
                    $currentOvertimeHours,
                    $correctWorkHours,
                    $correctOvertimeHours
                );

                // تحديث السجل
                $updateStmt = $pdo->prepare("
                    UPDATE attendance_logs
                    SET work_hours = ?, overtime_hours = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ");

                $updateStmt->execute([$correctWorkHours, $correctOvertimeHours, $record['id']]);
                $fixed++;
            }

        } catch (Exception $e) {
            echo "خطأ في حساب السجل {$record['id']}: " . $e->getMessage() . "\n";
        }
    }

    echo "\n=== النتيجة ===\n";
    echo "تم إصلاح $fixed سجل\n";

} catch (Exception $e) {
    echo "خطأ: " . $e->getMessage() . "\n";
}
?>
<?php
require_once 'config_unified.php';

try {
    // البحث عن السجلات التي لها check_in و check_out صالحين لكن work_hours = 0
    $stmt = $pdo->prepare("
        SELECT id, attendance_date, check_in, check_out, work_hours, overtime_hours, is_holiday
        FROM attendance_logs
        WHERE work_hours = 0
        AND check_in IS NOT NULL
        AND check_out IS NOT NULL
        AND check_in != ''
        AND check_out != ''
        AND check_in != '00:00:00'
        AND check_out != '00:00:00'
        ORDER BY attendance_date DESC
        LIMIT 50
    ");

    $stmt->execute();
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "=== سجلات تحتاج إعادة حساب ===\n";
    $fixed = 0;

    foreach ($records as $record) {
        echo sprintf(
            "ID: %d, Date: %s, Check-in: %s, Check-out: %s, Work Hours: %s\n",
            $record['id'],
            $record['attendance_date'],
            $record['check_in'],
            $record['check_out'],
            $record['work_hours']
        );

        // حساب ساعات العمل
        $checkIn = $record['check_in'];
        $checkOut = $record['check_out'];

        // تنظيف الأوقات
        $checkIn = preg_replace('/[^0-9:]/', '', $checkIn);
        $checkOut = preg_replace('/[^0-9:]/', '', $checkOut);

        try {
            $start = new DateTime($checkIn);
            $end = new DateTime($checkOut);
            $diff = $start->diff($end);
            $workHours = $diff->h + ($diff->i / 60.0);

            // الحد الأقصى لساعات العمل اليومية
            $dailyWorkHours = 10; // قيمة افتراضية
            $overtimeHours = 0;

            if (!$record['is_holiday'] && $workHours > $dailyWorkHours) {
                $overtimeHours = $workHours - $dailyWorkHours;
                $workHours = $dailyWorkHours;
            }

            // تحديث السجل
            $updateStmt = $pdo->prepare("
                UPDATE attendance_logs
                SET work_hours = ?, overtime_hours = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");

            $updateStmt->execute([$workHours, $overtimeHours, $record['id']]);
            $fixed++;

            echo sprintf("  -> تم الإصلاح: Work Hours: %.2f, Overtime: %.2f\n",
                $workHours, $overtimeHours);

        } catch (Exception $e) {
            echo "  -> خطأ في الحساب: " . $e->getMessage() . "\n";
        }
    }

    echo "\n=== النتيجة ===\n";
    echo "تم إصلاح $fixed سجل\n";

} catch (Exception $e) {
    echo "خطأ: " . $e->getMessage() . "\n";
}
?>
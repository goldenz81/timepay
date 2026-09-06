<?php
require_once 'config_unified.php';

try {
    // البحث عن السجلات التي لها check_in و check_out صالحين لكن work_hours = 0
    $stmt = $pdo->prepare("
        SELECT id, attendance_date, check_in, check_out, work_hours, overtime_hours, late_minutes, is_holiday, is_excused
        FROM attendance_logs
        WHERE work_hours = 0
        AND check_in IS NOT NULL
        AND check_out IS NOT NULL
        AND check_in != ''
        AND check_out != ''
        AND notes LIKE '%مزامن من البصمة%'
        ORDER BY attendance_date DESC
        LIMIT 100
    ");

    $stmt->execute();
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "=== سجلات تحتاج إصلاح ===\n";
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

            if ($workHours > $dailyWorkHours) {
                $overtimeHours = $workHours - $dailyWorkHours;
                $workHours = $dailyWorkHours;
            }

            // حساب التأخير
            $lateMinutes = 0;
            $lateHours = 0;

            if (!$record['is_holiday']) {
                $officialStart = '08:00:00';
                $graceMinutes = 30;

                $official = new DateTime($officialStart);
                $checkInTime = new DateTime($checkIn);
                $graceBoundary = clone $official;
                $graceBoundary->modify("+{$graceMinutes} minutes");

                if ($checkInTime > $graceBoundary) {
                    $diff = $checkInTime->getTimestamp() - $graceBoundary->getTimestamp();
                    $lateMinutes = max(0, (int)round($diff / 60));

                    // حساب غرامة التأخير
                    if ($record['is_excused']) {
                        if ($lateMinutes >= 60) {
                            $lateHours = $lateMinutes / 60.0;
                        } elseif ($lateMinutes > 30) {
                            $lateHours = 1.0;
                        } else {
                            $lateHours = 0.5;
                        }
                    } else {
                        if ($lateMinutes >= 60) {
                            $lateHours = $lateMinutes / 60.0;
                        } elseif ($lateMinutes > 30) {
                            $lateHours = 1.0;
                        } else {
                            $lateHours = 0.5;
                        }
                    }
                }
            }

            // تحديث السجل
            $updateStmt = $pdo->prepare("
                UPDATE attendance_logs
                SET work_hours = ?, overtime_hours = ?, late_minutes = ?, grace_period_late_hours_calculated = ?, late_hours_calculated = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");

            $updateStmt->execute([$workHours, $overtimeHours, $lateMinutes, $lateHours, $lateHours, $record['id']]);
            $fixed++;

            echo sprintf("  -> تم الإصلاح: Work Hours: %.2f, Overtime: %.2f, Late Minutes: %d, Late Hours: %.2f\n",
                $workHours, $overtimeHours, $lateMinutes, $lateHours);

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
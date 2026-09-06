<?php
require_once 'config_unified.php';

try {
    // البحث عن سجل 05/01/2026 للموظف رقم 3
    $stmt = $pdo->prepare("
        SELECT
            id, attendance_date, check_in, check_out, work_hours, overtime_hours,
            late_minutes, grace_period_late_hours_calculated, late_hours_calculated,
            is_holiday, is_excused, notes
        FROM attendance_logs
        WHERE employee_id = ? AND attendance_date = ?
    ");

    $stmt->execute([3, '2026-01-05']);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($record) {
        echo "=== سجل الحضور لـ 05/01/2026 ===\n";
        foreach ($record as $key => $value) {
            echo "$key: $value\n";
        }

        echo "\n=== تحليل البيانات ===\n";

        // حساب التأخير المحفوظ
        $lateMinutes = (float)($record['late_minutes'] ?? 0);
        $graceLateHours = (float)($record['grace_period_late_hours_calculated'] ?? 0);
        $lateHours = (float)($record['late_hours_calculated'] ?? 0);

        echo "دقائق التأخير المحفوظة: $lateMinutes\n";
        echo "ساعات التأخير بعد فترة السماح: $graceLateHours\n";
        echo "ساعات غرامة التأخير: $lateHours\n";

        // حساب التأخير المتوقع
        if (!empty($record['check_in'])) {
            $officialStart = '08:00:00';
            $gracePeriod = 30;

            $checkIn = preg_replace('/[^0-9:]/', '', $record['check_in']);
            $official = new DateTime($officialStart);
            $checkInTime = new DateTime($checkIn);
            $graceBoundary = clone $official;
            $graceBoundary->modify("+{$gracePeriod} minutes");

            echo "\nوقت البدء الرسمي: $officialStart\n";
            echo "فترة السماح: $gracePeriod دقيقة\n";
            echo "حد فترة السماح: " . $graceBoundary->format('H:i:s') . "\n";
            echo "وقت الحضور الفعلي: $checkIn\n";

            if ($checkInTime > $graceBoundary) {
                $lateDiff = $checkInTime->getTimestamp() - $graceBoundary->getTimestamp();
                $calculatedLateMinutes = max(0, (int)round($lateDiff / 60));

                echo "التأخير المحسوب: $calculatedLateMinutes دقيقة\n";

                // حساب غرامة التأخير
                if ($record['is_excused']) {
                    if ($calculatedLateMinutes >= 60) {
                        $calculatedLateHours = $calculatedLateMinutes / 60.0;
                    } elseif ($calculatedLateMinutes > 30) {
                        $calculatedLateHours = 1.0;
                    } else {
                        $calculatedLateHours = 0.5;
                    }
                } else {
                    if ($calculatedLateMinutes >= 60) {
                        $calculatedLateHours = $calculatedLateMinutes / 60.0;
                    } elseif ($calculatedLateMinutes > 30) {
                        $calculatedLateHours = 1.0;
                    } else {
                        $calculatedLateHours = 0.5;
                    }
                }

                echo "غرامة التأخير المحسوبة: $calculatedLateHours ساعة\n";
            } else {
                echo "لا يوجد تأخير\n";
            }
        }

    } else {
        echo "لم يتم العثور على السجل\n";
    }

} catch (Exception $e) {
    echo "خطأ: " . $e->getMessage() . "\n";
}
?>
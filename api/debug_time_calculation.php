<?php
require_once 'config_unified.php';

try {
    // اختبار حساب الوقت للمثال المعطى
    $checkIn = '08:45:00';
    $checkOut = '18:48:00';

    echo "=== حساب الوقت للمثال ===\n";
    echo "وقت الحضور: $checkIn\n";
    echo "وقت الانصراف: $checkOut\n\n";

    // تنظيف الأوقات
    $checkIn = preg_replace('/[^0-9:]/', '', $checkIn);
    $checkOut = preg_replace('/[^0-9:]/', '', $checkOut);

    echo "الأوقات بعد التنظيف:\n";
    echo "Check-in: $checkIn\n";
    echo "Check-out: $checkOut\n\n";

    // حساب الفرق الزمني
    $start = new DateTime($checkIn);
    $end = new DateTime($checkOut);
    $diff = $start->diff($end);

    $totalHours = $diff->h + ($diff->i / 60.0);
    $totalMinutes = ($diff->h * 60) + $diff->i;

    echo "الفرق الزمني:\n";
    echo "ساعات: {$diff->h}\n";
    echo "دقائق: {$diff->i}\n";
    echo "إجمالي الساعات: " . number_format($totalHours, 3) . "\n";
    echo "إجمالي الدقائق: $totalMinutes\n\n";

    // الحد الأقصى لساعات العمل اليومية
    $dailyWorkHours = 10.0;

    echo "الحد الأقصى لساعات العمل اليومية: $dailyWorkHours ساعات\n\n";

    if ($totalHours > $dailyWorkHours) {
        $workHours = $dailyWorkHours;
        $overtimeHours = $totalHours - $dailyWorkHours;

        echo "الحالة: الوقت الإجمالي > الحد الأقصى\n";
        echo "ساعات العمل: $workHours\n";
        echo "الساعات الإضافية: " . number_format($overtimeHours, 3) . "\n";
    } else {
        $workHours = $totalHours;
        $overtimeHours = 0;

        echo "الحالة: الوقت الإجمالي <= الحد الأقصى\n";
        echo "ساعات العمل: " . number_format($workHours, 3) . "\n";
        echo "الساعات الإضافية: $overtimeHours\n";
    }

    echo "\n=== حساب التأخير ===\n";

    // حساب التأخير
    $officialStart = '08:00:00';
    $gracePeriod = 30; // دقائق

    echo "وقت البدء الرسمي: $officialStart\n";
    echo "فترة السماح: $gracePeriod دقيقة\n";

    $official = new DateTime($officialStart);
    $checkInTime = new DateTime($checkIn);
    $graceBoundary = clone $official;
    $graceBoundary->modify("+{$gracePeriod} minutes");

    echo "حد فترة السماح: " . $graceBoundary->format('H:i:s') . "\n";
    echo "وقت الحضور الفعلي: " . $checkInTime->format('H:i:s') . "\n";

    if ($checkInTime > $graceBoundary) {
        $lateDiff = $checkInTime->getTimestamp() - $graceBoundary->getTimestamp();
        $lateMinutes = max(0, (int)round($lateDiff / 60));

        echo "التأخير: $lateMinutes دقيقة\n";

        // حساب غرامة التأخير
        if ($lateMinutes >= 60) {
            $lateHours = $lateMinutes / 60.0;
        } elseif ($lateMinutes > 30) {
            $lateHours = 1.0;
        } else {
            $lateHours = 0.5;
        }

        echo "غرامة التأخير: $lateHours ساعة\n";
    } else {
        echo "لا يوجد تأخير\n";
    }

} catch (Exception $e) {
    echo "خطأ: " . $e->getMessage() . "\n";
}
?>
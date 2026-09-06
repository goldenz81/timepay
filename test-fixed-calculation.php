<?php
/**
 * اختبار الحساب المصحح لساعات العمل
 */

require_once 'api/attendance_logs.php'; // للوصول للدوال

echo "اختبار الحساب المصحح لساعات العمل" . PHP_EOL;
echo "===================================" . PHP_EOL;
echo PHP_EOL;

// اختبار الحالة المذكورة: 08:47 إلى 19:52
$checkIn = '08:47:00';
$checkOut = '19:52:00';
$attendanceDate = date('Y-m-d');

echo "الحالة المختبرة:" . PHP_EOL;
echo "- وقت الحضور: $checkIn" . PHP_EOL;
echo "- وقت الانصراف: $checkOut" . PHP_EOL;
echo "- التاريخ: $attendanceDate" . PHP_EOL;
echo PHP_EOL;

// حساب ساعات العمل الرسمية (بين official_start و official_end)
$workHours = calculateHours($checkIn, $checkOut, $attendanceDate);
echo "ساعات العمل الرسمية المحسوبة: " . number_format($workHours, 2) . " ساعة" . PHP_EOL;

// حساب الساعات الإضافية (الوقت بعد official_end)
$overtimeHours = calculateOvertimeHoursFromCheckOut(
    $attendanceDate,
    $checkOut,
    0, // ليس عطلة
    $checkIn,
    $workHours
);
echo "الساعات الإضافية المحسوبة: " . number_format($overtimeHours, 2) . " ساعة" . PHP_EOL;
echo PHP_EOL;

// شرح الحساب
echo "شرح الحساب:" . PHP_EOL;
echo "- وقت البداية الرسمي: 08:00" . PHP_EOL;
echo "- وقت النهاية الرسمي: 18:00" . PHP_EOL;
echo "- وقت الحضور الفعلي: $checkIn (متأخر 47 دقيقة)" . PHP_EOL;
echo "- وقت الانصراف الفعلي: $checkOut" . PHP_EOL;
echo "- الساعات الرسمية: من 08:47 إلى 18:00 = " . number_format($workHours, 2) . " ساعة" . PHP_EOL;
echo "- الساعات الإضافية: من 18:00 إلى 19:52 = " . number_format($overtimeHours, 2) . " ساعة" . PHP_EOL;
echo PHP_EOL;

// نتيجة الاختبار
$expectedWorkHours = 9.22;  // من 08:47 إلى 18:00 = 9 ساعات و13 دقيقة
$expectedOvertime = 1.87;  // من 18:00 إلى 19:52 = 1 ساعة و52 دقيقة

$workCorrect = abs($workHours - $expectedWorkHours) < 0.1;
$overtimeCorrect = abs($overtimeHours - $expectedOvertime) < 0.1;

if ($workCorrect && $overtimeCorrect) {
    echo "✅ النتيجة صحيحة - تم إصلاح المشكلة!" . PHP_EOL;
} else {
    echo "❌ النتيجة خاطئة - المشكلة ما زالت موجودة" . PHP_EOL;
    echo "المتوقع: ساعات عمل رسمية = $expectedWorkHours, إضافي = $expectedOvertime" . PHP_EOL;
    echo "المحسوب: ساعات عمل رسمية = $workHours, إضافي = $overtimeHours" . PHP_EOL;
}

echo PHP_EOL . "===================================" . PHP_EOL;
?>
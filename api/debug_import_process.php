<?php
require_once 'cors_headers.php';
require_once 'config.php';

// اختبار الاستيراد بالبيانات المحددة
$testData = "كود البصمة\tاسم الموظف\tالتاريخ\tوقت الدخول\tوقت الخروج\tالتأخير\tالانصراف المبكر\tالغياب\tساعات الإضافية\tساعات العمل\tالقسم\tاليوم
1\tAhmedfarg\t2026-01-03\t08:47\t17:57\t00:47\t-\t-\t01:52\t09:13\tMaintinance Dep\tSat
1\tAhmedfarg\t2026-01-04\t17:58\t-\t-\t-\tTrue\t-\t-\tMaintinance Dep\tSun
1\tAhmedfarg\t2026-01-05\t16:39\t-\t-\t-\tTrue\t-\t-\tMaintinance Dep\tMon
1\tAhmedfarg\t2026-01-06\t19:14\t-\t-\t-\tTrue\t-\t-\tMaintinance Dep\tTue
1\tAhmedfarg\t2026-01-07\t17:57\t-\t-\t-\tTrue\t-\t-\tMaintinance Dep\tWed
2\tSamir Ali Hassan\t2026-01-03\t08:09\t21:51\t-\t-\t-\t03:51\t10:00\tAccounting Dep\tSat
2\tSamir Ali Hassan\t2026-01-04\t08:16\t19:28\t-\t-\t-\t01:28\t10:00\tAccounting Dep\tSun
2\tSamir Ali Hassan\t2026-01-05\t07:41\t20:56\t-\t-\t02:56\t10:00\tAccounting Dep\tMon
2\tSamir Ali Hassan\t2026-01-06\t08:14\t20:28\t-\t-\t02:28\t10:00\tAccounting Dep\tTue
2\tSamir Ali Hassan\t2026-01-07\t08:00\t20:40\t-\t-\t02:40\t10:00\tAccounting Dep\tWed
2\tSamir Ali Hassan\t2026-01-08\t08:05\t-\t-\t-\tTrue\t-\t-\tAccounting Dep\tThu
3\tAhmad El Sayed hafez\t2026-01-03\t08:47\t19:52\t00:47\t-\t-\t01:52\t09:13\tAccounting Dep\tSat
3\tAhmad El Sayed hafez\t2026-01-04\t08:02\t20:05\t-\t-\t-\t02:05\t10:00\tAccounting Dep\tSun
3\tAhmad El Sayed hafez\t2026-01-05\t08:45\t18:48\t00:45\t-\t-\t00:48\t09:15\tAccounting Dep\tMon
3\tAhmad El Sayed hafez\t2026-01-06\t08:35\t18:11\t00:35\t-\t-\t-\t09:25\tAccounting Dep\tTue
3\tAhmad El Sayed hafez\t2026-01-07\t08:20\t20:28\t-\t-\t-\t02:28\t10:00\tAccounting Dep\tWed
3\tAhmad El Sayed hafez\t2026-01-08\t08:43\t-\t-\t-\tTrue\t-\t-\tAccounting Dep\tThu";

try {
    // مسح البيانات الموجودة أولاً
    $pdo->exec("DELETE FROM fingerprint_attendance");

    $lines = explode("\n", trim($testData));
    array_shift($lines); // إزالة العنوان

    echo "عدد السطور للمعالجة: " . count($lines) . "\n\n";

    $importedCount = 0;
    $errors = [];

    foreach ($lines as $lineNumber => $line) {
        echo "معالجة سطر " . ($lineNumber + 2) . ": " . substr($line, 0, 50) . "...\n";

        if (empty(trim($line))) {
            echo "  - سطر فارغ، تم تجاهله\n";
            continue;
        }

        $data = explode("\t", $line);
        echo "  - عدد الأعمدة: " . count($data) . "\n";

        // إضافة أعمدة فارغة إذا لزم الأمر
        while (count($data) < 12) {
            $data[] = '';
        }

        // تنظيف البيانات - تصحيح فهرسة الأعمدة
        $acNo = trim($data[0]);
        $employeeName = trim($data[1]);
        $date = trim($data[2]);
        $clockIn = !empty(trim($data[3])) && trim($data[3]) !== '-' ? trim($data[3]) . ':00' : null;
        $clockOut = !empty(trim($data[4])) && trim($data[4]) !== '-' ? trim($data[4]) . ':00' : null;
        $late = !empty(trim($data[5])) && trim($data[5]) !== '-' ? trim($data[5]) . ':00' : null;
        $early = !empty(trim($data[6])) && trim($data[6]) !== '-' ? trim($data[6]) . ':00' : null;
        $absentValue = trim($data[7]);
        // تجاهل أوقات الإضافي والعمل المعقدة مؤقتاً - سنحفظ null
        // البيانات تحتاج تنسيق زمني صحيح (HH:MM:SS) لكن البيانات الحالية معقدة
        $otTime = null; // trim($data[8]) !== '-' ? trim($data[8]) : null;
        $workTime = null; // trim($data[9]) !== '-' ? trim($data[9]) : null;
        $department = trim($data[10]);
        $weekDay = trim($data[11]);

        // معالجة قيمة الغياب
        $absent = 0;
        if (!empty($absentValue) && strtolower($absentValue) === 'true') {
            $absent = 1;
        }

        echo "  - ac_no: '$acNo', employee_name: '$employeeName', date: '$date'\n";
        echo "  - clock_in: '$clockIn', clock_out: '$clockOut', absent: $absent\n";

        // حفظ بيانات الحضور
        try {
            $stmt = $pdo->prepare("
                INSERT INTO fingerprint_attendance
                (ac_no, employee_name, attendance_date, clock_in, clock_out, late, early, absent, ot_time, work_time, department, week_day)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $result = $stmt->execute([
                $acNo, $employeeName, $date, $clockIn, $clockOut,
                $late, $early, $absent, $otTime, $workTime, $department, $weekDay
            ]);

            if ($result) {
                $importedCount++;
                echo "  - تم الحفظ بنجاح\n";
            } else {
                $errors[] = "فشل في حفظ سطر " . ($lineNumber + 2);
                echo "  - فشل في الحفظ\n";
            }

        } catch (Exception $e) {
            $errors[] = "خطأ في حفظ سطر " . ($lineNumber + 2) . ": " . $e->getMessage();
            echo "  - خطأ: " . $e->getMessage() . "\n";
        }

        echo "\n";
    }

    // التحقق من عدد السجلات المحفوظة
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM fingerprint_attendance");
    $totalSaved = $stmt->fetch()['total'];

    echo "=== النتائج ===\n";
    echo "السجلات المعالجة: " . count($lines) . "\n";
    echo "السجلات المحفوظة بنجاح: $importedCount\n";
    echo "السجلات في قاعدة البيانات: $totalSaved\n";
    echo "الأخطاء: " . count($errors) . "\n";

    if (!empty($errors)) {
        echo "\n=== الأخطاء ===\n";
        foreach ($errors as $error) {
            echo "- $error\n";
        }
    }

} catch (Exception $e) {
    echo "خطأ عام: " . $e->getMessage() . "\n";
    echo "الملف: " . $e->getFile() . "\n";
    echo "السطر: " . $e->getLine() . "\n";
}
?>
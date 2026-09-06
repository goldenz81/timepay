<?php
/**
 * سكربت بذر بيانات اختبار: 10 موظفين + سجلات حضور فبراير 2026 + سلف لبعضهم
 * للاستخدام: افتح في المتصفح api/seed_test_data_feb2026.php أو شغّله من سطر الأوامر
 */
header('Content-Type: text/html; charset=utf-8');
require_once __DIR__ . '/config.php';

$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$output = [];

try {
    // ----- 1) الحصول على أكبر كود موظف وتوليد 10 أكواد جديدة -----
    $stmt = $pdo->query("SELECT COALESCE(MAX(CAST(employee_code AS UNSIGNED)), 0) AS mx FROM employees WHERE employee_code REGEXP '^[0-9]+$'");
    $baseCode = (int) $stmt->fetch(PDO::FETCH_ASSOC)['mx'];
    $nextCodes = [];
    for ($i = 1; $i <= 10; $i++) {
        $nextCodes[] = (string) ($baseCode + $i);
    }

    // ----- 2) إضافة 10 موظفين: أسماء مصرية حقيقية (الاسم الأول + الأخير)، كود بصمة، التمييز والحوافز 200–600 -----
    $employeesToAdd = [
        ['code' => $nextCodes[0], 'ac_no' => $nextCodes[0], 'name' => 'Ahmed El-Sayed', 'name_ar' => 'أحمد السيد', 'salary_type' => 'Monthly', 'location' => 'برج العرب', 'department' => 'Accounting Dep', 'base_salary' => 5000, 'discrimination' => rand(200, 600)],
        ['code' => $nextCodes[1], 'ac_no' => $nextCodes[1], 'name' => 'Mohamed Hassan', 'name_ar' => 'محمد حسن', 'salary_type' => 'Monthly', 'location' => 'برج العرب', 'department' => 'Production Dep', 'base_salary' => 5500, 'discrimination' => rand(200, 600)],
        ['code' => $nextCodes[2], 'ac_no' => $nextCodes[2], 'name' => 'Mahmoud Ibrahim', 'name_ar' => 'محمود إبراهيم', 'salary_type' => 'Monthly', 'location' => 'محرم بك', 'department' => 'BE', 'base_salary' => 6000, 'discrimination' => rand(200, 600)],
        ['code' => $nextCodes[3], 'ac_no' => $nextCodes[3], 'name' => 'Hussein Ali', 'name_ar' => 'حسين علي', 'salary_type' => 'Monthly', 'location' => 'محرم بك', 'department' => 'Accounting Dep', 'base_salary' => 4800, 'discrimination' => rand(200, 600)],
        ['code' => $nextCodes[4], 'ac_no' => $nextCodes[4], 'name' => 'Youssef Mahmoud', 'name_ar' => 'يوسف محمود', 'salary_type' => 'Monthly', 'location' => 'برج العرب', 'department' => 'Sells Dep', 'base_salary' => 5200, 'discrimination' => rand(200, 600)],
        ['code' => $nextCodes[5], 'ac_no' => $nextCodes[5], 'name' => 'Khaled Abdallah', 'name_ar' => 'خالد عبدالله', 'salary_type' => 'Weekly', 'location' => 'برج العرب', 'department' => 'Production Dep', 'base_salary' => 1200, 'discrimination' => rand(200, 600)],
        ['code' => $nextCodes[6], 'ac_no' => $nextCodes[6], 'name' => 'Amr Farouk', 'name_ar' => 'عمرو فاروق', 'salary_type' => 'Weekly', 'location' => 'برج العرب', 'department' => 'BE', 'base_salary' => 1400, 'discrimination' => rand(200, 600)],
        ['code' => $nextCodes[7], 'ac_no' => $nextCodes[7], 'name' => 'Said Rashid', 'name_ar' => 'سعيد رشيد', 'salary_type' => 'Weekly', 'location' => 'محرم بك', 'department' => 'Production Dep', 'base_salary' => 1300, 'discrimination' => rand(200, 600)],
        ['code' => $nextCodes[8], 'ac_no' => $nextCodes[8], 'name' => 'Ibrahim Hamid', 'name_ar' => 'إبراهيم حامد', 'salary_type' => 'Weekly', 'location' => 'محرم بك', 'department' => 'Accounting Dep', 'base_salary' => 1250, 'discrimination' => rand(200, 600)],
        ['code' => $nextCodes[9], 'ac_no' => $nextCodes[9], 'name' => 'Ali El-Shafie', 'name_ar' => 'علي الشافعي', 'salary_type' => 'Weekly', 'location' => 'برج العرب', 'department' => 'Inventory', 'base_salary' => 1100, 'discrimination' => rand(200, 600)],
    ];

    $checkDiscrimination = $pdo->query("SHOW COLUMNS FROM employees LIKE 'discrimination_incentive_allowance'");
    $hasDiscrimination = $checkDiscrimination->rowCount() > 0;

    $insertedEmployeeIds = [];
    foreach ($employeesToAdd as $emp) {
        if ($hasDiscrimination) {
            $stmt = $pdo->prepare("
                INSERT INTO employees (employee_code, `AC-No.`, name, name_ar, base_salary, salary_type, location, department, position, hire_date, status, is_insured, discrimination_incentive_allowance)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'موظف', ?, 'active', 0, ?)
            ");
            $stmt->execute([
                $emp['code'],
                $emp['ac_no'],
                $emp['name'],
                $emp['name_ar'],
                $emp['base_salary'],
                $emp['salary_type'],
                $emp['location'],
                $emp['department'],
                date('Y-m-d', strtotime('-6 months')),
                (float) $emp['discrimination']
            ]);
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO employees (employee_code, `AC-No.`, name, name_ar, base_salary, salary_type, location, department, position, hire_date, status, is_insured)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'موظف', ?, 'active', 0)
            ");
            $stmt->execute([
                $emp['code'],
                $emp['ac_no'],
                $emp['name'],
                $emp['name_ar'],
                $emp['base_salary'],
                $emp['salary_type'],
                $emp['location'],
                $emp['department'],
                date('Y-m-d', strtotime('-6 months'))
            ]);
        }
        $insertedEmployeeIds[] = ['id' => (int) $pdo->lastInsertId(), 'salary_type' => $emp['salary_type'], 'name_ar' => $emp['name_ar']];
    }
    $output[] = 'تم إضافة 10 موظفين (5 شهري، 5 أسبوعي) - أسماء مصرية، كود بصمة (AC-No.)، التمييز والحوافز 200–600 - مواقع: برج العرب، محرم بك.';

    // ----- 3) سجلات حضور فبراير 2026: للموظفين العشرة الجدد + باقي الموظفين النشطين (شهري + أسبوعي) -----
    $stmt = $pdo->query("SELECT id, salary_type FROM employees WHERE status = 'active' ORDER BY id");
    $allEmployees = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $insertAtt = $pdo->prepare("
        INSERT INTO attendance_logs (employee_id, attendance_date, check_in, check_out, work_hours, overtime_hours, late_minutes, early_leave_minutes, status, is_holiday, is_excused, notes, transport_allowance, grace_period_late_hours_calculated, late_hours_calculated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?)
    ");
    $checkExists = $pdo->prepare("SELECT 1 FROM attendance_logs WHERE employee_id = ? AND attendance_date = ? LIMIT 1");

    $totalRecords = 0;
    foreach ($allEmployees as $emp) {
        $empId = (int) $emp['id'];
        for ($d = 1; $d <= 28; $d++) {
            $date = sprintf('2026-02-%02d', $d);
            $checkExists->execute([$empId, $date]);
            if ($checkExists->fetch()) {
                continue; // تخطي إن وُجد سجل لنفس الموظف والتاريخ
            }
            $dayOfWeek = (int) date('N', strtotime($date)); // 1=Mon, 5=Fri, 6=Sat, 7=Sun
            $isFriday = ($dayOfWeek === 5);
            $isSaturday = ($dayOfWeek === 6);
            $isWeekend = $isFriday || $isSaturday;

            $scenario = ($empId + $d) % 12; // تنويع السيناريوهات

            if ($isWeekend) {
                if ($scenario % 3 === 0) {
                    $insertAtt->execute([$empId, $date, '10:00:00', '15:00:00', 5.0, 5.0, 0, 0, 'present', 1, 'بيانات اختبار - عمل في العطلة', 0, 0]);
                    $totalRecords++;
                }
            } else {
                if ($scenario === 0) {
                    $insertAtt->execute([$empId, $date, null, null, 0, 0, 0, 0, 'absent', 0, 'بيانات اختبار - غياب', 0, 0]);
                } elseif ($scenario === 1 || $scenario === 2) {
                    $insertAtt->execute([$empId, $date, '09:15:00', '18:30:00', 9.25, 0, 45, 0, 'late', 0, 'بيانات اختبار - تأخير', 0.75, 0.75]);
                } elseif ($scenario === 3) {
                    $insertAtt->execute([$empId, $date, '08:30:00', '17:00:00', 8.5, 0, 0, 90, 'present', 0, 'بيانات اختبار - انصراف مبكر', 0, 0]);
                } elseif ($scenario === 4 || $scenario === 5) {
                    $insertAtt->execute([$empId, $date, '08:30:00', '20:00:00', 10.0, 1.5, 0, 0, 'present', 0, 'بيانات اختبار - إضافي بعد الدوام', 0, 0]);
                } else {
                    $insertAtt->execute([$empId, $date, '08:30:00', '18:30:00', 10.0, 0, 0, 0, 'present', 0, 'بيانات اختبار - انتظام', 0, 0]);
                }
                $totalRecords++;
            }
        }
    }
    $output[] = "تم إنشاء سجلات حضور لشهر فبراير 2026 لجميع الموظفين النشطين (شهري وأسبوعي). إجمالي سجلات مضافة: {$totalRecords} (تنويع: أيام حضور، غياب، تأخيرات، انتظام، انصراف مبكر، إضافي بعد الدوام، عمل في العطلات).";

    // ----- 4) سلف لبعض الموظفين (شهري وأسبوعي) -----
    $monthlyIds = array_column(array_filter($insertedEmployeeIds, fn($e) => $e['salary_type'] === 'Monthly'), 'id');
    $weeklyIds = array_column(array_filter($insertedEmployeeIds, fn($e) => $e['salary_type'] === 'Weekly'), 'id');

    $advStmt = $pdo->prepare("
        INSERT INTO employee_advances (employee_id, salary_type, advance_amount, installment_amount, duration, duration_type, status, notes, created_at, start_date)
        VALUES (?, ?, ?, ?, 1, ?, 'activated', 'سلفة تجريبية - بذر بيانات', ?, ?)
    ");
    $created = '2026-02-01 10:00:00';
    $startDate = '2026-02-01';
    if (count($monthlyIds) >= 2) {
        // سلف بسيطة لموظفين شهريين (كما كانت)
        $advStmt->execute([$monthlyIds[0], 'Monthly', 1000, 1000, 'monthly', $created, $startDate]);
        $advStmt->execute([$monthlyIds[1], 'Monthly', 500, 500, 'monthly', $created, $startDate]);
        $output[] = 'تم إضافة سلف لموظفين شهريين (تجريبي).';
    }

    // لموظفين أسبوعيين: من 1 إلى 3 سلف لكل موظف (اختيار موظفين فقط)
    if (count($weeklyIds) >= 2) {
        $selectedWeekly = array_slice($weeklyIds, 0, 2);
        $weeklyAdvCount = 0;

        foreach ($selectedWeekly as $idx => $wid) {
            // عدد السلف لهذا الموظف: من 1 إلى 3
            $numAdvances = rand(1, 3);

            for ($i = 0; $i < $numAdvances; $i++) {
                // مبلغ السلفة (قيمة بسيطة ومتغيرة)
                $amount = 150 + ($idx * 50) + ($i * 50); // أمثلة: 150، 200، 250 ...

                // توزيع التواريخ داخل فبراير 2026
                $offsetDays = ($idx * 3) + $i; // تغيير بسيط في اليوم
                $createdAt = date('Y-m-d H:i:s', strtotime("2026-02-01 10:00:00 +{$offsetDays} days"));
                $startAt = date('Y-m-d', strtotime("2026-02-01 +{$offsetDays} days"));

                $advStmt->execute([
                    $wid,
                    'Weekly',
                    $amount,
                    $amount,
                    'weekly',
                    $createdAt,
                    $startAt,
                ]);

                $weeklyAdvCount++;
            }
        }

        $output[] = "تم إضافة {$weeklyAdvCount} سلفة (من 1 إلى 3 لكل موظف) لموظفين أسبوعيين (تجريبي).";
    }

    $output[] = '--- انتهى البذر بنجاح. ---';
} catch (Exception $e) {
    $output[] = 'خطأ: ' . $e->getMessage();
}

echo '<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>بذر بيانات الاختبار</title></head><body><pre style="font-family: inherit; white-space: pre-wrap;">';
echo implode("\n", $output);
echo '</pre></body></html>';

<?php
/**
 * أداة تشخيص مزامنة البصمة
 * تساعد في فهم سبب عدم ظهور جميع السجلات
 */

require_once 'api/cors_headers.php';
require_once 'api/config.php';

echo "<h1>تشخيص مزامنة البصمة</h1>";
echo "<style>body { font-family: Arial, sans-serif; margin: 20px; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; }</style>";

try {
    // إحصائيات عامة
    echo "<h2>إحصائيات عامة</h2>";
    echo "<table>";
    echo "<tr><th>الجدول</th><th>عدد السجلات</th></tr>";

    $tables = ['fingerprint_attendance', 'attendance_logs', 'employees'];
    foreach ($tables as $table) {
        $count = $pdo->query("SELECT COUNT(*) FROM $table")->fetchColumn();
        echo "<tr><td>$table</td><td>$count</td></tr>";
    }
    echo "</table>";

    // تحليل بيانات البصمة
    echo "<h2>تحليل بيانات البصمة</h2>";

    // السجلات غير المطابقة للموظفين
    $stmt = $pdo->query("
        SELECT DISTINCT fa.ac_no, COUNT(*) as record_count
        FROM fingerprint_attendance fa
        LEFT JOIN employees e ON fa.ac_no = e.`AC-No.`
        WHERE e.id IS NULL
        GROUP BY fa.ac_no
        ORDER BY record_count DESC
    ");
    $unmatched = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<h3>السجلات غير المطابقة للموظفين:</h3>";
    if (empty($unmatched)) {
        echo "<p>جميع السجلات مطابقة للموظفين ✅</p>";
    } else {
        echo "<table>";
        echo "<tr><th>كود البصمة</th><th>عدد السجلات</th></tr>";
        foreach ($unmatched as $row) {
            echo "<tr><td>{$row['ac_no']}</td><td>{$row['record_count']}</td></tr>";
        }
        echo "</table>";
        echo "<p style='color: red;'>⚠️ هذه السجلات لن تتم مزامنتها لأنها لا تطابق أي موظف</p>";
    }

    // تحليل التجميع
    $stmt = $pdo->query("
        SELECT
            fa.ac_no,
            e.id as employee_id,
            fa.attendance_date,
            COUNT(*) as record_count,
            GROUP_CONCAT(DISTINCT fa.clock_in SEPARATOR '|') as clock_ins,
            GROUP_CONCAT(DISTINCT fa.clock_out SEPARATOR '|') as clock_outs
        FROM fingerprint_attendance fa
        LEFT JOIN employees e ON fa.ac_no = e.`AC-No.`
        WHERE e.id IS NOT NULL
        GROUP BY fa.ac_no, e.id, fa.attendance_date
        ORDER BY fa.attendance_date DESC, fa.ac_no
        LIMIT 20
    ");
    $grouped = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<h3>عينة من السجلات المجمعة (آخر 20):</h3>";
    echo "<table>";
    echo "<tr><th>كود البصمة</th><th>ID الموظف</th><th>التاريخ</th><th>عدد السجلات</th><th>أوقات الدخول</th><th>أوقات الخروج</th></tr>";
    foreach ($grouped as $row) {
        echo "<tr>";
        echo "<td>{$row['ac_no']}</td>";
        echo "<td>{$row['employee_id']}</td>";
        echo "<td>{$row['attendance_date']}</td>";
        echo "<td>{$row['record_count']}</td>";
        echo "<td>{$row['clock_ins']}</td>";
        echo "<td>{$row['clock_outs']}</td>";
        echo "</tr>";
    }
    echo "</table>";

    // مقارنة مع سجلات الحضور
    echo "<h2>مقارنة مع سجلات الحضور</h2>";

    $stmt = $pdo->query("
        SELECT
            DATE(attendance_date) as date,
            COUNT(*) as attendance_count
        FROM attendance_logs
        WHERE notes LIKE '%مزامن من البصمة%'
        GROUP BY DATE(attendance_date)
        ORDER BY date DESC
        LIMIT 10
    ");
    $attendanceByDate = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<h3>سجلات الحضور الممزمنة حسب التاريخ:</h3>";
    echo "<table>";
    echo "<tr><th>التاريخ</th><th>عدد السجلات</th></tr>";
    foreach ($attendanceByDate as $row) {
        echo "<tr><td>{$row['date']}</td><td>{$row['attendance_count']}</td></tr>";
    }
    echo "</table>";

    // إجمالي السجلات المتوقعة vs الفعلية
    $totalFingerprintGrouped = $pdo->query("
        SELECT COUNT(*) FROM (
            SELECT fa.ac_no, e.id, fa.attendance_date
            FROM fingerprint_attendance fa
            LEFT JOIN employees e ON fa.ac_no = e.`AC-No.`
            WHERE e.id IS NOT NULL
            GROUP BY fa.ac_no, e.id, fa.attendance_date
        ) as grouped
    ")->fetchColumn();

    $totalAttendanceSynced = $pdo->query("
        SELECT COUNT(*) FROM attendance_logs
        WHERE notes LIKE '%مزامن من البصمة%'
    ")->fetchColumn();

    echo "<h3>ملخص المزامنة:</h3>";
    echo "<table>";
    echo "<tr><th>النوع</th><th>العدد</th></tr>";
    echo "<tr><td>السجلات المجمعة في البصمة</td><td>$totalFingerprintGrouped</td></tr>";
    echo "<tr><td>السجلات الممزمنة في الحضور</td><td>$totalAttendanceSynced</td></tr>";
    echo "</table>";

    if ($totalFingerprintGrouped != $totalAttendanceSynced) {
        echo "<p style='color: orange;'>⚠️ هناك اختلاف في الأرقام - قد تحتاج إلى إعادة المزامنة</p>";
    } else {
        echo "<p style='color: green;'>✅ الأرقام متطابقة</p>";
    }

} catch (Exception $e) {
    echo "<p style='color: red;'>خطأ: " . $e->getMessage() . "</p>";
}
?>
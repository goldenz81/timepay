<?php
/**
 * أداة تشخيص استيراد ملفات Excel
 */

echo "<h1>تشخيص استيراد ملفات Excel</h1>";
echo "<style>
body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
table { border-collapse: collapse; width: 100%; margin: 10px 0; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
th { background-color: #f2f2f2; }
.error { color: red; }
.warning { color: orange; }
.success { color: green; }
pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
</style>";

// قراءة آخر السجلات من error_log.txt
$logFile = 'logs/error_log.txt';
if (file_exists($logFile)) {
    echo "<h2>آخر السجلات من error_log.txt</h2>";
    $lines = array_slice(file($logFile), -50); // آخر 50 سطر
    echo "<pre>" . implode("", array_reverse($lines)) . "</pre>";
} else {
    echo "<p class='warning'>ملف السجل غير موجود</p>";
}

// إحصائيات قاعدة البيانات
require_once 'api/config.php';

echo "<h2>إحصائيات قاعدة البيانات</h2>";
echo "<table>";
echo "<tr><th>الجدول</th><th>عدد السجلات</th></tr>";

$tables = ['fingerprint_attendance', 'employees', 'attendance_logs'];
foreach ($tables as $table) {
    try {
        $count = $pdo->query("SELECT COUNT(*) FROM $table")->fetchColumn();
        echo "<tr><td>$table</td><td>$count</td></tr>";
    } catch (Exception $e) {
        echo "<tr><td>$table</td><td class='error'>خطأ: {$e->getMessage()}</td></tr>";
    }
}
echo "</table>";

// فحص آخر الاستيرادات
echo "<h2>آخر السجلات المستوردة</h2>";
try {
    $stmt = $pdo->query("
        SELECT ac_no, employee_name, attendance_date, clock_in, clock_out,
               created_at, updated_at
        FROM fingerprint_attendance
        ORDER BY created_at DESC
        LIMIT 10
    ");
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($records)) {
        echo "<p class='warning'>لا توجد سجلات مستوردة</p>";
    } else {
        echo "<table>";
        echo "<tr><th>كود البصمة</th><th>اسم الموظف</th><th>التاريخ</th><th>وقت الدخول</th><th>وقت الخروج</th><th>تاريخ الإنشاء</th></tr>";
        foreach ($records as $record) {
            echo "<tr>";
            echo "<td>{$record['ac_no']}</td>";
            echo "<td>{$record['employee_name']}</td>";
            echo "<td>{$record['attendance_date']}</td>";
            echo "<td>{$record['clock_in']}</td>";
            echo "<td>{$record['clock_out']}</td>";
            echo "<td>{$record['created_at']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
} catch (Exception $e) {
    echo "<p class='error'>خطأ في قراءة السجلات: {$e->getMessage()}</p>";
}

echo "<h2>نصائح لحل المشاكل</h2>";
echo "<ul>";
echo "<li>تأكد من أن ملف Excel يحتوي على العناوين في الصف الأول</li>";
echo "<li>تأكد من أن أعمدة AC-No و Name و Date غير فارغة</li>";
echo "<li>تأكد من أن تنسيق التاريخ هو YYYY-MM-DD</li>";
echo "<li>افتح Developer Tools (F12) وتحقق من Console للأخطاء</li>";
echo "<li>تحقق من Network tab لرؤية طلبات API</li>";
echo "</ul>";
?>
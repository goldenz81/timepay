<?php
/**
 * أداة تحليل ملف البصمة لفهم محتوياته
 */

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['fingerprint_file'])) {
    $file = $_FILES['fingerprint_file'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        die("خطأ في رفع الملف: " . $file['error']);
    }

    $content = file_get_contents($file['tmp_name']);
    $lines = explode("\n", trim($content));

    echo "<h1>تحليل ملف البصمة: {$file['name']}</h1>";
    echo "<style>body { font-family: Arial, sans-serif; margin: 20px; } table { border-collapse: collapse; width: 100%; margin: 10px 0; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; } .error { color: red; } .warning { color: orange; } .success { color: green; }</style>";

    echo "<h2>إحصائيات عامة</h2>";
    echo "<ul>";
    echo "<li>إجمالي عدد السطور: " . count($lines) . "</li>";
    echo "<li>حجم الملف: " . round($file['size'] / 1024, 2) . " KB</li>";
    echo "</ul>";

    // تحليل السطور
    $emptyLines = 0;
    $dataLines = 0;
    $errors = [];

    echo "<h2>تحليل السطور</h2>";
    echo "<table>";
    echo "<tr><th>رقم السطر</th><th>المحتوى</th><th>عدد الأعمدة</th><th>الحالة</th><th>التحليل</th></tr>";

    foreach ($lines as $lineNumber => $line) {
        $actualLineNumber = $lineNumber + 1;
        $trimmedLine = trim($line);

        if (empty($trimmedLine)) {
            $emptyLines++;
            echo "<tr><td>$actualLineNumber</td><td><i>سطر فارغ</i></td><td>-</td><td class='warning'>فارغ</td><td>سيتم تجاهله</td></tr>";
            continue;
        }

        $dataLines++;
        $columns = explode("\t", $line);
        $columnCount = count($columns);

        $status = 'success';
        $analysis = '';

        // تحليل البيانات
        if ($columnCount < 8) {
            $status = 'error';
            $analysis = "عدد أعمدة غير كافي (مطلوب 8+)";
        } else {
            $acNo = trim($columns[0] ?? '');
            $name = trim($columns[1] ?? '');
            $date = trim($columns[2] ?? '');
            $clockIn = trim($columns[3] ?? '');
            $clockOut = trim($columns[4] ?? '');

            if (empty($acNo) || empty($name) || empty($date)) {
                $status = 'error';
                $analysis = "بيانات أساسية ناقصة (AC-No: '$acNo', Name: '$name', Date: '$date')";
            } elseif (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                $status = 'error';
                $analysis = "تنسيق تاريخ غير صحيح: '$date'";
            } else {
                $analysis = "AC-No: $acNo, Name: $name, Date: $date, In: $clockIn, Out: $clockOut";
            }
        }

        $statusClass = $status === 'error' ? 'error' : ($status === 'warning' ? 'warning' : 'success');

        echo "<tr>";
        echo "<td>$actualLineNumber</td>";
        echo "<td>" . htmlspecialchars(substr($line, 0, 100)) . (strlen($line) > 100 ? '...' : '') . "</td>";
        echo "<td>$columnCount</td>";
        echo "<td class='$statusClass'>" . ucfirst($status) . "</td>";
        echo "<td>$analysis</td>";
        echo "</tr>";
    }

    echo "</table>";

    echo "<h2>ملخص التحليل</h2>";
    echo "<ul>";
    echo "<li>السطور الفارغة: $emptyLines</li>";
    echo "<li>سطور البيانات: $dataLines</li>";
    echo "<li>السطور الصالحة المتوقعة: " . ($dataLines - count(array_filter($lines, function($line, $index) use ($lines) {
        if (trim($line) === '') return false;
        $columns = explode("\t", $lines[$index]);
        if (count($columns) < 8) return true;
        $acNo = trim($columns[0] ?? '');
        $name = trim($columns[1] ?? '');
        $date = trim($columns[2] ?? '');
        if (empty($acNo) || empty($name) || empty($date)) return true;
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) return true;
        return false;
    }, ARRAY_FILTER_USE_BOTH))) . "</li>";
    echo "</ul>";

} else {
    echo "<h1>أداة تحليل ملف البصمة</h1>";
    echo "<form method='post' enctype='multipart/form-data'>";
    echo "<input type='file' name='fingerprint_file' accept='.txt,.csv' required>";
    echo "<button type='submit'>تحليل الملف</button>";
    echo "</form>";
}
?>
<?php
// Debug في بداية الملف
file_put_contents('debug_import.txt', "=== بدء تشغيل الملف ===\n", FILE_APPEND);

require_once 'cors_headers.php';
file_put_contents('debug_import.txt', "تم تحميل cors_headers.php\n", FILE_APPEND);

require_once 'config.php';
require_once 'fingerprint_import_helpers.php';
file_put_contents('debug_import.txt', "تم تحميل config.php\n", FILE_APPEND);

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    if ($action === 'preview_employee_stats') {
        $acNos = $input['ac_nos'] ?? [];
        if (!is_array($acNos)) {
            $acNos = [];
        }
        $acNos = array_values(array_unique(array_filter(array_map(static function ($v) {
            return trim((string) $v);
        }, $acNos))));

        $stats = [
            'weekly' => 0,
            'monthly' => 0,
            'active' => 0,
            'inactive' => 0,
            'terminated' => 0,
            'not_in_system' => 0,
            'unique_in_file' => count($acNos),
        ];
        $newAcNos = [];

        if ($acNos) {
            $placeholders = implode(',', array_fill(0, count($acNos), '?'));
            $stmt = $pdo->prepare("
                SELECT TRIM(CAST(`AC-No.` AS CHAR)) AS ac_no, salary_type, status
                FROM employees
                WHERE TRIM(CAST(`AC-No.` AS CHAR)) IN ($placeholders)
            ");
            $stmt->execute($acNos);
            $found = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $found[(string) $row['ac_no']] = $row;
            }

            foreach ($acNos as $acNo) {
                if (!isset($found[$acNo])) {
                    $stats['not_in_system']++;
                    $newAcNos[] = $acNo;
                    continue;
                }
                $salaryType = strtolower(trim((string) ($found[$acNo]['salary_type'] ?? 'monthly')));
                $status = strtolower(trim((string) ($found[$acNo]['status'] ?? 'active')));

                if ($salaryType === 'weekly') {
                    $stats['weekly']++;
                } else {
                    $stats['monthly']++;
                }

                if ($status === 'active') {
                    $stats['active']++;
                } elseif ($status === 'inactive') {
                    $stats['inactive']++;
                } elseif ($status === 'terminated') {
                    $stats['terminated']++;
                }
            }
        }

        echo json_encode([
            'success' => true,
            'stats' => $stats,
            'new_ac_nos' => $newAcNos,
        ], JSON_UNESCAPED_UNICODE);
    } elseif ($action === 'import_csv_data') {
        // تهيئة المتغيرات
        $processedLines = 0;
        $importedCount = 0;
        $skippedLines = 0;

        $csvData = $input['csv_data'] ?? '';

        // Debug في بداية المعالجة
        file_put_contents('debug_import.txt', "=== بدء المعالجة ===\n", FILE_APPEND);
        file_put_contents('debug_import.txt', "طول البيانات: " . strlen($csvData) . "\n", FILE_APPEND);
        file_put_contents('debug_import.txt', "عينة من البيانات: '" . substr($csvData, 0, 200) . "'\n", FILE_APPEND);

        if (empty($csvData)) {
            throw new Exception('بيانات CSV مطلوبة');
        }

        $lines = explode("\n", trim($csvData));
        file_put_contents('debug_import.txt', "عدد السطور بعد الانفصال: " . count($lines) . "\n", FILE_APPEND);

        if (empty($lines)) {
            throw new Exception('بيانات CSV فارغة');
        }

        // Debug قبل إزالة العنوان
        file_put_contents('debug_import.txt', "العنوان: '" . ($lines[0] ?? 'غير موجود') . "'\n", FILE_APPEND);
        file_put_contents('debug_import.txt', "عدد السطور قبل إزالة العنوان: " . count($lines) . "\n", FILE_APPEND);

        array_shift($lines); // إزالة العنوان

        file_put_contents('debug_import.txt', "عدد السطور بعد إزالة العنوان: " . count($lines) . "\n", FILE_APPEND);

        // إنشاء جدول الأقسام إذا لم يكن موجوداً
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS departments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                manager VARCHAR(255),
                location VARCHAR(255),
                cost_center VARCHAR(255),
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // إنشاء جدول البصمة إذا لم يكن موجوداً
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS fingerprint_attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ac_no VARCHAR(50) NOT NULL,
                employee_name VARCHAR(255),
                attendance_date DATE NOT NULL,
                clock_in TIME,
                clock_out TIME,
                late TIME,
                early TIME,
                absent TINYINT(1) DEFAULT 0,
                ot_time TIME,
                work_time TIME,
                department VARCHAR(255),
                week_day VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                synced_at DATETIME NULL DEFAULT NULL,
                INDEX idx_ac_date (ac_no, attendance_date),
                INDEX idx_date (attendance_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // التحقق من الأعمدة الموجودة وإضافة المفقودة
        $existingColumns = [];
        $stmt = $pdo->query("DESCRIBE fingerprint_attendance");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $existingColumns[] = $row['Field'];
        }

        $columnsToAdd = [
            'late' => 'ALTER TABLE fingerprint_attendance ADD COLUMN late TIME',
            'early' => 'ALTER TABLE fingerprint_attendance ADD COLUMN early TIME',
            'absent' => 'ALTER TABLE fingerprint_attendance ADD COLUMN absent TINYINT(1) DEFAULT 0',
            'ot_time' => 'ALTER TABLE fingerprint_attendance ADD COLUMN ot_time TIME',
            'work_time' => 'ALTER TABLE fingerprint_attendance ADD COLUMN work_time TIME',
            'department' => 'ALTER TABLE fingerprint_attendance ADD COLUMN department VARCHAR(255)',
            'week_day' => 'ALTER TABLE fingerprint_attendance ADD COLUMN week_day VARCHAR(20)',
            'updated_at' => 'ALTER TABLE fingerprint_attendance ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
            'synced_at' => 'ALTER TABLE fingerprint_attendance ADD COLUMN synced_at DATETIME NULL DEFAULT NULL'
        ];

        foreach ($columnsToAdd as $columnName => $alterQuery) {
            if (!in_array($columnName, $existingColumns)) {
                try {
                    $pdo->exec($alterQuery);
                    file_put_contents('debug_import.txt', "تم إضافة العمود: $columnName\n", FILE_APPEND);
                } catch (Exception $e) {
                    file_put_contents('debug_import.txt', "خطأ في إضافة العمود $columnName: " . $e->getMessage() . "\n", FILE_APPEND);
                }
            } else {
                file_put_contents('debug_import.txt', "العمود موجود بالفعل: $columnName\n", FILE_APPEND);
            }
        }

        $createdDepartments = [];
        $errors = [];

        // معالجة البيانات وحفظها
        foreach ($lines as $lineNumber => $line) {
            $processedLines++;

            if (empty(trim($line))) {
                $skippedLines++;
                continue;
            }

            $data = explode("\t", $line);

            // تسجيل للتحقق من البيانات
            if ($lineNumber < 3) { // تسجيل أول 3 سطور فقط
                file_put_contents('debug_import.txt', "سطر " . ($lineNumber + 1) . ": '" . substr($line, 0, 100) . "'\n", FILE_APPEND);
                file_put_contents('debug_import.txt', "عدد الأعمدة: " . count($data) . "\n", FILE_APPEND);
                file_put_contents('debug_import.txt', "العمود الأول: '" . ($data[0] ?? 'غير موجود') . "'\n", FILE_APPEND);
            }

            // التحقق من عدد الأعمدة
            if (count($data) < 8) {
                $errors[] = "سطر " . ($lineNumber + 2) . ": عدد الأعمدة غير كافي (" . count($data) . ")";
                $skippedLines++;
                continue;
            }

            // إضافة أعمدة فارغة إذا لزم الأمر
            while (count($data) < 12) {
                $data[] = '';
            }

            // تنظيف البيانات - تصحيح فهرسة الأعمدة
            $acNo = trim($data[0]);
            $employeeName = trim($data[1]);
            $date = trim($data[2]);
            $clockIn = normalizeFingerprintTimeValue($data[3] ?? null);
            $clockOut = normalizeFingerprintTimeValue($data[4] ?? null);
            $late = normalizeFingerprintTimeValue($data[5] ?? null);
            $early = normalizeFingerprintTimeValue($data[6] ?? null);
            $absentValue = trim($data[7]);
            // تجاهل أوقات الإضافي والعمل المعقدة مؤقتاً - سنحفظ null
            $otTime = null; // trim($data[8]) !== '-' ? trim($data[8]) : null;
            $workTime = null; // trim($data[9]) !== '-' ? trim($data[9]) : null;
            $department = trim($data[10]);
            $weekDay = trim($data[11]);

            // معالجة قيمة الغياب
            $absent = 0;
            if (!empty($absentValue) && strtolower($absentValue) === 'true') {
                $absent = 1;
            }

            // إنشاء القسم إذا لم يكن موجوداً
            if (!empty($department) && !in_array($department, $createdDepartments)) {
                try {
                    $stmt = $pdo->prepare("INSERT IGNORE INTO departments (name, description) VALUES (?, ?)");
                    $stmt->execute([$department, "قسم تم إنشاؤه تلقائياً من بيانات البصمة"]);
                    if ($stmt->rowCount() > 0) {
                        $createdDepartments[] = $department;
                    }
                } catch (Exception $e) {
                    // تجاهل خطأ إنشاء القسم إذا كان موجوداً بالفعل
                }
            }

            // تسجيل البيانات المُعالجة
            file_put_contents('debug_import.txt', "معالجة سطر " . ($lineNumber + 2) . ": ac_no='$acNo', date='$date', department='$department'\n", FILE_APPEND);

            // حفظ بيانات الحضور
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO fingerprint_attendance
                    (ac_no, employee_name, attendance_date, clock_in, clock_out, late, early, absent, ot_time, work_time, department, week_day)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        employee_name = VALUES(employee_name),
                        clock_in = VALUES(clock_in),
                        clock_out = VALUES(clock_out),
                        late = VALUES(late),
                        early = VALUES(early),
                        absent = VALUES(absent),
                        ot_time = VALUES(ot_time),
                        work_time = VALUES(work_time),
                        department = VALUES(department),
                        week_day = VALUES(week_day),
                        synced_at = NULL,
                        updated_at = CURRENT_TIMESTAMP
                ");

                $result = $stmt->execute([
                    $acNo, $employeeName, $date, $clockIn, $clockOut,
                    $late, $early, $absent, $otTime, $workTime, $department, $weekDay
                ]);

                if ($result) {
                    $importedCount++;
                    file_put_contents('debug_import.txt', "تم حفظ سطر " . ($lineNumber + 2) . " بنجاح\n", FILE_APPEND);
                } else {
                    $errors[] = "فشل في حفظ سطر " . ($lineNumber + 2);
                    $skippedLines++;
                    file_put_contents('debug_import.txt', "فشل في حفظ سطر " . ($lineNumber + 2) . "\n", FILE_APPEND);
                }

            } catch (Exception $e) {
                $errors[] = "خطأ في حفظ سطر " . ($lineNumber + 2) . ": " . $e->getMessage();
                $skippedLines++;
                file_put_contents('debug_import.txt', "خطأ في حفظ سطر " . ($lineNumber + 2) . ": " . $e->getMessage() . "\n", FILE_APPEND);
            }
        }

        // تسجيل إضافي في ملف debug
        file_put_contents('debug_import.txt', "\n=== ملخص الاستيراد ===\n", FILE_APPEND);
        file_put_contents('debug_import.txt', "إجمالي السطور: " . count($lines) . "\n", FILE_APPEND);
        file_put_contents('debug_import.txt', "السطور المعالجة: $processedLines\n", FILE_APPEND);
        file_put_contents('debug_import.txt', "السطور المتجاهلة: $skippedLines\n", FILE_APPEND);
        file_put_contents('debug_import.txt', "السجلات المستوردة: $importedCount\n", FILE_APPEND);
        file_put_contents('debug_import.txt', "الأقسام المُنشأة: " . count($createdDepartments) . "\n", FILE_APPEND);
        file_put_contents('debug_import.txt', "الأخطاء: " . count($errors) . "\n", FILE_APPEND);

        $pendingEmployeeSync = 0;
        try {
            $pendingStmt = $pdo->query("
                SELECT COUNT(DISTINCT TRIM(fa.ac_no))
                FROM fingerprint_attendance fa
                WHERE TRIM(fa.ac_no) != ''
                AND TRIM(fa.ac_no) NOT IN (
                    SELECT TRIM(CAST(e.`AC-No.` AS CHAR))
                    FROM employees e
                    WHERE e.`AC-No.` IS NOT NULL AND TRIM(CAST(e.`AC-No.` AS CHAR)) != ''
                )
            ");
            $pendingEmployeeSync = (int) $pendingStmt->fetchColumn();
        } catch (Exception $e) {
            $pendingEmployeeSync = 0;
        }

        echo json_encode([
            'success' => true,
            'message' => "تم استيراد $importedCount سجل بنجاح من أصل $processedLines سطر",
            'processed_lines' => $processedLines,
            'imported_count' => $importedCount,
            'skipped_lines' => $skippedLines,
            'created_departments' => count($createdDepartments),
            'pending_employee_sync' => $pendingEmployeeSync,
            'errors' => $errors,
            'debug_info' => [
                'total_lines_in_file' => count($lines),
                'lines_after_header_removal' => count($lines)
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'إجراء غير صحيح'
        ]);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'خطأ: ' . $e->getMessage()
    ]);
}
?>
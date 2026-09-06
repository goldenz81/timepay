<?php
require_once 'cors_headers.php';
require_once 'config.php';
require_once 'fingerprint_import_helpers.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    if ($action === 'import_csv_data') {
        // تهيئة المتغيرات
        $processedLines = 0;
        $importedCount = 0;
        $skippedLines = 0;

        $csvData = $input['csv_data'] ?? '';

        if (empty($csvData)) {
            throw new Exception('بيانات CSV مطلوبة');
        }

        $lines = explode("\n", trim($csvData));
        if (empty($lines)) {
            throw new Exception('بيانات CSV فارغة');
        }

        array_shift($lines); // إزالة العنوان

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
                INDEX idx_ac_date (ac_no, attendance_date),
                INDEX idx_date (attendance_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

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

            // التحقق من عدد الأعمدة
            if (count($data) < 8) {
                $errors[] = "سطر " . ($lineNumber + 2) . ": عدد الأعمدة غير كافي";
                $skippedLines++;
                continue;
            }

            // إضافة أعمدة فارغة إذا لزم الأمر
            while (count($data) < 12) {
                $data[] = '';
            }

            // تنظيف البيانات
            $acNo = trim($data[0]);
            $employeeName = trim($data[1]);
            $date = trim($data[2]);
            $clockIn = normalizeFingerprintTimeValue($data[3] ?? null);
            $clockOut = normalizeFingerprintTimeValue($data[4] ?? null);
            $late = normalizeFingerprintTimeValue($data[5] ?? null);
            $early = normalizeFingerprintTimeValue($data[6] ?? null);
            $absentValue = trim($data[7]);
            $otTime = normalizeFingerprintTimeValue($data[8] ?? null);
            $workTime = normalizeFingerprintTimeValue($data[9] ?? null);
            $department = trim($data[10]);
            $weekDay = trim($data[11]);

            // معالجة قيمة الغياب
            $absent = 0;
            if (!empty($absentValue) && strtolower($absentValue) !== 'false') {
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
                        updated_at = CURRENT_TIMESTAMP
                ");

                $stmt->execute([
                    $acNo, $employeeName, $date, $clockIn, $clockOut,
                    $late, $early, $absent, $otTime, $workTime, $department, $weekDay
                ]);

                $importedCount++;
            } catch (Exception $e) {
                $errors[] = "خطأ في حفظ سطر " . ($lineNumber + 2) . ": " . $e->getMessage();
                $skippedLines++;
            }
        }

        echo json_encode([
            'success' => true,
            'message' => "تم استيراد $importedCount سجل بنجاح من أصل $processedLines سطر",
            'processed_lines' => $processedLines,
            'imported_count' => $importedCount,
            'skipped_lines' => $skippedLines,
            'created_departments' => count($createdDepartments),
            'errors' => $errors
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
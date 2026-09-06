<?php
require_once 'cors_headers.php';
require_once 'config.php';

try {
    // عدد السجلات في fingerprint_attendance
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM fingerprint_attendance");
    $fpCount = $stmt->fetch()['total'];

    // عدد السجلات في attendance_logs
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM attendance_logs");
    $attCount = $stmt->fetch()['total'];

    // جرب استعلام المزامنة المباشر
    $stmt = $pdo->query("
        SELECT
            fa.ac_no,
            e.id as employee_id,
            e.employee_code,
            fa.attendance_date,
            MIN(fa.clock_in) as first_checkin,
            MAX(fa.clock_out) as last_checkout,
            MIN(fa.employee_name) as employee_name,
            MIN(fa.department) as department,
            GROUP_CONCAT(DISTINCT fa.clock_in ORDER BY fa.clock_in) as all_checkins,
            GROUP_CONCAT(DISTINCT fa.clock_out ORDER BY fa.clock_out) as all_checkouts
        FROM fingerprint_attendance fa
        LEFT JOIN employees e ON fa.ac_no = e.`AC-No.`
        WHERE e.id IS NOT NULL
        GROUP BY fa.ac_no, fa.attendance_date, e.id
        ORDER BY fa.attendance_date, fa.ac_no
        LIMIT 5
    ");
    $testQuery = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // اختبر إدراج سجل واحد
    if (!empty($testQuery)) {
        $record = $testQuery[0];

        // تحقق من وجود السجل
        $checkStmt = $pdo->prepare("
            SELECT id FROM attendance_logs
            WHERE employee_id = ? AND attendance_date = ?
        ");
        $checkStmt->execute([$record['employee_id'], $record['attendance_date']]);
        $existing = $checkStmt->fetch();

        $exists = $existing ? 'نعم' : 'لا';

        // جرب الإدراج إذا لم يكن موجوداً
        $insertResult = 'لم يتم المحاولة';
        if (!$existing) {
            $workHours = 0;
            if ($record['first_checkin'] && $record['last_checkout']) {
                $checkinTime = strtotime($record['first_checkin']);
                $checkoutTime = strtotime($record['last_checkout']);
                $workHours = ($checkoutTime - $checkinTime) / 3600;
            }

            $status = $record['first_checkin'] ? 'present' : 'absent';
            $lateMinutes = 0;
            if ($record['first_checkin']) {
                $checkinTime = strtotime($record['first_checkin']);
                $standardTime = strtotime('08:30:00');
                if ($checkinTime > $standardTime) {
                    $lateMinutes = ($checkinTime - $standardTime) / 60;
                }
            }

            $insertStmt = $pdo->prepare("
                INSERT INTO attendance_logs (
                    employee_id,
                    employee_code,
                    attendance_date,
                    check_in,
                    check_out,
                    work_hours,
                    status,
                    late_minutes,
                    notes,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");

            try {
                $result = $insertStmt->execute([
                    $record['employee_id'],
                    $record['employee_code'],
                    $record['attendance_date'],
                    $record['first_checkin'],
                    $record['last_checkout'],
                    round($workHours, 2),
                    $status,
                    $lateMinutes,
                    'اختبار مزامنة: ' . date('Y-m-d H:i:s')
                ]);
                $insertResult = $result ? 'نجح' : 'فشل';
            } catch (Exception $e) {
                $insertResult = 'خطأ: ' . $e->getMessage();
            }
        }
    }

    echo json_encode([
        'success' => true,
        'fingerprint_count' => $fpCount,
        'attendance_count' => $attCount,
        'test_query_result' => $testQuery,
        'test_record_exists' => $exists ?? 'لا توجد بيانات',
        'test_insert_result' => $insertResult ?? 'لم يتم المحاولة'
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_UNESCAPED_UNICODE);
}
?>
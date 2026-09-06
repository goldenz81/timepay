<?php
/**
 * غياب تلقائي لأيام العمل بدون بيانات بصمة، مع استبداله عند مزامنة البصمة لاحقاً.
 */

if (!defined('AUTO_ABSENCE_NOTE_PREFIX')) {
    define('AUTO_ABSENCE_NOTE_PREFIX', 'AUTO_ABSENCE:');
}

function getAutoAbsenceNoteText() {
    return AUTO_ABSENCE_NOTE_PREFIX . ' غياب تلقائي - لا بيانات بصمة';
}

/**
 * @param array|string $record سجل attendance_logs أو نص notes
 */
function isAutoAbsenceRecord($record) {
    if (is_string($record)) {
        return strpos($record, AUTO_ABSENCE_NOTE_PREFIX) !== false;
    }
    if (!is_array($record)) {
        return false;
    }
    $notes = (string)($record['notes'] ?? '');
    $status = (string)($record['status'] ?? '');
    return $status === 'absent' && strpos($notes, AUTO_ABSENCE_NOTE_PREFIX) !== false;
}

function absenceHelperGetSystemVar($pdo, $key, $default = null) {
    try {
        $stmt = $pdo->prepare('SELECT variable_value FROM system_variables WHERE variable_key = ? AND is_active = 1');
        $stmt->execute([$key]);
        $val = $stmt->fetchColumn();
        if ($val === false || $val === null || $val === '') {
            return $default;
        }
        return $val;
    } catch (Exception $e) {
        return $default;
    }
}

/**
 * تحديد هل التاريخ عطلة أسبوعية حسب system_variables.weekend_day
 */
function isWeeklyHolidayDateForPdo($pdo, $attendanceDate) {
    try {
        if (empty($attendanceDate)) {
            return false;
        }

        $weekendVar = absenceHelperGetSystemVar($pdo, 'weekend_day', 'Friday');
        $weekendVar = trim((string)$weekendVar);
        if ($weekendVar === '') {
            $weekendVar = 'Friday';
        }

        $tokens = array_filter(array_map('trim', preg_split('/[,،]/u', $weekendVar)));
        if (empty($tokens)) {
            $tokens = ['Friday'];
        }

        $dateObj = new DateTime($attendanceDate);
        $dayNameEn = strtolower($dateObj->format('l'));
        $dayIsoNum = (int)$dateObj->format('N');

        $map = [
            'monday' => 1, 'mon' => 1, 'الاثنين' => 1, 'الإثنين' => 1, '1' => 1,
            'tuesday' => 2, 'tue' => 2, 'الثلاثاء' => 2, '2' => 2,
            'wednesday' => 3, 'wed' => 3, 'الاربعاء' => 3, 'الأربعاء' => 3, '3' => 3,
            'thursday' => 4, 'thu' => 4, 'الخميس' => 4, '4' => 4,
            'friday' => 5, 'fri' => 5, 'الجمعة' => 5, '5' => 5,
            'saturday' => 6, 'sat' => 6, 'السبت' => 6, '6' => 6,
            'sunday' => 7, 'sun' => 7, 'الاحد' => 7, 'الأحد' => 7, '0' => 7, '7' => 7,
        ];

        foreach ($tokens as $token) {
            $normalized = strtolower($token);
            if (isset($map[$normalized]) && (int)$map[$normalized] === $dayIsoNum) {
                return true;
            }
            if ($normalized === $dayNameEn) {
                return true;
            }
        }
    } catch (Exception $e) {
        error_log('isWeeklyHolidayDateForPdo error: ' . $e->getMessage());
    }

    return false;
}

/**
 * هل يوجد في الفترة أي سجل حضور حقيقي (غير الغياب التلقائي) أو بيانات بصمة؟
 *
 * @return array{employee_ids:int[], has_any:bool}
 */
function getEmployeesWithSeedAttendanceInRange($pdo, $startDate, $endDate, $employeeId = null) {
    $seedEmployees = [];

    $logParams = [$startDate, $endDate];
    $logWhereEmp = '';
    if (!empty($employeeId)) {
        $logWhereEmp = ' AND employee_id = ?';
        $logParams[] = $employeeId;
    }
    $logStmt = $pdo->prepare(
        'SELECT employee_id, status, notes FROM attendance_logs
         WHERE attendance_date BETWEEN ? AND ?' . $logWhereEmp
    );
    $logStmt->execute($logParams);
    foreach ($logStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        if (!isAutoAbsenceRecord($row)) {
            $seedEmployees[(int)$row['employee_id']] = true;
        }
    }

    $fpParams = [$startDate, $endDate];
    $fpWhereEmp = '';
    if (!empty($employeeId)) {
        $fpWhereEmp = ' AND e.id = ?';
        $fpParams[] = $employeeId;
    }
    $fpStmt = $pdo->prepare(
        "SELECT DISTINCT e.id AS employee_id
         FROM fingerprint_attendance fa
         INNER JOIN employees e ON TRIM(CAST(fa.ac_no AS CHAR)) = TRIM(CAST(e.`AC-No.` AS CHAR))
         WHERE fa.attendance_date BETWEEN ? AND ?" . $fpWhereEmp
    );
    $fpStmt->execute($fpParams);
    foreach ($fpStmt->fetchAll(PDO::FETCH_COLUMN) as $empId) {
        $seedEmployees[(int)$empId] = true;
    }

    $employeeIds = array_keys($seedEmployees);
    return [
        'employee_ids' => $employeeIds,
        'has_any' => !empty($employeeIds),
    ];
}

/**
 * إنشاء سجلات غياب تلقائية لأيام العمل بدون سجل حضور وبدون بيانات بصمة.
 * يُطبَّق فقط للموظفين الذين لديهم سجل واحد على الأقل (حضور/بصمة) في الفترة.
 *
 * @return array{created:int, start_date:string, end_date:string, skipped_reason?:string}
 */
function fillMissingAbsenceRecords($pdo, $startDate, $endDate, $employeeId = null) {
    if (empty($startDate) || empty($endDate)) {
        throw new InvalidArgumentException('start_date و end_date مطلوبة');
    }

    $today = date('Y-m-d');
    if ($endDate > $today) {
        $endDate = $today;
    }
    if ($startDate > $endDate) {
        return ['created' => 0, 'start_date' => $startDate, 'end_date' => $endDate];
    }

    $seedInfo = getEmployeesWithSeedAttendanceInRange($pdo, $startDate, $endDate, $employeeId);
    if (!$seedInfo['has_any']) {
        return [
            'created' => 0,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'skipped_reason' => 'empty_period',
        ];
    }

    $employees = $seedInfo['employee_ids'];
    if (empty($employees)) {
        return ['created' => 0, 'start_date' => $startDate, 'end_date' => $endDate];
    }

    $logParams = [$startDate, $endDate];
    $logWhereEmp = '';
    if (!empty($employeeId)) {
        $logWhereEmp = ' AND employee_id = ?';
        $logParams[] = $employeeId;
    }
    $logStmt = $pdo->prepare(
        'SELECT employee_id, attendance_date FROM attendance_logs
         WHERE attendance_date BETWEEN ? AND ?' . $logWhereEmp
    );
    $logStmt->execute($logParams);
    $existing = [];
    foreach ($logStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $existing[$row['employee_id'] . '_' . $row['attendance_date']] = true;
    }

    $fpParams = [$startDate, $endDate];
    $fpWhereEmp = '';
    if (!empty($employeeId)) {
        $fpWhereEmp = ' AND e.id = ?';
        $fpParams[] = $employeeId;
    }
    $fpStmt = $pdo->prepare(
        "SELECT e.id AS employee_id, fa.attendance_date
         FROM fingerprint_attendance fa
         INNER JOIN employees e ON TRIM(CAST(fa.ac_no AS CHAR)) = TRIM(CAST(e.`AC-No.` AS CHAR))
         WHERE fa.attendance_date BETWEEN ? AND ?" . $fpWhereEmp
    );
    $fpStmt->execute($fpParams);
    $fingerprintDays = [];
    foreach ($fpStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $fingerprintDays[$row['employee_id'] . '_' . $row['attendance_date']] = true;
    }

    $insertStmt = $pdo->prepare(
        "INSERT INTO attendance_logs (
            employee_id, attendance_date, check_in, check_out,
            work_hours, overtime_hours, late_minutes, early_leave_minutes,
            is_holiday, status, notes, created_at
        ) VALUES (?, ?, NULL, NULL, 0, 0, 0, 0, 0, 'absent', ?, NOW())"
    );
    $autoNote = getAutoAbsenceNoteText();
    $created = 0;

    $current = new DateTime($startDate);
    $end = new DateTime($endDate);
    while ($current <= $end) {
        $dateStr = $current->format('Y-m-d');
        if (!isWeeklyHolidayDateForPdo($pdo, $dateStr)) {
            foreach ($employees as $empId) {
                $key = $empId . '_' . $dateStr;
                if (isset($existing[$key]) || isset($fingerprintDays[$key])) {
                    continue;
                }
                try {
                    $insertStmt->execute([$empId, $dateStr, $autoNote]);
                    $created++;
                    $existing[$key] = true;
                } catch (PDOException $e) {
                    if ((int)$e->errorInfo[1] !== 1062) {
                        throw $e;
                    }
                }
            }
        }
        $current->modify('+1 day');
    }

    return ['created' => $created, 'start_date' => $startDate, 'end_date' => $endDate];
}

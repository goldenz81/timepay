<?php
/**
 * تكامل نظام البصمة مع النظام الحالي
 * 
 * @author TimePay System
 * @version 1.0
 * @date 2025-01-19
 */

// منع إخراج أخطاء PHP كـ HTML حتى لا يكسر استجابة JSON
if (!defined('DISPLAY_ERRORS_FOR_API')) {
    @ini_set('display_errors', '0');
}

require_once 'cors_headers.php';
require_once 'config.php';
// دوال الحضور: getSystemVar, calculateHours, calculateOvertimeHoursFromCheckOut, cleanTimeString
require_once 'attendance_logs.php';
require_once 'attendance_absence_helpers.php';

class FingerprintSystemIntegration {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->ensureFingerprintSyncColumns();
    }

    /**
     * عمود synced_at لتتبع ما نُقل إلى attendance_logs (مزامنة تزايدية)
     */
    private function ensureFingerprintSyncColumns() {
        try {
            $cols = $this->pdo->query('DESCRIBE fingerprint_attendance')->fetchAll(PDO::FETCH_COLUMN);
            if (!in_array('updated_at', $cols, true)) {
                $this->pdo->exec('ALTER TABLE fingerprint_attendance ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
                $cols[] = 'updated_at';
            }
            if (!in_array('synced_at', $cols, true)) {
                $this->pdo->exec('ALTER TABLE fingerprint_attendance ADD COLUMN synced_at DATETIME NULL DEFAULT NULL');
                try {
                    $this->pdo->exec('ALTER TABLE fingerprint_attendance ADD INDEX idx_fa_sync_pending (synced_at, updated_at)');
                } catch (Exception $e) {
                    /* قد يكون موجوداً */
                }
                // اعتبار السجلات الحالية مزامَنة مسبقاً (تجنّب إعادة مزامنة كاملة عند أول ترقية)
                $this->pdo->exec('UPDATE fingerprint_attendance SET synced_at = COALESCE(updated_at, created_at, NOW()) WHERE synced_at IS NULL');
            }
        } catch (Exception $e) {
            error_log('ensureFingerprintSyncColumns: ' . $e->getMessage());
        }
    }

    /** شرط SQL: سجلات تحتاج مزامنة (جديدة أو مُحدَّثة بعد آخر مزامنة) */
    private function pendingSyncSql($alias = 'fa', $incrementalOnly = true) {
        if (!$incrementalOnly) {
            return '1=1';
        }
        return "({$alias}.synced_at IS NULL OR {$alias}.updated_at > {$alias}.synced_at)";
    }

    private function markFingerprintDaySynced($acNo, $attendanceDate) {
        $stmt = $this->pdo->prepare('
            UPDATE fingerprint_attendance
            SET synced_at = NOW()
            WHERE ac_no = ? AND attendance_date = ?
        ');
        $stmt->execute([$acNo, $attendanceDate]);
    }

    private function clearAllFingerprintSyncedFlags() {
        $this->pdo->exec('UPDATE fingerprint_attendance SET synced_at = NULL');
    }

    /**
     * إدراج/تحديث سجل حضور دون تكرار ملاحظة المزامنة
     */
    private function upsertAttendanceFromFingerprint($employeeId, $attendanceDate, array $attendanceData, $noteLabel, &$syncedCount, &$updatedCount, &$minDate, &$maxDate) {
        $checkStmt = $this->pdo->prepare('SELECT id, notes FROM attendance_logs WHERE employee_id = ? AND attendance_date = ?');
        $checkStmt->execute([$employeeId, $attendanceDate]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if ($minDate === null || $attendanceDate < $minDate) {
            $minDate = $attendanceDate;
        }
        if ($maxDate === null || $attendanceDate > $maxDate) {
            $maxDate = $attendanceDate;
        }

        if ($existing) {
            if (isAutoAbsenceRecord($existing)) {
                // استبدال الغياب التلقائي ببيانات البصمة الحقيقية عند وصول ملف جديد
                $notes = $noteLabel;
            } else {
                $notes = $existing['notes'] ?? '';
                if ($notes === null || $notes === '') {
                    $notes = $noteLabel;
                } elseif (strpos($notes, 'مزامن من البصمة') === false) {
                    $notes .= ' | ' . $noteLabel;
                }
            }

            $updateStmt = $this->pdo->prepare('
                UPDATE attendance_logs SET
                    check_in = ?,
                    check_out = ?,
                    work_hours = ?,
                    overtime_hours = ?,
                    late_minutes = ?,
                    early_leave_minutes = ?,
                    is_holiday = ?,
                    status = ?,
                    notes = ?,
                    updated_at = NOW()
                WHERE id = ?
            ');
            $updateStmt->execute([
                $attendanceData['check_in'],
                $attendanceData['check_out'],
                $attendanceData['work_hours'],
                $attendanceData['overtime_hours'],
                $attendanceData['late_minutes'],
                $attendanceData['early_leave_minutes'],
                $attendanceData['is_holiday'],
                $attendanceData['status'],
                $notes,
                $existing['id'],
            ]);
            $updatedCount++;
        } else {
            $insertStmt = $this->pdo->prepare('
                INSERT INTO attendance_logs (
                    employee_id, attendance_date, check_in, check_out,
                    work_hours, overtime_hours, late_minutes, early_leave_minutes,
                    is_holiday, status, notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ');
            $insertStmt->execute([
                $employeeId,
                $attendanceDate,
                $attendanceData['check_in'],
                $attendanceData['check_out'],
                $attendanceData['work_hours'],
                $attendanceData['overtime_hours'],
                $attendanceData['late_minutes'],
                $attendanceData['early_leave_minutes'],
                $attendanceData['is_holiday'],
                $attendanceData['status'],
                $noteLabel,
            ]);
            $syncedCount++;
        }
    }

    /**
     * تحديد هل التاريخ عطلة أسبوعية حسب system_variables.weekend_day
     * يدعم قيم مثل: Friday / الجمعة / 5 وكذلك قائمة أيام مفصولة بفاصلة.
     */
    private function isWeeklyHolidayDate($attendanceDate) {
        try {
            if (empty($attendanceDate)) return 0;

            $weekendVar = getSystemVar($this->pdo, 'weekend_day', 'Friday');
            $weekendVar = trim((string)$weekendVar);
            if ($weekendVar === '') $weekendVar = 'Friday';

            // دعم أكثر من يوم عطلة (comma-separated)
            $tokens = array_filter(array_map('trim', preg_split('/[,،]/u', $weekendVar)));
            if (empty($tokens)) $tokens = ['Friday'];

            $dateObj = new DateTime($attendanceDate);
            $dayNameEn = strtolower($dateObj->format('l')); // sunday..saturday
            $dayIsoNum = (int)$dateObj->format('N'); // 1..7 (Mon..Sun)

            $map = [
                'monday' => 1, 'mon' => 1, 'الاثنين' => 1, 'الإثنين' => 1, '1' => 1,
                'tuesday' => 2, 'tue' => 2, 'الثلاثاء' => 2, '2' => 2,
                'wednesday' => 3, 'wed' => 3, 'الاربعاء' => 3, 'الأربعاء' => 3, '3' => 3,
                'thursday' => 4, 'thu' => 4, 'الخميس' => 4, '4' => 4,
                'friday' => 5, 'fri' => 5, 'الجمعة' => 5, '5' => 5,
                'saturday' => 6, 'sat' => 6, 'السبت' => 6, '6' => 6,
                'sunday' => 7, 'sun' => 7, 'الاحد' => 7, 'الأحد' => 7, '0' => 7, '7' => 7
            ];

            foreach ($tokens as $token) {
                $normalized = strtolower($token);
                if (isset($map[$normalized]) && (int)$map[$normalized] === $dayIsoNum) {
                    return 1;
                }
                // fallback مباشر للاسم الإنجليزي
                if ($normalized === $dayNameEn) {
                    return 1;
                }
            }
        } catch (Exception $e) {
            error_log("isWeeklyHolidayDate error: " . $e->getMessage());
        }
        return 0;
    }
    
    /**
     * مزامنة بيانات البصمة مع جدول الموظفين
     */
    public function syncEmployees() {
        try {
            // جلب الموظفين من البصمة غير الموجودين في النظام
            $stmt = $this->pdo->query("
                SELECT DISTINCT TRIM(fa.ac_no) AS ac_no, fa.employee_name, fa.department
                FROM fingerprint_attendance fa
                WHERE TRIM(fa.ac_no) != ''
                AND TRIM(fa.ac_no) NOT IN (
                    SELECT TRIM(CAST(e.`AC-No.` AS CHAR))
                    FROM employees e
                    WHERE e.`AC-No.` IS NOT NULL AND TRIM(CAST(e.`AC-No.` AS CHAR)) != ''
                )
            ");
            
            $newEmployees = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $syncedCount = 0;
            $skippedDuplicateFingerprint = 0;
            $checkTaken = $this->pdo->prepare("
                SELECT id FROM employees
                WHERE TRIM(CAST(`AC-No.` AS CHAR)) = ?
                LIMIT 1
            ");
            
            foreach ($newEmployees as $employee) {
                $acNo = trim((string) ($employee['ac_no'] ?? ''));
                if ($acNo === '') {
                    continue;
                }
                $checkTaken->execute([$acNo]);
                if ($checkTaken->fetchColumn()) {
                    $skippedDuplicateFingerprint++;
                    continue;
                }

                $insertStmt = $this->pdo->prepare("
                    INSERT INTO employees (
                        employee_code, 
                        `AC-No.`,
                        name, 
                        department, 
                        status, 
                        fingerprint_id,
                        fingerprint_enrolled,
                        created_at
                    ) VALUES (?, ?, ?, ?, 'active', ?, 1, NOW())
                ");
                
                $insertStmt->execute([
                    null, // employee_code = فارغ (يتم إضافته يدوياً لاحقاً)
                    $acNo,
                    $employee['employee_name'],
                    $employee['department'],
                    $acNo
                ]);
                
                $syncedCount++;
            }
            $this->saveLastSyncTime();
            $skipNote = $skippedDuplicateFingerprint > 0
                ? " (تخطّي $skippedDuplicateFingerprint كود بصمة مكرر)"
                : '';
            return [
                'success' => true,
                'message' => "تم مزامنة $syncedCount موظف جديد$skipNote",
                'synced_count' => $syncedCount,
                'duplicate_fingerprint_skipped' => $skippedDuplicateFingerprint,
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'خطأ في مزامنة الموظفين: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * مزامنة بيانات الحضور من البصمة إلى جدول الحضور
     */
    /**
     * مزامنة الحضور التفصيلية (سجل واحد لكل موظف في اليوم - مجمع من أحداث البصمة)
     * جدول attendance_logs له قيد UNIQUE(employee_id, attendance_date) فلا يمكن وجود أكثر من سجل لكل موظف في اليوم.
     */
    public function syncAttendanceDetailed($incrementalOnly = true) {
        try {
            $syncedCount = 0;
            $updatedCount = 0;
            $minDate = null;
            $maxDate = null;
            $pendingFilter = $this->pendingSyncSql('fa', $incrementalOnly);

            // جلب كل سجل بصمة فردي ثم تجميعها حسب (موظف + تاريخ)
            $stmt = $this->pdo->query("
                SELECT
                    fa.*,
                    e.id as employee_id,
                    e.employee_code
                FROM fingerprint_attendance fa
                LEFT JOIN employees e ON fa.ac_no = e.`AC-No.`
                WHERE e.id IS NOT NULL AND {$pendingFilter}
                ORDER BY fa.attendance_date, fa.ac_no, fa.clock_in
            ");

            $fingerprintData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $modeLabel = $incrementalOnly ? 'تزايدية' : 'كاملة';
            error_log("بدء مزامنة الحضور التفصيلية ({$modeLabel}) - سجلات للمعالجة: " . count($fingerprintData));

            // تجميع حسب (employee_id, attendance_date) لأن الجدول يسمح بسجل واحد فقط لكل (موظف + يوم)
            $grouped = [];
            foreach ($fingerprintData as $record) {
                $key = $record['employee_id'] . '_' . $record['attendance_date'];
                if (!isset($grouped[$key])) {
                    $grouped[$key] = [
                        'employee_id'   => $record['employee_id'],
                        'employee_code' => $record['employee_code'],
                        'attendance_date' => $record['attendance_date'],
                        'ac_no'         => $record['ac_no'],
                        'clock_ins'     => [],
                        'clock_outs'    => [],
                        'is_absent'     => 0,
                        'employee_name' => $record['employee_name'] ?? null,
                        'department'    => $record['department'] ?? null,
                        'record_count'  => 0
                    ];
                }
                $g = &$grouped[$key];
                if (!empty($record['clock_in'])) $g['clock_ins'][] = $record['clock_in'];
                if (!empty($record['clock_out'])) $g['clock_outs'][] = $record['clock_out'];
                if (!empty($record['is_absent'])) $g['is_absent'] = max($g['is_absent'], (int)$record['is_absent']);
                $g['record_count']++;
            }

            foreach ($grouped as $key => $group) {
                $clockIns  = array_unique(array_filter($group['clock_ins']));
                $clockOuts = array_unique(array_filter($group['clock_outs']));
                sort($clockIns);
                sort($clockOuts);
                $firstClockIn  = !empty($clockIns) ? $clockIns[0] : null;
                $lastClockOut  = !empty($clockOuts) ? $clockOuts[count($clockOuts) - 1] : null;

                $aggregatedRecord = [
                    'employee_id'     => $group['employee_id'],
                    'employee_code'   => $group['employee_code'],
                    'attendance_date' => $group['attendance_date'],
                    'ac_no'           => $group['ac_no'],
                    'clock_ins'       => implode('|', $clockIns),
                    'clock_outs'      => implode('|', $clockOuts),
                    'is_absent'       => $group['is_absent'],
                    'employee_name'   => $group['employee_name'],
                    'department'      => $group['department'],
                    'record_count'    => $group['record_count']
                ];

                $attendanceData = $this->convertAggregatedFingerprintData($aggregatedRecord);

                $this->upsertAttendanceFromFingerprint(
                    $group['employee_id'],
                    $group['attendance_date'],
                    $attendanceData,
                    'مزامن من البصمة - تفصيلي',
                    $syncedCount,
                    $updatedCount,
                    $minDate,
                    $maxDate
                );
                $this->markFingerprintDaySynced($group['ac_no'], $group['attendance_date']);
            }

            $totalProcessed = count($grouped);

            $this->saveLastSyncTime();
            $this->saveNewAttendanceCount($syncedCount);
            $syncTypeAr = $incrementalOnly ? 'التغييرات' : 'كاملة';
            $result = [
                'success' => true,
                'message' => "مزامنة الحضور ({$syncTypeAr}): $syncedCount جديد، $updatedCount محدّث" . ($totalProcessed === 0 ? ' — لا توجد تغييرات معلّقة' : ''),
                'synced_count' => $syncedCount,
                'updated_count' => $updatedCount,
                'mode' => 'detailed',
                'incremental' => (bool)$incrementalOnly,
                'total_processed' => $totalProcessed,
            ];
            return $this->applyRecomputeAfterSync($result, $minDate, $maxDate);

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'خطأ في مزامنة الحضور التفصيلية: ' . $e->getMessage()
            ];
        }
    }

    /**
     * مزامنة الحضور المجمعة (سجل واحد لكل موظف في اليوم)
     */
    public function syncAttendance($incrementalOnly = true) {
        try {
            $syncedCount = 0;
            $updatedCount = 0;
            $minDate = null;
            $maxDate = null;
            $pendingFilter = $this->pendingSyncSql('fa', $incrementalOnly);

            // جلب بيانات البصمة مجمعة حسب الموظف والتاريخ
            $stmt = $this->pdo->query("
                SELECT
                    fa.ac_no,
                    e.id as employee_id,
                    fa.attendance_date,
                    GROUP_CONCAT(DISTINCT fa.clock_in SEPARATOR '|') as clock_ins,
                    GROUP_CONCAT(DISTINCT fa.clock_out SEPARATOR '|') as clock_outs,
                    SUM(CASE WHEN fa.late_time IS NOT NULL THEN TIME_TO_SEC(fa.late_time) ELSE 0 END) as total_late_seconds,
                    SUM(CASE WHEN fa.early_time IS NOT NULL THEN TIME_TO_SEC(fa.early_time) ELSE 0 END) as total_early_seconds,
                    SUM(CASE WHEN fa.ot_time IS NOT NULL THEN TIME_TO_SEC(fa.ot_time) ELSE 0 END) as total_ot_seconds,
                    SUM(CASE WHEN fa.work_time IS NOT NULL THEN TIME_TO_SEC(fa.work_time) ELSE 0 END) as total_work_seconds,
                    MAX(fa.is_absent) as is_absent,
                    MAX(fa.employee_name) as employee_name,
                    MAX(fa.department) as department,
                    COUNT(*) as record_count
                FROM fingerprint_attendance fa
                LEFT JOIN employees e ON fa.ac_no = e.`AC-No.`
                WHERE e.id IS NOT NULL AND {$pendingFilter}
                GROUP BY fa.ac_no, e.id, fa.attendance_date
                ORDER BY fa.attendance_date, fa.ac_no
            ");

            $fingerprintData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // إحصائيات للتتبع
            $totalFingerprintRecords = $this->pdo->query("SELECT COUNT(*) FROM fingerprint_attendance")->fetchColumn();
            $matchedRecords = count($fingerprintData);
            $unmatchedRecords = $totalFingerprintRecords - $matchedRecords;

            error_log("بدء مزامنة الحضور:");
            error_log("- إجمالي السجلات في fingerprint_attendance: " . $totalFingerprintRecords);
            error_log("- السجلات المطابقة للموظفين: " . $matchedRecords);
            error_log("- السجلات غير المطابقة: " . $unmatchedRecords);
            error_log("- السجلات المجمعة المراد مزامنتها: " . count($fingerprintData));

            foreach ($fingerprintData as $record) {
                error_log("معالجة سجل مجمع: Employee ID={$record['employee_id']}, AC-No={$record['ac_no']}, Date={$record['attendance_date']}, Records={$record['record_count']}");

                $attendanceData = $this->convertAggregatedFingerprintData($record);

                $this->upsertAttendanceFromFingerprint(
                    $record['employee_id'],
                    $record['attendance_date'],
                    $attendanceData,
                    'مزامن من البصمة',
                    $syncedCount,
                    $updatedCount,
                    $minDate,
                    $maxDate
                );
                $this->markFingerprintDaySynced($record['ac_no'], $record['attendance_date']);
            }
            $this->saveLastSyncTime();
            $this->saveNewAttendanceCount($syncedCount);
            return $this->applyRecomputeAfterSync([
                'success' => true,
                'message' => "تم مزامنة $syncedCount سجل جديد وتحديث $updatedCount سجل موجود",
                'synced_count' => $syncedCount,
                'updated_count' => $updatedCount,
                'incremental' => (bool)$incrementalOnly,
            ], $minDate, $maxDate);

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'خطأ في مزامنة الحضور: ' . $e->getMessage()
            ];
        }
    }

    /**
     * نطاق تواريخ بيانات البصمة (للموظفين المربوطين) لإعادة الاحتساب الشامل بعد المزامنة
     */
    private function getFingerprintAttendanceDateRange() {
        $stmt = $this->pdo->query("
            SELECT MIN(fa.attendance_date) AS min_date, MAX(fa.attendance_date) AS max_date
            FROM fingerprint_attendance fa
            INNER JOIN employees e ON fa.ac_no = e.`AC-No.`
        ");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || empty($row['min_date']) || empty($row['max_date'])) {
            return null;
        }
        return ['start' => $row['min_date'], 'end' => $row['max_date']];
    }

    /**
     * إعادة احتساب شامل لجميع سجلات attendance_logs في فترة بيانات البصمة (مثل زر إدارة الحضور)
     */
    private function applyRecomputeAfterSync(array $result, $startDate = null, $endDate = null) {
        if (empty($result['success'])) {
            return $result;
        }
        if (!function_exists('recomputeAttendanceRange')) {
            return $result;
        }

        $processed = (int)($result['total_processed'] ?? 0) + (int)($result['synced_count'] ?? 0) + (int)($result['updated_count'] ?? 0);
        if ($processed === 0 && empty($startDate)) {
            $result['recompute'] = ['applied' => false, 'reason' => 'nothing_to_sync'];
            return $result;
        }

        if ($startDate && $endDate) {
            $range = ['start' => $startDate, 'end' => $endDate];
        } else {
            $range = $this->getFingerprintAttendanceDateRange();
        }
        if (!$range) {
            $result['recompute'] = ['applied' => false, 'reason' => 'no_fingerprint_date_range'];
            return $result;
        }

        try {
            $fillResult = fillMissingAbsenceRecords($this->pdo, $range['start'], $range['end']);
            $updated = recomputeAttendanceRange($this->pdo, $range['start'], $range['end']);
            $result['recompute'] = [
                'applied' => true,
                'start_date' => $range['start'],
                'end_date' => $range['end'],
                'updated_records' => $updated,
                'auto_absence_created' => $fillResult['created'],
            ];
            $result['message'] .= sprintf(
                ' | إعادة احتساب شامل: %d سجل (%s → %s)',
                $updated,
                $range['start'],
                $range['end']
            );
            if ($fillResult['created'] > 0) {
                $result['message'] .= sprintf(' | غياب تلقائي: %d سجل', $fillResult['created']);
            }
            $result['auto_absence_created'] = $fillResult['created'];
        } catch (Exception $e) {
            error_log('fingerprint_integration: recompute after sync failed: ' . $e->getMessage());
            $result['recompute'] = [
                'applied' => false,
                'error' => $e->getMessage()
            ];
        }

        return $result;
    }

    /**
     * تحويل بيانات البصمة المجمعة إلى تنسيق جدول الحضور
     */
    private function convertAggregatedFingerprintData($record) {
        // معالجة أوقات الدخول والخروج
        $clockIns = array_filter(explode('|', $record['clock_ins'] ?? ''));
        $clockOuts = array_filter(explode('|', $record['clock_outs'] ?? ''));

        // العثور على أول وقت دخول وآخر وقت خروج
        $firstClockIn = null;
        $lastClockOut = null;

        if (!empty($clockIns)) {
            sort($clockIns);
            $firstClockIn = $clockIns[0];
        }

        if (!empty($clockOuts)) {
            sort($clockOuts);
            $lastClockOut = $clockOuts[count($clockOuts) - 1];
        }

        // حساب القيم الصحيحة باستخدام الدوال المصححة
        $workHours = 0;
        $overtimeHours = 0;
        $lateMinutes = 0;
        $earlyLeaveMinutes = 0;

        if (!empty($firstClockIn) && !empty($lastClockOut)) {
            try {
                $isHoliday = $this->isWeeklyHolidayDate($record['attendance_date']);
                // العطلة: مدة فعلية كاملة؛ غير ذلك: ضمن نافذة الدوام الرسمي
                $workHours = calculateHours($firstClockIn, $lastClockOut, $record['attendance_date'], (bool)$isHoliday);
                // في العطلات: كل ساعات العمل تُحسب إضافي
                if ($isHoliday) {
                    $overtimeHours = $workHours;
                } else {
                    $overtimeHours = calculateOvertimeHoursFromCheckOut($record['attendance_date'], $lastClockOut, 0, $firstClockIn, $workHours);
                }

                // حساب التأخير والانصراف المبكر
                $lateMinutes = $this->calculateLateMinutes($firstClockIn, $record['attendance_date']);
                $earlyLeaveMinutes = $this->calculateEarlyLeaveMinutes($lastClockOut, $record['attendance_date']);
            } catch (Exception $e) {
                error_log("Error calculating attendance values: " . $e->getMessage());
            }
        }

        // تحديد حالة الحضور
        $status = 'present';
        if ($record['is_absent']) {
            $status = 'absent';
        } elseif ($lateMinutes > 0) {
            $status = 'late';
        }

        return [
            'check_in' => $firstClockIn,
            'check_out' => $lastClockOut,
            'work_hours' => $workHours,
            'overtime_hours' => $overtimeHours,
            'late_minutes' => $lateMinutes,
            'early_leave_minutes' => $earlyLeaveMinutes,
            'is_holiday' => $this->isWeeklyHolidayDate($record['attendance_date']),
            'status' => $status
        ];
    }

    /**
     * حساب دقائق التأخير
     */
    private function calculateLateMinutes($checkIn, $attendanceDate) {
        if (empty($checkIn)) return 0;

        try {
            $officialStart = getSystemVar($this->pdo, 'official_start_time', '08:00:00');
            $graceMinutes = (int)getSystemVar($this->pdo, 'grace_period', 5);
            if ($graceMinutes < 0) {
                $graceMinutes = 0;
            }

            $checkInTime = new DateTime($attendanceDate . ' ' . $checkIn);
            $officialStartTime = new DateTime($attendanceDate . ' ' . $officialStart);
            $graceBoundary = clone $officialStartTime;
            $graceBoundary->modify("+{$graceMinutes} minutes");

            if ($checkInTime > $graceBoundary) {
                // بعد تجاوز حد السماح: يُحسب التأخير بالكامل من وقت بداية الدوام
                $diff = $checkInTime->getTimestamp() - $officialStartTime->getTimestamp();
                return max(0, (int)round($diff / 60));
            }
        } catch (Exception $e) {
            error_log("Error calculating late minutes: " . $e->getMessage());
        }

        return 0;
    }

    /**
     * حساب دقائق الانصراف المبكر
     */
    private function calculateEarlyLeaveMinutes($checkOut, $attendanceDate) {
        if (empty($checkOut)) return 0;

        try {
            $officialEnd = getSystemVar($this->pdo, 'official_end_time', '18:00:00');
            $graceMinutes = (int)getSystemVar($this->pdo, 'early_leave_grace_minutes', 10);
            if ($graceMinutes < 0) {
                $graceMinutes = 0;
            }

            $checkOutTime = new DateTime($attendanceDate . ' ' . $checkOut);
            $officialEndTime = new DateTime($attendanceDate . ' ' . $officialEnd);

            if ($checkOutTime >= $officialEndTime) {
                return 0;
            }
            $rawMinutes = (int)round(($officialEndTime->getTimestamp() - $checkOutTime->getTimestamp()) / 60);
            if ($rawMinutes <= $graceMinutes) {
                return 0;
            }

            return max(0, $rawMinutes);
        } catch (Exception $e) {
            error_log("Error calculating early leave minutes: " . $e->getMessage());
        }

        return 0;
    }

    /**
     * تحويل بيانات البصمة إلى تنسيق جدول الحضور
     */
    private function convertFingerprintToAttendance($record) {
        // تحويل ساعات العمل
        $workHours = 0;
        if ($record['work_time']) {
            $timeParts = explode(':', $record['work_time']);
            $workHours = $timeParts[0] + ($timeParts[1] / 60);
        }

        // تحويل ساعات العمل الإضافي
        $overtimeHours = 0;
        if ($record['ot_time']) {
            $timeParts = explode(':', $record['ot_time']);
            $overtimeHours = $timeParts[0] + ($timeParts[1] / 60);
        }

        // تحويل دقائق التأخير
        $lateMinutes = 0;
        if ($record['late_time']) {
            $timeParts = explode(':', $record['late_time']);
            $lateMinutes = ($timeParts[0] * 60) + $timeParts[1];
        }

        // تحويل دقائق الانصراف المبكر
        $earlyMinutes = 0;
        if ($record['early_time']) {
            $timeParts = explode(':', $record['early_time']);
            $earlyMinutes = ($timeParts[0] * 60) + $timeParts[1];
        }

        // تحديد حالة الحضور
        $status = 'present';
        if ($record['is_absent']) {
            $status = 'absent';
        } elseif ($lateMinutes > 0) {
            $status = 'late';
        }

        return [
            'check_in' => $record['clock_in'],
            'check_out' => $record['clock_out'],
            'work_hours' => $workHours,
            'overtime_hours' => $overtimeHours,
            'late_minutes' => $lateMinutes,
            'early_leave_minutes' => $earlyMinutes,
            'status' => $status
        ];
    }

    private function calculateAttendanceValues($record, $attendanceData) {
        // استخدام البيانات المحسوبة من البصمة إذا كانت متوفرة
        $workHours = $attendanceData['work_hours'] ?: 0;
        $overtimeHours = $attendanceData['overtime_hours'] ?: 0;
        $lateMinutes = $attendanceData['late_minutes'] ?: 0;
        $earlyLeaveMinutes = $attendanceData['early_leave_minutes'] ?: 0;

        // إذا لم تكن البيانات متوفرة من البصمة، احسبها بنفسك
        if ($workHours == 0 && !empty($record['clock_in']) && !empty($record['clock_out'])) {
            // حساب ساعات العمل من check_in و check_out
            $checkIn = $record['clock_in'];
            $checkOut = $record['clock_out'];

            // تنظيف الأوقات
            $checkIn = preg_replace('/[^0-9:]/', '', $checkIn);
            $checkOut = preg_replace('/[^0-9:]/', '', $checkOut);

            try {
                $isHoliday = $this->isWeeklyHolidayDate($record['attendance_date']);
                $workHours = calculateHours($checkIn, $checkOut, $record['attendance_date'], (bool)$isHoliday);
                // في العطلات: كل ساعات العمل تُحسب إضافي
                if ($isHoliday) {
                    $overtimeHours = $workHours;
                } else {
                    $overtimeHours = calculateOvertimeHoursFromCheckOut($record['attendance_date'], $checkOut, 0, $checkIn, $workHours);
                }
            } catch (Exception $e) {
                $workHours = 0;
                $overtimeHours = 0;
            }
        }

        // حساب التأخير/غرامة التأخير بمنطق النظام الحالي دائماً
        // (فترة السماح كحد أدنى فقط، ثم يُحسب كامل التأخير من الوقت الرسمي)
        $latePenaltyHours = 0;
        if (!empty($record['clock_in'])) {
            try {
                $checkInTime = preg_replace('/[^0-9:]/', '', $record['clock_in']);
                $lateMinutes = $this->calculateLateMinutes($checkInTime, $record['attendance_date']);

                // حساب غرامة التأخير
                if ($lateMinutes >= 60) {
                    $latePenaltyHours = $lateMinutes / 60.0;
                } elseif ($lateMinutes > 30) {
                    $latePenaltyHours = 1.0;
                } elseif ($lateMinutes > 0) {
                    $latePenaltyHours = 0.5;
                }
            } catch (Exception $e) {
                $lateMinutes = 0;
                $latePenaltyHours = 0;
            }
        }

        return [
            'work_hours' => $workHours,
            'overtime_hours' => $overtimeHours,
            'late_minutes' => $lateMinutes,
            'early_leave_minutes' => $earlyLeaveMinutes,
            'late_penalty_hours' => $latePenaltyHours
        ];
    }
    
    /**
     * إعادة مزامنة كاملة مع حذف السجلات القديمة
     */
    public function fullResyncAttendance() {
        try {
            $this->clearAllFingerprintSyncedFlags();

            $deleteCount = $this->pdo->exec("
                DELETE FROM attendance_logs
                WHERE notes LIKE '%مزامن من البصمة%'
            ");
            error_log("fullResyncAttendance: deleted $deleteCount rows from attendance_logs");

            $result = $this->syncAttendanceDetailed(false);
            $result['deleted_attendance_logs'] = (int)$deleteCount;
            $result['message'] = 'إعادة مزامنة كاملة: ' . $result['message'];
            if ($deleteCount > 0) {
                $result['message'] .= " (حُذف $deleteCount سجل حضور مزامَن سابقاً)";
            }
            return $result;
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'خطأ في إعادة المزامنة الكاملة: ' . $e->getMessage()
            ];
        }
    }

    /**
     * حفظ وقت آخر مزامنة (يُستدعى بعد نجاح مزامنة الموظفين أو الحضور)
     */
    private function saveLastSyncTime() {
        try {
            $upd = $this->pdo->prepare("UPDATE system_variables SET variable_value = NOW() WHERE variable_key = 'fingerprint_integration_last_sync'");
            $upd->execute();
        } catch (Exception $e) {
            error_log("fingerprint_integration: saveLastSyncTime failed: " . $e->getMessage());
        }
    }

    /**
     * حفظ عدد سجلات الحضور الجديدة (المُدرجة فقط في آخر مزامنة)
     */
    private function saveNewAttendanceCount($count) {
        try {
            $upd = $this->pdo->prepare("UPDATE system_variables SET variable_value = ? WHERE variable_key = 'fingerprint_integration_new_attendance_count'");
            $upd->execute([(string)(int)$count]);
            if ($upd->rowCount() === 0) {
                $ins = $this->pdo->prepare("INSERT INTO system_variables (variable_key, variable_value, is_active) VALUES ('fingerprint_integration_new_attendance_count', ?, 1)");
                $ins->execute([(string)(int)$count]);
            }
        } catch (Exception $e) {
            error_log("fingerprint_integration: saveNewAttendanceCount failed: " . $e->getMessage());
        }
    }

    /**
     * فحص التطابق بين الجداول وإرجاع إحصائيات للواجهة
     */
    public function checkIntegration() {
        try {
            $results = [];
            $results['connection_status'] = 'connected';

            // إجمالي الموظفين
            $stmt = $this->pdo->query("SELECT COUNT(*) FROM employees");
            $results['total_employees'] = (int) $stmt->fetchColumn();

            // الموظفين المزامنين (لديهم AC-No. مطابق لسجل في البصمة)
            $stmt = $this->pdo->query("
                SELECT COUNT(DISTINCT e.id) FROM employees e
                INNER JOIN fingerprint_attendance fa ON e.`AC-No.` = fa.ac_no
            ");
            $results['synced_employees'] = (int) $stmt->fetchColumn();

            // الموظفين الجدد: فقط من هم في ملف البصمة وغير موجودين في employees (لم يُضافوا بعد)
            $stmt = $this->pdo->query("
                SELECT COUNT(DISTINCT fa.ac_no) FROM fingerprint_attendance fa
                WHERE fa.ac_no NOT IN (
                    SELECT e.`AC-No.` FROM employees e
                    WHERE e.`AC-No.` IS NOT NULL AND TRIM(e.`AC-No.`) != ''
                )
            ");
            $results['new_employees'] = (int) $stmt->fetchColumn();

            // سجلات الحضور لليوم
            $stmt = $this->pdo->query("SELECT COUNT(*) FROM attendance_logs WHERE attendance_date = CURDATE()");
            $results['attendance_records'] = (int) $stmt->fetchColumn();

            // سجلات الحضور الجديدة: فقط ما تم إدراجه في آخر مزامنة (تواريخ/موظفين لم تكن في attendance_logs)
            $results['new_attendance'] = 0;
            try {
                $stmt = $this->pdo->prepare("SELECT variable_value FROM system_variables WHERE variable_key = 'fingerprint_integration_new_attendance_count' AND is_active = 1 LIMIT 1");
                $stmt->execute();
                $val = $stmt->fetchColumn();
                if ($val !== false && $val !== null && $val !== '') {
                    $results['new_attendance'] = (int) $val;
                }
            } catch (Exception $e) { /* ignore */ }

            // آخر مزامنة (من system_variables أو من آخر تحديث لسجل مزامن في attendance_logs)
            $lastSync = null;
            try {
                $stmt = $this->pdo->prepare("SELECT variable_value FROM system_variables WHERE variable_key = 'fingerprint_integration_last_sync' AND is_active = 1 LIMIT 1");
                $stmt->execute();
                $lastSync = $stmt->fetchColumn();
            } catch (Exception $e) { /* ignore */ }
            if (empty($lastSync)) {
                $stmt = $this->pdo->query("
                    SELECT MAX(updated_at) FROM attendance_logs
                    WHERE notes LIKE '%مزامن من البصمة%' OR notes LIKE '%مزامن من البصمة - تفصيلي%'
                ");
                $lastSync = $stmt->fetchColumn();
            }
            if ($lastSync) {
                try {
                    $dt = new DateTime($lastSync);
                    $results['last_sync'] = $dt->format('Y-m-d H:i');
                } catch (Exception $e) {
                    $results['last_sync'] = $lastSync;
                }
            } else {
                $results['last_sync'] = 'لم يتم منذ آخر تحديث';
            }

            // إجمالي الحضور وإجمالي البصمة (للتوافق مع أي استخدام آخر)
            $stmt = $this->pdo->query("SELECT COUNT(*) FROM attendance_logs");
            $results['total_attendance'] = (int) $stmt->fetchColumn();
            $stmt = $this->pdo->query("SELECT COUNT(*) FROM fingerprint_attendance");
            $results['total_fingerprint'] = (int) $stmt->fetchColumn();

            // فحص الموظفين غير المطابقين (ac_no في البصمة ولا يوجد موظف بنفس AC-No.)
            $stmt = $this->pdo->query("
                SELECT DISTINCT fa.ac_no, fa.employee_name, fa.department
                FROM fingerprint_attendance fa
                WHERE fa.ac_no NOT IN (SELECT e.`AC-No.` FROM employees e WHERE e.`AC-No.` IS NOT NULL AND e.`AC-No.` != '')
            ");
            $results['unmatched_employees'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $stmt = $this->pdo->query("
                SELECT COUNT(*) FROM fingerprint_attendance fa
                LEFT JOIN employees e ON fa.ac_no = e.`AC-No.`
                WHERE e.id IS NOT NULL
                AND NOT EXISTS (
                    SELECT 1 FROM attendance_logs al
                    WHERE al.employee_id = e.id AND al.attendance_date = fa.attendance_date
                )
            ");
            $results['unmatched_attendance'] = (int) $stmt->fetchColumn();

            $pendingFilter = $this->pendingSyncSql('fa', true);
            $stmt = $this->pdo->query("
                SELECT COUNT(DISTINCT CONCAT(fa.ac_no, '_', fa.attendance_date))
                FROM fingerprint_attendance fa
                INNER JOIN employees e ON fa.ac_no = e.`AC-No.`
                WHERE {$pendingFilter}
            ");
            $results['pending_sync_days'] = (int) $stmt->fetchColumn();

            return [
                'success' => true,
                'message' => 'تم فحص التكامل بنجاح',
                'results' => $results
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'خطأ في فحص التكامل: ' . $e->getMessage()
            ];
        }
    }
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    $integration = new FingerprintSystemIntegration($pdo);
    
    switch ($action) {
        case 'sync_employees':
            $result = $integration->syncEmployees();
            echo json_encode($result);
            break;
            
        case 'sync_attendance':
            $full = !empty($input['full']);
            $result = $integration->syncAttendance(!$full);
            echo json_encode($result);
            break;

        case 'sync_attendance_changes':
        case 'sync_attendance_detailed':
            $full = !empty($input['full']);
            $result = $integration->syncAttendanceDetailed(!$full);
            echo json_encode($result);
            break;

        case 'sync_attendance_full':
            $result = $integration->syncAttendanceDetailed(false);
            echo json_encode($result);
            break;
            
        case 'check_integration':
            $result = $integration->checkIntegration();
            echo json_encode($result);
            break;
            
        case 'full_sync':
            $employeeResult = $integration->syncEmployees();
            $attendanceResult = $integration->syncAttendanceDetailed(true);

            $fullMessage = 'تمت مزامنة الموظفين والتغييرات بنجاح';
            if (!empty($attendanceResult['recompute']['applied'])) {
                $fullMessage .= sprintf(
                    ' | إعادة احتساب شامل: %d سجل (%s → %s)',
                    (int)$attendanceResult['recompute']['updated_records'],
                    $attendanceResult['recompute']['start_date'],
                    $attendanceResult['recompute']['end_date']
                );
            }

            echo json_encode([
                'success' => true,
                'message' => $fullMessage,
                'employees' => $employeeResult,
                'attendance' => $attendanceResult
            ]);
            break;

        case 'full_resync_attendance':
            $result = $integration->fullResyncAttendance();
            echo json_encode($result);
            break;
            
        default:
            throw new Exception('إجراء غير صحيح');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في تكامل نظام البصمة: ' . $e->getMessage()
    ]);
}
?>

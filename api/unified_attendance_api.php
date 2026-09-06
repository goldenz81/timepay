<?php
// تعطيل عرض الأخطاء لتجنب إرسال HTML قبل JSON
error_reporting(0);
ini_set('display_errors', 0);

require_once 'cors_headers.php';
require_once 'config_unified.php';

// دالة حساب ساعات التأخير باستخدام المعادلات الديناميكية
function calculateLateHoursDynamic($attendance, $pdo) {
    // جلب متغيرات النظام
    $stmt = $pdo->prepare("SELECT variable_key, variable_value FROM system_variables WHERE is_active = 1");
    $stmt->execute();
    $systemVariables = [];
    while ($row = $stmt->fetch()) {
        $systemVariables[$row['variable_key']] = $row['variable_value'];
    }
    
    // جلب المعادلات
    $stmt = $pdo->prepare("SELECT formula_key, formula_expression FROM dynamic_formulas WHERE is_active = 1 AND formula_type = 'calculation'");
    $stmt->execute();
    $formulas = [];
    while ($row = $stmt->fetch()) {
        $formulas[$row['formula_key']] = $row['formula_expression'];
    }
    
    foreach ($attendance as &$record) {
        // إعداد المتغيرات للحساب - استخدام القيم المحسوبة ديناميكياً
        $variables = array_merge($systemVariables, [
            'late_minutes' => $record['late_minutes_calculated'] ?? 0,
            'grace_period_late_minutes' => $record['grace_period_late_minutes'] ?? 0
        ]);
        
        // حساب ساعات التأخير العادي
        if (isset($formulas['late_hours_calculation'])) {
            $record['late_hours_calculated'] = evaluateFormula($formulas['late_hours_calculation'], $variables);
        }
        
        // حساب ساعات التأخير مع فترة السماح
        if (isset($formulas['grace_period_late_hours_calculation'])) {
            $record['grace_period_late_hours_calculated'] = evaluateFormula($formulas['grace_period_late_hours_calculation'], $variables);
        }
    }
    
    return $attendance;
}

// دالة تقييم المعادلة
function evaluateFormula($formula, $variables) {
    // استبدال المتغيرات في المعادلة - ترتيب حسب طول الاسم لتجنب استبدال جزئي
    $sortedKeys = array_keys($variables);
    usort($sortedKeys, function($a, $b) {
        return strlen($b) - strlen($a);
    });
    
    foreach ($sortedKeys as $key) {
        $value = $variables[$key];
        $formula = str_replace($key, $value, $formula);
    }
    
    // تقييم المعادلة
    try {
        $result = eval("return $formula;");
        return is_numeric($result) ? floatval($result) : 0;
    } catch (Exception $e) {
        error_log("Error evaluating formula: $formula - " . $e->getMessage());
        return 0;
    }
}

// دالة لحساب ساعات العمل والإضافي بناءً على وقتي الحضور والانصراف ومتغيرات النظام
function computeWorkAndOvertime($pdo, $attendanceDate, $checkIn, $checkOut, $isHoliday) {
	if (empty($attendanceDate) || empty($checkIn) || empty($checkOut)) {
		return [0.0, 0.0];
	}

	$stmt = $pdo->prepare("SELECT variable_key, variable_value FROM system_variables WHERE variable_key IN ('official_start_time','official_end_time','overtime_start_grace_minutes') AND is_active = 1");
	$stmt->execute();
	$vars = [];
	while ($row = $stmt->fetch()) {
		$vars[$row['variable_key']] = $row['variable_value'];
	}

	$officialStartTime = $vars['official_start_time'] ?? '08:30:00';
	$officialEndTime = $vars['official_end_time'] ?? '18:30:00';
	$overtimeGraceMinutes = isset($vars['overtime_start_grace_minutes']) ? max(0, (int)$vars['overtime_start_grace_minutes']) : 15;

	$tsCheckIn = strtotime($attendanceDate . ' ' . $checkIn);
	$tsCheckOut = strtotime($attendanceDate . ' ' . $checkOut);
	$tsOfficialStart = strtotime($attendanceDate . ' ' . $officialStartTime);
	$tsOfficialEnd = strtotime($attendanceDate . ' ' . $officialEndTime);

	if ($tsCheckIn === false || $tsCheckOut === false || $tsCheckOut <= $tsCheckIn) {
		return [0.0, 0.0];
	}

	$workedMinutes = max(0, (int)round(($tsCheckOut - $tsCheckIn) / 60));
	$regularMinutes = max(0, (int)round(($tsOfficialEnd - $tsOfficialStart) / 60));
	if ((int)$isHoliday === 1) {
		$overtimeMinutes = $workedMinutes;
	} else {
		$secondsAfterOfficialEnd = $tsCheckOut - $tsOfficialEnd;
		$graceThresholdSeconds = max(0, $overtimeGraceMinutes) * 60;
		if ($secondsAfterOfficialEnd <= 0 || $secondsAfterOfficialEnd < $graceThresholdSeconds) {
			$overtimeMinutes = 0;
		} else {
			$overtimeMinutes = max(0, (int)round($secondsAfterOfficialEnd / 60));
		}
	}

	$workHours = round($workedMinutes / 60, 2);
	$overtimeHours = round($overtimeMinutes / 60, 2);

	return [$workHours, $overtimeHours];
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? '';
    
    switch ($action) {
        case 'get_attendance':
            $employeeId = $input['employee_id'] ?? $_GET['employee_id'] ?? '';
            $period = $input['period'] ?? $_GET['period'] ?? date('Y-m');
            
            // Get system variables
            $stmt = $pdo->prepare("SELECT variable_key, variable_value FROM system_variables WHERE variable_key IN ('grace_period', 'official_start_time') AND is_active = 1");
            $stmt->execute();
            $systemVars = [];
            while ($row = $stmt->fetch()) {
                $systemVars[$row['variable_key']] = $row['variable_value'];
            }
            
            $gracePeriod = $systemVars['grace_period'] ?? 15; // Default 15 minutes
            $officialStartTime = $systemVars['official_start_time'] ?? '08:30:00'; // Default 08:30:00
            
            if ($employeeId) {
                $stmt = $pdo->prepare("
                    SELECT a.*, e.name as employee_name, e.name_ar, e.employee_code, 
                           e.salary_type, e.department, e.cost_center,
                           CASE 
                               WHEN a.check_in IS NOT NULL AND a.check_out IS NOT NULL AND TIME(a.check_in) > ? 
                               THEN TIMESTAMPDIFF(MINUTE, ?, TIME(a.check_in))
                               ELSE 0 
                           END as late_minutes_calculated,
                           CASE 
                               WHEN a.check_in IS NOT NULL AND a.check_out IS NOT NULL AND TIME(a.check_in) > ADDTIME(?, CONCAT('00:', ?, ':00')) 
                               THEN TIMESTAMPDIFF(MINUTE, ADDTIME(?, CONCAT('00:', ?, ':00')), TIME(a.check_in))
                               ELSE 0 
                           END as grace_period_late_minutes
                    FROM attendance_logs a
                    JOIN employees e ON a.employee_id = e.id
                    WHERE a.employee_id = ? 
                    AND DATE_FORMAT(a.attendance_date, '%Y-%m') = ?
                    ORDER BY a.attendance_date DESC
                ");
                $stmt->execute([$officialStartTime, $officialStartTime, $officialStartTime, $gracePeriod, $officialStartTime, $gracePeriod, $employeeId, $period]);
            } else {
                $stmt = $pdo->prepare("
                    SELECT a.*, e.name as employee_name, e.name_ar, e.employee_code,
                           e.salary_type, e.department, e.cost_center,
                           cc.color as cost_center_color,
                           CASE 
                               WHEN a.check_in IS NOT NULL AND a.check_out IS NOT NULL AND TIME(a.check_in) > ? 
                               THEN TIMESTAMPDIFF(MINUTE, ?, TIME(a.check_in))
                               ELSE 0 
                           END as late_minutes_calculated,
                           CASE 
                               WHEN a.check_in IS NOT NULL AND a.check_out IS NOT NULL AND TIME(a.check_in) > ADDTIME(?, CONCAT('00:', ?, ':00')) 
                               THEN TIMESTAMPDIFF(MINUTE, ADDTIME(?, CONCAT('00:', ?, ':00')), TIME(a.check_in))
                               ELSE 0 
                           END as grace_period_late_minutes
                    FROM attendance_logs a
                    JOIN employees e ON a.employee_id = e.id
                    LEFT JOIN cost_centers cc ON e.cost_center = cc.name
                    WHERE DATE_FORMAT(a.attendance_date, '%Y-%m') = ?
                    ORDER BY a.attendance_date DESC, e.name
                ");
                $stmt->execute([$officialStartTime, $officialStartTime, $officialStartTime, $gracePeriod, $officialStartTime, $gracePeriod, $period]);
            }
            
            $attendance = $stmt->fetchAll();

            error_log("بدء إعادة حساب ساعات العمل لـ " . count($attendance) . " سجل");

            // إعادة حساب ساعات العمل وغيرها تلقائياً لجميع السجلات (خاصة سجلات البصمة)
            foreach ($attendance as &$record) {
                error_log("معالجة سجل ID {$record['id']}: check_in='{$record['check_in']}', check_out='{$record['check_out']}', work_hours={$record['work_hours']}, is_holiday=" . ($record['is_holiday'] ?? 0));
                $needsUpdate = false;

                // إعادة حساب ساعات العمل والإضافي
                if (!empty($record['check_in']) && !empty($record['check_out'])) {
                    error_log("حساب ساعات العمل لسجل ID {$record['id']}: date={$record['attendance_date']}, check_in={$record['check_in']}, check_out={$record['check_out']}");
                    list($workH, $overtimeH) = computeWorkAndOvertime($pdo, $record['attendance_date'], $record['check_in'], $record['check_out'], $record['is_holiday'] ?? 0);
                    error_log("نتيجة الحساب: work_hours=$workH, overtime_hours=$overtimeH");

                    if ($record['work_hours'] != $workH || $record['overtime_hours'] != $overtimeH) {
                        error_log("تحتاج للتحديث: old_work={$record['work_hours']}, new_work=$workH");
                        $record['work_hours'] = $workH;
                        $record['overtime_hours'] = $overtimeH;
                        $needsUpdate = true;
                    } else {
                        error_log("لا يحتاج للتحديث");
                    }
                } else {
                    error_log("لا يمكن حساب ساعات العمل - check_in أو check_out فارغ");
                }

                // إعادة حساب دقائق التأخير (لا يُحتسب تأخير ولا غرامات في أيام العطل — الحضور اختياري)
                $isHolidayRecord = !empty($record['is_holiday']) && ($record['is_holiday'] == 1 || $record['is_holiday'] === true || $record['is_holiday'] === '1');
                if ($isHolidayRecord) {
                    if ((int)($record['late_minutes'] ?? 0) !== 0 || (int)($record['grace_period_late_minutes'] ?? 0) !== 0) {
                        $record['late_minutes'] = 0;
                        $record['grace_period_late_minutes'] = 0;
                        $needsUpdate = true;
                    }
                } elseif (!empty($record['check_in'])) {
                    $gracePeriod = $systemVars['grace_period'] ?? 15;
                    $officialStartTime = $systemVars['official_start_time'] ?? '08:30:00';

                    // حساب التأخير العادي
                    $checkInTime = strtotime($record['check_in']);
                    $officialStart = strtotime($officialStartTime);
                    $lateMinutes = 0;
                    if ($checkInTime > $officialStart) {
                        $lateMinutes = floor(($checkInTime - $officialStart) / 60);
                    }

                    // حساب التأخير مع فترة السماح
                    $graceTime = strtotime($officialStartTime . ' +' . $gracePeriod . ' minutes');
                    $graceLateMinutes = 0;
                    if ($checkInTime > $graceTime) {
                        $graceLateMinutes = floor(($checkInTime - $graceTime) / 60);
                    }

                    if ($record['late_minutes'] != $lateMinutes || $record['grace_period_late_minutes'] != $graceLateMinutes) {
                        $record['late_minutes'] = $lateMinutes;
                        $record['grace_period_late_minutes'] = $graceLateMinutes;
                        $needsUpdate = true;
                    }
                }

                // تحديث قاعدة البيانات إذا لزم الأمر
                if ($needsUpdate) {
                    error_log("تحديث سجل ID {$record['id']}: work_hours={$record['work_hours']}, overtime_hours={$record['overtime_hours']}, late_minutes={$record['late_minutes']}");
                    $updateStmt = $pdo->prepare("
                        UPDATE attendance_logs
                        SET work_hours = ?, overtime_hours = ?, late_minutes = ?, updated_at = NOW()
                        WHERE id = ?
                    ");
                    $result = $updateStmt->execute([
                        $record['work_hours'],
                        $record['overtime_hours'],
                        $record['late_minutes'],
                        $record['id']
                    ]);
                    if ($result) {
                        error_log("تم تحديث سجل ID {$record['id']} بنجاح");
                    } else {
                        error_log("فشل في تحديث سجل ID {$record['id']}");
                    }
                }
            }

            // Calculate late hours using dynamic formulas
            $attendance = calculateLateHoursDynamic($attendance, $pdo);

            echo json_encode(['success' => true, 'data' => $attendance], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'add_attendance':
            $data = $input['attendance_data'] ?? [];
            $requiredFields = ['employee_id', 'attendance_date'];
            
            foreach ($requiredFields as $field) {
                if (empty($data[$field])) {
                    throw new Exception("الحقل $field مطلوب");
                }
            }
            
            // Get weekend_day variable to determine if this is a holiday
            $weekendStmt = $pdo->prepare("SELECT variable_value FROM system_variables WHERE variable_key = 'weekend_day' AND is_active = 1");
            $weekendStmt->execute();
            $weekendDay = $weekendStmt->fetchColumn();
            
            if (!$weekendDay) {
                $weekendDay = 'Friday'; // Default to Friday
            }
            
            // Check if the attendance date is a weekend day
            $attendanceDate = $data['attendance_date'];
            $dayName = date('l', strtotime($attendanceDate)); // Get day name (e.g., 'Friday')
            $isHoliday = ($dayName === $weekendDay) ? 1 : 0;
            
            // If user explicitly set is_holiday, use that value, otherwise use auto-detection
            $finalIsHoliday = isset($data['is_holiday']) ? ($data['is_holiday'] ? 1 : 0) : $isHoliday;

            // Recompute work_hours and overtime_hours when check_in/check_out provided
            $calcWorkHours = $data['work_hours'] ?? null;
            $calcOvertimeHours = $data['overtime_hours'] ?? null;
            if (!empty($data['check_in']) && !empty($data['check_out'])) {
                list($wH, $otH) = computeWorkAndOvertime($pdo, $attendanceDate, $data['check_in'], $data['check_out'], $finalIsHoliday);
                $calcWorkHours = $wH;
                $calcOvertimeHours = $otH;
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO attendance_logs 
                (employee_id, attendance_date, check_in, check_out, work_hours, 
                 overtime_hours, late_minutes, early_leave_minutes, status, is_holiday, is_excused, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                check_in = VALUES(check_in),
                check_out = VALUES(check_out),
                work_hours = VALUES(work_hours),
                overtime_hours = VALUES(overtime_hours),
                late_minutes = VALUES(late_minutes),
                early_leave_minutes = VALUES(early_leave_minutes),
                status = VALUES(status),
                is_holiday = VALUES(is_holiday),
                is_excused = VALUES(is_excused),
                notes = VALUES(notes),
                updated_at = CURRENT_TIMESTAMP
            ");
            
            // في أيام العطل لا يُحتسب تأخير ولا غرامات
            $lateMinutesToSave = $finalIsHoliday ? 0 : ($data['late_minutes'] ?? 0);
            $stmt->execute([
                $data['employee_id'],
                $data['attendance_date'],
                $data['check_in'] ?? null,
                $data['check_out'] ?? null,
                $calcWorkHours ?? 0,
                $calcOvertimeHours ?? 0,
                $lateMinutesToSave,
                $data['early_leave_minutes'] ?? 0,
                $data['status'] ?? 'present',
                $finalIsHoliday,
                $data['is_excused'] ? 1 : 0,
                $data['notes'] ?? null
            ]);
            
            $message = 'تم إضافة/تحديث سجل الحضور بنجاح';
            if ($finalIsHoliday) {
                $message .= " (تم تحديده كعطلة رسمية - $weekendDay)";
            }
            
            echo json_encode(['success' => true, 'message' => $message], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'update_attendance':
            $attendanceId = $input['id'] ?? $input['attendance_id'] ?? '';
            $data = $input['attendance_data'] ?? $input;
            
            if (!$attendanceId) {
                throw new Exception('معرف سجل الحضور مطلوب');
            }
            
            $fields = [];
            $values = [];
            
            foreach ($data as $key => $value) {
                if (in_array($key, ['check_in', 'check_out', 'work_hours', 'overtime_hours', 
                                   'late_minutes', 'early_leave_minutes', 'status', 'is_holiday', 'is_excused', 'notes', 'transport_allowance'])) {
                    $fields[] = "$key = ?";
                    // تحويل القيم المنطقية إلى أرقام
                    if ($key === 'is_holiday' || $key === 'is_excused') {
                        $values[] = $value ? 1 : 0;
                    } else {
                        $values[] = $value;
                    }
                }
            }
            
            if (empty($fields)) {
                throw new Exception('لا توجد بيانات للتحديث');
            }

            // في أيام العطل لا يُحتسب تأخير — عند التحديث إلى عطلة نُصفّر دقائق التأخير
            if (array_key_exists('is_holiday', $data) && $data['is_holiday']) {
                $lateIdx = array_search('late_minutes = ?', $fields);
                if ($lateIdx !== false) {
                    $values[$lateIdx] = 0;
                } else {
                    $fields[] = 'late_minutes = ?';
                    $values[] = 0;
                }
            }
            
            // If timing or holiday changed, recompute work_hours and overtime_hours
            $recalc = (array_key_exists('check_in', $data) || array_key_exists('check_out', $data) || array_key_exists('is_holiday', $data));
            if ($recalc) {
                $stmtCur = $pdo->prepare("SELECT attendance_date, check_in, check_out, is_holiday FROM attendance_logs WHERE id = ?");
                $stmtCur->execute([$attendanceId]);
                $cur = $stmtCur->fetch();
                if ($cur) {
                    $attendanceDate = $cur['attendance_date'];
                    $useCheckIn = array_key_exists('check_in', $data) ? ($data['check_in'] ?? $cur['check_in']) : $cur['check_in'];
                    $useCheckOut = array_key_exists('check_out', $data) ? ($data['check_out'] ?? $cur['check_out']) : $cur['check_out'];
                    $useIsHoliday = array_key_exists('is_holiday', $data) ? ($data['is_holiday'] ? 1 : 0) : (int)$cur['is_holiday'];
                    if (!empty($useCheckIn) && !empty($useCheckOut)) {
                        list($wH, $otH) = computeWorkAndOvertime($pdo, $attendanceDate, $useCheckIn, $useCheckOut, $useIsHoliday);
                        $fields[] = 'work_hours = ?';
                        $values[] = $wH;
                        $fields[] = 'overtime_hours = ?';
                        $values[] = $otH;
                    }
                }
            }

            $values[] = $attendanceId;
            
            $stmt = $pdo->prepare("UPDATE attendance_logs SET " . implode(', ', $fields) . " WHERE id = ?");
            $stmt->execute($values);
            
            echo json_encode(['success' => true, 'message' => 'تم تحديث سجل الحضور بنجاح'], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'delete_attendance':
            $attendanceId = $input['attendance_id'] ?? '';
            
            if (!$attendanceId) {
                throw new Exception('معرف سجل الحضور مطلوب');
            }
            
            $stmt = $pdo->prepare("DELETE FROM attendance_logs WHERE id = ?");
            $stmt->execute([$attendanceId]);
            
            echo json_encode(['success' => true, 'message' => 'تم حذف سجل الحضور بنجاح'], JSON_UNESCAPED_UNICODE);
            break;

        case 'bulk_update_attendance':
            $recordIds = $input['record_ids'] ?? [];
            $field = $input['field'] ?? '';
            $value = trim($input['value'] ?? '');
            if (!in_array($field, ['check_in', 'check_out']) || $value === '' || empty($recordIds) || !is_array($recordIds)) {
                throw new Exception('معرفات السجلات وحقل التحديث (check_in أو check_out) والوقت مطلوبة');
            }
            if (preg_match('/^\d{1,2}:\d{2}$/', $value)) {
                $value .= ':00';
            }
            if (!preg_match('/^\d{1,2}:\d{2}:\d{2}$/', $value)) {
                throw new Exception('تنسيق الوقت غير صالح (مثال: 08:30 أو 08:30:00)');
            }
            $updated = 0;
            $stmtCur = $pdo->prepare("SELECT id, attendance_date, check_in, check_out, is_holiday FROM attendance_logs WHERE id = ?");
            foreach ($recordIds as $id) {
                $id = (int) $id;
                if ($id <= 0) continue;
                $stmtCur->execute([$id]);
                $cur = $stmtCur->fetch(PDO::FETCH_ASSOC);
                if (!$cur) continue;
                $attendanceDate = $cur['attendance_date'];
                $checkIn = $field === 'check_in' ? $value : ($cur['check_in'] ?? '');
                $checkOut = $field === 'check_out' ? $value : ($cur['check_out'] ?? '');
                $isHoliday = (int)($cur['is_holiday'] ?? 0);
                if ($checkIn !== '' && $checkOut !== '') {
                    list($wH, $otH) = computeWorkAndOvertime($pdo, $attendanceDate, $checkIn, $checkOut, $isHoliday);
                    $stmtUpd = $pdo->prepare("UPDATE attendance_logs SET " . $field . " = ?, work_hours = ?, overtime_hours = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                    $stmtUpd->execute([$value, $wH, $otH, $id]);
                } else {
                    $stmtUpd = $pdo->prepare("UPDATE attendance_logs SET " . $field . " = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                    $stmtUpd->execute([$value, $id]);
                }
                $updated++;
            }
            echo json_encode(['success' => true, 'message' => 'تم تحديث ' . $updated . ' سجل بنجاح', 'updated' => $updated], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_attendance_summary':
            $period = $input['period'] ?? $_GET['period'] ?? date('Y-m');
            
            // حساب عدد أيام العمل المتوقعة حسب نوع الراتب
            $year = substr($period, 0, 4);
            $month = substr($period, 5, 2);
            $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $month, $year);
            
            // حساب أيام العمل المتوقعة (استبعاد الجمعة والسبت)
            $expectedWorkDays = 0;
            for ($day = 1; $day <= $daysInMonth; $day++) {
                $date = "$year-$month-" . str_pad($day, 2, '0', STR_PAD_LEFT);
                $dayOfWeek = date('N', strtotime($date)); // 1=Monday, 7=Sunday
                if ($dayOfWeek >= 1 && $dayOfWeek <= 6) { // Monday to Saturday
                    $expectedWorkDays++;
                }
            }
            
            $stmt = $pdo->prepare("
                SELECT 
                    e.id,
                    e.name,
                    e.employee_code,
                    e.salary_type,
                    COUNT(a.id) as actual_days,
                    CASE 
                        WHEN e.salary_type = 'Weekly' THEN 
                            LEAST(COUNT(a.id), 6) -- أسبوعي: أقصى 6 أيام
                        WHEN e.salary_type = 'Monthly' THEN 
                            LEAST(COUNT(a.id), ?) -- شهري: أقصى عدد أيام العمل في الشهر
                        ELSE COUNT(a.id)
                    END as total_days,
                    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
                    SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
                    SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days,
                    SUM(a.work_hours) as total_work_hours,
                    SUM(a.overtime_hours) as total_overtime_hours,
                    SUM(CASE WHEN a.is_holiday = 1 THEN a.overtime_hours ELSE 0 END) as holiday_overtime_hours,
                    SUM(CASE WHEN a.is_holiday = 0 THEN a.overtime_hours ELSE 0 END) as regular_overtime_hours,
                    SUM(a.late_minutes) as total_late_minutes
                FROM employees e
                LEFT JOIN attendance_logs a ON e.id = a.employee_id 
                    AND DATE_FORMAT(a.attendance_date, '%Y-%m') = ?
                WHERE e.status = 'active'
                GROUP BY e.id, e.name, e.employee_code, e.salary_type
                ORDER BY e.name
            ");
            $stmt->execute([$expectedWorkDays, $period]);
            
            $summary = $stmt->fetchAll();
            echo json_encode(['success' => true, 'data' => $summary], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_employee_monthly_records':
            $employeeId = $input['employee_id'] ?? '';
            $fromDate = $input['from_date'] ?? '';
            $toDate = $input['to_date'] ?? '';
            
            if (empty($employeeId) || empty($fromDate) || empty($toDate)) {
                throw new Exception('معرف الموظف وتواريخ البداية والنهاية مطلوبة');
            }
            
            $stmt = $pdo->prepare("
                SELECT a.*, e.name as employee_name, e.name_ar, e.employee_code
                FROM attendance_logs a
                JOIN employees e ON a.employee_id = e.id
                WHERE a.employee_id = ? 
                AND DATE(a.attendance_date) >= ? 
                AND DATE(a.attendance_date) <= ?
                ORDER BY a.attendance_date DESC
            ");
            $stmt->execute([$employeeId, $fromDate, $toDate]);
            
            $records = $stmt->fetchAll();
            echo json_encode(['success' => true, 'records' => $records], JSON_UNESCAPED_UNICODE);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'إجراء غير معروف'], JSON_UNESCAPED_UNICODE);
            break;
    }
    
} catch (Exception $e) {
    // التأكد من عدم وجود output قبل JSON
    if (ob_get_level()) {
        ob_clean();
    }
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (Error $e) {
    // معالجة PHP Fatal Errors
    if (ob_get_level()) {
        ob_clean();
    }
    echo json_encode(['success' => false, 'message' => 'خطأ في النظام: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>

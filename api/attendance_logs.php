<?php
// تضمين ملف CORS المشترك
require_once 'cors_headers.php';

// تضمين config للوصول إلى $pdo للدوال المساعدة
require_once 'config.php';
require_once 'attendance_absence_helpers.php';
require_once 'feature_flags.php';

// التأكد من أن هذا الملف هو الملف الرئيسي (غير مضمن)
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    try {
        switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            // عدّ سجلات الحضور الناقصة (حضور بدون انصراف أو العكس) لموظفي الراتب الأسبوعي ضمن فترة — لمنع طباعة/تصدير الأجر دون إصلاحها
            if (isset($_GET['start_date'], $_GET['end_date']) && isset($_GET['count_incomplete_weekly']) && $_GET['count_incomplete_weekly'] === '1') {
                $startDate = $_GET['start_date'];
                $endDate = $_GET['end_date'];
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
                    header('Content-Type: application/json; charset=utf-8');
                    echo json_encode(['success' => false, 'message' => 'تواريخ غير صالحة']);
                    break;
                }
                $sql = "
                    SELECT COUNT(*) AS cnt
                    FROM attendance_logs al
                    INNER JOIN employees e ON e.id = al.employee_id AND e.salary_type = 'Weekly'
                    WHERE al.attendance_date BETWEEN ? AND ?
                    AND (
                        (
                            al.check_in IS NOT NULL AND TRIM(al.check_in) <> ''
                            AND al.check_in NOT IN ('00:00', '00:00:00')
                            AND (
                                al.check_out IS NULL OR TRIM(COALESCE(al.check_out, '')) = ''
                                OR al.check_out IN ('00:00', '00:00:00')
                            )
                        )
                        OR (
                            al.check_out IS NOT NULL AND TRIM(al.check_out) <> ''
                            AND al.check_out NOT IN ('00:00', '00:00:00')
                            AND (
                                al.check_in IS NULL OR TRIM(COALESCE(al.check_in, '')) = ''
                                OR al.check_in IN ('00:00', '00:00:00')
                            )
                        )
                    )
                ";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$startDate, $endDate]);
                $cntRow = $stmt->fetch(PDO::FETCH_ASSOC);
                $cnt = (int)($cntRow['cnt'] ?? 0);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode(['success' => true, 'incomplete_count' => $cnt]);
                break;
            }
            // استرجاع سجلات الحضور
            if (isset($_GET['employee_id']) && isset($_GET['start_date']) && isset($_GET['end_date'])) {
                // البحث حسب الموظف والتاريخ
                $employeeId = $_GET['employee_id'];
                $startDate = $_GET['start_date'];
                $endDate = $_GET['end_date'];
                
                                 $stmt = $pdo->prepare("
                     SELECT 
                         al.*,
                         e.name as employee_name,
                         e.employee_code,
                         e.department,
                         e.cost_center,
                         e.salary_type
                     FROM attendance_logs al
                     JOIN employees e ON al.employee_id = e.id
                     WHERE al.employee_id = ? AND al.attendance_date BETWEEN ? AND ?
                     ORDER BY al.attendance_date ASC
                 ");
                
                $stmt->execute([$employeeId, $startDate, $endDate]);
                $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } else {
                // جلب جميع سجلات الحضور من كلا الجدولين (الوضع الافتراضي)
                $stmt = $pdo->prepare("
                    SELECT 
                        al.id,
                        al.employee_id,
                        e.name as Name,
                        e.name_ar,
                        e.employee_code,
                        e.department,
                        d.description as department_description,
                        e.cost_center,
                        cc.color as cost_center_color,
                        e.salary_type,
                        al.attendance_date,
                        al.check_in as check_in_time,
                        al.check_out as check_out_time,
                        al.work_hours as total_hours,
                        al.overtime_hours,
                        al.status,
                        al.notes,
                        'manual' as source_type,
                        al.created_at,
                        al.late_minutes,
                        al.early_leave_minutes,
                        al.is_holiday,
                        al.is_excused,
                        al.transport_allowance
                    FROM attendance_logs al
                    LEFT JOIN employees e ON al.employee_id = e.id
                    LEFT JOIN departments d ON e.department = d.name
                    LEFT JOIN cost_centers cc ON e.cost_center = cc.name
                    ORDER BY al.attendance_date DESC, al.id DESC
                    LIMIT 1000
                ");
                $stmt->execute();
                $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // إلحاق حقول الغرامة + إعادة احتساب ساعات العمل/الإضافي ديناميكياً حسب متغيرات النظام الحالية
                // - في أيام العطلات الرسمية: لا تحسب غرامة التأخير
                // - إذا كان بإذن: تحسب التأخير بدون مضاعفات (ساعة بساعة، نصف ساعة بنصف ساعة)
                // - بدون إذن: تحسب التأخير بالمضاعفات (ساعة بساعتين، نصف ساعة بساعة)
                $records = array_map(function($r) use ($pdo) {
                    $isHoliday = !empty($r['is_holiday']) ? (int)$r['is_holiday'] : 0;
                    $isExcused = !empty($r['is_excused']) ? (int)$r['is_excused'] : 0;

                    // إعادة احتساب ساعات العمل والإضافي في العرض حتى تعكس آخر إعدادات النظام
                    $checkInTime = $r['check_in_time'] ?? $r['check_in'] ?? null;
                    $checkOutTime = $r['check_out_time'] ?? $r['check_out'] ?? null;
                    $attendanceDate = $r['attendance_date'] ?? null;
                    $hasValidCheckIn = !empty($checkInTime) && $checkInTime !== '00:00' && $checkInTime !== '00:00:00';
                    $hasValidCheckOut = !empty($checkOutTime) && $checkOutTime !== '00:00' && $checkOutTime !== '00:00:00';
                    $isIncomplete = ($hasValidCheckIn xor $hasValidCheckOut) ? 1 : 0;
                    $r['is_incomplete'] = $isIncomplete;
                    if (!empty($attendanceDate) && $hasValidCheckIn && $hasValidCheckOut) {
                        $workHours = calculateHours($checkInTime, $checkOutTime, $attendanceDate, (bool)$isHoliday);
                        if ($isHoliday) {
                            $overtimeHours = $workHours;
                        } else {
                            $overtimeHours = calculateOvertimeHoursFromCheckOut($attendanceDate, $checkOutTime, 0, $checkInTime, $workHours);
                        }
                        $r['total_hours'] = $workHours;
                        $r['work_hours'] = $workHours;
                        $r['overtime_hours'] = $overtimeHours;
                    } else {
                        $r['total_hours'] = 0;
                        $r['work_hours'] = 0;
                        $r['overtime_hours'] = 0;
                    }

                    if ($isHoliday || $isIncomplete) {
                        // في أيام العطلات الرسمية، لا تحسب غرامة التأخير
                        $r['grace_period_late_minutes'] = 0;
                        $r['late_penalty_hours'] = 0;
                    } else {
                        // حساب التأخير في أيام العمل الرسمية
                        $officialStart = getSystemVar($pdo, 'official_start_time', '08:30:00');
                        $graceMinutesCfg = (int)getSystemVar($pdo, 'grace_period', 5);
                        $graceLate = computeGracePeriodLateMinutes($r['check_in_time'] ?? $r['check_in'] ?? null, $officialStart, $graceMinutesCfg);
                        $r['grace_period_late_minutes'] = $graceLate;
                        
                        if ($isExcused) {
                            // إذا كان بإذن: حساب التأخير بدون مضاعفات
                            $r['late_penalty_hours'] = computeLatePenaltyHoursWithExcuse($graceLate);
                        } else {
                            // بدون إذن: حساب التأخير بالمضاعفات
                            $r['late_penalty_hours'] = computeLatePenaltyHours($graceLate, $pdo);
                        }
                    }

                    // اشتقاق الحالة الصحيحة للعرض عند عدم وجود حضور/انصراف
                    if ($isHoliday) {
                        // لا نخزن "holiday" في status لأن العمود قد يكون ENUM بدون هذه القيمة
                        $r['status'] = 'present';
                    } elseif ($isIncomplete) {
                        $r['status'] = 'absent';
                    } elseif (!$hasValidCheckIn) {
                        $r['status'] = 'absent';
                    } elseif (($r['grace_period_late_minutes'] ?? 0) > 0) {
                        $r['status'] = 'late';
                    } else {
                        $r['status'] = 'present';
                    }
                    return $r;
                }, $records);
            }
            
            echo json_encode([
                'success' => true,
                'data' => $records
            ]);
            break;
            
        case 'POST':
            // إضافة/تحديث سجل حضور أو عمليات مجمعة
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                throw new Exception('لا توجد بيانات مرسلة');
            }
            
            $action = $input['action'] ?? 'add_record';

            if ($action === 'fill_missing_absence') {
                $startDate = $input['start_date'] ?? null;
                $endDate = $input['end_date'] ?? null;
                $employeeId = $input['employee_id'] ?? null;

                if (empty($startDate) || empty($endDate)) {
                    throw new Exception('start_date و end_date مطلوبة');
                }

                $fillResult = fillMissingAbsenceRecords($pdo, $startDate, $endDate, $employeeId);

                $message = ($fillResult['skipped_reason'] ?? '') === 'empty_period'
                    ? 'لا توجد سجلات حضور أو بصمة في هذه الفترة — لم يُنشأ غياب تلقائي'
                    : sprintf(
                        'تم إنشاء %d سجل غياب تلقائي للفترة %s → %s',
                        $fillResult['created'],
                        $fillResult['start_date'],
                        $fillResult['end_date']
                    );

                echo json_encode([
                    'success' => true,
                    'message' => $message,
                    'auto_absence_created' => $fillResult['created'],
                    'skipped_reason' => $fillResult['skipped_reason'] ?? null,
                    'start_date' => $fillResult['start_date'],
                    'end_date' => $fillResult['end_date'],
                ]);
                break;
            }

            if ($action === 'recompute_range') {
                $startDate = $input['start_date'] ?? null;
                $endDate = $input['end_date'] ?? null;
                $employeeId = $input['employee_id'] ?? null;

                if (empty($startDate) || empty($endDate)) {
                    throw new Exception('start_date و end_date مطلوبة');
                }

                $fillResult = fillMissingAbsenceRecords($pdo, $startDate, $endDate, $employeeId);
                $updated = recomputeAttendanceRange($pdo, $startDate, $endDate, $employeeId);

                $message = 'تمت إعادة الاحتساب بنجاح';
                if ($fillResult['created'] > 0) {
                    $message .= sprintf(' | غياب تلقائي: %d سجل', $fillResult['created']);
                }

                echo json_encode([
                    'success' => true,
                    'message' => $message,
                    'updated_records' => $updated,
                    'auto_absence_created' => $fillResult['created'],
                ]);
                break;
            }
            
            // التحقق لعمليات الإضافة/التحديث الفردية
            if (empty($input['employee_id']) || empty($input['attendance_date'])) {
                throw new Exception('بيانات مطلوبة: employee_id, attendance_date');
            }
            
            if ($action === 'update_record') {
                // تحديث سجل موجود
                if (empty($input['record_id'])) {
                    throw new Exception('معرف السجل مطلوب للتحديث');
                }
                
                // تحديث السجل
                $updateFields = [
                    'attendance_date = ?',
                    'check_in = ?',
                    'check_out = ?',
                    'status = ?',
                    'work_hours = ?',
                    'overtime_hours = ?',
                    'late_minutes = ?',
                    'early_leave_minutes = ?',
                    'is_holiday = ?',
                    'is_excused = ?',
                    'transport_allowance = ?',
                    'notes = ?'
                ];
                
                $checkIn = $input['check_in'] ?? $input['check_in_time'] ?? '08:30:00';
                $checkOut = $input['check_out'] ?? $input['check_out_time'] ?? '18:30:00';
                
                // حساب is_holiday و is_excused
                $isHolidayInt = isset($input['is_holiday']) ? ((int)$input['is_holiday']) : 0;
                $isExcusedInt = isset($input['is_excused']) ? ((int)$input['is_excused']) : 0;

                // يوم العطلة الأسبوعي من الإعدادات إذا لم يُحدَّد عطلة صراحة في الطلب
                if (!isset($input['is_holiday']) || !$input['is_holiday']) {
                    $weekendDay = getSystemVar($pdo, 'weekend_day', null);
                    if ($weekendDay) {
                        $dayName = date('l', strtotime($input['attendance_date']));
                        if ($dayName === $weekendDay) {
                            $isHolidayInt = 1;
                        }
                    }
                }
                
                // حساب الحالة تلقائياً بناءً على check_in والتأخير
                $calculatedStatus = 'present';
                $isCheckInEmpty = empty($checkIn) || 
                                 $checkIn === '00:00' || 
                                 $checkIn === '00:00:00' || 
                                 trim($checkIn) === '' ||
                                 $checkIn === 'NULL';
                
                // حساب التأخير (يُحسب دائماً إذا لم يكن يوم عطلة، حتى مع وجود أذن)
                $lateMinutes = 0;
                if (!$isHolidayInt && !$isCheckInEmpty) {
                    $officialStart = getSystemVar($pdo, 'official_start_time', '08:30:00');
                    $gracePeriod = (int)getSystemVar($pdo, 'grace_period', 5);
                    $lateMinutes = computeGracePeriodLateMinutes($checkIn, $officialStart, $gracePeriod);
                }
                
                $isCheckOutEmpty = empty($checkOut) || 
                                  $checkOut === '00:00' || 
                                  $checkOut === '00:00:00' || 
                                  trim($checkOut) === '' ||
                                  $checkOut === 'NULL';
                $isIncomplete = (!$isCheckInEmpty && $isCheckOutEmpty) || ($isCheckInEmpty && !$isCheckOutEmpty);

                // تحديد الحالة بناءً على check_in و check_out والتأخير
                if ($isCheckInEmpty) {
                    $calculatedStatus = 'absent';
                } elseif ($isIncomplete) {
                    $calculatedStatus = 'absent';
                } elseif ($isHolidayInt) {
                    // إذا كان يوم عطلة، فالحالة = present
                    $calculatedStatus = 'present';
                } elseif ($lateMinutes > 0) {
                    // إذا كان هناك تأخير (حتى مع وجود أذن)، فالحالة = late
                    $calculatedStatus = 'late';
                } else {
                    // إذا كان كل شيء طبيعي، فالحالة = present
                    $calculatedStatus = 'present';
                }
                
                // استخدام الحالة المحسوبة
                // إذا كان check_in = 00:00، يجب أن تكون الحالة absent بغض النظر عن status المرسل
                if ($isCheckInEmpty) {
                    $status = 'absent';
                } elseif (isset($input['status']) && $input['status'] !== '' && $input['status'] !== null && $input['status'] === 'absent') {
                    // إذا تم تمرير status='absent' صراحة، استخدمه (لكن هذا لا يجب أن يحدث إذا كان check_in صالح)
                    $status = 'absent';
                } else {
                    // استخدم الحالة المحسوبة (present أو late بناءً على التأخير)
                    // تجاهل status المرسل إذا كان present، لأن الخادم يجب أن يحسبها بناءً على التأخير
                    $status = $calculatedStatus;
                }
                
                $attendanceDate = $input['attendance_date'];
                $workHours = calculateHours($checkIn, $checkOut, $attendanceDate, (bool)$isHolidayInt);
                
                // حساب الساعات الإضافية بناءً على وقت الحضور والانصراف الفعليين ووقت العمل الرسمي
                if ($isHolidayInt) {
                    // في أيام العطلات، جميع ساعات العمل تعتبر إضافية
                    $computedOvertime = $workHours;
                } else {
                    // حساب الساعات الإضافية من وقت الحضور والانصراف الفعليين
                    $computedOvertime = calculateOvertimeHoursFromCheckOut($attendanceDate, $checkOut, $isHolidayInt, $checkIn, $workHours);
                }
                // Late minutes وفق فترة السماح
                // - في أيام العطلات الرسمية: لا تحسب غرامة التأخير
                // - إذا كان بإذن: تحسب التأخير بدون مضاعفات (ساعة بساعة، نصف ساعة بنصف ساعة)
                // - بدون إذن: تحسب التأخير بالمضاعفات (ساعة بساعتين، نصف ساعة بساعة)
                // $isExcusedInt تم حسابه أعلاه
                $computedLateMinutes = 0;
                $computedLateHours = 0;
                if (!$isHolidayInt) {
                    // حساب التأخير في أيام العمل الرسمية
                    $officialStart = getSystemVar($pdo, 'official_start_time', '08:30:00');
                    $graceMinutesCfg = (int)getSystemVar($pdo, 'grace_period', 5);
                    $computedLateMinutes = computeGracePeriodLateMinutes($checkIn, $officialStart, $graceMinutesCfg);
                    
                    // حساب ساعات التأخير (grace_period_late_hours_calculated)
                    if ($isExcusedInt) {
                        // إذا كان بإذن: حساب التأخير بدون مضاعفات
                        $computedLateHours = computeLatePenaltyHoursWithExcuse($computedLateMinutes);
                    } else {
                        // بدون إذن: حساب التأخير بالمضاعفات
                        $computedLateHours = computeLatePenaltyHours($computedLateMinutes, $pdo);
                    }
                }
                
                // حساب الانصراف المبكر - يُحسب دائماً إذا سجل خروج قبل موعد انتهاء العمل (الإذن خاص بتسجيل الحضور فقط وليس للانصراف المبكر)
                $computedEarlyLeaveMinutes = 0;
                if (!empty($checkOut) && !$isHolidayInt) {
                    $officialEnd = getSystemVar($pdo, 'official_end_time', '18:30:00');
                    $computedEarlyLeaveMinutes = computeEarlyLeaveMinutes($checkOut, $officialEnd);
                }
                
                // إضافة حقول ساعات التأخير إلى updateFields
                $updateFields[] = 'grace_period_late_hours_calculated = ?';
                $updateFields[] = 'late_hours_calculated = ?';
                
                // إنشاء الملاحظات تلقائياً
                $dataForNotes = array_merge($input, [
                    'check_in_time' => $checkIn,
                    'check_in' => $checkIn,
                    'status' => $status,
                    'work_hours' => $workHours,
                    'is_excused' => $isExcusedInt,
                    'transport_allowance' => $input['transport_allowance'] ?? 0
                ]);
                $finalNotes = generateAutoNotes($dataForNotes, $computedLateMinutes, $computedLateHours, $pdo);
                
                $checkInDb = $isCheckInEmpty ? null : cleanTimeString($checkIn);
                $checkOutDb = $isCheckOutEmpty ? null : cleanTimeString($checkOut);

                $params = [
                    $input['attendance_date'],
                    $checkInDb,
                    $checkOutDb,
                    $status,
                    $workHours,
                    $computedOvertime,
                    $computedLateMinutes,
                    $computedEarlyLeaveMinutes,
                    $isHolidayInt,
                    $isExcusedInt,
                    $input['transport_allowance'] ?? 0,
                    $finalNotes,
                    $computedLateHours, // grace_period_late_hours_calculated
                    $computedLateHours, // late_hours_calculated
                    $input['record_id']
                ];
                
                $updateQuery = "UPDATE attendance_logs SET " . implode(', ', $updateFields) . " WHERE id = ?";
                $stmt = $pdo->prepare($updateQuery);
                $stmt->execute($params);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'تم تحديث السجل بنجاح'
                ]);
            } else {
                // إضافة سجل جديد
                // Get employee details
                $empStmt = $pdo->prepare("SELECT id, name FROM employees WHERE id = ?");
                $empStmt->execute([$input['employee_id']]);
                $employee = $empStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$employee) {
                    throw new Exception('الموظف غير موجود');
                }
            
            $stmt = $pdo->prepare("
                INSERT INTO attendance_logs (
                    employee_id, attendance_date, 
                    check_in, check_out, status, work_hours, 
                    overtime_hours, late_minutes, early_leave_minutes,
                    is_holiday, is_excused, transport_allowance, notes,
                    grace_period_late_hours_calculated, late_hours_calculated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $checkIn = $input['check_in_time'] ?? '08:30:00';
            $checkOut = $input['check_out_time'] ?? '18:30:00';
            $attendanceDate = $input['attendance_date'];
            $status = $input['status'] ?? 'present';
            
            // تحديد إذا كان يوم عطلة (قبل حساب الساعات — العطلة: مدة فعلية كاملة دون قصّ بدوام رسمي)
            $isHolidayInt = 0;
            if (isset($input['is_holiday']) && $input['is_holiday']) {
                $isHolidayInt = 1;
            } else {
                $weekendDay = getSystemVar($pdo, 'weekend_day', null);
                if ($weekendDay) {
                    $dayName = date('l', strtotime($attendanceDate));
                    if ($dayName === $weekendDay) {
                        $isHolidayInt = 1;
                    }
                }
            }

            $workHours = calculateHours($checkIn, $checkOut, $attendanceDate, (bool)$isHolidayInt);
            // حساب الساعات الإضافية بناءً على وقت الحضور والانصراف الفعليين ووقت العمل الرسمي
            if ($isHolidayInt) {
                // في أيام العطلات، جميع ساعات العمل تعتبر إضافية
                $computedOvertime = $workHours;
            } else {
                // حساب الساعات الإضافية من وقت الحضور والانصراف الفعليين
                $computedOvertime = calculateOvertimeHoursFromCheckOut($attendanceDate, $checkOut, $isHolidayInt, $checkIn, $workHours);
            }
            // Late minutes وفق فترة السماح
            // - في أيام العطلات الرسمية: لا تحسب غرامة التأخير
            // - إذا كان بإذن: تحسب التأخير بدون مضاعفات (ساعة بساعة، نصف ساعة بنصف ساعة)
            // - بدون إذن: تحسب التأخير بالمضاعفات (ساعة بساعتين، نصف ساعة بساعة)
            $isExcusedInt = isset($input['is_excused']) && $input['is_excused'] ? 1 : 0;
            $computedLateMinutes = 0;
            $computedLateHours = 0;
            if (!$isHolidayInt) {
                $officialStart = getSystemVar($pdo, 'official_start_time', '08:30:00');
                $graceMinutesCfg = (int)getSystemVar($pdo, 'grace_period', 5);
                $computedLateMinutes = computeGracePeriodLateMinutes($checkIn, $officialStart, $graceMinutesCfg);
                
                // حساب ساعات التأخير (grace_period_late_hours_calculated)
                if ($isExcusedInt) {
                    // إذا كان بإذن: حساب التأخير بدون مضاعفات
                    $computedLateHours = computeLatePenaltyHoursWithExcuse($computedLateMinutes);
                } else {
                    // بدون إذن: حساب التأخير بالمضاعفات
                    $computedLateHours = computeLatePenaltyHours($computedLateMinutes, $pdo);
                }
            }
            
            // حساب الانصراف المبكر - يُحسب دائماً إذا سجل خروج قبل موعد انتهاء العمل (الإذن خاص بتسجيل الحضور فقط وليس للانصراف المبكر)
            $computedEarlyLeaveMinutes = 0;
            if (!empty($checkOut) && !$isHolidayInt) {
                $officialEnd = getSystemVar($pdo, 'official_end_time', '18:30:00');
                $computedEarlyLeaveMinutes = computeEarlyLeaveMinutes($checkOut, $officialEnd);
            }
            
            // إنشاء الملاحظات تلقائياً
            $dataForNotes = array_merge($input, [
                'check_in_time' => $checkIn,
                'check_in' => $checkIn,
                'status' => $status,
                'work_hours' => $workHours,
                'is_excused' => $isExcusedInt,
                'transport_allowance' => $input['transport_allowance'] ?? 0
            ]);
            $finalNotes = generateAutoNotes($dataForNotes, $computedLateMinutes, $computedLateHours, $pdo);
            
            $params = [
                $input['employee_id'],
                $input['attendance_date'],
                cleanTimeString($checkIn),
                cleanTimeString($checkOut),
                $status,
                $workHours,
                $computedOvertime,
                $computedLateMinutes,
                $computedEarlyLeaveMinutes,
                $isHolidayInt,
                $isExcusedInt,
                $input['transport_allowance'] ?? 0,
                $finalNotes,
                $computedLateHours, // grace_period_late_hours_calculated
                $computedLateHours  // late_hours_calculated
            ];
            
            $stmt->execute($params);
            $newId = $pdo->lastInsertId();
            
                echo json_encode([
                    'success' => true,
                    'message' => 'تم إضافة سجل الحضور بنجاح',
                    'id' => $newId
                ]);
            }
            break;
            
        case 'PUT':
            // تحديث سجل حضور
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input || empty($input['id'])) {
                throw new Exception('معرف السجل مطلوب');
            }
            
            // الحصول على السجل الحالي
            $currentStmt = $pdo->prepare("SELECT check_in, check_out, work_hours, overtime_hours, late_minutes, is_holiday, is_excused, attendance_date FROM attendance_logs WHERE id = ?");
            $currentStmt->execute([$input['id']]);
            $currentRecord = $currentStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$currentRecord) {
                throw new Exception('السجل غير موجود');
            }
            
            // تحديد الأوقات الجديدة - دعم check_in_time و check_out_time من الواجهة الأمامية
            $newCheckIn = $input['check_in'] ?? $input['check_in_time'] ?? $currentRecord['check_in'];
            $newCheckOut = $input['check_out'] ?? $input['check_out_time'] ?? $currentRecord['check_out'];
            
            // حفظ القيم الأصلية قبل التنظيف للتحقق من 00:00
            $originalCheckIn = $newCheckIn;
            $originalCheckOut = $newCheckOut;
            
            // تنظيف الأوقات
            $newCheckIn = cleanTimeString($newCheckIn);
            $newCheckOut = cleanTimeString($newCheckOut);
            
            // حساب الحالة تلقائياً بناءً على check_in و check_out
            // إذا كان check_in = 00:00 أو فارغ أو NULL، فالحالة = absent
            $calculatedStatus = 'present';
            
            // التحقق من القيم الأصلية والمنظفة - تحقق شامل من جميع التنسيقات الممكنة
            // فقط إذا كانت القيمة 00:00 أو فارغة تماماً، نعتبرها فارغة
            $isCheckInEmpty = empty($originalCheckIn) || 
                             $originalCheckIn === 'NULL' || 
                             $originalCheckIn === null || 
                             $originalCheckIn === '' ||
                             trim($originalCheckIn) === '' ||
                             $originalCheckIn === '00:00' ||
                             $originalCheckIn === '00:00:00' ||
                             ($newCheckIn && ($newCheckIn === '00:00:00' || $newCheckIn === '00:00' || strpos($newCheckIn, '00:00:00') === 0));
            
            $isCheckOutEmpty = empty($originalCheckOut) || 
                              $originalCheckOut === 'NULL' || 
                              $originalCheckOut === null || 
                              $originalCheckOut === '' ||
                              trim($originalCheckOut) === '' ||
                              $originalCheckOut === '00:00' ||
                              $originalCheckOut === '00:00:00' ||
                              ($newCheckOut && ($newCheckOut === '00:00:00' || $newCheckOut === '00:00' || strpos($newCheckOut, '00:00:00') === 0));
            
            // تسجيل للتصحيح
            error_log("Attendance Update - Original CheckIn: " . var_export($originalCheckIn, true) . ", Cleaned: " . var_export($newCheckIn, true));
            error_log("Attendance Update - Original CheckOut: " . var_export($originalCheckOut, true) . ", Cleaned: " . var_export($newCheckOut, true));
            error_log("Attendance Update - IsCheckInEmpty: " . var_export($isCheckInEmpty, true) . ", IsCheckOutEmpty: " . var_export($isCheckOutEmpty, true));
            error_log("Attendance Update - Input status: " . var_export($input['status'] ?? 'not set', true));
            
            // حساب is_holiday و is_excused أولاً
            $isHolidayInt = isset($input['is_holiday']) ? ((int)$input['is_holiday']) : ((int)($currentRecord['is_holiday'] ?? 0));
            $isExcusedInt = isset($input['is_excused']) ? ((int)$input['is_excused']) : ((int)($currentRecord['is_excused'] ?? 0));
            
            // حساب التأخير أولاً لتحديد الحالة بشكل صحيح
            
            // حساب التأخير (يُحسب دائماً إذا لم يكن يوم عطلة، حتى مع الأذن)
            $lateMinutes = 0;
            if (!$isHolidayInt && !$isCheckInEmpty) {
                $officialStart = getSystemVar($pdo, 'official_start_time', '08:30:00');
                $gracePeriod = (int)getSystemVar($pdo, 'grace_period', 5);
                $lateMinutes = computeGracePeriodLateMinutes($newCheckIn, $officialStart, $gracePeriod);
            }
            
            $isIncomplete = (!$isCheckInEmpty && $isCheckOutEmpty) || ($isCheckInEmpty && !$isCheckOutEmpty);

            // حساب الحالة بناءً على check_in و check_out والتأخير
            if ($isCheckInEmpty) {
                // إذا كان check_in فارغ أو 00:00، فالحالة = absent
                $calculatedStatus = 'absent';
            } elseif ($isIncomplete) {
                // سجل ناقص (دخول بدون خروج أو العكس) يعامل كغياب لحين المراجعة
                $calculatedStatus = 'absent';
            } elseif ($isHolidayInt) {
                // إذا كان يوم عطلة، فالحالة = present
                $calculatedStatus = 'present';
            } elseif ($lateMinutes > 0) {
                // إذا كان هناك تأخير (حتى مع وجود أذن)، فالحالة = late
                $calculatedStatus = 'late';
            } else {
                // إذا كان كل شيء طبيعي، فالحالة = present
                $calculatedStatus = 'present';
            }
            
            // استخدام الحالة المحسوبة تلقائياً
            // إذا كان check_in = 00:00، يجب أن تكون الحالة absent بغض النظر عن status المرسل
            if ($isCheckInEmpty) {
                $newStatus = 'absent';
                error_log("Attendance Update - Setting status to 'absent' because check_in is empty/00:00");
            } elseif (!$isCheckInEmpty && !$isCheckOutEmpty) {
                // إذا كان check_in و check_out موجودين وصالحين، نستخدم الحالة المحسوبة بناءً على التأخير
                // تجاهل status المرسل إذا كان present، لأن الخادم يجب أن يحسبها بناءً على التأخير
                if (isset($input['status']) && $input['status'] !== '' && $input['status'] !== null && $input['status'] === 'absent') {
                    // إذا تم تمرير status='absent' صراحة، استخدمه (لكن هذا لا يجب أن يحدث إذا كان check_in صالح)
                    $newStatus = 'absent';
                } else {
                    // استخدم الحالة المحسوبة (present أو late بناءً على التأخير)
                    // تجاهل status='present' المرسل من الواجهة الأمامية
                    $newStatus = $calculatedStatus;
                }
                error_log("Attendance Update - CheckIn and CheckOut are valid, lateMinutes: {$lateMinutes}, calculatedStatus: {$calculatedStatus}, input status: " . ($input['status'] ?? 'not set') . ", using status: " . $newStatus);
            } elseif (isset($input['status']) && $input['status'] !== '' && $input['status'] !== null && $input['status'] === 'absent') {
                // إذا تم تمرير status='absent' صراحة، استخدمه
                $newStatus = 'absent';
                error_log("Attendance Update - Using provided status: " . $newStatus);
            } else {
                // استخدم الحالة المحسوبة تلقائياً
                $newStatus = $calculatedStatus;
                error_log("Attendance Update - Using calculated status: " . $newStatus);
            }
            
            // إعادة حساب ساعات العمل والساعات الإضافية ودقائق التأخير
            $attendanceDate = $currentRecord['attendance_date'];
            $newWorkHours = calculateHours($newCheckIn, $newCheckOut, $attendanceDate, (bool)$isHolidayInt);
            // استخدام القيم المحسوبة مسبقاً
            // $isHolidayInt و $isExcusedInt تم حسابهما أعلاه
            // حساب الساعات الإضافية بناءً على وقت الحضور والانصراف الفعليين ووقت العمل الرسمي
            if ($isHolidayInt) {
                $newOvertimeHours = $newWorkHours; // في أيام العطلات، جميع ساعات العمل تعتبر إضافية
            } else {
                $newOvertimeHours = calculateOvertimeHoursFromCheckOut($attendanceDate, $newCheckOut, $isHolidayInt, $newCheckIn, $newWorkHours);
            }
            // حساب late minutes وفق فترة السماح
            // - في أيام العطلات الرسمية: لا تحسب غرامة التأخير
            // - إذا كان بإذن: تحسب التأخير بدون مضاعفات (ساعة بساعة، نصف ساعة بنصف ساعة)
            // - بدون إذن: تحسب التأخير بالمضاعفات (ساعة بساعتين، نصف ساعة بساعة)
            $newLateMinutes = 0;
            $newLateHours = 0;
            if (!$isHolidayInt) {
                $officialStart = getSystemVar($pdo, 'official_start_time', '08:30:00');
                $graceMinutesCfg = (int)getSystemVar($pdo, 'grace_period', 5);
                $newLateMinutes = computeGracePeriodLateMinutes($newCheckIn, $officialStart, $graceMinutesCfg);
                
                // حساب ساعات التأخير (grace_period_late_hours_calculated)
                if ($isExcusedInt) {
                    // إذا كان بإذن: حساب التأخير بدون مضاعفات
                    $newLateHours = computeLatePenaltyHoursWithExcuse($newLateMinutes);
                } else {
                    // بدون إذن: حساب التأخير بالمضاعفات
                    $newLateHours = computeLatePenaltyHours($newLateMinutes, $pdo);
                }
            }
            
            // بناء query التحديث
            $updateFields = [
                'status = ?', 
                'notes = ?',
                'work_hours = ?',
                'overtime_hours = ?',
                'late_minutes = ?',
                'early_leave_minutes = ?',
                'transport_allowance = ?',
                'grace_period_late_hours_calculated = ?',
                'late_hours_calculated = ?'
            ];
            
            // إنشاء الملاحظات تلقائياً
            $dataForNotes = array_merge($input, [
                'check_in_time' => $newCheckIn,
                'check_in' => $newCheckIn,
                'status' => $newStatus,
                'work_hours' => $newWorkHours,
                'is_excused' => $isExcusedInt,
                'transport_allowance' => $input['transport_allowance'] ?? 0
            ]);
            $finalNotes = generateAutoNotes($dataForNotes, $newLateMinutes, $newLateHours, $pdo);
            
            // حساب الانصراف المبكر - يُحسب دائماً إذا سجل خروج قبل موعد انتهاء العمل (الإذن خاص بتسجيل الحضور فقط وليس للانصراف المبكر)
            $newEarlyLeaveMinutes = 0;
            if (!empty($newCheckOut) && $newCheckOut !== '00:00:00' && $newCheckOut !== '00:00' && !$isHolidayInt) {
                $officialEnd = getSystemVar($pdo, 'official_end_time', '18:30:00');
                $newEarlyLeaveMinutes = computeEarlyLeaveMinutes($newCheckOut, $officialEnd);
            }
            
            $params = [
                $newStatus,
                $finalNotes,
                $newWorkHours,
                $newOvertimeHours,
                $newLateMinutes,
                $newEarlyLeaveMinutes,
                $input['transport_allowance'] ?? 0,
                $newLateHours, // grace_period_late_hours_calculated
                $newLateHours  // late_hours_calculated
            ];
            
            // إضافة تحديث وقت الدخول والخروج إذا تم تمريرهما - دعم check_in_time و check_out_time
            if (isset($input['check_in']) || isset($input['check_in_time'])) {
                $updateFields[] = 'check_in = ?';
                $params[] = cleanTimeString($input['check_in'] ?? $input['check_in_time']);
            }
            
            if (isset($input['check_out']) || isset($input['check_out_time'])) {
                $updateFields[] = 'check_out = ?';
                $params[] = cleanTimeString($input['check_out'] ?? $input['check_out_time']);
            }
            
            // إضافة تحديث is_excused إذا تم تمريره
            if (isset($input['is_excused'])) {
                $updateFields[] = 'is_excused = ?';
                $params[] = $isExcusedInt;
            }
            
            // إضافة معرف السجل
            $params[] = $input['id'];
            
            $updateQuery = "UPDATE attendance_logs SET " . implode(', ', $updateFields) . " WHERE id = ?";
            
            $stmt = $pdo->prepare($updateQuery);
            $stmt->execute($params);
            
            // جلب السجل المحدث لإرجاعه في الاستجابة
            $fetchStmt = $pdo->prepare("SELECT * FROM attendance_logs WHERE id = ?");
            $fetchStmt->execute([$input['id']]);
            $updatedRecord = $fetchStmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'message' => 'تم تحديث سجل الحضور بنجاح',
                'updated_data' => [
                    'work_hours' => $newWorkHours,
                    'overtime_hours' => $newOvertimeHours,
                    'late_minutes' => $newLateMinutes,
                    'status' => $newStatus,
                    'late_hours' => $newLateHours,
                    'early_leave_minutes' => $newEarlyLeaveMinutes
                ],
                'record' => $updatedRecord
            ]);
            break;
            
        case 'DELETE':
            // حذف سجل حضور
            $input = json_decode(file_get_contents('php://input'), true);
            $id = $input['record_id'] ?? $_GET['id'] ?? null;
            $sourceType = $input['source_type'] ?? $_GET['source_type'] ?? 'manual';
            
            if (!$id) {
                throw new Exception('معرف السجل مطلوب');
            }
            
            // تحديد الجدول المناسب للحذف
            if ($sourceType === 'fingerprint') {
                $stmt = $pdo->prepare("DELETE FROM fingerprint_attendance WHERE id = ?");
            } else {
                $stmt = $pdo->prepare("DELETE FROM attendance_logs WHERE id = ?");
            }
            
            $stmt->execute([$id]);
            
            echo json_encode([
                'success' => true,
                'message' => 'تم حذف سجل الحضور بنجاح'
            ]);
            break;
            
        default:
            throw new Exception('طريقة طلب غير مدعومة');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
} // إغلاق شرط if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME']))

function calculateHours($checkIn, $checkOut, $attendanceDate = null, $isHoliday = false) {
    try {
        global $pdo;

        // تنظيف الأوقات من أي أرقام عشرية غير صحيحة
        $checkIn = cleanTimeString($checkIn);
        $checkOut = cleanTimeString($checkOut);

        // تحويل الأوقات إلى DateTime objects للتعامل الآمن
        $checkInDateTime = new DateTime($checkIn);
        $checkOutDateTime = new DateTime($checkOut);

        if ($isHoliday) {
            // أيام العطلة (رسمية/معلَّمة): العمل اختياري — المدة بين الحضور والانصراف الفعليين دون قصّ ببداية/نهاية الدوام الرسمي
            $datePart = $attendanceDate ? substr(trim($attendanceDate), 0, 10) : date('Y-m-d');
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $datePart)) {
                $datePart = date('Y-m-d');
            }
            $timeIn = $checkInDateTime->format('H:i:s');
            $timeOut = $checkOutDateTime->format('H:i:s');
            $inFull = new DateTime($datePart . ' ' . $timeIn);
            $outFull = new DateTime($datePart . ' ' . $timeOut);
            if ($outFull->getTimestamp() <= $inFull->getTimestamp()) {
                $outFull->modify('+1 day');
            }
            $seconds = $outFull->getTimestamp() - $inFull->getTimestamp();

            return round(max(0, $seconds / 3600), 2);
        }

        // أيام العمل العادية: المدة ضمن نافذة الدوام الرسمي
        $officialStart = getSystemVar($pdo, 'official_start_time', '08:00:00');
        $officialEnd = getSystemVar($pdo, 'official_end_time', '18:00:00');

        $officialStartDateTime = new DateTime($officialStart);
        $officialEndDateTime = new DateTime($officialEnd);

        // حساب وقت البداية الفعال (الأقصى بين وقت الحضور الفعلي ووقت البداية الرسمي)
        $effectiveStartDateTime = max($checkInDateTime, $officialStartDateTime);

        // حساب وقت النهاية الفعال (الأدنى بين وقت الانصراف الفعلي ووقت النهاية الرسمي)
        $effectiveEndDateTime = min($checkOutDateTime, $officialEndDateTime);

        // إذا كان وقت النهاية الفعال قبل أو يساوي وقت البداية الفعال، فلا توجد ساعات رسمية
        if ($effectiveEndDateTime <= $effectiveStartDateTime) {
            return 0;
        }

        // حساب الساعات الرسمية
        $diff = $effectiveStartDateTime->diff($effectiveEndDateTime);
        $hours = $diff->h + ($diff->i / 60) + ($diff->s / 3600);

        return round($hours, 2);
    } catch (Exception $e) {
        // في حالة الخطأ، إرجاع 0
        error_log("Error calculating hours: " . $e->getMessage());
        return 0;
    }
}

function calculateOvertimeHours($workHours) {
    // احسب ساعات الدوام الرسمية وفق daily_work_hours إن وُجدت، ثم official_start/end، وإلا 8 ساعات
    global $pdo;
    $normalWorkHours = null;
    if ($pdo) {
        $daily = getSystemVar($pdo, 'daily_work_hours', null);
        if ($daily !== null && $daily !== '' && is_numeric($daily)) {
            $normalWorkHours = max(0, (float)$daily);
        } else {
            $officialStart = getSystemVar($pdo, 'official_start_time', '08:30:00');
            $officialEnd = getSystemVar($pdo, 'official_end_time', '18:30:00');
            try {
                $start = new DateTime($officialStart);
                $end = new DateTime($officialEnd);
                $diff = $end->diff($start);
                $normalWorkHours = $diff->h + ($diff->i / 60) + ($diff->s / 3600);
            } catch (Exception $e) {
                $normalWorkHours = 10; // fallback
            }
        }
    }
    if ($normalWorkHours === null) {
        $normalWorkHours = 10;
    }

    $overtime = $workHours - $normalWorkHours;
    return $overtime > 0 ? round($overtime, 2) : 0;
}

// دالة جديدة لحساب الساعات الإضافية بناءً على وقت الحضور والانصراف الفعليين ووقت العمل الرسمي
function calculateOvertimeHoursFromCheckOut($attendanceDate, $checkOut, $isHoliday = 0, $checkIn = null, $workHours = null) {
    global $pdo;
    
    // في أيام العطلات، جميع ساعات العمل تعتبر إضافية (يتم حسابها في مكان آخر)
    if ($isHoliday) {
        return 0; // سيتم حسابها بشكل منفصل
    }
    
    if (empty($attendanceDate) || empty($checkOut)) {
        return 0;
    }
    
    // جلب أوقات العمل الرسمية + مهلة بدء الإضافي بعد نهاية الدوام
    $officialStart = getSystemVar($pdo, 'official_start_time', '08:30:00');
    $officialEnd = getSystemVar($pdo, 'official_end_time', '18:30:00');
    $overtimeGraceMinutes = (int)getSystemVar($pdo, 'overtime_start_grace_minutes', 15);
    if ($overtimeGraceMinutes < 0) {
        $overtimeGraceMinutes = 0;
    }
    
    // محاولة جلب daily_work_hours أولاً
    $dailyWorkHours = getSystemVar($pdo, 'daily_work_hours', null);
    $normalWorkHours = null;
    
    if ($dailyWorkHours !== null && $dailyWorkHours !== '' && is_numeric($dailyWorkHours)) {
        $normalWorkHours = max(0, (float)$dailyWorkHours);
    } else {
        // حساب ساعات العمل الرسمية من official_start_time و official_end_time
        try {
            $start = new DateTime($officialStart);
            $end = new DateTime($officialEnd);
            $diff = $end->diff($start);
            $normalWorkHours = $diff->h + ($diff->i / 60) + ($diff->s / 3600);
        } catch (Exception $e) {
            $normalWorkHours = 10; // fallback
        }
    }
    
    if ($normalWorkHours === null) {
        $normalWorkHours = 10;
    }
    
    try {
        // المهلة = حد أدنى (بالدقائق) بعد official_end: إذا كان الانصراف قبل انتهاء هذا الحد لا يُحسب إضافي.
        // إذا كان الانصراف بعد أو عند الحد، يُحسب الإضافي كاملاً من نهاية الدوام الرسمي (وليس من نهاية المهلة).
        $checkOut = cleanTimeString($checkOut);
        $checkOutDateTime = new DateTime($attendanceDate . ' ' . $checkOut);
        $officialEndDateTime = new DateTime($attendanceDate . ' ' . $officialEnd);

        $diffSeconds = $checkOutDateTime->getTimestamp() - $officialEndDateTime->getTimestamp();
        if ($diffSeconds <= 0) {
            return 0;
        }

        $graceThresholdSeconds = max(0, $overtimeGraceMinutes) * 60;
        if ($diffSeconds < $graceThresholdSeconds) {
            return 0;
        }

        $overtimeHours = $diffSeconds / 3600;
        return round($overtimeHours, 2);
    } catch (Exception $e) {
        error_log("Error calculating overtime from check out: " . $e->getMessage());
        return 0;
    }
}

// جلب متغير نظام بقيمة افتراضية
function getSystemVar($pdo, $key, $default = null) {
    try {
        $stmt = $pdo->prepare("SELECT variable_value FROM system_variables WHERE variable_key = ? AND is_active = 1");
        $stmt->execute([$key]);
        $val = $stmt->fetchColumn();
        if ($val === false || $val === null || $val === '') return $default;
        return $val;
    } catch (Exception $e) {
        return $default;
    }
}

// حساب دقائق التأخير بمنطق حد أدنى:
// - إذا الحضور قبل أو عند (الرسمي + السماح) => 0
// - إذا الحضور بعد حد السماح => يُحسب كامل التأخير من الوقت الرسمي (بدون خصم فترة السماح)
function computeGracePeriodLateMinutes($checkInTime, $officialStartTime, $graceMinutes) {
    if (empty($checkInTime)) return 0;
    $checkInTime = cleanTimeString($checkInTime);
    try {
        $official = new DateTime($officialStartTime ?: '08:30:00');
        $checkIn = new DateTime($checkInTime);
        // إذا الحضور قبل أو عند الرسمي + السماح => لا تأخير
        $graceBoundary = clone $official;
        $graceBoundary->modify("+{$graceMinutes} minutes");
        if ($checkIn <= $graceBoundary) return 0;
        // بعد تجاوز حد السماح: نحسب كامل التأخير من بداية الوقت الرسمي
        $diff = $checkIn->getTimestamp() - $official->getTimestamp();
        return max(0, (int)round($diff / 60));
    } catch (Exception $e) {
        return 0;
    }
}

// حساب دقائق الانصراف المبكر بمنطق حد أدنى:
// - إذا كان الانصراف المبكر أقل من أو يساوي مهلة السماح early_leave_grace_minutes => 0
// - إذا كان الانصراف المبكر أكبر من المهلة => يُحسب كامل الانصراف المبكر من وقت الانصراف حتى نهاية الدوام الرسمية
function computeEarlyLeaveMinutes($checkOutTime, $officialEndTime) {
    global $pdo;
    $db = $pdo ?? ($GLOBALS['pdo'] ?? null);
    if (empty($checkOutTime) || empty($officialEndTime)) return 0;
    $checkOutTime = cleanTimeString($checkOutTime);
    try {
        $graceMinutes = 10;
        if (!empty($db)) {
            $graceMinutes = (int)getSystemVar($db, 'early_leave_grace_minutes', 10);
            if ($graceMinutes < 0) {
                $graceMinutes = 0;
            }
        }

        $official = new DateTime($officialEndTime ?: '18:30:00');
        $checkOut = new DateTime($checkOutTime);
        // إذا انصرف بعد أو عند وقت انتهاء العمل الرسمي => لا انصراف مبكر
        if ($checkOut >= $official) return 0;
        // الفرق بالدقائق قبل نهاية الدوام الرسمي
        $rawMinutes = (int)round(($official->getTimestamp() - $checkOut->getTimestamp()) / 60);
        if ($rawMinutes <= $graceMinutes) {
            return 0;
        }

        return max(0, $rawMinutes);
    } catch (Exception $e) {
        return 0;
    }
}

// حساب ساعات غرامة التأخير بحسب المعادلة المرسلة
// القواعد:
// - النظام لا يحسب التأخير بالدقائق بل بالساعات والنصف ساعة
// - إذا تعدى فترة السماح (حتى لو دقيقة واحدة): يحسب كأنه نصف ساعة
// - غرامة النصف ساعة = late_partial_hour_threshold × late_partial_hour_multiplier (افتراض 0.5 × 2 = 1.0 ساعة)
// - إذا تأخر أكثر من 30 دقيقة وأقل من 60 دقيقة: يخصم كساعة كاملة × late_hour_multiplier
// - إذا تأخر ساعة كاملة أو أكثر (60+ دقيقة): يخصم (عدد الساعات الكاملة × late_hour_multiplier)
function computeLatePenaltyHours($graceLateMinutes, $pdo) {
    $m = (int)$graceLateMinutes;
    if ($m <= 0) return 0;
    
    // جلب معاملات الضرب من الإعدادات (بقِيَم افتراضية)
    $lateHourMultiplier = (float)getSystemVar($pdo, 'late_hour_multiplier', 2);
    $latePartialHourThreshold = (float)getSystemVar($pdo, 'late_partial_hour_threshold', 0.5); // افتراض نصف ساعة
    $latePartialHourMultiplier = (float)getSystemVar($pdo, 'late_partial_hour_multiplier', 2);

    if ($m >= 60) {
        // إذا تأخر ساعة كاملة أو أكثر: يخصم (عدد الساعات الكاملة × late_hour_multiplier)
        // مثال: 3 ساعات (180 دقيقة) × 2 = 6 ساعات
        $hours = $m / 60.0; // عدد الساعات الكاملة (مثل 3.0 لـ 180 دقيقة)
        return $hours * $lateHourMultiplier;
    } elseif ($m > 30) {
        // إذا تأخر أكثر من 30 دقيقة وأقل من 60 دقيقة: يخصم كساعة كاملة × late_hour_multiplier
        // مثال: 58 دقيقة = 1 ساعة × 2 = ساعتين
        return 1.0 * $lateHourMultiplier;
    } else {
        // إذا تأخر 30 دقيقة أو أقل (حتى لو دقيقة واحدة بعد فترة السماح):
        // يحسب كأنه نصف ساعة → غرامة = late_partial_hour_threshold × late_partial_hour_multiplier
        // مثال: 1 دقيقة بعد السماح = 0.5 × 2 = 1.0 ساعة
        // مثال: 30 دقيقة بعد السماح = 0.5 × 2 = 1.0 ساعة
        return $latePartialHourThreshold * $latePartialHourMultiplier;
    }
}

// حساب التأخير مع الأذن (بدون مضاعفات):
// - إذا تأخر 30 دقيقة أو أقل: يحسب كنصف ساعة (0.5 ساعة)
// - إذا تأخر أكثر من 30 دقيقة وأقل من 60 دقيقة: يحسب كساعة واحدة (1.0 ساعة)
// - إذا تأخر ساعة كاملة أو أكثر: يحسب مباشرة (عدد الساعات الفعلية بدون مضاعف)
function computeLatePenaltyHoursWithExcuse($graceLateMinutes) {
    $m = (int)$graceLateMinutes;
    if ($m <= 0) return 0;
    
    if ($m >= 60) {
        // إذا تأخر ساعة كاملة أو أكثر: يحسب مباشرة بدون مضاعف
        // مثال: 3 ساعات (180 دقيقة) = 3.0 ساعات
        return $m / 60.0;
    } elseif ($m > 30) {
        // إذا تأخر أكثر من 30 دقيقة وأقل من 60 دقيقة: يحسب كساعة واحدة
        // مثال: 58 دقيقة = 1.0 ساعة
        return 1.0;
    } else {
        // إذا تأخر 30 دقيقة أو أقل: يحسب كنصف ساعة
        // مثال: 1 دقيقة = 0.5 ساعة
        // مثال: 30 دقيقة = 0.5 ساعة
        return 0.5;
    }
}
function calculateLateMinutes($checkInTime) {
    try {
        // تنظيف وقت الحضور من أي أرقام عشرية غير صحيحة
        $checkInTime = cleanTimeString($checkInTime);

        // جلب وقت بداية الدوام الرسمي من إعدادات النظام، الافتراضي 08:30:00
        $requiredTime = '08:30:00';
        try {
            // استخدام اتصال PDO العام
            global $pdo;
            if ($pdo) {
                $stmt = $pdo->prepare("SELECT variable_value FROM system_variables WHERE variable_key = 'official_start_time' AND is_active = 1");
                $stmt->execute();
                $val = $stmt->fetchColumn();
                if (!empty($val)) {
                    $requiredTime = $val;
                }
            }
        } catch (Exception $ie) {
            // تجاهل وأبقِ على الافتراضي
        }

        // تحويل الأوقات إلى DateTime للتعامل الآمن
        $requiredDateTime = new DateTime($requiredTime);
        $checkInDateTime = new DateTime($checkInTime);

        // لا غرامة إذا كان الحضور في أو قبل وقت الدوام الرسمي
        if ($checkInDateTime <= $requiredDateTime) {
            return 0;
        }

        // حساب الفرق بالدقائق (الحضور بعد الوقت الرسمي)
        $diff = $checkInDateTime->diff($requiredDateTime);
        $lateMinutes = ($diff->h * 60) + $diff->i;

        return max(0, (int)$lateMinutes);
    } catch (Exception $e) {
        // في حالة الخطأ، إرجاع 0
        error_log("Error calculating late minutes: " . $e->getMessage());
        return 0;
    }
}

function cleanTimeString($timeString) {
    // التعامل مع التاريخ والوقت معاً: 2025-09-14 8.5166666666667:00
    if (preg_match('/(\d{4}-\d{2}-\d{2})\s+(.+)/', $timeString, $dateMatches)) {
        $date = $dateMatches[1];
        $time = $dateMatches[2];
        $cleanedTime = cleanTimeOnly($time);
        return $date . ' ' . $cleanedTime;
    }
    
    // التعامل مع الوقت فقط
    return cleanTimeOnly($timeString);
}

function cleanTimeOnly($timeString) {
    // إزالة أي أرقام عشرية من الساعات
    if (preg_match('/(\d+)\.(\d+):(\d+)/', $timeString, $matches)) {
        $hours = intval($matches[1]);
        $decimalPart = $matches[2];
        $seconds = intval($matches[3]);
        
        // تحويل الجزء العشري إلى دقائق
        $decimalMinutes = floatval('0.' . $decimalPart);
        $totalMinutes = round($decimalMinutes * 60);
        
        return sprintf('%02d:%02d:%02d', $hours, $totalMinutes, $seconds);
    }
    
    // التعامل مع تنسيق آخر: 8.5166666666667:00 (بدون ثواني)
    if (preg_match('/(\d+)\.(\d+):(\d+)/', $timeString, $matches)) {
        $hours = intval($matches[1]);
        $decimalPart = $matches[2];
        $minutes = intval($matches[3]);
        
        // تحويل الجزء العشري إلى دقائق إضافية
        $decimalMinutes = floatval('0.' . $decimalPart);
        $additionalMinutes = round($decimalMinutes * 60);
        $totalMinutes = $minutes + $additionalMinutes;
        
        // إذا تجاوزت الدقائق 60، نضيف ساعة
        if ($totalMinutes >= 60) {
            $hours += intval($totalMinutes / 60);
            $totalMinutes = $totalMinutes % 60;
        }
        
        return sprintf('%02d:%02d:00', $hours, $totalMinutes);
    }
    
    // التعامل مع تنسيق آخر: 8.5166666666667 (بدون :00)
    if (preg_match('/(\d+)\.(\d+)/', $timeString, $matches)) {
        $hours = intval($matches[1]);
        $decimalPart = $matches[2];
        
        // تحويل الجزء العشري إلى دقائق
        $decimalMinutes = floatval('0.' . $decimalPart);
        $totalMinutes = round($decimalMinutes * 60);
        
        return sprintf('%02d:%02d:00', $hours, $totalMinutes);
    }
    
    // إذا كان التنسيق صحيح، إرجاعه كما هو
    return $timeString;
}

/**
 * دالة لإنشاء الملاحظات تلقائياً بناءً على حالة السجل
 * @param array $data بيانات السجل
 * @param int $computedLateMinutes دقائق التأخير المحسوبة
 * @param float $computedLateHours ساعات التأخير المحسوبة
 * @param object $pdo اتصال قاعدة البيانات
 * @return string الملاحظات التلقائية
 */
function generateAutoNotes($data, $computedLateMinutes, $computedLateHours, $pdo) {
    $notes = [];
    $existingNotes = trim($data['notes'] ?? '');
    
    // 1. في حالة التأخير (يتم تحديثها دائماً بناءً على computedLateMinutes الجديد)
    // حتى لو كان بإذن، نحسب التأخير الفعلي للإعلام (لكن بدون خصم)
    $checkIn = $data['check_in_time'] ?? $data['check_in'] ?? '';
    $isExcused = !empty($data['is_excused']) ? (int)$data['is_excused'] : 0;
    
    if (!empty($checkIn) && ($data['status'] ?? '') !== 'absent') {
        // حساب التأخير الفعلي حتى لو كان بإذن (للإعلام فقط)
        $officialStart = getSystemVar($pdo, 'official_start_time', '08:30:00');
        $graceMinutesCfg = (int)getSystemVar($pdo, 'grace_period', 5);
        $actualLateMinutes = computeGracePeriodLateMinutes($checkIn, $officialStart, $graceMinutesCfg);
        
        if ($actualLateMinutes > 0) {
            if ($isExcused) {
                $notes[] = "حضور متأخر ({$actualLateMinutes} دقيقة) - بإذن";
            } else {
                $notes[] = "حضور متأخر ({$actualLateMinutes} دقيقة)";
            }
        }
    }
    
    // 2. في حالة الغياب
    if (($data['status'] ?? '') === 'absent') {
        $notes[] = "غياب";
    }
    
    // 3. عدم استحقاق الوجبة (إذا كان العمل أقل من الحد الأدنى المطلوب أو تأخر بعد وقت استحقاق الوجبة)
    // عادة الوجبة تستحق إذا حضر الموظف قبل وقت بدء العمل الرسمي
    // نستخدم official_start_time مباشرة بدلاً من meal_allowance_time
    $mealAllowanceEnabled = isMealAllowanceEnabled(getSystemVar($pdo, 'meal_allowance_enabled', '1'));
    $checkIn = $data['check_in_time'] ?? $data['check_in'] ?? '';
    if ($mealAllowanceEnabled && !empty($checkIn) && ($data['status'] ?? '') !== 'absent') {
        // استخدام official_start_time مباشرة لحساب استحقاق الوجبة (بدلاً من meal_allowance_time)
        $mealAllowanceTime = getSystemVar($pdo, 'official_start_time', '08:30:00');
        
        $checkInClean = cleanTimeString($checkIn);
        // التأكد من أن mealAllowanceTime في تنسيق صحيح
        $mealAllowanceTimeClean = cleanTimeString($mealAllowanceTime);
        
        // تسجيل للتصحيح
        error_log("Meal Allowance Check - CheckIn: {$checkInClean}, OfficialStartTime (used as meal allowance time): {$mealAllowanceTimeClean}");
        
        // تحويل الأوقات إلى DateTime للمقارنة الدقيقة
        try {
            $checkInDateTime = new DateTime($checkInClean);
            $mealAllowanceDateTime = new DateTime($mealAllowanceTimeClean);
            
            // إذا كان وقت الحضور بعد وقت استحقاق الوجبة (أكبر من، وليس مساوياً)
            if ($checkInDateTime > $mealAllowanceDateTime) {
                $notes[] = "عدم استحقاق الوجبة (حضور بعد {$mealAllowanceTime})";
            }
        } catch (Exception $e) {
            error_log("Error comparing meal allowance times: " . $e->getMessage());
            // في حالة الخطأ، استخدم المقارنة القديمة
            if (strtotime($checkInClean) > strtotime($mealAllowanceTime)) {
                $notes[] = "عدم استحقاق الوجبة (حضور بعد {$mealAllowanceTime})";
            }
        }
    }
    
    // 4. سبب الخصم في التأخير
    if ($computedLateHours > 0) {
        if ($isExcused) {
            // إذا كان بإذن: الخصم ساعة بساعة (بدون مضاعف) - نص بسيط
            $notes[] = "خصم تأخير: " . round($computedLateHours, 2) . " ساعة";
        } else {
            // بدون إذن: الخصم بالمضاعفات
            $lateHourMultiplier = (float)getSystemVar($pdo, 'late_hour_multiplier', 2);
            $latePartialHourMultiplier = (float)getSystemVar($pdo, 'late_partial_hour_multiplier', 2);
            $multiplier = $computedLateMinutes >= 60 ? $lateHourMultiplier : $latePartialHourMultiplier;
            $notes[] = "خصم تأخير: " . round($computedLateHours, 2) . " ساعة (مضاعف: {$multiplier})";
        }
    }
    
    // 5. عند طلب إذن وإضافته (يتم إضافتها فقط إذا لم تكن موجودة في ملاحظة "حضور متأخر")
    // (تم دمجها مع ملاحظة "حضور متأخر" أعلاه إذا كان هناك تأخير)
    // إذا كان بإذن لكن لا يوجد تأخير أو لا يوجد وقت حضور، نضيف ملاحظة "إذن" منفصلة
    $actualLateMinutesValue = isset($actualLateMinutes) ? $actualLateMinutes : 0;
    if ($isExcused && (empty($checkIn) || ($data['status'] ?? '') === 'absent' || $actualLateMinutesValue <= 0)) {
        $notes[] = "إذن";
    }
    
    // 6. بدل المواصلات (إذا تم إضافته)
    $transportAllowance = (float)($data['transport_allowance'] ?? 0);
    if ($transportAllowance > 0) {
        $notes[] = "بدل مواصلات: " . number_format($transportAllowance, 2) . " ج.م";
    }
    
    // دمج الملاحظات التلقائية مع الملاحظات الموجودة
    if (!empty($existingNotes)) {
        // إذا كانت هناك ملاحظات موجودة، نحذف جميع الملاحظات التلقائية القديمة أولاً
        $existingNotesArray = explode(' - ', $existingNotes);
        
        // قائمة بأنماط الملاحظات التلقائية التي يجب حذفها
        $autoNotePatterns = [
            '/^حضور متأخر\s*\([^)]*\)/i',             // حضور متأخر (X دقيقة) - يجب أن تحتوي على رقم بين الأقواس
            '/^حضور متأخر\s*\([^)]*\)\s*-\s*بإذن/i', // حضور متأخر (X دقيقة) - بإذن
            '/^\([^)]*\s*دقيقة\)$/i',                 // (X دقيقة) - حالة منفصلة إذا كانت الملاحظة مقسمة
            '/^\([^)]*\s*دقيقة\)/i',                   // (X دقيقة) - بدون $ في النهاية للتعامل مع حالات مختلفة
            '/^غياب$/i',                               // غياب
            '/^عدم استحقاق الوجبة/i',                  // عدم استحقاق الوجبة
            '/^خصم تأخير:/i',                          // خصم تأخير (جميع الأنواع)
            '/^إذن$/i',                                // إذن (منفصلة)
            '/^بإذن$/i',                               // بإذن (منفصلة)
            '/^بدل مواصلات:/i',                        // بدل مواصلات
            '/أوفر تايم|إضافي.*ساعة/i'                 // أوفر تايم أو إضافي
        ];
        
        // الاحتفاظ فقط بالملاحظات اليدوية (غير تلقائية)
        $manualNotesArray = [];
        foreach ($existingNotesArray as $existingNote) {
            $trimmed = trim($existingNote);
            if (empty($trimmed)) continue;
            
            // التحقق إذا كانت هذه ملاحظة تلقائية
            $isAutoNote = false;
            foreach ($autoNotePatterns as $pattern) {
                if (preg_match($pattern, $trimmed)) {
                    $isAutoNote = true;
                    break;
                }
            }
            
            // أيضاً التحقق من ملاحظات "حضور متأخر" التي قد تكون مقسمة بشكل خاطئ
            // مثل "(37 دقيقة)" أو "حضور متأخر" منفصلة أو "بإذن" منفصلة
            if (!$isAutoNote) {
                // التحقق من أن الملاحظة ليست جزءاً من "حضور متأخر"
                // نمط شامل للتعامل مع جميع أشكال "(X دقيقة)"
                if (preg_match('/^\(?\d+\s*دقيقة\)?$/i', $trimmed) || 
                    preg_match('/^\([^)]*\d+[^)]*دقيقة[^)]*\)/i', $trimmed) ||
                    preg_match('/^حضور متأخر$/i', $trimmed) ||
                    preg_match('/^بإذن$/i', $trimmed)) {
                    $isAutoNote = true;
                }
            }
            
            // إذا لم تكن ملاحظة تلقائية، نحتفظ بها (ملاحظة يدوية)
            if (!$isAutoNote) {
                $manualNotesArray[] = $trimmed;
            }
        }
        
        // دمج الملاحظات اليدوية مع الملاحظات التلقائية الجديدة
        $allNotes = array_merge($manualNotesArray, $notes);
        
        return implode(' - ', array_filter($allNotes));
    } else {
        // إذا لم تكن هناك ملاحظات موجودة، نضيف فقط الملاحظات التلقائية
        return implode(' - ', $notes);
    }
}

/**
 * إعادة احتساب شامل لسجلات الحضور في فترة (نفس منطق زر إدارة الحضور).
 * يُستخدم من attendance_logs.php ومزامنة البصمة.
 *
 * @return int عدد السجلات المُحدَّثة
 */
function recomputeAttendanceRange($pdo, $startDate, $endDate, $employeeId = null) {
    if (empty($startDate) || empty($endDate)) {
        throw new InvalidArgumentException('start_date و end_date مطلوبة');
    }

    $params = [$startDate, $endDate];
    $whereEmp = '';
    if (!empty($employeeId)) {
        $whereEmp = ' AND al.employee_id = ?';
        $params[] = $employeeId;
    }

    $select = $pdo->prepare(
        'SELECT al.id, al.attendance_date, al.check_in, al.check_out, al.is_holiday, al.is_excused
         FROM attendance_logs al
         WHERE al.attendance_date BETWEEN ? AND ?' . $whereEmp
    );
    $select->execute($params);
    $rows = $select->fetchAll(PDO::FETCH_ASSOC);

    $updated = 0;
    if (empty($rows)) {
        return 0;
    }

    $upd = $pdo->prepare(
        'UPDATE attendance_logs SET work_hours = ?, overtime_hours = ?, late_minutes = ?,
         grace_period_late_hours_calculated = ?, late_hours_calculated = ?, early_leave_minutes = ?,
         status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );

    foreach ($rows as $row) {
        $checkIn = $row['check_in'];
        $checkOut = $row['check_out'];
        $hasValidCheckIn = !empty($checkIn) && $checkIn !== '00:00' && $checkIn !== '00:00:00';
        $hasValidCheckOut = !empty($checkOut) && $checkOut !== '00:00' && $checkOut !== '00:00:00';
        $isHolidayInt = !empty($row['is_holiday']) ? 1 : 0;
        $isExcusedInt = !empty($row['is_excused']) ? 1 : 0;
        $workHours = ($hasValidCheckIn && $hasValidCheckOut)
            ? calculateHours($checkIn, $checkOut, $row['attendance_date'], (bool)$isHolidayInt)
            : 0;

        if ($isHolidayInt) {
            $overtime = $workHours;
        } else {
            $overtime = calculateOvertimeHoursFromCheckOut($row['attendance_date'], $checkOut, 0, $checkIn, $workHours);
        }

        $lateMinutes = 0;
        $lateHours = 0;
        $isIncomplete = ($hasValidCheckIn xor $hasValidCheckOut) ? 1 : 0;
        if (!$isHolidayInt && !$isIncomplete && $hasValidCheckIn) {
            $officialStart = getSystemVar($pdo, 'official_start_time', '08:30:00');
            $graceMinutesCfg = (int)getSystemVar($pdo, 'grace_period', 5);
            $lateMinutes = computeGracePeriodLateMinutes($checkIn, $officialStart, $graceMinutesCfg);
            $lateHours = $isExcusedInt
                ? computeLatePenaltyHoursWithExcuse($lateMinutes)
                : computeLatePenaltyHours($lateMinutes, $pdo);
        }

        $earlyLeaveMinutes = 0;
        if ($hasValidCheckOut && !$isHolidayInt) {
            $officialEnd = getSystemVar($pdo, 'official_end_time', '18:30:00');
            $earlyLeaveMinutes = computeEarlyLeaveMinutes($checkOut, $officialEnd);
        }

        if ($isHolidayInt) {
            $newStatus = 'present';
        } elseif ($isIncomplete) {
            $newStatus = 'absent';
        } elseif (!$hasValidCheckIn) {
            $newStatus = 'absent';
        } elseif ($lateMinutes > 0) {
            $newStatus = 'late';
        } else {
            $newStatus = 'present';
        }

        $upd->execute([$workHours, $overtime, $lateMinutes, $lateHours, $lateHours, $earlyLeaveMinutes, $newStatus, $row['id']]);
        $updated += $upd->rowCount() > 0 ? 1 : 0;
    }

    return $updated;
}
?>

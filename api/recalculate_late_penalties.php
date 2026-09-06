<?php
/**
 * إعادة حساب غرامات التأخير لجميع سجلات الحضور
 * يطبق المنطق الجديد: حساب التأخير من نهاية فترة السماح
 */

require_once __DIR__ . '/cors_headers.php';

$host = 'localhost';
$dbname = 'timepay_unified';
$username = 'root';
$password = 'mysql';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'خطأ في الاتصال بقاعدة البيانات: ' . $e->getMessage()
    ]);
    exit;
}

// تضمين الدوال من attendance_logs.php (بدون تنفيذ الكود الرئيسي)
// نستخدم require بدلاً من require_once لتجنب مشاكل إعادة التعريف
// لكن نحتاج فقط للدوال، لذا سنستخدمها مباشرة من الملف

// دالة لجلب متغير نظام (مكررة لتجنب تضمين الملف الكامل)
function getSystemVarLocal($pdo, $key, $default = null) {
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

// دالة تنظيف الوقت
function cleanTimeStringLocal($timeString) {
    if (empty($timeString)) return '';
    $timeString = trim($timeString);
    if (strpos($timeString, ' ') !== false) {
        $parts = explode(' ', $timeString);
        $timeString = $parts[1] ?? $parts[0];
    }
    $timeString = preg_replace('/\.\d+/', '', $timeString);
    return $timeString;
}

// دالة حساب دقائق التأخير بمنطق حد أدنى:
// إذا تجاوز الحضور حد السماح، يُحسب كامل التأخير من بداية الدوام الرسمية
function computeGracePeriodLateMinutesLocal($checkInTime, $officialStartTime, $graceMinutes) {
    if (empty($checkInTime)) return 0;
    $checkInTime = cleanTimeStringLocal($checkInTime);
    try {
        $official = new DateTime($officialStartTime ?: '08:30:00');
        $checkIn = new DateTime($checkInTime);
        $graceBoundary = clone $official;
        $graceBoundary->modify("+{$graceMinutes} minutes");
        if ($checkIn <= $graceBoundary) return 0;
        $diff = $checkIn->getTimestamp() - $official->getTimestamp();
        return max(0, (int)round($diff / 60));
    } catch (Exception $e) {
        return 0;
    }
}

// دالة حساب ساعات غرامة التأخير
function computeLatePenaltyHoursLocal($graceLateMinutes, $pdo) {
    $m = (int)$graceLateMinutes;
    if ($m <= 0) return 0;
    
    $lateHourMultiplier = (float)getSystemVarLocal($pdo, 'late_hour_multiplier', 2);
    $latePartialHourThreshold = (float)getSystemVarLocal($pdo, 'late_partial_hour_threshold', 0.5);
    $latePartialHourMultiplier = (float)getSystemVarLocal($pdo, 'late_partial_hour_multiplier', 2);

    if ($m >= 60) {
        $hours = $m / 60.0;
        return $hours * $lateHourMultiplier;
    } elseif ($m > 30) {
        return 1.0 * $lateHourMultiplier;
    } else {
        return $latePartialHourThreshold * $latePartialHourMultiplier;
    }
}

// دالة حساب دقائق الانصراف المبكر بمنطق حد أدنى (مع مهلة السماح من system_variables)
function computeEarlyLeaveMinutesLocal($checkOutTime, $officialEndTime, $pdo) {
    if (empty($checkOutTime) || empty($officialEndTime)) return 0;
    $checkOutTime = cleanTimeStringLocal($checkOutTime);
    try {
        $graceMinutes = (int)getSystemVarLocal($pdo, 'early_leave_grace_minutes', 10);
        if ($graceMinutes < 0) {
            $graceMinutes = 0;
        }

        $official = new DateTime($officialEndTime ?: '18:30:00');
        $checkOut = new DateTime($checkOutTime);
        if ($checkOut >= $official) return 0;
        $rawMinutes = (int)round(($official->getTimestamp() - $checkOut->getTimestamp()) / 60);
        if ($rawMinutes <= $graceMinutes) {
            return 0;
        }

        return max(0, $rawMinutes);
    } catch (Exception $e) {
        return 0;
    }
}

try {
    // جلب إعدادات النظام
    $officialStart = getSystemVarLocal($pdo, 'official_start_time', '08:30:00');
    $officialEnd = getSystemVarLocal($pdo, 'official_end_time', '18:30:00');
    $graceMinutesCfg = (int)getSystemVarLocal($pdo, 'grace_period', 5);
    
    // جلب جميع سجلات الحضور التي لديها check_in
    $stmt = $pdo->query("
        SELECT id, employee_id, attendance_date, check_in, check_out, is_holiday, is_excused
        FROM attendance_logs
        WHERE check_in IS NOT NULL AND check_in != '' AND check_in != 'NULL'
        ORDER BY attendance_date DESC, id DESC
    ");
    
    $records = $stmt->fetchAll();
    $updated = 0;
    $errors = [];
    
    foreach ($records as $row) {
        try {
            $checkIn = $row['check_in'];
            $checkOut = $row['check_out'] ?? null;
            $isHolidayInt = !empty($row['is_holiday']) ? 1 : 0;
            $isExcusedInt = !empty($row['is_excused']) ? 1 : 0;
            
            // حساب غرامة التأخير - لا تحسب في أيام العطلات الرسمية أو إذا كان بإذن
            $lateMinutes = 0;
            $lateHours = 0;
            if (!$isHolidayInt && !$isExcusedInt) {
                $lateMinutes = computeGracePeriodLateMinutesLocal($checkIn, $officialStart, $graceMinutesCfg);
                $lateHours = computeLatePenaltyHoursLocal($lateMinutes, $pdo);
            }
            
            // حساب دقائق الانصراف المبكر (لا تحسب في العطلات الرسمية)
            $earlyLeaveMinutes = 0;
            if (!empty($checkOut) && $checkOut !== '' && $checkOut !== '00:00:00' && !$isHolidayInt) {
                $earlyLeaveMinutes = computeEarlyLeaveMinutesLocal($checkOut, $officialEnd, $pdo);
            }
            
            // تحديث السجل (التأخير + الانصراف المبكر)
            $updateStmt = $pdo->prepare('
                UPDATE attendance_logs 
                SET late_minutes = ?, 
                    grace_period_late_hours_calculated = ?, 
                    late_hours_calculated = ?,
                    early_leave_minutes = ?,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            ');
            
            $updateStmt->execute([
                $lateMinutes,
                $lateHours,
                $lateHours,
                $earlyLeaveMinutes,
                $row['id']
            ]);
            
            $updated++;
        } catch (Exception $e) {
            $errors[] = "خطأ في السجل ID {$row['id']}: " . $e->getMessage();
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => "تم تحديث {$updated} سجل (التأخير + الانصراف المبكر)",
        'updated' => $updated,
        'total' => count($records),
        'errors' => $errors
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'خطأ في إعادة الحساب: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}


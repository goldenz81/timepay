<?php
/**
 * سكريبت لإعادة حساب جميع الساعات الإضافية في سجلات الحضور
 * بناءً على وقت الانصراف الفعلي ووقت انتهاء العمل الرسمي
 */

require_once 'cors_headers.php';

$host = 'localhost';
$dbname = 'timepay_unified';
$username = 'root';
$password = 'mysql';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // دالة جلب متغير نظام
    function getSystemVar($pdo, $key, $default = null) {
        try {
            $stmt = $pdo->prepare("SELECT variable_value FROM system_variables WHERE variable_key = ? AND is_active = 1");
            $stmt->execute([$key]);
            $val = $stmt->fetchColumn();
            return $val !== false ? $val : $default;
        } catch (Exception $e) {
            return $default;
        }
    }
    
    // دالة تنظيف الوقت
    function cleanTimeString($timeString) {
        if (empty($timeString)) return '';
        // إزالة أي مسافات
        $timeString = trim($timeString);
        // إذا كان الوقت بصيغة H:i:s، إرجاعه كما هو
        if (preg_match('/^\d{1,2}:\d{2}(:\d{2})?$/', $timeString)) {
            return $timeString;
        }
        return $timeString;
    }
    
    // دالة حساب الساعات الإضافية من وقت الانصراف
    function calculateOvertimeHoursFromCheckOut($pdo, $attendanceDate, $checkOut, $isHoliday = 0) {
        // في أيام العطلات، جميع ساعات العمل تعتبر إضافية (يتم حسابها في مكان آخر)
        if ($isHoliday) {
            return 0; // سيتم حسابها بشكل منفصل
        }
        
        if (empty($attendanceDate) || empty($checkOut)) {
            return 0;
        }
        
        // جلب وقت انتهاء العمل الرسمي + مهلة بدء احتساب الإضافي
        $officialEnd = getSystemVar($pdo, 'official_end_time', '18:30:00');
        $overtimeGraceMinutes = (int)getSystemVar($pdo, 'overtime_start_grace_minutes', 15);
        if ($overtimeGraceMinutes < 0) {
            $overtimeGraceMinutes = 0;
        }
        
        try {
            // تنظيف وقت الانصراف
            $checkOut = cleanTimeString($checkOut);
            
            // تحويل الأوقات إلى DateTime objects
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
            return round(($diffSeconds / 3600), 2);
        } catch (Exception $e) {
            error_log("Error calculating overtime from check out: " . $e->getMessage());
            return 0;
        }
    }
    
    echo "بدء إعادة حساب الساعات الإضافية لجميع سجلات الحضور...\n\n";
    
    // جلب جميع سجلات الحضور التي لديها check_in و check_out
    $stmt = $pdo->query("
        SELECT id, attendance_date, check_in, check_out, is_holiday, work_hours, overtime_hours
        FROM attendance_logs
        WHERE check_in IS NOT NULL AND check_out IS NOT NULL
        ORDER BY attendance_date, id
    ");
    
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $totalRecords = count($records);
    $updated = 0;
    $unchanged = 0;
    $errors = 0;
    
    echo "تم العثور على {$totalRecords} سجل\n\n";
    
    foreach ($records as $record) {
        try {
            $id = $record['id'];
            $attendanceDate = $record['attendance_date'];
            $checkOut = $record['check_out'];
            $isHoliday = (int)$record['is_holiday'];
            $oldOvertime = (float)$record['overtime_hours'];
            $workHours = (float)$record['work_hours'];
            
            // حساب الساعات الإضافية الجديدة
            if ($isHoliday) {
                // في أيام العطلات، جميع ساعات العمل تعتبر إضافية
                $newOvertime = $workHours;
            } else {
                // حساب الساعات الإضافية من وقت الانصراف الفعلي بعد وقت انتهاء العمل الرسمي
                $newOvertime = calculateOvertimeHoursFromCheckOut($pdo, $attendanceDate, $checkOut, $isHoliday);
            }
            
            // تحديث فقط إذا كانت القيمة مختلفة
            if (abs($newOvertime - $oldOvertime) > 0.01) {
                $updateStmt = $pdo->prepare("UPDATE attendance_logs SET overtime_hours = ? WHERE id = ?");
                $updateStmt->execute([$newOvertime, $id]);
                
                echo "✓ تم تحديث السجل #{$id} ({$attendanceDate}): {$oldOvertime} → {$newOvertime} ساعة\n";
                $updated++;
            } else {
                $unchanged++;
            }
        } catch (Exception $e) {
            echo "✗ خطأ في تحديث السجل #{$record['id']}: " . $e->getMessage() . "\n";
            $errors++;
        }
    }
    
    echo "\n";
    echo "✓ تم إكمال العملية!\n";
    echo "  - تم تحديث: {$updated} سجل\n";
    echo "  - لم يتغير: {$unchanged} سجل\n";
    if ($errors > 0) {
        echo "  - أخطاء: {$errors} سجل\n";
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'تم إعادة حساب الساعات الإضافية بنجاح',
        'updated' => $updated,
        'unchanged' => $unchanged,
        'errors' => $errors,
        'total' => $totalRecords
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'خطأ: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_UNESCAPED_UNICODE);
}

<?php
/**
 * سكريبت لتحديث early_leave_minutes لسجل محدد
 */

require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/attendance_logs.php';

try {
    $pdo = Database::connect();
    
    // السجل المحدد: 20/12/2025 للموظف EMP_TEST_002
    $employeeCode = 'EMP_TEST_002';
    $attendanceDate = '2025-12-20';
    
    // جلب السجل
    $stmt = $pdo->prepare("
        SELECT a.id, a.employee_id, a.attendance_date, a.check_out, a.is_holiday, a.is_excused, a.early_leave_minutes
        FROM attendance_logs a
        JOIN employees e ON a.employee_id = e.id
        WHERE e.employee_code = ?
        AND DATE(a.attendance_date) = ?
    ");
    $stmt->execute([$employeeCode, $attendanceDate]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$record) {
        echo json_encode([
            'success' => false,
            'error' => 'السجل غير موجود'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    echo "=== قبل التحديث ===\n";
    echo json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";
    
    $officialEnd = getSystemVar($pdo, 'official_end_time', '18:30:00');
    $isHolidayInt = !empty($record['is_holiday']) ? 1 : 0;
    $isExcusedInt = !empty($record['is_excused']) ? 1 : 0;
    $checkOut = $record['check_out'];
    
    echo "official_end_time: {$officialEnd}\n";
    echo "check_out: {$checkOut}\n";
    echo "is_holiday: {$isHolidayInt}\n";
    echo "is_excused: {$isExcusedInt}\n\n";
    
    // حساب الانصراف المبكر - يُحسب دائماً إذا سجل خروج قبل موعد انتهاء العمل (الإذن خاص بتسجيل الحضور فقط وليس للانصراف المبكر)
    $earlyLeaveMinutes = 0;
    if (!empty($checkOut) && $checkOut != '00:00:00' && !$isHolidayInt) {
        $earlyLeaveMinutes = computeEarlyLeaveMinutes($checkOut, $officialEnd);
        echo "computed early_leave_minutes: {$earlyLeaveMinutes}\n\n";
    } else {
        echo "Skipping calculation - checkOut empty or holiday\n\n";
    }
    
    // تحديث السجل
    $updateStmt = $pdo->prepare("UPDATE attendance_logs SET early_leave_minutes = ? WHERE id = ?");
    $updateStmt->execute([$earlyLeaveMinutes, $record['id']]);
    
    // التحقق من التحديث
    $stmt->execute([$employeeCode, $attendanceDate]);
    $updatedRecord = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "=== بعد التحديث ===\n";
    echo json_encode($updatedRecord, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";
    
    echo json_encode([
        'success' => true,
        'message' => "تم تحديث السجل بنجاح",
        'before' => $record,
        'after' => $updatedRecord,
        'early_leave_minutes' => $earlyLeaveMinutes
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_UNESCAPED_UNICODE);
}


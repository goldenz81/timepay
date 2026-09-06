<?php
/**
 * سكريبت لإعادة حساب early_leave_minutes لجميع سجلات الحضور
 */

require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/attendance_logs.php';

try {
    $pdo = Database::connect();
    
    // جلب جميع سجلات الحضور التي لديها check_out (بما في ذلك السجلات التي تم تحديثها مسبقاً)
    $stmt = $pdo->query("
        SELECT id, employee_id, attendance_date, check_out, is_holiday, is_excused, status, early_leave_minutes
        FROM attendance_logs
        WHERE check_out IS NOT NULL
        AND check_out != ''
        AND check_out != '00:00:00'
        AND status != 'absent'
        ORDER BY attendance_date DESC, id DESC
    ");
    
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $updated = 0;
    $errors = 0;
    
    $officialEnd = getSystemVar($pdo, 'official_end_time', '18:30:00');
    
    foreach ($records as $record) {
        try {
            $isHolidayInt = !empty($record['is_holiday']) ? 1 : 0;
            $checkOut = $record['check_out'];
            
            // حساب الانصراف المبكر - يُحسب حتى لو كان بإذن (للإعلام والخصم)
            $earlyLeaveMinutes = 0;
            if (!empty($checkOut) && $checkOut != '00:00:00' && !$isHolidayInt) {
                $earlyLeaveMinutes = computeEarlyLeaveMinutes($checkOut, $officialEnd);
            }
            
            // تحديث السجل حتى لو كانت القيمة 0 (لضمان التحديث)
            $updateStmt = $pdo->prepare("UPDATE attendance_logs SET early_leave_minutes = ? WHERE id = ?");
            $updateStmt->execute([$earlyLeaveMinutes, $record['id']]);
            
            if ($updateStmt->rowCount() > 0) {
                $updated++;
            } else {
                // إذا لم يتم تحديث السجل، قد يكون القيمة نفسها
                // لكننا نريد التأكد من التحديث
                error_log("Record {$record['id']} not updated - check_out: {$checkOut}, is_holiday: {$isHolidayInt}, early_leave_minutes: {$earlyLeaveMinutes}");
            }
        } catch (Exception $e) {
            $errors++;
            error_log("Error updating record {$record['id']}: " . $e->getMessage());
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => "تم تحديث {$updated} سجل بنجاح",
        'updated' => $updated,
        'errors' => $errors,
        'total' => count($records)
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}


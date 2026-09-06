<?php
/**
 * إعادة حساب الحالة لجميع سجلات الحضور التي لديها تأخير مع أذن
 * الحالة يجب أن تكون "late" حتى مع وجود أذن إذا كان هناك تأخير
 */

require_once 'cors_headers.php';

// إعدادات قاعدة البيانات
$host = 'localhost';
$dbname = 'timepay_unified';
$username = 'root';
$password = 'mysql';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "بدء إعادة حساب الحالة لسجلات الحضور...\n\n";
    
    // جلب جميع سجلات الحضور التي لديها تأخير مع أذن
    $stmt = $pdo->query("
        SELECT 
            id,
            employee_id,
            attendance_date,
            check_in,
            check_out,
            status,
            is_holiday,
            is_excused,
            late_minutes
        FROM attendance_logs
        WHERE is_excused = 1
        AND is_holiday = 0
        AND check_in IS NOT NULL
        AND check_in != ''
        AND check_in != '00:00:00'
        AND check_in != '00:00'
        AND (
            late_minutes > 0 
            OR status = 'present'
        )
        ORDER BY attendance_date DESC
    ");
    
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $updated = 0;
    $skipped = 0;
    
    // دالة حساب التأخير
    function computeGracePeriodLateMinutes($checkInTime, $officialStart, $graceMinutes) {
        if (empty($checkInTime) || empty($officialStart)) return 0;
        
        try {
            $checkIn = new DateTime($checkInTime);
            $official = new DateTime($officialStart);
            $graceEnd = clone $official;
            $graceEnd->modify("+{$graceMinutes} minutes");
            
            if ($checkIn <= $graceEnd) return 0;
            
            $diff = $checkIn->getTimestamp() - $graceEnd->getTimestamp();
            return max(0, (int)round($diff / 60));
        } catch (Exception $e) {
            return 0;
        }
    }
    
    // جلب إعدادات النظام
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
    
    $officialStart = getSystemVar($pdo, 'official_start_time', '08:30:00');
    $gracePeriod = (int)getSystemVar($pdo, 'grace_period', 5);
    
    foreach ($records as $record) {
        $checkIn = $record['check_in'];
        $isHoliday = (int)$record['is_holiday'];
        $isExcused = (int)$record['is_excused'];
        $currentStatus = $record['status'];
        
        // حساب التأخير
        $lateMinutes = 0;
        if (!$isHoliday && !empty($checkIn) && $checkIn !== '00:00' && $checkIn !== '00:00:00') {
            $lateMinutes = computeGracePeriodLateMinutes($checkIn, $officialStart, $gracePeriod);
        }
        
        // حساب الحالة الجديدة
        $newStatus = 'present';
        if (empty($checkIn) || $checkIn === '00:00' || $checkIn === '00:00:00') {
            $newStatus = 'absent';
        } elseif ($isHoliday) {
            $newStatus = 'present';
        } elseif ($lateMinutes > 0) {
            // إذا كان هناك تأخير (حتى مع وجود أذن)، فالحالة = late
            $newStatus = 'late';
        } else {
            $newStatus = 'present';
        }
        
        // تحديث الحالة فقط إذا كانت مختلفة
        if ($newStatus !== $currentStatus) {
            $updateStmt = $pdo->prepare("UPDATE attendance_logs SET status = ? WHERE id = ?");
            $updateStmt->execute([$newStatus, $record['id']]);
            
            echo "✓ تم تحديث السجل ID: {$record['id']} - الموظف: {$record['employee_id']} - التاريخ: {$record['attendance_date']}\n";
            echo "  الحالة القديمة: {$currentStatus} → الحالة الجديدة: {$newStatus}\n";
            echo "  التأخير: {$lateMinutes} دقيقة\n\n";
            $updated++;
        } else {
            $skipped++;
        }
    }
    
    echo "\n=== ملخص التحديث ===\n";
    echo "تم تحديث: {$updated} سجل\n";
    echo "تم تخطي: {$skipped} سجل (الحالة صحيحة بالفعل)\n";
    echo "إجمالي السجلات المفحوصة: " . count($records) . "\n";
    
} catch (PDOException $e) {
    echo "خطأ في الاتصال بقاعدة البيانات: " . $e->getMessage() . "\n";
    exit(1);
}


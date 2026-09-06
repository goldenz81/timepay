<?php
/**
 * إصلاح جدول fingerprint_attendance للسماح بتخزين سجلات متعددة
 */

require_once 'api/cors_headers.php';
require_once 'api/config.php';

try {
    echo "بدء إصلاح جدول fingerprint_attendance...\n";

    // التحقق من وجود القيد الفريد
    $stmt = $pdo->query("SHOW INDEX FROM fingerprint_attendance WHERE Key_name = 'unique_attendance'");
    $hasUniqueConstraint = $stmt->rowCount() > 0;

    if ($hasUniqueConstraint) {
        echo "إزالة القيد الفريد...\n";
        $pdo->exec("ALTER TABLE fingerprint_attendance DROP INDEX unique_attendance");
        echo "تم إزالة القيد الفريد بنجاح\n";
    } else {
        echo "القيد الفريد غير موجود\n";
    }

    // التحقق من وجود الفهرس العادي
    $stmt = $pdo->query("SHOW INDEX FROM fingerprint_attendance WHERE Key_name = 'idx_attendance'");
    $hasIndex = $stmt->rowCount() > 0;

    if (!$hasIndex) {
        echo "إضافة الفهرس العادي...\n";
        $pdo->exec("ALTER TABLE fingerprint_attendance ADD INDEX idx_attendance (ac_no, attendance_date)");
        echo "تم إضافة الفهرس بنجاح\n";
    } else {
        echo "الفهرس موجود بالفعل\n";
    }

    // التحقق من وجود عمود sequence_number
    $stmt = $pdo->query("DESCRIBE fingerprint_attendance");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $hasSequenceColumn = in_array('sequence_number', $columns);

    if (!$hasSequenceColumn) {
        echo "إضافة عمود sequence_number...\n";
        $pdo->exec("ALTER TABLE fingerprint_attendance ADD COLUMN sequence_number INT DEFAULT 1 AFTER id");
        echo "تم إضافة العمود بنجاح\n";
    } else {
        echo "عمود sequence_number موجود بالفعل\n";
    }

    echo "تم إصلاح الجدول بنجاح!\n";
    echo "الآن يمكن تخزين سجلات متعددة للموظف في نفس اليوم\n";

} catch (Exception $e) {
    echo "خطأ في إصلاح الجدول: " . $e->getMessage() . "\n";
}
?>
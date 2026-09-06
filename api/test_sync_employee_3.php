<?php
require_once 'config_unified.php';

try {
    // إضافة سجل تجريبي للموظف رقم 3
    $stmt = $pdo->prepare("
        INSERT INTO fingerprint_attendance (
            ac_no, attendance_date, clock_in, clock_out, work_time, ot_time, late_time, early_time, employee_name, department
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    // سجل لليوم الحالي
    $today = date('Y-m-d');
    $stmt->execute([
        '3', // AC-No للموظف رقم 3
        $today,
        '08:45:00',
        '18:30:00',
        null, // null - سيتم حسابه تلقائياً
        null, // null - سيتم حسابه تلقائياً
        null, // null - سيتم حسابه تلقائياً
        null, // null - سيتم حسابه تلقائياً
        'Test Employee',
        'Test Department'
    ]);

    echo "تم إضافة سجل تجريبي للموظف رقم 3\n";

    // الآن جرب المزامنة
    echo "جاري تشغيل المزامنة...\n";

    require_once 'fingerprint_system_integration.php';

    $integration = new FingerprintSystemIntegration($pdo);
    $result = $integration->syncAttendanceDetailed();

    echo "نتيجة المزامنة:\n";
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo "خطأ: " . $e->getMessage() . "\n";
}
?>
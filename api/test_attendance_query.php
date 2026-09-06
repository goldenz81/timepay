<?php
require_once 'cors_headers.php';
require_once 'config_unified.php';

try {
    // اختبار الاستعلام المشكوك فيه
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
        LIMIT 5
    ");

    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'message' => 'الاستعلام نجح',
        'count' => count($results),
        'data' => $results
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في الاستعلام: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_UNESCAPED_UNICODE);
}
?>
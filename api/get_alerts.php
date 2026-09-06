<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $config = require_once '../config/database_config.php';
    
    $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
    $username = $config['username'];
    $password = $config['password'];
    $options = $config['options'];
    
    $pdo = new PDO($dsn, $username, $password, $options);
    
    $alerts = [];
    $today = date('Y-m-d');
    
    // 1. الموظفون الذين لم يسجلوا دخول اليوم
    $stmt = $pdo->prepare("
        SELECT e.id, e.Name as employee_name, e.`AC-No.` as employee_code, e.Department as department
        FROM employees e
        LEFT JOIN attendance_logs al ON e.id = al.employee_id AND al.attendance_date = ?
        WHERE al.id IS NULL OR al.check_in_time IS NULL OR al.check_in_time = 'NULL'
    ");
    $stmt->execute([$today]);
    $noCheckIn = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($noCheckIn as $employee) {
        $alerts[] = [
            'type' => 'warning',
            'title' => 'لم يسجل دخول',
            'message' => $employee['employee_name'] . ' (' . $employee['employee_code'] . ')',
            'department' => $employee['department'],
            'time' => date('H:i'),
            'icon' => 'FiUserX'
        ];
    }
    
    // 2. الموظفون الذين لم يسجلوا خروج أمس
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    $stmt = $pdo->prepare("
        SELECT e.id, e.Name as employee_name, e.`AC-No.` as employee_code, e.Department as department, al.check_in_time as clock_in
        FROM employees e
        JOIN attendance_logs al ON e.id = al.employee_id AND al.attendance_date = ?
        WHERE al.check_out_time IS NULL OR al.check_out_time = 'NULL'
    ");
    $stmt->execute([$yesterday]);
    $noCheckOut = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($noCheckOut as $employee) {
        $alerts[] = [
            'type' => 'error',
            'title' => 'لم يسجل خروج أمس',
            'message' => $employee['employee_name'] . ' (' . $employee['employee_code'] . ')',
            'department' => $employee['department'],
            'time' => date('H:i'),
            'icon' => 'FiClock'
        ];
    }
    
    // 3. الموظفون المتأخرون اليوم
    $stmt = $pdo->prepare("
        SELECT e.Name as employee_name, e.`AC-No.` as employee_code, e.Department as department, al.check_in_time as clock_in
        FROM employees e
        JOIN attendance_logs al ON e.id = al.employee_id AND al.attendance_date = ?
        WHERE al.check_in_time IS NOT NULL AND al.check_in_time != 'NULL' AND TIME(al.check_in_time) > '09:00:00'
    ");
    $stmt->execute([$today]);
    $lateEmployees = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($lateEmployees as $employee) {
        $alerts[] = [
            'type' => 'info',
            'title' => 'تأخر في الحضور',
            'message' => $employee['employee_name'] . ' (' . $employee['employee_code'] . ') - ' . $employee['clock_in'],
            'department' => $employee['department'],
            'time' => date('H:i'),
            'icon' => 'FiAlertTriangle'
        ];
    }
    
    // 4. طلبات الإجازة المعلقة (إذا كان هناك جدول للطلبات)
    $pendingLeaveRequests = 0;
    try {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM leave_requests WHERE status = 'pending'");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $pendingLeaveRequests = $result['count'] ?? 0;
        
        if ($pendingLeaveRequests > 0) {
            $alerts[] = [
                'type' => 'warning',
                'title' => 'طلبات إجازة معلقة',
                'message' => $pendingLeaveRequests . ' طلب إجازة في انتظار الموافقة',
                'department' => 'الموارد البشرية',
                'time' => date('H:i'),
                'icon' => 'FiFileText'
            ];
        }
    } catch (Exception $e) {
        // جدول طلبات الإجازة غير موجود
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'alerts' => $alerts,
            'pendingLeaveRequests' => $pendingLeaveRequests,
            'totalAlerts' => count($alerts)
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في تحميل التنبيهات: ' . $e->getMessage(),
        'data' => [
            'alerts' => [],
            'pendingLeaveRequests' => 0,
            'totalAlerts' => 0
        ]
    ]);
}
?>

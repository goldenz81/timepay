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
    
    $activities = [];
    
    // 1. آخر تسجيلات الحضور (آخر 10)
    $stmt = $pdo->prepare("
        SELECT 
            al.employee_id,
            e.Name as employee_name,
            e.employee_code,
            e.Department as department,
            al.attendance_date,
            al.check_in_time as clock_in,
            al.check_out_time as clock_out,
            al.created_at,
            CASE 
                WHEN al.check_in_time IS NOT NULL AND al.check_in_time != 'NULL' AND al.check_out_time IS NOT NULL AND al.check_out_time != 'NULL' THEN 'checkout'
                WHEN al.check_in_time IS NOT NULL AND al.check_in_time != 'NULL' THEN 'checkin'
                ELSE 'unknown'
            END as action_type
        FROM attendance_logs al
        JOIN employees e ON al.employee_id = e.id
        ORDER BY al.created_at DESC
        LIMIT 10
    ");
    $stmt->execute();
    $attendanceActivities = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($attendanceActivities as $activity) {
        $time = $activity['action_type'] === 'checkout' ? $activity['clock_out'] : $activity['clock_in'];
        $actionText = $activity['action_type'] === 'checkout' ? 'تسجيل خروج' : 'تسجيل دخول';
        
        $activities[] = [
            'type' => 'attendance',
            'title' => $actionText,
            'message' => $activity['employee_name'] . ' (' . $activity['employee_code'] . ')',
            'department' => $activity['department'],
            'time' => $time,
            'date' => $activity['attendance_date'],
            'icon' => $activity['action_type'] === 'checkout' ? 'FiLogOut' : 'FiLogIn',
            'created_at' => $activity['created_at']
        ];
    }
    
    // 2. آخر الإضافات للموظفين (آخر 5)
    $stmt = $pdo->prepare("
        SELECT employee_name, employee_code, department, created_at
        FROM employees
        ORDER BY created_at DESC
        LIMIT 5
    ");
    $stmt->execute();
    $newEmployees = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($newEmployees as $employee) {
        $activities[] = [
            'type' => 'employee',
            'title' => 'إضافة موظف جديد',
            'message' => $employee['employee_name'] . ' (' . $employee['employee_code'] . ')',
            'department' => $employee['department'],
            'time' => date('H:i', strtotime($employee['created_at'])),
            'date' => date('Y-m-d', strtotime($employee['created_at'])),
            'icon' => 'FiUserPlus',
            'created_at' => $employee['created_at']
        ];
    }
    
    // 3. آخر التعديلات على الرواتب (إذا كان هناك جدول للرواتب)
    try {
        $stmt = $pdo->prepare("
            SELECT e.employee_name, e.employee_code, e.department, s.updated_at
            FROM salary_calculations s
            JOIN employees e ON s.employee_id = e.id
            ORDER BY s.updated_at DESC
            LIMIT 5
        ");
        $stmt->execute();
        $salaryUpdates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($salaryUpdates as $salary) {
            $activities[] = [
                'type' => 'salary',
                'title' => 'تحديث الراتب',
                'message' => $salary['employee_name'] . ' (' . $salary['employee_code'] . ')',
                'department' => $salary['department'],
                'time' => date('H:i', strtotime($salary['updated_at'])),
                'date' => date('Y-m-d', strtotime($salary['updated_at'])),
                'icon' => 'FiDollarSign',
                'created_at' => $salary['updated_at']
            ];
        }
    } catch (Exception $e) {
        // جدول الرواتب غير موجود أو لا يحتوي على updated_at
    }
    
    // ترتيب الأنشطة حسب التاريخ
    usort($activities, function($a, $b) {
        return strtotime($b['created_at']) - strtotime($a['created_at']);
    });
    
    // أخذ آخر 15 نشاط فقط
    $activities = array_slice($activities, 0, 15);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'activities' => $activities,
            'totalActivities' => count($activities)
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في تحميل الأنشطة: ' . $e->getMessage(),
        'data' => [
            'activities' => [],
            'totalActivities' => 0
        ]
    ]);
}
?>

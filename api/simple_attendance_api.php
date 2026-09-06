<?php
// API مبسط للحضور
require_once 'cors_headers.php';

// استخدام إعدادات قاعدة البيانات الديناميكية
require_once 'config_unified.php'; // يستخدم إعدادات قاعدة البيانات الديناميكية

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'get_attendance':
        try {
            // جلب سجلات الحضور من كلا الجدولين
            $stmt = $pdo->query("
                (
                    SELECT 
                        al.id,
                        al.employee_id,
                        e.name as Name,
                        e.employee_code,
                        e.department,
                        d.description as department_description,
                        e.cost_center,
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
                        al.is_excused
                    FROM attendance_logs al
                    LEFT JOIN employees e ON al.employee_id = e.id
                    LEFT JOIN departments d ON e.department = d.name
                )
                UNION ALL
                (
                    SELECT 
                        fa.id,
                        fa.ac_no as employee_id,
                        fa.employee_name as Name,
                        fa.ac_no as employee_code,
                        fa.department,
                        d.description as department_description,
                        '' as cost_center,
                        'Monthly' as salary_type,
                        fa.attendance_date,
                        fa.clock_in as check_in_time,
                        fa.clock_out as check_out_time,
                        CASE 
                            WHEN fa.work_time IS NOT NULL 
                            THEN TIME_TO_SEC(fa.work_time) / 3600 
                            WHEN fa.clock_in IS NOT NULL AND fa.clock_out IS NOT NULL 
                            THEN TIMESTAMPDIFF(MINUTE, fa.clock_in, fa.clock_out) / 60 
                            ELSE 0 
                        END as total_hours,
                        CASE 
                            WHEN fa.ot_time IS NOT NULL 
                            THEN TIME_TO_SEC(fa.ot_time) / 3600 
                            ELSE 0 
                        END as overtime_hours,
                        CASE 
                            WHEN fa.is_absent = 1 THEN 'absent'
                            ELSE 'present'
                        END as status,
                        '' as notes,
                        'fingerprint' as source_type,
                        fa.created_at,
                        CASE 
                            WHEN fa.late_time IS NOT NULL 
                            THEN TIME_TO_SEC(fa.late_time) / 60 
                            ELSE 0 
                        END as late_minutes,
                        CASE 
                            WHEN fa.early_time IS NOT NULL 
                            THEN TIME_TO_SEC(fa.early_time) / 60 
                            ELSE 0 
                        END as early_leave_minutes,
                        0 as is_holiday,
                        0 as is_excused
                    FROM fingerprint_attendance fa
                    LEFT JOIN departments d ON fa.department = d.name
                )
                ORDER BY attendance_date DESC, created_at DESC
            ");
            
            $records = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'data' => $records
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'error' => 'خطأ في جلب سجلات الحضور: ' . $e->getMessage()
            ]);
        }
        break;
        
    case 'get_employees':
        try {
            $stmt = $pdo->query("
                SELECT 
                    e.id,
                    e.employee_code,
                    e.name,
                    e.name_ar,
                    e.department,
                    e.cost_center,
                    e.salary_type,
                    e.status
                FROM employees e
                WHERE e.status = 'active'
                ORDER BY e.name
            ");
            
            $employees = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'data' => $employees
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'error' => 'خطأ في جلب الموظفين: ' . $e->getMessage()
            ]);
        }
        break;
        
    case 'get_departments':
        try {
            $stmt = $pdo->query("
                SELECT 
                    d.id,
                    d.name,
                    d.description,
                    d.status
                FROM departments d
                WHERE d.status = 'active'
                ORDER BY d.name
            ");
            
            $departments = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'data' => $departments
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'error' => 'خطأ في جلب الأقسام: ' . $e->getMessage()
            ]);
        }
        break;
        
    case 'get_employee_attendance':
        try {
            $employee_id = $input['employee_id'] ?? $_GET['employee_id'] ?? '';
            $salary_type = $input['salary_type'] ?? $_GET['salary_type'] ?? '';
            
            if (empty($employee_id) || empty($salary_type)) {
                throw new Exception('معرف الموظف ونوع الراتب مطلوبان');
            }
            
            $dateCondition = '';
            if ($salary_type === 'Monthly') {
                // للموظفين الشهريين: من أول الشهر حتى اليوم
                $dateCondition = "AND attendance_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND attendance_date <= CURDATE()";
            } elseif ($salary_type === 'Weekly') {
                // للموظفين الأسبوعيين: من السبت إلى الخميس
                $dateCondition = "AND attendance_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) 
                                 AND attendance_date <= DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 4 DAY)";
            }
            
            $stmt = $pdo->prepare("
                (
                    SELECT 
                        al.id,
                        al.employee_id,
                        e.name as Name,
                        e.employee_code,
                        e.department,
                        e.cost_center,
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
                        al.is_excused
                    FROM attendance_logs al
                    LEFT JOIN employees e ON al.employee_id = e.id
                    WHERE al.employee_id = ? $dateCondition
                )
                UNION ALL
                (
                    SELECT 
                        fa.id,
                        fa.ac_no as employee_id,
                        fa.employee_name as Name,
                        fa.ac_no as employee_code,
                        fa.department,
                        '' as cost_center,
                        'Monthly' as salary_type,
                        fa.attendance_date,
                        fa.clock_in as check_in_time,
                        fa.clock_out as check_out_time,
                        CASE 
                            WHEN fa.work_time IS NOT NULL 
                            THEN TIME_TO_SEC(fa.work_time) / 3600 
                            WHEN fa.clock_in IS NOT NULL AND fa.clock_out IS NOT NULL 
                            THEN TIMESTAMPDIFF(MINUTE, fa.clock_in, fa.clock_out) / 60 
                            ELSE 0 
                        END as total_hours,
                        CASE 
                            WHEN fa.ot_time IS NOT NULL 
                            THEN TIME_TO_SEC(fa.ot_time) / 3600 
                            ELSE 0 
                        END as overtime_hours,
                        CASE 
                            WHEN fa.is_absent = 1 THEN 'absent'
                            ELSE 'present'
                        END as status,
                        '' as notes,
                        'fingerprint' as source_type,
                        fa.created_at,
                        CASE 
                            WHEN fa.late_time IS NOT NULL 
                            THEN TIME_TO_SEC(fa.late_time) / 60 
                            ELSE 0 
                        END as late_minutes,
                        CASE 
                            WHEN fa.early_time IS NOT NULL 
                            THEN TIME_TO_SEC(fa.early_time) / 60 
                            ELSE 0 
                        END as early_leave_minutes,
                        0 as is_holiday,
                        0 as is_excused
                    FROM fingerprint_attendance fa
                    WHERE fa.ac_no = ? $dateCondition
                )
                ORDER BY attendance_date ASC
            ");
            
            $stmt->execute([$employee_id, $employee_id]);
            $records = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'data' => $records,
                'employee_id' => $employee_id,
                'salary_type' => $salary_type,
                'period_type' => $salary_type === 'Monthly' ? 'شهري' : 'أسبوعي'
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'error' => 'خطأ في جلب سجلات الحضور: ' . $e->getMessage()
            ]);
        }
        break;
        
    case 'get_current_date_info':
        try {
            $currentDate = date('Y-m-d');
            $currentMonth = date('Y-m');
            $currentYear = date('Y');
            $currentDay = date('d');
            $currentMonthName = date('F');
            $currentDayName = date('l');
            
            // حساب بداية ونهاية الأسبوع (السبت إلى الخميس)
            $weekStart = date('Y-m-d', strtotime('last saturday'));
            $weekEnd = date('Y-m-d', strtotime('thursday'));
            
            // إذا كان اليوم السبت، استخدم السبت الحالي
            if (date('l') === 'Saturday') {
                $weekStart = $currentDate;
            }
            
            // إذا كان اليوم بعد الخميس، استخدم الأسبوع القادم
            if (date('l') === 'Friday' || date('l') === 'Saturday') {
                $weekStart = date('Y-m-d', strtotime('next saturday'));
                $weekEnd = date('Y-m-d', strtotime('next thursday'));
            }
            
            // حساب بداية الشهر
            $monthStart = date('Y-m-01');
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'current_date' => $currentDate,
                    'current_month' => $currentMonth,
                    'current_year' => $currentYear,
                    'current_day' => $currentDay,
                    'current_month_name' => $currentMonthName,
                    'current_day_name' => $currentDayName,
                    'week_start' => $weekStart,
                    'week_end' => $weekEnd,
                    'month_start' => $monthStart,
                    'week_period' => $weekStart . ' إلى ' . $weekEnd,
                    'month_period' => $monthStart . ' إلى ' . $currentDate
                ]
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'error' => 'خطأ في جلب معلومات التاريخ: ' . $e->getMessage()
            ]);
        }
        break;
        
    default:
        echo json_encode([
            'success' => false,
            'error' => 'إجراء غير معروف'
        ]);
        break;
}
?>

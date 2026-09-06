<?php
/**
 * سكريبت لفحص حساب أجر الإضافي للراتب الشهري
 * للفترة من 2025-12-20 إلى 2025-12-26
 */

// تضمين ملف CORS المشترك
require_once 'cors_headers.php';

// إعدادات قاعدة البيانات
$host = 'localhost';
$dbname = 'timepay_unified';
$username = 'root';
$password = 'mysql';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'خطأ في الاتصال بقاعدة البيانات: ' . $e->getMessage()
    ]);
    exit;
}

// الفترة المحددة
$startDate = '2025-12-20';
$endDate = '2025-12-26';

try {
    // جلب جميع سجلات الحضور للفترة المحددة مع تفاصيل الإضافي للموظف المحدد
    $stmt = $pdo->prepare("
        SELECT 
            al.id,
            al.employee_id,
            al.attendance_date,
            al.check_in,
            al.check_out,
            al.work_hours,
            al.overtime_hours,
            al.is_holiday,
            al.status,
            e.name as employee_name,
            e.employee_code,
            e.base_salary,
            e.salary_type
        FROM attendance_logs al
        JOIN employees e ON al.employee_id = e.id
        WHERE al.attendance_date BETWEEN ? AND ?
        AND e.employee_code = 'EMP_TEST_001'
        AND e.salary_type = 'Monthly'
        ORDER BY al.attendance_date ASC
    ");
    
    $stmt->execute([$startDate, $endDate]);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // جلب إعدادات النظام
    $stmt_vars = $pdo->query("SELECT variable_key, variable_value FROM system_variables WHERE is_active = 1");
    $systemVariables = $stmt_vars->fetchAll(PDO::FETCH_KEY_PAIR);
    
    $monthlyWorkDays = $systemVariables['monthly_work_days'] ?? 26;
    $dailyWorkHours = $systemVariables['daily_work_hours'] ?? 8;
    $regularOvertimeMultiplier = $systemVariables['regular_overtime_multiplier'] ?? 1.5;
    $holidayWorkMultiplier = $systemVariables['holiday_work_multiplier'] ?? 2.0;
    
    // تجميع البيانات حسب الموظف
    $employeesData = [];
    
    foreach ($records as $record) {
        $empId = $record['employee_id'];
        if (!isset($employeesData[$empId])) {
            $employeesData[$empId] = [
                'employee_id' => $empId,
                'employee_code' => $record['employee_code'],
                'employee_name' => $record['employee_name'],
                'base_salary' => $record['base_salary'],
                'records' => [],
                'regular_overtime_hours' => 0,
                'holiday_overtime_hours' => 0,
                'total_overtime_hours' => 0
            ];
        }
        
        $isHoliday = !empty($record['is_holiday']) ? (int)$record['is_holiday'] : 0;
        $overtimeHours = (float)$record['overtime_hours'];
        
        $employeesData[$empId]['records'][] = [
            'date' => $record['attendance_date'],
            'check_in' => $record['check_in'],
            'check_out' => $record['check_out'],
            'work_hours' => $record['work_hours'],
            'overtime_hours' => $overtimeHours,
            'is_holiday' => $isHoliday,
            'status' => $record['status']
        ];
        
        if ($isHoliday) {
            $employeesData[$empId]['holiday_overtime_hours'] += $overtimeHours;
        } else {
            $employeesData[$empId]['regular_overtime_hours'] += $overtimeHours;
        }
        $employeesData[$empId]['total_overtime_hours'] += $overtimeHours;
    }
    
    // حساب الأجر لكل موظف
    $results = [];
    foreach ($employeesData as $empId => $empData) {
        $baseSalary = (float)$empData['base_salary'];
        $dailyWage = $baseSalary / $monthlyWorkDays;
        $hourlyWage = $dailyWage / $dailyWorkHours;
        
        $regularOvertimeHours = $empData['regular_overtime_hours'];
        $holidayOvertimeHours = $empData['holiday_overtime_hours'];
        $totalOvertimeHours = $empData['total_overtime_hours'];
        
        // حساب أجر الإضافي
        $regularOvertimePay = $regularOvertimeHours * $hourlyWage * $regularOvertimeMultiplier;
        $holidayOvertimePay = $holidayOvertimeHours * $hourlyWage * $holidayWorkMultiplier;
        $totalOvertimePay = $regularOvertimePay + $holidayOvertimePay;
        
        $results[] = [
            'employee_id' => $empId,
            'employee_code' => $empData['employee_code'],
            'employee_name' => $empData['employee_name'],
            'base_salary' => $baseSalary,
            'monthly_work_days' => $monthlyWorkDays,
            'daily_work_hours' => $dailyWorkHours,
            'daily_wage' => round($dailyWage, 4),
            'hourly_wage' => round($hourlyWage, 4),
            'regular_overtime_multiplier' => $regularOvertimeMultiplier,
            'holiday_work_multiplier' => $holidayWorkMultiplier,
            'regular_overtime_hours' => round($regularOvertimeHours, 2),
            'holiday_overtime_hours' => round($holidayOvertimeHours, 2),
            'total_overtime_hours' => round($totalOvertimeHours, 2),
            'regular_overtime_pay_calculation' => round($regularOvertimeHours, 2) . " × " . round($hourlyWage, 4) . " × {$regularOvertimeMultiplier} = " . round($regularOvertimePay, 2),
            'holiday_overtime_pay_calculation' => round($holidayOvertimeHours, 2) . " × " . round($hourlyWage, 4) . " × {$holidayWorkMultiplier} = " . round($holidayOvertimePay, 2),
            'expected_calculation' => [
                'note' => 'الحساب المتوقع: 5 ساعات إضافي عادي + 10 ساعات عطلة',
                'regular_expected' => "5 × " . round($hourlyWage, 4) . " × 1.5 = " . round(5 * $hourlyWage * 1.5, 2),
                'holiday_expected' => "10 × " . round($hourlyWage, 4) . " × 2.0 = " . round(10 * $hourlyWage * 2.0, 2),
                'expected_total' => round(5 * $hourlyWage * 1.5 + 10 * $hourlyWage * 2.0, 2)
            ],
            'regular_overtime_pay' => round($regularOvertimePay, 2),
            'holiday_overtime_pay' => round($holidayOvertimePay, 2),
            'total_overtime_pay' => round($totalOvertimePay, 2),
            'records' => $empData['records']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'period' => [
            'start_date' => $startDate,
            'end_date' => $endDate
        ],
        'system_variables' => [
            'monthly_work_days' => $monthlyWorkDays,
            'daily_work_hours' => $dailyWorkHours,
            'regular_overtime_multiplier' => $regularOvertimeMultiplier,
            'holiday_work_multiplier' => $holidayWorkMultiplier
        ],
        'employees' => $results
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'خطأ في قاعدة البيانات: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}


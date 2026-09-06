<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config.php';

// Function to get system variables
function getSystemVariables($pdo) {
    try {
        $stmt = $pdo->prepare("SELECT variable_key, variable_value, variable_type FROM system_variables WHERE is_active = 1");
        $stmt->execute();
        $variables = [];
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $key = $row['variable_key'];
            $value = $row['variable_value'];
            $type = $row['variable_type'];
            
            // Convert value based on type
            switch ($type) {
                case 'number':
                    $variables[$key] = (float)$value;
                    break;
                case 'currency':
                    $variables[$key] = (float)$value;
                    break;
                case 'time':
                    $variables[$key] = $value;
                    break;
                default:
                    $variables[$key] = $value;
            }
        }
        
        return $variables;
    } catch (Exception $e) {
        error_log("Error getting system variables: " . $e->getMessage());
        return [];
    }
}

// Function to get employee data
function getEmployeeData($pdo, $employeeId, $period = null) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                id, name, employee_code, department, position, 
                base_salary, salary_type, hire_date,
                weekly_work_days, daily_work_hours
            FROM employees 
            WHERE id = ? AND status = 'active'
        ");
        $stmt->execute([$employeeId]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$employee) {
            return [];
        }
        
        // Add default values if not set
        $employee['weekly_work_days'] = $employee['weekly_work_days'] ?? 6;
        $employee['daily_work_hours'] = $employee['daily_work_hours'] ?? 8;
        
        return $employee;
    } catch (Exception $e) {
        error_log("Error getting employee data: " . $e->getMessage());
        return [];
    }
}

// Function to get attendance data
function getAttendanceData($pdo, $employeeId, $period, $systemVariables) {
    try {
        $officialStartTime = $systemVariables['official_start_time'] ?? '08:30:00';
        $gracePeriod = (int)($systemVariables['grace_period'] ?? 15);
        
        // Handle period parameter - could be string or array
        if (is_array($period)) {
            $startDate = $period['start_date'] ?? date('Y-m-01');
            $endDate = $period['end_date'] ?? date('Y-m-31');
        } else {
            $startDate = $period ? $period . '-01' : date('Y-m-01');
            $endDate = $period ? date('Y-m-t', strtotime($startDate)) : date('Y-m-t');
        }
        
        $gracePeriodEndTime = date('H:i:s', strtotime($officialStartTime . ' +' . $gracePeriod . ' minutes'));
        
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total_days,
                SUM(CASE WHEN check_in IS NOT NULL AND check_in <= ? AND is_holiday = 0 THEN 1 ELSE 0 END) as on_time_days,
                SUM(CASE WHEN check_in IS NOT NULL AND check_in > ? AND check_in <= ? THEN 1 ELSE 0 END) as grace_period_late_days,
                SUM(CASE WHEN check_in IS NOT NULL AND check_in > ? THEN 1 ELSE 0 END) as late_days,
                SUM(CASE WHEN check_in IS NULL THEN 1 ELSE 0 END) as absent_days,
                SUM(CASE WHEN check_in IS NOT NULL AND check_in > ? THEN 
                    TIMESTAMPDIFF(MINUTE, ?, check_in) 
                ELSE 0 END) as late_minutes_calculated,
                SUM(CASE WHEN check_in IS NOT NULL AND check_in > ? THEN 
                    TIMESTAMPDIFF(MINUTE, ?, check_in) 
                ELSE 0 END) as grace_period_late_minutes
            FROM attendance_logs 
            WHERE employee_id = ? 
            AND DATE(check_in) >= ? 
            AND DATE(check_in) <= ?
        ");
        
        $stmt->execute([
            $officialStartTime, $officialStartTime, $gracePeriodEndTime, $gracePeriodEndTime,
            $gracePeriodEndTime, $gracePeriodEndTime, $gracePeriodEndTime, $gracePeriodEndTime,
            $employeeId, $startDate, $endDate
        ]);
        
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return [
            'total_days' => (int)$data['total_days'],
            'on_time_days' => (int)$data['on_time_days'],
            'grace_period_late_days' => (int)$data['grace_period_late_days'],
            'late_days' => (int)$data['late_days'],
            'absent_days' => (int)$data['absent_days'],
            'late_minutes_calculated' => (int)$data['late_minutes_calculated'],
            'grace_period_late_minutes' => (int)$data['grace_period_late_minutes']
        ];
        
    } catch (Exception $e) {
        error_log("Error getting attendance data: " . $e->getMessage());
        return [
            'total_days' => 0,
            'on_time_days' => 0,
            'grace_period_late_days' => 0,
            'late_days' => 0,
            'absent_days' => 0,
            'late_minutes_calculated' => 0,
            'grace_period_late_minutes' => 0
        ];
    }
}

// Function to evaluate formula dynamically
function evaluateFormulaDynamic($formula, $variables) {
    try {
        // Replace variables in formula
        $processedFormula = $formula;
        
        // Sort variable keys by length (longest first) to prevent partial replacements
        $variableKeys = array_keys($variables);
        usort($variableKeys, function($a, $b) {
            return strlen($b) - strlen($a);
        });
        
        foreach ($variableKeys as $key) {
            $value = $variables[$key];
            
            // Handle different value types
            if (is_string($value) && !is_numeric($value)) {
                // For string values (like time), wrap in quotes
                $processedFormula = str_replace($key, "'" . $value . "'", $processedFormula);
            } else {
                $processedFormula = str_replace($key, $value, $processedFormula);
            }
        }
        
        // Convert JavaScript-like operators to PHP-compatible ones
        $processedFormula = str_replace('===', '==', $processedFormula);
        $processedFormula = str_replace('!==', '!=', $processedFormula);
        
        // Evaluate the formula
        $result = eval("return $processedFormula;");
        
        return is_numeric($result) ? (float)$result : 0;
        
    } catch (Exception $e) {
        error_log("Error evaluating formula '$formula': " . $e->getMessage());
        return 0;
    }
}

// Function to calculate field value dynamically
function calculateFieldValueDynamic($pdo, $tableName, $columnName, $employeeId, $baseSalary, $actualSalary, $period = null) {
    try {
        // Get formula mapping
        $stmt = $pdo->prepare("
            SELECT 
                cfm.*,
                df.formula_expression as formula_value
            FROM column_formula_mappings cfm
            LEFT JOIN dynamic_formulas df ON cfm.formula_id = df.id
            LEFT JOIN dynamic_columns dc ON cfm.column_id = dc.id
            WHERE dc.table_id = (
                SELECT id FROM dynamic_tables WHERE table_name = ?
            )
            AND dc.column_name = ?
            AND cfm.is_active = 1
            AND df.is_active = 1
            ORDER BY cfm.id ASC
            LIMIT 1
        ");
        $stmt->execute([$tableName, $columnName]);
        $mapping = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // إذا لم توجد معادلة، أرجع 0
        if (!$mapping || !$mapping['formula_value']) {
            return 0;
        }
        
        // Get system variables
        $systemVariables = getSystemVariables($pdo);
        
        // Get employee data
        $employeeData = getEmployeeData($pdo, $employeeId, $period);
        
        // Get attendance data
        $attendanceData = getAttendanceData($pdo, $employeeId, $period, $systemVariables);
        
        // Merge all variables
        $variables = array_merge($employeeData, $attendanceData, $systemVariables);
        
        // Add additional variables
        $variables['base_salary'] = $baseSalary;
        $variables['actual_salary'] = $actualSalary;
        $variables['employee_id'] = $employeeId;
        $variables['salary_type'] = $employeeData['salary_type'] ?? 'Monthly';
        
        // Add default values for missing variables
        $defaultVariables = [
            'special_bonus' => 0,
            'attendance_bonus' => 0,
            'overtime_hours' => 0,
            'absent_value' => 0,
            'insurance_amount' => 0,
            'penalty_value' => 0,
            'late_penalty_value' => 0,
            'absent_penalty' => 0,
            'on_time_days' => 0,
            'grace_period_late_days' => 0,
            'late_days' => 0,
            'total_days' => 0
        ];
        
        foreach ($defaultVariables as $key => $defaultValue) {
            if (!isset($variables[$key])) {
                $variables[$key] = $defaultValue;
            }
        }
        
        // Calculate insurance_amount based on salary_type
        if ($variables['salary_type'] === 'Weekly') {
            $variables['insurance_amount'] = $variables['weekly_insurance_amount'] ?? 100;
        } else {
            $variables['insurance_amount'] = $variables['monthly_insurance_amount'] ?? 400;
        }
        
        // Evaluate the formula
        return evaluateFormulaDynamic($mapping['formula_value'], $variables);
        
    } catch (Exception $e) {
        error_log("Error in calculateFieldValueDynamic: " . $e->getMessage());
        return 0;
    }
}

// Function to get salary entitlements data
function getSalaryEntitlementsData($pdo, $period) {
    try {
        $stmt = $pdo->prepare("SELECT * FROM employees WHERE status = 'active' ORDER BY name");
        $stmt->execute();
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $entitlementsData = [];
        
        foreach ($employees as $employee) {
            $employeeId = $employee['id'];
            $baseSalary = $employee['base_salary'];
            $actualSalary = $baseSalary;
            
            $rowData = [
                'id' => $employeeId,
                'name' => $employee['name'],
                'employee_code' => $employee['employee_code'],
                'department' => $employee['department'],
                'position' => $employee['position'],
                'base_salary' => number_format($baseSalary, 2) . ' ج.م.',
                'salary_type' => $employee['salary_type']
            ];
            
            // Calculate dynamic fields
            $overtimeWorkHours = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'overtime_work_hours', $employeeId, $baseSalary, $actualSalary, $period);
            $rowData['overtime_work_hours'] = number_format($overtimeWorkHours, 1);
            
            $overtimeHolidayHours = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'overtime_holiday_hours', $employeeId, $baseSalary, $actualSalary, $period);
            $rowData['overtime_holiday_hours'] = number_format($overtimeHolidayHours, 1);
            
            $totalOvertimeHours = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'total_overtime_hours', $employeeId, $baseSalary, $actualSalary, $period);
            $rowData['total_overtime_hours'] = number_format($totalOvertimeHours, 1);
            
            $onTimeDays = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'on_time_days', $employeeId, $baseSalary, $actualSalary, $period);
            $rowData['on_time_days'] = number_format($onTimeDays, 0);
            
            $weeklySalary = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'weekly_salary', $employeeId, $baseSalary, $actualSalary, $period);
            $rowData['weekly_salary'] = number_format($weeklySalary, 2) . ' ج.م.';
            
            $weeklyWorkDays = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'weekly_work_days', $employeeId, $baseSalary, $actualSalary, $period);
            $rowData['weekly_work_days'] = number_format($weeklyWorkDays, 0);
            
            $dailyWage = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'daily_wage', $employeeId, $baseSalary, $actualSalary, $period);
            $rowData['daily_wage'] = number_format($dailyWage, 2) . ' ج.م.';
            
            $dailyWorkHours = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'daily_work_hours', $employeeId, $baseSalary, $actualSalary, $period);
            $rowData['daily_work_hours'] = number_format($dailyWorkHours, 1);
            
            $hourlyWage = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'hourly_wage', $employeeId, $baseSalary, $actualSalary, $period);
            $rowData['hourly_wage'] = number_format($hourlyWage, 2) . ' ج.م.';
            
            $mealValue = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'meal_value', $employeeId, $baseSalary, $actualSalary, $period);
            $rowData['meal_value'] = number_format($mealValue, 2) . ' ج.م.';
            
            $overtimePay = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'overtime_pay', $employeeId, $baseSalary, $actualSalary, $period);
            $rowData['overtime_pay'] = number_format($overtimePay, 2) . ' ج.م.';
            
            $transportationAllowance = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'transportation_allowance', $employeeId, $baseSalary, $actualSalary, $period);
            $rowData['transportation_allowance'] = number_format($transportationAllowance, 2) . ' ج.م.';
            
            $efficiencyRate = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'efficiency_rate', $employeeId, $baseSalary, $actualSalary, $period);
            $rowData['efficiency_rate'] = number_format($efficiencyRate, 1) . '%';
            
            $specialBonus = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'special_bonus', $employeeId, $baseSalary, $actualSalary, $period);
            $rowData['special_bonus'] = number_format($specialBonus, 2) . ' ج.م.';
            
            $weeklyIncentive = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'weekly_incentive', $employeeId, $baseSalary, $actualSalary, $period);
            $rowData['weekly_incentive'] = number_format($weeklyIncentive, 2) . ' ج.م.';
            
            $totalEntitlements = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'total_entitlements', $employeeId, $baseSalary, $actualSalary, $period);
            $rowData['total_entitlements'] = number_format($totalEntitlements, 2) . ' ج.م.';
            
            $entitlementsData[] = $rowData;
        }
        
        return $entitlementsData;
        
    } catch (Exception $e) {
        error_log("Error in getSalaryEntitlementsData: " . $e->getMessage());
        return [];
    }
}

try {
    // Get data from request
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    
    // If JSON fails, try GET
    if (!$input) {
        $input = $_GET;
    }
    
    $action = $input['action'] ?? '';
    $tableName = $input['table_name'] ?? '';
    
    // Handle both period and date range
    if (isset($input['start_date']) && isset($input['end_date'])) {
        $period = [
            'start_date' => $input['start_date'],
            'end_date' => $input['end_date']
        ];
    } else {
        $period = $input['period'] ?? date('Y-m');
    }
    
    switch ($action) {
        case 'get_salary_entitlements':
            $data = getSalaryEntitlementsData($pdo, $period);
            echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'إجراء غير معروف'], JSON_UNESCAPED_UNICODE);
            break;
    }
    
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'خطأ في الخادم: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>


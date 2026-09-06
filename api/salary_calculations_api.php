<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

require_once 'config_unified.php';

// تضمين دالة حساب التأخيرات
require_once 'late_calculation_helper.php';

// Function to calculate any field value using dynamic system
function calculateFieldValueDynamic($pdo, $tableName, $columnName, $employeeId, $baseSalary, $actualSalary, $period = null) {
    try {
        // Get formula mapping from column_formula_mappings with JOIN to get actual formula
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
        
        if ($mapping && $mapping['formula_value']) {
            // Get employee data
            $employeeData = getEmployeeData($pdo, $employeeId, $period);
            
            // Get system variables
            $systemVariables = getSystemVariables($pdo);
            
            // Get attendance data
            $attendanceData = getAttendanceData($pdo, $employeeId, $period, $systemVariables);
            
            // Combine all variables
            $variables = array_merge($employeeData, $systemVariables, $attendanceData, [
                'base_salary' => $baseSalary,
                'actual_salary' => $actualSalary,
                'employee_id' => $employeeId,
                'period' => $period,
                'commitment_days' => $attendanceData['on_time_days'] ?? 0
            ]);
            
            // Calculate derived variables after all base variables are set
            $variables['daily_wage'] = $variables['base_salary'] / 30;
            $variables['hourly_wage'] = $variables['daily_wage'] / $variables['daily_work_hours'];
            
            // Evaluate formula
            return evaluateFormulaDynamic($mapping['formula_value'], $variables);
        }
        
        return 0;
    } catch (Exception $e) {
        error_log("Error in calculateFieldValueDynamic: " . $e->getMessage());
        return 0;
    }
}

// Function to get employee data
function getEmployeeData($pdo, $employeeId, $period = null) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                id, name, position, department, 
                base_salary, salary_type, hire_date,
                employee_code, cost_center, insurance_salary
            FROM employees 
            WHERE id = ?
        ");
        $stmt->execute([$employeeId]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$employee) {
            return [];
        }
        
        // Convert to variables
        $variables = [];
        foreach ($employee as $key => $value) {
            $variables[$key] = $value;
        }
        
        return $variables;
    } catch (Exception $e) {
        error_log("Error in getEmployeeData: " . $e->getMessage());
        return [];
    }
}

// Function to get attendance data
function getAttendanceData($pdo, $employeeId, $period = null, $systemVariables = []) {
    try {
        $whereClause = "WHERE employee_id = ?";
        $params = [$employeeId];
        
        if ($period) {
            $whereClause .= " AND attendance_date BETWEEN ? AND ?";
            $params[] = $period['start_date'];
            $params[] = $period['end_date'];
        }
        
        // Get all time-related variables from system variables dynamically
        $officialStartTime = $systemVariables['official_start_time'] ?? '08:30:00';
        $gracePeriod = $systemVariables['grace_period'] ?? 15; // Default 15 minutes
        
        // Ensure it's properly formatted as TIME
        if (strpos($officialStartTime, ':') !== false) {
            $officialStartTime = date('H:i:s', strtotime($officialStartTime));
        }
        
        // Log loaded variables for debugging
        error_log("Attendance Data Variables: official_start_time=$officialStartTime, grace_period=$gracePeriod");
        
        // Build SQL with official start time directly in the query
        $sql = "
            SELECT 
                COUNT(*) as total_days,
                SUM(CASE WHEN check_in IS NOT NULL THEN 1 ELSE 0 END) as present_days,
                SUM(CASE WHEN check_in IS NULL THEN 1 ELSE 0 END) as absent_days,
                SUM(CASE WHEN check_in IS NOT NULL AND check_in <= '$officialStartTime' AND is_holiday = 0 THEN 1 ELSE 0 END) as on_time_days,
                SUM(CASE WHEN check_in IS NOT NULL AND check_in > '$officialStartTime' THEN 1 ELSE 0 END) as late_days,
                SUM(CASE WHEN check_in IS NOT NULL AND TIME(check_in) > ADDTIME('$officialStartTime', CONCAT('00:', $gracePeriod, ':00')) THEN 1 ELSE 0 END) as grace_period_late_days,
                SUM(CASE WHEN check_in IS NOT NULL AND TIME(check_in) > ADDTIME('$officialStartTime', CONCAT('00:', $gracePeriod, ':00')) THEN TIMESTAMPDIFF(MINUTE, ADDTIME('$officialStartTime', CONCAT('00:', $gracePeriod, ':00')), TIME(check_in)) ELSE 0 END) as grace_period_late_minutes,
                SUM(work_hours) as total_work_hours,
                SUM(late_minutes) as total_late_minutes,
                SUM(CASE WHEN is_holiday = 1 THEN work_hours ELSE 0 END) as holiday_work_hours,
                SUM(CASE WHEN is_holiday = 0 THEN work_hours ELSE 0 END) as regular_work_hours,
                SUM(CASE WHEN is_holiday = 1 THEN 1 ELSE 0 END) as holiday_days,
                SUM(overtime_hours) as total_overtime_hours,
                SUM(transport_allowance) as total_transport_allowance,
                AVG(work_hours) as avg_work_hours
            FROM attendance_logs 
            $whereClause
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $attendance = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$attendance) {
            return [];
        }
        
        // Calculate late hours using new system
        $calculatedLateHours = calculateLateHours($attendance['total_late_minutes']);
        
        // Convert to variables
        $variables = [];
        foreach ($attendance as $key => $value) {
            $variables[$key] = $value ?? 0;
        }
        
        $variables['calculated_late_hours'] = $calculatedLateHours;
        $variables['is_holiday'] = $attendance['holiday_days'] > 0 ? 1 : 0;
        $variables['overtime_hours'] = $attendance['total_overtime_hours'] ?? 0;
        $variables['work_hours'] = $attendance['total_work_hours'] ?? 0;
        
        // Add missing variables for formulas
        $variables['absent_days'] = $attendance['absent_days'] ?? 0;
        $variables['on_time_days'] = $attendance['on_time_days'] ?? 0;
        $variables['present_days'] = $attendance['present_days'] ?? 0;
        $variables['total_days'] = $attendance['total_days'] ?? 0;
        $variables['late_days'] = $attendance['late_days'] ?? 0;
        $variables['holiday_days'] = $attendance['holiday_days'] ?? 0;
        $variables['regular_work_hours'] = $attendance['regular_work_hours'] ?? 0;
        $variables['holiday_work_hours'] = $attendance['holiday_work_hours'] ?? 0;
        $variables['total_late_minutes'] = $attendance['total_late_minutes'] ?? 0;
        $variables['avg_work_hours'] = $attendance['avg_work_hours'] ?? 0;
        $variables['total_transport_allowance'] = $attendance['total_transport_allowance'] ?? 0;
        $variables['grace_period_late_days'] = $attendance['grace_period_late_days'] ?? 0;
        $variables['grace_period_late_minutes'] = $attendance['grace_period_late_minutes'] ?? 0;
        
        // Add calculated variables for formulas
        $variables['daily_wage'] = 0; // Will be calculated by formula
        $variables['hourly_wage'] = 0; // Will be calculated by formula
        $variables['special_bonus'] = 0; // Default value
        $variables['advance_amount'] = 0; // Default value
        $variables['penalty_value'] = 0; // Default value
        $variables['overtime_work_hours'] = $attendance['total_overtime_hours'] ?? 0;
        $variables['overtime_holiday_hours'] = 0; // Will be calculated by formula
        
        // Add ALL system variables dynamically (no need to hardcode them)
        foreach ($systemVariables as $key => $value) {
            if (!isset($variables[$key])) {
                $variables[$key] = $value;
                error_log("Added System Variable to Attendance Data: $key = $value");
            }
        }
        
        // Add calculated variables that might be needed
        $variables['commitment_days'] = $variables['on_time_days']; // Same as on_time_days
        
        // Add calculated variables that might be needed (will be calculated later with actual base_salary)
        $variables['daily_wage'] = 0; // Will be calculated later
        $variables['hourly_wage'] = 0; // Will be calculated later
        
        // Ensure commitment_days is set
        $variables['commitment_days'] = $variables['on_time_days']; // Same as on_time_days
        
        return $variables;
    } catch (Exception $e) {
        error_log("Error in getAttendanceData: " . $e->getMessage());
        return [];
    }
}

// Function to get system variables
function getSystemVariables($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT variable_key, variable_value, variable_type, variable_name_ar, variable_name_en, category, description_ar
            FROM system_variables 
            WHERE is_active = 1
            ORDER BY category, variable_key
        ");
        $variables = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $result = [];
        foreach ($variables as $var) {
            $key = $var['variable_key'];
            $value = $var['variable_value'];
            $type = $var['variable_type'];
            
            // Convert value based on type
            switch ($type) {
                case 'number':
                    $result[$key] = floatval($value);
                    break;
                case 'boolean':
                    $result[$key] = $value === '1' || $value === 'true';
                    break;
                case 'currency':
                    $result[$key] = floatval($value);
                    break;
                case 'time':
                    // Keep time as string for SQL operations
                    $result[$key] = $value;
                    break;
                default:
                    $result[$key] = $value;
            }
            
            // Log variable for debugging
            error_log("System Variable Loaded: $key = $value (type: $type)");
        }
        
        // Add calculated variables that depend on system variables
        $result = addCalculatedVariables($result);
        
        return $result;
    } catch (Exception $e) {
        error_log("Error in getSystemVariables: " . $e->getMessage());
        return [];
    }
}

// Function to add calculated variables based on system variables
function addCalculatedVariables($variables) {
    // Add any calculated variables that depend on system variables
    // This function can be extended to add more calculated variables
    
    // Example: Calculate grace period end time
    if (isset($variables['official_start_time']) && isset($variables['grace_period'])) {
        $startTime = $variables['official_start_time'];
        $graceMinutes = $variables['grace_period'];
        
        // Calculate grace period end time
        $startTimestamp = strtotime($startTime);
        $graceEndTimestamp = $startTimestamp + ($graceMinutes * 60);
        $variables['grace_period_end_time'] = date('H:i:s', $graceEndTimestamp);
        
        error_log("Calculated Variable: grace_period_end_time = " . $variables['grace_period_end_time']);
    }
    
    return $variables;
}

// Function to extract variables from formula automatically
function extractVariablesFromFormula($formula) {
    // Define known variables to look for
    $knownVariables = [
        'base_salary', 'actual_salary', 'salary_type', 'on_time_days', 'meal_allowance_per_day',
        'daily_wage', 'hourly_wage', 'overtime_hours', 'work_hours', 'present_days', 'absent_days',
        'late_days', 'commitment_days', 'daily_work_hours', 'weekly_work_days', 'monthly_work_days',
        'total_days', 'total_work_hours', 'total_late_minutes', 'holiday_work_hours', 'regular_work_hours',
        'holiday_days', 'total_overtime_hours', 'total_transport_allowance', 'avg_work_hours',
        'calculated_late_hours', 'is_holiday', 'special_bonus', 'advance_amount', 'penalty_value',
        'overtime_work_hours', 'overtime_holiday_hours', 'employee_id', 'period',
        'id', 'name', 'position', 'department', 'hire_date', 'employee_code', 'cost_center', 'insurance_salary',
        'official_start_time', 'grace_period', 'grace_period_end_time', 'grace_period_late_days', 'grace_period_late_minutes'
    ];

    $foundVariables = [];

    // Look for known variables in the formula
    foreach ($knownVariables as $variable) {
        if (preg_match('/\b' . preg_quote($variable, '/') . '\b/', $formula)) {
            $foundVariables[] = $variable;
        }
    }

    // Also look for simple variable patterns (single words)
    $simplePattern = '/\b[a-zA-Z_][a-zA-Z0-9_]*\b/';
    preg_match_all($simplePattern, $formula, $matches);

    foreach ($matches[0] as $match) {
        // Skip if it's a known multi-word variable or common keywords
        if (!in_array($match, $knownVariables) &&
            !in_array($match, ['if', 'then', 'else', 'and', 'or', 'not', 'true', 'false', 'null', 'undefined', 'this', 'super', 'return', 'var', 'let', 'const', 'function', 'class', 'extends', 'implements', 'interface', 'public', 'private', 'protected', 'static', 'final', 'abstract', 'synchronized', 'volatile', 'transient', 'native', 'strictfp']) &&
            !is_numeric($match)) {
            $foundVariables[] = $match;
        }
    }

    return array_unique($foundVariables);
}

// Function to evaluate formula using dynamic system
function evaluateFormulaDynamic($formula, $variables) {
    try {
        // Log formula and available variables for debugging
        error_log("Evaluating Formula: $formula");
        error_log("Available Variables: " . implode(', ', array_keys($variables)));
        
        // Replace variables in formula
        $processedFormula = $formula;
        
        foreach ($variables as $key => $value) {
            if (is_array($value)) {
                // Skip array values
                continue;
            } elseif (is_numeric($value)) {
                $processedFormula = str_replace($key, $value, $processedFormula);
                error_log("Replaced variable $key with numeric value: $value");
            } elseif (is_string($value)) {
                // Handle string values (like time values)
                if (strpos($value, ':') !== false && preg_match('/^\d{2}:\d{2}:\d{2}$/', $value)) {
                    // Time value - keep as string for SQL
                    $processedFormula = str_replace($key, "'" . $value . "'", $processedFormula);
                    error_log("Replaced variable $key with time value: '$value'");
                } else {
                    // Regular string value
                    $processedFormula = str_replace($key, "'" . $value . "'", $processedFormula);
                    error_log("Replaced variable $key with string value: '$value'");
                }
            } else {
                $processedFormula = str_replace($key, "'" . $value . "'", $processedFormula);
                error_log("Replaced variable $key with value: '$value'");
            }
        }
        
        // Handle special cases
        if (strpos($processedFormula, 'is_holiday') !== false) {
            if (strpos($processedFormula, 'is_holiday == 1') !== false) {
                return $variables['is_holiday'] == 1 ? $variables['work_hours'] : 0;
            }
        }
        
        if (strpos($processedFormula, 'holiday_work_hours') !== false) {
            return $variables['holiday_work_hours'] ?? 0;
        }
        
        if (strpos($processedFormula, 'calculated_late_hours') !== false) {
            return $variables['calculated_late_hours'] ?? 0;
        }
        
        // Use eval for other formulas
        // Fix decimal numbers that start with dot
        $processedFormula = preg_replace('/\b\.(\d+)/', '0.$1', $processedFormula);
        
        // Log final processed formula
        error_log("Final Processed Formula: $processedFormula");
        
        $result = eval("return $processedFormula;");
        error_log("Formula Result: $result");
        return $result;
        
    } catch (ParseError $e) {
        error_log("Parse error in evaluateFormulaDynamic: " . $e->getMessage() . " Formula: " . $formula);
        return 0;
    } catch (Error $e) {
        error_log("Error in evaluateFormulaDynamic: " . $e->getMessage() . " Formula: " . $formula);
        return 0;
    }
}

// Main API logic
try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? '';

    switch ($action) {
        case 'calculate_salary':
            $employeeId = $input['employee_id'] ?? '';
            $period = $input['period'] ?? null;
            
            if (!$employeeId) {
                throw new Exception('معرف الموظف مطلوب');
            }
            
            // Get employee data
            $employeeData = getEmployeeData($pdo, $employeeId, $period);
            if (!$employeeData) {
                throw new Exception('الموظف غير موجود');
            }
            
            $baseSalary = $employeeData['base_salary'] ?? 0;
            $actualSalary = $baseSalary; // يمكن تعديل هذا لاحقاً
            
            // Calculate all fields using dynamic system
            $calc = [
                'employee_id' => $employeeId,
                'base_salary' => $baseSalary,
                'actual_salary' => $actualSalary,
                'overtime_work_hours' => calculateFieldValueDynamic($pdo, 'salary_summary', 'overtime_work_hours', $employeeId, $baseSalary, $actualSalary, $period),
                'overtime_holiday_hours' => calculateFieldValueDynamic($pdo, 'salary_summary', 'overtime_holiday_hours', $employeeId, $baseSalary, $actualSalary, $period),
                'total_overtime_hours' => calculateFieldValueDynamic($pdo, 'salary_summary', 'total_overtime_hours', $employeeId, $baseSalary, $actualSalary, $period),
                'weekly_work_days' => calculateFieldValueDynamic($pdo, 'salary_summary', 'weekly_work_days', $employeeId, $baseSalary, $actualSalary, $period),
                'commitment_days' => calculateFieldValueDynamic($pdo, 'salary_summary', 'commitment_days', $employeeId, $baseSalary, $actualSalary, $period),
                'daily_work_hours' => calculateFieldValueDynamic($pdo, 'salary_summary', 'daily_work_hours', $employeeId, $baseSalary, $actualSalary, $period),
                'daily_wage' => calculateFieldValueDynamic($pdo, 'salary_summary', 'daily_wage', $employeeId, $baseSalary, $actualSalary, $period),
                'hourly_wage' => calculateFieldValueDynamic($pdo, 'salary_summary', 'hourly_wage', $employeeId, $baseSalary, $actualSalary, $period),
                'meal_value' => calculateFieldValueDynamic($pdo, 'salary_summary', 'meal_value', $employeeId, $baseSalary, $actualSalary, $period),
                'work_overtime_value' => calculateFieldValueDynamic($pdo, 'salary_summary', 'work_overtime_value', $employeeId, $baseSalary, $actualSalary, $period),
                'transport_overtime_value' => calculateFieldValueDynamic($pdo, 'salary_summary', 'transport_overtime_value', $employeeId, $baseSalary, $actualSalary, $period),
                'efficiency_rate' => calculateFieldValueDynamic($pdo, 'salary_summary', 'efficiency_rate', $employeeId, $baseSalary, $actualSalary, $period),
                'weekly_incentive' => calculateFieldValueDynamic($pdo, 'salary_summary', 'weekly_incentive', $employeeId, $baseSalary, $actualSalary, $period),
                'calculated_late_hours' => calculateFieldValueDynamic($pdo, 'salary_summary', 'calculated_late_hours', $employeeId, $baseSalary, $actualSalary, $period)
            ];
            
            echo json_encode([
                'success' => true,
                'data' => $calc
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'test_formula_dynamic':
            $formulaKey = $input['formula_key'] ?? '';
            $testVariables = $input['variables'] ?? [];
            
            if (!$formulaKey) {
                throw new Exception('مفتاح المعادلة مطلوب');
            }
            
            // Get formula from dynamic system
            $stmt = $pdo->prepare("SELECT formula_expression FROM dynamic_formulas WHERE formula_key = ? AND is_active = 1");
            $stmt->execute([$formulaKey]);
            $formula = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$formula) {
                throw new Exception('المعادلة غير موجودة');
            }
            
            // Add default variables
            $defaultVariables = [
                'base_salary' => 5000,
                'work_hours' => 8,
                'overtime_hours' => 2,
                'is_holiday' => 0,
                'holiday_work_hours' => 0,
                'total_late_minutes' => 30,
                'calculated_late_hours' => 1
            ];
            
            $allVariables = array_merge($defaultVariables, $testVariables);
            $result = evaluateFormulaDynamic($formula['formula_expression'], $allVariables);
            
            echo json_encode([
                'success' => true,
                'result' => $result,
                'formula' => $formula['formula_expression'],
                'variables_used' => $allVariables
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_departments':
            $stmt = $pdo->query("SELECT * FROM departments ORDER BY id");
            $departments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'departments' => $departments
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_cost_centers':
            $stmt = $pdo->query("SELECT * FROM cost_centers ORDER BY id");
            $costCenters = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => $costCenters
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_employees':
            $stmt = $pdo->query("SELECT * FROM employees ORDER BY id");
            $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => $employees
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_calculations':
            // Get date range from request
            $fromDate = $input['from'] ?? date('Y-m-01');
            $toDate = $input['to'] ?? date('Y-m-t');
            
            // Get all employees
            $stmt = $pdo->query("SELECT * FROM employees WHERE status = 'active' ORDER BY id");
            $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $calculations = [];
            
            foreach ($employees as $employee) {
                $baseSalary = $employee['base_salary'];
                $actualSalary = $baseSalary;
                $period = [
                    'start_date' => $fromDate,
                    'end_date' => $toDate
                ];
                
                // Calculate all fields for this employee
                $calculation = [
                    'employee_id' => $employee['id'],
                    'employee_name' => $employee['name'],
                    'employee_code' => $employee['employee_code'],
                    'department' => $employee['department'],
                    'salary_type' => $employee['salary_type'],
                    'base_salary' => $baseSalary,
                    'actual_salary' => $actualSalary
                ];
                
                // Calculate dynamic fields
                $fields = [
                    'overtime_work_hours', 'overtime_holiday_hours', 'total_overtime_hours',
                    'weekly_work_days', 'commitment_days', 'daily_work_hours',
                    'daily_wage', 'hourly_wage', 'meal_value',
                    'work_overtime_value', 'transport_overtime_value', 'efficiency_rate',
                    'weekly_incentive', 'calculated_late_hours', 'attendance_bonus'
                ];
                
                foreach ($fields as $field) {
                    $calculation[$field] = calculateFieldValueDynamic($pdo, 'salary_summary', $field, $employee['id'], $baseSalary, $actualSalary, $period);
                }
                
                // Add basic variables for debugging and display
                $systemVariables = getSystemVariables($pdo);
                $attendanceData = getAttendanceData($pdo, $employee['id'], $period, $systemVariables);
                
                $calculation['on_time_days'] = $attendanceData['on_time_days'] ?? 0;
                $calculation['meal_allowance_per_day'] = $systemVariables['meal_allowance_per_day'] ?? 0;
                $calculation['present_days'] = $attendanceData['present_days'] ?? 0;
                $calculation['absent_days'] = $attendanceData['absent_days'] ?? 0;
                $calculation['total_days'] = $attendanceData['total_days'] ?? 0;
                $calculation['late_days'] = $attendanceData['late_days'] ?? 0;
                
                $calculations[] = $calculation;
            }
            
            echo json_encode([
                'success' => true,
                'data' => $calculations
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        default:
            throw new Exception('إجراء غير صحيح');
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>

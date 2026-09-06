<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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
            
            // Get attendance data
            $attendanceData = getAttendanceData($pdo, $employeeId, $period);
            
            // Get system variables
            $systemVariables = getSystemVariables($pdo);
            
            // Combine all variables
            $variables = array_merge($employeeData, $attendanceData, $systemVariables, [
                'base_salary' => $baseSalary,
                'actual_salary' => $actualSalary,
                'employee_id' => $employeeId,
                'period' => $period
            ]);
            
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
                insurance_number, bank_account
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
function getAttendanceData($pdo, $employeeId, $period = null) {
    try {
        $whereClause = "WHERE employee_id = ?";
        $params = [$employeeId];
        
        if ($period) {
            $whereClause .= " AND DATE(attendance_date) BETWEEN ? AND ?";
            $params[] = $period['start_date'];
            $params[] = $period['end_date'];
        }
        
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total_days,
                SUM(work_hours) as total_work_hours,
                SUM(late_minutes) as total_late_minutes,
                SUM(CASE WHEN is_holiday = 1 THEN work_hours ELSE 0 END) as holiday_work_hours,
                SUM(CASE WHEN is_holiday = 1 THEN 1 ELSE 0 END) as holiday_days,
                SUM(overtime_hours) as total_overtime_hours,
                SUM(transport_allowance) as total_transport_allowance
            FROM attendance_logs 
            $whereClause
        ");
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
            SELECT variable_key, variable_value, variable_type 
            FROM system_variables 
            WHERE is_active = 1
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
                default:
                    $result[$key] = $value;
            }
        }
        
        return $result;
    } catch (Exception $e) {
        error_log("Error in getSystemVariables: " . $e->getMessage());
        return [];
    }
}

// Function to evaluate formula using dynamic system
function evaluateFormulaDynamic($formula, $variables) {
    try {
        // Replace variables in formula
        $processedFormula = $formula;
        
        foreach ($variables as $key => $value) {
            if (is_numeric($value)) {
                $processedFormula = str_replace($key, $value, $processedFormula);
            } else {
                $processedFormula = str_replace($key, "'" . $value . "'", $processedFormula);
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
        $result = eval("return $processedFormula;");
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

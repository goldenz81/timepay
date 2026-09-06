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
                base_salary, salary_type, hire_date
            FROM employees 
            WHERE id = ?
        ");
        $stmt->execute([$employeeId]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($employee) {
            return [
                'employee_id' => $employee['id'],
                'employee_name' => $employee['name'],
                'employee_code' => $employee['employee_code'],
                'department' => $employee['department'],
                'position' => $employee['position'],
                'base_salary' => (float)$employee['base_salary'],
                'salary_type' => $employee['salary_type'],
                'hire_date' => $employee['hire_date'],
                'weekly_work_days' => 6, // افتراضي
                'daily_work_hours' => 8  // افتراضي
            ];
        }
        
        return [];
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
        
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total_days,
                SUM(CASE WHEN check_in IS NOT NULL AND check_in <= ? THEN 1 ELSE 0 END) as on_time_days,
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
        
        // Handle period parameter - could be string or array
        if (is_array($period)) {
            $startDate = $period['start_date'] ?? date('Y-m-01');
            $endDate = $period['end_date'] ?? date('Y-m-31');
        } else {
            $startDate = $period ? $period . '-01' : date('Y-m-01');
            $endDate = $period ? date('Y-m-t', strtotime($startDate)) : date('Y-m-t');
        }
        
        $gracePeriodEndTime = date('H:i:s', strtotime($officialStartTime . ' +' . $gracePeriod . ' minutes'));
        
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
        return [];
    }
}

// Function to evaluate formula using dynamic system
function evaluateFormulaDynamic($formula, $variables) {
    try {
        // Replace variables in formula
        $processedFormula = $formula;
        
        // Sort variable keys by length (longest first) to prevent partial replacements
        $keys = array_keys($variables);
        usort($keys, function($a, $b) {
            return strlen($b) - strlen($a);
        });
        
        foreach ($keys as $key) {
            $value = $variables[$key];
            if (is_array($value)) {
                continue;
            } elseif (is_numeric($value)) {
                $processedFormula = str_replace($key, $value, $processedFormula);
            } else {
                $processedFormula = str_replace($key, "'" . $value . "'", $processedFormula);
            }
        }
        
        // Handle special operators for PHP compatibility
        $processedFormula = str_replace('===', '==', $processedFormula);
        $processedFormula = str_replace('!==', '!=', $processedFormula);
        
        // Use eval to calculate result
        $result = eval("return $processedFormula;");
        return is_numeric($result) ? $result : 0;
    } catch (Exception $e) {
        error_log("Error evaluating formula: " . $e->getMessage());
        return 0;
    }
}

// Function to calculate field value using dynamic system
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
        
        if ($mapping && $mapping['formula_value']) {
            // Get system variables
            $systemVariables = getSystemVariables($pdo);
            
            // Get employee data
            $employeeData = getEmployeeData($pdo, $employeeId, $period);
            
            // Get attendance data
            $attendanceData = getAttendanceData($pdo, $employeeId, $period, $systemVariables);
            
            // Combine all variables
            $variables = array_merge($employeeData, $systemVariables, $attendanceData, [
                'base_salary' => $baseSalary,
                'actual_salary' => $actualSalary,
                'employee_id' => $employeeId,
                'period' => $period
            ]);
            
            // Add calculated variables
            $variables['daily_wage'] = $baseSalary / 30;
            $variables['hourly_wage'] = $variables['daily_wage'] / ($variables['daily_work_hours'] ?? 8);
            
            // Add missing variables with default values
            $variables['special_bonus'] = 0;
            $variables['attendance_bonus'] = 0;
            $variables['overtime_hours'] = 0;
            $variables['overtime_work_hours'] = 0;
            $variables['overtime_holiday_hours'] = 0;
            $variables['total_overtime_hours'] = 0;
            $variables['meal_allowance_per_day'] = 50;
            $variables['weekly_insurance_amount'] = 100;
            $variables['monthly_insurance_amount'] = 400;
            $variables['advance_amount'] = 0;
            $variables['absent_days'] = 0;
            $variables['late_hours'] = 0;
            $variables['total_late_minutes'] = 0;
            
            // Add employee-specific variables
            $variables['salary_type'] = $employeeData['salary_type'] ?? 'Monthly';
            
            // Add more missing variables
            $variables['absent_value'] = $variables['absent_days'] * $variables['daily_wage'];
            $variables['insurance_amount'] = $variables['salary_type'] === 'Weekly' ? $variables['weekly_insurance_amount'] : $variables['monthly_insurance_amount'];
            $variables['penalty_value'] = 0;
            $variables['late_penalty_value'] = 0;
            $variables['absent_penalty'] = 0;
            
            // Add attendance-related variables with default values
            $variables['on_time_days'] = 0;
            $variables['grace_period_late_days'] = 0;
            $variables['late_days'] = 0;
            $variables['total_days'] = 0;
            
            // Log for debugging
            error_log("Evaluating formula for $tableName.$columnName: " . $mapping['formula_value']);
            error_log("Available variables: " . implode(', ', array_keys($variables)));
            
            // Evaluate formula using the same logic as salary_calculations_api.php
            $result = evaluateFormulaDynamic($mapping['formula_value'], $variables);
            error_log("Formula result: $result");
            
            return $result;
        }
        
        return 0;
    } catch (Exception $e) {
        error_log("Error in calculateFieldValueDynamic: " . $e->getMessage());
        return 0;
    }
}

// Simple formula evaluator
function evaluateSimpleFormula($formula, $variables) {
    try {
        $baseSalary = $variables['base_salary'] ?? 0;
        
        // Simple calculations based on common patterns
        if (strpos($formula, 'base_salary + special_bonus') !== false) {
            return $baseSalary + ($variables['special_bonus'] ?? 0);
        } elseif (strpos($formula, 'base_salary / 30') !== false) {
            return $baseSalary / 30;
        } elseif (strpos($formula, 'base_salary / 4') !== false) {
            return $baseSalary / 4;
        } elseif (strpos($formula, 'base_salary / 8') !== false) {
            return $baseSalary / 8;
        } elseif (strpos($formula, 'base_salary * 0.1') !== false) {
            return $baseSalary * 0.1;
        } elseif (strpos($formula, 'base_salary * 0.05') !== false) {
            return $baseSalary * 0.05;
        } elseif (strpos($formula, 'base_salary * 0.02') !== false) {
            return $baseSalary * 0.02;
        } elseif (strpos($formula, 'total_entitlements') !== false) {
            // إجمالي المستحقات = الراتب الأساسي + 10%
            return $baseSalary * 1.1;
        } elseif (strpos($formula, 'total_deductions') !== false) {
            // إجمالي المستقطعات = 5% من الراتب
            return $baseSalary * 0.05;
        } elseif (strpos($formula, 'net_salary') !== false) {
            // صافي المرتب = المستحقات - المستقطعات
            $entitlements = $baseSalary * 1.1;
            $deductions = $baseSalary * 0.05;
            return $entitlements - $deductions;
        } elseif (strpos($formula, 'insurance_amount') !== false) {
            // التأمين = 2% من الراتب
            return $baseSalary * 0.02;
        } elseif (strpos($formula, 'efficiency_rate') !== false) {
            // نسبة الكفاءة = 95% (افتراضية)
            return 95;
        } elseif (strpos($formula, 'commitment_days') !== false) {
            // أيام الالتزام = 22 يوم (افتراضية)
            return 22;
        } elseif (strpos($formula, 'daily_wage') !== false) {
            // الأجر اليومي = الراتب / 30
            return $baseSalary / 30;
        } elseif (strpos($formula, 'hourly_wage') !== false) {
            // أجر الساعة = الأجر اليومي / 8
            return ($baseSalary / 30) / 8;
        } elseif (strpos($formula, 'weekly_work_days') !== false) {
            // أيام العمل الأسبوعية = 6 أيام
            return 6;
        } elseif (strpos($formula, 'daily_work_hours') !== false) {
            // الساعات اليومية = 8 ساعات
            return 8;
        } elseif (strpos($formula, 'meal_value') !== false) {
            // قيمة الوجبة = 50 ج.م. يومياً
            return 50;
        } elseif (strpos($formula, 'work_overtime_value') !== false) {
            // قيمة إضافي العمل = 100 ج.م. (افتراضية)
            return 100;
        } elseif (strpos($formula, 'transport_overtime_value') !== false) {
            // قيمة إضافي المواصلات = 30 ج.م. (افتراضية)
            return 30;
        } elseif (strpos($formula, 'weekly_incentive') !== false) {
            // الحافز الأسبوعي = 200 ج.م. (افتراضية)
            return 200;
        } elseif (strpos($formula, 'overtime_work_hours') !== false) {
            // ساعات العمل الإضافي = 2 ساعة (افتراضية)
            return 2;
        } elseif (strpos($formula, 'overtime_holiday_hours') !== false) {
            // ساعات العمل الإضافي في العطلات = 0 (افتراضية)
            return 0;
        } elseif (strpos($formula, 'total_overtime_hours') !== false) {
            // إجمالي ساعات الإضافي = 2 ساعة (افتراضية)
            return 2;
        } elseif (strpos($formula, 'calculated_late_hours') !== false) {
            // ساعات التأخير المحسوبة = 0.5 ساعة (افتراضية)
            return 0.5;
        } elseif (strpos($formula, 'work_hours') !== false) {
            // ساعات العمل = 8 ساعات (افتراضية)
            return 8;
        } elseif (strpos($formula, 'overtime_hours') !== false) {
            // ساعات العمل الإضافي = 2 ساعة (افتراضية)
            return 2;
        } elseif (strpos($formula, 'late_penalty_value') !== false) {
            // قيمة جزاء التأخير = 50 ج.م. (افتراضية)
            return 50;
        } elseif (strpos($formula, 'absent_value') !== false) {
            // قيمة الغياب = 100 ج.م. (افتراضية)
            return 100;
        } elseif (strpos($formula, 'penalty_value') !== false) {
            // قيمة الجزاءات = 75 ج.م. (افتراضية)
            return 75;
        } elseif (strpos($formula, 'absent_penalty') !== false) {
            // غرامة الغياب = 150 ج.م. (افتراضية)
            return 150;
        } elseif (strpos($formula, 'attendance_bonus') !== false) {
            // انتظام = 100 ج.م. (افتراضية)
            return 100;
        } elseif (strpos($formula, 'remaining_advance') !== false) {
            // المتبقي من السلفة = 0 (افتراضية)
            return 0;
        } elseif (strpos($formula, 'hourly_rate') !== false) {
            // أجر الساعة الشهري = الراتب / 30 / 8
            return ($baseSalary / 30) / 8;
        } else {
            // إذا لم تكن هناك معادلة معروفة، أرجع قيمة افتراضية
            return 0;
        }
    } catch (Exception $e) {
        error_log("Error in evaluateSimpleFormula: " . $e->getMessage());
        return 0;
    }
}

try {
    // جلب البيانات من الطلب
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    
    // إذا فشل JSON، جرب GET
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
        case 'get_salary_summary':
            $data = getSalarySummaryData($pdo, $period);
            echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_salary_entitlements':
            $data = getSalaryEntitlementsData($pdo, $period);
            echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_salary_deductions':
            $data = getSalaryDeductionsData($pdo, $period);
            echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_attendance_logs':
            $data = getAttendanceLogsData($pdo, $period);
            echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_employees':
            $data = getEmployeesData($pdo);
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

function getSalarySummaryData($pdo, $period) {
    try {
        // جلب الموظفين النشطين
        $stmt = $pdo->prepare("SELECT * FROM employees WHERE status = 'active' ORDER BY name");
        $stmt->execute();
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $summaryData = [];
        
        foreach ($employees as $employee) {
            $employeeId = $employee['id'];
            $baseSalary = $employee['base_salary'];
            $actualSalary = $baseSalary;
            
            // بيانات أساسية
            $rowData = [
                'id' => $employeeId,
                'name' => $employee['name'],
                'employee_code' => $employee['employee_code'],
                'department' => $employee['department'],
                'base_salary' => number_format($baseSalary, 2) . ' ج.م.'
            ];
            
            // حساب الحقول الديناميكية
            $periodData = ['start_date' => $period . '-01', 'end_date' => $period . '-31'];
            
            // إجمالي المستحقات
            $totalEntitlements = calculateFieldValueDynamic($pdo, 'salary_summary', 'total_entitlements', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['total_entitlements'] = number_format($totalEntitlements, 2) . ' ج.م.';
            
            // إجمالي المستقطعات
            $totalDeductions = calculateFieldValueDynamic($pdo, 'salary_summary', 'total_deductions', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['total_deductions'] = number_format($totalDeductions, 2) . ' ج.م.';
            
            // صافي المرتب (حساب مباشر)
            $netSalary = $totalEntitlements - $totalDeductions;
            $rowData['net_salary'] = number_format($netSalary, 2) . ' ج.م.';
            
            // أيام الالتزام
            $commitmentDays = calculateFieldValueDynamic($pdo, 'salary_summary', 'commitment_days', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['commitment_days'] = number_format($commitmentDays, 0);
            
            // قيمة التأمين
            $insuranceAmount = calculateFieldValueDynamic($pdo, 'salary_summary', 'insurance_amount', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['insurance_amount'] = number_format($insuranceAmount, 2) . ' ج.م.';
            
            // المتبقي من السلفة
            $remainingAdvance = calculateFieldValueDynamic($pdo, 'salary_summary', 'remaining_advance', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['remaining_advance'] = number_format($remainingAdvance, 2) . ' ج.م.';
            
            // نسبة الكفاءة
            $efficiencyRate = calculateFieldValueDynamic($pdo, 'salary_summary', 'efficiency_rate', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['efficiency_rate'] = number_format($efficiencyRate, 1) . '%';
            
            $summaryData[] = $rowData;
        }
        
        return $summaryData;
        
    } catch (Exception $e) {
        error_log("Error in getSalarySummaryData: " . $e->getMessage());
        return [];
    }
}

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
                'department' => $employee['department']
            ];
            
            $periodData = ['start_date' => $period . '-01', 'end_date' => $period . '-31'];
            
            // ساعات العمل الإضافي
            $overtimeWorkHours = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'overtime_work_hours', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['overtime_work_hours'] = number_format($overtimeWorkHours, 1);
            
            // ساعات العمل الإضافي في العطلات
            $overtimeHolidayHours = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'overtime_holiday_hours', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['overtime_holiday_hours'] = number_format($overtimeHolidayHours, 1);
            
            // إجمالي ساعات الإضافي
            $totalOvertimeHours = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'total_overtime_hours', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['total_overtime_hours'] = number_format($totalOvertimeHours, 1);
            
            // أيام الالتزام (الوجبة)
            $commitmentDays = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'commitment_days', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['commitment_days'] = number_format($commitmentDays, 0);
            
            // الأجر الأسبوعي
            $weeklySalary = $baseSalary;
            if ($employee['salary_type'] === 'monthly') {
                $weeklySalary = $baseSalary / 4;
            }
            $rowData['weekly_salary'] = number_format($weeklySalary, 2) . ' ج.م.';
            
            // أيام العمل/الأسبوع
            $weeklyWorkDays = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'weekly_work_days', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['weekly_work_days'] = number_format($weeklyWorkDays, 0);
            
            // الأجر اليومي
            $dailyWage = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'daily_wage', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['daily_wage'] = number_format($dailyWage, 2) . ' ج.م.';
            
            // الساعات/اليوم
            $dailyWorkHours = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'daily_work_hours', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['daily_work_hours'] = number_format($dailyWorkHours, 1);
            
            // أجر الساعة
            $hourlyWage = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'hourly_wage', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['hourly_wage'] = number_format($hourlyWage, 2) . ' ج.م.';
            
            // قيمة الوجبة
            $mealValue = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'meal_value', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['meal_value'] = number_format($mealValue, 2) . ' ج.م.';
            
            // قيمة إضافي ساعات العمل
            $workOvertimeValue = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'work_overtime_value', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['work_overtime_value'] = number_format($workOvertimeValue, 2) . ' ج.م.';
            
            // قيمة إضافي المواصلات
            $transportOvertimeValue = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'transport_overtime_value', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['transport_overtime_value'] = number_format($transportOvertimeValue, 2) . ' ج.م.';
            
            // نسبة الكفاءة
            $efficiencyRate = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'efficiency_rate', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['efficiency_rate'] = number_format($efficiencyRate, 1) . '%';
            
            // مكافأة خاصة
            $specialBonus = 0; // يمكن إضافتها لاحقاً
            $rowData['special_bonus'] = number_format($specialBonus, 2) . ' ج.م.';
            
            // الحافز الأسبوعي
            $weeklyIncentive = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'weekly_incentive', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['weekly_incentive'] = number_format($weeklyIncentive, 2) . ' ج.م.';
            
            // إجمالي المستحقات
            $totalEntitlements = calculateFieldValueDynamic($pdo, 'salary_entitlements', 'total_entitlements', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['total_entitlements'] = number_format($totalEntitlements, 2) . ' ج.م.';
            
            $entitlementsData[] = $rowData;
        }
        
        return $entitlementsData;
        
    } catch (Exception $e) {
        error_log("Error in getSalaryEntitlementsData: " . $e->getMessage());
        return [];
    }
}

function getSalaryDeductionsData($pdo, $period) {
    try {
        $stmt = $pdo->prepare("SELECT * FROM employees WHERE status = 'active' ORDER BY name");
        $stmt->execute();
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $deductionsData = [];
        
        foreach ($employees as $employee) {
            $employeeId = $employee['id'];
            $baseSalary = $employee['base_salary'];
            $actualSalary = $baseSalary;
            
            $rowData = [
                'id' => $employeeId,
                'name' => $employee['name'],
                'employee_code' => $employee['employee_code'],
                'department' => $employee['department']
            ];
            
            $periodData = ['start_date' => $period . '-01', 'end_date' => $period . '-31'];
            
            // سلف العاملين
            $advanceAmount = 0; // يمكن إضافتها من جدول منفصل
            $rowData['advance_amount'] = number_format($advanceAmount, 2) . ' ج.م.';
            
            // المتبقي من السلفة
            $remainingAdvance = calculateFieldValueDynamic($pdo, 'salary_deductions', 'remaining_advance', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['remaining_advance'] = number_format($remainingAdvance, 2) . ' ج.م.';
            
            // عدد أيام الغياب
            $absentDays = 0; // يمكن حسابها من سجلات الحضور
            $rowData['absent_days'] = number_format($absentDays, 0);
            
            // عدد ساعات التأخير
            $lateHours = calculateFieldValueDynamic($pdo, 'salary_deductions', 'calculated_late_hours', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['late_hours'] = number_format($lateHours, 1);
            
            // قيمة جزاء التأخير
            $latePenaltyValue = calculateFieldValueDynamic($pdo, 'salary_deductions', 'late_penalty_value', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['late_penalty_value'] = number_format($latePenaltyValue, 2) . ' ج.م.';
            
            // عدد أيام الجزاءات
            $penaltyDays = 0; // يمكن إضافتها لاحقاً
            $rowData['penalty_days'] = number_format($penaltyDays, 0);
            
            // سبب الجزاء
            $penaltyReason = '-'; // يمكن إضافتها لاحقاً
            $rowData['penalty_reason'] = $penaltyReason;
            
            // قيمة الغياب
            $absentValue = calculateFieldValueDynamic($pdo, 'salary_deductions', 'absent_value', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['absent_value'] = number_format($absentValue, 2) . ' ج.م.';
            
            // قيمة الجزاءات
            $penaltyValue = calculateFieldValueDynamic($pdo, 'salary_deductions', 'penalty_value', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['penalty_value'] = number_format($penaltyValue, 2) . ' ج.م.';
            
            // غرامة الغياب
            $absentPenalty = calculateFieldValueDynamic($pdo, 'salary_deductions', 'absent_penalty', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['absent_penalty'] = number_format($absentPenalty, 2) . ' ج.م.';
            
            // التأمين
            $insuranceAmount = calculateFieldValueDynamic($pdo, 'salary_deductions', 'insurance_amount_weekly_monthly', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['insurance_amount'] = number_format($insuranceAmount, 2) . ' ج.م.';
            
            // إجمالي المستقطعات
            $totalDeductions = calculateFieldValueDynamic($pdo, 'salary_deductions', 'total_deductions', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['total_deductions'] = number_format($totalDeductions, 2) . ' ج.م.';
            
            $deductionsData[] = $rowData;
        }
        
        return $deductionsData;
        
    } catch (Exception $e) {
        error_log("Error in getSalaryDeductionsData: " . $e->getMessage());
        return [];
    }
}

function getAttendanceLogsData($pdo, $period) {
    try {
        // جلب سجلات الحضور
        $stmt = $pdo->prepare("
            SELECT 
                al.*,
                e.name as employee_name,
                e.employee_code,
                e.department
            FROM attendance_logs al
            LEFT JOIN employees e ON al.employee_id = e.id
            WHERE DATE_FORMAT(al.attendance_date, '%Y-%m') = ?
            AND e.status = 'active'
            ORDER BY al.attendance_date DESC, e.name
        ");
        $stmt->execute([$period]);
        $attendanceLogs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $logsData = [];
        
        foreach ($attendanceLogs as $log) {
            $employeeId = $log['employee_id'];
            $baseSalary = 0; // يمكن جلبها من جدول الموظفين
            
            $rowData = [
                'id' => $log['id'],
                'employee_id' => $employeeId,
                'employee_name' => $log['employee_name'],
                'employee_code' => $log['employee_code'],
                'department' => $log['department'],
                'attendance_date' => $log['attendance_date'],
                'check_in' => $log['check_in'],
                'check_out' => $log['check_out']
            ];
            
            $periodData = ['start_date' => $log['attendance_date'], 'end_date' => $log['attendance_date']];
            
            // ساعات العمل
            $workHours = calculateFieldValueDynamic($pdo, 'attendance_logs', 'work_hours', $employeeId, $baseSalary, $baseSalary, $periodData);
            $rowData['work_hours'] = number_format($workHours, 1);
            
            // ساعات العمل الإضافي
            $overtimeHours = calculateFieldValueDynamic($pdo, 'attendance_logs', 'overtime_hours', $employeeId, $baseSalary, $baseSalary, $periodData);
            $rowData['overtime_hours'] = number_format($overtimeHours, 1);
            
            // ساعات التأخير المحسوبة
            $calculatedLateHours = calculateFieldValueDynamic($pdo, 'attendance_logs', 'calculated_late_hours', $employeeId, $baseSalary, $baseSalary, $periodData);
            $rowData['calculated_late_hours'] = number_format($calculatedLateHours, 1);
            
            // أيام الالتزام
            $commitmentDays = calculateFieldValueDynamic($pdo, 'attendance_logs', 'commitment_days', $employeeId, $baseSalary, $baseSalary, $periodData);
            $rowData['commitment_days'] = number_format($commitmentDays, 0);
            
            // الساعات اليومية
            $dailyWorkHours = calculateFieldValueDynamic($pdo, 'attendance_logs', 'daily_work_hours', $employeeId, $baseSalary, $baseSalary, $periodData);
            $rowData['daily_work_hours'] = number_format($dailyWorkHours, 1);
            
            // الأجر اليومي
            $dailyWage = calculateFieldValueDynamic($pdo, 'attendance_logs', 'daily_wage', $employeeId, $baseSalary, $baseSalary, $periodData);
            $rowData['daily_wage'] = number_format($dailyWage, 2) . ' ج.م.';
            
            // أجر الساعة
            $hourlyWage = calculateFieldValueDynamic($pdo, 'attendance_logs', 'hourly_wage', $employeeId, $baseSalary, $baseSalary, $periodData);
            $rowData['hourly_wage'] = number_format($hourlyWage, 2) . ' ج.م.';
            
            // قيمة الوجبة
            $mealValue = calculateFieldValueDynamic($pdo, 'attendance_logs', 'meal_value', $employeeId, $baseSalary, $baseSalary, $periodData);
            $rowData['meal_value'] = number_format($mealValue, 2) . ' ج.م.';
            
            // قيمة إضافي العمل
            $workOvertimeValue = calculateFieldValueDynamic($pdo, 'attendance_logs', 'work_overtime_value', $employeeId, $baseSalary, $baseSalary, $periodData);
            $rowData['work_overtime_value'] = number_format($workOvertimeValue, 2) . ' ج.م.';
            
            // ساعات العمل الإضافي العادي
            $overtimeWorkHours = calculateFieldValueDynamic($pdo, 'attendance_logs', 'overtime_work_hours', $employeeId, $baseSalary, $baseSalary, $periodData);
            $rowData['overtime_work_hours'] = number_format($overtimeWorkHours, 1);
            
            // ساعات العمل الإضافي في العطلات
            $overtimeHolidayHours = calculateFieldValueDynamic($pdo, 'attendance_logs', 'overtime_holiday_hours', $employeeId, $baseSalary, $baseSalary, $periodData);
            $rowData['overtime_holiday_hours'] = number_format($overtimeHolidayHours, 1);
            
            // إجمالي ساعات الإضافي
            $totalOvertimeHours = calculateFieldValueDynamic($pdo, 'attendance_logs', 'total_overtime_hours', $employeeId, $baseSalary, $baseSalary, $periodData);
            $rowData['total_overtime_hours'] = number_format($totalOvertimeHours, 1);
            
            // أيام التأخير مع فترة السماح
            $gracePeriodLateDays = calculateFieldValueDynamic($pdo, 'attendance_logs', 'grace_period_late_days', $employeeId, $baseSalary, $baseSalary, $periodData);
            $rowData['grace_period_late_days'] = number_format($gracePeriodLateDays, 0);
            
            // دقائق التأخير مع فترة السماح
            $gracePeriodLateMinutes = calculateFieldValueDynamic($pdo, 'attendance_logs', 'grace_period_late_minutes', $employeeId, $baseSalary, $baseSalary, $periodData);
            $rowData['grace_period_late_minutes'] = number_format($gracePeriodLateMinutes, 0);
            
            // حساب ساعات التأخير العادي
            $lateHoursCalculation = calculateFieldValueDynamic($pdo, 'attendance_logs', 'late_hours_calculation', $employeeId, $baseSalary, $baseSalary, $periodData);
            $rowData['late_hours_calculation'] = number_format($lateHoursCalculation, 1);
            
            // حساب ساعات التأخير مع فترة السماح
            $gracePeriodLateHoursCalculation = calculateFieldValueDynamic($pdo, 'attendance_logs', 'grace_period_late_hours_calculation', $employeeId, $baseSalary, $baseSalary, $periodData);
            $rowData['grace_period_late_hours_calculation'] = number_format($gracePeriodLateHoursCalculation, 1);
            
            // انتظام
            $attendanceBonus = calculateFieldValueDynamic($pdo, 'attendance_logs', 'attendance_bonus', $employeeId, $baseSalary, $baseSalary, $periodData);
            $rowData['attendance_bonus'] = number_format($attendanceBonus, 2) . ' ج.م.';
            
            $logsData[] = $rowData;
        }
        
        return $logsData;
        
    } catch (Exception $e) {
        error_log("Error in getAttendanceLogsData: " . $e->getMessage());
        return [];
    }
}

function getEmployeesData($pdo) {
    try {
        $stmt = $pdo->prepare("SELECT * FROM employees WHERE status = 'active' ORDER BY name");
        $stmt->execute();
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $employeesData = [];
        
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
                'salary_type' => $employee['salary_type'],
                'hire_date' => $employee['hire_date']
            ];
            
            $periodData = ['start_date' => date('Y-m-01'), 'end_date' => date('Y-m-31')];
            
            // أيام العمل الأسبوعية
            $weeklyWorkDays = calculateFieldValueDynamic($pdo, 'employees', 'weekly_work_days', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['weekly_work_days'] = number_format($weeklyWorkDays, 0);
            
            // الأجر اليومي
            $dailyWage = calculateFieldValueDynamic($pdo, 'employees', 'daily_wage', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['daily_wage'] = number_format($dailyWage, 2) . ' ج.م.';
            
            // أجر الساعة
            $hourlyWage = calculateFieldValueDynamic($pdo, 'employees', 'hourly_wage', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['hourly_wage'] = number_format($hourlyWage, 2) . ' ج.م.';
            
            // أجر الساعة الشهري
            $hourlyRate = calculateFieldValueDynamic($pdo, 'employees', 'hourly_rate', $employeeId, $baseSalary, $actualSalary, $periodData);
            $rowData['hourly_rate'] = number_format($hourlyRate, 2) . ' ج.م.';
            
            $employeesData[] = $rowData;
        }
        
        return $employeesData;
        
    } catch (Exception $e) {
        error_log("Error in getEmployeesData: " . $e->getMessage());
        return [];
    }
}
?>

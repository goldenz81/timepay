<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

require_once '../config_unified.php';

try {
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    if ($action === 'preview_formula') {
        $formula = $_POST['formula'] ?? '';
        
        if (empty($formula)) {
            echo json_encode([
                'success' => false,
                'message' => 'المعادلة مطلوبة'
            ]);
            exit;
        }
        
        // Get all available variables
        $availableVariables = [];
        
        // Get system variables
        $stmt = $pdo->query("SELECT variable_key FROM system_variables WHERE is_active = 1");
        $systemVars = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $availableVariables = array_merge($availableVariables, $systemVars);
        
        // Get employee data fields
        $employeeFields = [
            'id', 'name', 'position', 'department', 'base_salary', 'salary_type', 
            'hire_date', 'employee_code', 'cost_center', 'insurance_salary'
        ];
        $availableVariables = array_merge($availableVariables, $employeeFields);
        
        // Get attendance data fields
        $attendanceFields = [
            'total_days', 'present_days', 'absent_days', 'on_time_days', 'late_days',
            'total_work_hours', 'total_late_minutes', 'holiday_work_hours', 
            'regular_work_hours', 'holiday_days', 'total_overtime_hours', 
            'total_transport_allowance', 'avg_work_hours', 'calculated_late_hours',
            'is_holiday', 'overtime_hours', 'work_hours', 'daily_work_hours',
            'weekly_work_days', 'monthly_work_days', 'commitment_days',
            'daily_wage', 'hourly_wage', 'special_bonus', 'advance_amount',
            'penalty_value', 'overtime_work_hours', 'overtime_holiday_hours'
        ];
        $availableVariables = array_merge($availableVariables, $attendanceFields);
        
        // Get calculation fields
        $calculationFields = [
            'base_salary', 'actual_salary', 'employee_id', 'period'
        ];
        $availableVariables = array_merge($availableVariables, $calculationFields);
        
        // Remove duplicates
        $availableVariables = array_unique($availableVariables);
        
        // Extract variables from formula
        $extractedVariables = extractVariablesFromFormula($formula);
        
        // Check each variable
        $variableStatus = [];
        foreach ($extractedVariables as $variable) {
            $variableStatus[$variable] = [
                'variable' => $variable,
                'exists' => in_array($variable, $availableVariables),
                'color' => in_array($variable, $availableVariables) ? 'green' : 'red'
            ];
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'formula' => $formula,
                'variables' => $variableStatus,
                'total_variables' => count($extractedVariables),
                'existing_variables' => count(array_filter($variableStatus, function($v) { return $v['exists']; })),
                'missing_variables' => count(array_filter($variableStatus, function($v) { return !$v['exists']; }))
            ]
        ]);
        
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'إجراء غير صحيح'
        ]);
    }
    
} catch (Exception $e) {
    error_log("Error in formula_preview_api.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في الخادم: ' . $e->getMessage()
    ]);
}

function extractVariablesFromFormula($formula) {
    // Get all system variables dynamically
    require_once '../config_unified.php';
    
    try {
        $stmt = $pdo->query("
            SELECT variable_key 
            FROM system_variables 
            WHERE is_active = 1
            ORDER BY variable_key
        ");
        $systemVariables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    } catch (Exception $e) {
        $systemVariables = [];
    }
    
    // Define known variables to look for (including system variables)
    $knownVariables = array_merge([
        'base_salary', 'actual_salary', 'salary_type', 'on_time_days', 'meal_allowance_per_day',
        'daily_wage', 'hourly_wage', 'overtime_hours', 'work_hours', 'present_days', 'absent_days',
        'late_days', 'commitment_days', 'daily_work_hours', 'weekly_work_days', 'monthly_work_days',
        'total_days', 'total_work_hours', 'total_late_minutes', 'holiday_work_hours', 'regular_work_hours',
        'holiday_days', 'total_overtime_hours', 'total_transport_allowance', 'avg_work_hours',
        'calculated_late_hours', 'is_holiday', 'special_bonus', 'advance_amount', 'penalty_value',
        'overtime_work_hours', 'overtime_holiday_hours', 'employee_id', 'period',
        'id', 'name', 'position', 'department', 'hire_date', 'employee_code', 'cost_center', 'insurance_salary'
    ], $systemVariables);
    
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
?>

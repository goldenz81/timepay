<?php
require_once 'config_unified.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $results = [];
    
    // ========== إضافة/تحديث معادلات المستحقات ==========
    $entitlementsFormulas = [
        [
            'column_key' => 'daily_wage',
            'formula' => 'base_salary / monthly_work_days'
        ],
        [
            'column_key' => 'hourly_wage',
            'formula' => 'daily_wage / daily_work_hours'
        ],
        [
            'column_key' => 'overtime_hours',
            'formula' => 'regular_overtime_hours + holiday_overtime_hours'
        ],
        [
            'column_key' => 'overtime_pay',
            'formula' => '(regular_overtime_hours * hourly_wage * regular_overtime_multiplier) + (holiday_overtime_hours * hourly_wage * holiday_work_multiplier)'
        ],
        [
            'column_key' => 'punctuality_bonus',
            'formula' => 'on_time_days * meal_allowance_per_day'
        ],
        [
            'column_key' => 'total_entitlements',
            'formula' => 'base_salary + transport_allowance + special_bonus + overtime_pay'
        ]
    ];
    
    foreach ($entitlementsFormulas as $formulaData) {
        $columnKey = $formulaData['column_key'];
        $formula = $formulaData['formula'];
        
        $stmt = $pdo->prepare("SELECT id FROM monthly_salary_entitlements_columns WHERE column_key = ?");
        $stmt->execute([$columnKey]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            $updateStmt = $pdo->prepare("
                UPDATE monthly_salary_entitlements_columns 
                SET formula = ?, is_calculated = 1 
                WHERE id = ?
            ");
            $updateStmt->execute([$formula, $existing['id']]);
            $results[] = [
                'table' => 'monthly_salary_entitlements_columns',
                'column_key' => $columnKey,
                'action' => 'updated',
                'formula' => $formula
            ];
        }
    }
    
    // ========== إضافة/تحديث معادلات المستقطعات ==========
    $deductionsFormulas = [
        [
            'column_key' => 'absence_deduction',
            'formula' => 'absent_days * daily_wage'
        ],
        [
            'column_key' => 'late_deduction',
            'formula' => 'late_hours * hourly_wage'
        ],
        [
            'column_key' => 'insurance_deduction',
            'formula' => 'monthly_insurance_amount'
        ],
        [
            'column_key' => 'advance_installment',
            'formula' => 'advance_installment_amount'
        ],
        [
            'column_key' => 'total_deductions',
            'formula' => 'absence_deduction + late_deduction + insurance_deduction + advance_installment'
        ]
    ];
    
    foreach ($deductionsFormulas as $formulaData) {
        $columnKey = $formulaData['column_key'];
        $formula = $formulaData['formula'];
        
        $stmt = $pdo->prepare("SELECT id FROM monthly_salary_deductions_columns WHERE column_key = ?");
        $stmt->execute([$columnKey]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            $updateStmt = $pdo->prepare("
                UPDATE monthly_salary_deductions_columns 
                SET formula = ?, is_calculated = 1 
                WHERE id = ?
            ");
            $updateStmt->execute([$formula, $existing['id']]);
            $results[] = [
                'table' => 'monthly_salary_deductions_columns',
                'column_key' => $columnKey,
                'action' => 'updated',
                'formula' => $formula
            ];
        }
    }
    
    echo json_encode([
        'success' => true,
        'updated' => count($results),
        'results' => $results
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}


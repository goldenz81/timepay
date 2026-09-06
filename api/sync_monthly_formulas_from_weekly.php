<?php
require_once 'config_unified.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // جلب المعادلات من الراتب الأسبوعي
    $weeklyEntitlements = $pdo->query("
        SELECT column_key, formula, is_calculated
        FROM weekly_wage_entitlements
        WHERE is_calculated = 1 AND formula IS NOT NULL AND formula != '' AND formula != column_key
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    $weeklyDeductions = $pdo->query("
        SELECT column_key, formula, is_calculated
        FROM weekly_wage_deductions
        WHERE is_calculated = 1 AND formula IS NOT NULL AND formula != '' AND formula != column_key
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    $weeklyNet = $pdo->query("
        SELECT column_key, formula, is_calculated
        FROM net_weekly_wage
        WHERE is_calculated = 1 AND formula IS NOT NULL AND formula != '' AND formula != column_key
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    // دالة لتحويل المعادلات الأسبوعية إلى شهرية
    function convertWeeklyToMonthlyFormula($formula) {
        // استبدال المتغيرات الأسبوعية بالشهرية
        $replacements = [
            'weekly_work_days' => 'monthly_work_days',
            'daily_wage' => 'daily_wage', // يبقى كما هو
            'hourly_wage' => 'hourly_wage', // يبقى كما هو
            'base_salary' => 'base_salary', // يبقى كما هو
            'weekly_wage' => 'base_salary', // في الشهري، الأجر الأسبوعي = الراتب الأساسي
            'special_bonus_weekly' => 'special_bonus', // في الشهري، المكافأة الخاصة
        ];
        
        $converted = $formula;
        foreach ($replacements as $weekly => $monthly) {
            $converted = str_replace($weekly, $monthly, $converted);
        }
        
        return $converted;
    }
    
    $results = [];
    $updated = 0;
    $created = 0;
    
    // تحديث/إنشاء معادلات المستحقات الشهرية
    foreach ($weeklyEntitlements as $weekly) {
        $columnKey = $weekly['column_key'];
        $monthlyFormula = convertWeeklyToMonthlyFormula($weekly['formula']);
        
        // التحقق من وجود العمود في الجدول الشهري
        $stmt = $pdo->prepare("SELECT id, formula FROM monthly_salary_entitlements_columns WHERE column_key = ?");
        $stmt->execute([$columnKey]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            // تحديث المعادلة إذا كانت مختلفة أو فارغة
            if (empty($existing['formula']) || $existing['formula'] == $columnKey) {
                $updateStmt = $pdo->prepare("
                    UPDATE monthly_salary_entitlements_columns 
                    SET formula = ?, is_calculated = 1 
                    WHERE id = ?
                ");
                $updateStmt->execute([$monthlyFormula, $existing['id']]);
                $updated++;
                $results[] = [
                    'table' => 'monthly_salary_entitlements_columns',
                    'column_key' => $columnKey,
                    'action' => 'updated',
                    'formula' => $monthlyFormula
                ];
            }
        }
    }
    
    // تحديث/إنشاء معادلات المستقطعات الشهرية
    foreach ($weeklyDeductions as $weekly) {
        $columnKey = $weekly['column_key'];
        $monthlyFormula = convertWeeklyToMonthlyFormula($weekly['formula']);
        
        // التحقق من وجود العمود في الجدول الشهري
        $stmt = $pdo->prepare("SELECT id, formula FROM monthly_salary_deductions_columns WHERE column_key = ?");
        $stmt->execute([$columnKey]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            // تحديث المعادلة إذا كانت مختلفة أو فارغة
            if (empty($existing['formula']) || $existing['formula'] == $columnKey) {
                $updateStmt = $pdo->prepare("
                    UPDATE monthly_salary_deductions_columns 
                    SET formula = ?, is_calculated = 1 
                    WHERE id = ?
                ");
                $updateStmt->execute([$monthlyFormula, $existing['id']]);
                $updated++;
                $results[] = [
                    'table' => 'monthly_salary_deductions_columns',
                    'column_key' => $columnKey,
                    'action' => 'updated',
                    'formula' => $monthlyFormula
                ];
            }
        }
    }
    
    // تحديث/إنشاء معادلات صافي المرتب الشهري
    foreach ($weeklyNet as $weekly) {
        $columnKey = $weekly['column_key'];
        $monthlyFormula = convertWeeklyToMonthlyFormula($weekly['formula']);
        
        // التحقق من وجود العمود في الجدول الشهري
        $stmt = $pdo->prepare("SELECT id, formula FROM net_monthly_salary WHERE column_key = ?");
        $stmt->execute([$columnKey]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            // تحديث المعادلة إذا كانت مختلفة أو فارغة
            if (empty($existing['formula']) || $existing['formula'] == $columnKey) {
                $updateStmt = $pdo->prepare("
                    UPDATE net_monthly_salary 
                    SET formula = ?, is_calculated = 1 
                    WHERE id = ?
                ");
                $updateStmt->execute([$monthlyFormula, $existing['id']]);
                $updated++;
                $results[] = [
                    'table' => 'net_monthly_salary',
                    'column_key' => $columnKey,
                    'action' => 'updated',
                    'formula' => $monthlyFormula
                ];
            }
        }
    }
    
    // إضافة معادلات إضافية مطلوبة للراتب الشهري
    $additionalFormulas = [
        // معادلات المستحقات
        [
            'table' => 'monthly_salary_entitlements_columns',
            'column_key' => 'daily_wage',
            'formula' => 'base_salary / monthly_work_days'
        ],
        [
            'table' => 'monthly_salary_entitlements_columns',
            'column_key' => 'hourly_wage',
            'formula' => 'daily_wage / daily_work_hours'
        ],
        [
            'table' => 'monthly_salary_entitlements_columns',
            'column_key' => 'overtime_total_amount',
            'formula' => 'overtime_pay'
        ],
        [
            'table' => 'monthly_salary_entitlements_columns',
            'column_key' => 'total_entitlements',
            'formula' => 'base_salary + transport_allowance + special_bonus + overtime_total_amount'
        ],
        // معادلات المستقطعات
        [
            'table' => 'monthly_salary_deductions_columns',
            'column_key' => 'absent_value',
            'formula' => 'absent_days * daily_wage'
        ],
        [
            'table' => 'monthly_salary_deductions_columns',
            'column_key' => 'delay_fine',
            'formula' => 'late_hours * hourly_wage'
        ],
        [
            'table' => 'monthly_salary_deductions_columns',
            'column_key' => 'insurance_value',
            'formula' => 'base_salary * insurance_rate'
        ],
        [
            'table' => 'monthly_salary_deductions_columns',
            'column_key' => 'advance_installment',
            'formula' => 'advance_installment_amount'
        ],
        [
            'table' => 'monthly_salary_deductions_columns',
            'column_key' => 'total_deductions',
            'formula' => 'absent_value + delay_fine + insurance_value + advance_installment'
        ],
        // معادلات صافي المرتب
        [
            'table' => 'net_monthly_salary',
            'column_key' => 'total_entitlements',
            'formula' => 'base_salary + transport_allowance + special_bonus + overtime_total_amount'
        ],
        [
            'table' => 'net_monthly_salary',
            'column_key' => 'total_deductions',
            'formula' => 'absent_value + delay_fine + insurance_value + advance_installment'
        ],
        [
            'table' => 'net_monthly_salary',
            'column_key' => 'net_monthly_amount',
            'formula' => 'total_entitlements - total_deductions'
        ]
    ];
    
    foreach ($additionalFormulas as $formulaData) {
        $table = $formulaData['table'];
        $columnKey = $formulaData['column_key'];
        $formula = $formulaData['formula'];
        
        $stmt = $pdo->prepare("SELECT id, formula FROM {$table} WHERE column_key = ?");
        $stmt->execute([$columnKey]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            if (empty($existing['formula']) || $existing['formula'] == $columnKey) {
                $updateStmt = $pdo->prepare("
                    UPDATE {$table} 
                    SET formula = ?, is_calculated = 1 
                    WHERE id = ?
                ");
                $updateStmt->execute([$formula, $existing['id']]);
                $updated++;
                $results[] = [
                    'table' => $table,
                    'column_key' => $columnKey,
                    'action' => 'updated',
                    'formula' => $formula
                ];
            }
        } else {
            // إنشاء العمود إذا لم يكن موجوداً
            $insertStmt = $pdo->prepare("
                INSERT INTO {$table} (column_key, column_name_ar, formula, is_calculated, is_visible, display_order)
                VALUES (?, ?, ?, 1, 1, 999)
            ");
            $insertStmt->execute([$columnKey, $columnKey, $formula]);
            $created++;
            $results[] = [
                'table' => $table,
                'column_key' => $columnKey,
                'action' => 'created',
                'formula' => $formula
            ];
        }
    }
    
    echo json_encode([
        'success' => true,
        'updated' => $updated,
        'created' => $created,
        'total' => count($results),
        'results' => $results
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}


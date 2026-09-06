<?php
require_once 'config_unified.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // دالة لتحويل المعادلات الأسبوعية إلى شهرية
    function convertWeeklyToMonthlyFormula($formula) {
        if (empty($formula)) return '';
        
        // استبدال المتغيرات الأسبوعية بالشهرية
        $replacements = [
            'weekly_work_days' => 'monthly_work_days',
            'weekly_wage' => 'base_salary', // في الشهري، الأجر الأسبوعي = الراتب الأساسي
            'special_bonus_weekly' => 'special_bonus', // في الشهري، المكافأة الخاصة
        ];
        
        $converted = $formula;
        foreach ($replacements as $weekly => $monthly) {
            // استبدال الكلمة الكاملة فقط (باستخدام word boundaries)
            $converted = preg_replace('/\b' . preg_quote($weekly, '/') . '\b/', $monthly, $converted);
        }
        
        return $converted;
    }
    
    $results = [];
    $updated = 0;
    $created = 0;
    
    // ========== نقل معادلات المستحقات ==========
    $weeklyEntitlements = $pdo->query("
        SELECT column_key, formula, is_calculated, column_name_ar, column_name_en, 
               data_type, display_order, is_visible, is_editable, badge_color, 
               badge_variant, is_currency, decimal_places, description
        FROM weekly_wage_entitlements
        WHERE is_calculated = 1 AND formula IS NOT NULL AND formula != '' AND formula != column_key
        ORDER BY display_order
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($weeklyEntitlements as $weekly) {
        $columnKey = $weekly['column_key'];
        $monthlyFormula = convertWeeklyToMonthlyFormula($weekly['formula']);
        
        // تخطي الأعمدة التي لا تنطبق على الشهري (مثل weekly_wage, regularity_days, regularity_pay)
        if (in_array($columnKey, ['weekly_wage', 'regularity_days', 'regularity_pay'])) {
            continue;
        }
        
        // التحقق من وجود العمود في الجدول الشهري
        $stmt = $pdo->prepare("SELECT id, formula FROM monthly_salary_entitlements_columns WHERE column_key = ?");
        $stmt->execute([$columnKey]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            // تحديث المعادلة
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
                'weekly_formula' => $weekly['formula'],
                'monthly_formula' => $monthlyFormula
            ];
        } else {
            // إنشاء العمود إذا لم يكن موجوداً
            $insertStmt = $pdo->prepare("
                INSERT INTO monthly_salary_entitlements_columns 
                (column_key, column_name_ar, column_name_en, data_type, display_order, 
                 is_visible, is_editable, is_calculated, formula, badge_color, 
                 badge_variant, is_currency, decimal_places, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
            ");
            $insertStmt->execute([
                $columnKey,
                $weekly['column_name_ar'],
                $weekly['column_name_en'],
                $weekly['data_type'] ?? 'number',
                $weekly['display_order'] ?? 999,
                $weekly['is_visible'] ?? 1,
                $weekly['is_editable'] ?? 1,
                $monthlyFormula,
                $weekly['badge_color'] ?? 'blue',
                $weekly['badge_variant'] ?? 'solid',
                $weekly['is_currency'] ?? 0,
                $weekly['decimal_places'] ?? 2,
                $weekly['description'] ?? ''
            ]);
            $created++;
            $results[] = [
                'table' => 'monthly_salary_entitlements_columns',
                'column_key' => $columnKey,
                'action' => 'created',
                'weekly_formula' => $weekly['formula'],
                'monthly_formula' => $monthlyFormula
            ];
        }
    }
    
    // ========== نقل معادلات المستقطعات ==========
    $weeklyDeductions = $pdo->query("
        SELECT column_key, formula, is_calculated, column_name_ar, column_name_en, 
               data_type, display_order, is_visible, is_editable, badge_color, 
               badge_variant, is_currency, decimal_places, description
        FROM weekly_wage_deductions
        WHERE is_calculated = 1 AND formula IS NOT NULL AND formula != '' AND formula != column_key
        ORDER BY display_order
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($weeklyDeductions as $weekly) {
        $columnKey = $weekly['column_key'];
        $monthlyFormula = convertWeeklyToMonthlyFormula($weekly['formula']);
        
        // التحقق من وجود العمود في الجدول الشهري
        $stmt = $pdo->prepare("SELECT id, formula FROM monthly_salary_deductions_columns WHERE column_key = ?");
        $stmt->execute([$columnKey]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            // تحديث المعادلة
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
                'weekly_formula' => $weekly['formula'],
                'monthly_formula' => $monthlyFormula
            ];
        } else {
            // إنشاء العمود إذا لم يكن موجوداً
            $insertStmt = $pdo->prepare("
                INSERT INTO monthly_salary_deductions_columns 
                (column_key, column_name_ar, column_name_en, data_type, display_order, 
                 is_visible, is_editable, is_calculated, formula, badge_color, 
                 badge_variant, is_currency, decimal_places, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
            ");
            $insertStmt->execute([
                $columnKey,
                $weekly['column_name_ar'],
                $weekly['column_name_en'],
                $weekly['data_type'] ?? 'number',
                $weekly['display_order'] ?? 999,
                $weekly['is_visible'] ?? 1,
                $weekly['is_editable'] ?? 1,
                $monthlyFormula,
                $weekly['badge_color'] ?? 'red',
                $weekly['badge_variant'] ?? 'solid',
                $weekly['is_currency'] ?? 0,
                $weekly['decimal_places'] ?? 2,
                $weekly['description'] ?? ''
            ]);
            $created++;
            $results[] = [
                'table' => 'monthly_salary_deductions_columns',
                'column_key' => $columnKey,
                'action' => 'created',
                'weekly_formula' => $weekly['formula'],
                'monthly_formula' => $monthlyFormula
            ];
        }
    }
    
    // إصلاح معادلات daily_wage و hourly_wage للشهري
    $pdo->exec("
        UPDATE monthly_salary_entitlements_columns 
        SET formula = 'base_salary / monthly_work_days'
        WHERE column_key = 'daily_wage'
    ");
    
    $pdo->exec("
        UPDATE monthly_salary_entitlements_columns 
        SET formula = 'daily_wage / daily_work_hours'
        WHERE column_key = 'hourly_wage'
    ");
    
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


<?php

class DynamicFormulaEngine {
    private $conn;
    
    public function __construct($connection) {
        $this->conn = $connection;
    }
    
    /**
     * التحقق من وجود المعادلات المطلوبة
     */
    public function validateRequiredFormulas($requiredFormulas) {
        $missing = [];
        
        foreach ($requiredFormulas as $formula) {
            $stmt = $this->conn->prepare("
                SELECT COUNT(*) as count 
                FROM salary_formulas 
                WHERE formula_key = ? AND is_active = 1
            ");
            $stmt->execute([$formula]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result['count'] == 0) {
                $missing[] = $formula;
            }
        }
        
        return [
            'valid' => empty($missing),
            'missing' => $missing
        ];
    }
    
    /**
     * تقييم معادلة واحدة
     */
    public function evaluateFormula($formulaKey, $context) {
        // البحث في جميع الجداول: salary_formulas، جداول الأسبوعية، وجداول الشهرية
        $stmt = $this->conn->prepare("
            SELECT formula_expression 
            FROM salary_formulas 
            WHERE formula_key = ? AND is_active = 1
            LIMIT 1
        ");
        $stmt->execute([$formulaKey]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // إذا لم توجد في salary_formulas، ابحث في جداول الأسبوعية
        if (!$result) {
            $stmt = $this->conn->prepare("
                SELECT 
                    COALESCE(we.formula, df.formula_expression) as formula_expression
                FROM weekly_wage_entitlements we
                LEFT JOIN dynamic_formulas df ON we.formula_id = df.id AND df.is_active = 1
                WHERE we.column_key = ? AND we.is_calculated = 1
                AND COALESCE(we.formula, df.formula_expression, '') != ''
                LIMIT 1
            ");
            $stmt->execute([$formulaKey]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        // إذا لم توجد في weekly_wage_entitlements، ابحث في weekly_wage_deductions
        if (!$result) {
            $stmt = $this->conn->prepare("
                SELECT 
                    COALESCE(wd.formula, df.formula_expression) as formula_expression
                FROM weekly_wage_deductions wd
                LEFT JOIN dynamic_formulas df ON wd.formula_id = df.id AND df.is_active = 1
                WHERE wd.column_key = ? AND wd.is_calculated = 1
                AND COALESCE(wd.formula, df.formula_expression, '') != ''
                LIMIT 1
            ");
            $stmt->execute([$formulaKey]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        // إذا لم توجد في weekly_wage_deductions، ابحث في net_weekly_wage
        if (!$result) {
            $stmt = $this->conn->prepare("
                SELECT 
                    COALESCE(nw.formula, df.formula_expression) as formula_expression
                FROM net_weekly_wage nw
                LEFT JOIN dynamic_formulas df ON nw.formula_id = df.id AND df.is_active = 1
                WHERE nw.column_key = ? AND nw.is_calculated = 1
                AND COALESCE(nw.formula, df.formula_expression, '') != ''
                LIMIT 1
            ");
            $stmt->execute([$formulaKey]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        // إذا لم توجد في net_weekly_wage، ابحث في monthly_salary_entitlements_columns
        if (!$result) {
            $stmt = $this->conn->prepare("
                SELECT 
                    COALESCE(mse.formula, df.formula_expression) as formula_expression
                FROM monthly_salary_entitlements_columns mse
                LEFT JOIN dynamic_formulas df ON mse.formula_id = df.id AND df.is_active = 1
                WHERE mse.column_key = ? AND mse.is_calculated = 1
                AND COALESCE(mse.formula, df.formula_expression, '') != ''
                LIMIT 1
            ");
            $stmt->execute([$formulaKey]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        // إذا لم توجد في monthly_salary_entitlements_columns، ابحث في monthly_salary_deductions_columns
        if (!$result) {
            $stmt = $this->conn->prepare("
                SELECT 
                    COALESCE(msd.formula, df.formula_expression) as formula_expression
                FROM monthly_salary_deductions_columns msd
                LEFT JOIN dynamic_formulas df ON msd.formula_id = df.id AND df.is_active = 1
                WHERE msd.column_key = ? AND msd.is_calculated = 1
                AND COALESCE(msd.formula, df.formula_expression, '') != ''
                LIMIT 1
            ");
            $stmt->execute([$formulaKey]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        // إذا لم توجد في monthly_salary_deductions_columns، ابحث في net_monthly_salary
        if (!$result) {
            $stmt = $this->conn->prepare("
                SELECT 
                    COALESCE(nms.formula, df.formula_expression) as formula_expression
                FROM net_monthly_salary nms
                LEFT JOIN dynamic_formulas df ON nms.formula_id = df.id AND df.is_active = 1
                WHERE nms.column_key = ? AND nms.is_calculated = 1
                AND COALESCE(nms.formula, df.formula_expression, '') != ''
                LIMIT 1
            ");
            $stmt->execute([$formulaKey]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        if (!$result || empty($result['formula_expression'])) {
            throw new Exception("المعادلة $formulaKey غير موجودة في أي جدول");
        }
        
        $expression = $result['formula_expression'];
        return $this->evaluateExpression($expression, $context);
    }
    
    /**
     * تقييم عدة معادلات
     */
    public function evaluateMultipleFormulas($formulaKeys, $context) {
        $results = [];
        $errors = [];
        
        foreach ($formulaKeys as $formulaKey) {
            try {
                $results[$formulaKey] = $this->evaluateFormula($formulaKey, $context);
            } catch (Exception $e) {
                $errors[$formulaKey] = $e->getMessage();
            }
        }
        
        return [
            'results' => $results,
            'has_errors' => !empty($errors),
            'errors' => $errors
        ];
    }
    
    /**
     * التحقق من صحة المعادلة
     */
    public function validateFormula($formula) {
        if (empty($formula) || $formula === '0') {
            return [
                'valid' => true,
                'message' => 'المعادلة فارغة أو صفر'
            ];
        }
        
        try {
            // جلب جميع المتغيرات المتاحة من system_variables
            $stmt = $this->conn->query("SELECT variable_key, variable_value FROM system_variables WHERE is_active = 1");
            $systemVars = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            
            // إنشاء سياق تجريبي يحتوي على جميع المتغيرات المتاحة
            $testContext = array_merge([
                'base_salary' => 1500,
                'daily_wage' => 50,
                'weekly_wage' => 346,
                'hourly_wage' => 5,
                'on_time_days' => 1,
                'regular_overtime_hours' => 4,
                'holiday_overtime_hours' => 0,
                'total_overtime_hours' => 4,
                'regular_overtime_multiplier' => 1.5,
                'holiday_work_multiplier' => 2.0,
                'overtime_rate' => 1.5,
                'daily_work_hours' => 10,
                'weekly_work_days' => 6,
                'meal_allowance_per_day' => 5,
                'transport_allowance' => 0,
                'special_bonus' => 0,
                'advance_payment' => 0,
                'regularity_days' => 1,
                'regularity_pay' => 5,
                'overtime_hours' => 4,
                'overtime_pay' => 30,
                'punctuality_bonus' => 5,
                'absent_days' => 0,
                'absence_deduction' => 0,
                'late_hours' => 0,
                'late_deduction' => 0,
                'insurance_deduction' => 0,
                'advance_deduction' => 0,
                'total_entitlements' => 2000, // إجمالي المستحقات
                'total_deductions' => 100 // إجمالي المستقطعات
            ], $systemVars);
            
            // تحويل الرموز العربية إلى الإنجليزية
            $expression = str_replace(['×', '÷'], ['*', '/'], $formula);
            
            // ترتيب المفاتيح حسب الطول (الأطول أولاً) لتجنب الاستبدال الجزئي
            $keys = array_keys($testContext);
            usort($keys, function($a, $b) {
                return strlen($b) - strlen($a);
            });
            
            // استبدال المتغيرات في المعادلة
            foreach ($keys as $key) {
                $value = $testContext[$key] ?? 0;
                $numericValue = is_numeric($value) ? (float)$value : 0;
                $expression = preg_replace('/\b' . preg_quote($key, '/') . '\b/', $numericValue, $expression);
            }
            
            // التحقق من وجود متغيرات غير معرفة
            preg_match_all('/\b[a-zA-Z_][a-zA-Z0-9_]*\b/', $expression, $matches);
            $undefinedVars = [];
            foreach ($matches[0] as $var) {
                if (!isset($testContext[$var]) && !is_numeric($var)) {
                    $undefinedVars[] = $var;
                }
            }
            
            if (!empty($undefinedVars)) {
                return [
                    'valid' => false,
                    'message' => 'المتغيرات التالية غير معرفة: ' . implode(', ', array_unique($undefinedVars)),
                    'undefined_variables' => array_unique($undefinedVars)
                ];
            }
            
            // إزالة أي متغيرات غير معرفة (لكن فقط إذا كانت كلمات كاملة)
            $expression = preg_replace('/\b[a-zA-Z_][a-zA-Z0-9_]*\b/', '0', $expression);
            
            // محاولة تقييم المعادلة
            $result = eval("return $expression;");
            
            return [
                'valid' => true,
                'message' => 'المعادلة صحيحة',
                'test_result' => is_numeric($result) ? round((float)$result, 2) : 0
            ];
        } catch (Exception $e) {
            return [
                'valid' => false,
                'message' => 'خطأ في المعادلة: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * تقييم التعبير الرياضي
     */
    private function evaluateExpression($expression, $context) {
        // استبدال المتغيرات بالقيم مع إضافة مسافات
        $evaluatedExpression = $expression;
        
        // ترتيب المتغيرات من الأطول للأقصر لتجنب استبدال جزئي
        $sortedContext = $context;
        uksort($sortedContext, function($a, $b) {
            return strlen($b) - strlen($a);
        });
        
        foreach ($sortedContext as $variable => $value) {
            // استبدال المتغير مع التأكد من أنه كلمة كاملة
            $evaluatedExpression = preg_replace('/\b' . preg_quote($variable, '/') . '\b/', $value, $evaluatedExpression);
        }
        
        // تقييم التعبير
        try {
            $result = eval("return $evaluatedExpression;");
            return is_numeric($result) ? (float)$result : 0;
        } catch (Exception $e) {
            throw new Exception("خطأ في تقييم التعبير: $expression -> $evaluatedExpression");
        }
    }
}
?>
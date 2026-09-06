<?php
/**
 * نظام تقييم المعادلات الديناميكي
 * يسمح بإنشاء معادلات جديدة واستخدامها بسهولة
 */

class FormulaEvaluator {
    private $pdo;
    private $systemVariables = [];
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->loadSystemVariables();
    }
    
    /**
     * جلب المتغيرات المتاحة من النظام
     */
    private function loadSystemVariables() {
        $stmt = $this->pdo->query("
            SELECT setting_key, setting_value 
            FROM system_settings 
            WHERE category IN ('egypt_salary', 'salary', 'system', 'allowance', 'penalty', 'insurance')
        ");
        $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        foreach ($settings as $key => $value) {
            // تحويل القيم الرقمية
            if (is_numeric($value)) {
                $this->systemVariables[$key] = (float)$value;
            } else {
                $this->systemVariables[$key] = $value;
            }
        }
    }
    
    /**
     * جلب معادلة من قاعدة البيانات
     */
    public function getFormula($formulaKey) {
        $stmt = $this->pdo->prepare("
            SELECT setting_value, setting_name, description
            FROM system_settings 
            WHERE setting_key = ? AND category = 'calculation'
        ");
        $stmt->execute([$formulaKey]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * تقييم معادلة مع المتغيرات
     */
    public function evaluateFormula($formula, $employeeData = [], $additionalVariables = []) {
        // دمج المتغيرات
        $variables = array_merge(
            $this->systemVariables,
            $employeeData,
            $additionalVariables
        );
        
        // استبدال المتغيرات في المعادلة
        $expression = $formula;
        foreach ($variables as $key => $value) {
            if (is_numeric($value) || is_bool($value)) {
                $expression = str_replace($key, $value, $expression);
            } else {
                $expression = str_replace($key, "'" . $value . "'", $expression);
            }
        }
        
        // تقييم التعبير
        try {
            $result = eval("return $expression;");
            return round($result, 2);
        } catch (Exception $e) {
            throw new Exception("خطأ في تقييم المعادلة: " . $e->getMessage());
        }
    }
    
    /**
     * حساب قيمة باستخدام معادلة محددة
     */
    public function calculate($formulaKey, $employeeData = [], $additionalVariables = []) {
        $formula = $this->getFormula($formulaKey);
        
        if (!$formula) {
            throw new Exception("المعادلة غير موجودة: $formulaKey");
        }
        
        return $this->evaluateFormula($formula['setting_value'], $employeeData, $additionalVariables);
    }
    
    /**
     * إنشاء معادلة جديدة
     */
    public function createFormula($key, $name, $formula, $description = '') {
        $stmt = $this->pdo->prepare("
            INSERT INTO system_settings 
            (setting_key, setting_name, setting_value, setting_type, category, description, is_editable, is_required) 
            VALUES (?, ?, ?, 'string', 'calculation', ?, 1, 0)
        ");
        
        return $stmt->execute([$key, $name, $formula, $description]);
    }
    
    /**
     * تحديث معادلة موجودة
     */
    public function updateFormula($key, $name, $formula, $description = '') {
        $stmt = $this->pdo->prepare("
            UPDATE system_settings 
            SET setting_name = ?, setting_value = ?, description = ?, updated_at = NOW()
            WHERE setting_key = ? AND category = 'calculation'
        ");
        
        return $stmt->execute([$name, $formula, $description, $key]);
    }
    
    /**
     * حذف معادلة
     */
    public function deleteFormula($key) {
        $stmt = $this->pdo->prepare("
            DELETE FROM system_settings 
            WHERE setting_key = ? AND category = 'calculation'
        ");
        
        return $stmt->execute([$key]);
    }
    
    /**
     * جلب جميع المعادلات
     */
    public function getAllFormulas() {
        $stmt = $this->pdo->query("
            SELECT setting_key, setting_name, setting_value, description, created_at, updated_at
            FROM system_settings 
            WHERE category = 'calculation'
            ORDER BY setting_name
        ");
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * اختبار معادلة
     */
    public function testFormula($formula, $employeeData = [], $additionalVariables = []) {
        try {
            $result = $this->evaluateFormula($formula, $employeeData, $additionalVariables);
            return [
                'success' => true,
                'result' => $result,
                'variables_used' => array_merge($this->systemVariables, $employeeData, $additionalVariables)
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}

// مثال على الاستخدام
if (isset($_GET['test'])) {
    require_once 'config_unified.php';
    
    $evaluator = new FormulaEvaluator($pdo);
    
    // بيانات موظف للاختبار
    $employeeData = [
        'base_salary' => 5000,
        'bonus_entitlement' => 500,
        'attendance_days' => 22,
        'absence_days' => 0
    ];
    
    // اختبار معادلة التأمين الجديدة
    try {
        $result = $evaluator->calculate('insurance_deduction_formula', $employeeData);
        echo "قيمة التأمين: " . $result . " جنيه\n";
    } catch (Exception $e) {
        echo "خطأ: " . $e->getMessage() . "\n";
    }
}
?>

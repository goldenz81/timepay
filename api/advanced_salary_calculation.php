<?php
/**
 * API لحساب الرواتب باستخدام النظام المتقدم
 * Advanced Salary Calculation API using calculation_elements_v2
 * 
 * @author TimePay System
 * @version 2.0
 * @date 2025-09-19
 */

require_once 'cors_headers.php';

// إعداد قاعدة البيانات
require_once 'config.php';

class AdvancedSalaryCalculator {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * جلب جميع المعادلات المحسوبة من قاعدة البيانات
     */
    public function getCalculationElements() {
        $stmt = $this->pdo->query("
            SELECT * FROM calculation_elements_v2 
            WHERE is_calculated = 1 AND is_active = 1 
            ORDER BY category, display_name
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * جلب إعدادات الحساب
     */
    public function getCalculationSettings() {
        $stmt = $this->pdo->query("
            SELECT setting_key, setting_value 
            FROM salary_calculation_settings 
            WHERE is_enabled = 1
        ");
        $settings = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        return $settings;
    }
    
    /**
     * حساب راتب موظف واحد باستخدام المعادلات المتقدمة
     */
    public function calculateEmployeeSalary($employee, $date = null) {
        if (!$date) {
            $date = date('Y-m');
        }
        
        // جلب إعدادات الحساب
        $settings = $this->getCalculationSettings();
        
        // جلب بيانات الحضور للشهر المحدد
        $attendanceData = $this->getAttendanceData($employee['AC-No.'], $date);
        
        // حساب الراتب الأساسي
        $basic_salary = $employee['base_salary'] ?? $employee['salary'] ?? 3000;
        
        // حساب البدلات باستخدام المعادلات المتقدمة
        $housing_allowance = $this->calculateHousingAllowance($basic_salary, $settings);
        $transport_allowance = $this->calculateTransportAllowance($basic_salary, $settings);
        $food_allowance = $this->calculateFoodAllowance($basic_salary, $settings);
        $performance_bonus = $this->calculatePerformanceBonus($basic_salary, $settings);
        $attendance_bonus = $this->calculateAttendanceBonus($basic_salary, $settings);
        
        $total_allowances = $housing_allowance + $transport_allowance + $food_allowance + $performance_bonus + $attendance_bonus;
        
        // حساب الخصومات باستخدام المعادلات المتقدمة
        $insurance = $this->calculateInsurance($basic_salary, $settings);
        $tax = $this->calculateTax($basic_salary, $settings);
        $health_insurance = $this->calculateHealthInsurance($basic_salary, $settings);
        
        // حساب أيام الغياب وقيمتها
        $absenceData = $this->calculateAbsencePenalty($attendanceData, $basic_salary, $settings);
        
        // جلب السلف
        $advances = $this->getAdvances($employee['id']);
        
        $total_deductions = $insurance + $tax + $health_insurance + $advances + $absenceData['absence_value'] + $absenceData['penalty_value'];
        
        // الراتب الصافي
        $net_salary = $basic_salary + $total_allowances - $total_deductions;
        
        return [
            'employee_id' => $employee['id'],
            'employee_code' => $employee['AC-No.'],
            'employee_name' => $employee['Name'],
            'department' => $employee['Department'],
            'position' => $employee['Position'],
            'salary_type' => $employee['salary_type'] ?? 'monthly',
            'basic_salary' => round($basic_salary, 2),
            'housing_allowance' => round($housing_allowance, 2),
            'transport_allowance' => round($transport_allowance, 2),
            'food_allowance' => round($food_allowance, 2),
            'performance_bonus' => round($performance_bonus, 2),
            'attendance_bonus' => round($attendance_bonus, 2),
            'total_allowances' => round($total_allowances, 2),
            'absence_days' => $absenceData['absence_days'],
            'absence_value' => round($absenceData['absence_value'], 2),
            'penalty_value' => round($absenceData['penalty_value'], 2),
            'insurance' => round($insurance, 2),
            'tax' => round($tax, 2),
            'health_insurance' => round($health_insurance, 2),
            'advances' => round($advances, 2),
            'total_deductions' => round($total_deductions, 2),
            'net_salary' => round($net_salary, 2)
        ];
    }
    
    /**
     * جلب بيانات الحضور
     */
    private function getAttendanceData($acNo, $month) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    COUNT(CASE WHEN status = 'absent' THEN 1 END) as absence_days,
                    SUM(late_minutes) as total_late_minutes,
                    SUM(early_leave_minutes) as total_early_leave_minutes
                FROM attendance_logs 
                WHERE `AC-No.` = ? 
                AND DATE_FORMAT(date, '%Y-%m') = ?
            ");
            $stmt->execute([$acNo, $month]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        } catch (Exception $e) {
            return [
                'absence_days' => 0,
                'total_late_minutes' => 0,
                'total_early_leave_minutes' => 0
            ];
        }
    }
    
    /**
     * حساب بدل السكن
     */
    private function calculateHousingAllowance($basic_salary, $settings) {
        $percentage = $settings['housing_allowance_percentage'] ?? 15;
        return $basic_salary * ($percentage / 100);
    }
    
    /**
     * حساب بدل المواصلات
     */
    private function calculateTransportAllowance($basic_salary, $settings) {
        $percentage = $settings['transport_allowance_percentage'] ?? 10;
        return $basic_salary * ($percentage / 100);
    }
    
    /**
     * حساب بدل الطعام
     */
    private function calculateFoodAllowance($basic_salary, $settings) {
        $percentage = $settings['food_allowance_percentage'] ?? 5;
        return $basic_salary * ($percentage / 100);
    }
    
    /**
     * حساب مكافأة الأداء
     */
    private function calculatePerformanceBonus($basic_salary, $settings) {
        $percentage = $settings['performance_bonus_percentage'] ?? 5;
        return $basic_salary * ($percentage / 100);
    }
    
    /**
     * حساب بدل الانتظام
     */
    private function calculateAttendanceBonus($basic_salary, $settings) {
        $percentage = $settings['attendance_bonus_percentage'] ?? 3;
        return $basic_salary * ($percentage / 100);
    }
    
    /**
     * حساب التأمين الاجتماعي
     */
    private function calculateInsurance($basic_salary, $settings) {
        $percentage = $settings['insurance_percentage'] ?? 14;
        return $basic_salary * ($percentage / 100);
    }
    
    /**
     * حساب ضريبة الدخل
     */
    private function calculateTax($basic_salary, $settings) {
        $percentage = $settings['tax_percentage'] ?? 10;
        return $basic_salary * ($percentage / 100);
    }
    
    /**
     * حساب التأمين الصحي
     */
    private function calculateHealthInsurance($basic_salary, $settings) {
        $percentage = $settings['health_insurance_percentage'] ?? 2;
        return $basic_salary * ($percentage / 100);
    }
    
    /**
     * حساب جزاءات الغياب
     */
    private function calculateAbsencePenalty($attendanceData, $basic_salary, $settings) {
        $absence_days = (int)($attendanceData['absence_days'] ?? 0);
        $total_late_minutes = (int)($attendanceData['total_late_minutes'] ?? 0);
        $total_early_leave_minutes = (int)($attendanceData['total_early_leave_minutes'] ?? 0);
        
        $absence_value = 0;
        $penalty_value = 0;
        
        // حساب قيمة الغياب
        if ($absence_days > 0) {
            $work_days_per_month = $settings['work_days_per_month'] ?? 26;
            $daily_salary = $basic_salary / $work_days_per_month;
            $absence_value = $daily_salary * $absence_days;
        }
        
        // حساب قيمة الجزاءات
        $hourly_rate = $basic_salary / (($settings['work_days_per_month'] ?? 26) * 8);
        $penalty_per_minute = $hourly_rate / 60;
        $penalty_value = ($total_late_minutes + $total_early_leave_minutes) * $penalty_per_minute;
        
        return [
            'absence_days' => $absence_days,
            'absence_value' => $absence_value,
            'penalty_value' => $penalty_value
        ];
    }
    
    /**
     * جلب السلف
     */
    private function getAdvances($employeeId) {
        try {
            $stmt = $this->pdo->prepare("SELECT COALESCE(SUM(amount), 0) as total_advances FROM advances WHERE employee_id = ? AND status = 'active'");
            $stmt->execute([$employeeId]);
            return $stmt->fetchColumn();
        } catch (Exception $e) {
            return 0;
        }
    }
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? '';
    
    $calculator = new AdvancedSalaryCalculator($pdo);
    
    switch ($action) {
        case 'calculate_salary':
            // حساب راتب موظف واحد
            $employee_id = $input['employee_id'] ?? '';
            $date = $input['date'] ?? date('Y-m');
            $salary_type = $input['salary_type'] ?? 'monthly';
            
            $stmt = $pdo->prepare("SELECT * FROM employees WHERE id = ? AND status = 'active'");
            $stmt->execute([$employee_id]);
            $employee = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$employee) {
                throw new Exception('الموظف غير موجود');
            }
            
            $result = $calculator->calculateEmployeeSalary($employee, $date);
            
            echo json_encode([
                'success' => true,
                'data' => $result
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'calculate_all_salaries':
            // حساب رواتب جميع الموظفين
            $date = $input['date'] ?? date('Y-m');
            $salary_type = $input['salary_type'] ?? 'monthly';
            
            $stmt = $pdo->query("SELECT * FROM employees WHERE status = 'active'");
            $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $salaries = [];
            foreach ($employees as $employee) {
                $salaries[] = $calculator->calculateEmployeeSalary($employee, $date);
            }
            
            echo json_encode([
                'success' => true,
                'data' => $salaries
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_calculation_elements':
            // جلب جميع عناصر الحساب
            $elements = $calculator->getCalculationElements();
            
            echo json_encode([
                'success' => true,
                'data' => $elements
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_calculation_settings':
            // جلب إعدادات الحساب
            $settings = $calculator->getCalculationSettings();
            
            echo json_encode([
                'success' => true,
                'data' => $settings
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        default:
            echo json_encode([
                'success' => false,
                'error' => 'إجراء غير صحيح'
            ], JSON_UNESCAPED_UNICODE);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'خطأ في حساب الرواتب: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>

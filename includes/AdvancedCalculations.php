<?php
/**
 * مكتبة الحسابات المتقدمة للنظام
 * Advanced Calculations Library for TimePay System
 * 
 * هذه المكتبة تحتوي على جميع الدوال المطلوبة لحساب:
 * - المستحقات الأسبوعية
 * - بدل الوجبة حسب وقت الحضور
 * - الإضافي والعمل الإضافي
 * - نسبة الكفاءة
 * - الأجور الأسبوعية
 */

class AdvancedCalculations {
    private $pdo;
    
    public function __init__($pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * جلب قيمة إعداد من جدول system_settings
     */
    public function getSetting($key, $default = null) {
        try {
            $stmt = $this->pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = ?");
            $stmt->execute([$key]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result ? $result['setting_value'] : $default;
        } catch (Exception $e) {
            error_log("Error getting setting {$key}: " . $e->getMessage());
            return $default;
        }
    }
    
    /**
     * حساب نسبة الكفاءة
     * @param int $commitmentDays أيام الحضور الفعلية
     * @param int $totalWorkDays إجمالي أيام العمل
     * @return float نسبة الكفاءة
     */
    public function calculateEfficiency($commitmentDays, $totalWorkDays) {
        if ($totalWorkDays == 0) return 0;
        return round(($commitmentDays / $totalWorkDays) * 100, 2);
    }
    
    /**
     * حساب أجر الساعة
     * @param float $dailyWage الأجر اليومي
     * @param int $dailyHours عدد ساعات العمل اليومية
     * @return float أجر الساعة
     */
    public function calculateHourlyRate($dailyWage, $dailyHours = null) {
        if ($dailyHours === null) {
            $dailyHours = (int)$this->getSetting('salary.dailyWorkHours', 8);
        }
        
        if ($dailyHours == 0) return 0;
        return round($dailyWage / $dailyHours, 2);
    }
    
    /**
     * حساب بدل الوجبة حسب وقت الحضور
     * @param string $checkInTime وقت الحضور (HH:MM:SS)
     * @param int $employeeId معرف الموظف
     * @return float قيمة بدل الوجبة
     */
    public function calculateMealAllowance($checkInTime, $employeeId) {
        try {
            // تنظيف وقت الحضور من أي أرقام عشرية غير صحيحة
            $checkInTime = $this->cleanTimeString($checkInTime);
            
            // التحقق من نوع راتب الموظف
            $stmt = $this->pdo->prepare("SELECT salary_type FROM employees WHERE id = ?");
            $stmt->execute([$employeeId]);
            $employee = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // الموظفين الشهريين لا يحصلون على بدل وجبة
            if (!$employee || $employee['salary_type'] !== 'weekly') {
                return 0;
            }
            
            // جلب قيمة بدل الوجبة من الإعدادات
            $mealAllowanceValue = (float)$this->getSetting('salary.mealAllowance', 5);
            
            // جلب الوقت المحدد لبدل الوجبة
            $mealAllowanceTime = $this->getSetting('attendance.mealAllowanceTime', '08:00');
            
            // حساب بدل الوجبة
            if ($checkInTime <= $mealAllowanceTime) {
                return $mealAllowanceValue;
            }
            
            return 0;
            
        } catch (Exception $e) {
            error_log("Error calculating meal allowance: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * حساب بدل الوجبة الأسبوعي
     * @param int $employeeId معرف الموظف
     * @param string $weekStart تاريخ بداية الأسبوع
     * @param string $weekEnd تاريخ نهاية الأسبوع
     * @return float إجمالي بدل الوجبة للأسبوع
     */
    public function calculateWeeklyMealAllowance($employeeId, $weekStart, $weekEnd) {
        try {
            // التحقق من نوع راتب الموظف
            $stmt = $this->pdo->prepare("SELECT salary_type FROM employees WHERE id = ?");
            $stmt->execute([$employeeId]);
            $employee = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$employee || $employee['salary_type'] !== 'weekly') {
                return 0;
            }
            
            // جلب قيمة بدل الوجبة من الإعدادات
            $mealAllowanceValue = (float)$this->getSetting('salary.mealAllowance', 5);
            
            // حساب أيام العمل (استثناء العطل)
            $startDate = new DateTime($weekStart);
            $endDate = new DateTime($weekEnd);
            $workingDays = 0;
            
            $currentDate = clone $startDate;
            while ($currentDate <= $endDate) {
                $dayOfWeek = $currentDate->format('N'); // 1 (Monday) to 7 (Sunday)
                if ($dayOfWeek < 6) { // Monday to Friday
                    $workingDays++;
                }
                $currentDate->add(new DateInterval('P1D'));
            }
            
            return $workingDays * $mealAllowanceValue;
            
        } catch (Exception $e) {
            error_log("Error calculating weekly meal allowance: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * حساب بدل العمل الإضافي
     * @param float $overtimeHours ساعات العمل الإضافي
     * @param float $hourlyRate أجر الساعة
     * @param float $overtimeMultiplier معامل الإضافي
     * @return float بدل العمل الإضافي
     */
    public function calculateOvertimePay($overtimeHours, $hourlyRate, $overtimeMultiplier = null) {
        if ($overtimeMultiplier === null) {
            $overtimeMultiplier = (float)$this->getSetting('salary.overtimeMultiplier', 1.5);
        }
        
        return round($overtimeHours * $hourlyRate * $overtimeMultiplier, 2);
    }
    
    /**
     * حساب الأجر الأسبوعي
     * @param array $data بيانات الحساب
     * @return array نتائج الحساب
     */
    public function calculateWeeklyWage($data) {
        try {
            $employeeId = $data['employee_id'];
            $dailyWage = (float)$data['daily_wage'];
            $workDays = (int)$data['work_days'];
            $overtimeHours = (float)($data['overtime_hours'] ?? 0);
            $weeklyBonus = (float)($data['weekly_bonus'] ?? 0);
            $specialBonus = (float)($data['special_bonus'] ?? 0);
            $transportOvertimePay = (float)($data['transport_overtime_pay'] ?? 0);
            
            // حساب أجر الساعة
            $hourlyRate = $this->calculateHourlyRate($dailyWage);
            
            // حساب بدل الوجبة الأسبوعي
            $mealAllowance = $this->calculateWeeklyMealAllowance(
                $employeeId, 
                $data['week_start'], 
                $data['week_end']
            );
            
            // حساب بدل العمل الإضافي
            $overtimePay = $this->calculateOvertimePay($overtimeHours, $hourlyRate);
            
            // حساب الأجر الأساسي
            $basicWage = $dailyWage * $workDays;
            
            // حساب الأجر الأسبوعي الإجمالي
            $totalWeeklyWage = round(
                $basicWage + 
                $weeklyBonus + 
                $mealAllowance + 
                $overtimePay + 
                $transportOvertimePay + 
                $specialBonus,
                2
            );
            
            // حساب نسبة الكفاءة
            $commitmentDays = (int)($data['commitment_days'] ?? $workDays);
            $efficiency = $this->calculateEfficiency($commitmentDays, $workDays);
            
            return [
                'success' => true,
                'calculations' => [
                    'basic_wage' => $basicWage,
                    'hourly_rate' => $hourlyRate,
                    'meal_allowance' => $mealAllowance,
                    'overtime_pay' => $overtimePay,
                    'weekly_bonus' => $weeklyBonus,
                    'special_bonus' => $specialBonus,
                    'transport_overtime_pay' => $transportOvertimePay,
                    'total_weekly_wage' => $totalWeeklyWage,
                    'efficiency_percentage' => $efficiency
                ],
                'breakdown' => [
                    'daily_wage' => $dailyWage,
                    'work_days' => $workDays,
                    'overtime_hours' => $overtimeHours,
                    'overtime_multiplier' => $this->getSetting('salary.overtimeMultiplier', 1.5),
                    'meal_allowance_rate' => $this->getSetting('salary.mealAllowance', 5)
                ]
            ];
            
        } catch (Exception $e) {
            error_log("Error calculating weekly wage: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * حساب المستحقات الأسبوعية من ملف الحضور
     * @param array $attendanceData بيانات الحضور
     * @return array المستحقات المحسوبة
     */
    public function calculateFromAttendanceFile($attendanceData) {
        try {
            $results = [];
            
            foreach ($attendanceData as $record) {
                $employeeId = $record['employee_id'];
                $date = $record['date'];
                $checkInTime = $record['check_in'];
                $checkOutTime = $record['check_out'];
                $overtimeHours = (float)($record['overtime_hours'] ?? 0);
                
                // حساب بدل الوجبة لهذا اليوم
                $mealAllowance = $this->calculateMealAllowance($checkInTime, $employeeId);
                
                // حساب بدل العمل الإضافي
                $hourlyRate = $this->calculateHourlyRate($record['daily_wage'] ?? 0);
                $overtimePay = $this->calculateOvertimePay($overtimeHours, $hourlyRate);
                
                $results[] = [
                    'employee_id' => $employeeId,
                    'date' => $date,
                    'meal_allowance' => $mealAllowance,
                    'overtime_pay' => $overtimePay,
                    'overtime_hours' => $overtimeHours,
                    'hourly_rate' => $hourlyRate
                ];
            }
            
            return [
                'success' => true,
                'data' => $results
            ];
            
        } catch (Exception $e) {
            error_log("Error calculating from attendance file: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * تحديث المستحقات الأسبوعية تلقائياً
     * @param int $employeeId معرف الموظف
     * @param string $weekStart تاريخ بداية الأسبوع
     * @param string $weekEnd تاريخ نهاية الأسبوع
     * @return array نتيجة التحديث
     */
    public function updateWeeklyEntitlements($employeeId, $weekStart, $weekEnd) {
        try {
            // حساب المستحقات الجديدة
            $weeklyData = [
                'employee_id' => $employeeId,
                'week_start' => $weekStart,
                'week_end' => $weekEnd,
                'daily_wage' => 0, // يجب جلبها من جدول الموظفين
                'work_days' => 5, // أيام العمل
                'overtime_hours' => 0, // يجب جلبها من سجلات الحضور
                'commitment_days' => 5 // يجب جلبها من سجلات الحضور
            ];
            
            $calculations = $this->calculateWeeklyWage($weeklyData);
            
            if (!$calculations['success']) {
                throw new Exception($calculations['error']);
            }
            
            // تحديث أو إنشاء المستحقات الأسبوعية
            $stmt = $this->pdo->prepare("
                INSERT INTO weekly_entitlements (
                    employee_id, week_start, week_end, meal_allowance, 
                    total_amount, status, created_at
                ) VALUES (?, ?, ?, ?, ?, 'pending', NOW())
                ON DUPLICATE KEY UPDATE
                    meal_allowance = VALUES(meal_allowance),
                    total_amount = VALUES(total_amount),
                    updated_at = NOW()
            ");
            
            $week = date('Y-W', strtotime($weekStart));
            $stmt->execute([
                $employeeId,
                $weekStart,
                $weekEnd,
                $calculations['calculations']['meal_allowance'],
                $calculations['calculations']['total_weekly_wage']
            ]);
            
            return [
                'success' => true,
                'message' => 'تم تحديث المستحقات الأسبوعية بنجاح',
                'data' => $calculations
            ];
            
        } catch (Exception $e) {
            error_log("Error updating weekly entitlements: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * تنظيف وقت من الأرقام العشرية غير الصحيحة
     * @param string $timeString الوقت المراد تنظيفه
     * @return string الوقت المنظف
     */
    private function cleanTimeString($timeString) {
        // التعامل مع التاريخ والوقت معاً: 2025-09-14 8.5166666666667:00
        if (preg_match('/(\d{4}-\d{2}-\d{2})\s+(.+)/', $timeString, $dateMatches)) {
            $date = $dateMatches[1];
            $time = $dateMatches[2];
            $cleanedTime = $this->cleanTimeOnly($time);
            return $date . ' ' . $cleanedTime;
        }
        
        // التعامل مع الوقت فقط
        return $this->cleanTimeOnly($timeString);
    }
    
    /**
     * تنظيف الوقت فقط من الأرقام العشرية
     * @param string $timeString الوقت المراد تنظيفه
     * @return string الوقت المنظف
     */
    private function cleanTimeOnly($timeString) {
        // إزالة أي أرقام عشرية من الساعات
        if (preg_match('/(\d+)\.(\d+):(\d+)/', $timeString, $matches)) {
            $hours = intval($matches[1]);
            $decimalPart = $matches[2];
            $seconds = intval($matches[3]);
            
            // تحويل الجزء العشري إلى دقائق
            $decimalMinutes = floatval('0.' . $decimalPart);
            $totalMinutes = round($decimalMinutes * 60);
            
            return sprintf('%02d:%02d:%02d', $hours, $totalMinutes, $seconds);
        }
        
        // التعامل مع تنسيق آخر: 8.5166666666667:00 (بدون ثواني)
        if (preg_match('/(\d+)\.(\d+):(\d+)/', $timeString, $matches)) {
            $hours = intval($matches[1]);
            $decimalPart = $matches[2];
            $minutes = intval($matches[3]);
            
            // تحويل الجزء العشري إلى دقائق إضافية
            $decimalMinutes = floatval('0.' . $decimalPart);
            $additionalMinutes = round($decimalMinutes * 60);
            $totalMinutes = $minutes + $additionalMinutes;
            
            // إذا تجاوزت الدقائق 60، نضيف ساعة
            if ($totalMinutes >= 60) {
                $hours += intval($totalMinutes / 60);
                $totalMinutes = $totalMinutes % 60;
            }
            
            return sprintf('%02d:%02d:00', $hours, $totalMinutes);
        }
        
        // التعامل مع تنسيق آخر: 8.5166666666667 (بدون :00)
        if (preg_match('/(\d+)\.(\d+)/', $timeString, $matches)) {
            $hours = intval($matches[1]);
            $decimalPart = $matches[2];
            
            // تحويل الجزء العشري إلى دقائق
            $decimalMinutes = floatval('0.' . $decimalPart);
            $totalMinutes = round($decimalMinutes * 60);
            
            return sprintf('%02d:%02d:00', $hours, $totalMinutes);
        }
        
        // إذا كان التنسيق صحيح، إرجاعه كما هو
        return $timeString;
    }
}
?>

<?php
// تضمين ملف CORS المشترك
require_once 'cors_headers.php';

// Include database configuration and models
require_once __DIR__ . '/../config/database_config.php';
require_once __DIR__ . '/../models/Database.php';

class EnhancedSalaryAPI {
    private $db;
    
    public function __construct() {
        $this->db = Database::getConnection();
    }
    
    // إدارة السلف
    public function getAdvances($employeeId = null) {
        try {
            $sql = "SELECT ea.*, e.Name as employee_name, e.department 
                    FROM employee_advances ea 
                    LEFT JOIN employees e ON ea.`AC-No.` COLLATE utf8mb4_unicode_ci = e.`AC-No.` COLLATE utf8mb4_unicode_ci";
            $params = [];
            
            if ($employeeId) {
                $sql .= " WHERE ea.`AC-No.` = ?";
                $params[] = $employeeId;
            }
            
            $sql .= " ORDER BY ea.advance_date DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            
            return [
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function addAdvance($data) {
        try {
            $sql = "INSERT INTO employee_advances 
                    (`AC-No.`, `Name`, advance_date, amount, description, status) 
                    VALUES (?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([
                $data['AC-No.'],
                $data['Name'],
                $data['advance_date'],
                $data['advance_amount'],
                $data['description'] ?? null,
                $data['status'] ?? 'pending'
            ]);
            
            return [
                'success' => $result,
                'message' => $result ? 'تم إضافة السلفة بنجاح' : 'فشل في إضافة السلفة'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function deleteAdvance($id) {
        try {
            $sql = "DELETE FROM employee_advances WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([$id]);
            
            if ($result && $stmt->rowCount() > 0) {
                return [
                    'success' => true,
                    'message' => 'تم حذف السلفة بنجاح'
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'لم يتم العثور على السلفة'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function updateAdvance($data) {
        try {
            $sql = "UPDATE employee_advances 
                    SET `AC-No.` = ?, 
                        `Name` = ?, 
                        advance_date = ?, 
                        amount = ?, 
                        description = ?, 
                        status = ?,
                        installment_months = ?,
                        remaining_amount = ?
                    WHERE id = ?";
            
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([
                $data['AC-No.'],
                $data['Name'],
                $data['advance_date'],
                $data['advance_amount'],
                $data['description'] ?? null,
                $data['status'] ?? 'pending',
                $data['installment_months'] ?? 1,
                $data['remaining_amount'] ?? $data['advance_amount'],
                $data['id']
            ]);
            
            if ($result && $stmt->rowCount() > 0) {
                return [
                    'success' => true,
                    'message' => 'تم تحديث السلفة بنجاح'
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'لم يتم العثور على السلفة أو لم يتم تحديثها'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function approveAdvance($id, $approvedBy = 'المدير') {
        try {
            $sql = "UPDATE employee_advances 
                    SET status = 'approved', 
                        approved_by = ?, 
                        approved_date = NOW() 
                    WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([$approvedBy, $id]);
            
            if ($result && $stmt->rowCount() > 0) {
                return [
                    'success' => true,
                    'message' => 'تم الموافقة على السلفة بنجاح'
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'لم يتم العثور على السلفة'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    // إدارة الساعات الإضافية
    public function getOvertimeHours($employeeId = null, $month = null) {
        try {
            // استخدام AC-No. مباشرة إذا كان معرف الموظف
            $acNo = $employeeId;
            
            $sql = "SELECT al.*, e.Name as employee_name, e.department 
                    FROM attendance_logs al 
                    LEFT JOIN employees e ON al.`AC-No.` = e.`AC-No.`
                    WHERE al.overtime_hours > 0";
            $params = [];
            $conditions = [];
            
            if ($acNo) {
                $conditions[] = "al.`AC-No.` = ?";
                $params[] = $acNo;
            }
            
            if ($month) {
                $conditions[] = "MONTH(al.date) = MONTH(?) AND YEAR(al.date) = YEAR(?)";
                $params[] = $month;
                $params[] = $month;
            }
            
            if (!empty($conditions)) {
                $sql .= " AND " . implode(" AND ", $conditions);
            }
            
            $sql .= " ORDER BY al.date DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            
            return [
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function addOvertimeHours($data) {
        try {
            // حساب القيم
            $regularValue = $data['regular_overtime_hours'] * $data['hourly_rate'] * 1.5;
            $holidayValue = $data['holiday_overtime_hours'] * $data['hourly_rate'] * 2.0;
            $totalHours = $data['regular_overtime_hours'] + $data['holiday_overtime_hours'];
            $totalValue = $regularValue + $holidayValue;
            
            $sql = "INSERT INTO overtime_hours 
                    (`AC-No.`, employee_name, department, overtime_date,
                     regular_overtime_hours, holiday_overtime_hours, total_overtime_hours,
                     hourly_rate, regular_overtime_value, holiday_overtime_value, total_overtime_value, notes) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([
                $data['AC-No.'],
                $data['employee_name'],
                $data['department'],
                $data['overtime_date'],
                $data['regular_overtime_hours'],
                $data['holiday_overtime_hours'],
                $totalHours,
                $data['hourly_rate'],
                $regularValue,
                $holidayValue,
                $totalValue,
                $data['notes'] ?? null
            ]);
            
            return [
                'success' => $result,
                'message' => $result ? 'تم إضافة الساعات الإضافية بنجاح' : 'فشل في إضافة الساعات الإضافية'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    // إدارة الجزاءات
    public function getPenalties($employeeId = null, $month = null) {
        try {
            $sql = "SELECT * FROM employee_penalties";
            $params = [];
            $conditions = [];
            
            if ($employeeId) {
                $conditions[] = "`AC-No.` = ?";
                $params[] = $employeeId;
            }
            
            if ($month) {
                $conditions[] = "MONTH(penalty_date) = MONTH(?) AND YEAR(penalty_date) = YEAR(?)";
                $params[] = $month;
                $params[] = $month;
            }
            
            if (!empty($conditions)) {
                $sql .= " WHERE " . implode(" AND ", $conditions);
            }
            
            $sql .= " ORDER BY penalty_date DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            
            return [
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function addPenalty($data) {
        try {
            $sql = "INSERT INTO employee_penalties 
                    (`AC-No.`, employee_name, department, penalty_date,
                     penalty_type, penalty_days, penalty_hours, penalty_value, reason, created_by, notes) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([
                $data['AC-No.'],
                $data['employee_name'],
                $data['department'],
                $data['penalty_date'],
                $data['penalty_type'],
                $data['penalty_days'] ?? 0,
                $data['penalty_hours'] ?? 0,
                $data['penalty_value'] ?? 0,
                $data['reason'],
                $data['created_by'] ?? 'system',
                $data['notes'] ?? null
            ]);
            
            return [
                'success' => $result,
                'message' => $result ? 'تم إضافة الجزاء بنجاح' : 'فشل في إضافة الجزاء'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    // إدارة المكافآت
    public function getBonuses($employeeId = null, $month = null) {
        try {
            $sql = "SELECT * FROM employee_bonuses";
            $params = [];
            $conditions = [];
            
            if ($employeeId) {
                $conditions[] = "`AC-No.` = ?";
                $params[] = $employeeId;
            }
            
            if ($month) {
                $conditions[] = "MONTH(bonus_date) = MONTH(?) AND YEAR(bonus_date) = YEAR(?)";
                $params[] = $month;
                $params[] = $month;
            }
            
            if (!empty($conditions)) {
                $sql .= " WHERE " . implode(" AND ", $conditions);
            }
            
            $sql .= " ORDER BY bonus_date DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            
            return [
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function addBonus($data) {
        try {
            $sql = "INSERT INTO employee_bonuses 
                    (`AC-No.`, employee_name, department, bonus_date,
                     bonus_type, bonus_amount, description, created_by, notes) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([
                $data['AC-No.'],
                $data['employee_name'],
                $data['department'],
                $data['bonus_date'],
                $data['bonus_type'],
                $data['bonus_amount'],
                $data['description'] ?? null,
                $data['created_by'] ?? 'system',
                $data['notes'] ?? null
            ]);
            
            return [
                'success' => $result,
                'message' => $result ? 'تم إضافة المكافأة بنجاح' : 'فشل في إضافة المكافأة'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    // حساب الراتب الشهري المحسن
    public function calculateMonthlySalary($employeeId, $month) {
        try {
            // استخدام AC-No. مباشرة إذا كان معرف الموظف
            $acNo = $employeeId;
            
            // الحصول على بيانات الموظف
            $employeeStmt = $this->db->prepare("SELECT * FROM employees WHERE `AC-No.` = ?");
            $employeeStmt->execute([$acNo]);
            $employee = $employeeStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$employee) {
                throw new Exception('الموظف غير موجود');
            }
            
            // حساب المستحقات
            $entitlements = $this->calculateEntitlements($acNo, $month);
            
            // حساب الاستقطاعات
            $deductions = $this->calculateDeductions($acNo, $month);
            
            // حساب صافي الراتب
            $netSalary = $entitlements['total'] - $deductions['total'];
            
            return [
                'success' => true,
                'data' => [
                    'employee' => $employee,
                    'entitlements' => $entitlements,
                    'deductions' => $deductions,
                    'net_salary' => $netSalary
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    public function calculateWeeklySalary($employeeId, $month) {
        try {
            // استخدام AC-No. مباشرة إذا كان معرف الموظف
            $acNo = $employeeId;
            
            // الحصول على بيانات الموظف
            $employeeStmt = $this->db->prepare("SELECT * FROM employees WHERE `AC-No.` = ?");
            $employeeStmt->execute([$acNo]);
            $employee = $employeeStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$employee) {
                throw new Exception('الموظف غير موجود');
            }
            
            // حساب المستحقات الأسبوعية
            $entitlements = $this->calculateWeeklyEntitlements($acNo, $month);
            
            // حساب الاستقطاعات الأسبوعية
            $deductions = $this->calculateWeeklyDeductions($acNo, $month);
            
            // حساب صافي الراتب الأسبوعي
            $netSalary = $entitlements['total'] - $deductions['total'];
            
            return [
                'success' => true,
                'data' => [
                    'employee' => $employee,
                    'entitlements' => $entitlements,
                    'deductions' => $deductions,
                    'net_salary' => $netSalary
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    private function calculateWeeklyEntitlements($acNo, $month) {
        // حساب الراتب الأسبوعي (الراتب الشهري / 4)
        $basicSalary = $this->getBasicSalary($acNo);
        $weeklySalary = $basicSalary / 4;
        
        // حساب بدل الانتظام الأسبوعي
        $regularityAllowance = $this->getRegularityAllowance($acNo, $month) / 4;
        
        // حساب الساعات الإضافية للأسبوع الحالي
        $overtimeValue = $this->getWeeklyOvertimeValue($acNo, $month);
        
        $total = $weeklySalary + $regularityAllowance + $overtimeValue;
        
        return [
            'weekly_salary' => $weeklySalary,
            'regularity_allowance' => $regularityAllowance,
            'overtime_value' => $overtimeValue,
            'total' => $total
        ];
    }

    private function calculateWeeklyDeductions($acNo, $month) {
        // حساب قيمة الغياب والتأخير للأسبوع الحالي
        $absencePenalty = $this->getWeeklyAbsencePenalty($acNo, $month);
        
        // حساب السلف للأسبوع الحالي
        $advanceDeduction = $this->getWeeklyAdvanceDeduction($acNo, $month);
        
        $total = $absencePenalty + $advanceDeduction;
        
        return [
            'absence_penalty' => $absencePenalty,
            'advance_deduction' => $advanceDeduction,
            'total' => $total
        ];
    }

    private function getWeeklyOvertimeValue($acNo, $month) {
        // الحصول على الأسبوع الحالي من الشهر
        $currentWeek = $this->getCurrentWeek($month);
        
        $stmt = $this->db->prepare("
            SELECT SUM(overtime_hours) as total_overtime 
            FROM attendance_logs 
            WHERE `AC-No.` = ? 
            AND DATE_FORMAT(date, '%Y-%m') = ? 
            AND WEEK(date, 1) = ?
        ");
        $stmt->execute([$acNo, $month, $currentWeek]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $overtimeHours = $result['total_overtime'] ?? 0;
        
        // حساب قيمة الساعات الإضافية (ساعة ونصف)
        return $overtimeHours * 1.5 * ($this->getBasicSalary($acNo) / 160); // 160 ساعة عمل شهرياً
    }

    private function getWeeklyAbsencePenalty($acNo, $month) {
        $currentWeek = $this->getCurrentWeek($month);
        
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as absence_count 
            FROM attendance_logs 
            WHERE `AC-No.` = ? 
            AND DATE_FORMAT(date, '%Y-%m') = ? 
            AND WEEK(date, 1) = ?
            AND status = 'absent'
        ");
        $stmt->execute([$acNo, $month, $currentWeek]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $absenceCount = $result['absence_count'] ?? 0;
        $basicSalary = $this->getBasicSalary($acNo);
        
        // حساب قيمة الغياب (الراتب الأسبوعي / 6 أيام)
        return ($absenceCount * $basicSalary) / (4 * 6);
    }

    private function getWeeklyAdvanceDeduction($acNo, $month) {
        $currentWeek = $this->getCurrentWeek($month);
        
        $stmt = $this->db->prepare("
            SELECT SUM(amount) as total_advances 
            FROM employee_advances 
            WHERE `AC-No.` = ? 
            AND DATE_FORMAT(advance_date, '%Y-%m') = ? 
            AND WEEK(advance_date, 1) = ?
            AND status = 'approved'
        ");
        $stmt->execute([$acNo, $month, $currentWeek]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result['total_advances'] ?? 0;
    }

    private function getCurrentWeek($month) {
        $date = new DateTime($month . '-01');
        return $date->format('W');
    }
    
    public function getOverviewData($month, $salaryType = null) {
        try {
            // بناء الاستعلام حسب نوع الراتب
            if ($salaryType) {
                $stmt = $this->db->prepare("SELECT * FROM employees WHERE status = 'active' AND salary_type = ?");
                $stmt->execute([$salaryType]);
            } else {
                $stmt = $this->db->prepare("SELECT * FROM employees WHERE status = 'active'");
                $stmt->execute();
            }
            $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $overviewData = [];
            
            foreach ($employees as $employee) {
                $acNo = $employee['AC-No.'];
                
                // حساب المستحقات والاستقطاعات حسب نوع الراتب
                if ($employee['salary_type'] === 'monthly') {
                    $entitlements = $this->calculateEntitlements($acNo, $month);
                    $deductions = $this->calculateDeductions($acNo, $month);
                } else {
                    // للراتب الأسبوعي
                    $entitlements = $this->calculateWeeklyEntitlements($acNo, $month);
                    $deductions = $this->calculateWeeklyDeductions($acNo, $month);
                }
                
                $netSalary = $entitlements['total'] - $deductions['total'];
                
                $overviewData[] = [
                    'id' => $employee['id'],
                    'AC-No.' => $employee['AC-No.'],
                    'Name' => $employee['Name'],
                    'Department' => $employee['Department'],
                    'salary_type' => $employee['salary_type'],
                    'base_salary' => $employee['base_salary'],
                    'total_entitlements' => $entitlements['total'],
                    'total_deductions' => $deductions['total'],
                    'net_salary' => $netSalary
                ];
            }
            
            return [
                'success' => true,
                'data' => $overviewData
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    private function calculateEntitlements($acNo, $month) {
        // حساب المرتب الأساسي
        $basicSalary = $this->getBasicSalary($acNo);
        
        // حساب المكافآت
        $bonuses = $this->getMonthlyBonuses($acNo, $month);
        
        // حساب الساعات الإضافية
        $overtime = $this->getMonthlyOvertime($acNo, $month);
        
        // حساب بدل الانتظام
        $regularityAllowance = $this->getRegularityAllowance($acNo, $month);
        
        // حساب البدلات الأخرى
        $otherAllowances = $this->getOtherAllowances($acNo, $month);
        
        // حساب مكافآت التميز
        $excellenceBonus = $this->getExcellenceBonus($acNo, $month);
        
        return [
            'basic_salary' => $basicSalary,
            'bonuses' => $bonuses,
            'overtime' => $overtime,
            'regularity_allowance' => $regularityAllowance,
            'other_allowances' => $otherAllowances,
            'excellence_bonus' => $excellenceBonus,
            'total' => $basicSalary + $bonuses + $overtime + $regularityAllowance + $otherAllowances + $excellenceBonus
        ];
    }
    
    private function calculateDeductions($acNo, $month) {
        // حساب التأمين
        $insurance = $this->getInsuranceDeduction($acNo);
        
        // حساب الغياب والجزاءات
        $absencePenalty = $this->getAbsencePenalty($acNo, $month);
        
        // حساب السلف
        $advances = $this->getAdvanceDeduction($acNo);
        
        return [
            'insurance' => $insurance,
            'absence_penalty' => $absencePenalty,
            'advances' => $advances,
            'total' => $insurance + $absencePenalty + $advances
        ];
    }
    
    // دوال مساعدة للحسابات
    private function getBasicSalary($acNo) {
        $stmt = $this->db->prepare("SELECT base_salary FROM employees WHERE `AC-No.` = ?");
        $stmt->execute([$acNo]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['base_salary'] : 0;
    }
    
    private function getMonthlyBonuses($acNo, $month) {
        $stmt = $this->db->prepare("SELECT SUM(bonus_amount) as total FROM employee_bonuses 
                                   WHERE `AC-No.` = ? AND MONTH(bonus_date) = MONTH(?) 
                                   AND YEAR(bonus_date) = YEAR(?) AND status = 'approved'");
        $stmt->execute([$acNo, $month, $month]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['total'] : 0;
    }
    
    private function getMonthlyOvertime($acNo, $month) {
        // حساب الساعات الإضافية من جدول الحضور
        $stmt = $this->db->prepare("SELECT SUM(overtime_hours) as total_hours FROM attendance_logs 
                                   WHERE `AC-No.` = ? AND MONTH(date) = MONTH(?) 
                                   AND YEAR(date) = YEAR(?) AND status = 'present'");
        $stmt->execute([$acNo, $month, $month]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $totalHours = $result ? $result['total_hours'] : 0;
        
        // استخدام الإعدادات من قاعدة البيانات
        $basicSalary = $this->getBasicSalary($acNo);
        $dailyWorkHours = $this->getSetting('daily_work_hours', 8);
        $weeklyWorkDays = $this->getSetting('weekly_work_days', 6);
        $overtimeMultiplier = $this->getSetting('regular_overtime_multiplier', 1.5);
        
        // حساب معدل الساعة
        $hourlyRate = $basicSalary / ($dailyWorkHours * $weeklyWorkDays * 4); // 4 أسابيع في الشهر
        $overtimeValue = $totalHours * $hourlyRate * $overtimeMultiplier;
        
        return $overtimeValue;
    }
    
    private function getInsuranceDeduction($acNo) {
        // التحقق من خانة التأمينات أولاً
        $stmt = $this->db->prepare("SELECT has_insurance FROM employees WHERE `AC-No.` = ?");
        $stmt->execute([$acNo]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // إذا لم يكن الموظف مشترك في التأمينات، إرجاع 0
        if (!$result || !$result['has_insurance']) {
            return 0;
        }
        
        $basicSalary = $this->getBasicSalary($acNo);
        
        // استخدام الإعدادات الجديدة من قاعدة البيانات
        $socialInsurancePercentage = $this->getSetting('social_insurance_percentage', 0.11);
        $healthInsurancePercentage = $this->getSetting('health_insurance_percentage', 0.05);
        $incomeTaxPercentage = $this->getSetting('income_tax_percentage', 0.10);
        
        // حساب التأمينات والضرائب
        $socialInsurance = $basicSalary * $socialInsurancePercentage;
        $healthInsurance = $basicSalary * $healthInsurancePercentage;
        $incomeTax = $basicSalary * $incomeTaxPercentage;
        
        return $socialInsurance + $healthInsurance + $incomeTax;
    }
    
    private function getAbsencePenalty($acNo, $month) {
        // استخدام الإعدادات الجديدة من قاعدة البيانات
        $absencePenaltyPerDay = $this->getSetting('absence_penalty_per_day', 100);
        $latePenaltyPerMinute = $this->getSetting('late_penalty_per_minute', 2);
        $gracePeriodMinutes = $this->getSetting('grace_period_minutes', 15);
        $multiplierNormal = $this->getSetting('penalty_multiplier_normal', 2);
        $multiplierExcused = $this->getSetting('penalty_multiplier_excused', 1);
        
        // الحصول على بيانات الحضور
        $attendanceData = $this->getAttendanceData($acNo, $month);
        $absenceDays = $attendanceData['total_absent_days'];
        $lateMinutes = $attendanceData['total_late_minutes'];
        
        // حساب غرامة الغياب
        $absencePenalty = $absenceDays * $absencePenaltyPerDay;
        
        // حساب غرامة التأخير مع مدة السماح
        $effectiveLateMinutes = max(0, $lateMinutes - $gracePeriodMinutes);
        $latePenalty = $effectiveLateMinutes * $latePenaltyPerMinute;
        
        return $absencePenalty + $latePenalty;
    }
    
    private function getAttendanceData($acNo, $month) {
        // استخدام نفس منطق get_attendance_history.php
        $year = date('Y', strtotime($month));
        $monthNum = date('n', strtotime($month));
        
        // الحصول على العطل الرسمية
        $holidaysStmt = $this->db->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'official_holidays'");
        $holidaysStmt->execute();
        $holidaysResult = $holidaysStmt->fetch();
        $officialHolidays = $holidaysResult ? json_decode($holidaysResult['setting_value'], true) : ['Friday'];
        
        if (!is_array($officialHolidays)) {
            $officialHolidays = ['Friday'];
        }
        
        // الحصول على سجلات الحضور
        $startDate = sprintf('%04d-%02d-01', $year, $monthNum);
        $endDate = sprintf('%04d-%02d-%02d', $year, $monthNum, date('t', mktime(0, 0, 0, $monthNum, 1, $year)));
        
        $stmt = $this->db->prepare("SELECT * FROM attendance_logs WHERE `AC-No.` = ? AND date BETWEEN ? AND ?");
        $stmt->execute([$acNo, $startDate, $endDate]);
        $attendanceRecords = $stmt->fetchAll();
        
        // إنشاء مصفوفة لجميع أيام الشهر
        $numDays = date('t', mktime(0, 0, 0, $monthNum, 1, $year));
        $totalAbsentDays = 0;
        $totalLateMinutes = 0;
        
        for ($day = 1; $day <= $numDays; $day++) {
            $date = sprintf('%04d-%02d-%02d', $year, $monthNum, $day);
            $dayName = date('l', strtotime($date));
            
            // التحقق من العطل الرسمية
            $isHoliday = in_array($dayName, $officialHolidays);
            
            // البحث عن سجل الحضور لهذا اليوم
            $dayRecord = null;
            foreach ($attendanceRecords as $record) {
                if ($record['date'] === $date) {
                    $dayRecord = $record;
                    break;
                }
            }
            
            if ($dayRecord) {
                if ($dayRecord['status'] === 'absent' && !$isHoliday) {
                    $totalAbsentDays++;
                }
                if ($dayRecord['late_minutes'] > 0 && !$isHoliday) {
                    $totalLateMinutes += $dayRecord['late_minutes'];
                }
            } else if (!$isHoliday) {
                // إذا لم يكن هناك سجل حضور وليس عطلة، فهو غياب
                $totalAbsentDays++;
            }
        }
        
        return [
            'total_absent_days' => $totalAbsentDays,
            'total_late_minutes' => $totalLateMinutes
        ];
    }
    
    private function getLatePenalty($acNo, $month) {
        // حساب غرامة التأخير
        $latePenaltyHourlyRate = $this->getSetting('late_penalty_hourly_rate', 50);
        $latePenaltyHourMultiplier = $this->getSetting('late_penalty_hour_multiplier', 2);
        
        // الحصول على إجمالي دقائق التأخير
        $stmt = $this->db->prepare("SELECT SUM(late_minutes) as total_late_minutes FROM attendance_logs 
                                   WHERE `AC-No.` = ? AND MONTH(date) = MONTH(?) 
                                   AND YEAR(date) = YEAR(?) AND late_minutes > 0");
        $stmt->execute([$acNo, $month, $month]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $totalLateMinutes = $result ? $result['total_late_minutes'] : 0;
        
        // حساب الجزاء على أساس الساعات مع المضاعف
        $latePenaltyPerMinute = ($latePenaltyHourlyRate * $latePenaltyHourMultiplier) / 60;
        return $totalLateMinutes * $latePenaltyPerMinute;
    }
    
    private function getAdvanceDeduction($acNo) {
        $stmt = $this->db->prepare("SELECT SUM(amount) as total FROM employee_advances 
                                   WHERE `AC-No.` = ? AND status = 'approved'");
        $stmt->execute([$acNo]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['total'] : 0;
    }
    
    // دوال جديدة للحسابات المحسنة
    private function getOtherAllowances($acNo, $month) {
        // الحصول على البدلات الأخرى (بدل انتظام، بدل مواصلات، إلخ)
        $stmt = $this->db->prepare("SELECT SUM(bonus_amount) as total FROM employee_bonuses 
                                   WHERE `AC-No.` = ? AND MONTH(bonus_date) = MONTH(?) 
                                   AND YEAR(bonus_date) = YEAR(?) AND bonus_type = 'special' AND status = 'approved'");
        $stmt->execute([$acNo, $month, $month]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['total'] : 0;
    }
    
    private function getExcellenceBonus($acNo, $month) {
        // الحصول على مكافآت التميز والحوافز
        $stmt = $this->db->prepare("SELECT SUM(bonus_amount) as total FROM employee_bonuses 
                                   WHERE `AC-No.` = ? AND MONTH(bonus_date) = MONTH(?) 
                                   AND YEAR(bonus_date) = YEAR(?) AND bonus_type IN ('excellence', 'incentive') AND status = 'approved'");
        $stmt->execute([$acNo, $month, $month]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['total'] : 0;
    }
    
    private function getRegularityAllowance($acNo, $month) {
        // الحصول على بدل الانتظام
        $stmt = $this->db->prepare("SELECT SUM(bonus_amount) as total FROM employee_bonuses 
                                   WHERE `AC-No.` = ? AND MONTH(bonus_date) = MONTH(?) 
                                   AND YEAR(bonus_date) = YEAR(?) AND bonus_type = 'regularity' AND status = 'approved'");
        $stmt->execute([$acNo, $month, $month]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['total'] : 0;
    }
    
    // دالة إنشاء تقرير صرف المرتب
    public function generatePaymentSlip($employeeId, $month) {
        try {
            // استخدام AC-No. مباشرة إذا كان معرف الموظف
            $acNo = $employeeId;
            
            // الحصول على بيانات الموظف
            $employeeStmt = $this->db->prepare("SELECT * FROM employees WHERE `AC-No.` = ?");
            $employeeStmt->execute([$acNo]);
            $employee = $employeeStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$employee) {
                throw new Exception('الموظف غير موجود');
            }
            
            // حساب المستحقات والاستقطاعات
            $entitlements = $this->calculateEntitlements($acNo, $month);
            $deductions = $this->calculateDeductions($acNo, $month);
            
            // حساب صافي الراتب
            $netSalary = $entitlements['total'] - $deductions['total'];
            
            // إنشاء تقرير صرف المرتب
            $paymentSlip = [
                'employee' => $employee,
                'month' => $month,
                'payment_date' => date('Y-m-d'),
                'entitlements' => $entitlements,
                'deductions' => $deductions,
                'net_salary' => $netSalary,
                'generated_at' => date('Y-m-d H:i:s')
            ];
            
            // حفظ التقرير في قاعدة البيانات
            $this->savePaymentSlip($paymentSlip);
            
            return [
                'success' => true,
                'data' => $paymentSlip
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    private function savePaymentSlip($paymentSlip) {
        try {
            $stmt = $this->db->prepare("INSERT INTO monthly_payroll_reports 
                (`AC-No.`, employee_name, department, location, job_title, 
                 report_month, basic_salary, bonus_amount, other_allowances, excellence_bonus, 
                 regularity_allowance, monthly_overtime, total_entitlements, absence_days, 
                 absence_value, penalty_value, total_absence_penalty, insurance_value, 
                 advance_deduction, total_deductions, net_salary, status, payment_date, created_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
            $stmt->execute([
                $paymentSlip['employee']['AC-No.'],
                $paymentSlip['employee']['Name'],
                $paymentSlip['employee']['department'] ?? null,
                $paymentSlip['employee']['cost_center'] ?? null,
                $paymentSlip['employee']['job_title'] ?? null,
                $paymentSlip['month'],
                $paymentSlip['entitlements']['basic_salary'],
                $paymentSlip['entitlements']['bonuses'],
                $paymentSlip['entitlements']['other_allowances'],
                $paymentSlip['entitlements']['excellence_bonus'],
                $paymentSlip['entitlements']['regularity_allowance'],
                $paymentSlip['entitlements']['overtime'],
                $paymentSlip['entitlements']['total'],
                0, // absence_days - سيتم حسابها لاحقاً
                $paymentSlip['deductions']['absence_penalty'],
                0, // penalty_value - سيتم حسابها لاحقاً
                $paymentSlip['deductions']['absence_penalty'],
                $paymentSlip['deductions']['insurance'],
                $paymentSlip['deductions']['advances'],
                $paymentSlip['deductions']['total'],
                $paymentSlip['net_salary'],
                'approved',
                $paymentSlip['payment_date'],
                'system'
            ]);
        } catch (Exception $e) {
            // لا نرمي خطأ هنا لأن التقرير تم إنشاؤه بنجاح
            error_log("Error saving payment slip: " . $e->getMessage());
        }
    }
    
    /**
     * دالة مساعدة لجلب إعداد معين
     */
    private function getSetting($key, $default = null) {
        try {
            $stmt = $this->db->prepare("SELECT setting_value FROM system_settings WHERE setting_key = ?");
            $stmt->execute([$key]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($result) {
                return $result['setting_value'];
            }
            return $default;
        } catch (Exception $e) {
            return $default;
        }
    }
}

// Handle requests
$api = new EnhancedSalaryAPI();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        switch ($action) {
            case 'advances':
                $employeeId = isset($_GET['AC-No.']) ? $_GET['AC-No.'] : (isset($_GET['AC_No']) ? $_GET['AC_No'] : null);
                echo json_encode($api->getAdvances($employeeId), JSON_UNESCAPED_UNICODE);
                break;
                
            case 'overtime':
                $employeeId = isset($_GET['AC-No.']) ? $_GET['AC-No.'] : (isset($_GET['AC_No']) ? $_GET['AC_No'] : null);
                $month = $_GET['month'] ?? null;
                echo json_encode($api->getOvertimeHours($employeeId, $month), JSON_UNESCAPED_UNICODE);
                break;
                
            case 'penalties':
                $employeeId = isset($_GET['AC-No.']) ? $_GET['AC-No.'] : (isset($_GET['AC_No']) ? $_GET['AC_No'] : null);
                $month = $_GET['month'] ?? null;
                echo json_encode($api->getPenalties($employeeId, $month), JSON_UNESCAPED_UNICODE);
                break;
                
            case 'bonuses':
                $employeeId = isset($_GET['AC-No.']) ? $_GET['AC-No.'] : (isset($_GET['AC_No']) ? $_GET['AC_No'] : null);
                $month = $_GET['month'] ?? null;
                echo json_encode($api->getBonuses($employeeId, $month), JSON_UNESCAPED_UNICODE);
                break;
                
            case 'calculate_salary':
                // Handle AC-No. parameter (with dot) - try multiple parameter names
                $employeeId = null;
                if (isset($_GET['AC-No.'])) {
                    $employeeId = $_GET['AC-No.'];
                } elseif (isset($_GET['AC_No'])) {
                    $employeeId = $_GET['AC_No'];
                } elseif (isset($_GET['ACNo'])) {
                    $employeeId = $_GET['ACNo'];
                } elseif (isset($_GET['AC-No_'])) {
                    $employeeId = $_GET['AC-No_'];
                } elseif (isset($_GET['employee_id'])) {
                    $employeeId = $_GET['employee_id'];
                }
                
                $month = $_GET['month'] ?? date('Y-m-d');
                
                // Debug logging
                error_log("calculate_salary - AC-No.: " . ($employeeId ?? 'null'));
                error_log("calculate_salary - month: " . ($month ?? 'null'));
                error_log("calculate_salary - GET params: " . print_r($_GET, true));
                
                if (!$employeeId) {
                    echo json_encode(['success' => false, 'error' => 'كود الموظف مطلوب - المتاح: ' . implode(', ', array_keys($_GET))], JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode($api->calculateMonthlySalary($employeeId, $month), JSON_UNESCAPED_UNICODE);
                }
                break;
            case 'calculate_weekly_salary':
                // Handle AC-No. parameter (with dot)
                $employeeId = null;
                if (isset($_GET['AC-No.'])) {
                    $employeeId = $_GET['AC-No.'];
                } elseif (isset($_GET['AC_No'])) {
                    $employeeId = $_GET['AC_No'];
                }
                
                $month = $_GET['month'] ?? date('Y-m-d');
                if (!$employeeId) {
                    echo json_encode(['success' => false, 'error' => 'كود الموظف مطلوب'], JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode($api->calculateWeeklySalary($employeeId, $month), JSON_UNESCAPED_UNICODE);
                }
                break;
            case 'overview':
                $month = $_GET['month'] ?? date('Y-m-d');
                $salaryType = $_GET['salary_type'] ?? null;
                echo json_encode($api->getOverviewData($month, $salaryType), JSON_UNESCAPED_UNICODE);
                break;
                
            case 'payment_slip':
                $employeeId = isset($_GET['AC-No.']) ? $_GET['AC-No.'] : (isset($_GET['AC_No']) ? $_GET['AC_No'] : null);
                $month = $_GET['month'] ?? date('Y-m-d');
                if (!$employeeId) {
                    echo json_encode(['success' => false, 'error' => 'كود الموظف مطلوب'], JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode($api->generatePaymentSlip($employeeId, $month), JSON_UNESCAPED_UNICODE);
                }
                break;
                
            default:
                echo json_encode(['success' => false, 'error' => 'إجراء غير صحيح'], JSON_UNESCAPED_UNICODE);
        }
        break;
        
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        
        switch ($action) {
            case 'calculate_salary':
                $employeeId = $input['AC-No.'] ?? null;
                $month = $input['month'] ?? date('Y-m-d');
                
                // Debug logging
                error_log("POST calculate_salary - AC-No.: " . ($employeeId ?? 'null'));
                error_log("POST calculate_salary - month: " . ($month ?? 'null'));
                error_log("POST calculate_salary - input: " . print_r($input, true));
                
                if (!$employeeId) {
                    echo json_encode(['success' => false, 'error' => 'كود الموظف مطلوب'], JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode($api->calculateMonthlySalary($employeeId, $month), JSON_UNESCAPED_UNICODE);
                }
                break;
                
            case 'calculate_weekly_salary':
                $employeeId = $input['AC-No.'] ?? null;
                $month = $input['month'] ?? date('Y-m-d');
                
                if (!$employeeId) {
                    echo json_encode(['success' => false, 'error' => 'كود الموظف مطلوب'], JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode($api->calculateWeeklySalary($employeeId, $month), JSON_UNESCAPED_UNICODE);
                }
                break;
                
            case 'add_advance':
                echo json_encode($api->addAdvance($input), JSON_UNESCAPED_UNICODE);
                break;
                
            case 'update_advance':
                echo json_encode($api->updateAdvance($input), JSON_UNESCAPED_UNICODE);
                break;
                
            case 'add_overtime':
                echo json_encode($api->addOvertimeHours($input), JSON_UNESCAPED_UNICODE);
                break;
                
            case 'add_penalty':
                echo json_encode($api->addPenalty($input), JSON_UNESCAPED_UNICODE);
                break;
                
            case 'add_bonus':
                echo json_encode($api->addBonus($input), JSON_UNESCAPED_UNICODE);
                break;
                
            default:
                echo json_encode(['success' => false, 'error' => 'إجراء غير صحيح'], JSON_UNESCAPED_UNICODE);
        }
        break;
        
    case 'DELETE':
        switch ($action) {
            case 'delete_advance':
                $id = $_GET['id'] ?? null;
                if ($id) {
                    echo json_encode($api->deleteAdvance($id), JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode(['success' => false, 'error' => 'معرف السلفة مطلوب'], JSON_UNESCAPED_UNICODE);
                }
                break;
                
            default:
                echo json_encode(['success' => false, 'error' => 'إجراء غير صحيح'], JSON_UNESCAPED_UNICODE);
        }
        break;
        
    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);
        switch ($action) {
            case 'approve_advance':
                $id = $input['id'] ?? null;
                $approvedBy = $input['approved_by'] ?? 'المدير';
                if ($id) {
                    echo json_encode($api->approveAdvance($id, $approvedBy), JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode(['success' => false, 'error' => 'معرف السلفة مطلوب'], JSON_UNESCAPED_UNICODE);
                }
                break;
                
            default:
                echo json_encode(['success' => false, 'error' => 'إجراء غير صحيح'], JSON_UNESCAPED_UNICODE);
        }
        break;
        
    default:
        echo json_encode(['success' => false, 'error' => 'طريقة طلب غير مدعومة'], JSON_UNESCAPED_UNICODE);
}
?>

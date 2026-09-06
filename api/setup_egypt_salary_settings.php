<?php
require_once 'cors_headers.php';
require_once 'config_unified.php';

try {
    echo "=== إعداد النظام المصري للرواتب ===\n\n";
    
    // إعدادات النظام المصري
    $egyptSettings = [
        'monthly_work_days' => 26,
        'weekly_work_days' => 6,
        'daily_work_hours' => 8,
        'official_start_time' => '08:00',
        'official_end_time' => '17:00',
        'regular_overtime_multiplier' => 1.5,
        'holiday_work_multiplier' => 2.0,
        'penalty_multiplier' => 2.0,
        'employee_contribution_rate' => 10, // 10%
        'company_contribution_rate' => 15, // 15%
        'insurance_salary' => 200, // 200 جنيه
        'meal_allowance_per_day' => 25, // 25 جنيه
        'grace_period_minutes' => 15
    ];
    
    echo "📊 إضافة الإعدادات المصرية:\n";
    echo "============================\n";
    
    foreach ($egyptSettings as $key => $value) {
        // حذف الإعداد القديم إذا كان موجوداً
        $deleteStmt = $pdo->prepare("DELETE FROM system_settings WHERE setting_key = ?");
        $deleteStmt->execute([$key]);
        
        // إدراج الإعداد الجديد
        $insertStmt = $pdo->prepare("
            INSERT INTO system_settings 
            (setting_key, setting_name, setting_value, setting_type, category, description, is_editable, is_required)
            VALUES (?, ?, ?, 'number', 'egypt_salary', 'إعداد النظام المصري للرواتب', 1, 0)
        ");
        
        $settingNames = [
            'monthly_work_days' => 'أيام العمل الشهرية',
            'weekly_work_days' => 'أيام العمل الأسبوعية',
            'daily_work_hours' => 'ساعات العمل اليومية',
            'official_start_time' => 'وقت بدء العمل الرسمي',
            'official_end_time' => 'وقت انتهاء العمل الرسمي',
            'regular_overtime_multiplier' => 'مضاعف الساعات الإضافية العادية',
            'holiday_work_multiplier' => 'مضاعف العمل في العطل',
            'penalty_multiplier' => 'معامل الجزاءات',
            'employee_contribution_rate' => 'نسبة اشتراك الموظف في التأمين',
            'company_contribution_rate' => 'نسبة اشتراك الشركة في التأمين',
            'insurance_salary' => 'الراتب التأميني الثابت',
            'meal_allowance_per_day' => 'بدل الوجبة اليومي',
            'grace_period_minutes' => 'فترة السماح للتأخير (دقيقة)'
        ];
        
        $insertStmt->execute([
            $key,
            $settingNames[$key] ?? $key,
            $value
        ]);
        
        echo "✅ تم إضافة: {$settingNames[$key]} = $value\n";
    }
    
    // اختبار النظام المصري
    echo "\n🧮 اختبار النظام المصري:\n";
    echo "========================\n";
    
    $period = '2025-09';
    $employeesStmt = $pdo->query("SELECT id, name, employee_code, base_salary FROM employees WHERE status = 'active'");
    $employees = $employeesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    $totalBaseSalary = 0;
    $totalNetSalary = 0;
    
    foreach ($employees as $employee) {
        echo "👤 {$employee['name']} ({$employee['employee_code']}):\n";
        
        $baseSalary = floatval($employee['base_salary']);
        echo "  الراتب الأساسي: " . number_format($baseSalary, 2) . " جنيه\n";
        
        // الحصول على بيانات الحضور
        $attendanceStmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total_days,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
                SUM(COALESCE(work_hours, 0)) as total_work_hours,
                SUM(COALESCE(overtime_hours, 0)) as total_overtime_hours,
                SUM(COALESCE(late_minutes, 0)) as total_late_minutes
            FROM attendance_logs 
            WHERE employee_id = ? 
            AND DATE_FORMAT(attendance_date, '%Y-%m') = ?
        ");
        $attendanceStmt->execute([$employee['id'], $period]);
        $attendance = $attendanceStmt->fetch(PDO::FETCH_ASSOC);
        
        // الحسابات المصرية
        $bonusEntitlement = 0; // سيتم إدخاله يدوياً
        $attendanceBonus = floatval($attendance['present_days']) * 25; // 25 جنيه لكل يوم حضور
        $monthlyWorkDays = 26;
        $hourlyRate = $baseSalary / $monthlyWorkDays;
        $overtimePay = floatval($attendance['total_overtime_hours']) * $hourlyRate * 1.5;
        $excellence = $attendanceBonus + $overtimePay; // التميز = الإضافات
        $totalEntitlements = $baseSalary + $bonusEntitlement + $attendanceBonus + $overtimePay;
        
        $absenceDays = intval($attendance['absent_days'] ?? 0);
        $absenceValue = $absenceDays * ($totalEntitlements / $monthlyWorkDays);
        $delayHours = floatval($attendance['total_late_minutes'] ?? 0) / 60;
        $penaltyValue = $delayHours * 2.0 * $hourlyRate;
        $absencePenaltyValue = $absenceValue + $penaltyValue;
        
        $insuranceSalary = 200; // 200 جنيه
        $employeeShare = $insuranceSalary * 0.10; // 10%
        $companyShare = $insuranceSalary * 0.15; // 15%
        $insuranceValue = $employeeShare + $companyShare;
        
        $totalDeductions = $absencePenaltyValue + $insuranceValue;
        $netSalary = $totalEntitlements - $totalDeductions;
        
        echo "  بدل الوجبة: " . number_format($attendanceBonus, 2) . " جنيه\n";
        echo "  الساعات الإضافية: " . number_format($overtimePay, 2) . " جنيه\n";
        echo "  التميز: " . number_format($excellence, 2) . " جنيه\n";
        echo "  خصم الغياب: " . number_format($absenceValue, 2) . " جنيه\n";
        echo "  قيمة الجزاءات: " . number_format($penaltyValue, 2) . " جنيه\n";
        echo "  التأمين: " . number_format($insuranceValue, 2) . " جنيه\n";
        echo "  صافي الراتب: " . number_format($netSalary, 2) . " جنيه\n\n";
        
        $totalBaseSalary += $baseSalary;
        $totalNetSalary += $netSalary;
    }
    
    echo "📊 الإجماليات:\n";
    echo "==============\n";
    echo "إجمالي الرواتب الأساسية: " . number_format($totalBaseSalary, 2) . " جنيه\n";
    echo "إجمالي صافي الرواتب: " . number_format($totalNetSalary, 2) . " جنيه\n";
    
    echo json_encode([
        'success' => true,
        'message' => 'تم إعداد النظام المصري بنجاح',
        'total_employees' => count($employees),
        'total_base_salary' => $totalBaseSalary,
        'total_net_salary' => $totalNetSalary,
        'egypt_settings' => $egyptSettings
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في إعداد النظام المصري: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>

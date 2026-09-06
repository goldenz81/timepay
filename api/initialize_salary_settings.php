<?php
/**
 * تهيئة إعدادات الحساب الافتراضية
 * Initialize default salary calculation settings
 */

require_once 'cors_headers.php';

require_once 'config.php';

try {
    // إنشاء جدول إعدادات الحساب إذا لم يكن موجوداً
    $createTableSQL = "
        CREATE TABLE IF NOT EXISTS salary_calculation_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            setting_key VARCHAR(100) UNIQUE NOT NULL,
            setting_name VARCHAR(255) NOT NULL,
            setting_value DECIMAL(15,4) DEFAULT 0,
            setting_type ENUM('percentage', 'amount', 'days', 'hours', 'multiplier') DEFAULT 'percentage',
            category VARCHAR(50) NOT NULL,
            description TEXT,
            is_enabled TINYINT(1) DEFAULT 1,
            display_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    
    $pdo->exec($createTableSQL);
    
    // إعدادات افتراضية
    $defaultSettings = [
        // إعدادات البدلات
        ['housing_allowance_percentage', 15, 'نسبة بدل السكن من الراتب الأساسي', 'percentage', 'allowances', 1, 1],
        ['transport_allowance_percentage', 10, 'نسبة بدل المواصلات من الراتب الأساسي', 'percentage', 'allowances', 1, 2],
        ['food_allowance_percentage', 5, 'نسبة بدل الطعام من الراتب الأساسي', 'percentage', 'allowances', 1, 3],
        ['performance_bonus_percentage', 5, 'نسبة مكافأة الأداء من الراتب الأساسي', 'percentage', 'allowances', 1, 4],
        ['attendance_bonus_percentage', 3, 'نسبة بدل الانتظام من الراتب الأساسي', 'percentage', 'allowances', 1, 5],
        
        // إعدادات الخصومات
        ['insurance_percentage', 14, 'نسبة التأمين الاجتماعي من الراتب الأساسي', 'percentage', 'deductions', 1, 6],
        ['tax_percentage', 10, 'نسبة ضريبة الدخل من الراتب الأساسي', 'percentage', 'deductions', 1, 7],
        ['health_insurance_percentage', 2, 'نسبة التأمين الصحي من الراتب الأساسي', 'percentage', 'deductions', 1, 8],
        
        // إعدادات العمل
        ['work_days_per_month', 26, 'عدد أيام العمل في الشهر', 'other', 'work', 1, 9],
        ['daily_work_hours', 8, 'عدد ساعات العمل اليومية', 'time', 'work', 1, 10],
        
        // إعدادات الجزاءات
        ['penalty_multiplier_normal', 2, 'مضاعف الجزاء للغياب والتأخير', 'multiplier', 'penalties', 1, 11],
        ['penalty_multiplier_excused', 1, 'مضاعف الجزاء للغياب المعذور', 'multiplier', 'penalties', 1, 12],
        ['grace_period_minutes', 15, 'مدة السماح للتأخير بالدقائق', 'time', 'penalties', 1, 13],
    ];
    
    // إدراج الإعدادات الافتراضية
    $insertSQL = "
        INSERT IGNORE INTO salary_calculation_settings 
        (setting_key, setting_value, description, setting_type, category, is_enabled, display_order) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ";
    
    $stmt = $pdo->prepare($insertSQL);
    
    foreach ($defaultSettings as $setting) {
        $stmt->execute($setting);
    }
    
    // إضافة عناصر الحساب إلى calculation_elements_v2
    $elementsSQL = "
        INSERT IGNORE INTO calculation_elements_v2 
        (element_key, table_name, column_name, display_name, data_type, category, is_calculated, calculation_formula, description, is_active) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ";
    
    $elementsStmt = $pdo->prepare($elementsSQL);
    
    $calculationElements = [
        // عناصر البدلات
        ['calculated.housing_allowance', 'calculated', 'housing_allowance', 'بدل السكن', 'decimal', 'allowances', 1, 'employees.base_salary * settings.housing_allowance_percentage / 100', 'حساب بدل السكن كنسبة من الراتب الأساسي', 1],
        ['calculated.transport_allowance', 'calculated', 'transport_allowance', 'بدل المواصلات', 'decimal', 'allowances', 1, 'employees.base_salary * settings.transport_allowance_percentage / 100', 'حساب بدل المواصلات كنسبة من الراتب الأساسي', 1],
        ['calculated.food_allowance', 'calculated', 'food_allowance', 'بدل الطعام', 'decimal', 'allowances', 1, 'employees.base_salary * settings.food_allowance_percentage / 100', 'حساب بدل الطعام كنسبة من الراتب الأساسي', 1],
        ['calculated.performance_bonus', 'calculated', 'performance_bonus', 'مكافأة الأداء', 'decimal', 'allowances', 1, 'employees.base_salary * settings.performance_bonus_percentage / 100', 'حساب مكافأة الأداء كنسبة من الراتب الأساسي', 1],
        ['calculated.attendance_bonus', 'calculated', 'attendance_bonus', 'بدل الانتظام', 'decimal', 'allowances', 1, 'employees.base_salary * settings.attendance_bonus_percentage / 100', 'حساب بدل الانتظام كنسبة من الراتب الأساسي', 1],
        
        // عناصر الخصومات
        ['calculated.insurance', 'calculated', 'insurance', 'التأمين الاجتماعي', 'decimal', 'deductions', 1, 'employees.base_salary * settings.insurance_percentage / 100', 'حساب التأمين الاجتماعي كنسبة من الراتب الأساسي', 1],
        ['calculated.tax', 'calculated', 'tax', 'ضريبة الدخل', 'decimal', 'deductions', 1, 'employees.base_salary * settings.tax_percentage / 100', 'حساب ضريبة الدخل كنسبة من الراتب الأساسي', 1],
        ['calculated.health_insurance', 'calculated', 'health_insurance', 'التأمين الصحي', 'decimal', 'deductions', 1, 'employees.base_salary * settings.health_insurance_percentage / 100', 'حساب التأمين الصحي كنسبة من الراتب الأساسي', 1],
        
        // عناصر الغياب والجزاءات
        ['calculated.absence_days', 'calculated', 'absence_days', 'أيام الغياب', 'int', 'attendance', 1, 'COUNT(CASE WHEN attendance_logs.status = "absent" THEN 1 END)', 'عدد أيام الغياب من جدول الحضور', 1],
        ['calculated.absence_value', 'calculated', 'absence_value', 'قيمة الغياب', 'decimal', 'deductions', 1, 'calculated.absence_days * (employees.base_salary / settings.work_days_per_month)', 'حساب قيمة خصم الغياب', 1],
        ['calculated.penalty_value', 'calculated', 'penalty_value', 'قيمة الجزاءات', 'decimal', 'deductions', 1, '(attendance_logs.late_minutes + attendance_logs.early_leave_minutes) * (employees.base_salary / (settings.work_days_per_month * settings.daily_work_hours) / 60)', 'حساب قيمة جزاءات التأخير والانصراف المبكر', 1],
        
        // عناصر الإجمالي
        ['calculated.total_allowances', 'calculated', 'total_allowances', 'إجمالي المستحقات', 'decimal', 'totals', 1, 'calculated.housing_allowance + calculated.transport_allowance + calculated.food_allowance + calculated.performance_bonus + calculated.attendance_bonus', 'إجمالي جميع المستحقات', 1],
        ['calculated.total_deductions', 'calculated', 'total_deductions', 'إجمالي الخصومات', 'decimal', 'totals', 1, 'calculated.insurance + calculated.tax + calculated.health_insurance + calculated.absence_value + calculated.penalty_value + advances.amount', 'إجمالي جميع الخصومات', 1],
        ['calculated.net_salary', 'calculated', 'net_salary', 'الراتب الصافي', 'decimal', 'totals', 1, 'employees.base_salary + calculated.total_allowances - calculated.total_deductions', 'الراتب الصافي بعد الخصومات', 1],
    ];
    
    foreach ($calculationElements as $element) {
        $elementsStmt->execute($element);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'تم تهيئة إعدادات الحساب بنجاح',
        'settings_count' => count($defaultSettings),
        'elements_count' => count($calculationElements)
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'خطأ في تهيئة الإعدادات: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>

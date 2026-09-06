<?php
/**
 * إعداد معادلات الحساب في قاعدة البيانات
 * تم إنشاؤه في: 2025-01-27
 */

require_once "cors_headers.php";
require_once 'config_unified.php'; // يستخدم إعدادات قاعدة البيانات الديناميكية

try {
    
    echo "=== إعداد معادلات الحساب ===\n\n";
    
    // معادلات الحساب
    $formulas = [
        [
            'setting_key' => 'attendance_bonus_formula',
            'setting_name' => 'معادلة مكافأة الانتظام',
            'setting_value' => 'base_salary * 0.1',
            'setting_type' => 'string',
            'category' => 'calculation',
            'description' => 'معادلة حساب مكافأة الانتظام (10% من الراتب الأساسي)',
            'is_editable' => 1,
            'is_required' => 0
        ],
        [
            'setting_key' => 'overtime_rate',
            'setting_name' => 'معدل الساعة الإضافية',
            'setting_value' => '1.5',
            'setting_type' => 'number',
            'category' => 'calculation',
            'description' => 'معدل الساعة الإضافية العادية',
            'is_editable' => 1,
            'is_required' => 0
        ],
        [
            'setting_key' => 'holiday_overtime_rate',
            'setting_name' => 'معدل الساعة الإضافية في العطل',
            'setting_value' => '2.0',
            'setting_type' => 'number',
            'category' => 'calculation',
            'description' => 'معدل الساعة الإضافية في أيام العطل',
            'is_editable' => 1,
            'is_required' => 0
        ],
        [
            'setting_key' => 'insurance_rate',
            'setting_name' => 'معدل التأمين',
            'setting_value' => '0.14',
            'setting_type' => 'number',
            'category' => 'calculation',
            'description' => 'معدل استقطاع التأمين (14%)',
            'is_editable' => 1,
            'is_required' => 0
        ],
        [
            'setting_key' => 'tax_rate',
            'setting_name' => 'معدل الضريبة',
            'setting_value' => '0.10',
            'setting_type' => 'number',
            'category' => 'calculation',
            'description' => 'معدل الضريبة (10%)',
            'is_editable' => 1,
            'is_required' => 0
        ],
        [
            'setting_key' => 'daily_salary_calculation',
            'setting_name' => 'معادلة حساب الراتب اليومي',
            'setting_value' => 'base_salary / 30',
            'setting_type' => 'string',
            'category' => 'calculation',
            'description' => 'معادلة حساب الراتب اليومي',
            'is_editable' => 1,
            'is_required' => 0
        ],
        [
            'setting_key' => 'hourly_salary_calculation',
            'setting_name' => 'معادلة حساب الراتب بالساعة',
            'setting_value' => 'base_salary / 30 / 8',
            'setting_type' => 'string',
            'category' => 'calculation',
            'description' => 'معادلة حساب الراتب بالساعة',
            'is_editable' => 1,
            'is_required' => 0
        ],
        [
            'setting_key' => 'excellence_bonus_formula',
            'setting_name' => 'معادلة مكافأة التميز',
            'setting_value' => 'base_salary * 0.05',
            'setting_type' => 'string',
            'category' => 'calculation',
            'description' => 'معادلة حساب مكافأة التميز (5% من الراتب الأساسي)',
            'is_editable' => 1,
            'is_required' => 0
        ],
        [
            'setting_key' => 'meal_allowance_formula',
            'setting_name' => 'معادلة بدل الطعام',
            'setting_value' => 'attendance_days * 25',
            'setting_type' => 'string',
            'category' => 'calculation',
            'description' => 'معادلة حساب بدل الطعام (25 جنيه في اليوم)',
            'is_editable' => 1,
            'is_required' => 0
        ],
        [
            'setting_key' => 'penalty_formula',
            'setting_name' => 'معادلة الغرامة',
            'setting_value' => 'late_minutes * 0.5',
            'setting_type' => 'string',
            'category' => 'calculation',
            'description' => 'معادلة حساب غرامة التأخير (0.5 جنيه في الدقيقة)',
            'is_editable' => 1,
            'is_required' => 0
        ]
    ];
    
    // إدراج المعادلات
    $insertStmt = $pdo->prepare("
        INSERT INTO system_settings (
            setting_key, setting_name, setting_value, setting_type,
            category, description, is_editable, is_required,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            setting_value = VALUES(setting_value),
            updated_at = VALUES(updated_at)
    ");
    
    foreach ($formulas as $formula) {
        $insertStmt->execute([
            $formula['setting_key'],
            $formula['setting_name'],
            $formula['setting_value'],
            $formula['setting_type'],
            $formula['category'],
            $formula['description'],
            $formula['is_editable'],
            $formula['is_required'],
            date('Y-m-d H:i:s'),
            date('Y-m-d H:i:s')
        ]);
        
        echo "✅ تم إضافة معادلة: " . $formula['setting_name'] . "\n";
    }
    
    echo "\n✅ تم إعداد جميع معادلات الحساب بنجاح!\n";
    
} catch (Exception $e) {
    echo "❌ خطأ في إعداد المعادلات: " . $e->getMessage() . "\n";
}
?>

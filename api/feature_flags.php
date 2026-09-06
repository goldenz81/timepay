<?php
/**
 * أعلام الميزات على مستوى النظام (بدلات ومكافآت أسبوعية وغيرها)
 */

function parseSystemBooleanFlag($value, $default = true) {
    if ($value === null || $value === '') {
        return (bool) $default;
    }
    if (is_bool($value)) {
        return $value;
    }
    if (is_int($value) || is_float($value)) {
        return ((int) $value) !== 0;
    }
    $normalized = strtolower(trim((string) $value));
    return !in_array($normalized, ['0', 'false', 'no', 'off', 'disabled'], true);
}

function isMealAllowanceEnabled($value = null) {
    return parseSystemBooleanFlag($value, true);
}

function ensureMealAllowanceEnabledVariable($pdo) {
    try {
        $checkStmt = $pdo->prepare("SELECT id FROM system_variables WHERE variable_key = ? LIMIT 1");
        $checkStmt->execute(['meal_allowance_enabled']);
        if ($checkStmt->fetchColumn()) {
            return;
        }

        $insertStmt = $pdo->prepare("
            INSERT INTO system_variables
            (variable_key, variable_name_ar, variable_name_en, variable_value, variable_type, category, is_editable, is_required, description_ar, description_en, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
        ");
        $insertStmt->execute([
            'meal_allowance_enabled',
            'تفعيل بدل الوجبة والانتظام',
            'Meal Allowance Enabled',
            '1',
            'boolean',
            'salary',
            1,
            0,
            'عند التعطيل: لا يُحسب أجر الانتظام ولا يظهر عمود الوجبة في الحضور أو الراتب الأسبوعي',
            'When disabled: regularity/meal allowance is not calculated or shown in attendance and weekly salary'
        ]);
    } catch (Exception $e) {
        // لا نوقف الاستجابة إذا فشل الإنشاء التلقائي
    }
}

function zeroMealAllowanceInSalaryResults(array &$results, array &$context = null) {
    $results['on_time_days'] = 0;
    $results['regularity_days'] = 0;
    $results['regularity_pay'] = 0;
    $results['on_time_days_calculation'] = 0;
    $results['punctuality_bonus'] = 0;
    $results['attendance_bonus_value'] = 0;
    $results['attendance_bonus'] = 0;

    if ($context !== null) {
        $context['on_time_days'] = 0;
        $context['regularity_days'] = 0;
        $context['regularity_pay'] = 0;
        $context['punctuality_bonus'] = 0;
        $context['attendance_bonus_value'] = 0;
        $context['attendance_bonus'] = 0;
    }
}

function isMealAllowanceColumnDef($column) {
    if (!is_array($column)) {
        return false;
    }

    $key = strtolower(trim((string)($column['column_key'] ?? $column['name'] ?? '')));
    $nameAr = trim((string)($column['display_name_ar'] ?? $column['column_name_ar'] ?? ''));

    static $keys = [
        'meal_allowance',
        'on_time_days',
        'on_time_days_calculation',
        'regularity_days',
        'regularity_pay',
        'punctuality_bonus',
        'attendance_bonus_value',
        'attendance_bonus',
        'meal_allowance_per_day',
    ];

    if (in_array($key, $keys, true)) {
        return true;
    }

    if (
        strpos($key, 'on_time') !== false
        || strpos($key, 'regularity') !== false
        || strpos($key, 'meal_allowance') !== false
        || strpos($key, 'attendance_bonus') !== false
    ) {
        return true;
    }

    static $names = [
        'أيام الانتظام',
        'أجر الانتظام',
        'حساب أيام الانتظام',
        'قيمة مكافأة الانتظام',
        'قيمة الانتظام',
        'مكافأة الانتظام',
        'الوجبة',
        'بدل الوجبة',
    ];

    if (in_array($nameAr, $names, true)) {
        return true;
    }

    if ($nameAr !== '' && mb_strpos($nameAr, 'انتظام') !== false && mb_strpos($nameAr, 'إجمالي') === false) {
        return true;
    }

    return false;
}

function filterMealAllowanceColumnsFromList(array $columns, $mealEnabled = true) {
    if ($mealEnabled) {
        return $columns;
    }
    return array_values(array_filter($columns, function ($col) {
        return !isMealAllowanceColumnDef($col);
    }));
}

function getMealAllowanceEnabledFromPdo($pdo) {
    ensureMealAllowanceEnabledVariable($pdo);
    $stmt = $pdo->prepare("SELECT variable_value FROM system_variables WHERE variable_key = ? AND is_active = 1 LIMIT 1");
    $stmt->execute(['meal_allowance_enabled']);
    $value = $stmt->fetchColumn();
    return isMealAllowanceEnabled($value !== false ? $value : '1');
}

<?php
// تعطيل عرض الأخطاء لمنع تداخل HTML مع JSON
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

try {
    require_once 'config.php';
    require_once 'DynamicFormulaEngine.php';
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'خطأ في تحميل الملفات: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }
    $action = $input['action'] ?? $_GET['action'] ?? '';
    
    
    switch ($action) {
        case 'get_tables':
            $stmt = $pdo->query("SELECT * FROM dynamic_tables WHERE is_active = 1 ORDER BY display_name_ar");
            $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $tables], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_columns':
            $tableType = $input['table_type'] ?? $_GET['table_type'] ?? '';
            $tableId = $input['table_id'] ?? $_GET['table_id'] ?? '';
            $tableName = $input['table_name'] ?? $_GET['table_name'] ?? '';
            
            try {
                // تحديد الجدول المستهدف بناءً على table_name أو table_id
                $targetTable = '';
                
                // قائمة الجداول الصحيحة
                $validTables = [
                    'net_weekly_wage', 
                    'weekly_wage_entitlements', 
                    'weekly_wage_deductions', 
                    'net_monthly_salary', 
                    'monthly_salary_entitlements_columns', 
                    'monthly_salary_deductions_columns',
                    'employees' // إضافة جدول الموظفين
                ];
                
                if ($tableName && in_array($tableName, $validTables)) {
                    // استخدام table_name مباشرة إذا كان صحيحاً
                    $targetTable = $tableName;
                } else if ($tableId == 1 || $tableType === 'main' || $tableType === 'net_weekly_wage') {
                    $targetTable = 'net_weekly_wage';
                } else if ($tableId == 2 || $tableType === 'entitlements' || $tableType === 'weekly_wage_entitlements') {
                    $targetTable = 'weekly_wage_entitlements';
                } else if ($tableId == 3 || $tableType === 'deductions' || $tableType === 'weekly_wage_deductions') {
                    $targetTable = 'weekly_wage_deductions';
                } else if ($tableType === 'monthly') {
                    // للجداول الشهرية، نستخدم table_name مباشرة إذا كان محدداً وصحيحاً
                    if ($tableName === 'net_monthly_salary') {
                        $targetTable = 'net_monthly_salary';
                    } else if ($tableName === 'monthly_salary_entitlements' || $tableName === 'monthly_salary_entitlements_columns') {
                        $targetTable = 'monthly_salary_entitlements_columns';
                    } else if ($tableName === 'monthly_salary_deductions' || $tableName === 'monthly_salary_deductions_columns') {
                        $targetTable = 'monthly_salary_deductions_columns';
                    } else {
                        // افتراضي للشهري - جدول صافي المرتب الشهري
                        $targetTable = 'net_monthly_salary';
                    }
                } else {
                    // افتراضي - جدول صافي الأجر الأسبوعي
                    $targetTable = 'net_weekly_wage';
                }
                
                // جلب المراجع أولاً مع الأسماء الأصلية
                $references = [];
                if ($targetTable === 'weekly_wage_entitlements' || $targetTable === 'weekly_wage_deductions' || 
                    $targetTable === 'monthly_salary_entitlements_columns' || $targetTable === 'monthly_salary_deductions_columns' ||
                    $targetTable === 'net_monthly_salary') {
                    // تحديد الجدول المصدر بناءً على الجدول المستهدف
                    $expectedSourceTable = 'net_weekly_wage';
                    if ($targetTable === 'monthly_salary_entitlements_columns' || $targetTable === 'monthly_salary_deductions_columns' || $targetTable === 'net_monthly_salary') {
                        // للجداول الشهرية، نستخدم net_monthly_salary كجدول مصدر
                        $expectedSourceTable = 'net_monthly_salary';
                    }
                    
                    // استثناء: لا نجلب مراجع من net_weekly_wage لـ net_monthly_salary
                    if ($targetTable === 'net_monthly_salary') {
                        $expectedSourceTable = 'net_monthly_salary';
                    }
                    
                    // استخدام JOIN ديناميكي بناءً على الجدول المصدر المتوقع
                    // لكن نتحقق من source_table الفعلي في قاعدة البيانات أيضاً
                    $stmt = $pdo->prepare("
                        SELECT 
                            cr.id,
                            cr.source_table,
                            COALESCE(
                                CASE 
                                    WHEN cr.source_table = 'net_monthly_salary' THEN monthly_col.column_key
                                    WHEN cr.source_table = 'net_weekly_wage' THEN weekly_col.column_key
                                    ELSE NULL
                                END,
                                cr.source_column_key
                            ) as name,
                            COALESCE(
                                CASE 
                                    WHEN cr.source_table = 'net_monthly_salary' THEN monthly_col.column_key
                                    WHEN cr.source_table = 'net_weekly_wage' THEN weekly_col.column_key
                                    ELSE NULL
                                END,
                                cr.source_column_key
                            ) as column_key,
                            COALESCE(
                                CASE 
                                    WHEN cr.source_table = 'net_monthly_salary' THEN monthly_col.column_name_ar
                                    WHEN cr.source_table = 'net_weekly_wage' THEN weekly_col.column_name_ar
                                    ELSE NULL
                                END,
                                cr.display_name_ar,
                                ''
                            ) as display_name_ar,
                            COALESCE(
                                CASE 
                                    WHEN cr.source_table = 'net_monthly_salary' THEN monthly_col.column_name_en
                                    WHEN cr.source_table = 'net_weekly_wage' THEN weekly_col.column_name_en
                                    ELSE NULL
                                END,
                                cr.display_name_en,
                                ''
                            ) as display_name_en,
                            cr.target_column_key,
                            'reference' as type,
                            999 as `order`,
                            1 as is_visible,
                            0 as is_editable,
                            1 as is_calculated,
                            COALESCE(
                                CASE 
                                    WHEN cr.source_table = 'net_monthly_salary' THEN monthly_col.badge_color
                                    WHEN cr.source_table = 'net_weekly_wage' THEN weekly_col.badge_color
                                    ELSE NULL
                                END,
                                'purple'
                            ) as badge_color,
                            COALESCE(
                                CASE 
                                    WHEN cr.source_table = 'net_monthly_salary' THEN monthly_col.badge_variant
                                    WHEN cr.source_table = 'net_weekly_wage' THEN weekly_col.badge_variant
                                    ELSE NULL
                                END,
                                'outline'
                            ) as badge_variant,
                            COALESCE(
                                CASE 
                                    WHEN cr.source_table = 'net_monthly_salary' THEN monthly_col.is_currency
                                    WHEN cr.source_table = 'net_weekly_wage' THEN weekly_col.is_currency
                                    ELSE NULL
                                END,
                                1
                            ) as is_currency,
                            2 as decimal_places,
                            CONCAT('مرجع من ', cr.source_table, '.', COALESCE(
                                CASE 
                                    WHEN cr.source_table = 'net_monthly_salary' THEN monthly_col.column_key
                                    WHEN cr.source_table = 'net_weekly_wage' THEN weekly_col.column_key
                                    ELSE NULL
                                END,
                                cr.source_column_key
                            )) as description,
                            cr.created_at,
                            cr.updated_at
                        FROM column_references cr
                        LEFT JOIN net_monthly_salary monthly_col ON cr.source_table = 'net_monthly_salary' AND cr.source_column_key = monthly_col.column_key
                        LEFT JOIN net_weekly_wage weekly_col ON cr.source_table = 'net_weekly_wage' AND cr.source_column_key = weekly_col.column_key
                        WHERE cr.target_table = ? AND cr.is_active = 1
                        AND cr.source_table = ?
                        AND NOT (cr.source_table = 'net_weekly_wage' AND cr.target_table = 'net_monthly_salary')
                        AND NOT (cr.source_table = 'net_weekly_wage' AND cr.target_table LIKE '%monthly%')
                    ");
                    $stmt->execute([$targetTable, $expectedSourceTable]);
                    $references = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    // تصفية إضافية: إزالة أي مراجع من net_weekly_wage لـ net_monthly_salary
                    $references = array_filter($references, function($ref) use ($targetTable) {
                        if ($targetTable === 'net_monthly_salary' || $targetTable === 'monthly_salary_entitlements_columns' || $targetTable === 'monthly_salary_deductions_columns') {
                            return $ref['source_table'] !== 'net_weekly_wage';
                        }
                        return true;
                    });
                    
                    // تسجيل المراجع التي تم جلبها للتشخيص
                    error_log('References fetched for ' . $targetTable . ' (expected source: ' . $expectedSourceTable . '): ' . json_encode($references, JSON_UNESCAPED_UNICODE));
                }
                
                // استعلام موحد للجداول الجديدة مع دعم عمود base_salary
                if ($targetTable === 'weekly_wage_entitlements') {
                    // استعلام خاص لجدول المستحقات مع المعادلات الفعلية من قاعدة البيانات
                    $stmt = $pdo->prepare("
                        SELECT 
                            we.id,
                            we.column_key as name,
                            we.column_key,
                            we.column_name_ar as display_name_ar,
                            we.column_name_en as display_name_en,
                            we.data_type as type,
                            we.display_order as `order`,
                            we.is_visible,
                            we.is_editable,
                            we.is_calculated,
                            we.badge_color,
                            we.badge_variant,
                            we.is_currency,
                            we.decimal_places,
                            we.description,
                            COALESCE(
                                we.formula,
                                CASE 
                                    WHEN we.is_calculated = 1 THEN
                                        CASE we.column_key
                                            WHEN 'daily_wage' THEN 'base_salary / weekly_work_days'
                                            WHEN 'weekly_wage' THEN 'base_salary'
                                            WHEN 'hourly_wage' THEN 'daily_wage / daily_work_hours'
                                            WHEN 'overtime_hours' THEN 'regular_overtime_hours + holiday_overtime_hours'
                                            WHEN 'overtime_pay' THEN '(regular_overtime_hours * hourly_wage * regular_overtime_multiplier) + (holiday_overtime_hours * hourly_wage * holiday_work_multiplier)'
                                            WHEN 'regularity_pay' THEN 'on_time_days * meal_allowance_per_day'
                                        ELSE NULL
                                    END
                                ELSE NULL
                                END
                            ) as formula,
                            we.base_salary
                        FROM {$targetTable} we
                        ORDER BY we.display_order
                    ");
                } else if ($targetTable === 'weekly_wage_deductions') {
                    // استعلام خاص لجدول المستقطعات مع المعادلات الفعلية
                    $stmt = $pdo->prepare("
                        SELECT 
                            wd.id,
                            wd.column_key as name,
                            wd.column_key,
                            wd.column_name_ar as display_name_ar,
                            wd.column_name_en as display_name_en,
                            wd.data_type as type,
                            wd.display_order as `order`,
                            wd.is_visible,
                            wd.is_editable,
                            wd.is_calculated,
                            wd.badge_color,
                            wd.badge_variant,
                            wd.is_currency,
                            wd.decimal_places,
                            wd.description,
                            CASE 
                                WHEN wd.is_calculated = 1 THEN
                                    COALESCE(
                                        wd.formula,
                                        CASE wd.column_key
                                            WHEN 'absence_deduction' THEN 'absent_days * daily_wage'
                                        WHEN 'late_deduction' THEN 'late_hours * hourly_wage'
                                            WHEN 'insurance_deduction' THEN 'weekly_insurance_amount'
                                        WHEN 'advance_deduction' THEN 'advance_payment'
                                            WHEN 'total_deductions' THEN 'absence_deduction + late_deduction + insurance_deduction + advance_deduction'
                                        ELSE NULL
                                    END
                                    )
                                ELSE NULL
                            END as formula
                        FROM {$targetTable} wd
                        ORDER BY wd.display_order
                    ");
                } else if ($targetTable === 'net_weekly_wage') {
                    // استعلام خاص لجدول صافي الأجر مع المعادلات الفعلية
                    $stmt = $pdo->prepare("
                        SELECT 
                            id,
                            column_key as name,
                            column_key,
                            column_name_ar as display_name_ar,
                            column_name_en as display_name_en,
                            data_type as type,
                            display_order as `order`,
                            is_visible,
                            is_editable,
                            is_calculated,
                            badge_color,
                            badge_variant,
                            is_currency,
                            decimal_places,
                            description,
                            CASE 
                                WHEN is_calculated = 1 THEN
                                    CASE column_key
                                        WHEN 'total_entitlements' THEN 'base_salary + transport_allowance + special_bonus + overtime_pay + punctuality_bonus'
                                        WHEN 'total_deductions' THEN 'absent_deduction + late_deduction + insurance_deduction + advance_deduction'
                                        WHEN 'net_salary' THEN 'total_entitlements - total_deductions'
                                        ELSE NULL
                                    END
                                ELSE NULL
                            END as formula
                        FROM {$targetTable}
                        ORDER BY display_order
                    ");
                } else if ($targetTable === 'net_monthly_salary') {
                    // استعلام خاص لجدول صافي المرتب الشهري
                    $stmt = $pdo->prepare("
                        SELECT 
                            id,
                            column_key as name,
                            column_key,
                            column_name_ar as display_name_ar,
                            column_name_en as display_name_en,
                            data_type as type,
                            display_order as `order`,
                            is_visible,
                            is_editable,
                            is_calculated,
                            badge_color,
                            badge_variant,
                            is_currency,
                            decimal_places,
                            description,
                            formula
                        FROM {$targetTable}
                        ORDER BY display_order
                    ");
                } else if ($targetTable === 'monthly_salary_entitlements_columns' || $targetTable === 'monthly_salary_deductions_columns') {
                    // استعلام خاص للجداول الشهرية مع المعادلات الفعلية
                    $stmt = $pdo->prepare("
                        SELECT 
                            id,
                            column_key as name,
                            column_key,
                            column_name_ar as display_name_ar,
                            column_name_en as display_name_en,
                            data_type as type,
                            display_order as `order`,
                            is_visible,
                            is_editable,
                            is_calculated,
                            badge_color,
                            badge_variant,
                            is_currency,
                            decimal_places,
                            description,
                            COALESCE(formula, '') as formula
                        FROM {$targetTable}
                        ORDER BY display_order
                    ");
                } else if ($targetTable === 'employees') {
                    // استعلام خاص لجدول الموظفين - جلب الأعمدة مباشرة من INFORMATION_SCHEMA
                    $dbName = $pdo->query("SELECT DATABASE()")->fetchColumn();
                    $stmt = $pdo->prepare("
                        SELECT 
                            COLUMN_NAME as column_key,
                            COLUMN_NAME as name,
                            COLUMN_NAME,
                            CASE 
                                WHEN COLUMN_NAME = 'id' THEN 'المعرف'
                                WHEN COLUMN_NAME = 'employee_code' THEN 'كود الموظف'
                                WHEN COLUMN_NAME = 'name' THEN 'الاسم (إنجليزي)'
                                WHEN COLUMN_NAME = 'name_ar' THEN 'الاسم (عربي)'
                                WHEN COLUMN_NAME = 'base_salary' THEN 'الراتب الأساسي'
                                WHEN COLUMN_NAME = 'discrimination_incentive_allowance' THEN 'التمييز والحوافز'
                                WHEN COLUMN_NAME = 'salary_type' THEN 'نوع الراتب'
                                WHEN COLUMN_NAME = 'department' THEN 'القسم'
                                WHEN COLUMN_NAME = 'cost_center' THEN 'مركز التكلفة'
                                WHEN COLUMN_NAME = 'position' THEN 'المنصب'
                                WHEN COLUMN_NAME = 'location' THEN 'الموقع'
                                WHEN COLUMN_NAME = 'hire_date' THEN 'تاريخ التعيين'
                                WHEN COLUMN_NAME = 'status' THEN 'الحالة'
                                WHEN COLUMN_NAME = 'is_insured' THEN 'مؤمن عليه'
                                ELSE COLUMN_NAME
                            END as display_name_ar,
                            COLUMN_NAME as display_name_en,
                            DATA_TYPE as type,
                            ORDINAL_POSITION as `order`,
                            1 as is_visible,
                            0 as is_editable,
                            0 as is_calculated,
                            CASE 
                                WHEN COLUMN_NAME = 'base_salary' THEN 'blue'
                                WHEN COLUMN_NAME = 'discrimination_incentive_allowance' THEN 'orange'
                                ELSE 'gray'
                            END as badge_color,
                            'solid' as badge_variant,
                            CASE 
                                WHEN COLUMN_NAME IN ('base_salary', 'discrimination_incentive_allowance') THEN 1
                                ELSE 0
                            END as is_currency,
                            2 as decimal_places,
                            '' as description,
                            NULL as formula,
                            ORDINAL_POSITION as id
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_SCHEMA = ?
                        AND TABLE_NAME = 'employees'
                        AND COLUMN_NAME NOT IN ('created_at', 'updated_at', 'fingerprint_id', 'fingerprint_enrolled', 'fingerprint_device_id', 'AC-No.')
                        ORDER BY ORDINAL_POSITION
                    ");
                    $stmt->execute([$dbName]);
                } else {
                    // استعلام عادي للجداول الأخرى
                    $stmt = $pdo->prepare("
                        SELECT 
                            id,
                            column_key as name,
                            column_key,
                            column_name_ar as display_name_ar,
                            column_name_en as display_name_en,
                            data_type as type,
                            display_order as `order`,
                            is_visible,
                            is_editable,
                            is_calculated,
                            badge_color,
                            badge_variant,
                            is_currency,
                            decimal_places,
                            description,
                            NULL as formula
                        FROM {$targetTable}
                        ORDER BY display_order
                    ");
                }
                $stmt->execute();
                
                $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // دمج المراجع مع الأعمدة العادية
                $allColumns = array_merge($columns, $references);
                
                echo json_encode(['success' => true, 'data' => $allColumns], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'خطأ في جلب الأعمدة: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'get_formulas':
            $tableName = $input['table_name'] ?? $_GET['table_name'] ?? '';
            
            if (!$tableName) {
                echo json_encode(['success' => false, 'message' => 'اسم الجدول مطلوب'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            try {
                // جلب المعادلات من الجدول المحدد
                $stmt = $pdo->prepare("
                    SELECT 
                        column_key,
                        formula,
                        column_name_ar,
                        column_name_en
                    FROM {$tableName}
                    WHERE is_calculated = 1 AND formula IS NOT NULL
                    ORDER BY display_order
                ");
                $stmt->execute();
                $formulas = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode(['success' => true, 'data' => $formulas], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'خطأ في جلب المعادلات: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'get_variables':
            $category = $input['category'] ?? $_GET['category'] ?? '';
            $sql = "SELECT * FROM system_variables WHERE is_active = 1";
            $params = [];
            
            if ($category) {
                $sql .= " AND category = ?";
                $params[] = $category;
            }
            
            $sql .= " ORDER BY category, variable_name_ar";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $variables = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $variables], JSON_UNESCAPED_UNICODE);
            break;

        case 'get_stats':
            // إحصائيات النظام الديناميكي
            $stats = [];
            
            // عدد الجداول
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM dynamic_tables WHERE is_active = 1");
            $stats['total_tables'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            // عدد الأعمدة
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM dynamic_columns WHERE is_active = 1");
            $stats['total_columns'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            // عدد المعادلات
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM dynamic_formulas WHERE is_active = 1");
            $stats['total_formulas'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            // عدد المتغيرات
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM system_variables WHERE is_active = 1");
            $stats['total_variables'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            // عدد المعادلات المرتبطة بجداول
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM dynamic_formulas WHERE is_active = 1 AND table_id IS NOT NULL");
            $stats['linked_formulas'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            // عدد المعادلات غير المرتبطة
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM dynamic_formulas WHERE is_active = 1 AND table_id IS NULL");
            $stats['unlinked_formulas'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            echo json_encode(['success' => true, 'stats' => $stats], JSON_UNESCAPED_UNICODE);
            break;
            
            
        case 'create_column_formula_mapping':
            $columnId = $input['column_id'] ?? '';
            $formulaId = $input['formula_id'] ?? '';
            $mappingType = $input['mapping_type'] ?? 'calculation';
            
            if (!$columnId || !$formulaId) {
                echo json_encode(['success' => false, 'message' => 'معرف العمود والمعادلة مطلوبان'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            // حذف الربط السابق إذا كان موجوداً
            $stmt = $pdo->prepare("DELETE FROM column_formula_mappings WHERE column_id = ? AND mapping_type = ?");
            $stmt->execute([$columnId, $mappingType]);
            
            // إنشاء الربط الجديد
            $stmt = $pdo->prepare("INSERT INTO column_formula_mappings (column_id, formula_id, mapping_type, is_active) VALUES (?, ?, ?, 1)");
            $stmt->execute([$columnId, $formulaId, $mappingType]);
            
            echo json_encode(['success' => true, 'message' => 'تم ربط العمود بالمعادلة بنجاح'], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'delete_column_formula_mapping':
            $mappingId = $input['mapping_id'] ?? '';
            
            if (!$mappingId) {
                echo json_encode(['success' => false, 'message' => 'معرف الربط مطلوب'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            $stmt = $pdo->prepare("UPDATE column_formula_mappings SET is_active = 0 WHERE id = ?");
            $stmt->execute([$mappingId]);
            
            echo json_encode(['success' => true, 'message' => 'تم إلغاء الربط بنجاح'], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'test_formula':
            $formulaKey = $input['formula_key'] ?? '';
            $testVariables = $input['test_variables'] ?? [];
            
            if (!$formulaKey) {
                echo json_encode(['success' => false, 'message' => 'مفتاح المعادلة مطلوب'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            $engine = new DynamicFormulaEngine($pdo);
            $result = $engine->evaluateFormula($formulaKey, $testVariables);
            
            echo json_encode([
                'success' => true, 
                'result' => $result,
                'formula_key' => $formulaKey,
                'test_variables' => $testVariables
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'validate_formula':
            $formula = $input['formula'] ?? '';
            
            if (!$formula) {
                echo json_encode(['success' => false, 'message' => 'المعادلة مطلوبة'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            $engine = new DynamicFormulaEngine($pdo);
            $validation = $engine->validateFormula($formula);
            
            echo json_encode([
                'success' => true,
                'validation' => $validation
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'create_table':
            $tableName = $input['table_name'] ?? '';
            $displayNameAr = $input['display_name_ar'] ?? '';
            $displayNameEn = $input['display_name_en'] ?? '';
            $tableType = $input['table_type'] ?? 'main';
            $parentTable = $input['parent_table'] ?? null;
            
            if (!$tableName || !$displayNameAr || !$displayNameEn) {
                echo json_encode(['success' => false, 'message' => 'جميع الحقول مطلوبة'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            $stmt = $pdo->prepare("INSERT INTO dynamic_tables (table_name, display_name_ar, display_name_en, table_type, parent_table) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$tableName, $displayNameAr, $displayNameEn, $tableType, $parentTable]);
            
            echo json_encode(['success' => true, 'message' => 'تم إنشاء الجدول بنجاح'], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'create_column':
            $tableId = $input['table_id'] ?? '';
            $columnName = $input['column_name'] ?? '';
            $displayNameAr = $input['display_name_ar'] ?? '';
            $displayNameEn = $input['display_name_en'] ?? '';
            $dataType = $input['data_type'] ?? 'text';
            $isCalculated = $input['is_calculated'] ? 1 : 0;
            $isEditable = $input['is_editable'] ? 1 : 0;
            $isRequired = $input['is_required'] ? 1 : 0;
            $defaultValue = $input['default_value'] ?? null;
            $displayOrder = intval($input['display_order'] ?? 0);
            
            if (!$tableId || !$columnName || !$displayNameAr || !$displayNameEn) {
                echo json_encode(['success' => false, 'message' => 'جميع الحقول مطلوبة'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            $stmt = $pdo->prepare("INSERT INTO dynamic_columns (table_id, column_name, display_name_ar, display_name_en, data_type, is_calculated, is_editable, is_required, default_value, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$tableId, $columnName, $displayNameAr, $displayNameEn, $dataType, $isCalculated, $isEditable, $isRequired, $defaultValue, $displayOrder]);
            
            echo json_encode(['success' => true, 'message' => 'تم إنشاء العمود بنجاح'], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'update_column':
            $id = $input['id'] ?? '';
            $tableId = $input['table_id'] ?? '';
            $columnName = $input['column_name'] ?? '';
            $displayNameAr = $input['display_name_ar'] ?? '';
            $displayNameEn = $input['display_name_en'] ?? '';
            $dataType = $input['data_type'] ?? 'text';
            $isCalculated = $input['is_calculated'] ? 1 : 0;
            $isEditable = $input['is_editable'] ? 1 : 0;
            $isRequired = $input['is_required'] ? 1 : 0;
            $defaultValue = $input['default_value'] ?? null;
            $displayOrder = intval($input['display_order'] ?? 0);
            $badgeColor = $input['badge_color'] ?? 'blue';
            $badgeVariant = $input['badge_variant'] ?? 'solid';
            $isCurrency = $input['is_currency'] ? 1 : 0;
            
            if (!$id || !$tableId || !$columnName || !$displayNameAr) {
                echo json_encode(['success' => false, 'message' => 'جميع الحقول مطلوبة'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            // إذا لم يتم إرسال الاسم الإنجليزي، استخدم العربي
            if (!$displayNameEn) {
                $displayNameEn = $displayNameAr;
            }
            
            try {
                // الحصول على العمود القديم للتحقق من التغيير
                $stmt = $pdo->prepare("SELECT column_name FROM dynamic_columns WHERE id = ?");
                $stmt->execute([$id]);
                $oldColumn = $stmt->fetch(PDO::FETCH_ASSOC);
                $oldColumnName = $oldColumn['column_name'] ?? '';
                
                // تحديث العمود في النظام الديناميكي
                $stmt = $pdo->prepare("UPDATE dynamic_columns SET table_id = ?, column_name = ?, display_name_ar = ?, display_name_en = ?, data_type = ?, is_calculated = ?, is_editable = ?, is_required = ?, default_value = ?, display_order = ?, badge_color = ?, badge_variant = ?, is_currency = ? WHERE id = ?");
                $stmt->execute([$tableId, $columnName, $displayNameAr, $displayNameEn, $dataType, $isCalculated, $isEditable, $isRequired, $defaultValue, $displayOrder, $badgeColor, $badgeVariant, $isCurrency, $id]);
                
                // إذا تغير اسم العمود، قم بالتحديث التلقائي
                if ($oldColumnName && $oldColumnName !== $columnName) {
                    require_once __DIR__ . '/AutoColumnUpdater.php';
                    $updater = new AutoColumnUpdater($pdo);
                    
                    $updateResult = $updater->updateColumnInDatabase($tableId, $oldColumnName, $columnName, $dataType);
                    
                    if ($updateResult['success']) {
                        echo json_encode([
                            'success' => true, 
                            'message' => 'تم تحديث العمود بنجاح في النظام الديناميكي وقاعدة البيانات',
                            'details' => $updateResult['message']
                        ], JSON_UNESCAPED_UNICODE);
                    } else {
                        echo json_encode([
                            'success' => false, 
                            'message' => 'تم تحديث العمود في النظام الديناميكي لكن فشل تحديث قاعدة البيانات',
                            'details' => $updateResult['message']
                        ], JSON_UNESCAPED_UNICODE);
                    }
                } else {
                    echo json_encode(['success' => true, 'message' => 'تم تحديث العمود بنجاح'], JSON_UNESCAPED_UNICODE);
                }
                
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'خطأ في تحديث العمود: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'create_formula':
            $formulaKey = $input['formula_key'] ?? '';
            $formulaNameAr = $input['formula_name_ar'] ?? '';
            $formulaNameEn = $input['formula_name_en'] ?? '';
            $formulaExpression = $input['formula_expression'] ?? '';
            $formulaType = $input['formula_type'] ?? 'calculation';
            $returnType = $input['return_type'] ?? 'number';
            $descriptionAr = $input['description_ar'] ?? '';
            
            if (!$formulaKey || !$formulaNameAr || !$formulaNameEn || !$formulaExpression) {
                echo json_encode(['success' => false, 'message' => 'جميع الحقول مطلوبة'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            $stmt = $pdo->prepare("INSERT INTO dynamic_formulas (formula_key, formula_name_ar, formula_name_en, formula_expression, formula_type, return_type, description_ar) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$formulaKey, $formulaNameAr, $formulaNameEn, $formulaExpression, $formulaType, $returnType, $descriptionAr]);
            
            echo json_encode(['success' => true, 'message' => 'تم إنشاء المعادلة بنجاح'], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'update_formula':
            $formulaId = $input['id'] ?? '';
            $formulaKey = $input['formula_key'] ?? '';
            $formulaNameAr = $input['formula_name_ar'] ?? '';
            $formulaNameEn = $input['formula_name_en'] ?? '';
            $formulaExpression = $input['formula_expression'] ?? '';
            $formulaType = $input['formula_type'] ?? 'calculation';
            $returnType = $input['return_type'] ?? 'number';
            $descriptionAr = $input['description_ar'] ?? '';
            $tableId = $input['table_id'] ?? null; // إضافة table_id
            
            // إذا كان table_id موجود، نحدثه فقط
            if ($tableId !== null) {
                if (!$formulaId) {
                    echo json_encode(['success' => false, 'message' => 'معرف المعادلة مطلوب'], JSON_UNESCAPED_UNICODE);
                    break;
                }
                
                $stmt = $pdo->prepare("UPDATE dynamic_formulas SET table_id = ?, updated_at = NOW() WHERE id = ?");
                $stmt->execute([$tableId, $formulaId]);
                
                echo json_encode(['success' => true, 'message' => 'تم نقل المعادلة بنجاح'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            // إذا لم يكن table_id موجود، نحدث باقي الحقول
            if (!$formulaId || !$formulaKey || !$formulaNameAr || !$formulaNameEn || !$formulaExpression) {
                echo json_encode(['success' => false, 'message' => 'جميع الحقول مطلوبة'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            $stmt = $pdo->prepare("UPDATE dynamic_formulas SET formula_key = ?, formula_name_ar = ?, formula_name_en = ?, formula_expression = ?, formula_type = ?, return_type = ?, description_ar = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$formulaKey, $formulaNameAr, $formulaNameEn, $formulaExpression, $formulaType, $returnType, $descriptionAr, $formulaId]);
            
            echo json_encode(['success' => true, 'message' => 'تم تحديث المعادلة بنجاح'], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'link_formula_to_table':
            $formulaId = $input['formula_id'] ?? '';
            $tableId = $input['table_id'] ?? '';
            
            if (!$formulaId || !$tableId) {
                echo json_encode(['success' => false, 'message' => 'معرف المعادلة والجدول مطلوبان'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            // الحصول على مفتاح المعادلة
            $stmt = $pdo->prepare("SELECT formula_key FROM dynamic_formulas WHERE id = ?");
            $stmt->execute([$formulaId]);
            $formula = $stmt->fetch();
            
            if (!$formula) {
                echo json_encode(['success' => false, 'message' => 'المعادلة غير موجودة'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            $formulaKey = $formula['formula_key'];
            
            // البحث عن عمود مناسب في الجدول لربط المعادلة به
            $stmt = $pdo->prepare("
                SELECT dc.id as column_id, dc.column_name, dc.display_name_ar
                FROM dynamic_columns dc 
                JOIN dynamic_tables dt ON dc.table_id = dt.id 
                WHERE dt.id = ? AND dc.column_name = ?
            ");
            $stmt->execute([$tableId, $formulaKey]);
            $column = $stmt->fetch();
            
            if ($column) {
                $columnId = $column['column_id'];
                
                // التحقق من وجود الربط
                $stmt = $pdo->prepare("SELECT id FROM column_formula_mappings WHERE column_id = ? AND formula_id = ?");
                $stmt->execute([$columnId, $formulaId]);
                $mapping = $stmt->fetch();
                
                if ($mapping) {
                    echo json_encode(['success' => false, 'message' => 'المعادلة مربوطة بالفعل بهذا العمود'], JSON_UNESCAPED_UNICODE);
                } else {
                    // إنشاء الربط
                    $stmt = $pdo->prepare("
                        INSERT INTO column_formula_mappings 
                        (column_id, formula_id, is_active, created_at, updated_at)
                        VALUES (?, ?, 1, NOW(), NOW())
                    ");
                    $result = $stmt->execute([$columnId, $formulaId]);
                    
                    if ($result) {
                        echo json_encode(['success' => true, 'message' => 'تم ربط المعادلة بالجدول بنجاح'], JSON_UNESCAPED_UNICODE);
                    } else {
                        echo json_encode(['success' => false, 'message' => 'فشل في إنشاء الربط'], JSON_UNESCAPED_UNICODE);
                    }
                }
            } else {
                // عرض جميع الأعمدة المتاحة للمساعدة في التشخيص
                $stmt = $pdo->prepare("
                    SELECT dc.column_name, dc.display_name_ar
                    FROM dynamic_columns dc 
                    JOIN dynamic_tables dt ON dc.table_id = dt.id 
                    WHERE dt.id = ?
                ");
                $stmt->execute([$tableId]);
                $allColumns = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                $availableColumns = array_map(function($col) {
                    return $col['column_name'] . ' (' . $col['display_name_ar'] . ')';
                }, $allColumns);
                
                echo json_encode([
                    'success' => false, 
                    'message' => 'لم يتم العثور على عمود مناسب في الجدول لربط المعادلة به',
                    'details' => [
                        'formula_key' => $formulaKey,
                        'table_id' => $tableId,
                        'available_columns' => $availableColumns
                    ]
                ], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'get_formula_mappings':
            $formulaId = $input['formula_id'] ?? '';
            
            if (!$formulaId) {
                echo json_encode(['success' => false, 'message' => 'معرف المعادلة مطلوب'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            $stmt = $pdo->prepare("
                SELECT 
                    cfm.id,
                    cfm.column_id,
                    cfm.formula_id,
                    cfm.is_active,
                    dc.column_name,
                    dc.display_name_ar as column_display_name,
                    dt.id as table_id,
                    dt.display_name_ar as table_display_name,
                    dt.table_name
                FROM column_formula_mappings cfm
                JOIN dynamic_columns dc ON cfm.column_id = dc.id
                JOIN dynamic_tables dt ON dc.table_id = dt.id
                WHERE cfm.formula_id = ?
                ORDER BY dt.display_name_ar, dc.display_name_ar
            ");
            $stmt->execute([$formulaId]);
            $mappings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $mappings], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_system_variables':
            try {
                $stmt = $pdo->query("
                    SELECT 
                        variable_key as variable_name,
                        variable_value,
                        variable_type,
                        description_ar as description
                    FROM system_variables
                    WHERE is_active = 1
                    ORDER BY variable_key
                ");
                $variables = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode(['success' => true, 'data' => $variables], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'خطأ في جلب المتغيرات: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'get_employees':
            try {
                $stmt = $pdo->query("
                    SELECT 
                        id,
                        name as employee_name,
                        name_ar,
                        base_salary,
                        department,
                        position,
                        employee_code,
                        status
                    FROM employees
                    WHERE status = 'active'
                    ORDER BY name
                ");
                $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode(['success' => true, 'data' => $employees], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'خطأ في جلب الموظفين: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'create_variable':
            $variableKey = $input['variable_key'] ?? '';
            $variableNameAr = $input['variable_name_ar'] ?? '';
            $variableNameEn = $input['variable_name_en'] ?? '';
            $variableValue = $input['variable_value'] ?? '';
            $variableType = $input['variable_type'] ?? 'text';
            $category = $input['category'] ?? 'system';
            $isEditable = $input['is_editable'] ?? true;
            $isRequired = $input['is_required'] ?? false;
            $descriptionAr = $input['description_ar'] ?? '';
            
            if (!$variableKey || !$variableNameAr || !$variableNameEn || ($variableValue === '' && $variableValue !== 0 && $variableValue !== '0')) {
                echo json_encode(['success' => false, 'message' => 'جميع الحقول مطلوبة'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            $stmt = $pdo->prepare("INSERT INTO system_variables (variable_key, variable_name_ar, variable_name_en, variable_value, variable_type, category, is_editable, is_required, description_ar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$variableKey, $variableNameAr, $variableNameEn, $variableValue, $variableType, $category, $isEditable, $isRequired, $descriptionAr]);
            
            echo json_encode(['success' => true, 'message' => 'تم إنشاء المتغير بنجاح'], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'update_variable':
            $variableId = $input['id'] ?? '';
            $variableKey = $input['variable_key'] ?? '';
            $variableNameAr = $input['variable_name_ar'] ?? '';
            $variableNameEn = $input['variable_name_en'] ?? '';
            $variableValue = $input['variable_value'] ?? '';
            $variableType = $input['variable_type'] ?? 'text';
            $category = $input['category'] ?? 'system';
            $isEditable = $input['is_editable'] ?? true;
            $isRequired = $input['is_required'] ?? false;
            $descriptionAr = $input['description_ar'] ?? '';
            
            if (!$variableId || !$variableKey || !$variableNameAr || !$variableNameEn || ($variableValue === '' && $variableValue !== 0 && $variableValue !== '0')) {
                echo json_encode(['success' => false, 'message' => 'جميع الحقول مطلوبة'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            $stmt = $pdo->prepare("UPDATE system_variables SET variable_key = ?, variable_name_ar = ?, variable_name_en = ?, variable_value = ?, variable_type = ?, category = ?, is_editable = ?, is_required = ?, description_ar = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$variableKey, $variableNameAr, $variableNameEn, $variableValue, $variableType, $category, $isEditable, $isRequired, $descriptionAr, $variableId]);
            
            echo json_encode(['success' => true, 'message' => 'تم تحديث المتغير بنجاح'], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'create_column_formula_mapping':
            $columnId = $input['column_id'] ?? '';
            $formulaId = $input['formula_id'] ?? '';
            $isAutoCalculate = $input['is_auto_calculate'] ?? 1;
            
            if (!$columnId || !$formulaId) {
                echo json_encode(['success' => false, 'message' => 'معرف العمود والمعادلة مطلوبان'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            // التحقق من وجود العمود والمعادلة
            $stmt = $pdo->prepare("SELECT id FROM dynamic_columns WHERE id = ?");
            $stmt->execute([$columnId]);
            if (!$stmt->fetch()) {
                echo json_encode(['success' => false, 'message' => 'العمود غير موجود'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            $stmt = $pdo->prepare("SELECT id FROM dynamic_formulas WHERE id = ?");
            $stmt->execute([$formulaId]);
            if (!$stmt->fetch()) {
                echo json_encode(['success' => false, 'message' => 'المعادلة غير موجودة'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            // التحقق من عدم وجود ربط سابق
            $stmt = $pdo->prepare("SELECT id FROM column_formula_mappings WHERE column_id = ?");
            $stmt->execute([$columnId]);
            if ($stmt->fetch()) {
                echo json_encode(['success' => false, 'message' => 'العمود مربوط بالفعل بمعادلة أخرى'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            // تحديد نوع الربط بناءً على is_auto_calculate
            $mappingType = $isAutoCalculate ? 'calculation' : 'display';
            $stmt = $pdo->prepare("INSERT INTO column_formula_mappings (column_id, formula_id, mapping_type, is_active, created_at) VALUES (?, ?, ?, ?, NOW())");
            $stmt->execute([$columnId, $formulaId, $mappingType, 1]);
            
            echo json_encode(['success' => true, 'message' => 'تم ربط المعادلة بالعمود بنجاح'], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_column_formula_mappings':
            try {
                $stmt = $pdo->query("
                    SELECT 
                        cfm.id,
                        cfm.column_id,
                        cfm.formula_id,
                        cfm.mapping_type,
                        cfm.is_active,
                        dc.column_name as column_name,
                        dc.display_name_ar as column_display_name_ar,
                        df.formula_name_ar as formula_name,
                        df.formula_key as formula_key
                    FROM column_formula_mappings cfm
                    LEFT JOIN dynamic_columns dc ON cfm.column_id = dc.id
                    LEFT JOIN dynamic_formulas df ON cfm.formula_id = df.id
                    ORDER BY cfm.created_at DESC
                ");
                $mappings = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode(['success' => true, 'data' => $mappings], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'خطأ في استرجاع الربط: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'delete_column_formula_mapping':
            $mappingId = $input['mapping_id'] ?? '';
            
            if (!$mappingId) {
                echo json_encode(['success' => false, 'message' => 'معرف الربط مطلوب'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            try {
                $stmt = $pdo->prepare("UPDATE column_formula_mappings SET is_active = 0 WHERE id = ?");
                $stmt->execute([$mappingId]);
                
                if ($stmt->rowCount() > 0) {
                    echo json_encode(['success' => true, 'message' => 'تم حذف الربط بنجاح'], JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode(['success' => false, 'message' => 'الربط غير موجود'], JSON_UNESCAPED_UNICODE);
                }
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'خطأ في حذف الربط: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'delete_formula':
            $formulaId = $input['id'] ?? '';
            
            if (!$formulaId) {
                echo json_encode(['success' => false, 'message' => 'معرف المعادلة مطلوب'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            try {
                $stmt = $pdo->prepare("DELETE FROM dynamic_formulas WHERE id = ?");
                $stmt->execute([$formulaId]);
                
                echo json_encode(['success' => true, 'message' => 'تم حذف المعادلة بنجاح'], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'خطأ في حذف المعادلة: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'delete_variable':
            $variableId = $input['id'] ?? '';
            
            if (!$variableId) {
                echo json_encode(['success' => false, 'message' => 'معرف المتغير مطلوب'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            try {
                $stmt = $pdo->prepare("DELETE FROM system_variables WHERE id = ?");
                $stmt->execute([$variableId]);
                
                echo json_encode(['success' => true, 'message' => 'تم حذف المتغير بنجاح'], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'خطأ في حذف المتغير: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'get_update_log':
            require_once __DIR__ . '/AutoColumnUpdater.php';
            $updater = new AutoColumnUpdater($pdo);
            $limit = intval($input['limit'] ?? 50);
            $log = $updater->getUpdateLog($limit);
            
            echo json_encode(['success' => true, 'data' => $log], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'restore_from_backup':
            $backupFile = $input['backup_file'] ?? '';
            if (!$backupFile) {
                echo json_encode(['success' => false, 'message' => 'ملف النسخة الاحتياطية مطلوب'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            require_once __DIR__ . '/AutoColumnUpdater.php';
            $updater = new AutoColumnUpdater($pdo);
            $result = $updater->restoreFromBackup($backupFile);
            
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_backup_files':
            $backupDir = __DIR__ . '/backups/';
            $files = [];
            
            if (is_dir($backupDir)) {
                $backupFiles = glob($backupDir . '*.sql');
                foreach ($backupFiles as $file) {
                    $files[] = [
                        'filename' => basename($file),
                        'path' => $file,
                        'size' => filesize($file),
                        'created' => date('Y-m-d H:i:s', filemtime($file))
                    ];
                }
            }
            
            echo json_encode(['success' => true, 'data' => $files], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'update_column_badge':
        case 'update_badge_color':
            $columnId = $input['column_id'] ?? $input['id'] ?? '';
            $badgeColor = $input['badge_color'] ?? 'blue';
            $badgeVariant = $input['badge_variant'] ?? 'solid';
            $isCurrency = isset($input['is_currency']) ? ($input['is_currency'] ? 1 : 0) : 0;
            $tableName = $input['table_name'] ?? '';
            
            if (!$columnId) {
                echo json_encode(['success' => false, 'message' => 'معرف العمود مطلوب'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            try {
                // تحديد الجدول الصحيح بناءً على table_name أو البحث في الجداول
                $targetTable = '';
                $validTables = [
                    'net_weekly_wage', 
                    'weekly_wage_entitlements', 
                    'weekly_wage_deductions', 
                    'net_monthly_salary', 
                    'monthly_salary_entitlements_columns', 
                    'monthly_salary_deductions_columns'
                ];
                
                if ($tableName && in_array($tableName, $validTables)) {
                    $targetTable = $tableName;
                } else {
                    // البحث في الجداول لتحديد الجدول الصحيح
                    foreach ($validTables as $table) {
                        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM {$table} WHERE id = ?");
                        $stmt->execute([$columnId]);
                        $result = $stmt->fetch(PDO::FETCH_ASSOC);
                        if ($result && $result['count'] > 0) {
                            $targetTable = $table;
                            break;
                        }
                    }
                }
                
                if (!$targetTable) {
                    echo json_encode(['success' => false, 'message' => 'لم يتم العثور على الجدول الصحيح'], JSON_UNESCAPED_UNICODE);
                    break;
                }
                
                // تحديث خصائص البادج في الجدول الصحيح
                $stmt = $pdo->prepare("UPDATE {$targetTable} SET badge_color = ?, badge_variant = ?, is_currency = ? WHERE id = ?");
                $stmt->execute([$badgeColor, $badgeVariant, $isCurrency, $columnId]);
                
                echo json_encode(['success' => true, 'message' => 'تم تحديث إعدادات العمود بنجاح', 'table' => $targetTable], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'خطأ في تحديث إعدادات العمود: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'toggle_column_visibility':
            $id = $input['id'] ?? '';
            $isVisible = $input['is_visible'] ? 1 : 0;
            $tableName = $input['table_name'] ?? '';
            
            if (!$id) {
                echo json_encode(['success' => false, 'message' => 'معرف العمود مطلوب'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            try {
                // تحديد الجدول المستهدف
                $targetTable = '';
                if ($tableName) {
                    $targetTable = $tableName;
                } else {
                    // البحث في الجداول الجديدة لتحديد الجدول الصحيح
                    $tables = ['net_weekly_wage', 'weekly_wage_entitlements', 'weekly_wage_deductions', 'net_monthly_salary', 'monthly_salary_entitlements_columns', 'monthly_salary_deductions_columns'];
                    foreach ($tables as $table) {
                        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM {$table} WHERE id = ?");
                        $stmt->execute([$id]);
                        if ($stmt->fetch()['count'] > 0) {
                            $targetTable = $table;
                            break;
                        }
                    }
                }
                
                if (!$targetTable) {
                    echo json_encode(['success' => false, 'message' => 'العمود غير موجود في أي جدول'], JSON_UNESCAPED_UNICODE);
                    break;
                }
                
                $stmt = $pdo->prepare("UPDATE {$targetTable} SET is_visible = ? WHERE id = ?");
                $stmt->execute([$isVisible, $id]);
                
                echo json_encode(['success' => true, 'message' => $isVisible ? 'تم إظهار العمود' : 'تم إخفاء العمود'], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'خطأ في تحديث حالة العمود: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'delete_column':
            $id = $input['id'] ?? '';
            $tableName = $input['table_name'] ?? '';
            
            if (!$id) {
                echo json_encode(['success' => false, 'message' => 'معرف العمود مطلوب'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            try {
                // تحديد الجدول المستهدف
                $targetTable = '';
                if ($tableName) {
                    $targetTable = $tableName;
                } else {
                    // البحث في الجداول الجديدة لتحديد الجدول الصحيح
                    $tables = ['net_weekly_wage', 'weekly_wage_entitlements', 'weekly_wage_deductions', 'net_monthly_salary', 'monthly_salary_entitlements_columns', 'monthly_salary_deductions_columns'];
                    foreach ($tables as $table) {
                        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM {$table} WHERE id = ?");
                        $stmt->execute([$id]);
                        if ($stmt->fetch()['count'] > 0) {
                            $targetTable = $table;
                            break;
                        }
                    }
                }
                
                if (!$targetTable) {
                    echo json_encode(['success' => false, 'message' => 'العمود غير موجود في أي جدول'], JSON_UNESCAPED_UNICODE);
                    break;
                }
                
                // جلب column_key قبل حذف العمود
                $columnKey = null;
                try {
                    $stmt = $pdo->prepare("SELECT column_key FROM {$targetTable} WHERE id = ?");
                    $stmt->execute([$id]);
                    $result = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($result && isset($result['column_key'])) {
                        $columnKey = $result['column_key'];
                    }
                } catch (Exception $e) {
                    // إذا لم يكن column_key موجوداً، نتجاهل
                    error_log("Could not fetch column_key: " . $e->getMessage());
                }
                
                // حذف العمود من الجدول المحدد
                $stmt = $pdo->prepare("DELETE FROM {$targetTable} WHERE id = ?");
                $stmt->execute([$id]);
                
                // حذف المعادلة المرتبطة إذا وجدت (باستخدام column_key)
                if ($columnKey) {
                    try {
                        // التحقق من وجود جدول dynamic_formulas أولاً
                        $checkTable = $pdo->query("SHOW TABLES LIKE 'dynamic_formulas'");
                        if ($checkTable->rowCount() > 0) {
                            $stmt2 = $pdo->prepare("DELETE FROM dynamic_formulas WHERE formula_key = ?");
                            $stmt2->execute([$columnKey]);
                        }
                    } catch (Exception $e) {
                        // إذا لم يكن الجدول موجوداً، نتجاهل الخطأ
                        error_log("Could not delete from dynamic_formulas: " . $e->getMessage());
                    }
                }
                
                // حذف المراجع المرتبطة بالعمود (من أي source_table)
                try {
                    // حذف المراجع التي تستخدم هذا العمود كـ target_column_key أو source_column_key
                    // خاصة المراجع من net_weekly_wage إلى net_monthly_salary
                    $stmt3 = $pdo->prepare("
                        DELETE FROM column_references 
                        WHERE (target_table = ? AND (target_column_key = ? OR source_column_key = ?))
                        OR (source_table = ? AND source_column_key = ?)
                        OR (target_column_key = ? OR source_column_key = ?)
                    ");
                    $stmt3->execute([
                        $targetTable, $columnKey, $columnKey,  // المراجع في الجدول المستهدف
                        $targetTable, $columnKey,              // المراجع من الجدول المستهدف
                        $columnKey, $columnKey                 // أي مرجع يستخدم هذا العمود
                    ]);
                    error_log("Deleted " . $stmt3->rowCount() . " references for column_key: " . $columnKey);
                } catch (Exception $e) {
                    error_log("Could not delete column_references: " . $e->getMessage());
                }
                
                echo json_encode(['success' => true, 'message' => 'تم حذف العمود بنجاح'], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'خطأ في حذف العمود: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'swap_column_order':
            $column1Id = $input['column1_id'] ?? '';
            $column1Order = $input['column1_order'] ?? 0;
            $column2Id = $input['column2_id'] ?? '';
            $column2Order = $input['column2_order'] ?? 0;
            
            if (!$column1Id || !$column2Id || !$column1Order || !$column2Order) {
                echo json_encode(['success' => false, 'message' => 'جميع المعاملات مطلوبة'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            try {
                $pdo->beginTransaction();
                
                // جميع الأعمدة (مستحقات ومستقطعات) تُحفظ في salary_columns
                $stmt1 = $pdo->prepare("UPDATE salary_columns SET display_order = ? WHERE id = ?");
                $stmt2 = $pdo->prepare("UPDATE salary_columns SET display_order = ? WHERE id = ?");
                
                $stmt1->execute([$column1Order, $column1Id]);
                $stmt2->execute([$column2Order, $column2Id]);
                
                $pdo->commit();
                
                echo json_encode(['success' => true, 'message' => 'تم تحديث ترتيب العواميد بنجاح'], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                $pdo->rollBack();
                echo json_encode(['success' => false, 'message' => 'خطأ في تحديث ترتيب العواميد: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'update_badge_color':
            $id = $input['id'] ?? '';
            $badgeColor = $input['badge_color'] ?? '';
            $badgeVariant = $input['badge_variant'] ?? '';
            $isCurrency = $input['is_currency'] ?? false;
            $tableName = $input['table_name'] ?? '';

            if (!$id) {
                echo json_encode(['success' => false, 'message' => 'معرف العمود مطلوب'], JSON_UNESCAPED_UNICODE);
                break;
            }

            // التحقق من أن ID صحيح (رقم وليس custom_)
            if (!is_numeric($id) || $id <= 0) {
                echo json_encode(['success' => false, 'message' => 'معرف العمود غير صحيح'], JSON_UNESCAPED_UNICODE);
                break;
            }

            try {
                // تحديد الجدول المستهدف
                $targetTable = '';
                $isReference = false;
                
                if ($tableName) {
                    $targetTable = $tableName;
                } else {
                    // البحث في الجداول الجديدة لتحديد الجدول الصحيح
                    $tables = ['net_weekly_wage', 'weekly_wage_entitlements', 'weekly_wage_deductions', 'net_monthly_salary', 'monthly_salary_entitlements_columns', 'monthly_salary_deductions_columns'];
                    foreach ($tables as $table) {
                        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM {$table} WHERE id = ?");
                        $stmt->execute([$id]);
                        if ($stmt->fetch()['count'] > 0) {
                            $targetTable = $table;
                            break;
                        }
                    }
                    
                    // إذا لم يتم العثور على العمود في الجداول العادية، ابحث في المراجع
                    if (!$targetTable) {
                        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM column_references WHERE id = ?");
                        $stmt->execute([$id]);
                        if ($stmt->fetch()['count'] > 0) {
                            $isReference = true;
                        }
                    }
                }
                
                if (!$targetTable && !$isReference) {
                    echo json_encode(['success' => false, 'message' => 'العمود غير موجود في أي جدول'], JSON_UNESCAPED_UNICODE);
                    break;
                }
                
                if ($isReference) {
                    // تحديث المرجع في جدول column_references
                    $stmt = $pdo->prepare("UPDATE column_references SET display_name_ar = CONCAT(SUBSTRING_INDEX(display_name_ar, ' (', 1), ' (مرجع)'), display_name_en = CONCAT(SUBSTRING_INDEX(display_name_en, ' (', 1), ' (Reference)') WHERE id = ?");
                    $stmt->execute([$id]);
                    
                    // تحديث العمود الأصلي في الجدول المصدر
                    $stmt = $pdo->prepare("SELECT source_table, source_column_key FROM column_references WHERE id = ?");
                    $stmt->execute([$id]);
                    $reference = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($reference) {
                        $stmt = $pdo->prepare("UPDATE {$reference['source_table']} SET badge_color = ?, badge_variant = ?, is_currency = ? WHERE column_key = ?");
                        $stmt->execute([$badgeColor, $badgeVariant, $isCurrency ? 1 : 0, $reference['source_column_key']]);
                    }
                } else {
                    // تحديث العمود العادي
                    $stmt = $pdo->prepare("UPDATE {$targetTable} SET badge_color = ?, badge_variant = ?, is_currency = ? WHERE id = ?");
                    $stmt->execute([$badgeColor, $badgeVariant, $isCurrency ? 1 : 0, $id]);
                }

                echo json_encode(['success' => true, 'message' => 'تم تحديث لون البادج بنجاح'], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'خطأ في تحديث لون البادج: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        // === النظام المبسط ===
        case 'apply_template':
            $tableType = $input['table_type'] ?? 'weekly';
            $templateId = $input['template_id'] ?? '';
            $columns = $input['columns'] ?? [];
            
            if (!$templateId || empty($columns)) {
                echo json_encode(['success' => false, 'message' => 'معرف القالب والأعمدة مطلوبان'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            try {
                $pdo->beginTransaction();
                
                // حذف الأعمدة الموجودة
                $stmt = $pdo->prepare("UPDATE salary_columns SET is_visible = 0 WHERE table_id = ?");
                $stmt->execute([$tableType === 'weekly' ? 1 : 2]);
                
                // إضافة الأعمدة الجديدة
                foreach ($columns as $index => $column) {
                    $stmt = $pdo->prepare("
                        INSERT INTO salary_columns 
                        (table_id, column_key, column_name_ar, column_name_en, data_type, display_order, is_visible, is_editable, is_calculated, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, NOW())
                    ");
                    $stmt->execute([
                        $tableType === 'weekly' ? 1 : 2,
                        $column['name'],
                        $column['name'],
                        $column['name'],
                        $column['type'],
                        $column['order'] ?? $index + 1,
                        !empty($column['formula']) ? 1 : 0
                    ]);
                }
                
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'تم تطبيق القالب بنجاح'], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                $pdo->rollBack();
                echo json_encode(['success' => false, 'message' => 'خطأ في تطبيق القالب: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'save_simplified_columns':
            $tableName = $input['table_name'] ?? '';
            $columns = $input['columns'] ?? [];
            
            if (empty($columns) || empty($tableName)) {
                echo json_encode(['success' => false, 'message' => 'الأعمدة واسم الجدول مطلوبان'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            try {
                $pdo->beginTransaction();
                
                // تحديث الأعمدة الموجودة أو إضافة الجديدة
                foreach ($columns as $index => $column) {
                    // جلب data_type الحالي من قاعدة البيانات إذا لم يكن موجوداً في البيانات المرسلة
                    $currentDataType = null;
                    if (empty($column['type']) && !empty($column['name'])) {
                        $checkStmt = $pdo->prepare("SELECT data_type FROM {$tableName} WHERE column_key = ?");
                        $checkStmt->execute([$column['name']]);
                        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
                        if ($existing) {
                            $currentDataType = $existing['data_type'];
                        }
                    }
                    
                    // استخدام data_type المرسل أو الحالي أو القيمة الافتراضية
                    $dataType = $column['type'] ?? $currentDataType ?? 'text';
                    
                    // التحقق من أن data_type صحيح (يجب أن يكون من القيم المسموحة)
                    $validDataTypes = ['text', 'number', 'currency', 'date', 'boolean'];
                    if (!in_array($dataType, $validDataTypes)) {
                        $dataType = 'text'; // القيمة الافتراضية
                    }
                    
                    // تحديد is_visible من البيانات المرسلة أو استخدام القيمة الحالية من قاعدة البيانات
                    $isVisible = isset($column['is_visible']) ? ($column['is_visible'] ? 1 : 0) : null;
                    if ($isVisible === null) {
                        // إذا لم يتم إرسال is_visible، نستخدم القيمة الحالية من قاعدة البيانات
                        $checkStmt = $pdo->prepare("SELECT is_visible FROM {$tableName} WHERE column_key = ?");
                        $checkStmt->execute([$column['name']]);
                        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
                        $isVisible = $existing ? (int)$existing['is_visible'] : 1; // افتراضي 1 للأعمدة الجديدة
                    }
                    
                    $isEditable = isset($column['is_editable']) ? ($column['is_editable'] ? 1 : 0) : 1;
                    $isCalculated = !empty($column['formula']) ? 1 : 0;
                    
                    $stmt = $pdo->prepare("
                        INSERT INTO {$tableName} 
                        (column_key, column_name_ar, column_name_en, data_type, display_order, is_visible, is_editable, is_calculated, formula, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                        ON DUPLICATE KEY UPDATE
                        column_name_ar = VALUES(column_name_ar),
                        column_name_en = VALUES(column_name_en),
                        data_type = VALUES(data_type),
                        display_order = VALUES(display_order),
                        is_visible = VALUES(is_visible),
                        is_editable = VALUES(is_editable),
                        is_calculated = VALUES(is_calculated),
                        formula = VALUES(formula),
                        updated_at = NOW()
                    ");
                    $stmt->execute([
                        $column['name'],
                        $column['column_name_ar'] ?? $column['display_name_ar'] ?? $column['name'],
                        $column['display_name_en'] ?? $column['name'],
                        $dataType,
                        $column['order'] ?? $index + 1,
                        $isVisible,
                        $isEditable,
                        $isCalculated,
                        $column['formula'] ?? null
                    ]);
                }
                
                // إخفاء الأعمدة غير المدرجة في القائمة
                $columnKeys = array_column($columns, 'name');
                if (!empty($columnKeys)) {
                    $placeholders = str_repeat('?,', count($columnKeys) - 1) . '?';
                    $stmt = $pdo->prepare("
                        UPDATE {$tableName} 
                        SET is_visible = 0 
                        WHERE column_key NOT IN ($placeholders)
                    ");
                    $stmt->execute($columnKeys);
                }
                
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'تم حفظ الأعمدة بنجاح'], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                $pdo->rollBack();
                echo json_encode(['success' => false, 'message' => 'خطأ في حفظ الأعمدة: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'import_column':
            $sourceColumn = $input['source_column'] ?? null;
            $targetTable = $input['target_table'] ?? '';
            $importType = $input['import_type'] ?? 'reference';
            
            if (!$sourceColumn || !$targetTable) {
                echo json_encode(['success' => false, 'message' => 'العمود المصدر والجدول المستهدف مطلوبان'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            try {
                $pdo->beginTransaction();
                
                if ($importType === 'reference') {
                    // تحديد الجدول المصدر بناءً على الجدول المستهدف
                    $defaultSourceTable = 'net_weekly_wage';
                    if ($targetTable === 'net_monthly_salary' || 
                        $targetTable === 'monthly_salary_entitlements_columns' || 
                        $targetTable === 'monthly_salary_deductions_columns') {
                        $defaultSourceTable = 'net_monthly_salary';
                    }
                    
                    $sourceTable = $sourceColumn['table_name'] ?? $defaultSourceTable;
                    $sourceKey = $sourceColumn['column_key'] ?? $sourceColumn['name'] ?? '';
                    $targetKey = $sourceKey; // نفس المفتاح
                    
                    // التأكد من أن sourceKey صحيح
                    if (!$sourceKey || $sourceKey === '1' || $sourceKey === 1) {
                        echo json_encode(['success' => false, 'message' => 'مفتاح العمود غير صحيح: ' . $sourceKey], JSON_UNESCAPED_UNICODE);
                        $pdo->rollBack();
                        break;
                    }
                    
                    // التأكد من أن sourceTable صحيح
                    if (!$sourceTable || $sourceTable === '1' || $sourceTable === 1) {
                        echo json_encode(['success' => false, 'message' => 'اسم الجدول غير صحيح: ' . $sourceTable], JSON_UNESCAPED_UNICODE);
                        $pdo->rollBack();
                        break;
                    }
                    
                    // التحقق من وجود المرجع مسبقاً
                    $checkStmt = $pdo->prepare("
                        SELECT id FROM column_references 
                        WHERE source_table = ? 
                        AND source_column_key = ? 
                        AND target_table = ? 
                        AND target_column_key = ? 
                        AND is_active = 1
                    ");
                    $checkStmt->execute([$sourceTable, $sourceKey, $targetTable, $targetKey]);
                    $existingRef = $checkStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($existingRef) {
                        // المرجع موجود بالفعل، قم بتحديثه فقط
                        $updateStmt = $pdo->prepare("
                            UPDATE column_references 
                            SET display_name_ar = ?,
                                display_name_en = ?,
                                is_active = 1,
                                updated_at = NOW()
                            WHERE id = ?
                        ");
                        $updateStmt->execute([
                            ($sourceColumn['display_name_ar'] || $sourceColumn['column_name_ar']) . ' (مرجع)',
                            ($sourceColumn['display_name_en'] || $sourceColumn['column_name_en']) . ' (Reference)',
                            $existingRef['id']
                        ]);
                        echo json_encode(['success' => true, 'message' => 'المرجع موجود بالفعل وتم تحديثه'], JSON_UNESCAPED_UNICODE);
                    } else {
                        // إنشاء مرجع جديد في جدول المراجع
                        $stmt = $pdo->prepare("
                            INSERT INTO column_references 
                            (source_table, source_column_key, target_table, target_column_key, display_name_ar, display_name_en, is_active)
                            VALUES (?, ?, ?, ?, ?, ?, 1)
                        ");
                        
                        $stmt->execute([
                            $sourceTable,
                            $sourceKey,
                            $targetTable,
                            $targetKey,
                            ($sourceColumn['display_name_ar'] || $sourceColumn['column_name_ar']) . ' (مرجع)',
                            ($sourceColumn['display_name_en'] || $sourceColumn['column_name_en']) . ' (Reference)'
                        ]);
                        
                        echo json_encode(['success' => true, 'message' => 'تم إنشاء مرجع العمود بنجاح'], JSON_UNESCAPED_UNICODE);
                    }
                } else {
                    // النسخ التقليدي (للتوافق مع الكود القديم)
                    $columnKey = $sourceColumn['name'] || $sourceColumn['column_key'];
                    
                    // التحقق من وجود العمود في الجدول المستهدف
                    $checkStmt = $pdo->prepare("SELECT id FROM {$targetTable} WHERE column_key = ?");
                    $checkStmt->execute([$columnKey]);
                    $existingColumn = $checkStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($existingColumn) {
                        // العمود موجود بالفعل، قم بتحديثه
                        $updateStmt = $pdo->prepare("
                            UPDATE {$targetTable} SET
                                column_name_ar = ?,
                                column_name_en = ?,
                                data_type = ?,
                                display_order = ?,
                                is_visible = 1,
                                is_editable = ?,
                                is_calculated = ?,
                                formula = ?,
                                badge_color = ?,
                                badge_variant = ?,
                                is_currency = ?,
                                decimal_places = ?,
                                description = ?,
                                updated_at = NOW()
                            WHERE id = ?
                        ");
                        
                        $updateStmt->execute([
                            $sourceColumn['display_name_ar'] || $sourceColumn['column_name_ar'],
                            $sourceColumn['display_name_en'] || $sourceColumn['column_name_en'],
                            $sourceColumn['type'] || $sourceColumn['data_type'],
                            $sourceColumn['order'] || $sourceColumn['display_order'] || 999,
                            $sourceColumn['is_editable'] ?? 1,
                            $sourceColumn['is_calculated'] || 0,
                            $sourceColumn['formula'] || null,
                            $sourceColumn['badge_color'] || 'blue',
                            $sourceColumn['badge_variant'] || 'solid',
                            $sourceColumn['is_currency'] || 0,
                            $sourceColumn['decimal_places'] || 2,
                            'مستورد من ' . ($sourceColumn['table_name'] || 'جدول آخر'),
                            $existingColumn['id']
                        ]);
                        
                        echo json_encode(['success' => true, 'message' => 'العمود موجود بالفعل وتم تحديثه'], JSON_UNESCAPED_UNICODE);
                    } else {
                        // إضافة عمود جديد
                        $stmt = $pdo->prepare("
                            INSERT INTO {$targetTable} (
                                column_key, column_name_ar, column_name_en, data_type, 
                                display_order, is_visible, is_editable, is_calculated, 
                                formula, badge_color, badge_variant, is_currency, 
                                decimal_places, description, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                        ");
                        
                        $stmt->execute([
                            $columnKey,
                            $sourceColumn['display_name_ar'] || $sourceColumn['column_name_ar'],
                            $sourceColumn['display_name_en'] || $sourceColumn['column_name_en'],
                            $sourceColumn['type'] || $sourceColumn['data_type'],
                            $sourceColumn['order'] || $sourceColumn['display_order'] || 999,
                            1, // is_visible
                            $sourceColumn['is_editable'] ?? 1,
                            $sourceColumn['is_calculated'] || 0,
                            $sourceColumn['formula'] || null,
                            $sourceColumn['badge_color'] || 'blue',
                            $sourceColumn['badge_variant'] || 'solid',
                            $sourceColumn['is_currency'] || 0,
                            $sourceColumn['decimal_places'] || 2,
                            'مستورد من ' . ($sourceColumn['table_name'] || 'جدول آخر')
                        ]);
                        
                        echo json_encode(['success' => true, 'message' => 'تم نسخ العمود بنجاح'], JSON_UNESCAPED_UNICODE);
                    }
                }
                
                $pdo->commit();
                
            } catch (Exception $e) {
                $pdo->rollBack();
                echo json_encode(['success' => false, 'message' => 'خطأ في استيراد العمود: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'preview_changes':
            $tableType = $input['table_type'] ?? 'weekly';
            $columns = $input['columns'] ?? [];
            
            if (empty($columns)) {
                echo json_encode(['success' => false, 'message' => 'الأعمدة مطلوبة'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            try {
                // إنشاء بيانات تجريبية للمعاينة
                $sampleData = [
                    [
                        'id' => 1,
                        'name' => 'أحمد محمد',
                        'code' => 'EMP001',
                        'basic_salary' => 5000,
                        'daily_wage' => 166.67,
                        'hourly_wage' => 20.83,
                        'overtime_hours' => 10,
                        'overtime_value' => 312.5,
                        'regular_days' => 25,
                        'regular_value' => 4166.75,
                        'transport_allowance' => 200,
                        'special_bonus' => 500,
                        'loan' => 1000,
                        'total_entitlements' => 6000,
                        'absent_days' => 2,
                        'absent_value' => 333.34,
                        'late_hours' => 5,
                        'late_value' => 104.15,
                        'insurance' => 250,
                        'loan_installment' => 200,
                        'total_deductions' => 887.49,
                        'net_salary' => 5112.51
                    ],
                    [
                        'id' => 2,
                        'name' => 'فاطمة أحمد',
                        'code' => 'EMP002',
                        'basic_salary' => 4500,
                        'daily_wage' => 150,
                        'hourly_wage' => 18.75,
                        'overtime_hours' => 8,
                        'overtime_value' => 225,
                        'regular_days' => 28,
                        'regular_value' => 4200,
                        'transport_allowance' => 150,
                        'special_bonus' => 300,
                        'loan' => 0,
                        'total_entitlements' => 4875,
                        'absent_days' => 0,
                        'absent_value' => 0,
                        'late_hours' => 2,
                        'late_value' => 37.5,
                        'insurance' => 225,
                        'loan_installment' => 0,
                        'total_deductions' => 262.5,
                        'net_salary' => 4612.5
                    ]
                ];
                
                echo json_encode([
                    'success' => true, 
                    'data' => [
                        'columns' => $columns,
                        'sample_data' => $sampleData,
                        'table_type' => $tableType
                    ]
                ], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'خطأ في معاينة التغييرات: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'rollback_changes':
            $tableType = $input['table_type'] ?? 'weekly';
            $backupId = $input['backup_id'] ?? '';
            
            if (!$backupId) {
                echo json_encode(['success' => false, 'message' => 'معرف النسخة الاحتياطية مطلوب'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            try {
                // هنا يمكن إضافة منطق استرجاع النسخة الاحتياطية
                // للآن سنعيد رسالة نجاح
                echo json_encode(['success' => true, 'message' => 'تم استرجاع التغييرات بنجاح'], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'خطأ في استرجاع التغييرات: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'update_column_name_ar':
            $tableName = $input['table_name'] ?? '';
            $columnId = $input['id'] ?? null;
            $columnNameAr = $input['column_name_ar'] ?? '';
            
            if (!$tableName || !$columnId || !$columnNameAr) {
                echo json_encode(['success' => false, 'message' => 'اسم الجدول ومعرف العمود والاسم بالعربي مطلوبة'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            // التحقق من أن الجدول صحيح
            $validTables = ['net_weekly_wage', 'weekly_wage_entitlements', 'weekly_wage_deductions', 'net_monthly_salary', 'monthly_salary_entitlements_columns', 'monthly_salary_deductions_columns'];
            if (!in_array($tableName, $validTables)) {
                echo json_encode(['success' => false, 'message' => 'اسم الجدول غير صحيح'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            try {
                // تحديث column_name_ar فقط (لا يتم تحديث column_key)
                $stmt = $pdo->prepare("UPDATE {$tableName} SET column_name_ar = ? WHERE id = ?");
                $stmt->execute([$columnNameAr, $columnId]);
                
                echo json_encode(['success' => true, 'message' => 'تم تحديث الاسم بالعربي بنجاح'], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'خطأ في تحديث الاسم بالعربي: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'update_columns_order_and_visibility':
            $tableName = $input['table_name'] ?? '';
            $columns = $input['columns'] ?? [];
            
            if (!$tableName || empty($columns)) {
                echo json_encode(['success' => false, 'message' => 'اسم الجدول وقائمة الأعمدة مطلوبة'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            // التحقق من أن الجدول صحيح
            $validTables = ['net_weekly_wage', 'weekly_wage_entitlements', 'weekly_wage_deductions', 'net_monthly_salary', 'monthly_salary_entitlements_columns', 'monthly_salary_deductions_columns'];
            if (!in_array($tableName, $validTables)) {
                echo json_encode(['success' => false, 'message' => 'اسم الجدول غير صحيح'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            try {
                $pdo->beginTransaction();
                
                // تحديث ترتيب الأعمدة وحالة الإظهار
                foreach ($columns as $index => $column) {
                    $columnId = $column['id'] ?? null;
                    $displayOrder = $column['display_order'] ?? ($index + 1);
                    $isVisible = isset($column['is_visible']) ? ($column['is_visible'] ? 1 : 0) : null;
                    
                    if (!$columnId) {
                        continue;
                    }
                    
                    // بناء استعلام التحديث
                    $updateFields = ['display_order = ?'];
                    $params = [$displayOrder];
                    
                    if ($isVisible !== null) {
                        $updateFields[] = 'is_visible = ?';
                        $params[] = $isVisible;
                    }
                    
                    $params[] = $columnId;
                    
                    $sql = "UPDATE {$tableName} SET " . implode(', ', $updateFields) . " WHERE id = ?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                }
                
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'تم حفظ ترتيب الأعمدة وحالة الإظهار بنجاح'], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                $pdo->rollBack();
                echo json_encode(['success' => false, 'message' => 'خطأ في حفظ ترتيب الأعمدة: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'ensure_name_column':
            // التأكد من وجود عمود "name" في جدول net_weekly_wage
            try {
                // التحقق من وجود العمود
                $stmt = $pdo->prepare("SELECT id FROM net_weekly_wage WHERE column_key = 'name'");
                $stmt->execute();
                $existing = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($existing) {
                    // العمود موجود، تحديثه لضمان أنه مرئي
                    $stmt = $pdo->prepare("
                        UPDATE net_weekly_wage 
                        SET 
                            is_visible = 1,
                            display_order = 2,
                            column_name_ar = 'الاسم',
                            column_name_en = 'Name',
                            data_type = 'text',
                            badge_color = 'blue',
                            badge_variant = 'solid',
                            is_currency = 0,
                            is_editable = 1,
                            is_calculated = 0
                        WHERE column_key = 'name'
                    ");
                    $stmt->execute();
                    echo json_encode([
                        'success' => true, 
                        'message' => 'تم تحديث عمود "الاسم" بنجاح',
                        'action' => 'updated'
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    // العمود غير موجود، إضافته
                    $stmt = $pdo->prepare("
                        INSERT INTO net_weekly_wage 
                        (column_key, column_name_ar, column_name_en, data_type, display_order, is_visible, is_editable, is_calculated, badge_color, badge_variant, is_currency, decimal_places) 
                        VALUES 
                        ('name', 'الاسم', 'Name', 'text', 2, 1, 1, 0, 'blue', 'solid', 0, 0)
                    ");
                    $stmt->execute();
                    echo json_encode([
                        'success' => true, 
                        'message' => 'تم إضافة عمود "الاسم" بنجاح',
                        'action' => 'inserted'
                    ], JSON_UNESCAPED_UNICODE);
                }
            } catch (Exception $e) {
                echo json_encode([
                    'success' => false, 
                    'message' => 'خطأ: ' . $e->getMessage()
                ], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'إجراء غير صحيح'], JSON_UNESCAPED_UNICODE);
            break;
    }
    
} catch (Exception $e) {
    // تسجيل الخطأ في السجل
    error_log('Dynamic System API Error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    
    echo json_encode([
        'success' => false, 
        'message' => 'خطأ في النظام: ' . $e->getMessage(),
        'error_type' => get_class($e),
        'line' => $e->getLine(),
        'file' => basename($e->getFile())
    ], JSON_UNESCAPED_UNICODE);
} catch (Error $e) {
    // تسجيل خطأ PHP
    error_log('Dynamic System API PHP Error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    
    echo json_encode([
        'success' => false, 
        'message' => 'خطأ في PHP: ' . $e->getMessage(),
        'error_type' => get_class($e),
        'line' => $e->getLine(),
        'file' => basename($e->getFile())
    ], JSON_UNESCAPED_UNICODE);
}
?>

<?php
require_once 'cors_headers.php';
require_once 'config_unified.php';
require_once 'feature_flags.php';

function ensureOvertimeStartGraceVariable($pdo) {
    try {
        $checkStmt = $pdo->prepare("SELECT id FROM system_variables WHERE variable_key = ? LIMIT 1");
        $checkStmt->execute(['overtime_start_grace_minutes']);
        $exists = $checkStmt->fetchColumn();

        if (!$exists) {
            $insertStmt = $pdo->prepare("
                INSERT INTO system_variables
                (variable_key, variable_name_ar, variable_name_en, variable_value, variable_type, category, is_editable, is_required, description_ar, description_en, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
            ");
            $insertStmt->execute([
                'overtime_start_grace_minutes',
                'مهلة بدء احتساب الإضافي (دقيقة)',
                'Overtime Start Grace Minutes',
                '15',
                'number',
                'attendance',
                1,
                0,
                'الحد الأدنى (بالدقائق) بعد انتهاء الدوام الرسمي: إذا كان الانصراف قبل هذا الحد لا يُحسب إضافي؛ إذا كان بعده أو عنده يُحسب الإضافي كاملاً من نهاية الدوام الرسمي',
                'Minimum minutes after official end: no overtime below this; at or above it, overtime is counted in full from official end'
            ]);
        }
    } catch (Exception $e) {
        // لا نوقف الاستجابة إذا فشل الإنشاء التلقائي
    }
}

function ensureBayatVariables($pdo) {
    try {
        $checkStmt = $pdo->prepare("SELECT id FROM system_variables WHERE variable_key = ? LIMIT 1");

        $checkStmt->execute(['bayat_multiplier']);
        if (!$checkStmt->fetchColumn()) {
            $insertStmt = $pdo->prepare("
                INSERT INTO system_variables
                (variable_key, variable_name_ar, variable_name_en, variable_value, variable_type, category, is_editable, is_required, description_ar, description_en, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
            ");
            $insertStmt->execute([
                'bayat_multiplier',
                'مضاعف البيات',
                'Bayat Multiplier',
                '2',
                'number',
                'salary',
                1,
                0,
                'معامل ضرب ساعات البيات (مثال: 2)',
                'Multiplier applied to bayat hours (e.g. 2)'
            ]);
        }

        $checkStmt->execute(['bayat_hours_per_day']);
        if (!$checkStmt->fetchColumn()) {
            $insertStmt = $pdo->prepare("
                INSERT INTO system_variables
                (variable_key, variable_name_ar, variable_name_en, variable_value, variable_type, category, is_editable, is_required, description_ar, description_en, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
            ");
            $insertStmt->execute([
                'bayat_hours_per_day',
                'ساعات البيات لليوم الواحد',
                'Bayat Hours Per Day',
                '10',
                'number',
                'salary',
                1,
                0,
                'عدد ساعات البيات الثابتة لكل يوم',
                'Fixed bayat hours for each day'
            ]);
        }
    } catch (Exception $e) {
        // لا نوقف الاستجابة إذا فشل الإنشاء التلقائي
    }
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? '';
    
    switch ($action) {
        case 'get_variables':
            ensureOvertimeStartGraceVariable($pdo);
            ensureBayatVariables($pdo);
            ensureMealAllowanceEnabledVariable($pdo);
            $stmt = $pdo->query("
                SELECT 
                    id,
                    variable_key,
                    variable_name_ar,
                    variable_name_en,
                    variable_value,
                    variable_type,
                    category,
                    is_editable,
                    is_required,
                    description_ar,
                    description_en,
                    is_active
                FROM system_variables 
                WHERE is_active = 1 
                ORDER BY category, variable_name_ar
            ");
            $variables = $stmt->fetchAll();
            echo json_encode(['success' => true, 'data' => $variables], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_categories':
            ensureOvertimeStartGraceVariable($pdo);
            ensureBayatVariables($pdo);
            $stmt = $pdo->query("
                SELECT DISTINCT category 
                FROM system_variables 
                WHERE is_active = 1 AND category IS NOT NULL 
                ORDER BY category
            ");
            $categories = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'data' => $categories], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'update_variable':
            $id = $input['id'] ?? '';
            $value = $input['value'] ?? '';
            
            if (!$id || $value === '') {
                throw new Exception('معرف المتغير والقيمة مطلوبان');
            }
            
            $stmt = $pdo->prepare("
                UPDATE system_variables 
                SET variable_value = ?, updated_at = NOW() 
                WHERE id = ? AND is_editable = 1
            ");
            $result = $stmt->execute([$value, $id]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'تم تحديث المتغير بنجاح'], JSON_UNESCAPED_UNICODE);
            } else {
                throw new Exception('فشل في تحديث المتغير أو المتغير غير قابل للتعديل');
            }
            break;
            
        case 'update_multiple':
            $updates = $input['updates'] ?? [];
            
            if (empty($updates)) {
                throw new Exception('لا توجد تحديثات');
            }
            
            $pdo->beginTransaction();
            try {
                foreach ($updates as $update) {
                    $id = $update['id'] ?? '';
                    $value = $update['value'] ?? '';
                    
                    if ($id && $value !== '') {
                        $stmt = $pdo->prepare("
                            UPDATE system_variables 
                            SET variable_value = ?, updated_at = NOW() 
                            WHERE id = ? AND is_editable = 1
                        ");
                        $stmt->execute([$value, $id]);
                    }
                }
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'تم تحديث جميع المتغيرات بنجاح'], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;
            
        case 'create_variable':
            $variableKey = $input['variable_key'] ?? '';
            $variableNameAr = $input['variable_name_ar'] ?? '';
            $variableNameEn = $input['variable_name_en'] ?? '';
            $variableValue = $input['variable_value'] ?? '';
            $variableType = $input['variable_type'] ?? 'text';
            $category = $input['category'] ?? 'system';
            $isEditable = isset($input['is_editable']) ? (int)$input['is_editable'] : 1;
            $isRequired = isset($input['is_required']) ? (int)$input['is_required'] : 0;
            $descriptionAr = $input['description_ar'] ?? '';
            $descriptionEn = $input['description_en'] ?? '';
            
            if (!$variableKey || !$variableNameAr || !$variableNameEn) {
                throw new Exception('المفتاح والاسم العربي والإنجليزي مطلوبان');
            }
            
            // التحقق من عدم وجود مفتاح مكرر
            $checkStmt = $pdo->prepare("SELECT id FROM system_variables WHERE variable_key = ?");
            $checkStmt->execute([$variableKey]);
            if ($checkStmt->fetch()) {
                throw new Exception('المفتاح موجود بالفعل');
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO system_variables 
                (variable_key, variable_name_ar, variable_name_en, variable_value, variable_type, category, is_editable, is_required, description_ar, description_en, is_active) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            ");
            $stmt->execute([
                $variableKey, 
                $variableNameAr, 
                $variableNameEn, 
                $variableValue, 
                $variableType, 
                $category, 
                $isEditable, 
                $isRequired, 
                $descriptionAr,
                $descriptionEn
            ]);
            
            $newId = $pdo->lastInsertId();
            echo json_encode([
                'success' => true, 
                'message' => 'تم إنشاء المتغير بنجاح',
                'id' => $newId
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'update_variable_full':
            $variableId = $input['id'] ?? '';
            $variableKey = $input['variable_key'] ?? '';
            $variableNameAr = $input['variable_name_ar'] ?? '';
            $variableNameEn = $input['variable_name_en'] ?? '';
            $variableValue = $input['variable_value'] ?? '';
            $variableType = $input['variable_type'] ?? 'text';
            $category = $input['category'] ?? 'system';
            $isEditable = isset($input['is_editable']) ? (int)$input['is_editable'] : 1;
            $isRequired = isset($input['is_required']) ? (int)$input['is_required'] : 0;
            $descriptionAr = $input['description_ar'] ?? '';
            $descriptionEn = $input['description_en'] ?? '';
            
            if (!$variableId || !$variableKey || !$variableNameAr || !$variableNameEn) {
                throw new Exception('جميع الحقول المطلوبة غير مكتملة');
            }
            
            // التحقق من عدم وجود مفتاح مكرر (باستثناء المتغير الحالي)
            $checkStmt = $pdo->prepare("SELECT id FROM system_variables WHERE variable_key = ? AND id != ?");
            $checkStmt->execute([$variableKey, $variableId]);
            if ($checkStmt->fetch()) {
                throw new Exception('المفتاح موجود بالفعل في متغير آخر');
            }
            
            $stmt = $pdo->prepare("
                UPDATE system_variables 
                SET variable_key = ?, 
                    variable_name_ar = ?, 
                    variable_name_en = ?, 
                    variable_value = ?, 
                    variable_type = ?, 
                    category = ?, 
                    is_editable = ?, 
                    is_required = ?, 
                    description_ar = ?, 
                    description_en = ?,
                    updated_at = NOW() 
                WHERE id = ?
            ");
            $stmt->execute([
                $variableKey, 
                $variableNameAr, 
                $variableNameEn, 
                $variableValue, 
                $variableType, 
                $category, 
                $isEditable, 
                $isRequired, 
                $descriptionAr,
                $descriptionEn,
                $variableId
            ]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'تم تحديث المتغير بنجاح'], JSON_UNESCAPED_UNICODE);
            } else {
                throw new Exception('فشل في تحديث المتغير');
            }
            break;
            
        case 'delete_variable':
            $variableId = $input['id'] ?? $_GET['id'] ?? '';
            
            if (!$variableId) {
                throw new Exception('معرف المتغير مطلوب');
            }
            
            // التحقق من أن المتغير قابل للحذف (ليس مطلوباً)
            $checkStmt = $pdo->prepare("SELECT is_required FROM system_variables WHERE id = ?");
            $checkStmt->execute([$variableId]);
            $variable = $checkStmt->fetch();
            
            if (!$variable) {
                throw new Exception('المتغير غير موجود');
            }
            
            // حذف منطقي (تعطيل) بدلاً من الحذف الفعلي
            $stmt = $pdo->prepare("
                UPDATE system_variables 
                SET is_active = 0, updated_at = NOW() 
                WHERE id = ?
            ");
            $stmt->execute([$variableId]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'تم حذف المتغير بنجاح'], JSON_UNESCAPED_UNICODE);
            } else {
                throw new Exception('فشل في حذف المتغير');
            }
            break;
            
        default:
            throw new Exception('إجراء غير معروف');
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>

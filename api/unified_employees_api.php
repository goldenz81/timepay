<?php
require_once 'cors_headers.php';
require_once 'config_unified.php';
require_once __DIR__ . '/employee_cleanup_helpers.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? '';
    
    switch ($action) {
        case 'get_employees':
            $stmt = $pdo->query("
                SELECT e.*, 
                       e.`AC-No.` as `AC-No.`,
                       d.name as department_name,
                       d.description as department_description
                FROM employees e
                LEFT JOIN departments d ON e.department = d.name
                ORDER BY e.name
            ");
            $employees = $stmt->fetchAll();
            echo json_encode(['success' => true, 'data' => $employees], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_departments':
            $stmt = $pdo->query("SELECT id, name, description FROM departments WHERE status = 'active' ORDER BY name");
            $departments = $stmt->fetchAll();
            echo json_encode(['success' => true, 'data' => $departments], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_cost_centers':
            $stmt = $pdo->query("SELECT id, name, description, status FROM cost_centers WHERE status = 'active' ORDER BY name");
            $costCenters = $stmt->fetchAll();
            echo json_encode(['success' => true, 'data' => $costCenters], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_cost_centers_by_department':
            $departmentName = $input['department'] ?? $_GET['department'] ?? '';
            if (!$departmentName) {
                throw new Exception('اسم القسم مطلوب');
            }
            
            // الحصول على معرف القسم أولاً
            $stmt = $pdo->prepare("SELECT id FROM departments WHERE name = ? AND status = 'active'");
            $stmt->execute([$departmentName]);
            $department = $stmt->fetch();
            
            if ($department && $department['id']) {
                // البحث عن مراكز التكلفة المرتبطة بالقسم باستخدام department_id
                $stmt = $pdo->prepare("
                    SELECT id, name, description, color, status 
                    FROM cost_centers 
                    WHERE department_id = ? AND status = 'active' 
                    ORDER BY name
                ");
                $stmt->execute([$department['id']]);
                $costCenters = $stmt->fetchAll();
            } else {
                // إذا لم يتم العثور على القسم، إرجاع قائمة فارغة
                $costCenters = [];
            }
            
            echo json_encode(['success' => true, 'data' => $costCenters], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'generate_employee_code':
            // الحصول على آخر كود موظف - البحث عن أعلى رقم في employee_code
            $stmt = $pdo->query("SELECT employee_code FROM employees WHERE employee_code IS NOT NULL AND employee_code != '' ORDER BY CAST(employee_code AS UNSIGNED) DESC LIMIT 1");
            $lastEmployee = $stmt->fetch();
            
            if ($lastEmployee && $lastEmployee['employee_code']) {
                // استخراج الرقم من آخر كود (مثل 1, 2, 100000)
                $lastCode = $lastEmployee['employee_code'];
                if (is_numeric($lastCode)) {
                    $nextNumber = intval($lastCode) + 1;
                } else {
                    // إذا كان الكود ليس رقماً، ابحث عن أعلى رقم
                    $stmt = $pdo->query("SELECT MAX(CAST(employee_code AS UNSIGNED)) as max_code FROM employees WHERE employee_code REGEXP '^[0-9]+$'");
                    $maxResult = $stmt->fetch();
                    $nextNumber = ($maxResult['max_code'] ? intval($maxResult['max_code']) : 0) + 1;
                }
            } else {
                $nextNumber = 1;
            }
            
            // توليد الكود الجديد (رقم فقط)
            $newCode = strval($nextNumber);
            
            echo json_encode(['success' => true, 'employee_code' => $newCode], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_employee':
            $employeeId = $input['employee_id'] ?? $_GET['employee_id'] ?? '';
            if (!$employeeId) {
                throw new Exception('معرف الموظف مطلوب');
            }
            
            $stmt = $pdo->prepare("
                SELECT e.*, d.description as department_description 
                FROM employees e 
                LEFT JOIN departments d ON e.department = d.name 
                WHERE e.id = ?
            ");
            $stmt->execute([$employeeId]);
            $employee = $stmt->fetch();
            
            if (!$employee) {
                throw new Exception('الموظف غير موجود');
            }
            
            echo json_encode(['success' => true, 'data' => $employee], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'add_employee':
            $data = $input['employee_data'] ?? [];
            error_log('Adding employee with data: ' . json_encode($data));
            error_log('Cost center value: ' . ($data['cost_center'] ?? 'NULL'));
            error_log('Department value: ' . ($data['department'] ?? 'NULL'));
            
            $requiredFields = ['employee_code', 'name', 'base_salary'];
            
            foreach ($requiredFields as $field) {
                if (empty($data[$field])) {
                    throw new Exception("الحقل $field مطلوب");
                }
            }

            $newAcNo = trim((string) ($data['AC-No.'] ?? ''));
            if ($newAcNo !== '') {
                $acCheck = $pdo->prepare("SELECT name_ar, name FROM employees WHERE TRIM(CAST(`AC-No.` AS CHAR)) = ? LIMIT 1");
                $acCheck->execute([$newAcNo]);
                $acOwner = $acCheck->fetch(PDO::FETCH_ASSOC);
                if ($acOwner) {
                    $ownerName = $acOwner['name_ar'] ?: $acOwner['name'];
                    throw new Exception("DUPLICATE_FINGERPRINT: كود البصمة \"$newAcNo\" مستخدم بالفعل للموظف \"$ownerName\".");
                }
            }
            
            try {
                // التحقق من وجود الحقل discrimination_incentive_allowance في الجدول
                $checkColumn = $pdo->query("SHOW COLUMNS FROM employees LIKE 'discrimination_incentive_allowance'");
                $columnExists = $checkColumn->rowCount() > 0;
                
                if ($columnExists) {
                    $stmt = $pdo->prepare("
                        INSERT INTO employees 
                        (employee_code, `AC-No.`, name, name_ar, base_salary, salary_type, cost_center, 
                         is_insured, location, department, position, hire_date, discrimination_incentive_allowance)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    
                    $stmt->execute([
                        $data['employee_code'],
                        $data['AC-No.'] ?? null, // كود البصمة
                        $data['name'], // الأسماء الإنجليزية (من جهاز البصمة)
                        $data['name_ar'] ?? null, // الأسماء العربية
                        $data['base_salary'],
                        $data['salary_type'] ?? 'Monthly',
                        $data['cost_center'] ?? null,
                        ($data['is_insured'] === true || $data['is_insured'] === 'true' || $data['is_insured'] === 1 || $data['is_insured'] === '1') ? 1 : 0,
                        $data['location'] ?? null,
                        $data['department'] ?? null,
                        $data['position'] ?? null,
                        $data['hire_date'] ?? date('Y-m-d'),
                        $data['discrimination_incentive_allowance'] ?? 0
                    ]);
                } else {
                    $stmt = $pdo->prepare("
                        INSERT INTO employees 
                        (employee_code, `AC-No.`, name, name_ar, base_salary, salary_type, cost_center, 
                         is_insured, location, department, position, hire_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    
                    $stmt->execute([
                        $data['employee_code'],
                        $data['AC-No.'] ?? null, // كود البصمة
                        $data['name'], // الأسماء الإنجليزية (من جهاز البصمة)
                        $data['name_ar'] ?? null, // الأسماء العربية
                        $data['base_salary'],
                        $data['salary_type'] ?? 'Monthly',
                        $data['cost_center'] ?? null,
                        ($data['is_insured'] === true || $data['is_insured'] === 'true' || $data['is_insured'] === 1 || $data['is_insured'] === '1') ? 1 : 0,
                        $data['location'] ?? null,
                        $data['department'] ?? null,
                        $data['position'] ?? null,
                        $data['hire_date'] ?? date('Y-m-d')
                    ]);
                }
                
                echo json_encode(['success' => true, 'message' => 'تم إضافة الموظف بنجاح'], JSON_UNESCAPED_UNICODE);
            } catch (PDOException $e) {
                // التحقق من خطأ التكرار في employee_code
                if ($e->getCode() == 23000 && strpos($e->getMessage(), 'employee_code') !== false) {
                    // الحصول على employee_code الذي تم محاولة إدخاله
                    $duplicateCode = $data['employee_code'] ?? null;
                    
                    if ($duplicateCode) {
                        // البحث عن الموظف الذي يستخدم هذا الكود
                        $checkStmt = $pdo->prepare("SELECT name_ar, name FROM employees WHERE employee_code = ?");
                        $checkStmt->execute([$duplicateCode]);
                        $existingEmployee = $checkStmt->fetch(PDO::FETCH_ASSOC);
                        
                        if ($existingEmployee) {
                            $employeeName = $existingEmployee['name_ar'] ?: $existingEmployee['name'];
                            throw new Exception("DUPLICATE_CODE: هذا الرقم مستخدم للموظف \"$employeeName\". برجاء اختيار رقم آخر أو اضغط على زر \"توليد كود جديد\" للحصول على رقم متاح غير مستخدم.");
                        } else {
                            throw new Exception("DUPLICATE_CODE: هذا الرقم مستخدم بالفعل. برجاء اختيار رقم آخر أو اضغط على زر \"توليد كود جديد\" للحصول على رقم متاح غير مستخدم.");
                        }
                    } else {
                        throw new Exception("DUPLICATE_CODE: هذا الرقم مستخدم بالفعل. برجاء اختيار رقم آخر أو اضغط على زر \"توليد كود جديد\" للحصول على رقم متاح غير مستخدم.");
                    }
                }
                throw $e;
            }
            break;
            
        case 'update_employee':
            $employeeId = $input['employee_id'] ?? '';
            $data = $input['employee_data'] ?? [];
            
            // Debug logging
            error_log('Update employee data received: ' . json_encode($data));
            error_log('AC-No. value: ' . ($data['AC-No.'] ?? 'NOT SET'));
            error_log('All keys in data: ' . implode(', ', array_keys($data)));
            
            if (!$employeeId) {
                throw new Exception('معرف الموظف مطلوب');
            }
            
            // جلب القيم الحالية للموظف لتجنب تحديث employee_code و AC-No. إذا لم يتغيرا (يمنع خطأ التكرار عند تغيير حقل آخر فقط مثل مؤمن عليه)
            $currentStmt = $pdo->prepare("SELECT employee_code, `AC-No.` FROM employees WHERE id = ?");
            $currentStmt->execute([$employeeId]);
            $currentEmployee = $currentStmt->fetch(PDO::FETCH_ASSOC);
            $currentEmployeeCode = $currentEmployee ? trim((string)($currentEmployee['employee_code'] ?? '')) : '';
            $currentAcNo = $currentEmployee ? trim((string)($currentEmployee['AC-No.'] ?? '')) : '';
            
            $fields = [];
            $values = [];
            
            foreach ($data as $key => $value) {
                error_log("Processing field: $key = $value");
                if (in_array($key, ['name', 'name_ar', 'base_salary', 'salary_type', 'cost_center', 
                                   'is_insured', 'location', 'daily_work_hours', 'department', 'position', 'status', 'AC-No.', 'employee_code', 'discrimination_incentive_allowance'])) {
                    if ($key === 'AC-No.') {
                        $sentAcNo = $value !== null && $value !== '' ? trim((string)$value) : '';
                        if ($sentAcNo !== $currentAcNo) {
                            if ($sentAcNo !== '') {
                                $acCheck = $pdo->prepare("SELECT name_ar, name FROM employees WHERE TRIM(CAST(`AC-No.` AS CHAR)) = ? AND id != ? LIMIT 1");
                                $acCheck->execute([$sentAcNo, $employeeId]);
                                $acOwner = $acCheck->fetch(PDO::FETCH_ASSOC);
                                if ($acOwner) {
                                    $ownerName = $acOwner['name_ar'] ?: $acOwner['name'];
                                    throw new Exception("DUPLICATE_FINGERPRINT: كود البصمة \"$sentAcNo\" مستخدم بالفعل للموظف \"$ownerName\".");
                                }
                            }
                            $fields[] = "`AC-No.` = ?";
                            error_log('Adding AC-No. field with value: ' . $value);
                            $values[] = $value !== null && $value !== '' ? $value : null;
                        }
                    } else if ($key === 'employee_code') {
                        $sentCode = $value !== null && $value !== '' ? trim((string)$value) : '';
                        if ($sentCode !== $currentEmployeeCode) {
                            $fields[] = "employee_code = ?";
                            error_log('Adding employee_code field with value: ' . $value);
                            $values[] = $value !== null && $value !== '' ? $value : null;
                        }
                    } else {
                        $fields[] = "$key = ?";
                        
                        // معالجة خاصة لحقل is_insured
                        if ($key === 'is_insured') {
                            $values[] = ($value === true || $value === 'true' || $value === 1 || $value === '1') ? 1 : 0;
                        } else {
                            $values[] = $value;
                        }
                    }
                }
            }
            
            if (empty($fields)) {
                throw new Exception('لا توجد بيانات للتحديث');
            }
            
            $values[] = $employeeId;
            
            $sql = "UPDATE employees SET " . implode(', ', $fields) . " WHERE id = ?";
            error_log('SQL Query: ' . $sql);
            error_log('Values: ' . json_encode($values));
            
            try {
                $stmt = $pdo->prepare($sql);
                $result = $stmt->execute($values);
                error_log('Update result: ' . ($result ? 'SUCCESS' : 'FAILED'));
                error_log('Rows affected: ' . $stmt->rowCount());
                
                // Verify the update by checking the database
                $checkStmt = $pdo->prepare("SELECT `AC-No.` FROM employees WHERE id = ?");
                $checkStmt->execute([$employeeId]);
                $updatedData = $checkStmt->fetch();
                error_log('AC-No. after update: ' . ($updatedData['AC-No.'] ?? 'NULL'));
                
                echo json_encode(['success' => true, 'message' => 'تم تحديث بيانات الموظف بنجاح'], JSON_UNESCAPED_UNICODE);
            } catch (PDOException $e) {
                // التحقق من خطأ التكرار في employee_code
                if ($e->getCode() == 23000 && strpos($e->getMessage(), 'employee_code') !== false) {
                    // الحصول على employee_code الذي تم محاولة إدخاله
                    $duplicateCode = isset($data['employee_code']) ? $data['employee_code'] : null;
                    
                    if ($duplicateCode) {
                        // البحث عن الموظف الذي يستخدم هذا الكود
                        $checkStmt = $pdo->prepare("SELECT name_ar, name FROM employees WHERE employee_code = ? AND id != ?");
                        $checkStmt->execute([$duplicateCode, $employeeId]);
                        $existingEmployee = $checkStmt->fetch(PDO::FETCH_ASSOC);
                        
                        if ($existingEmployee) {
                            $employeeName = $existingEmployee['name_ar'] ?: $existingEmployee['name'];
                            throw new Exception("DUPLICATE_CODE: هذا الرقم مستخدم للموظف \"$employeeName\". برجاء اختيار رقم آخر أو اضغط على زر \"توليد كود جديد\" للحصول على رقم متاح غير مستخدم.");
                        } else {
                            throw new Exception("DUPLICATE_CODE: هذا الرقم مستخدم بالفعل. برجاء اختيار رقم آخر أو اضغط على زر \"توليد كود جديد\" للحصول على رقم متاح غير مستخدم.");
                        }
                    } else {
                        throw new Exception("DUPLICATE_CODE: هذا الرقم مستخدم بالفعل. برجاء اختيار رقم آخر أو اضغط على زر \"توليد كود جديد\" للحصول على رقم متاح غير مستخدم.");
                    }
                }
                throw $e;
            }
            break;
            
        case 'delete_employee':
            $employeeId = $input['employee_id'] ?? '';
            
            if (!$employeeId) {
                throw new Exception('معرف الموظف مطلوب');
            }
            
            // بدء معاملة قاعدة البيانات
            $pdo->beginTransaction();
            
            try {
                // 1. حذف سجلات الحضور المرتبطة
                $stmt = $pdo->prepare("DELETE FROM attendance_logs WHERE employee_id = ?");
                $stmt->execute([$employeeId]);
                $deletedAttendanceRecords = $stmt->rowCount();
                
                // 2. حذف سجلات البصمة المرتبطة (حسب AC-No. وليس employee_code فقط)
                $deletedFingerprintRecords = deleteFingerprintAttendanceForEmployee($pdo, (int) $employeeId);
                
                // 3. حذف الموظف من جدول الموظفين
                $stmt = $pdo->prepare("DELETE FROM employees WHERE id = ?");
                $stmt->execute([$employeeId]);
                $deletedEmployee = $stmt->rowCount();
                
                if ($deletedEmployee === 0) {
                    throw new Exception('الموظف غير موجود');
                }
                
                // تأكيد المعاملة قبل إعادة تعيين AUTO_INCREMENT
                $pdo->commit();
                
                // 5. إعادة تعيين AUTO_INCREMENT للـ ID (خارج المعاملة)
                try {
                    $stmt = $pdo->query("SELECT MAX(id) as max_id FROM employees");
                    $maxId = $stmt->fetchColumn();
                    $nextId = ($maxId ? $maxId + 1 : 1);
                    $pdo->exec("ALTER TABLE employees AUTO_INCREMENT = $nextId");
                } catch (Exception $e) {
                    // تجاهل خطأ إعادة تعيين AUTO_INCREMENT إذا حدث
                    $nextId = 1;
                }
                
                // 6. إعادة تعيين ترقيم employee_code (للاستخدام المستقبلي)
                try {
                    $stmt = $pdo->query("SELECT MAX(CAST(employee_code AS UNSIGNED)) as max_code FROM employees WHERE employee_code REGEXP '^[0-9]+$'");
                    $maxCode = $stmt->fetchColumn();
                    $nextCode = ($maxCode ? $maxCode + 1 : 1);
                } catch (Exception $e) {
                    // تجاهل خطأ حساب employee_code إذا حدث
                    $nextCode = 1;
                }
                
                echo json_encode([
                    'success' => true, 
                    'message' => 'تم حذف الموظف وجميع سجلاته بنجاح وإعادة تعيين AUTO_INCREMENT',
                    'deleted_records' => [
                        'employee' => $deletedEmployee,
                        'attendance_logs' => $deletedAttendanceRecords,
                        'fingerprint_attendance' => $deletedFingerprintRecords
                    ],
                    'auto_increment_reset' => [
                        'id_next' => $nextId,
                        'employee_code_next' => $nextCode
                    ]
                ], JSON_UNESCAPED_UNICODE);
                
            } catch (Exception $e) {
                // إلغاء المعاملة في حالة الخطأ
                if ($pdo->inTransaction()) {
                    $pdo->rollback();
                }
                throw $e;
            }
            break;
            
        case 'create_cost_center':
            $name = $input['name'] ?? '';
            $description = $input['description'] ?? '';
            $color = $input['color'] ?? 'blue';
            
            if (!$name) {
                throw new Exception('اسم مركز التكلفة مطلوب');
            }
            
            // التحقق من عدم وجود مركز تكلفة بنفس الاسم
            $stmt = $pdo->prepare("SELECT id FROM cost_centers WHERE name = ?");
            $stmt->execute([$name]);
            if ($stmt->fetch()) {
                throw new Exception('يوجد مركز تكلفة بنفس الاسم بالفعل');
            }
            
            $stmt = $pdo->prepare("INSERT INTO cost_centers (name, description, color, status) VALUES (?, ?, ?, 'active')");
            $stmt->execute([$name, $description, $color]);
            
            echo json_encode(['success' => true, 'message' => 'تم إنشاء مركز التكلفة بنجاح'], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'bulk_update_employees':
            $employeeIds = $input['employee_ids'] ?? [];
            $updateData = $input['update_data'] ?? [];
            
            if (empty($employeeIds)) {
                throw new Exception('معرفات الموظفين مطلوبة');
            }
            
            if (empty($updateData)) {
                throw new Exception('بيانات التحديث مطلوبة');
            }
            
            // بناء استعلام التحديث
            $updateFields = [];
            $updateValues = [];
            
            if (isset($updateData['salary_type']) && !empty(trim($updateData['salary_type']))) {
                $salaryType = trim($updateData['salary_type']);
                // التحقق من أن القيمة مسموحة
                if (in_array($salaryType, ['Monthly', 'Weekly'])) {
                    $updateFields[] = 'salary_type = ?';
                    $updateValues[] = $salaryType;
                }
            }
            
            if (isset($updateData['department']) && !empty(trim($updateData['department']))) {
                $updateFields[] = 'department = ?';
                $updateValues[] = trim($updateData['department']);
            }
            
            if (isset($updateData['cost_center']) && !empty(trim($updateData['cost_center']))) {
                $updateFields[] = 'cost_center = ?';
                $updateValues[] = trim($updateData['cost_center']);
            }
            
            if (isset($updateData['position']) && !empty(trim($updateData['position']))) {
                $updateFields[] = 'position = ?';
                $updateValues[] = trim($updateData['position']);
            }
            
            if (isset($updateData['status']) && !empty(trim($updateData['status']))) {
                $status = trim($updateData['status']);
                // التحقق من أن القيمة مسموحة
                if (in_array($status, ['active', 'inactive', 'terminated'])) {
                    $updateFields[] = 'status = ?';
                    $updateValues[] = $status;
                }
            }
            
            if (isset($updateData['base_salary']) && !empty(trim($updateData['base_salary']))) {
                $baseSalary = trim($updateData['base_salary']);
                // التحقق من أن القيمة رقمية
                if (is_numeric($baseSalary) && $baseSalary >= 0) {
                    $updateFields[] = 'base_salary = ?';
                    $updateValues[] = $baseSalary;
                }
            }
            
            if (isset($updateData['location']) && !empty(trim($updateData['location']))) {
                $updateFields[] = 'location = ?';
                $updateValues[] = trim($updateData['location']);
            }
            
            if (isset($updateData['is_insured']) && $updateData['is_insured'] !== '' && $updateData['is_insured'] !== null) {
                $isInsured = ($updateData['is_insured'] === true || $updateData['is_insured'] === 'true' || $updateData['is_insured'] === 1 || $updateData['is_insured'] === '1') ? 1 : 0;
                $updateFields[] = 'is_insured = ?';
                $updateValues[] = $isInsured;
            }
            
            if (empty($updateFields)) {
                throw new Exception('لا توجد حقول للتحديث');
            }
            
            $updateFields[] = 'updated_at = CURRENT_TIMESTAMP';
            
            // إضافة معرفات الموظفين للقيم
            $updateValues = array_merge($updateValues, $employeeIds);
            
            $placeholders = str_repeat('?,', count($employeeIds) - 1) . '?';
            $sql = "UPDATE employees SET " . implode(', ', $updateFields) . " WHERE id IN ($placeholders)";
            
            $stmt = $pdo->prepare($sql);
            $result = $stmt->execute($updateValues);
            
            if ($result) {
                $affectedRows = $stmt->rowCount();
                echo json_encode([
                    'success' => true, 
                    'message' => "تم تحديث $affectedRows موظف بنجاح"
                ], JSON_UNESCAPED_UNICODE);
            } else {
                throw new Exception('فشل في تحديث الموظفين');
            }
            break;
            
        case 'bulk_delete_employees':
            $employeeIds = $input['employee_ids'] ?? [];
            
            if (empty($employeeIds)) {
                throw new Exception('معرفات الموظفين مطلوبة');
            }
            
            // بدء المعاملة
            $pdo->beginTransaction();
            
            try {
                $placeholders = str_repeat('?,', count($employeeIds) - 1) . '?';
                
                // حذف البيانات المرتبطة بالموظفين (مطابق لـ delete_employee)
                
                // 1. حذف سجلات الحضور المرتبطة
                $sql = "DELETE FROM attendance_logs WHERE employee_id IN ($placeholders)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($employeeIds);
                $deletedAttendanceRecords = $stmt->rowCount();
                
                // 2. حذف سجلات البصمة المرتبطة (قبل حذف الموظف — حسب AC-No.)
                $deletedFingerprintRecords = deleteFingerprintAttendanceForEmployeeIds($pdo, $employeeIds);
                
                // 3. حذف الموظفين من جدول الموظفين
                $sql = "DELETE FROM employees WHERE id IN ($placeholders)";
                $stmt = $pdo->prepare($sql);
                $result = $stmt->execute($employeeIds);
                $deletedEmployees = $stmt->rowCount();
                
                if ($deletedEmployees === 0) {
                    throw new Exception('لم يتم العثور على أي موظفين للحذف');
                }
                
                // تأكيد المعاملة
                $pdo->commit();
                
                // 5. إعادة تعيين AUTO_INCREMENT للـ ID (خارج المعاملة)
                try {
                    $stmt = $pdo->query("SELECT MAX(id) as max_id FROM employees");
                    $maxId = $stmt->fetchColumn();
                    $nextId = ($maxId ? $maxId + 1 : 1);
                    $pdo->exec("ALTER TABLE employees AUTO_INCREMENT = $nextId");
                } catch (Exception $e) {
                    // تجاهل خطأ إعادة تعيين AUTO_INCREMENT إذا حدث
                    error_log("خطأ في إعادة تعيين AUTO_INCREMENT: " . $e->getMessage());
                }
                
                // 6. إعادة تعيين ترقيم employee_code (للاستخدام المستقبلي)
                try {
                    $stmt = $pdo->query("SELECT MAX(CAST(employee_code AS UNSIGNED)) as max_code FROM employees WHERE employee_code REGEXP '^[0-9]+$'");
                    $maxCode = $stmt->fetchColumn();
                    $nextCode = ($maxCode ? $maxCode + 1 : 1);
                } catch (Exception $e) {
                    // تجاهل خطأ حساب employee_code إذا حدث
                    error_log("خطأ في حساب employee_code: " . $e->getMessage());
                }
                
                echo json_encode([
                    'success' => true, 
                    'message' => "تم حذف $deletedEmployees موظف وجميع البيانات المرتبطة بهم بنجاح",
                    'deleted_records' => [
                        'employees' => $deletedEmployees,
                        'attendance_logs' => $deletedAttendanceRecords,
                        'fingerprint_attendance' => $deletedFingerprintRecords
                    ]
                ], JSON_UNESCAPED_UNICODE);
                
            } catch (Exception $e) {
                // إلغاء المعاملة في حالة الخطأ (إذا كانت المعاملة لا تزال نشطة)
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $e;
            }
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'إجراء غير معروف'], JSON_UNESCAPED_UNICODE);
            break;
    }
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>

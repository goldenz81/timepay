<?php
// تضمين ملف CORS المشترك
require_once 'cors_headers.php';

// استخدام إعدادات قاعدة البيانات الديناميكية
require_once 'config_unified.php'; // يستخدم إعدادات قاعدة البيانات الديناميكية

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    // $pdo متاح من config_unified.php
    
    // Create departments table if it doesn't exist
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS departments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            manager VARCHAR(255),
            location VARCHAR(255),
            cost_center VARCHAR(255),
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    
    // Insert some default departments if table is empty
    $stmt = $pdo->query("SELECT COUNT(*) FROM departments");
    $count = $stmt->fetchColumn();
    
    if ($count == 0) {
        $defaultDepartments = [
            ['name' => 'Production Dep', 'description' => 'قسم الإنتاج', 'manager' => '', 'location' => 'البرج', 'cost_center' => 'الإنتاج'],
            ['name' => 'BE', 'description' => 'قسم المكتب التنفيذي', 'manager' => '', 'location' => 'محرم بك', 'cost_center' => ''],
            ['name' => 'Accounting Dep', 'description' => 'قسم المحاسبة', 'manager' => '', 'location' => 'محرم بك', 'cost_center' => ''],
            ['name' => 'Sells Dep', 'description' => 'قسم المبيعات', 'manager' => '', 'location' => 'محرم بك', 'cost_center' => ''],
            ['name' => 'Service Dep', 'description' => 'قسم الخدمات', 'manager' => '', 'location' => 'البرج', 'cost_center' => 'الإنتاج'],
            ['name' => 'Desgin Dep', 'description' => 'قسم التصميم', 'manager' => '', 'location' => 'محرم بك', 'cost_center' => ''],
            ['name' => 'Inventory', 'description' => 'قسم المخزون', 'manager' => '', 'location' => 'البرج', 'cost_center' => 'الإنتاج'],
            ['name' => 'Lather Dep', 'description' => 'قسم الجلود', 'manager' => '', 'location' => 'البرج', 'cost_center' => 'جلد'],
            ['name' => 'Car Dep', 'description' => 'قسم السيارات', 'manager' => '', 'location' => 'البرج', 'cost_center' => 'الإنتاج']
        ];
        
        $insertStmt = $pdo->prepare("
            INSERT INTO departments (name, description, manager, location, cost_center, status) 
            VALUES (?, ?, ?, ?, ?, 'active')
        ");
        
        foreach ($defaultDepartments as $dept) {
            $insertStmt->execute([$dept['name'], $dept['description'], $dept['manager'], $dept['location'], $dept['cost_center']]);
        }
    }
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            // Get all departments or specific department
            if (isset($_GET['id'])) {
                $stmt = $pdo->prepare("SELECT * FROM departments WHERE id = ?");
                $stmt->execute([$_GET['id']]);
                $department = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($department) {
                    echo json_encode([
                        'success' => true,
                        'data' => $department
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'error' => 'القسم غير موجود'
                    ], JSON_UNESCAPED_UNICODE);
                }
            } else {
                $stmt = $pdo->query("
                    SELECT d.*, 
                           COALESCE(emp_count.employee_count, 0) as employee_count
                    FROM departments d
                    LEFT JOIN (
                        SELECT department, COUNT(*) as employee_count
                        FROM employees 
                        WHERE status = 'active'
                        GROUP BY department
                    ) emp_count ON d.name = emp_count.department
                    ORDER BY d.name ASC
                ");
                $departments = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'data' => $departments
                ], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'POST':
            // Create new department
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                throw new Exception('بيانات غير صحيحة');
            }
            
            // Validate required fields
            if (empty($input['name'])) {
                throw new Exception('اسم القسم مطلوب');
            }
            
            // Check if department name already exists
            $stmt = $pdo->prepare("SELECT id FROM departments WHERE name = ?");
            $stmt->execute([$input['name']]);
            if ($stmt->fetch()) {
                throw new Exception('اسم القسم موجود بالفعل');
            }
            
            // Insert new department
            $stmt = $pdo->prepare("
                INSERT INTO departments (name, description, manager, location, cost_center, status) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $input['name'],
                $input['description'] ?? null,
                $input['manager'] ?? null,
                $input['location'] ?? null,
                $input['cost_center'] ?? null,
                $input['status'] ?? 'active'
            ]);
            
            $departmentId = $pdo->lastInsertId();
            
            // Get the created department
            $stmt = $pdo->prepare("SELECT * FROM departments WHERE id = ?");
            $stmt->execute([$departmentId]);
            $newDepartment = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'message' => 'تم إنشاء القسم بنجاح',
                'data' => $newDepartment
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'PUT':
            // Update existing department
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input || !isset($input['id'])) {
                throw new Exception('معرف القسم مطلوب');
            }
            
            // Check if department exists
            $stmt = $pdo->prepare("SELECT id FROM departments WHERE id = ?");
            $stmt->execute([$input['id']]);
            if (!$stmt->fetch()) {
                throw new Exception('القسم غير موجود');
            }
            
            // Check if name is being changed and if new name already exists
            if (isset($input['name']) && !empty($input['name'])) {
                $stmt = $pdo->prepare("SELECT id FROM departments WHERE name = ? AND id != ?");
                $stmt->execute([$input['name'], $input['id']]);
                if ($stmt->fetch()) {
                    throw new Exception('اسم القسم موجود بالفعل');
                }
            }
            
            // Update department
            $updateFields = [];
            $params = [];
            
            if (isset($input['name'])) {
                $updateFields[] = "name = ?";
                $params[] = $input['name'];
            }
            if (isset($input['description'])) {
                $updateFields[] = "description = ?";
                $params[] = $input['description'];
            }
            if (isset($input['manager'])) {
                $updateFields[] = "manager = ?";
                $params[] = $input['manager'];
            }
            if (isset($input['location'])) {
                $updateFields[] = "location = ?";
                $params[] = $input['location'];
            }
            if (isset($input['cost_center'])) {
                $updateFields[] = "cost_center = ?";
                $params[] = $input['cost_center'];
            }
            if (isset($input['status'])) {
                $updateFields[] = "status = ?";
                $params[] = $input['status'];
            }
            
            if (!empty($updateFields)) {
                $params[] = $input['id'];
                $sql = "UPDATE departments SET " . implode(", ", $updateFields) . " WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                
                // Get updated department
                $stmt = $pdo->prepare("SELECT * FROM departments WHERE id = ?");
                $stmt->execute([$input['id']]);
                $updatedDepartment = $stmt->fetch(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'تم تحديث القسم بنجاح',
                    'data' => $updatedDepartment
                ], JSON_UNESCAPED_UNICODE);
            } else {
                throw new Exception('لا توجد بيانات للتحديث');
            }
            break;
            
        case 'DELETE':
            // Delete department
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input || !isset($input['id'])) {
                throw new Exception('معرف القسم مطلوب');
            }
            
            // Check if department exists
            $stmt = $pdo->prepare("SELECT id, name FROM departments WHERE id = ?");
            $stmt->execute([$input['id']]);
            $department = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$department) {
                throw new Exception('القسم غير موجود');
            }
            
            // Check if department is being used by employees
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM employees WHERE Department = ? OR department = ?");
            $stmt->execute([$department['name'], $department['name']]);
            $employeeCount = $stmt->fetchColumn();
            
            if ($employeeCount > 0) {
                throw new Exception("لا يمكن حذف القسم لأنه مستخدم من قبل $employeeCount موظف");
            }
            
            // Delete department
            $stmt = $pdo->prepare("DELETE FROM departments WHERE id = ?");
            $stmt->execute([$input['id']]);
            
            echo json_encode([
                'success' => true,
                'message' => 'تم حذف القسم بنجاح',
                'deletedDepartment' => $department
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'error' => 'طريقة الطلب غير مدعومة'
            ], JSON_UNESCAPED_UNICODE);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_UNESCAPED_UNICODE);
}
?>

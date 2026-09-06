<?php
// تضمين ملف CORS المشترك
require_once 'cors_headers.php';
require_once 'config_unified.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    // استخدام اتصال قاعدة البيانات الموحد
    
    // Create cost_centers table if it doesn't exist
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS cost_centers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            color VARCHAR(50) DEFAULT 'blue',
            department_id INT,
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
            UNIQUE KEY unique_cost_center_per_department (name, department_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    
    // Add department_id column if it doesn't exist (for existing installations)
    try {
        $pdo->exec("ALTER TABLE cost_centers ADD COLUMN department_id INT AFTER color");
        $pdo->exec("ALTER TABLE cost_centers ADD FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL");
        $pdo->exec("ALTER TABLE cost_centers DROP INDEX name");
        $pdo->exec("ALTER TABLE cost_centers ADD UNIQUE KEY unique_cost_center_per_department (name, department_id)");
    } catch (Exception $e) {
        // Column might already exist, ignore error
    }
    
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';
            
            switch ($action) {
                case 'list':
                $stmt = $pdo->query("
                    SELECT cc.id, cc.name, cc.description, cc.color, cc.department_id, cc.status, cc.created_at, cc.updated_at,
                           d.name as department_name,
                           COALESCE(emp_count.employee_count, 0) as employee_count
                    FROM cost_centers cc
                    LEFT JOIN departments d ON cc.department_id = d.id
                    LEFT JOIN (
                        SELECT cost_center, COUNT(*) as employee_count
                        FROM employees 
                        WHERE status = 'active'
                        GROUP BY cost_center
                    ) emp_count ON cc.name = emp_count.cost_center
                    ORDER BY d.name ASC, cc.name ASC
                ");
                    $costCenters = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    echo json_encode([
                        'success' => true,
                        'data' => $costCenters
                    ], JSON_UNESCAPED_UNICODE);
                    break;
                    
                case 'get':
                    $id = $_GET['id'] ?? null;
                    if (!$id) {
                        throw new Exception('معرف مركز التكلفة مطلوب');
                    }
                    
                    $stmt = $pdo->prepare("
                        SELECT cc.id, cc.name, cc.description, cc.color, cc.department_id, cc.status, cc.created_at, cc.updated_at,
                               d.name as department_name
                        FROM cost_centers cc
                        LEFT JOIN departments d ON cc.department_id = d.id
                        WHERE cc.id = ?
                    ");
                    $stmt->execute([$id]);
                    $costCenter = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if (!$costCenter) {
                        throw new Exception('مركز التكلفة غير موجود');
                    }
                    
                    echo json_encode([
                        'success' => true,
                        'data' => $costCenter
                    ], JSON_UNESCAPED_UNICODE);
                    break;
                    
                case 'by_department':
                    $department_id = $_GET['department_id'] ?? null;
                    if (!$department_id) {
                        throw new Exception('معرف القسم مطلوب');
                    }
                    
                    $stmt = $pdo->prepare("
                        SELECT cc.id, cc.name, cc.description, cc.color, cc.department_id, cc.status
                        FROM cost_centers cc
                        WHERE cc.department_id = ? AND cc.status = 'active'
                        ORDER BY cc.name ASC
                    ");
                    $stmt->execute([$department_id]);
                    $costCenters = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    echo json_encode([
                        'success' => true,
                        'data' => $costCenters
                    ], JSON_UNESCAPED_UNICODE);
                    break;
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? '';
            
            switch ($action) {
                case 'create':
                    $name = $input['name'] ?? '';
                    $description = $input['description'] ?? '';
                    $color = $input['color'] ?? 'blue';
                    $department_id = $input['department_id'] ?? null;
                    
                    if (empty($name)) {
                        throw new Exception('اسم مركز التكلفة مطلوب');
                    }
                    
                    // Check if cost center with same name exists in the same department
                    $checkStmt = $pdo->prepare("SELECT id FROM cost_centers WHERE name = ? AND department_id = ?");
                    $checkStmt->execute([$name, $department_id]);
                    if ($checkStmt->fetch()) {
                        throw new Exception('مركز التكلفة موجود بالفعل في هذا القسم');
                    }
                    
                    $stmt = $pdo->prepare("
                        INSERT INTO cost_centers (name, description, color, department_id) 
                        VALUES (?, ?, ?, ?)
                    ");
                    
                    if ($stmt->execute([$name, $description, $color, $department_id])) {
                        $id = $pdo->lastInsertId();
                        echo json_encode([
                            'success' => true,
                            'message' => 'تم إضافة مركز التكلفة بنجاح',
                            'data' => ['id' => $id]
                        ], JSON_UNESCAPED_UNICODE);
                    } else {
                        throw new Exception('فشل في إضافة مركز التكلفة');
                    }
                    break;
                    
                case 'update':
                    $id = $input['id'] ?? null;
                    $name = $input['name'] ?? '';
                    $description = $input['description'] ?? '';
                    $color = $input['color'] ?? 'blue';
                    $department_id = $input['department_id'] ?? null;
                    
                    if (!$id) {
                        throw new Exception('معرف مركز التكلفة مطلوب');
                    }
                    
                    if (empty($name)) {
                        throw new Exception('اسم مركز التكلفة مطلوب');
                    }
                    
                    // Check if cost center with same name exists in the same department (excluding current one)
                    $checkStmt = $pdo->prepare("SELECT id FROM cost_centers WHERE name = ? AND department_id = ? AND id != ?");
                    $checkStmt->execute([$name, $department_id, $id]);
                    if ($checkStmt->fetch()) {
                        throw new Exception('مركز التكلفة موجود بالفعل في هذا القسم');
                    }
                    
                    $stmt = $pdo->prepare("
                        UPDATE cost_centers 
                        SET name = ?, description = ?, color = ?, department_id = ?
                        WHERE id = ?
                    ");
                    
                    if ($stmt->execute([$name, $description, $color, $department_id, $id])) {
                        if ($stmt->rowCount() > 0) {
                            echo json_encode([
                                'success' => true,
                                'message' => 'تم تحديث مركز التكلفة بنجاح'
                            ], JSON_UNESCAPED_UNICODE);
                        } else {
                            throw new Exception('مركز التكلفة غير موجود');
                        }
                    } else {
                        throw new Exception('فشل في تحديث مركز التكلفة');
                    }
                    break;
                    
                case 'delete':
                    $id = $input['id'] ?? null;
                    
                    if (!$id) {
                        throw new Exception('معرف مركز التكلفة مطلوب');
                    }
                    
                    // Check if cost center is used in departments
                    $stmt = $pdo->prepare("
                        SELECT COUNT(*) FROM departments 
                        WHERE cost_center = (SELECT name FROM cost_centers WHERE id = ?)
                    ");
                    $stmt->execute([$id]);
                    $usageCount = $stmt->fetchColumn();
                    
                    if ($usageCount > 0) {
                        throw new Exception('لا يمكن حذف مركز التكلفة لأنه مستخدم في الأقسام');
                    }
                    
                    $stmt = $pdo->prepare("DELETE FROM cost_centers WHERE id = ?");
                    
                    if ($stmt->execute([$id])) {
                        if ($stmt->rowCount() > 0) {
                            echo json_encode([
                                'success' => true,
                                'message' => 'تم حذف مركز التكلفة بنجاح'
                            ], JSON_UNESCAPED_UNICODE);
                        } else {
                            throw new Exception('مركز التكلفة غير موجود');
                        }
                    } else {
                        throw new Exception('فشل في حذف مركز التكلفة');
                    }
                    break;
                    
                default:
                    throw new Exception('إجراء غير صحيح');
            }
            break;
            
        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $id = $input['id'] ?? null;
            $name = $input['name'] ?? '';
            $description = $input['description'] ?? '';
            $color = $input['color'] ?? 'blue';
            $department_id = $input['department_id'] ?? null;
            
            if (!$id) {
                throw new Exception('معرف مركز التكلفة مطلوب');
            }
            
            if (empty($name)) {
                throw new Exception('اسم مركز التكلفة مطلوب');
            }
            
            // Check if cost center with same name exists in the same department (excluding current record)
            $checkStmt = $pdo->prepare("SELECT id FROM cost_centers WHERE name = ? AND department_id = ? AND id != ?");
            $checkStmt->execute([$name, $department_id, $id]);
            if ($checkStmt->fetch()) {
                throw new Exception('مركز التكلفة موجود بالفعل في هذا القسم');
            }
            
            $stmt = $pdo->prepare("
                UPDATE cost_centers 
                SET name = ?, description = ?, color = ?, department_id = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            ");
            
            if ($stmt->execute([$name, $description, $color, $department_id, $id])) {
                if ($stmt->rowCount() > 0) {
                    echo json_encode([
                        'success' => true,
                        'message' => 'تم تحديث مركز التكلفة بنجاح'
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    throw new Exception('مركز التكلفة غير موجود');
                }
            } else {
                throw new Exception('فشل في تحديث مركز التكلفة');
            }
            break;
            
        case 'DELETE':
            $input = json_decode(file_get_contents('php://input'), true);
            $id = $input['id'] ?? null;
            
            if (!$id) {
                throw new Exception('معرف مركز التكلفة مطلوب');
            }
            
            // Check if cost center is used in departments
            $stmt = $pdo->prepare("
                SELECT COUNT(*) FROM departments 
                WHERE cost_center = (SELECT name FROM cost_centers WHERE id = ?)
            ");
            $stmt->execute([$id]);
            $usageCount = $stmt->fetchColumn();
            
            if ($usageCount > 0) {
                throw new Exception('لا يمكن حذف مركز التكلفة لأنه مستخدم في الأقسام');
            }
            
            $stmt = $pdo->prepare("DELETE FROM cost_centers WHERE id = ?");
            
            if ($stmt->execute([$id])) {
                if ($stmt->rowCount() > 0) {
                    echo json_encode([
                        'success' => true,
                        'message' => 'تم حذف مركز التكلفة بنجاح'
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    throw new Exception('مركز التكلفة غير موجود');
                }
            } else {
                throw new Exception('فشل في حذف مركز التكلفة');
            }
            break;
            
        default:
            throw new Exception('طريقة HTTP غير مدعومة');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>

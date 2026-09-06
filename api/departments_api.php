<?php
require_once 'cors_headers.php';

// استخدام إعدادات قاعدة البيانات الديناميكية
require_once 'config_unified.php'; // يستخدم إعدادات قاعدة البيانات الديناميكية

try {
    // $pdo متاح من config_unified.php
    
    // Get action from request
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    // If action is empty, try to get it from JSON input
    if (empty($action)) {
        $raw_input = file_get_contents('php://input');
        $input = json_decode($raw_input, true);
        if ($input && isset($input['action'])) {
            $action = $input['action'];
        }
    }
    
    switch($action) {
        case 'get_all':
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
                ORDER BY d.id
            ");
            $departments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'departments' => $departments
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'add':
            $input = json_decode(file_get_contents('php://input'), true);
            
            $stmt = $pdo->prepare("
                INSERT INTO departments (name, description, manager, location, cost_center, status) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $result = $stmt->execute([
                $input['name'],
                $input['description'] ?? '',
                $input['manager'] ?? '',
                $input['location'] ?? '',
                $input['cost_center'] ?? '',
                $input['status'] ?? 'active'
            ]);
            
            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => 'تم إضافة القسم بنجاح'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'فشل في إضافة القسم'
                ], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'update':
            $raw_input = file_get_contents('php://input');
            $input = json_decode($raw_input, true);
            
            // Debug: طباعة البيانات المستلمة
            error_log('Raw input: ' . $raw_input);
            error_log('Update input: ' . print_r($input, true));
            
            if (!$input) {
                error_log('Input is null or empty');
                echo json_encode([
                    'success' => false,
                    'message' => 'فشل في قراءة البيانات'
                ], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            $stmt = $pdo->prepare("
                UPDATE departments 
                SET name = ?, description = ?, manager = ?, location = ?, cost_center = ?, status = ?
                WHERE id = ?
            ");
            
            $result = $stmt->execute([
                $input['name'],
                $input['description'] ?? '',
                $input['manager'] ?? '',
                $input['location'] ?? '',
                $input['cost_center'] ?? '',
                $input['status'] ?? 'active',
                $input['id']
            ]);
            
            // Debug: طباعة نتيجة التحديث
            error_log('Update result: ' . ($result ? 'success' : 'failed'));
            
            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => 'تم تحديث القسم بنجاح'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'فشل في تحديث القسم'
                ], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'delete':
            $input = json_decode(file_get_contents('php://input'), true);
            
            $stmt = $pdo->prepare("DELETE FROM departments WHERE id = ?");
            $result = $stmt->execute([$input['id']]);
            
            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => 'تم حذف القسم بنجاح'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'فشل في حذف القسم'
                ], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'get_departments':
        case '':
        default:
            $stmt = $pdo->query("SELECT * FROM departments ORDER BY id");
            $departments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => $departments
            ], JSON_UNESCAPED_UNICODE);
    }
    
} catch(PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'message' => 'خطأ في قاعدة البيانات'
    ], JSON_UNESCAPED_UNICODE);
}
?>

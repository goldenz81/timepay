<?php
require_once 'cors_headers.php';

// Database configuration
$host = 'localhost';
$username = 'root';
$password = 'mysql';
$database = 'timepay_unified';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get action from request
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    switch($action) {
        case 'get_all':
            $stmt = $pdo->query("SELECT * FROM cost_centers ORDER BY id");
            $costCenters = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'cost_centers' => $costCenters
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'add':
            $input = json_decode(file_get_contents('php://input'), true);
            
            $stmt = $pdo->prepare("
                INSERT INTO cost_centers (name, description, color) 
                VALUES (?, ?, ?)
            ");
            
            $result = $stmt->execute([
                $input['name'],
                $input['description'] ?? '',
                $input['color'] ?? 'blue'
            ]);
            
            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => 'تم إضافة مركز التكلفة بنجاح'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'فشل في إضافة مركز التكلفة'
                ], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'update':
            $input = json_decode(file_get_contents('php://input'), true);
            
            $stmt = $pdo->prepare("
                UPDATE cost_centers 
                SET name = ?, description = ?, color = ?
                WHERE id = ?
            ");
            
            $result = $stmt->execute([
                $input['name'],
                $input['description'] ?? '',
                $input['color'] ?? 'blue',
                $input['id']
            ]);
            
            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => 'تم تحديث مركز التكلفة بنجاح'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'فشل في تحديث مركز التكلفة'
                ], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'delete':
            $input = json_decode(file_get_contents('php://input'), true);
            
            $stmt = $pdo->prepare("DELETE FROM cost_centers WHERE id = ?");
            $result = $stmt->execute([$input['id']]);
            
            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => 'تم حذف مركز التكلفة بنجاح'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'فشل في حذف مركز التكلفة'
                ], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        default:
            echo json_encode([
                'success' => false,
                'message' => 'إجراء غير صحيح'
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

<?php
/**
 * API لإدارة القيم الثابتة
 * Constant Values Management API
 */

require_once 'cors_headers.php';

$config = require_once '../config/database_config.php';

try {
    $pdo = new PDO(
        "mysql:host=" . $config['host'] . ";dbname=" . $config['dbname'] . ";charset=utf8mb4",
        $config['username'],
        $config['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    $method = $_SERVER['REQUEST_METHOD'];
    
    // قراءة action من GET أو POST
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    // إذا كان POST، حاول قراءة action من JSON body
    if ($method === 'POST') {
        $rawInput = file_get_contents('php://input');
        if (!empty($rawInput)) {
            // تنظيف الـ input
            $rawInput = trim($rawInput);
            $input = json_decode($rawInput, true);
            
            // التحقق من وجود خطأ في JSON
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log("JSON Error: " . json_last_error_msg() . " - Raw Input: " . $rawInput);
            }
            
            if ($input && isset($input['action'])) {
                $action = $input['action'];
            }
        }
    }
    
    // إذا كان action فارغ، حاول قراءته من $_POST
    if (empty($action) && isset($_POST['action'])) {
        $action = $_POST['action'];
    }
    
    // Debug: طباعة action للتحقق
    error_log("API Debug - Method: $method, Action: '$action', Raw Input: " . ($rawInput ?? 'empty'));

    switch ($method) {
        case 'GET':
            if ($action === 'get_values') {
                getConstantValues($pdo);
            } elseif ($action === 'get_value') {
                getConstantValue($pdo);
            } else {
                getConstantValues($pdo);
            }
            break;
            
        case 'POST':
            if ($action === 'update_value') {
                updateConstantValue($pdo);
            } elseif ($action === 'add_value') {
                addConstantValue($pdo);
            } else {
                throw new Exception('Invalid action: "' . $action . '" - Raw Input: ' . ($rawInput ?? 'empty'));
            }
            break;
            
        case 'PUT':
            updateConstantValue($pdo);
            break;
            
        case 'DELETE':
            deleteConstantValue($pdo);
            break;
            
        default:
            throw new Exception('Method not allowed');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

function getConstantValues($pdo) {
    try {
        $category = $_GET['category'] ?? 'all';
        
        $sql = "SELECT * FROM constant_values WHERE is_active = 1";
        $params = [];
        
        if ($category !== 'all') {
            $sql .= " AND category = ?";
            $params[] = $category;
        }
        
        $sql .= " ORDER BY category, display_name";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $values = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'data' => $values,
            'count' => count($values)
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        throw new Exception('Error fetching constant values: ' . $e->getMessage());
    }
}

function getConstantValue($pdo) {
    try {
        $elementKey = $_GET['element_key'] ?? '';
        
        if (empty($elementKey)) {
            throw new Exception('Element key is required');
        }
        
        $stmt = $pdo->prepare("SELECT * FROM constant_values WHERE element_key = ? AND is_active = 1");
        $stmt->execute([$elementKey]);
        $value = $stmt->fetch();
        
        if (!$value) {
            throw new Exception('Constant value not found');
        }
        
        echo json_encode([
            'success' => true,
            'data' => $value
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        throw new Exception('Error fetching constant value: ' . $e->getMessage());
    }
}

function updateConstantValue($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['element_key']) || !isset($input['value'])) {
            throw new Exception('Invalid input data');
        }
        
        $elementKey = $input['element_key'];
        $value = $input['value'];
        $displayName = $input['display_name'] ?? '';
        $description = $input['description'] ?? '';
        
        // التحقق من وجود العنصر
        $checkStmt = $pdo->prepare("SELECT id FROM constant_values WHERE element_key = ?");
        $checkStmt->execute([$elementKey]);
        
        if ($checkStmt->rowCount() > 0) {
            // تحديث القيمة الموجودة
            $stmt = $pdo->prepare("
                UPDATE constant_values 
                SET value = ?, display_name = ?, description = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE element_key = ?
            ");
            $stmt->execute([$value, $displayName, $description, $elementKey]);
        } else {
            // إضافة قيمة جديدة
            $stmt = $pdo->prepare("
                INSERT INTO constant_values (element_key, display_name, value, description, is_active)
                VALUES (?, ?, ?, ?, 1)
            ");
            $stmt->execute([$elementKey, $displayName, $value, $description]);
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'تم تحديث القيمة الثابتة بنجاح'
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        throw new Exception('Error updating constant value: ' . $e->getMessage());
    }
}

function addConstantValue($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['element_key']) || !isset($input['value'])) {
            throw new Exception('Invalid input data');
        }
        
        $elementKey = $input['element_key'];
        $displayName = $input['display_name'] ?? '';
        $value = $input['value'];
        $dataType = $input['data_type'] ?? 'varchar';
        $category = $input['category'] ?? 'general';
        $description = $input['description'] ?? '';
        
        // التحقق من عدم وجود العنصر مسبقاً
        $checkStmt = $pdo->prepare("SELECT id FROM constant_values WHERE element_key = ?");
        $checkStmt->execute([$elementKey]);
        
        if ($checkStmt->rowCount() > 0) {
            throw new Exception('Constant value already exists');
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO constant_values (element_key, display_name, value, data_type, category, description, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        ");
        $stmt->execute([$elementKey, $displayName, $value, $dataType, $category, $description]);
        
        echo json_encode([
            'success' => true,
            'message' => 'تم إضافة القيمة الثابتة بنجاح'
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        throw new Exception('Error adding constant value: ' . $e->getMessage());
    }
}

function deleteConstantValue($pdo) {
    try {
        $elementKey = $_GET['element_key'] ?? '';
        
        if (empty($elementKey)) {
            throw new Exception('Element key is required');
        }
        
        $stmt = $pdo->prepare("UPDATE constant_values SET is_active = 0 WHERE element_key = ?");
        $stmt->execute([$elementKey]);
        
        echo json_encode([
            'success' => true,
            'message' => 'تم حذف القيمة الثابتة بنجاح'
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        throw new Exception('Error deleting constant value: ' . $e->getMessage());
    }
}
?>

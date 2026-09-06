<?php
/**
 * API إدارة أسماء الأعمدة
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config_unified.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'] ?? $input['action'] ?? '';

    switch ($action) {
        case 'get_column_names':
            getColumnNames($pdo);
            break;
        case 'update_column_name':
            updateColumnName($pdo, $input);
            break;
        case 'get_columns_by_table':
            getColumnsByTable($pdo);
            break;
        case 'update_column_name_inline':
            updateColumnNameInline($pdo, $input);
            break;
        default:
            echo json_encode(['success' => false, 'message' => 'Action not found']);
            break;
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function getColumnNames($pdo) {
    try {
        $stmt = $pdo->query("SELECT * FROM column_names ORDER BY table_name, column_key");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $columns
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'خطأ في جلب أسماء الأعمدة: ' . $e->getMessage()
        ]);
    }
}

function getColumnsByTable($pdo) {
    try {
        $tableName = $_GET['table'] ?? '';
        
        if (empty($tableName)) {
            echo json_encode(['success' => false, 'message' => 'اسم الجدول مطلوب']);
            return;
        }
        
        $stmt = $pdo->prepare("SELECT * FROM column_names WHERE table_name = ? ORDER BY column_key");
        $stmt->execute([$tableName]);
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $columns
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'خطأ في جلب أسماء الأعمدة: ' . $e->getMessage()
        ]);
    }
}

function updateColumnName($pdo, $input) {
    try {
        $columnKey = $input['column_key'] ?? '';
        $arabicName = $input['arabic_name'] ?? '';
        
        if (empty($columnKey) || empty($arabicName)) {
            echo json_encode(['success' => false, 'message' => 'مفتاح العمود والاسم العربي مطلوبان']);
            return;
        }
        
        $stmt = $pdo->prepare("UPDATE column_names SET arabic_name = ?, updated_at = NOW() WHERE column_key = ?");
        $stmt->execute([$arabicName, $columnKey]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'تم تحديث اسم العمود بنجاح'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'لم يتم العثور على العمود'
            ]);
        }
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'خطأ في تحديث اسم العمود: ' . $e->getMessage()
        ]);
    }
}

function updateColumnNameInline($pdo, $input) {
    try {
        $columnKey = $input['column_key'] ?? '';
        $arabicName = $input['arabic_name'] ?? '';
        
        if (empty($columnKey) || empty($arabicName)) {
            echo json_encode(['success' => false, 'message' => 'مفتاح العمود والاسم العربي مطلوبان']);
            return;
        }
        
        $stmt = $pdo->prepare("UPDATE column_names SET arabic_name = ?, updated_at = NOW() WHERE column_key = ?");
        $stmt->execute([$arabicName, $columnKey]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'تم تحديث اسم العمود بنجاح',
                'data' => [
                    'column_key' => $columnKey,
                    'arabic_name' => $arabicName
                ]
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'لم يتم العثور على العمود'
            ]);
        }
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'خطأ في تحديث اسم العمود: ' . $e->getMessage()
        ]);
    }
}
?>

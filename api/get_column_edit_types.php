<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $table_name = $input['table_name'] ?? '';
    
    if (empty($table_name)) {
        echo json_encode(['success' => false, 'message' => 'اسم الجدول مطلوب']);
        return;
    }
    
    $stmt = $pdo->prepare("SELECT column_key, edit_type, default_value FROM column_edit_types WHERE table_name = ?");
    $stmt->execute([$table_name]);
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $columns
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في جلب أنواع الأعمدة: ' . $e->getMessage()
    ]);
}
?>

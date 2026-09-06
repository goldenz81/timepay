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
    
    $column_key = $input['column_key'] ?? '';
    $table_name = $input['table_name'] ?? '';
    $edit_type = $input['edit_type'] ?? '';
    $default_value = $input['default_value'] ?? null;
    
    if (empty($column_key) || empty($table_name) || empty($edit_type)) {
        echo json_encode(['success' => false, 'message' => 'بيانات مطلوبة مفقودة']);
        return;
    }
    
    // إنشاء جدول column_edit_types إذا لم يكن موجوداً
    $createTableSQL = "CREATE TABLE IF NOT EXISTS column_edit_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        column_key VARCHAR(255) NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        edit_type ENUM('manual', 'dynamic') NOT NULL DEFAULT 'dynamic',
        default_value DECIMAL(15,2) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_column_table (column_key, table_name)
    )";
    $pdo->exec($createTableSQL);
    
    // إدراج أو تحديث نوع التعديل
    $stmt = $pdo->prepare("
        INSERT INTO column_edit_types (column_key, table_name, edit_type, default_value, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
        edit_type = VALUES(edit_type),
        default_value = VALUES(default_value), 
        updated_at = NOW()
    ");
    
    $stmt->execute([$column_key, $table_name, $edit_type, $default_value]);
    
    echo json_encode([
        'success' => true,
        'message' => 'تم تعيين نوع التعديل بنجاح',
        'data' => [
            'column_key' => $column_key,
            'table_name' => $table_name,
            'edit_type' => $edit_type
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في تعيين نوع التعديل: ' . $e->getMessage()
    ]);
}
?>

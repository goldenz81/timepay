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
    
    $employee_id = $input['employee_id'] ?? '';
    $column_key = $input['column_key'] ?? '';
    $value = $input['value'] ?? 0;
    $table_name = $input['table_name'] ?? '';
    
    if (empty($employee_id) || empty($column_key) || empty($table_name)) {
        echo json_encode(['success' => false, 'message' => 'بيانات مطلوبة مفقودة']);
        return;
    }
    
    // إنشاء جدول employee_values إذا لم يكن موجوداً
    $createTableSQL = "CREATE TABLE IF NOT EXISTS employee_values (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        column_key VARCHAR(255) NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        value DECIMAL(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_employee_column (employee_id, column_key, table_name),
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )";
    $pdo->exec($createTableSQL);
    
    // إدراج أو تحديث القيمة
    $stmt = $pdo->prepare("
        INSERT INTO employee_values (employee_id, column_key, table_name, value, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
        value = VALUES(value), 
        updated_at = NOW()
    ");
    
    $stmt->execute([$employee_id, $column_key, $table_name, $value]);
    
    echo json_encode([
        'success' => true,
        'message' => 'تم حفظ القيمة بنجاح',
        'data' => [
            'employee_id' => $employee_id,
            'column_key' => $column_key,
            'value' => $value
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في حفظ القيمة: ' . $e->getMessage()
    ]);
}
?>

<?php
// جلب العناصر فقط (بدون إعدادات)
require_once 'cors_headers.php';

$config = require_once '../config/database_config.php';

try {
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['dbname']};charset=utf8mb4",
        $config['username'],
        $config['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    
    // جلب العناصر فقط (استبعاد عناصر الإعدادات)
    $stmt = $pdo->query("
        SELECT * FROM calculation_elements_v2 
        WHERE table_name != 'settings' 
        AND element_key NOT LIKE 'settings.%'
        AND is_active = 1
        ORDER BY category, display_name
    ");
    $elements = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'data' => $elements
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>

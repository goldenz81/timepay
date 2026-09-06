<?php
// تضمين ملف CORS المشترك
require_once 'cors_headers.php';

// تضمين كلاس قاعدة البيانات
require_once '../models/Database.php';

try {
    // استخدام كلاس قاعدة البيانات الآمن
    $pdo = Database::getConnection();
    
    // تحديث أسماء الموظفين في جدول attendance_logs
    $updateStmt = $pdo->prepare("
        UPDATE attendance_logs al
        JOIN employees e ON al.`AC-No.` = e.`AC-No.`
        SET al.Name = e.Name
        WHERE al.Name != e.Name OR al.Name IS NULL
    ");
    
    $updateStmt->execute();
    $affectedRows = $updateStmt->rowCount();
    
    echo json_encode([
        'success' => true,
        'message' => "تم تحديث $affectedRows سجل حضور",
        'affected_rows' => $affectedRows
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>

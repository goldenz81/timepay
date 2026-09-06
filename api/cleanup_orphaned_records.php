<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $config = require_once '../config/database_config.php';
    
    $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
    $username = $config['username'];
    $password = $config['password'];
    $options = $config['options'];
    
    $pdo = new PDO($dsn, $username, $password, $options);
    
    $action = $_GET['action'] ?? 'cleanup';
    
    if ($action === 'cleanup') {
        // بدء معاملة قاعدة البيانات
        $pdo->beginTransaction();
        
        try {
            // 1. حذف سجلات الحضور التي لا ترتبط بموظف موجود
            $stmt = $pdo->prepare("
                DELETE al FROM attendance_logs al 
                LEFT JOIN employees e ON al.employee_id = e.id 
                WHERE e.id IS NULL
            ");
            $stmt->execute();
            $deletedAttendanceRecords = $stmt->rowCount();
            
            // 2. حذف سجلات البصمة التي لا ترتبط بموظف موجود
            $stmt = $pdo->prepare("
                DELETE fa FROM fingerprint_attendance fa 
                LEFT JOIN employees e ON fa.ac_no = e.employee_code 
                WHERE e.id IS NULL
            ");
            $stmt->execute();
            $deletedFingerprintRecords = $stmt->rowCount();
            
            // 3. لا يوجد عمود employee_id في جدول fingerprint_sync_logs
            $deletedFingerprintLogs = 0;
            
            // تأكيد المعاملة
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'تم تنظيف السجلات المتبقية بنجاح',
                'deleted_records' => [
                    'attendance_logs' => $deletedAttendanceRecords,
                    'fingerprint_attendance' => $deletedFingerprintRecords,
                    'fingerprint_sync_logs' => $deletedFingerprintLogs
                ],
                'total_deleted' => $deletedAttendanceRecords + $deletedFingerprintRecords + $deletedFingerprintLogs
            ]);
            
        } catch (Exception $e) {
            // إلغاء المعاملة في حالة الخطأ
            $pdo->rollback();
            throw $e;
        }
        
    } elseif ($action === 'check') {
        // فحص السجلات المتبقية بدون حذفها
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count 
            FROM attendance_logs al 
            LEFT JOIN employees e ON al.employee_id = e.id 
            WHERE e.id IS NULL
        ");
        $stmt->execute();
        $orphanedAttendanceRecords = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count 
            FROM fingerprint_attendance fa 
            LEFT JOIN employees e ON fa.ac_no = e.employee_code 
            WHERE e.id IS NULL
        ");
        $stmt->execute();
        $orphanedFingerprintRecords = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // لا يوجد عمود employee_id في جدول fingerprint_sync_logs
        $orphanedFingerprintLogs = 0;
        
        echo json_encode([
            'success' => true,
            'message' => 'فحص السجلات المتبقية',
            'orphaned_records' => [
                'attendance_logs' => (int)$orphanedAttendanceRecords,
                'fingerprint_attendance' => (int)$orphanedFingerprintRecords,
                'fingerprint_sync_logs' => (int)$orphanedFingerprintLogs
            ],
            'total_orphaned' => (int)$orphanedAttendanceRecords + (int)$orphanedFingerprintRecords + (int)$orphanedFingerprintLogs
        ]);
        
    } else {
        throw new Exception('إجراء غير صحيح');
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في تنظيف السجلات: ' . $e->getMessage()
    ]);
}
?>

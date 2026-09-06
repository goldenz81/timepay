<?php
/**
 * إعداد نظام البصمة في قاعدة البيانات الجديدة
 * 
 * @author TimePay System
 * @version 1.0
 * @date 2025-01-19
 */

require_once 'cors_headers.php';
require_once 'config.php';

try {
    $results = [];
    
    // 1. إنشاء جدول سجلات مزامنة البصمة
    $createSyncLogs = "
        CREATE TABLE IF NOT EXISTS fingerprint_sync_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            device_id INT NOT NULL,
            sync_type ENUM('full', 'incremental', 'manual') NOT NULL,
            sync_status ENUM('success', 'failed', 'partial') NOT NULL,
            records_processed INT DEFAULT 0,
            records_success INT DEFAULT 0,
            records_failed INT DEFAULT 0,
            error_message TEXT,
            sync_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sync_completed_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (device_id) REFERENCES fingerprint_devices(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    
    $pdo->exec($createSyncLogs);
    $results[] = "✓ تم إنشاء جدول fingerprint_sync_logs";
    
    // 2. إضافة حقول البصمة لجدول الموظفين
    $addFingerprintFields = [
        "ALTER TABLE employees ADD COLUMN fingerprint_id VARCHAR(50) NULL COMMENT 'معرف البصمة في الجهاز'",
        "ALTER TABLE employees ADD COLUMN fingerprint_enrolled BOOLEAN DEFAULT FALSE COMMENT 'هل تم تسجيل البصمة؟'",
        "ALTER TABLE employees ADD COLUMN fingerprint_device_id INT NULL COMMENT 'معرف جهاز البصمة'"
    ];
    
    foreach ($addFingerprintFields as $sql) {
        try {
            $pdo->exec($sql);
            $results[] = "✓ تم إضافة حقل البصمة للموظفين";
        } catch (Exception $e) {
            if (strpos($e->getMessage(), 'Duplicate column name') === false) {
                throw $e;
            }
            $results[] = "ℹ الحقل موجود بالفعل";
        }
    }
    
    // 3. إنشاء فهارس للبصمة
    $createIndexes = [
        "CREATE INDEX idx_fingerprint_id ON employees(fingerprint_id)",
        "CREATE INDEX idx_fingerprint_device ON employees(fingerprint_device_id)"
    ];
    
    foreach ($createIndexes as $sql) {
        try {
            $pdo->exec($sql);
            $results[] = "✓ تم إنشاء فهرس البصمة";
        } catch (Exception $e) {
            if (strpos($e->getMessage(), 'Duplicate key name') === false && 
                strpos($e->getMessage(), 'already exists') === false) {
                throw $e;
            }
            $results[] = "ℹ الفهرس موجود بالفعل";
        }
    }
    
    // 4. إدراج إعدادات البصمة
    $insertSettings = "
        INSERT IGNORE INTO system_settings (setting_key, setting_value, description, setting_type) VALUES
        ('fingerprint_enabled', 'false', 'تفعيل نظام البصمة', 'boolean'),
        ('fingerprint_auto_sync', 'true', 'المزامنة التلقائية للبصمة', 'boolean'),
        ('fingerprint_sync_interval', '5', 'فترة المزامنة بالدقائق', 'number'),
        ('fingerprint_timeout', '30', 'مهلة الاتصال بالجهاز بالثواني', 'number'),
        ('fingerprint_retry_attempts', '3', 'عدد محاولات إعادة الاتصال', 'number'),
        ('fingerprint_backup_enabled', 'true', 'تفعيل النسخ الاحتياطي للبصمة', 'boolean')
    ";
    
    $pdo->exec($insertSettings);
    $results[] = "✓ تم إضافة إعدادات البصمة";
    
    // 5. إدراج جهاز افتراضي للاختبار
    $insertDefaultDevice = "
        INSERT IGNORE INTO fingerprint_devices (device_name, device_ip, device_port, device_type, device_model, location, status) VALUES
        ('جهاز البصمة الرئيسي', '192.168.1.100', 4370, 'ZKTeco', 'F18', 'المدخل الرئيسي', 'active')
    ";
    
    $pdo->exec($insertDefaultDevice);
    $results[] = "✓ تم إضافة جهاز افتراضي";
    
    echo json_encode([
        'success' => true,
        'message' => 'تم إعداد نظام البصمة بنجاح',
        'database' => 'timepay_unified',
        'results' => $results,
        'tables_created' => [
            'fingerprint_sync_logs'
        ],
        'fields_added' => [
            'employees.fingerprint_id',
            'employees.fingerprint_enrolled', 
            'employees.fingerprint_device_id'
        ],
        'settings_added' => 6,
        'default_device_added' => true
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في إعداد نظام البصمة: ' . $e->getMessage()
    ]);
}
?>

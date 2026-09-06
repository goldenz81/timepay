<?php
// ملف إعداد قاعدة البيانات
require_once 'cors_headers.php';

// إعدادات قاعدة البيانات
$host = 'localhost';
$username = 'root';
$password = 'mysql';

try {
    // الاتصال بدون تحديد قاعدة البيانات
    $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // إنشاء قاعدة البيانات
    $pdo->exec("CREATE DATABASE IF NOT EXISTS timepay_unified CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE timepay_unified");
    
    // إنشاء جدول الموظفين
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS employees (
            id INT AUTO_INCREMENT PRIMARY KEY,
            `AC-No.` VARCHAR(50) UNIQUE NOT NULL,
            Name VARCHAR(255) NOT NULL,
            name_ar VARCHAR(255),
            Department VARCHAR(100),
            cost_center VARCHAR(100),
            salary_type ENUM('Monthly', 'Weekly', 'Daily') DEFAULT 'Monthly',
            base_salary DECIMAL(10,2) DEFAULT 0,
            status ENUM('active', 'inactive') DEFAULT 'active',
            hire_date DATE,
            position VARCHAR(100),
            location VARCHAR(100),
            is_insured BOOLEAN DEFAULT FALSE,
            daily_work_hours DECIMAL(4,2) DEFAULT 8.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");
    
    // إنشاء جدول الأقسام
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS departments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");
    
    // إنشاء جدول مراكز التكلفة
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS cost_centers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");
    
    // إنشاء جدول سجلات الحضور اليدوية
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS attendance_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            `AC-No.` VARCHAR(50) NOT NULL,
            employee_code VARCHAR(50),
            employee_name VARCHAR(255),
            date DATE NOT NULL,
            check_in TIME,
            check_out TIME,
            work_hours DECIMAL(4,2) DEFAULT 0,
            overtime_hours DECIMAL(4,2) DEFAULT 0,
            late_minutes INT DEFAULT 0,
            early_leave_minutes INT DEFAULT 0,
            status ENUM('present', 'absent', 'late', 'half_day', 'vacation', 'sick') DEFAULT 'present',
            is_holiday BOOLEAN DEFAULT FALSE,
            is_excused BOOLEAN DEFAULT FALSE,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");
    
    // إنشاء جدول سجلات الحضور من جهاز البصمة
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS fingerprint_attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            `AC-No.` VARCHAR(50) NOT NULL,
            employee_code VARCHAR(50),
            employee_name VARCHAR(255),
            date DATE NOT NULL,
            check_in TIME,
            check_out TIME,
            work_hours DECIMAL(4,2) DEFAULT 0,
            overtime_hours DECIMAL(4,2) DEFAULT 0,
            late_minutes INT DEFAULT 0,
            early_leave_minutes INT DEFAULT 0,
            status ENUM('present', 'absent', 'late', 'half_day', 'vacation', 'sick') DEFAULT 'present',
            is_holiday BOOLEAN DEFAULT FALSE,
            is_excused BOOLEAN DEFAULT FALSE,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");
    
    // إدراج بيانات تجريبية
    $pdo->exec("
        INSERT IGNORE INTO departments (name, description) VALUES
        ('المبيعات', 'قسم المبيعات والتسويق'),
        ('المحاسبة', 'قسم المحاسبة والمالية'),
        ('الموارد البشرية', 'قسم الموارد البشرية'),
        ('التقنية', 'قسم تقنية المعلومات')
    ");
    
    $pdo->exec("
        INSERT IGNORE INTO cost_centers (name, description) VALUES
        ('مركز المبيعات', 'مركز تكلفة المبيعات'),
        ('مركز الإدارة', 'مركز تكلفة الإدارة'),
        ('مركز الإنتاج', 'مركز تكلفة الإنتاج')
    ");
    
    $pdo->exec("
        INSERT IGNORE INTO employees (`AC-No.`, Name, name_ar, Department, cost_center, salary_type, base_salary) VALUES
        ('EMP001', 'Ahmed Ali', 'أحمد علي', 'المبيعات', 'مركز المبيعات', 'Monthly', 5000.00),
        ('EMP002', 'Sara Mohamed', 'سارة محمد', 'المحاسبة', 'مركز الإدارة', 'Monthly', 4500.00),
        ('EMP003', 'Omar Hassan', 'عمر حسن', 'الموارد البشرية', 'مركز الإدارة', 'Monthly', 4000.00),
        ('EMP004', 'Fatma Ibrahim', 'فاطمة إبراهيم', 'التقنية', 'مركز الإنتاج', 'Monthly', 6000.00)
    ");
    
    $pdo->exec("
        INSERT IGNORE INTO attendance_logs (`AC-No.`, employee_code, employee_name, date, check_in, check_out, work_hours, status) VALUES
        ('EMP001', 'EMP001', 'Ahmed Ali', CURDATE(), '08:00:00', '17:00:00', 8.0, 'present'),
        ('EMP002', 'EMP002', 'Sara Mohamed', CURDATE(), '08:15:00', '17:15:00', 8.0, 'late'),
        ('EMP003', 'EMP003', 'Omar Hassan', CURDATE(), '08:00:00', '16:30:00', 7.5, 'present'),
        ('EMP004', 'EMP004', 'Fatma Ibrahim', CURDATE(), '08:00:00', '18:00:00', 9.0, 'present')
    ");
    
    echo json_encode([
        'success' => true,
        'message' => 'تم إنشاء قاعدة البيانات والجداول بنجاح'
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'خطأ في إنشاء قاعدة البيانات: ' . $e->getMessage()
    ]);
}
?>

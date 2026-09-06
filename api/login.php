<?php
// API لتسجيل الدخول
require_once 'cors_headers.php';

// استخدام إعدادات قاعدة البيانات الديناميكية
require_once 'config_unified.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // قراءة البيانات من الطلب
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        echo json_encode([
            'success' => false,
            'message' => 'لم يتم إرسال بيانات'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        echo json_encode([
            'success' => false,
            'message' => 'اسم المستخدم وكلمة المرور مطلوبان'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // البحث عن المستخدم في قاعدة البيانات
    // أولاً، التحقق من وجود جدول users
    $stmt = $pdo->query("SHOW TABLES LIKE 'users'");
    $tableExists = $stmt->rowCount() > 0;
    
    if (!$tableExists) {
        // إنشاء جدول users إذا لم يكن موجوداً
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                role VARCHAR(50) DEFAULT 'user',
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // إنشاء مستخدم admin افتراضي
        $defaultPassword = password_hash('pass123x123', PASSWORD_DEFAULT);
        $pdo->exec("
            INSERT IGNORE INTO users (username, password, full_name, email, role, status)
            VALUES ('admin', '$defaultPassword', 'مدير النظام', 'admin@company.com', 'admin', 'active')
        ");
    }
    
    // البحث عن المستخدم
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND status = 'active'");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if (!$user) {
        echo json_encode([
            'success' => false,
            'message' => 'اسم المستخدم أو كلمة المرور غير صحيحة'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // التحقق من كلمة المرور
    if (password_verify($password, $user['password'])) {
        // إنشاء token بسيط (يمكن تحسينه لاحقاً)
        $token = bin2hex(random_bytes(32));
        
        // حفظ token في قاعدة البيانات (اختياري)
        // يمكن إضافة جدول sessions لاحقاً
        
        // إرجاع بيانات المستخدم
        echo json_encode([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'full_name' => $user['full_name'],
                'email' => $user['email'],
                'role' => $user['role']
            ],
            'message' => 'تم تسجيل الدخول بنجاح'
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'اسم المستخدم أو كلمة المرور غير صحيحة'
        ], JSON_UNESCAPED_UNICODE);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في قاعدة البيانات: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'حدث خطأ: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>


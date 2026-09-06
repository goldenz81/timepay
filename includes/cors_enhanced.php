<?php
// ملف CORS محسن - CORS headers يتم التعامل معها من خلال .htaccess
// هذا الملف فقط للتحقق من الصلاحيات

// تفعيل debug mode للتطوير
define('CORS_DEBUG', false);

// قائمة المواقع المسموح لها
$allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://localhost:8080',
    'http://localhost:5173' // Vite default
];

// الحصول على Origin من الطلب
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// تسجيل CORS في السجل للتطوير
if (CORS_DEBUG) {
    error_log("CORS Request: " . $_SERVER['REQUEST_METHOD'] . " from " . $origin);
}

// التعامل مع طلبات OPTIONS (preflight) - فقط إرجاع 200
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// تسجيل نجاح CORS
if (CORS_DEBUG) {
    error_log("CORS Request processed for: " . $_SERVER['REQUEST_METHOD']);
}
?>

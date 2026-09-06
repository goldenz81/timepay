<?php
// ملف CORS مبسط للتطوير
// حل سريع لمشكلة CORS

// قائمة المواقع المسموح لها
$allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

// الحصول على Origin من الطلب
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// التعامل مع طلبات OPTIONS (preflight) أولاً
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // إرسال CORS headers للطلبات preflight
    if (in_array($origin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        header('Access-Control-Allow-Origin: *');
    }
    
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept, Origin');
    header('Access-Control-Allow-Credentials: true');
    
    // إرجاع 200 OK للطلبات preflight
    http_response_code(200);
    exit(0);
}

// التحقق من أن Origin مسموح له
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: *');
}

// CORS Headers الأساسية
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, Origin');
header('Access-Control-Allow-Credentials: true');

// Content-Type header
header('Content-Type: application/json; charset=utf-8');
?>

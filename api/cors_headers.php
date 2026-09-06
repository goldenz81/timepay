<?php
// ملف CORS مشترك لجميع ملفات API
// تم إعادة إنشاؤه بعد حذف الملف الأصلي

// إعدادات CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma');
header('Access-Control-Max-Age: 86400');

// التعامل مع طلبات OPTIONS
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Content-Type header - تأكد من عدم وجود خطأ هنا
if (!headers_sent()) {
    header('Content-Type: application/json; charset=utf-8');
}
?>

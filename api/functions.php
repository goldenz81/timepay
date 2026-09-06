<?php
/**
 * دوال مساعدة مشتركة للنظام
 *
 * @author TimePay System
 * @version 1.0
 * @date 2026-01-18
 */

// التحقق من البيئة (Development vs Production)
function isProduction() {
    // التحقق من النطاق
    $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';

    // إذا كان النطاق يحتوي على localhost، فهو development
    if (strpos($host, 'localhost') !== false ||
        strpos($host, '127.0.0.1') !== false ||
        $host === '' ||
        strpos($host, '::1') !== false) {
        return false; // Development
    }

    // إذا كان النطاق يحتوي على timepay.borgelarabpress.com، فهو production
    if (strpos($host, 'timepay.borgelarabpress.com') !== false ||
        strpos($host, 'borgelarabpress.com') !== false) {
        return true; // Production
    }

    // افتراضياً، إذا لم يتم التعرف على النطاق، نفترض development
    return false;
}

// دالة تنظيف الأوقات موجودة في attendance_logs.php - لا نحتاج تكرارها هنا

// دالة convertArabicNumbers موجودة في fingerprint_sync.php - لا نحتاج تكرارها هنا

// دالة getSystemVar موجودة في attendance_logs.php - لا نحتاج تكرارها هنا
?>
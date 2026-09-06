<?php
/**
 * تكوين error_log للنظام
 * يوجه جميع الأخطاء والسجلات إلى ملف error_log.txt داخل مجلد logs
 */

// مسار ملف error_log
$logDir = __DIR__ . '/../logs';
$logFile = $logDir . '/error_log.txt';

// التأكد من وجود المجلد
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}

// تكوين error_log
ini_set('log_errors', 1);
ini_set('error_log', $logFile);
ini_set('display_errors', 0); // إخفاء الأخطاء من العرض
error_reporting(E_ALL); // تسجيل جميع الأخطاء

/**
 * دالة مساعدة لكتابة السجلات المخصصة
 */
function writeErrorLog($message, $level = 'INFO') {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] [$level] $message" . PHP_EOL;
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
}

/**
 * دالة مساعدة لكتابة سجلات التصحيح
 */
function writeDebugLog($message) {
    writeErrorLog($message, 'DEBUG');
}

/**
 * دالة مساعدة لكتابة سجلات الأخطاء
 */
function writeError($message) {
    writeErrorLog($message, 'ERROR');
}

/**
 * دالة مساعدة لكتابة سجلات التحذيرات
 */
function writeWarning($message) {
    writeErrorLog($message, 'WARNING');
}


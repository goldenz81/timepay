<?php

/**
 * مساعدات خلفيات الصفحات — مسارات آمنة وحذف الملفات
 */

function page_background_targets_map()
{
    return [
        'login' => [
            'variable_key' => 'login_background_image',
            'file_prefix' => 'login_bg_',
            'name_ar' => 'صورة خلفية تسجيل الدخول',
        ],
        'dashboard' => [
            'variable_key' => 'dashboard_background_image',
            'file_prefix' => 'dashboard_bg_',
            'name_ar' => 'صورة خلفية صفحات النظام',
        ],
        'header' => [
            'variable_key' => 'header_background_image',
            'file_prefix' => 'header_bg_',
            'name_ar' => 'صورة خلفية الهيدر',
        ],
        'sidebar' => [
            'variable_key' => 'sidebar_background_image',
            'file_prefix' => 'sidebar_bg_',
            'name_ar' => 'صورة خلفية الشريط الجانبي',
        ],
    ];
}

function page_background_uploads_dir()
{
    $dir = realpath(__DIR__ . '/../uploads/backgrounds');
    if ($dir) {
        return $dir;
    }
    $fallback = __DIR__ . '/../uploads/backgrounds';
    if (!file_exists($fallback)) {
        mkdir($fallback, 0755, true);
    }
    return realpath($fallback) ?: $fallback;
}

/**
 * يحوّل رابط الخلفية إلى مسار ملف آمن داخل uploads/backgrounds
 */
function resolve_page_background_disk_path($imageUrl)
{
    if (!$imageUrl || !is_string($imageUrl)) {
        return null;
    }

    $imageUrl = trim($imageUrl);
    if (!preg_match('#/uploads/backgrounds/([a-zA-Z0-9._-]+)$#', $imageUrl, $matches)) {
        return null;
    }

    $fileName = $matches[1];
    $baseDir = page_background_uploads_dir();
    if (!$baseDir) {
        return null;
    }

    $candidate = $baseDir . DIRECTORY_SEPARATOR . $fileName;
    $realBase = realpath($baseDir);
    $realFile = realpath($candidate);

    if ($realFile && $realBase && strpos($realFile, $realBase) === 0 && is_file($realFile)) {
        return $realFile;
    }

    if ($realBase && is_file($candidate)) {
        $parent = realpath(dirname($candidate));
        if ($parent === $realBase) {
            return $candidate;
        }
    }

    return null;
}

/**
 * حذف ملف خلفية من القرص إن وُجد وكان ضمن المجلد المسموح
 */
function delete_page_background_file($imageUrl)
{
    $path = resolve_page_background_disk_path($imageUrl);
    if (!$path || !is_file($path)) {
        return false;
    }
    return @unlink($path);
}

/**
 * قراءة رابط الخلفية الحالي من قاعدة البيانات
 */
function get_page_background_image_url(PDO $pdo, $variableKey)
{
    $stmt = $pdo->prepare('SELECT variable_value FROM system_variables WHERE variable_key = ? LIMIT 1');
    $stmt->execute([$variableKey]);
    $value = $stmt->fetchColumn();
    return $value ? trim((string) $value) : '';
}

/**
 * مسح قيمة الخلفية في قاعدة البيانات
 */
function clear_page_background_setting(PDO $pdo, $targetConfig)
{
    $variableKey = $targetConfig['variable_key'];
    $stmt = $pdo->prepare('SELECT id FROM system_variables WHERE variable_key = ? LIMIT 1');
    $stmt->execute([$variableKey]);

    if ($stmt->fetch()) {
        $stmt = $pdo->prepare('UPDATE system_variables SET variable_value = ?, updated_at = NOW() WHERE variable_key = ?');
        $stmt->execute(['', $variableKey]);
        return;
    }

    $stmt = $pdo->prepare("
        INSERT INTO system_variables
        (variable_key, variable_name_ar, variable_name_en, variable_value, variable_type,
         category, is_editable, is_required, is_active, created_at, updated_at)
        VALUES (?, ?, ?, '', 'text', 'general', 1, 0, 1, NOW(), NOW())
    ");
    $stmt->execute([$variableKey, $targetConfig['name_ar'], $variableKey]);
}

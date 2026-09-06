<?php
/**
 * رفع صورة خلفية صفحة تسجيل الدخول (توافق قديم)
 */
if (!isset($_POST['target']) || $_POST['target'] === '') {
    $_POST['target'] = 'login';
}
require __DIR__ . '/upload_page_background.php';

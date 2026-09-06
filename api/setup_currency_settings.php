<?php
// Proxy loader to restore access to the original currency settings page
// Moves execution to the legacy script under api/_unused if it still exists

// Basic CORS for browser access when needed
// إعداد CORS headers - يعمل في التطوير والإنتاج
$allowedOrigins = [
    'http://localhost:3000',
    'http://localhost',
    'https://timepay.borgelarabpress.com',
    'http://timepay.borgelarabpress.com'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    $currentOrigin = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
    if (strpos($currentOrigin, 'timepay.borgelarabpress.com') !== false || strpos($currentOrigin, 'localhost') !== false) {
        header("Access-Control-Allow-Origin: $currentOrigin");
    }
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

$legacy = __DIR__ . '/_unused/setup_currency_settings.php';
if (file_exists($legacy)) {
    require $legacy;
    exit;
}

http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
echo '<h3>الملف غير موجود</h3><p>لم يتم العثور على setup_currency_settings.php في api/_unused.</p>';
?>



<?php
/**
 * تفضيلات واجهة المستخدم (مفتاح/قيمة JSON لكل مستخدم)
 * يُنشئ الجدول تلقائياً عند أول استخدام.
 */
require_once __DIR__ . '/cors_headers.php';
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) {
    echo json_encode(['success' => false, 'message' => 'طلب غير صالح'], JSON_UNESCAPED_UNICODE);
    exit;
}

$action = $input['action'] ?? '';
$userKey = isset($input['user_key']) ? trim((string) $input['user_key']) : '';
$prefKey = isset($input['pref_key']) ? trim((string) $input['pref_key']) : '';

if ($userKey === '' || $prefKey === '') {
    echo json_encode(['success' => false, 'message' => 'user_key و pref_key مطلوبان'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (strlen($userKey) > 190) {
    $userKey = substr($userKey, 0, 190);
}
if (strlen($prefKey) > 120) {
    $prefKey = substr($prefKey, 0, 120);
}

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_ui_preferences (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_key VARCHAR(190) NOT NULL,
            pref_key VARCHAR(120) NOT NULL,
            pref_value JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_user_pref (user_key, pref_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    if ($action === 'load') {
        $stmt = $pdo->prepare('SELECT pref_value FROM user_ui_preferences WHERE user_key = ? AND pref_key = ? LIMIT 1');
        $stmt->execute([$userKey, $prefKey]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row && array_key_exists('pref_value', $row)) {
            $rawVal = $row['pref_value'];
            if (is_array($rawVal)) {
                $decoded = $rawVal;
            } elseif (is_string($rawVal)) {
                $decoded = json_decode($rawVal, true);
            } else {
                $decoded = null;
            }
            echo json_encode([
                'success' => true,
                'value' => $decoded,
            ], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode([
                'success' => true,
                'value' => null,
            ], JSON_UNESCAPED_UNICODE);
        }
        exit;
    }

    if ($action === 'save') {
        $value = $input['value'] ?? null;
        if ($value === null && !array_key_exists('value', $input)) {
            echo json_encode(['success' => false, 'message' => 'حقل value مطلوب'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $json = json_encode($value, JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            echo json_encode(['success' => false, 'message' => 'تعذر ترميز القيمة'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $stmt = $pdo->prepare('
            INSERT INTO user_ui_preferences (user_key, pref_key, pref_value)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE pref_value = ?, updated_at = CURRENT_TIMESTAMP
        ');
        $stmt->execute([$userKey, $prefKey, $json, $json]);

        echo json_encode(['success' => true, 'message' => 'تم الحفظ'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'إجراء غير معروف'], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('user_ui_preferences: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في الخادم',
    ], JSON_UNESCAPED_UNICODE);
}

<?php
/**
 * API لتغيير كلمة مرور المستخدم
 * يتحقق من كلمة المرور الحالية ثم يحدّث إلى الجديدة.
 */
require_once 'cors_headers.php';
require_once 'config_unified.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'طريقة الطلب غير صحيحة'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        echo json_encode(['success' => false, 'message' => 'بيانات غير صحيحة'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $userId = isset($input['user_id']) ? (int) $input['user_id'] : 0;
    $username = trim($input['username'] ?? '');
    $currentPassword = $input['current_password'] ?? '';
    $newPassword = $input['new_password'] ?? '';

    if (empty($currentPassword) || empty($newPassword)) {
        echo json_encode(['success' => false, 'message' => 'كلمة المرور الحالية والجديدة مطلوبتان'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (strlen($newPassword) < 6) {
        echo json_encode(['success' => false, 'message' => 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($userId > 0) {
        $stmt = $pdo->prepare("SELECT id, username, password FROM users WHERE id = ? AND status = 'active'");
        $stmt->execute([$userId]);
    } elseif ($username !== '') {
        $stmt = $pdo->prepare("SELECT id, username, password FROM users WHERE username = ? AND status = 'active'");
        $stmt->execute([$username]);
    } else {
        echo json_encode(['success' => false, 'message' => 'معرف المستخدم أو اسم المستخدم مطلوب'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'المستخدم غير موجود'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (!password_verify($currentPassword, $user['password'])) {
        echo json_encode(['success' => false, 'message' => 'كلمة المرور الحالية غير صحيحة'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $hashedNew = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->execute([$hashedNew, $user['id']]);

    if ($stmt->rowCount() >= 0) {
        echo json_encode([
            'success' => true,
            'message' => 'تم تغيير كلمة المرور بنجاح'
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(['success' => false, 'message' => 'فشل تحديث كلمة المرور'], JSON_UNESCAPED_UNICODE);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في قاعدة البيانات'
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'حدث خطأ: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

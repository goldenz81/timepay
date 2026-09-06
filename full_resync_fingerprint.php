<?php
/**
 * إعادة مزامنة كاملة للبصمة مع حذف السجلات القديمة
 */

require_once 'api/cors_headers.php';
require_once 'api/config.php';
require_once 'api/fingerprint_system_integration.php';

try {
    $integration = new FingerprintSystemIntegration($pdo);

    echo "بدء إعادة المزامنة الكاملة...\n";
    echo str_repeat("-", 50) . "\n";

    // حذف السجلات القديمة
    $deleteCount = $pdo->exec("DELETE FROM attendance_logs WHERE notes LIKE '%مزامن من البصمة%'");
    echo "تم حذف $deleteCount سجل قديم\n";

    // إعادة المزامنة التفصيلية
    $result = $integration->syncAttendanceDetailed();

    echo str_repeat("-", 50) . "\n";

    if ($result['success']) {
        echo "✅ تمت إعادة المزامنة بنجاح!\n";
        echo "السجلات الجديدة: {$result['synced_count']}\n";
        echo "السجلات المحدثة: {$result['updated_count']}\n";
    } else {
        echo "❌ فشلت إعادة المزامنة: {$result['message']}\n";
    }

} catch (Exception $e) {
    echo "❌ خطأ في إعادة المزامنة: " . $e->getMessage() . "\n";
}
?>
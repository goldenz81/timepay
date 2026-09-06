<?php
/**
 * مزامنة تفصيلية للبصمة - سجل لكل حدث دخول/خروج
 */

require_once 'api/cors_headers.php';
require_once 'api/config.php';
require_once 'api/fingerprint_system_integration.php';

try {
    $integration = new FingerprintSystemIntegration($pdo);

    echo "بدء المزامنة التفصيلية...\n";
    echo str_repeat("-", 50) . "\n";

    // المزامنة التفصيلية
    $result = $integration->syncAttendanceDetailed();

    echo str_repeat("-", 50) . "\n";

    if ($result['success']) {
        echo "✅ تمت المزامنة التفصيلية بنجاح!\n";
        echo "السجلات الجديدة: {$result['synced_count']}\n";
        echo "السجلات المحدثة: {$result['updated_count']}\n";
        echo "الوضع: {$result['mode']}\n";
    } else {
        echo "❌ فشلت المزامنة التفصيلية: {$result['message']}\n";
    }

} catch (Exception $e) {
    echo "❌ خطأ في المزامنة التفصيلية: " . $e->getMessage() . "\n";
}
?>
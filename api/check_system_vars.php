<?php
require_once 'config_unified.php';

try {
    $stmt = $pdo->query("SELECT variable_key, variable_value FROM system_variables WHERE is_active = 1");
    $vars = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

    echo "=== إعدادات النظام ===\n";
    foreach ($vars as $key => $value) {
        echo "{$key}: {$value}\n";
    }

    echo "\n=== إعدادات التأخير ===\n";
    echo "official_start_time: " . ($vars['official_start_time'] ?? 'غير محدد') . "\n";
    echo "grace_period: " . ($vars['grace_period'] ?? 'غير محدد') . "\n";
    echo "late_hour_multiplier: " . ($vars['late_hour_multiplier'] ?? 'غير محدد') . "\n";
    echo "late_partial_hour_threshold: " . ($vars['late_partial_hour_threshold'] ?? 'غير محدد') . "\n";
    echo "late_partial_hour_multiplier: " . ($vars['late_partial_hour_multiplier'] ?? 'غير محدد') . "\n";

} catch (Exception $e) {
    echo "خطأ: " . $e->getMessage() . "\n";
}
?>
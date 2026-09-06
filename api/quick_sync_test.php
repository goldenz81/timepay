<?php
// اختبار سريع للمزامنة

function testApi($action, $data = []) {
    $url = 'http://localhost/TimePay/api/virtual_device_api.php';
    $ch = curl_init($url);

    $payload = json_encode(array_merge(['action' => $action], $data));

    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type:application/json'));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $result = curl_exec($ch);
    curl_close($ch);

    return json_decode($result, true);
}

echo "<h2>اختبار سريع للمزامنة</h2>";

// Test 1: مزامنة مباشرة للتاريخ المحدد
echo "<h3>1. مزامنة للتاريخ 2025-10-13:</h3>";
$syncResult = testApi('sync_to_attendance_logs', [
    'date' => '2025-10-13',
    'limit' => 50
]);
echo "<pre>" . json_encode($syncResult, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";

// Test 2: التحقق من النتيجة
if ($syncResult && $syncResult['success']) {
    echo "<h3>2. نتيجة المزامنة:</h3>";
    echo "<p><strong>السجلات المزامنة:</strong> {$syncResult['synced_count']}</p>";
    echo "<p><strong>السجلات المحدثة:</strong> {$syncResult['updated_count']}</p>";
    echo "<p><strong>إجمالي السجلات:</strong> {$syncResult['total_records']}</p>";
    
    if (!empty($syncResult['errors'])) {
        echo "<h4>الأخطاء:</h4>";
        foreach ($syncResult['errors'] as $error) {
            echo "<p style='color: red;'>❌ $error</p>";
        }
    }
    
    if (isset($syncResult['debug_info'])) {
        echo "<h4>معلومات التشخيص:</h4>";
        echo "<p><strong>التاريخ المبحوث:</strong> {$syncResult['debug_info']['date_searched']}</p>";
        echo "<p><strong>سجلات البصمة الموجودة:</strong> {$syncResult['debug_info']['fingerprint_records_found']}</p>";
        
        if ($syncResult['debug_info']['sample_record']) {
            echo "<h5>عينة من السجل:</h5>";
            echo "<pre>" . json_encode($syncResult['debug_info']['sample_record'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
        }
    }
}

// Test 3: التحقق من قاعدة البيانات
echo "<h3>3. التحقق من قاعدة البيانات:</h3>";
try {
    $config = require '../config/database_config.php';
    $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
    $username = $config['username'];
    $password = $config['password'];
    $options = $config['options'];

    $pdo = new PDO($dsn, $username, $password, $options);
    
    // فحص attendance_logs
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM attendance_logs 
        WHERE attendance_date = '2025-10-13'
    ");
    $stmt->execute();
    $result = $stmt->fetch();
    
    echo "<p><strong>عدد السجلات في attendance_logs للتاريخ 2025-10-13:</strong> {$result['count']}</p>";
    
    if ($result['count'] > 0) {
        $stmt = $pdo->prepare("
            SELECT * FROM attendance_logs 
            WHERE attendance_date = '2025-10-13' 
            ORDER BY created_at DESC 
            LIMIT 3
        ");
        $stmt->execute();
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<h4>أحدث 3 سجلات:</h4>";
        echo "<pre>" . json_encode($records, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'>خطأ في الاتصال بقاعدة البيانات: " . $e->getMessage() . "</p>";
}

echo "<h3>ملخص الاختبار:</h3>";
echo "<p>✅ تم اختبار المزامنة للتاريخ المحدد</p>";
echo "<p>✅ تم فحص النتائج</p>";
echo "<p>✅ تم التحقق من قاعدة البيانات</p>";
?>

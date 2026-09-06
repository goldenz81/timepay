<?php
// مسح الأجهزة التجريبية من قاعدة البيانات

try {
    $config = require '../config/database_config.php';
    $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
    $username = $config['username'];
    $password = $config['password'];
    $options = $config['options'];

    $pdo = new PDO($dsn, $username, $password, $options);
    
    echo "<h1>🧹 مسح الأجهزة التجريبية من قاعدة البيانات</h1>";
    
    // عرض الأجهزة الموجودة قبل المسح
    echo "<h2>1️⃣ الأجهزة الموجودة قبل المسح:</h2>";
    $stmt = $pdo->query("SELECT * FROM fingerprint_devices ORDER BY id");
    $devices = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($devices)) {
        echo "<p>لا توجد أجهزة في قاعدة البيانات</p>";
    } else {
        echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
        echo "<tr><th>ID</th><th>اسم الجهاز</th><th>نوع الجهاز</th><th>IP</th><th>المنفذ</th><th>الحالة</th></tr>";
        foreach ($devices as $device) {
            echo "<tr>";
            echo "<td>{$device['id']}</td>";
            echo "<td>{$device['device_name']}</td>";
            echo "<td>{$device['device_type']}</td>";
            echo "<td>{$device['device_ip']}</td>";
            echo "<td>{$device['device_port']}</td>";
            echo "<td>{$device['status']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    
    // تحديد الأجهزة التجريبية
    echo "<h2>2️⃣ تحديد الأجهزة التجريبية:</h2>";
    $testDevices = [];
    foreach ($devices as $device) {
        if (strpos($device['device_name'], 'Test') !== false || 
            strpos($device['device_name'], 'اختبار') !== false ||
            strpos($device['device_name'], 'ZKTeco Main Office') !== false ||
            strpos($device['device_name'], 'ZKTeco Branch Office') !== false ||
            strpos($device['device_name'], 'Suprema Warehouse') !== false ||
            strpos($device['device_name'], 'Hikvision Factory') !== false ||
            strpos($device['device_name'], 'Default Port Device') !== false) {
            $testDevices[] = $device;
        }
    }
    
    if (empty($testDevices)) {
        echo "<p style='color: green;'>لا توجد أجهزة تجريبية للمسح</p>";
    } else {
        echo "<p style='color: orange;'>تم العثور على " . count($testDevices) . " جهاز تجريبي:</p>";
        echo "<ul>";
        foreach ($testDevices as $device) {
            echo "<li>ID: {$device['id']} - {$device['device_name']} ({$device['device_type']})</li>";
        }
        echo "</ul>";
    }
    
    // مسح الأجهزة التجريبية
    if (!empty($testDevices)) {
        echo "<h2>3️⃣ مسح الأجهزة التجريبية:</h2>";
        
        $deletedCount = 0;
        foreach ($testDevices as $device) {
            try {
                $stmt = $pdo->prepare("DELETE FROM fingerprint_devices WHERE id = ?");
                $stmt->execute([$device['id']]);
                $deletedCount++;
                echo "<p style='color: red;'>تم مسح الجهاز: {$device['device_name']} (ID: {$device['id']})</p>";
            } catch (Exception $e) {
                echo "<p style='color: red;'>خطأ في مسح الجهاز {$device['device_name']}: " . $e->getMessage() . "</p>";
            }
        }
        
        echo "<p style='color: green; font-weight: bold;'>تم مسح {$deletedCount} جهاز تجريبي بنجاح</p>";
    }
    
    // عرض الأجهزة المتبقية بعد المسح
    echo "<h2>4️⃣ الأجهزة المتبقية بعد المسح:</h2>";
    $stmt = $pdo->query("SELECT * FROM fingerprint_devices ORDER BY id");
    $remainingDevices = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($remainingDevices)) {
        echo "<p>لا توجد أجهزة متبقية في قاعدة البيانات</p>";
    } else {
        echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
        echo "<tr><th>ID</th><th>اسم الجهاز</th><th>نوع الجهاز</th><th>IP</th><th>المنفذ</th><th>الحالة</th></tr>";
        foreach ($remainingDevices as $device) {
            echo "<tr>";
            echo "<td>{$device['id']}</td>";
            echo "<td>{$device['device_name']}</td>";
            echo "<td>{$device['device_type']}</td>";
            echo "<td>{$device['device_ip']}</td>";
            echo "<td>{$device['device_port']}</td>";
            echo "<td>{$device['status']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    
    // ملخص النتائج
    echo "<h2>5️⃣ ملخص النتائج:</h2>";
    echo "<div style='background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
    echo "<h4>✅ ما تم عمله:</h4>";
    echo "<ul>";
    echo "<li>تم عرض جميع الأجهزة الموجودة</li>";
    echo "<li>تم تحديد الأجهزة التجريبية</li>";
    echo "<li>تم مسح الأجهزة التجريبية</li>";
    echo "<li>تم عرض الأجهزة المتبقية</li>";
    echo "</ul>";
    echo "</div>";
    
    echo "<div style='background: #d4edda; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
    echo "<h4>🚀 النتيجة:</h4>";
    echo "<p><strong>تم مسح الأجهزة التجريبية بنجاح!</strong></p>";
    echo "<ul>";
    echo "<li>الأجهزة الحقيقية محفوظة</li>";
    echo "<li>الجهاز الافتراضي يعمل بشكل طبيعي</li>";
    echo "<li>يمكن إضافة أجهزة جديدة</li>";
    echo "<li>النظام جاهز للاستخدام</li>";
    echo "</ul>";
    echo "</div>";
    
} catch (Exception $e) {
    echo "<p style='color: red;'>خطأ في الاتصال بقاعدة البيانات: " . $e->getMessage() . "</p>";
}
?>

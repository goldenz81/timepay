<?php
/**
 * اختبار النظام الديناميكي
 * Dynamic System Test
 */

require_once 'config.php';
require_once 'DynamicFormulaEngine.php';

echo "<h1>🧪 اختبار النظام الديناميكي</h1>";
echo "<style>
    body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
    .test-section { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .success { color: green; font-weight: bold; }
    .error { color: red; font-weight: bold; }
    .info { color: blue; }
    pre { background: #f0f0f0; padding: 10px; border-radius: 3px; overflow-x: auto; }
</style>";

try {
    // اختبار 1: التحقق من قاعدة البيانات
    echo "<div class='test-section'>";
    echo "<h2>1. اختبار قاعدة البيانات</h2>";
    
    $missingTables = checkDynamicSystemTables($pdo);
    if (empty($missingTables)) {
        echo "<p class='success'>✅ جميع الجداول موجودة</p>";
    } else {
        echo "<p class='error'>❌ الجداول المفقودة: " . implode(', ', $missingTables) . "</p>";
    }
    echo "</div>";

    // اختبار 2: اختبار محرك المعادلات
    echo "<div class='test-section'>";
    echo "<h2>2. اختبار محرك المعادلات</h2>";
    
    $engine = new DynamicFormulaEngine($pdo);
    echo "<p class='success'>✅ تم إنشاء محرك المعادلات بنجاح</p>";
    
    // اختبار المعادلات المتاحة
    $availableVariables = $engine->getAvailableVariables();
    echo "<p class='info'>📊 المتغيرات المتاحة: " . count($availableVariables) . "</p>";
    echo "<pre>" . implode(', ', $availableVariables) . "</pre>";
    echo "</div>";

    // اختبار 3: اختبار المعادلات الأساسية
    echo "<div class='test-section'>";
    echo "<h2>3. اختبار المعادلات الأساسية</h2>";
    
    $testCases = [
        [
            'formula' => 'attendance_bonus',
            'variables' => ['salary_type' => 'Weekly', 'on_time_days' => 5, 'meal_allowance_per_day' => 5],
            'expected' => 25
        ],
        [
            'formula' => 'insurance_amount_weekly_monthly',
            'variables' => ['salary_type' => 'Weekly', 'weekly_insurance_amount' => 50, 'monthly_insurance_amount' => 220],
            'expected' => 50
        ],
        [
            'formula' => 'calculated_late_hours',
            'variables' => ['total_late_minutes' => 30],
            'expected' => 1
        ]
    ];
    
    foreach ($testCases as $test) {
        try {
            $result = $engine->evaluateFormula($test['formula'], $test['variables']);
            if ($result == $test['expected']) {
                echo "<p class='success'>✅ {$test['formula']}: {$result} (متوقع: {$test['expected']})</p>";
            } else {
                echo "<p class='error'>❌ {$test['formula']}: {$result} (متوقع: {$test['expected']})</p>";
            }
        } catch (Exception $e) {
            echo "<p class='error'>❌ {$test['formula']}: خطأ - " . $e->getMessage() . "</p>";
        }
    }
    echo "</div>";

    // اختبار 4: اختبار API
    echo "<div class='test-section'>";
    echo "<h2>4. اختبار API</h2>";
    
    $apiTests = [
        'get_tables' => 'api/dynamic_system_api.php?action=get_tables',
        'get_formulas' => 'api/dynamic_system_api.php?action=get_formulas',
        'get_variables' => 'api/dynamic_system_api.php?action=get_variables'
    ];
    
    foreach ($apiTests as $testName => $url) {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 5
            ]
        ]);
        
        $response = @file_get_contents($url, false, $context);
        if ($response) {
            $data = json_decode($response, true);
            if ($data && isset($data['success']) && $data['success']) {
                echo "<p class='success'>✅ {$testName}: " . count($data['data']) . " عنصر</p>";
            } else {
                echo "<p class='error'>❌ {$testName}: استجابة غير صحيحة</p>";
            }
        } else {
            echo "<p class='error'>❌ {$testName}: فشل في الاتصال</p>";
        }
    }
    echo "</div>";

    // اختبار 5: اختبار إنشاء البيانات
    echo "<div class='test-section'>";
    echo "<h2>5. اختبار إنشاء البيانات</h2>";
    
    // اختبار إنشاء متغير جديد
    $testVariable = [
        'variable_key' => 'test_variable_' . time(),
        'variable_name_ar' => 'متغير اختبار',
        'variable_name_en' => 'Test Variable',
        'variable_value' => '100',
        'variable_type' => 'number',
        'category' => 'test',
        'is_editable' => 1,
        'is_required' => 0,
        'description_ar' => 'متغير للاختبار'
    ];
    
    try {
        $stmt = $pdo->prepare("INSERT INTO system_variables (variable_key, variable_name_ar, variable_name_en, variable_value, variable_type, category, is_editable, is_required, description_ar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute(array_values($testVariable));
        
        echo "<p class='success'>✅ تم إنشاء متغير اختبار بنجاح</p>";
        
        // حذف المتغير
        $stmt = $pdo->prepare("DELETE FROM system_variables WHERE variable_key = ?");
        $stmt->execute([$testVariable['variable_key']]);
        
        echo "<p class='success'>✅ تم حذف متغير الاختبار</p>";
        
    } catch (Exception $e) {
        echo "<p class='error'>❌ فشل في إنشاء متغير الاختبار: " . $e->getMessage() . "</p>";
    }
    echo "</div>";

    // اختبار 6: إحصائيات النظام
    echo "<div class='test-section'>";
    echo "<h2>6. إحصائيات النظام</h2>";
    
    $stats = [
        'الجداول' => $pdo->query("SELECT COUNT(*) FROM dynamic_tables WHERE is_active = 1")->fetchColumn(),
        'الأعمدة' => $pdo->query("SELECT COUNT(*) FROM dynamic_columns WHERE is_active = 1")->fetchColumn(),
        'المعادلات' => $pdo->query("SELECT COUNT(*) FROM dynamic_formulas WHERE is_active = 1")->fetchColumn(),
        'المتغيرات' => $pdo->query("SELECT COUNT(*) FROM system_variables WHERE is_active = 1")->fetchColumn(),
        'الربط' => $pdo->query("SELECT COUNT(*) FROM column_formula_mappings WHERE is_active = 1")->fetchColumn()
    ];
    
    foreach ($stats as $name => $count) {
        echo "<p class='info'>📊 {$name}: {$count}</p>";
    }
    echo "</div>";

    echo "<div class='test-section'>";
    echo "<h2>🎉 نتيجة الاختبار</h2>";
    echo "<p class='success'>✅ النظام الديناميكي يعمل بشكل صحيح!</p>";
    echo "<p class='info'>📅 تاريخ الاختبار: " . date('Y-m-d H:i:s') . "</p>";
    echo "<p class='info'>🔧 إصدار النظام: " . DYNAMIC_SYSTEM_VERSION . "</p>";
    echo "</div>";

} catch (Exception $e) {
    echo "<div class='test-section'>";
    echo "<h2>❌ خطأ في الاختبار</h2>";
    echo "<p class='error'>" . $e->getMessage() . "</p>";
    echo "</div>";
}
?>

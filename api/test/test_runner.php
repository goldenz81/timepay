<?php
/**
 * مشغل الاختبارات
 * 
 * يشغل جميع ملفات الاختبار في المجلد ويعرض النتائج
 */

require_once 'test_config.php';

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>مشغل الاختبارات - TimePay</title>
    <style>
        body {
            font-family: 'Cairo', Arial, sans-serif;
            margin: 20px;
            background: #f5f5f5;
            direction: rtl;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 30px;
        }
        .test-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .test-item {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            background: #f9f9f9;
            transition: all 0.3s ease;
        }
        .test-item:hover {
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .test-item h3 {
            margin: 0 0 10px 0;
            color: #34495e;
        }
        .test-item p {
            color: #7f8c8d;
            margin: 5px 0;
            font-size: 14px;
        }
        .run-btn {
            background: #28a745;
            color: white;
            padding: 8px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 10px;
            transition: background 0.3s ease;
        }
        .run-btn:hover {
            background: #218838;
        }
        .run-all-btn {
            background: #007bff;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin: 20px auto;
            display: block;
            transition: background 0.3s ease;
        }
        .run-all-btn:hover {
            background: #0056b3;
        }
        .results {
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #dee2e6;
        }
        .result-item {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 4px;
            border-left: 4px solid #007bff;
        }
        .result-item.success {
            border-left-color: #28a745;
            background: #d4edda;
        }
        .result-item.error {
            border-left-color: #dc3545;
            background: #f8d7da;
        }
        .result-item h4 {
            margin: 0 0 5px 0;
            color: #495057;
        }
        .result-item .details {
            font-size: 14px;
            color: #6c757d;
        }
        .loading {
            text-align: center;
            padding: 40px;
            color: #6c757d;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 2s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 مشغل الاختبارات - TimePay</h1>
        
        <button class="run-all-btn" onclick="runAllTests()">▶️ تشغيل جميع الاختبارات</button>
        
        <div class="test-list" id="testList">
            <?php
            // الحصول على جميع ملفات الاختبار
            $testFiles = glob(__DIR__ . '/test_*.php');
            $testFiles = array_filter($testFiles, function($file) {
                return basename($file) !== 'test_config.php' && 
                       basename($file) !== 'test_template.php' &&
                       basename($file) !== 'test_cleanup.php' &&
                       basename($file) !== 'test_runner.php' &&
                       basename($file) !== 'test_summary.php' &&
                       basename($file) !== 'test_index.php';
            });
            
            if (empty($testFiles)) {
                echo '<div class="test-item">';
                echo '<h3>لا توجد اختبارات</h3>';
                echo '<p>لم يتم العثور على ملفات اختبار في هذا المجلد</p>';
                echo '<p>استخدم <code>test_template.php</code> كنموذج لإنشاء اختبارات جديدة</p>';
                echo '</div>';
            } else {
                foreach ($testFiles as $file) {
                    $fileName = basename($file);
                    $fileSize = filesize($file);
                    $fileDate = date('Y-m-d H:i:s', filemtime($file));
                    
                    // قراءة معلومات الاختبار
                    $fileContent = file_get_contents($file);
                    $testName = 'اختبار غير محدد';
                    $description = 'لا يوجد وصف';
                    
                    if (preg_match('/test_name[\'"]\s*=>\s*[\'"]([^\'"]+)[\'"]/', $fileContent, $matches)) {
                        $testName = $matches[1];
                    }
                    if (preg_match('/description[\'"]\s*=>\s*[\'"]([^\'"]+)[\'"]/', $fileContent, $matches)) {
                        $description = $matches[1];
                    }
                    
                    echo '<div class="test-item">';
                    echo '<h3>' . htmlspecialchars($testName) . '</h3>';
                    echo '<p><strong>الملف:</strong> ' . htmlspecialchars($fileName) . '</p>';
                    echo '<p><strong>الوصف:</strong> ' . htmlspecialchars($description) . '</p>';
                    echo '<p><strong>الحجم:</strong> ' . number_format($fileSize) . ' بايت</p>';
                    echo '<p><strong>التاريخ:</strong> ' . $fileDate . '</p>';
                    echo '<button class="run-btn" onclick="runTest(\'' . htmlspecialchars($fileName) . '\')">▶️ تشغيل</button>';
                    echo '</div>';
                }
            }
            ?>
        </div>
        
        <div class="results" id="results" style="display: none;">
            <h3>نتائج الاختبارات</h3>
            <div id="resultsContent"></div>
        </div>
    </div>

    <script>
        async function runTest(testFile) {
            const resultsDiv = document.getElementById('results');
            const resultsContent = document.getElementById('resultsContent');
            
            resultsDiv.style.display = 'block';
            resultsContent.innerHTML = '<div class="loading"><div class="spinner"></div>جاري تشغيل الاختبار...</div>';
            
            try {
                const response = await fetch(testFile);
                const result = await response.json();
                
                const resultDiv = document.createElement('div');
                resultDiv.className = 'result-item ' + (result.success ? 'success' : 'error');
                
                resultDiv.innerHTML = `
                    <h4>${result.success ? '✅' : '❌'} ${result.test_info?.test_name || testFile}</h4>
                    <div class="details">
                        <strong>النتيجة:</strong> ${result.success ? 'نجح' : 'فشل'}<br>
                        <strong>الرسالة:</strong> ${result.message || result.error || 'لا توجد رسالة'}<br>
                        <strong>الوقت:</strong> ${result.timestamp || 'غير محدد'}
                    </div>
                `;
                
                resultsContent.innerHTML = '';
                resultsContent.appendChild(resultDiv);
                
            } catch (error) {
                resultsContent.innerHTML = `
                    <div class="result-item error">
                        <h4>❌ خطأ في تشغيل الاختبار</h4>
                        <div class="details">
                            <strong>الخطأ:</strong> ${error.message}<br>
                            <strong>الملف:</strong> ${testFile}
                        </div>
                    </div>
                `;
            }
        }
        
        async function runAllTests() {
            const testItems = document.querySelectorAll('.test-item');
            const resultsDiv = document.getElementById('results');
            const resultsContent = document.getElementById('resultsContent');
            
            resultsDiv.style.display = 'block';
            resultsContent.innerHTML = '<div class="loading"><div class="spinner"></div>جاري تشغيل جميع الاختبارات...</div>';
            
            const results = [];
            
            for (const item of testItems) {
                const runBtn = item.querySelector('.run-btn');
                if (runBtn) {
                    const testFile = runBtn.getAttribute('onclick').match(/'([^']+)'/)[1];
                    
                    try {
                        const response = await fetch(testFile);
                        const result = await response.json();
                        results.push({ file: testFile, result: result });
                    } catch (error) {
                        results.push({ file: testFile, result: { success: false, error: error.message } });
                    }
                }
            }
            
            // عرض النتائج
            resultsContent.innerHTML = '';
            results.forEach(({ file, result }) => {
                const resultDiv = document.createElement('div');
                resultDiv.className = 'result-item ' + (result.success ? 'success' : 'error');
                
                resultDiv.innerHTML = `
                    <h4>${result.success ? '✅' : '❌'} ${result.test_info?.test_name || file}</h4>
                    <div class="details">
                        <strong>النتيجة:</strong> ${result.success ? 'نجح' : 'فشل'}<br>
                        <strong>الرسالة:</strong> ${result.message || result.error || 'لا توجد رسالة'}<br>
                        <strong>الوقت:</strong> ${result.timestamp || 'غير محدد'}
                    </div>
                `;
                
                resultsContent.appendChild(resultDiv);
            });
        }
    </script>
</body>
</html>

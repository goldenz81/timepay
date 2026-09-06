<?php
/**
 * النظام الديناميكي - Dynamic System
 * 
 * هذا الملف يحتوي على معلومات عن النظام الديناميكي الجديد
 * وروابط للوصول إلى الملفات المختلفة
 */

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>النظام الديناميكي - Dynamic System</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            direction: rtl;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        .file-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        .file-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #3498db;
            transition: transform 0.2s;
        }
        .file-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .file-title {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .file-description {
            color: #666;
            margin-bottom: 15px;
            line-height: 1.5;
        }
        .file-link {
            display: inline-block;
            background: #3498db;
            color: white;
            padding: 8px 16px;
            text-decoration: none;
            border-radius: 4px;
            font-size: 14px;
            transition: background 0.2s;
        }
        .file-link:hover {
            background: #2980b9;
        }
        .status {
            background: #27ae60;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-left: 10px;
        }
        .info-box {
            background: #e8f4fd;
            border: 1px solid #bee5eb;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .info-box h3 {
            margin-top: 0;
            color: #0c5460;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 النظام الديناميكي - Dynamic System</h1>
        
        <div class="info-box">
            <h3>📋 معلومات النظام</h3>
            <p>هذا النظام الجديد يوفر إدارة ديناميكية كاملة للجداول والمعادلات والمتغيرات بدون الحاجة لتعديل الكود.</p>
            <p><strong>تاريخ الإنشاء:</strong> <?php echo date('Y-m-d H:i:s'); ?></p>
            <p><strong>الحالة:</strong> <span class="status">جاهز للاستخدام</span></p>
        </div>

        <h2>📁 ملفات النظام</h2>
        <div class="file-list">
            <div class="file-card">
                <div class="file-title">🔧 DynamicFormulaEngine.php</div>
                <div class="file-description">
                    محرك المعادلات الديناميكي الأساسي. يتولى تقييم المعادلات، التحقق من صحتها، ومعالجة المتغيرات.
                </div>
                <a href="DynamicFormulaEngine.php" class="file-link">عرض الملف</a>
            </div>

            <div class="file-card">
                <div class="file-title">🌐 dynamic_system_api.php</div>
                <div class="file-description">
                    API الرئيسي للنظام الديناميكي. يوفر جميع العمليات المطلوبة لإدارة الجداول والمعادلات والمتغيرات.
                </div>
                <a href="dynamic_system_api.php?action=get_tables" class="file-link">اختبار API</a>
            </div>

            <div class="file-card">
                <div class="file-title">🗄️ create_dynamic_tables.php</div>
                <div class="file-description">
                    سكريبت إنشاء الجداول الجديدة في قاعدة البيانات. يجب تشغيله مرة واحدة فقط.
                </div>
                <a href="create_dynamic_tables.php" class="file-link">تشغيل السكريبت</a>
            </div>

            <div class="file-card">
                <div class="file-title">📊 insert_basic_data.php</div>
                <div class="file-description">
                    سكريبت إدراج البيانات الأساسية (الجداول، المتغيرات، المعادلات). يجب تشغيله بعد إنشاء الجداول.
                </div>
                <a href="insert_basic_data.php" class="file-link">تشغيل السكريبت</a>
            </div>

            <div class="file-card">
                <div class="file-title">📖 README.md</div>
                <div class="file-description">
                    دليل شامل للنظام الديناميكي. يحتوي على جميع المعلومات المطلوبة للفهم والاستخدام.
                </div>
                <a href="README.md" class="file-link">عرض الدليل</a>
            </div>
        </div>

        <div class="info-box">
            <h3>🚀 خطوات التشغيل</h3>
            <ol>
                <li>تشغيل <code>create_dynamic_tables.php</code> لإنشاء الجداول</li>
                <li>تشغيل <code>insert_basic_data.php</code> لإدراج البيانات الأساسية</li>
                <li>استخدام <code>dynamic_system_api.php</code> للتفاعل مع النظام</li>
                <li>استخدام <code>DynamicFormulaEngine.php</code> لتقييم المعادلات</li>
            </ol>
        </div>

        <div class="info-box">
            <h3>🔗 روابط مفيدة</h3>
            <ul>
                <li><a href="../dynamic_system_api.php?action=get_tables">عرض الجداول</a></li>
                <li><a href="../dynamic_system_api.php?action=get_formulas">عرض المعادلات</a></li>
                <li><a href="../dynamic_system_api.php?action=get_variables">عرض المتغيرات</a></li>
                <li><a href="../../src/pages/DynamicSystemManager.js">واجهة الإدارة</a></li>
            </ul>
        </div>
    </div>
</body>
</html>

# حل مشكلة phpMyAdmin Error

## المشكلة
عند محاولة رفع قاعدة البيانات من سيرفر التطوير إلى سيرفر الإنتاج عبر phpMyAdmin، يظهر الخطأ:

```
Notice: Trying to get property 'keyword' of non-object
```

## السبب
هذا الخطأ يحدث بسبب:
1. تعليقات في ملف SQL قد تسبب مشاكل في parser الخاص بـ phpMyAdmin
2. بعض عبارات SQL غير معيارية
3. مشاكل في ترميز الأحرف العربية في التعليقات

## الحلول

### الحل 1: استخدام سكريبت التصدير المخصص (موصى به)

قم بتشغيل السكريبت الذي ينشئ ملف SQL نظيف:

```powershell
.\export-db-for-production.ps1
```

هذا السكريبت يقوم بـ:
- تصدير قاعدة البيانات بدون تعليقات
- استخدام إعدادات آمنة لـ phpMyAdmin
- إنشاء ملف SQL نظيف جاهز للرفع

### الحل 2: تنظيف ملف SQL موجود

إذا كان لديك ملف SQL موجود وتريد تنظيفه:

```powershell
.\clean-sql-for-phpmyadmin.ps1 -InputFile "backups\your_file.sql"
```

### الحل 3: استخدام mysqldump مباشرة

استخدم mysqldump مع الخيارات التالية:

```bash
mysqldump -u root -p --skip-comments --skip-add-locks --skip-disable-keys timepay_unified > backup.sql
```

### الحل 4: رفع قاعدة البيانات عبر سطر الأوامر (الأفضل)

بدلاً من phpMyAdmin، استخدم MySQL command line:

**على سيرفر الإنتاج:**
```bash
mysql -u [username] -p [database_name] < backup.sql
```

**أو عبر SSH:**
```bash
# على سيرفر التطوير
mysqldump -u root -p timepay_unified > backup.sql

# رفع الملف إلى الإنتاج
scp backup.sql user@production-server:/path/

# على سيرفر الإنتاج
mysql -u [user] -p [database] < backup.sql
```

### الحل 5: تجاهل الخطأ (إذا كان Notice فقط)

إذا كان الخطأ مجرد Notice وليس Error، يمكنك:
1. تجاهل التحذيرات
2. التأكد من أن قاعدة البيانات تم رفعها بنجاح
3. التحقق من البيانات بعد الرفع

## خطوات الرفع الآمنة

1. **تصدير قاعدة البيانات:**
   ```powershell
   .\export-db-for-production.ps1
   ```

2. **رفع الملف إلى سيرفر الإنتاج:**
   - عبر FTP/SFTP
   - أو عبر phpMyAdmin (استخدم الملف النظيف)

3. **استيراد قاعدة البيانات:**
   - عبر phpMyAdmin: Import → Choose File → Go
   - أو عبر سطر الأوامر (أفضل)

## ملاحظات مهمة

- تأكد من نسخ احتياطي لقاعدة البيانات على الإنتاج قبل الرفع
- تحقق من إعدادات قاعدة البيانات على الإنتاج (charset, collation)
- تأكد من أن حجم الملف لا يتجاوز الحد الأقصى المسموح في phpMyAdmin
- إذا كان الملف كبيراً، قم بتقسيمه أو استخدم سطر الأوامر

## إعدادات قاعدة البيانات للإنتاج

من ملف `api/config.php`:
- Host: localhost
- Database: u362313043_timepayDB
- Username: u362313043_timepay
- Password: BR5E;Sa*8|Oe

## استكشاف الأخطاء

إذا استمرت المشكلة:
1. تحقق من إصدار phpMyAdmin (قد تحتاج تحديث)
2. تحقق من إعدادات PHP (memory_limit, max_execution_time)
3. استخدم طريقة سطر الأوامر بدلاً من phpMyAdmin
4. قم بتقسيم ملف SQL إلى أجزاء أصغر

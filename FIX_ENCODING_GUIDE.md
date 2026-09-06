# دليل إصلاح مشكلة الترميز في قاعدة البيانات

## المشكلة
النصوص العربية تظهر كرموز غريبة مثل `╪د╪ص┘à╪»` بدلاً من النصوص الصحيحة.

## السبب
البيانات في قاعدة البيانات مخزنة بترميز خاطئ (مثل Windows-1256 أو ISO-8859-1) بدلاً من UTF-8.

## الحل

### الطريقة 1: إصلاح قاعدة البيانات ثم التصدير (موصى به)

1. **إنشاء نسخة احتياطية:**
   ```powershell
   .\backup_database.ps1
   ```

2. **إصلاح الترميز في قاعدة البيانات:**
   ```powershell
   .\fix-database-encoding.ps1
   ```
   ⚠️ **تحذير:** هذا سيقوم بتعديل قاعدة البيانات. تأكد من وجود نسخة احتياطية!

3. **تصدير قاعدة البيانات بعد الإصلاح:**
   ```powershell
   .\export-db-utf8mb4-final.ps1
   ```

### الطريقة 2: إصلاح يدوي عبر phpMyAdmin

1. افتح phpMyAdmin
2. اختر قاعدة البيانات `timepay_unified`
3. اضغط على تبويب "Operations"
4. في قسم "Collation":
   - اختر: `utf8mb4_unicode_ci`
   - اضغط "Go"
5. لكل جدول:
   - افتح الجدول
   - اضغط "Operations"
   - في "Table options" → "Collation": اختر `utf8mb4_unicode_ci`
   - اضغط "Go"

### الطريقة 3: إصلاح عبر SQL مباشرة

قم بتشغيل هذا SQL في phpMyAdmin:

```sql
-- إصلاح قاعدة البيانات
ALTER DATABASE `timepay_unified` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- إصلاح كل الجداول
ALTER TABLE `employees` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `attendance_logs` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `fingerprint_attendance` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ... (كرر لكل جدول)
```

### الطريقة 4: إصلاح البيانات الموجودة

إذا كانت البيانات نفسها مخزنة بترميز خاطئ، قد تحتاج إلى:

1. تصدير البيانات
2. تحويل الترميز
3. استيرادها مرة أخرى

استخدم هذا السكريبت:

```powershell
# تصدير
.\backup_database.ps1

# تحويل الترميز (إذا لزم الأمر)
# افتح الملف في Notepad++ وافتحه كـ Windows-1256
# ثم احفظه كـ UTF-8

# استيراد
mysql -u root -p timepay_unified < backup.sql
```

## التحقق من الترميز

بعد الإصلاح، تحقق من الترميز:

```sql
-- التحقق من ترميز قاعدة البيانات
SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME 
FROM information_schema.SCHEMATA 
WHERE SCHEMA_NAME = 'timepay_unified';

-- التحقق من ترميز الجداول
SELECT TABLE_NAME, TABLE_COLLATION 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'timepay_unified';
```

يجب أن تكون جميع القيم `utf8mb4_unicode_ci`.

## بعد الإصلاح

1. تصدير قاعدة البيانات:
   ```powershell
   .\export-db-utf8mb4-final.ps1
   ```

2. رفع الملف إلى سيرفر الإنتاج

3. استيراد قاعدة البيانات على الإنتاج

## ملاحظات مهمة

- ⚠️ **احتفظ بنسخة احتياطية دائماً قبل أي تعديل**
- تأكد من أن قاعدة البيانات على الإنتاج تستخدم `utf8mb4_unicode_ci`
- عند الاستيراد في phpMyAdmin، اختر "UTF-8" في خيارات الاستيراد
- إذا استمرت المشكلة، قد تكون البيانات نفسها مخزنة بترميز خاطئ وتحتاج إعادة إدخال

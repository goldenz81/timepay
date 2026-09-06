# تحليل جدول `salary_columns`

## الوضع الحالي:

جدول `salary_columns` موجود في قاعدة البيانات لكنه **لا يُستخدم في النظام الحالي**.

## الاستخدامات الموجودة:

### 1. **في النظام القديم** (`api/simplified_salary_manager.php`):
   - ✅ لا يزال الملف موجوداً
   - ⚠️ لكنه **غير مستخدم** في الواجهة الأمامية الحالية
   - يستخدم `salary_columns` لإدارة الأعمدة

### 2. **في النظام الجديد** (`api/dynamic_system/dynamic_system_api.php`):
   - ⚠️ يوجد **استخدامات محدودة جداً** في سطور:
     - السطر 1329-1330: تحديث `display_order` في `salary_columns`
     - السطر 1438: تحديث `is_visible` في `salary_columns`
     - السطر 1444: إدراج في `salary_columns`
   - ⚠️ لكن هذه الاستخدامات قد تكون **كود قديم غير مستخدم**

### 3. **في سكريبتات الترحيل**:
   - `migrate_salary_columns_badge_fields.php` - لإضافة حقول `badge_color` و `badge_variant`
   - `create_dynamic_tables.php` - لإنشاء View للتوافق مع النظام القديم

## النظام الحالي:

النظام الحالي يستخدم جداول جديدة:
- ✅ `net_weekly_wage`
- ✅ `weekly_wage_entitlements`
- ✅ `weekly_wage_deductions`
- ✅ `net_monthly_salary`
- ✅ `monthly_salary_entitlements_columns`
- ✅ `monthly_salary_deductions_columns`

## التوصية:

### الخيار 1: **حذف الجدول** (إذا كنت متأكداً أنه غير مستخدم):
```sql
-- تحذير: تأكد من عمل backup أولاً!
DROP TABLE IF EXISTS salary_columns;
```

### الخيار 2: **الاحتفاظ به** (إذا كان هناك احتمال للرجوع إليه):
- يمكن الاحتفاظ به كـ backup للبيانات القديمة
- لكن لن يؤثر على النظام الحالي

### الخيار 3: **تنظيف الكود** (إزالة الاستخدامات القديمة):
- إزالة الاستخدامات في `dynamic_system_api.php` (السطور 1329-1330, 1438, 1444)
- التأكد من أن النظام يعمل بدونها

## كيفية التحقق:

1. **ابحث في الكود**:
   ```bash
   grep -r "salary_columns" api/ src/
   ```

2. **تحقق من الاستخدامات الفعلية**:
   - افتح `api/dynamic_system/dynamic_system_api.php`
   - ابحث عن `salary_columns`
   - تحقق إذا كانت هذه الأكواد تُنفذ فعلياً

3. **اختبر النظام**:
   - تأكد أن النظام يعمل بدون `salary_columns`
   - إذا كان يعمل، يمكن حذفه بأمان

## الخلاصة:

⚠️ **جدول `salary_columns` لا يزال يُستخدم في بعض الأماكن**:

### الاستخدامات الفعلية:

1. **`swap_column_order`** (السطر 1315-1343 في `dynamic_system_api.php`):
   - ✅ **لا يزال يُستخدم** في `PremiumWeeklySalary.js` (السطر 1511)
   - ⚠️ لكن النظام الحالي يستخدم `update_columns_order_and_visibility` بدلاً منه
   - ⚠️ قد يكون `moveColumn` دالة قديمة غير مستخدمة

2. **`apply_template`** (السطر 1424-1465 في `dynamic_system_api.php`):
   - ❓ غير واضح إذا كان يُستخدم في الواجهة الأمامية

## التوصية النهائية:

### 1. **التحقق من الاستخدام الفعلي**:
   - ابحث في الواجهة الأمامية عن `moveColumn` - هل لا يزال يُستخدم؟
   - إذا كان `moveColumn` غير مستخدم، يمكن إزالة `swap_column_order`
   - ابحث عن `apply_template` - هل يُستخدم؟

### 2. **إذا كان غير مستخدم**:
   - يمكن حذف الجدول بأمان بعد عمل backup
   - أو إزالة الكود القديم من `dynamic_system_api.php`

### 3. **إذا كان مستخدماً**:
   - يجب تحديث الكود لاستخدام الجداول الجديدة بدلاً من `salary_columns`:
     - `weekly_wage_entitlements` بدلاً من `salary_columns` (table_id = 2)
     - `monthly_salary_entitlements_columns` بدلاً من `salary_columns` (table_id = 4)

### 4. **الحل الموصى به**:
   - تحديث `swap_column_order` لاستخدام الجداول الجديدة
   - إزالة الاعتماد على `salary_columns` تماماً
   - الاحتفاظ بالجدول كـ backup فقط


++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++





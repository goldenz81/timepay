# تقرير استخدام قواعد البيانات

## ملخص
- **قاعدة البيانات الجديدة:** `timepay_unified` ✅ (مستخدمة في معظم النظام)
- **قاعدة البيانات القديمة:** `timepay` ⚠️ (لا تزال موجودة في بعض الملفات غير المستخدمة)

---

## الملفات التي تستخدم `timepay_unified` (الجديدة) ✅

### ملفات API النشطة:
1. **`api/unified_employees_api.php`** - يستخدم `config_unified.php` → `timepay_unified`
2. **`api/attendance_logs.php`** - يستخدم `timepay_unified` مباشرة
3. **`api/unified_salary_api_v2.php`** - يستخدم `config_unified.php` → `timepay_unified`
4. **`api/simple_attendance_api.php`** - يستخدم `timepay_unified` مباشرة
5. **`api/departments.php`** - يستخدم `Database::getConnection()` → `database_config.php` → `timepay_unified`
6. **`api/get_alerts.php`** - يستخدم `database_config.php` → `timepay_unified`
7. **`api/get_recent_activities.php`** - يستخدم `database_config.php` → `timepay_unified`
8. **`api/dynamic_system/dynamic_system_api.php`** - يستخدم `config_unified.php` → `timepay_unified`

### ملفات الإعداد:
- **`api/config_unified.php`** - يحدد `timepay_unified`
- **`config/database_config.php`** - يحدد `timepay_unified`

---

## الملفات التي لا تزال تستخدم `timepay` (القديمة) ⚠️

### ملفات API (غير مستخدمة في الكود الحالي):
1. **`api/employees.php`** - يستخدم `timepay`
   - **الحالة:** تم تحديث الصفحة الرئيسية لاستخدام `unified_employees_api.php` بدلاً منه
   - **التوصية:** يمكن حذفه أو تحديثه لاستخدام `timepay_unified`

2. **`api/attendance.php`** - يستخدم `timepay`
   - **الحالة:** لا يبدو أنه مستخدم في الكود الحالي
   - **التوصية:** يمكن حذفه أو تحديثه لاستخدام `timepay_unified`

3. **`api/get_attendance_history.php`** - يستخدم `timepay`
   - **الحالة:** لا يبدو أنه مستخدم في الكود الحالي
   - **التوصية:** يمكن حذفه أو تحديثه لاستخدام `timepay_unified`

### ملفات في مجلد `_unused`:
- جميع الملفات في `api/_unused/` تستخدم `timepay` القديمة
- هذه الملفات غير مستخدمة ويمكن تجاهلها

### ملفات في مجلد `backup_unused_files_20250919`:
- جميع الملفات في هذا المجلد تستخدم `timepay` القديمة
- هذه ملفات احتياطية قديمة ويمكن تجاهلها

---

## الصفحات التي تستخدم `timepay_unified` ✅

1. **الصفحة الرئيسية (`/`)** - `PremiumDashboard.js`
   - يستخدم: `unified_employees_api.php`, `attendance_logs.php`, `departments.php`

2. **صفحة إدارة الموظفين (`/unified-employees`)** - `PremiumEmployees.js`
   - يستخدم: `unified_employees_api.php`

3. **صفحة إدارة الحضور (`/unified-attendance`)** - `ChakraAttendance.js`
   - يستخدم: `attendance_logs.php`, `simple_attendance_api.php`

4. **صفحة الراتب الأسبوعي (`/weekly-salary`)** - `PremiumWeeklySalary.js`
   - يستخدم: `unified_salary_api_v2.php`

5. **صفحة نظام إدارة الأعمدة (`/dynamic-system-manager`)**
   - يستخدم: `dynamic_system_api.php`

---

## التوصيات

### ✅ النظام الحالي:
- **معظم النظام يستخدم `timepay_unified` بشكل صحيح**
- **الصفحات الرئيسية جميعها متصلة بقاعدة البيانات الجديدة**

### ⚠️ ملفات قديمة يمكن تنظيفها:
1. `api/employees.php` - يمكن حذفه أو تحديثه
2. `api/attendance.php` - يمكن حذفه أو تحديثه
3. `api/get_attendance_history.php` - يمكن حذفه أو تحديثه

### 📝 ملاحظات:
- قاعدة البيانات القديمة `timepay` لا تزال موجودة ولكنها **غير مستخدمة** في النظام الحالي
- يمكن الاحتفاظ بها كنسخة احتياطية أو حذفها بعد التأكد من عدم الحاجة إليها

---

**تاريخ التقرير:** 2025-12-19
**الحالة:** ✅ النظام يستخدم `timepay_unified` بشكل صحيح


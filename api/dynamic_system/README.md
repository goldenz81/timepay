# النظام الديناميكي - Dynamic System

## 📁 محتويات المجلد

هذا المجلد يحتوي على جميع ملفات النظام الديناميكي الجديد الذي تم تطويره ليكون بديلاً عن النظام الحالي.

## 📋 الملفات الموجودة

### 1. **DynamicFormulaEngine.php**
- **الوصف:** محرك المعادلات الديناميكي الأساسي
- **الوظيفة:** تقييم المعادلات، التحقق من صحتها، معالجة المتغيرات
- **الميزات:**
  - تقييم المعادلات المعقدة
  - معالجة المعادلات الخاصة (CASE WHEN, ternary operators)
  - تحويل آمن للمعادلات إلى PHP
  - إدارة متغيرات النظام

### 2. **dynamic_system_api.php**
- **الوصف:** API الرئيسي للنظام الديناميكي
- **الوظيفة:** إدارة الجداول، الأعمدة، المعادلات، والمتغيرات
- **الإجراءات المتاحة:**
  - `get_tables` - جلب الجداول
  - `get_columns` - جلب الأعمدة
  - `get_formulas` - جلب المعادلات
  - `get_variables` - جلب المتغيرات
  - `test_formula` - اختبار المعادلات
  - `validate_formula` - التحقق من صحة المعادلات
  - `create_table` - إنشاء جدول جديد
  - `create_column` - إنشاء عمود جديد
  - `create_formula` - إنشاء معادلة جديدة
  - `create_variable` - إنشاء متغير جديد

### 3. **create_dynamic_tables.php**
- **الوصف:** سكريبت إنشاء الجداول الجديدة
- **الوظيفة:** إنشاء جميع الجداول المطلوبة للنظام الديناميكي
- **الجداول المنشأة:**
  - `dynamic_tables` - الجداول الديناميكية
  - `dynamic_columns` - الأعمدة الديناميكية
  - `dynamic_formulas` - المعادلات الديناميكية
  - `column_formula_mappings` - ربط الأعمدة بالمعادلات
  - `system_variables` - متغيرات النظام

### 4. **insert_basic_data.php**
- **الوصف:** سكريبت إدراج البيانات الأساسية
- **الوظيفة:** إدراج الجداول والمتغيرات والمعادلات الأساسية
- **البيانات المدرجة:**
  - الجداول الأساسية (salary_summary, attendance_logs, etc.)
  - متغيرات النظام (meal_allowance_per_day, official_start_time, etc.)
  - المعادلات الأساسية (attendance_bonus, insurance_amount_weekly_monthly, etc.)

## 🗄️ قاعدة البيانات

### الجداول الجديدة:

#### 1. **dynamic_tables**
```sql
- id (INT, PRIMARY KEY)
- table_name (VARCHAR(100), UNIQUE)
- display_name_ar (VARCHAR(200))
- display_name_en (VARCHAR(200))
- table_type (ENUM: main, virtual, calculation)
- parent_table (VARCHAR(100), NULL)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

#### 2. **dynamic_columns**
```sql
- id (INT, PRIMARY KEY)
- table_id (INT, FOREIGN KEY)
- column_name (VARCHAR(100))
- display_name_ar (VARCHAR(200))
- display_name_en (VARCHAR(200))
- data_type (ENUM: number, text, date, boolean, currency)
- is_calculated (BOOLEAN)
- is_editable (BOOLEAN)
- is_required (BOOLEAN)
- default_value (VARCHAR(500))
- validation_rules (JSON)
- display_order (INT)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

#### 3. **dynamic_formulas**
```sql
- id (INT, PRIMARY KEY)
- formula_key (VARCHAR(100), UNIQUE)
- formula_name_ar (VARCHAR(200))
- formula_name_en (VARCHAR(200))
- formula_expression (TEXT)
- formula_type (ENUM: calculation, validation, display)
- return_type (ENUM: number, text, boolean, currency)
- description_ar (TEXT)
- description_en (TEXT)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

#### 4. **column_formula_mappings**
```sql
- id (INT, PRIMARY KEY)
- column_id (INT, FOREIGN KEY)
- formula_id (INT, FOREIGN KEY)
- mapping_type (ENUM: calculation, validation, display)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

#### 5. **system_variables**
```sql
- id (INT, PRIMARY KEY)
- variable_key (VARCHAR(100), UNIQUE)
- variable_name_ar (VARCHAR(200))
- variable_name_en (VARCHAR(200))
- variable_value (TEXT)
- variable_type (ENUM: number, text, date, boolean, currency, time)
- category (VARCHAR(100))
- is_editable (BOOLEAN)
- is_required (BOOLEAN)
- validation_rules (JSON)
- description_ar (TEXT)
- description_en (TEXT)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

## 🚀 كيفية الاستخدام

### 1. إنشاء الجداول:
```bash
php api/dynamic_system/create_dynamic_tables.php
```

### 2. إدراج البيانات الأساسية:
```bash
php api/dynamic_system/insert_basic_data.php
```

### 3. استخدام API:
```javascript
// جلب الجداول
fetch('api/dynamic_system/dynamic_system_api.php?action=get_tables')

// اختبار معادلة
fetch('api/dynamic_system/dynamic_system_api.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        action: 'test_formula',
        formula_key: 'attendance_bonus',
        test_variables: { salary_type: 'Weekly', on_time_days: 5 }
    })
})
```

## 🔧 الميزات الجديدة

1. **نظام ديناميكي بالكامل** - لا حاجة لتعديل الكود
2. **معادلات قابلة للتخصيص** - إضافة وتعديل المعادلات من الواجهة
3. **متغيرات النظام** - إدارة جميع متغيرات النظام من مكان واحد
4. **جداول افتراضية** - دعم الجداول الافتراضية للمستحقات والمستقطعات
5. **اختبار المعادلات** - اختبار المعادلات قبل تطبيقها
6. **التحقق من الصحة** - التحقق من صحة المعادلات تلقائياً

## 📝 ملاحظات

- جميع الملفات تستخدم `config_unified.php` للاتصال بقاعدة البيانات
- النظام متوافق مع النظام الحالي ولا يؤثر عليه
- يمكن تشغيل النظام الجديد بالتوازي مع النظام الحالي
- جميع المعادلات الحالية مدعومة في النظام الجديد

## 🔄 التحديثات المستقبلية

- إضافة المزيد من أنواع البيانات
- دعم المعادلات المعقدة أكثر
- واجهة مستخدم محسنة
- نظام النسخ الاحتياطي للمعادلات
- تصدير/استيراد المعادلات

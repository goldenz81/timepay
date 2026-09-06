# إصلاح مراجع الأعمدة لضمان الفصل بين الراتب الأسبوعي والشهري

## المشكلة:

"إجمالي المستحقات" للراتب الأسبوعي و"إجمالي المستحقات" للراتب الشهري مختلفان لأن لديهما:
- جداول منفصلة: `net_weekly_wage` و `net_monthly_salary`
- معادلات مختلفة
- قيم مختلفة

## الحل:

يجب أن يكون لكل جدول مراجعه الخاص:
- `weekly_wage_entitlements` → يحصل على المراجع من `net_weekly_wage`
- `monthly_salary_entitlements_columns` → يحصل على المراجع من `net_monthly_salary`

## كيفية التنفيذ:

1. افتح phpMyAdmin
2. اختر قاعدة البيانات `timepay_unified`
3. افتح تبويب SQL
4. انسخ محتوى ملف `check_and_fix_column_references.sql`
5. الصق المحتوى واضغط "تنفيذ"

## ما يفعله السكريبت:

1. **يعرض المراجع الحالية** - للتحقق من الوضع الحالي
2. **يحذف المراجع الخاطئة**:
   - حذف مراجع من `net_weekly_wage` لـ `monthly_salary_entitlements_columns`
   - حذف مراجع من `net_monthly_salary` لـ `weekly_wage_entitlements`
3. **ينشئ المراجع الصحيحة**:
   - لـ `weekly_wage_entitlements`: مراجع من `net_weekly_wage`
   - لـ `monthly_salary_entitlements_columns`: مراجع من `net_monthly_salary`
4. **يعرض النتائج النهائية** - للتحقق من أن كل شيء صحيح

## النتيجة المتوقعة:

بعد التنفيذ:
- ✅ `weekly_wage_entitlements` سيحصل على "إجمالي المستحقات" من `net_weekly_wage.total_entitlements` (معادلة أسبوعية)
- ✅ `monthly_salary_entitlements_columns` سيحصل على "إجمالي المستحقات" من `net_monthly_salary.total_entitlements` (معادلة شهرية)
- ✅ كل جدول سيحصل على المراجع من الجدول الصحيح
- ✅ لن يكون هناك تداخل بين الجداول الأسبوعية والشهرية


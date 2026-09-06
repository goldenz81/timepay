# نظام النماذج الموحد (Unified Form System)

## نظرة عامة
نظام نماذج موحد وجميل تم إنشاؤه لحل مشاكل التضارب في المكتبات المختلفة المستخدمة في التطبيق.

## المكونات المتاحة

### 1. Form
مكون أساسي لتغليف النماذج
```jsx
<Form onSubmit={handleSubmit} loading={false}>
  {/* محتوى النموذج */}
</Form>
```

### 2. FormGroup
مكون لتجميع العناصر مع التسميات والأخطاء
```jsx
<FormGroup label="اسم المستخدم" error="هذا الحقل مطلوب" required>
  <Input value={username} onChange={handleChange} />
</FormGroup>
```

### 3. Input
مكون إدخال النصوص
```jsx
<Input
  label="اسم المستخدم"
  value={username}
  onChange={handleChange}
  placeholder="أدخل اسم المستخدم"
  icon={Icons.User}
  required
/>
```

### 4. Select
مكون القوائم المنسدلة
```jsx
<Select
  label="نوع الساعة"
  value={timeFormat}
  onChange={handleChange}
  icon={Icons.Clock}
  variant="modern"
  options={[
    { value: '12', label: '12 ساعة' },
    { value: '24', label: '24 ساعة' }
  ]}
/>
```

### 5. Textarea
مكون إدخال النصوص الطويلة
```jsx
<Textarea
  label="الوصف"
  value={description}
  onChange={handleChange}
  rows={4}
/>
```

### 6. Switch
مكون المفتاح
```jsx
<Switch
  label="تفعيل الإشعارات"
  description="تلقي إشعارات على البريد الإلكتروني"
  checked={notifications}
  onChange={handleChange}
/>
```

### 7. Checkbox
مكون مربع الاختيار
```jsx
<Checkbox
  label="أوافق على الشروط"
  checked={agreed}
  onChange={handleChange}
/>
```

### 8. TimeInput
مكون إدخال الوقت
```jsx
<TimeInput
  label="ساعة بدء العمل"
  value={startTime}
  onChange={handleChange}
/>
```

### 9. NumberInput
مكون إدخال الأرقام
```jsx
<NumberInput
  label="الراتب"
  value={salary}
  onChange={handleChange}
  icon={Icons.DollarSign}
  min={0}
  max={100000}
/>
```

### 10. Button
مكون الأزرار
```jsx
<Button
  variant="primary"
  size="md"
  loading={false}
  icon={Icons.Save}
  onClick={handleClick}
>
  حفظ
</Button>
```

## المتغيرات (Variants)

### Select Variants
- `default` - التصميم الافتراضي
- `minimal` - تصميم بسيط
- `elegant` - تصميم أنيق
- `modern` - تصميم عصري

### Button Variants
- `primary` - أساسي (أزرق)
- `secondary` - ثانوي (رمادي)
- `success` - نجاح (أخضر)
- `danger` - خطر (أحمر)
- `warning` - تحذير (أصفر)
- `info` - معلومات (أزرق فاتح)
- `outline` - مخطط

### Button Sizes
- `sm` - صغير
- `md` - متوسط (افتراضي)
- `lg` - كبير

## الأيقونات المتاحة
```jsx
import { Icons } from '../ui';

// استخدام الأيقونات
<Input icon={Icons.User} />
<Select icon={Icons.Clock} />
<Button icon={Icons.Save} />
```

## الميزات
- ✅ تصميم موحد وجميل
- ✅ دعم كامل للغة العربية
- ✅ تأثيرات بصرية متقدمة
- ✅ معالجة الأخطاء
- ✅ دعم الأيقونات
- ✅ إمكانية التخصيص
- ✅ أداء عالي
- ✅ سهولة الاستخدام

## الاستخدام
```jsx
import { Input, Select, Button, Icons } from '../ui';

function MyComponent() {
  return (
    <div>
      <Input
        label="اسم المستخدم"
        value={username}
        onChange={handleChange}
        icon={Icons.User}
        required
      />
      <Select
        label="الدولة"
        value={country}
        onChange={handleChange}
        options={countries}
        variant="modern"
      />
      <Button
        variant="primary"
        onClick={handleSubmit}
        icon={Icons.Save}
      >
        حفظ
      </Button>
    </div>
  );
}
```

## الهجرة من النظام القديم
تم استبدال جميع المكونات القديمة:
- `ProfessionalInput` → `Input`
- `ProfessionalSelect` → `Select`
- `ProfessionalTimeInput` → `TimeInput`
- `ProfessionalSwitch` → `Switch`
- `ProfessionalCheckbox` → `Checkbox`
- `ProfessionalNumberInput` → `NumberInput`

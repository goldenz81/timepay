import { resolveWeeklySalaryDataKey } from '../resolveWeeklySalaryDataKey';

describe('resolveWeeklySalaryDataKey', () => {
  it('يُرجع column_key مباشرة إن وُجد', () => {
    expect(resolveWeeklySalaryDataKey({ column_key: 'base_salary' }, null)).toBe('base_salary');
  });

  it('يحلّ الاسم العربي للراتب الأساسي', () => {
    expect(resolveWeeklySalaryDataKey({ display_name_ar: 'الراتب الأساسي' }, null)).toBe('base_salary');
  });

  it('يختار مفتاح الإضافي من بيانات الموظف', () => {
    const emp = { overtime_hours: 5, regular_overtime_hours: 3 };
    expect(resolveWeeklySalaryDataKey({ display_name_ar: 'ساعات الإضافي' }, emp)).toBe('regular_overtime_hours');
  });
});

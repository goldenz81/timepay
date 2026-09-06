import {
  escapeHtmlLite,
  filterWeeklySalaryRows,
} from '../weeklySalaryHelpers';

describe('escapeHtmlLite', () => {
  it('يهرب الأحرف الخاصة في HTML', () => {
    expect(escapeHtmlLite('<script>"x"&</script>')).toBe(
      '&lt;script&gt;&quot;x&quot;&amp;&lt;/script&gt;'
    );
  });

  it('يتعامل مع null و undefined', () => {
    expect(escapeHtmlLite(null)).toBe('');
    expect(escapeHtmlLite(undefined)).toBe('');
  });
});

describe('filterWeeklySalaryRows', () => {
  const rows = [
    { name: 'أحمد', employee_code: 'E001', salary_type: 'Weekly', department: 'IT', base_salary: 100 },
    { name: 'سارة', employee_code: 'E002', salary_type: 'Monthly', department: 'HR', base_salary: 200 },
    { name: 'محمد', employee_code: 'E003', salary_type: 'Weekly', department: 'IT', base_salary: 150 },
  ];

  it('يُرجع الأسبوعيين فقط', () => {
    expect(filterWeeklySalaryRows(rows, '', '', null)).toHaveLength(2);
  });

  it('يفلتر بالبحث والقسم', () => {
    const result = filterWeeklySalaryRows(rows, 'أحمد', 'IT', null);
    expect(result).toHaveLength(1);
    expect(result[0].employee_code).toBe('E001');
  });

  it('يرتب الأعمدة الرقمية', () => {
    const sorted = filterWeeklySalaryRows(rows, '', '', { key: 'base_salary', direction: 'asc' });
    expect(sorted.map((r) => r.employee_code)).toEqual(['E001', 'E003']);
  });
});

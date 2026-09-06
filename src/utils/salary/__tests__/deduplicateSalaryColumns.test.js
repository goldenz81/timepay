import {
  deduplicateEntitlementsColumns,
  deduplicateDeductionColumns,
} from '../deduplicateSalaryColumns';

describe('deduplicateEntitlementsColumns', () => {
  it('يحتفظ بعمود reference عند تكرار column_key', () => {
    const normal = { id: 1, column_key: 'bonus', type: 'number', display_order: 1 };
    const reference = { id: 2, column_key: 'bonus', type: 'reference', display_order: 2 };
    const result = deduplicateEntitlementsColumns([normal, reference]);
    expect(result).toHaveLength(2);
    expect(result.some((c) => c.type === 'reference')).toBe(true);
  });

  it('يتجاهل العمود المكرر بنفس المفتاح (غير reference) ويحتفظ بالأقدم', () => {
    const older = { id: 1, column_key: 'transport', type: 'number', display_order: 1 };
    const newer = { id: 3, column_key: 'transport', type: 'number', display_order: 5 };
    const result = deduplicateEntitlementsColumns([older, newer]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('يستبدل العمود الأقدم بأحدث عند ترتيب أقل للمكرر', () => {
    const older = { id: 1, column_key: 'meal', type: 'number', display_order: 10 };
    const newer = { id: 2, column_key: 'meal', type: 'number', display_order: 2 };
    const result = deduplicateEntitlementsColumns([older, newer]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('يتعامل مع total_entitlements كعمود مميز', () => {
    const total = { id: 99, column_key: 'total_entitlements', type: 'reference' };
    const dup = { id: 100, column_key: 'total_entitlements', type: 'number' };
    const result = deduplicateEntitlementsColumns([total, dup]);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].column_key).toBe('total_entitlements');
  });
});

describe('deduplicateDeductionColumns', () => {
  it('يزيل التكرار بـ column_key', () => {
    const cols = [
      { id: 1, column_key: 'insurance', display_name_ar: 'تأمين' },
      { id: 2, column_key: 'insurance', display_name_ar: 'تأمين مكرر' },
    ];
    expect(deduplicateDeductionColumns(cols)).toHaveLength(1);
  });

  it('يزيل التكرار بـ id', () => {
    const col = { id: 5, column_key: 'advance', display_name_ar: 'سلفة' };
    expect(deduplicateDeductionColumns([col, { ...col }])).toHaveLength(1);
  });
});

import dayjs from 'dayjs';
import {
  buildOneWeeklySlipBody,
  buildWeeklyDetailSlipPrintDocument,
  buildWeeklySlipsPrintDocument,
} from '../weeklySlipTemplate';

describe('weeklySlipTemplate', () => {
  const baseOptions = {
    selectedDateRange: [dayjs('2025-05-23'), dayjs('2025-05-29')],
    displayVisibleColumns: [],
    entitlementsColumns: [],
    deductionsColumns: [],
    fmtCurrency: (n) => `${n} ج.م`,
    settings: { companyName: 'شركة تجريبية' },
    mealAllowanceEnabled: true,
  };

  const employee = {
    employee_code: 'E001',
    name: 'أحمد',
    total_entitlements: 1000,
    total_deductions: 200,
    net_salary: 800,
    base_salary: 500,
  };

  it('buildOneWeeklySlipBody يُرجع HTML يحتوي اسم الشركة والموظف', () => {
    const html = buildOneWeeklySlipBody(employee, baseOptions);
    expect(html).toContain('شركة تجريبية');
    expect(html).toContain('أحمد');
    expect(html).toContain('E001');
    expect(html).toContain('صافي المرتب');
  });

  it('buildWeeklySlipsPrintDocument يُنشئ مستنداً كاملاً', () => {
    const doc = buildWeeklySlipsPrintDocument([employee], baseOptions);
    expect(doc).toContain('<!DOCTYPE html>');
    expect(doc).toContain('slip-page');
  });

  it('buildWeeklyDetailSlipPrintDocument يدعم قسم الحضور', () => {
    const doc = buildWeeklyDetailSlipPrintDocument(employee, {
      ...baseOptions,
      attendanceHtml: '<div class="att-test">حضور</div>',
    });
    expect(doc).toContain('slip-print-body-inner');
    expect(doc).toContain('attendance-workweek-print-wrap');
    expect(doc).toContain('att-test');
  });
});

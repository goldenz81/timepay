import dayjs from 'dayjs';
import { filterMealAllowanceFields } from '../utils/systemFeatureFlags';
import { formatBayatDaysLabel, formatOvertimeHoursPairLabel } from '../utils/salary/weeklySalaryHelpers';
import { resolveWeeklySalaryDataKey } from '../utils/salary/resolveWeeklySalaryDataKey';

export const WEEKLY_SLIP_PRINT_CSS = `
    @page { size: A5 portrait; margin: 8mm; }
    @media print { body { margin: 0 !important; padding: 6mm !important; } .no-print { display: none; } }
    * { box-sizing: border-box; }
    body { font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif; direction: rtl; text-align: right; padding: 6mm; margin: 0; font-size: 11px; line-height: 1.45; color: #000; }
    .header { text-align: center; margin-bottom: 10px; border-bottom: 3px solid #000; padding-bottom: 6px; }
    .company-name { font-size: 18px; font-weight: bold; margin-bottom: 3px; color: #000; }
    .title { font-size: 15px; font-weight: bold; margin: 4px 0; color: #000; }
    .date-range { font-size: 12px; margin: 3px 0; color: #333; }
    .payment-date { font-size: 11px; margin: 3px 0; color: #666; }
    .employee-info { margin: 10px 0; padding: 7px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .info-item { display: flex; justify-content: flex-start; align-items: center; gap: 5px; padding: 3px 0; border-bottom: 1px dotted #ccc; }
    .info-label { font-weight: bold; color: #333; white-space: nowrap; font-size: 10px;align-items: center; }
    .info-value { color: #000; text-align: right; font-size: 10px;align-items: center; }
    .content-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 10px 0 0 0; page-break-inside: avoid; }
    .print-totals-double { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; width: 100%; margin: 8px 0 10px 0; box-sizing: border-box; page-break-inside: avoid; }
    .print-totals-double-cell { display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; border-top: 2px solid #000; background-color: #f5f5f5; font-size: 11px; font-weight: bold; min-width: 0; box-sizing: border-box; }
    .print-totals-double-label { flex: 1; text-align: right; padding-left: 6px; min-width: 0; }
    .print-totals-double-value { flex: 0 0 auto; font-family: 'Courier New', monospace; text-align: left; white-space: nowrap; }
    .content-grid > .section { min-width: 0; }
    .section { margin: 0; border: 1px solid #ddd; border-radius: 4px; overflow: visible; }
    .section-title { font-size: 12px; font-weight: bold; background-color: #333; color: white; padding: 5px 7px; margin: 0; text-align: center; }
    .section-content { padding: 6px; background-color: #fff; }
    .section-item { display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; padding: 3px 0; border-bottom: 1px dotted #ccc; font-size: 10px; }
    .section-item:last-child { border-bottom: none; }
    .item-name { flex: 1 1 auto; min-width: 0; text-align: right; padding-right: 4px; white-space: nowrap; overflow: visible; }
    .item-value { flex: 0 0 52%; min-width: 0; text-align: left; font-weight: bold; font-family: 'Courier New', monospace; font-size: 10px; white-space: nowrap; overflow: visible; }
    .total-row { margin-top: 5px; padding-top: 5px; border-top: 2px solid #000; font-weight: bold; font-size: 11px; }
    .net-salary { margin-top: 10px; padding: 8px; background-color: #e8f5e9; border: 2px solid #4caf50; border-radius: 4px; text-align: center; page-break-inside: avoid; }
    .net-salary-label { font-size: 13px; font-weight: bold; color: #2e7d32; margin-bottom: 3px; }
    .net-salary-value { font-size: 18px; font-weight: bold; color: #000; font-family: 'Courier New', monospace; }
    .slip-page { page-break-after: always; }
    `;

/** تخطيط طباعة مودال التفاصيل (ورقة واحدة + توسيط) */
export const WEEKLY_SLIP_DETAIL_LAYOUT_CSS = `
    @media print {
      body {
        min-height: 100vh !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        align-items: stretch !important;
      }
    }
    html { height: 100%; }
    body {
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: stretch;
    }
    .slip-print-body-inner { width: 100%; flex-shrink: 0; }
    `;

/** جداول الحضور الأسبوعي في طباعة المودال */
export const WEEKLY_SLIP_ATTENDANCE_PRINT_CSS = `
    .attendance-workweek-print-wrap {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      margin-top: 10px;
      page-break-inside: avoid;
    }
    .attendance-workweek-block {
      margin-top: 0;
      padding-top: 8px;
      border-top: 1px dashed #999;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
    .att-workweek-wide {
      width: 100%;
      max-width: 100%;
      border-collapse: collapse;
      font-size: 8px;
      font-weight: normal;
      line-height: 1.25;
      font-family: 'Cairo', 'Tahoma', sans-serif;
      margin-top: 4px;
      table-layout: fixed;
      box-sizing: border-box;
    }
    .att-workweek-wide + .att-workweek-wide { margin-top: 8px; }
    .att-workweek-wide th,
    .att-workweek-wide td {
      border: none;
      padding: 4px 3px;
      vertical-align: middle;
      text-align: center;
      box-sizing: border-box;
    }
    .att-workweek-wide .att-wide-corner {
      width: 11%;
      max-width: 3.2em;
      background: #f2f2f2;
      font-weight: normal;
    }
    .att-workweek-wide .att-wide-day {
      font-weight: normal;
      background: #ececec;
      font-size: 8px;
    }
    .att-workweek-wide .att-wide-rowhead {
      font-weight: normal;
      background: #f2f2f2;
      font-size: 8px;
    }
    .att-workweek-wide .att-wide-cell {
      font-family: 'Courier New', monospace;
      font-weight: normal;
      white-space: nowrap;
      font-size: 8px;
    }
    .attendance-workweek-empty {
      font-size: 9px;
      color: #666;
      text-align: center;
      padding: 3px 0;
      line-height: 1.35;
      font-weight: normal;
    }
    `;

export const WEEKLY_SLIP_DETAIL_PRINT_CSS =
  WEEKLY_SLIP_PRINT_CSS + WEEKLY_SLIP_DETAIL_LAYOUT_CSS + WEEKLY_SLIP_ATTENDANCE_PRINT_CSS;

/**
 * @param {object} employee
 * @param {object} options
 */
export function buildOneWeeklySlipBody(employee, options) {
  if (!employee) return '';

  const {
    selectedDateRange,
    displayVisibleColumns = [],
    entitlementsColumns = [],
    deductionsColumns = [],
    fmtCurrency,
    resolveDataKey = resolveWeeklySalaryDataKey,
    settings,
    mealAllowanceEnabled,
    attendanceHtml = '',
    formatEmployeeName,
  } = options;

  const dateRange =
    selectedDateRange && selectedDateRange[0] && selectedDateRange[1]
      ? `${selectedDateRange[0].format('DD/MM/YYYY')} - ${selectedDateRange[1].format('DD/MM/YYYY')}`
      : '';

  const visibleColsForPrint = displayVisibleColumns
    .map((id) => entitlementsColumns.find((col) => col && col.id === id && col.is_visible !== 0))
    .filter((col) => col !== undefined);

  const otherColsForPrint = entitlementsColumns
    .filter((col) => col && col.is_visible !== 0 && !displayVisibleColumns.includes(col.id))
    .sort((a, b) => (a.display_order || 999) - (b.display_order || 999));

  const orderedEntitlementsColumns = [...visibleColsForPrint, ...otherColsForPrint];

  const requiredEntitlementsFields = filterMealAllowanceFields(
    [
      { key: 'base_salary', name: 'الأساسي', isCurrency: true },
      { key: 'discrimination_incentive_allowance', name: 'التمييز والحوافز', isCurrency: true },
      { key: 'regularity_days', name: 'أيام الانتظام', isCurrency: false },
      { key: 'regularity_pay', name: 'أجر الانتظام', isCurrency: true },
      { key: 'overtime_hours', name: 'ساعات الإضافي', isCurrency: false, specialFormat: true },
      { key: 'overtime_pay', name: 'أجر الإضافي', isCurrency: true },
      { key: 'transport_allowance', name: 'بدل المواصلات', isCurrency: true },
      { key: 'special_bonus', name: 'مكافأة خاصة', isCurrency: true },
    ],
    mealAllowanceEnabled
  );

  const bayatDays = parseFloat(employee?.bayat_days) || 0;
  if (bayatDays > 0) {
    const overtimeIdx = requiredEntitlementsFields.findIndex((f) => f.key === 'overtime_pay');
    const bayatField = {
      key: 'bayat_pay',
      name: `البيات (${formatBayatDaysLabel(bayatDays)})`,
      isCurrency: true,
    };
    if (overtimeIdx >= 0) requiredEntitlementsFields.splice(overtimeIdx + 1, 0, bayatField);
    else requiredEntitlementsFields.push(bayatField);
  }

  const entitlementsDataMap = new Map();

  orderedEntitlementsColumns
    .filter((col) => {
      const name = col.display_name_ar || col.column_name_ar || col.name || '';
      const key = col.column_key || col.column_name || col.name || '';
      return (
        name !== 'إجمالي المستحقات' &&
        key !== 'total_entitlements' &&
        name.toLowerCase() !== 'total_entitlements' &&
        name !== 'الأجر اليومي' &&
        name !== 'الأجر الأسبوعي' &&
        name !== 'أجر الساعة' &&
        key !== 'daily_wage' &&
        key !== 'weekly_wage' &&
        key !== 'hourly_wage'
      );
    })
    .forEach((col) => {
      const key = col.column_key || col.column_name || col.name || resolveDataKey(col, employee);
      const value = key ? parseFloat(employee?.[key]) || 0 : 0;
      const name = col.display_name_ar || col.column_name_ar || col.name;
      const formattedValue = col.is_currency
        ? fmtCurrency
          ? fmtCurrency(value)
          : `${value.toLocaleString()} ج.م`
        : String(value);
      entitlementsDataMap.set(key, { name, value: formattedValue, key });
    });

  requiredEntitlementsFields.forEach((field) => {
    let actualKey = field.key;
    if (field.key === 'special_bonus') actualKey = 'special_bonus_weekly';

    if (!entitlementsDataMap.has(field.key) && !entitlementsDataMap.has(actualKey)) {
      const value = parseFloat(employee?.[actualKey] || employee?.[field.key]) || 0;
      let formattedValue;
      if (field.specialFormat && field.key === 'overtime_hours') {
        const regularOvertime = parseFloat(employee?.regular_overtime_hours) || 0;
        const holidayOvertime = parseFloat(employee?.holiday_overtime_hours) || 0;
        formattedValue = formatOvertimeHoursPairLabel(
          regularOvertime,
          holidayOvertime,
          employee?.total_overtime_hours
        );
      } else {
        formattedValue = field.isCurrency
          ? fmtCurrency
            ? fmtCurrency(value)
            : `${value.toLocaleString()} ج.م`
          : String(value);
      }
      entitlementsDataMap.set(field.key, { name: field.name, value: formattedValue, key: field.key });
    } else if (field.specialFormat && field.key === 'overtime_hours') {
      const regularOvertime = parseFloat(employee?.regular_overtime_hours) || 0;
      const holidayOvertime = parseFloat(employee?.holiday_overtime_hours) || 0;
      const existingItem = entitlementsDataMap.get(field.key) || entitlementsDataMap.get(actualKey);
      if (existingItem) {
        existingItem.value = formatOvertimeHoursPairLabel(
          regularOvertime,
          holidayOvertime,
          employee?.total_overtime_hours
        );
      }
      if (entitlementsDataMap.has(actualKey) && !entitlementsDataMap.has(field.key)) {
        const item = entitlementsDataMap.get(actualKey);
        entitlementsDataMap.set(field.key, item);
        entitlementsDataMap.delete(actualKey);
      }
    }
  });

  const entitlementsData = requiredEntitlementsFields
    .map((field) => entitlementsDataMap.get(field.key))
    .filter(Boolean);

  const filteredEntitlementsData = entitlementsData.filter(
    (item) => item.name !== 'السلفة' && item.name !== 'سلفة' && !item.name?.includes('سلفة')
  );

  const requiredDeductionsFields = [
    { key: 'absence_days', name: 'أيام الغياب', isCurrency: false },
    { key: 'absence_deduction', name: 'خصم الغياب', isCurrency: true },
    { key: 'late_hours', name: 'ساعات التأخير', isCurrency: false },
    { key: 'late_deduction', name: 'خصم التأخير', isCurrency: true },
    { key: 'insurance_deduction', name: 'قيمة التأمين', isCurrency: true },
    { key: 'advance_installment', name: 'خصم السلفة', isCurrency: true, isAdvance: true },
    { key: 'early_leave_penalty', name: 'خصم الانصراف المبكر', isCurrency: true },
  ];

  const deductionsDataMap = new Map();

  deductionsColumns
    .filter((col) => col.is_visible !== 0)
    .filter((col) => {
      const name = col.display_name_ar || col.column_name_ar || col.name || '';
      const key = col.column_key || col.column_name || col.name || '';
      return (
        name !== 'إجمالي المستقطعات' &&
        key !== 'total_deductions' &&
        name.toLowerCase() !== 'total_deductions'
      );
    })
    .forEach((col) => {
      const key = col.column_key || col.column_name || col.name || resolveDataKey(col, employee);
      const value = key ? parseFloat(employee?.[key]) || 0 : 0;
      const formattedValue = col.is_currency
        ? fmtCurrency
          ? fmtCurrency(value)
          : `${value.toLocaleString()} ج.م`
        : String(value);
      const isAdvanceInstallment =
        col.display_name_ar === 'خصم السلفة' ||
        col.column_name === 'advance_installment' ||
        col.column_key === 'advance_installment';
      const installmentNumber = employee?.advance_installment_number || 0;
      const totalInstallments = employee?.total_installments || 0;
      const isDeferred = (employee?.advance_installment_is_paid ?? 0) === 2;
      const displayName =
        isAdvanceInstallment && isDeferred
          ? 'قسط مرحل للفترة التالية'
          : isAdvanceInstallment && installmentNumber > 0 && totalInstallments > 0
            ? `${col.display_name_ar || col.column_name_ar || col.name} (قسط ${installmentNumber} من أصل ${totalInstallments})`
            : col.display_name_ar || col.column_name_ar || col.name;
      deductionsDataMap.set(key, {
        name: displayName,
        value: isAdvanceInstallment && isDeferred ? '0.00 ج.م' : formattedValue,
        key,
      });
    });

  requiredDeductionsFields.forEach((field) => {
    if (!deductionsDataMap.has(field.key)) {
      let value = 0;
      let displayName = field.name;
      let formattedValue;
      if (field.isAdvance) {
        value = parseFloat(employee?.advance_installment || employee?.advance_installment_amount) || 0;
        const installmentNumber = employee?.advance_installment_number || 0;
        const totalInstallments = employee?.total_installments || 0;
        const isDeferred = (employee?.advance_installment_is_paid ?? 0) === 2;
        displayName =
          isDeferred
            ? 'قسط مرحل للفترة التالية'
            : installmentNumber > 0 && totalInstallments > 0
              ? `${field.name} (قسط ${installmentNumber} من أصل ${totalInstallments})`
              : field.name;
        formattedValue = isDeferred
          ? '0.00 ج.م'
          : fmtCurrency
            ? fmtCurrency(value)
            : `${value.toLocaleString()} ج.م`;
      } else {
        value = parseFloat(employee?.[field.key]) || 0;
        formattedValue = field.isCurrency
          ? fmtCurrency
            ? fmtCurrency(value)
            : `${value.toLocaleString()} ج.م`
          : String(value);
      }
      deductionsDataMap.set(field.key, { name: displayName, value: formattedValue, key: field.key });
    }
  });

  const deductionsData = requiredDeductionsFields
    .map((field) => deductionsDataMap.get(field.key))
    .filter(Boolean);

  const totalEntitlements = parseFloat(employee.total_entitlements) || 0;
  const totalDeductions = parseFloat(employee.total_deductions) || 0;
  const netSalary = parseFloat(employee.net_salary) || 0;
  const netSalaryRounded = Math.round(netSalary / 5) * 5;
  const position = employee?.position || '';
  const costCenter = employee?.cost_center || '';
  const positionCost =
    position && costCenter ? `${position} - ${costCenter}` : position || costCenter || '-';
  const employeeDisplayName = formatEmployeeName
    ? formatEmployeeName(employee)
    : employee?.name || employee?.employee_name || '-';
  const attendanceBlock = attendanceHtml
    ? `<div class="attendance-workweek-print-wrap"><div class="attendance-workweek-block">${attendanceHtml}</div></div>`
    : '';

  return `
  <div class="header">
    <div class="company-name">${settings?.companyName || settings?.company_name || 'اسم الشركة'}</div>
    <div class="title">صرف أجور العاملين</div>
    <div class="date-range">للفترة من ${dateRange}</div>
    <div class="payment-date">تاريخ الصرف: ${dayjs().format('DD/MM/YYYY')}</div>
  </div>
  <div class="employee-info">
    <div class="info-item"><span class="info-label">كود الموظف:</span><span class="info-value">${employee?.employee_code || '-'}</span></div>
    <div class="info-item"><span class="info-label">الاسم:</span><span class="info-value">${employeeDisplayName}</span></div>
    <div class="info-item"><span class="info-label">الموقع:</span><span class="info-value">${employee?.location || employee?.cost_center || '-'}</span></div>
    <div class="info-item"><span class="info-label">الوظيفة/التكلفة:</span><span class="info-value">${positionCost}</span></div>
  </div>
  <div class="content-grid">
    <div class="section">
      <div class="section-title">المستحقات</div>
      <div class="section-content">
        ${filteredEntitlementsData.map((item) => `<div class="section-item"><span class="item-name">${item.name}</span><span class="item-value">${item.value}</span></div>`).join('')}
      </div>
    </div>
    <div class="section">
      <div class="section-title">المستقطعات</div>
      <div class="section-content">
        ${deductionsData.map((item) => `<div class="section-item"><span class="item-name">${item.name}</span><span class="item-value">${item.value}</span></div>`).join('')}
      </div>
    </div>
  </div>
  <div class="print-totals-double" dir="rtl">
    <div class="print-totals-double-cell">
      <span class="print-totals-double-label">إجمالي المستحقات</span>
      <span class="print-totals-double-value">${fmtCurrency ? fmtCurrency(totalEntitlements) : `${totalEntitlements.toLocaleString()} ج.م`}</span>
    </div>
    <div class="print-totals-double-cell">
      <span class="print-totals-double-label">إجمالي المستقطعات</span>
      <span class="print-totals-double-value">${fmtCurrency ? fmtCurrency(totalDeductions) : `${totalDeductions.toLocaleString()} ج.م`}</span>
    </div>
  </div>
  ${attendanceBlock}
  <div class="net-salary">
    <div class="net-salary-label">صافي المرتب</div>
    <div class="net-salary-value">${fmtCurrency ? fmtCurrency(netSalaryRounded) : `${netSalaryRounded.toLocaleString()} ج.م`}</div>
  </div>`;
}

export function buildWeeklyDetailSlipPrintDocument(employee, slipOptions) {
  const body = buildOneWeeklySlipBody(employee, slipOptions);
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>صرف أجور العاملين</title><style>${WEEKLY_SLIP_DETAIL_PRINT_CSS}</style></head><body><div class="slip-print-body-inner">${body}</div></body></html>`;
}

export function buildWeeklySlipsPrintDocument(rows, slipOptions) {
  const slipsHtml = rows
    .map((emp) => `<div class="slip-page">${buildOneWeeklySlipBody(emp, slipOptions)}</div>`)
    .join('');
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>صرف أجور العاملين - الكل</title><style>${WEEKLY_SLIP_PRINT_CSS}</style></head><body>${slipsHtml}</body></html>`;
}

export function openWeeklySlipsPrintWindow(fullHtml) {
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(fullHtml);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 250);
  }
}

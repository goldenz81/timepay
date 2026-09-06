/**
 * فئات CSS عامة (`fp-col`, `fp-col--entitlements`, …) لتمييز أعمدة المال والخصومات
 * تُستخدم في الجداول عبر التطبيق — راجع `styles/financial-ui-semantics.css`.
 */

function norm(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * @param {object} column — عمود من API أو { id, label } من إعدادات الجدول المحلية
 * @returns {string} سلسلة فئات لـ <th> / <td>
 */
export function getFinancialTableColumnClass(column) {
  if (!column) return 'fp-col';
  const id = String(column.id ?? column.column_key ?? column.column_name ?? column.name ?? '').toLowerCase();
  const name = norm(column.display_name_ar ?? column.column_name_ar ?? column.label);
  const base = 'fp-col';

  if (id === 'advance_id' || name === 'رقم السلفة') return `${base} fp-col--advance-id`;

  if (id === 'salary_type' || name === 'نوع الراتب') return `${base} fp-col--salary-type`;

  if (id === 'status' || name === 'الحالة') return `${base} fp-col--status`;

  if (id === 'created_at' || name.includes('تاريخ')) return `${base} fp-col--date`;

  if (
    id === 'name' ||
    id === 'employee_name' ||
    name === 'الاسم' ||
    name === 'الموظف' ||
    name.includes('اسم العامل') ||
    name.includes('اسم الموظف')
  ) {
    return `${base} fp-col--name`;
  }

  if (id === 'index' || id === 'البيان') return `${base} fp-col--code`;

  if (id === 'employee_code' || id === 'ac-no.' || name === 'الكود' || name === 'كود الموظف') return `${base} fp-col--code`;

  if (id === 'cost_center' || name === 'مركز التكلفة' || name === 'التكلفة') return `${base} fp-col--cost`;

  if (id === 'location' || name === 'الموقع') return `${base} fp-col--cost`;

  const isEntitlements =
    id === 'total_entitlements' ||
    name === 'إجمالي المستحقات' ||
    id === 'total_advances' ||
    id === 'month_advances' ||
    id === 'month_total' ||
    id === 'advance_amount' ||
    id === 'discrimination_incentive_allowance' ||
    name.includes('مبلغ السلفة') ||
    id.startsWith('day_');
  if (isEntitlements) return `${base} fp-col--entitlements`;

  const isDeductions =
    id === 'total_deductions' ||
    name === 'إجمالي المستقطعات' ||
    name === 'إجمالي المستقطع' ||
    id === 'total_deducted' ||
    id === 'paid_amount' ||
    name.includes('المسدد');
  if (isDeductions) return `${base} fp-col--deductions`;

  const isNet =
    id === 'net_salary' ||
    id === 'net_monthly_amount' ||
    name === 'صافي المرتب' ||
    name === 'صافي الراتب' ||
    id === 'remaining' ||
    id === 'remaining_amount' ||
    name.includes('المتبقي');
  if (isNet) return `${base} fp-col--net`;

  const isBase =
    id === 'base_salary' ||
    id === 'basic_monthly_salary' ||
    id === 'previous_balance' ||
    name === 'الأساسي' ||
    name === 'الراتب الأساسي' ||
    name === 'الاساسي' ||
    name.includes('سلف سابقة');
  if (isBase) return `${base} fp-col--base`;

  if (id === 'early_leave_minutes' || id === 'late_penalty') return `${base} fp-col--deductions`;
  if (id === 'overtime_hours') return `${base} fp-col--entitlements`;

  if (id === 'is_insured' || name === 'التأمين') return `${base} fp-col--insurance`;

  if (id === 'actions') return `${base} fp-col--actions`;

  return base;
}

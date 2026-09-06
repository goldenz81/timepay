/**
 * استخراج مفتاح البيانات من تعريف العمود — نسخة الراتب الأسبوعي.
 * @param {object|null} column
 * @param {object|null} employeeData
 */
export function resolveWeeklySalaryDataKey(column, employeeData = null) {
  if (!column) return '';

  const direct = column.column_key || column.column_name || column.name_key;
  if (direct) return direct;

  const ar = (column.display_name_ar || column.name || '').trim();
  const emp = employeeData;

  switch (ar) {
    case 'الراتب الأساسي':
      return 'base_salary';
    case 'الأجر الأسبوعي':
      return 'weekly_wage';
    case 'الأجر اليومي':
      return 'daily_wage';
    case 'أجر الساعة':
      return 'hourly_wage';
    case 'ساعات الإضافي':
    case 'ساعات الإضافي العادية':
    case 'overtime_hours_work':
      if (emp) {
        if (emp.overtime_hours_work !== undefined && emp.overtime_hours_work !== null) return 'overtime_hours_work';
        if (emp.regular_overtime_hours !== undefined && emp.regular_overtime_hours !== null) return 'regular_overtime_hours';
        if (emp.overtime_hours !== undefined && emp.overtime_hours !== null) return 'overtime_hours';
      }
      return 'overtime_hours_work';
    case 'أجر الإضافي':
      return 'overtime_pay';
    case 'البيات':
      return 'bayat_pay';
    case 'ساعات العمل':
    case 'work_hours':
      return 'work_hours';
    case 'أيام الانتظام':
    case 'on_time_days':
      if (emp) {
        if (emp.on_time_days !== undefined && emp.on_time_days !== null) return 'on_time_days';
        if (emp.on_time_days_calculation !== undefined && emp.on_time_days_calculation !== null) return 'on_time_days_calculation';
      }
      return 'on_time_days';
    case 'أجر الانتظام':
    case 'قيمة مكافأة الانتظام':
    case 'attendance_bonus_value':
      if (emp) {
        if (emp.attendance_bonus_value !== undefined && emp.attendance_bonus_value !== null) return 'attendance_bonus_value';
        if (emp.punctuality_bonus !== undefined && emp.punctuality_bonus !== null) return 'punctuality_bonus';
        if (emp.attendance_bonus !== undefined && emp.attendance_bonus !== null) return 'attendance_bonus';
      }
      return 'attendance_bonus_value';
    case 'بدل المواصلات':
      return 'transport_allowance';
    case 'مكافأة خاصة':
      if (emp) {
        if (emp.special_bonus_weekly !== undefined && emp.special_bonus_weekly !== null) return 'special_bonus_weekly';
        if (emp.special_bonus !== undefined && emp.special_bonus !== null) return 'special_bonus';
      }
      return 'special_bonus_weekly';
    case 'سلفة':
      if (emp) {
        if (emp.advance_amount !== undefined && emp.advance_amount !== null) return 'advance_amount';
        if (emp.advance_payment !== undefined && emp.advance_payment !== null) return 'advance_payment';
      }
      return 'advance_amount';
    case 'إجمالي المستحقات':
      return 'total_entitlements';
    case 'أيام الغياب':
      return 'absent_days';
    case 'خصم الغياب':
      return 'absent_penalty_value';
    case 'ساعات التأخير':
      return 'late_hours';
    case 'خصم التأخير':
      return 'late_penalty_value';
    case 'التأمين':
      return 'insurance_value';
    case 'خصم السلفة':
      return 'advance_installment';
    case 'إجمالي المستقطعات':
      return 'total_deductions';
    case 'الصافي':
      return 'net_salary';
    default:
      return '';
  }
}

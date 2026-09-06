import dayjs from 'dayjs';
import {
  FiActivity,
  FiAlertTriangle,
  FiClock,
  FiUser,
  FiUserCheck,
  FiUserX,
} from 'react-icons/fi';
import { DAY_NAME_AR_BY_DAYJS, PAY_WEEK_COLUMN_LABELS } from './weeklySalaryConstants';

/** تلميح عربي + أجزاء التاريخ لعرض RTL */
export function getIncompleteModalDateParts(dateStr) {
  const d = dayjs(dateStr);
  if (!d.isValid()) return null;
  return {
    tooltip: d.locale('ar').format('dddd، D MMMM YYYY'),
    day: d.format('DD'),
    month: d.format('MM'),
    year: d.format('YYYY'),
  };
}

export function getArabicPlural(count, singular, plural) {
  if (count === 1) return `${count} ${singular}`;
  if (count === 2) return `${count} ${singular}`;
  if (count >= 3 && count <= 10) return `${count} ${plural}`;
  return `${count} ${singular}`;
}

export function formatAttendanceLogTime(time) {
  if (!time) return '-';
  return String(time).substring(0, 5);
}

export function formatOvertimeHoursPairLabel(regularOvertime, holidayOvertime, totalOverride) {
  const r = parseFloat(regularOvertime) || 0;
  const h = parseFloat(holidayOvertime) || 0;
  const t = parseFloat(totalOverride);
  const hasServerTotal =
    totalOverride !== undefined &&
    totalOverride !== null &&
    String(totalOverride).trim() !== '' &&
    !Number.isNaN(t);
  const sum = hasServerTotal ? t : r + h;
  return `(${r.toFixed(1)} + ${h.toFixed(1)}) = ${sum.toFixed(1)}`;
}

export function formatBayatDaysLabel(days) {
  const d = parseFloat(days) || 0;
  if (d <= 0) return '';
  if (Number.isInteger(d)) return `${d} يوم`;
  return `${d.toFixed(1)} يوم`;
}

export function getPayWeekFriday(date) {
  const d = dayjs(date).startOf('day');
  const dayOfWeek = d.day();
  const daysToSubtract = (dayOfWeek + 2) % 7;
  return d.subtract(daysToSubtract, 'day');
}

function payWeekDaySlot(dow) {
  const order = { 5: 0, 6: 1, 0: 2, 1: 3, 2: 4, 3: 5, 4: 6 };
  return order[dow] ?? 99;
}

export function buildWorkweekAttendanceRows(records, rangeStart, rangeEnd) {
  const byDate = new Map();
  (records || []).forEach((r) => {
    const raw = r.attendance_date;
    if (!raw) return;
    const key = String(raw).slice(0, 10);
    byDate.set(key, r);
  });
  if (!rangeStart || !rangeEnd) return [];
  let cur = rangeStart.startOf('day');
  const last = rangeEnd.startOf('day');
  const out = [];
  while (cur.isBefore(last, 'day') || cur.isSame(last, 'day')) {
    const dow = cur.day();
    const key = cur.format('YYYY-MM-DD');
    const rec = byDate.get(key);
    out.push({
      key,
      dayLabel: DAY_NAME_AR_BY_DAYJS[dow],
      dateStr: String(cur.date()),
      checkIn: formatAttendanceLogTime(rec?.check_in_time ?? rec?.check_in),
      checkOut: formatAttendanceLogTime(rec?.check_out_time ?? rec?.check_out),
    });
    cur = cur.add(1, 'day');
  }
  out.sort((a, b) => {
    const da = dayjs(a.key);
    const db = dayjs(b.key);
    const cmp = getPayWeekFriday(da).valueOf() - getPayWeekFriday(db).valueOf();
    if (cmp !== 0) return cmp;
    return payWeekDaySlot(da.day()) - payWeekDaySlot(db.day());
  });
  return out;
}

export function escapeHtmlLite(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function groupWorkweekRowsByPayFriday(rows) {
  const byWeek = new Map();
  (rows || []).forEach((r) => {
    const fri = getPayWeekFriday(dayjs(r.key)).format('YYYY-MM-DD');
    if (!byWeek.has(fri)) byWeek.set(fri, new Map());
    byWeek.get(fri).set(r.key, r);
  });
  return [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function workweekWideCellsForMap(friKey, byDate) {
  const fri = dayjs(friKey);
  const checkIns = [];
  const checkOuts = [];
  for (let i = 0; i < 7; i++) {
    const d = fri.add(i, 'day').format('YYYY-MM-DD');
    const row = byDate.get(d);
    checkIns.push(row?.checkIn ?? '-');
    checkOuts.push(row?.checkOut ?? '-');
  }
  return { checkIns, checkOuts };
}

export function buildWorkweekAttendanceWideTablesHtml(rows) {
  if (!rows.length) {
    return '<div class="attendance-workweek-empty">لا توجد سجلات حضور للأيام (الجمعة–الخميس) في الفترة.</div>';
  }
  return groupWorkweekRowsByPayFriday(rows)
    .map(([friKey, byDate]) => {
      const { checkIns, checkOuts } = workweekWideCellsForMap(friKey, byDate);
      const headCells = PAY_WEEK_COLUMN_LABELS.map(
        (label) => `<th class="att-wide-day">${escapeHtmlLite(label)}</th>`
      ).join('');
      const inCells = checkIns
        .map((ci) => `<td class="att-wide-cell" dir="ltr">${escapeHtmlLite(ci)}</td>`)
        .join('');
      const outCells = checkOuts
        .map((co) => `<td class="att-wide-cell" dir="ltr">${escapeHtmlLite(co)}</td>`)
        .join('');
      return `<table class="att-workweek-wide" dir="rtl"><thead><tr><th class="att-wide-corner" scope="col"></th>${headCells}</tr></thead><tbody><tr><th class="att-wide-rowhead" scope="row">حضور</th>${inCells}</tr><tr><th class="att-wide-rowhead" scope="row">انصراف</th>${outCells}</tr></tbody></table>`;
    })
    .join('');
}

export function buildWorkweekWideBlocks(rows) {
  if (!rows.length) return [];
  return groupWorkweekRowsByPayFriday(rows).map(([friKey, byDate]) => ({
    friKey,
    ...workweekWideCellsForMap(friKey, byDate),
  }));
}

export function formatHoursAndMinutesForLog(hours) {
  const totalHours = parseFloat(hours) || 0;
  if (totalHours === 0) return '0 س';
  if (totalHours < 1) {
    const minutes = Math.round(totalHours * 60);
    return `${minutes} د`;
  }
  const wholeHours = Math.floor(totalHours);
  const remainingMinutes = Math.round((totalHours - wholeHours) * 60);
  if (remainingMinutes === 0) return `${wholeHours} س`;
  return `${wholeHours} س ${remainingMinutes} د`;
}

export function calculateAttendanceLogStatus(record) {
  if (!record) return 'absent';
  if (record.is_holiday === 1 || record.is_holiday === true || record.is_holiday === '1') {
    return 'holiday';
  }
  const checkIn = record.check_in_time || record.check_in || '';
  const checkOut = record.check_out_time || record.check_out || '';
  const hasCheckIn =
    checkIn && checkIn !== '00:00:00' && checkIn !== '00:00' && String(checkIn).trim() !== '';
  const hasCheckOut =
    checkOut && checkOut !== '00:00:00' && checkOut !== '00:00' && String(checkOut).trim() !== '';
  if ((hasCheckIn && !hasCheckOut) || (!hasCheckIn && hasCheckOut)) return 'incomplete';
  if (!hasCheckIn && !hasCheckOut) return 'absent';
  const lateMinutes = parseFloat(record.late_minutes) || 0;
  if (lateMinutes > 0 && (hasCheckIn || hasCheckOut)) return 'late';
  if (hasCheckIn || hasCheckOut) return 'present';
  const raw = (record.status || '').toString().toLowerCase();
  if (raw === 'excused') return 'excused';
  return record.status || 'absent';
}

export function attendanceLogStatusColor(status) {
  switch (status) {
    case 'incomplete':
      return 'yellow';
    case 'present':
      return 'green';
    case 'absent':
      return 'red';
    case 'late':
      return 'orange';
    case 'half_day':
      return 'yellow';
    case 'overtime':
      return 'purple';
    case 'holiday':
      return 'orange';
    case 'excused':
      return 'blue';
    default:
      return 'gray';
  }
}

export function attendanceLogStatusText(status) {
  switch (status) {
    case 'incomplete':
      return 'ناقص';
    case 'present':
      return 'حاضر';
    case 'absent':
      return 'غائب';
    case 'late':
      return 'متأخر';
    case 'half_day':
      return 'نصف يوم';
    case 'overtime':
      return 'إضافي';
    case 'holiday':
      return 'عطلة';
    case 'excused':
      return 'أذونات';
    default:
      return 'غير محدد';
  }
}

export function attendanceLogStatusIcon(status) {
  switch (status) {
    case 'incomplete':
      return FiAlertTriangle;
    case 'present':
      return FiUserCheck;
    case 'absent':
      return FiUserX;
    case 'late':
      return FiClock;
    case 'half_day':
      return FiActivity;
    case 'overtime':
      return FiClock;
    default:
      return FiUser;
  }
}

export function getPreferredEmployeeName(employee) {
  if (!employee) return '-';
  return (
    employee.name_ar ||
    employee.employee_name_ar ||
    employee.employee_name ||
    employee.name ||
    employee.name_en ||
    '-'
  );
}

export function filterWeeklySalaryRows(tableData, searchTerm, departmentFilter, sortConfig) {
  if (!Array.isArray(tableData)) return [];
  let filtered = tableData.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.employee_code && item.employee_code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSalaryType = item.salary_type === 'Weekly';
    const matchesDepartment = !departmentFilter || item.department === departmentFilter;
    return matchesSearch && matchesSalaryType && matchesDepartment;
  });
  if (sortConfig?.key) {
    const numericKeys = ['base_salary', 'total_entitlements', 'total_deductions', 'net_salary'];
    filtered = [...filtered].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (numericKeys.includes(sortConfig.key)) {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else {
        aVal = (aVal ?? '').toString().toLowerCase();
        bVal = (bVal ?? '').toString().toLowerCase();
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }
  return filtered;
}

export function weeklySalaryDataHasNoAttendance(tableData) {
  if (!Array.isArray(tableData) || tableData.length === 0) return false;
  const hasAnyAttendance = tableData.some((row) => (Number(row.work_hours) || 0) > 0);
  return !hasAnyAttendance;
}

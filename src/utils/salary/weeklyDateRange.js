import dayjs from 'dayjs';

/** أسبوع الدفع: الجمعة → الخميس */
export function getCurrentWeekRange() {
  const today = dayjs();
  const dayOfWeek = today.day();
  const daysToSubtract = (dayOfWeek + 2) % 7;
  const startOfWeek = today.subtract(daysToSubtract, 'day').startOf('day');
  const endOfWeek = startOfWeek.add(6, 'day').endOf('day');
  return [startOfWeek, endOfWeek];
}

export function getWeekRangeForDate(date) {
  if (!date) return null;
  const selectedDate = dayjs(date);
  const dayOfWeek = selectedDate.day();
  const daysToSubtract = (dayOfWeek + 2) % 7;
  const startOfWeek = selectedDate.subtract(daysToSubtract, 'day').startOf('day');
  const endOfWeek = startOfWeek.add(6, 'day').endOf('day');
  return [startOfWeek, endOfWeek];
}

export function formatWeeklyDateRange(dates) {
  if (!dates || !dates[0] || !dates[1]) return 'اختر الفترة';
  return `${dates[0].format('DD/MM/YYYY')} - ${dates[1].format('DD/MM/YYYY')}`;
}

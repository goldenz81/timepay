import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { getApiUrl } from '../../utils/apiUrlHelper';
import { debugLog, debugError } from '../../utils/debugLog';
import {
  formatWeeklyDateRange,
  getCurrentWeekRange,
  getWeekRangeForDate,
} from '../../utils/salary/weeklyDateRange';

/**
 * جلب بيانات الراتب الأسبوعي، الأقسام، الفترة الزمنية، والترتيب.
 */
export function useWeeklySalaryData({ toast } = {}) {
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDateRange, setSelectedDateRange] = useState([
    dayjs().startOf('week'),
    dayjs().endOf('week'),
  ]);
  const [rangePickerValue, setRangePickerValue] = useState([
    dayjs().startOf('week'),
    dayjs().endOf('week'),
  ]);
  const [isAutomaticMode, setIsAutomaticMode] = useState(true);
  const [weeklyPeriodIncompleteCount, setWeeklyPeriodIncompleteCount] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  useEffect(() => {
    if (isAutomaticMode) {
      const [start, end] = getCurrentWeekRange();
      setSelectedDateRange([start, end]);
      setRangePickerValue([start, end]);
    } else {
      const today = dayjs();
      setSelectedDateRange([today.startOf('month'), today.endOf('month')]);
      setRangePickerValue([today.startOf('month'), today.endOf('month')]);
    }
  }, [isAutomaticMode]);

  const applyWeekRange = useCallback((weekRange) => {
    if (!weekRange?.[0] || !weekRange?.[1]) return;
    setRangePickerValue(weekRange);
    setSelectedDateRange(weekRange);
  }, []);

  const handleRangePickerChange = useCallback(
    (dates) => {
      if (isAutomaticMode) {
        if (dates?.[0]) {
          const weekRange = getWeekRangeForDate(dates[0]);
          if (weekRange) applyWeekRange(weekRange);
        } else {
          applyWeekRange(getCurrentWeekRange());
        }
      } else if (dates?.[0] && dates?.[1]) {
        setRangePickerValue(dates);
        setSelectedDateRange(dates);
      } else {
        const today = dayjs();
        const start = today.startOf('month');
        const end = today.endOf('month');
        setRangePickerValue([start, end]);
        setSelectedDateRange([start, end]);
      }
    },
    [isAutomaticMode, applyWeekRange]
  );

  const handleSetCurrentWeek = useCallback(() => {
    applyWeekRange(getCurrentWeekRange());
  }, [applyWeekRange]);

  const handleSetPreviousWeek = useCallback(() => {
    const anchor = rangePickerValue?.[0] || getCurrentWeekRange()[0];
    applyWeekRange(getWeekRangeForDate(dayjs(anchor).subtract(7, 'day')));
  }, [rangePickerValue, applyWeekRange]);

  const fetchWeeklyPeriodIncompleteCount = useCallback(async () => {
    const start = selectedDateRange?.[0]?.format?.('YYYY-MM-DD');
    const end = selectedDateRange?.[1]?.format?.('YYYY-MM-DD');
    if (!start || !end) {
      setWeeklyPeriodIncompleteCount(0);
      return 0;
    }
    try {
      const res = await fetch(
        getApiUrl(
          `/api/attendance_logs.php?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}&count_incomplete_weekly=1`
        )
      );
      const json = await res.json();
      const n = json?.success ? Number(json.incomplete_count) || 0 : 0;
      setWeeklyPeriodIncompleteCount(n);
      return n;
    } catch {
      setWeeklyPeriodIncompleteCount(0);
      return 0;
    }
  }, [selectedDateRange]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [startDate, endDate] = selectedDateRange;
      const startStr = startDate.format('YYYY-MM-DD');
      const endStr = endDate.format('YYYY-MM-DD');

      try {
        await fetch(getApiUrl('/api/attendance_logs.php'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'fill_missing_absence',
            start_date: startStr,
            end_date: endStr,
          }),
        });
      } catch (fillError) {
        debugError('fill_missing_absence failed:', fillError);
      }

      const response = await fetch('/api/unified_salary_api_v2.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_weekly_salary_data',
          start_date: startStr,
          end_date: endStr,
          salary_type: 'Weekly',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        debugError('JSON Parse Error:', parseError);
        debugError('Response text:', text);
        throw new Error('استجابة غير صحيحة من الخادم');
      }

      if (result.success) {
        debugLog('Weekly salary data loaded:', result.data);
        const rows = result.data || [];
        setTableData(rows);
        const incompleteCount = await fetchWeeklyPeriodIncompleteCount();
        return { success: true, data: rows, incompleteCount };
      }

      toast?.({
        title: 'خطأ في تحميل البيانات',
        description: result.message || 'حدث خطأ غير متوقع',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return { success: false, data: [], incompleteCount: 0 };
    } catch (error) {
      debugError('Error fetching data:', error);
      toast?.({
        title: 'خطأ في الاتصال',
        description: error.message || 'تعذر الاتصال بالخادم',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return { success: false, data: [], incompleteCount: 0 };
    } finally {
      setLoading(false);
    }
  }, [selectedDateRange, toast, fetchWeeklyPeriodIncompleteCount]);

  const recomputeAttendanceRangeForWeeklyPrint = useCallback(async () => {
    const start = selectedDateRange?.[0]?.format?.('YYYY-MM-DD');
    const end = selectedDateRange?.[1]?.format?.('YYYY-MM-DD');
    if (!start || !end) {
      toast?.({
        title: 'حدد فترة أولاً',
        description: 'يرجى اختيار فترة زمنية قبل الطباعة',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return false;
    }
    try {
      const response = await fetch(getApiUrl('/api/attendance_logs.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recompute_range',
          start_date: start,
          end_date: end,
        }),
      });
      const result = await response.json();
      if (result.success) return true;
      toast?.({
        title: 'خطأ في إعادة الاحتساب',
        description: result.error || result.message || 'تعذر إكمال الطباعة',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    } catch (error) {
      toast?.({
        title: 'خطأ في إعادة الاحتساب',
        description: error.message || 'تعذر الاتصال بالخادم',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    }
  }, [selectedDateRange, toast]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch('/api/departments_api.php');
      const result = await response.json();
      if (result.success) {
        setDepartments(result.data || []);
      }
    } catch (error) {
      debugError('Error fetching departments:', error);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    loading,
    setLoading,
    tableData,
    setTableData,
    departments,
    selectedDateRange,
    setSelectedDateRange,
    rangePickerValue,
    setRangePickerValue,
    isAutomaticMode,
    setIsAutomaticMode,
    weeklyPeriodIncompleteCount,
    setWeeklyPeriodIncompleteCount,
    sortConfig,
    handleSort,
    formatDateRange: formatWeeklyDateRange,
    handleRangePickerChange,
    handleSetCurrentWeek,
    handleSetPreviousWeek,
    fetchData,
    fetchDepartments,
    fetchWeeklyPeriodIncompleteCount,
    recomputeAttendanceRangeForWeeklyPrint,
    getCurrentWeekRange,
    getWeekRangeForDate,
  };
}

export default useWeeklySalaryData;

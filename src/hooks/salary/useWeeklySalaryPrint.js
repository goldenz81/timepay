import { useCallback, useMemo } from 'react';
import { getApiUrl } from '../../utils/apiUrlHelper';
import {
  filterWeeklySalaryRows,
  weeklySalaryDataHasNoAttendance,
} from '../../utils/salary/weeklySalaryHelpers';
import {
  buildWeeklySlipsPrintDocument,
  openWeeklySlipsPrintWindow,
} from '../../print/weeklySlipTemplate';

const INCOMPLETE_PRINT_MSG =
  'لا يمكن الطباعة قبل استكمال حقول الحضور والانصراف الناقصة. يُرجى الإصلاح من إدارة الحضور أو من تفاصيل الموظف.';

const NO_DATA_PRINT_MSG =
  'لا توجد أجور مطابقة للفلتر بعد التحديث، أو لا توجد ساعات عمل مسجّلة للفترة.';

/**
 * منطق الطباعة للراتب الأسبوعي — إعادة احتساب الحضور ثم فتح نافذة الطباعة أو التقرير.
 */
export default function useWeeklySalaryPrint({
  filteredData,
  hasNoAttendanceForPeriod,
  weeklyPeriodIncompleteCount,
  toast,
  recomputeAttendanceRangeForWeeklyPrint,
  fetchData,
  setLoading,
  searchTerm,
  departmentFilter,
  sortConfig,
  selectedDateRange,
  displayVisibleColumns,
  entitlementsColumns,
  deductionsColumns,
  fmtCurrency,
  resolveDataKey,
  settings,
  mealAllowanceEnabled,
}) {
  const slipOptions = useMemo(
    () => ({
      selectedDateRange,
      displayVisibleColumns,
      entitlementsColumns,
      deductionsColumns,
      fmtCurrency,
      resolveDataKey,
      settings,
      mealAllowanceEnabled,
    }),
    [
      selectedDateRange,
      displayVisibleColumns,
      entitlementsColumns,
      deductionsColumns,
      fmtCurrency,
      resolveDataKey,
      settings,
      mealAllowanceEnabled,
    ]
  );

  const refreshRowsForPrint = useCallback(
    async ({ incompleteDescription = INCOMPLETE_PRINT_MSG } = {}) => {
      if (!filteredData.length || hasNoAttendanceForPeriod) return null;

      if (weeklyPeriodIncompleteCount > 0) {
        toast({
          title: 'يوجد سجلات ناقصة',
          description: incompleteDescription,
          status: 'warning',
          duration: 6000,
          isClosable: true,
        });
        return null;
      }

      setLoading(true);
      toast({
        title: 'جاري التحضير للطباعة',
        description:
          'إعادة احتساب شاملة لسجلات الحضور في الفترة ثم تحديث قائمة الأجور قبل فتح نافذة الطباعة…',
        status: 'info',
        duration: 5500,
        isClosable: true,
      });

      const recomputed = await recomputeAttendanceRangeForWeeklyPrint();
      if (!recomputed) {
        setLoading(false);
        return null;
      }

      const refreshed = await fetchData();
      if (!refreshed?.success) {
        return null;
      }

      if ((refreshed.incompleteCount ?? 0) > 0) {
        toast({
          title: 'يوجد سجلات ناقصة',
          description: incompleteDescription,
          status: 'warning',
          duration: 6000,
          isClosable: true,
        });
        return null;
      }

      const rowsToPrint = filterWeeklySalaryRows(
        refreshed.data,
        searchTerm,
        departmentFilter,
        sortConfig
      );

      if (!rowsToPrint.length || weeklySalaryDataHasNoAttendance(refreshed.data)) {
        toast({
          title: 'لا توجد بيانات للطباعة',
          description: NO_DATA_PRINT_MSG,
          status: 'warning',
          duration: 6000,
          isClosable: true,
        });
        return null;
      }

      return rowsToPrint;
    },
    [
      filteredData,
      hasNoAttendanceForPeriod,
      weeklyPeriodIncompleteCount,
      toast,
      recomputeAttendanceRangeForWeeklyPrint,
      fetchData,
      setLoading,
      searchTerm,
      departmentFilter,
      sortConfig,
    ]
  );

  const handlePrintAllWeekly = useCallback(async () => {
    const rowsToPrint = await refreshRowsForPrint();
    if (!rowsToPrint) return;

    const fullHtml = buildWeeklySlipsPrintDocument(rowsToPrint, slipOptions);

    toast({
      title: 'جاري الطباعة',
      description: `يتم تجهيز ${rowsToPrint.length} موظف للطباعة…`,
      status: 'info',
      duration: 2800,
      isClosable: true,
    });

    openWeeklySlipsPrintWindow(fullHtml);
  }, [refreshRowsForPrint, slipOptions, toast]);

  const handlePrintWeeklyReportExport = useCallback(async () => {
    const rowsToPrint = await refreshRowsForPrint({
      incompleteDescription:
        'لا يمكن طباعة التقرير قبل استكمال حقول الحضور والانصراف الناقصة. يُرجى الإصلاح من إدارة الحضور أو من عرض تفاصيل الموظف.',
    });
    if (!rowsToPrint) return;

    const start = selectedDateRange?.[0]?.format?.('YYYY-MM-DD');
    const end = selectedDateRange?.[1]?.format?.('YYYY-MM-DD');
    if (!start || !end) return;

    toast({
      title: 'جاري الطباعة',
      description: 'يتم فتح تقرير الفترة في نافذة جديدة…',
      status: 'info',
      duration: 2500,
      isClosable: true,
    });

    const url = getApiUrl(
      `/api/weekly_salary_export_report.php?${new URLSearchParams({ start_date: start, end_date: end }).toString()}`
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [refreshRowsForPrint, selectedDateRange, toast]);

  return { handlePrintAllWeekly, handlePrintWeeklyReportExport };
}

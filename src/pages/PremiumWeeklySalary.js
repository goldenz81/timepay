import React, { useState, useMemo, useCallback, useRef } from 'react';
import { filterWeeklySalaryRows, weeklySalaryDataHasNoAttendance } from '../utils/salary/weeklySalaryHelpers';
import { WEEKLY_MAIN_TABLE_ALLOWED } from '../utils/salary/weeklySalaryConstants';
import { Box, useToast } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { filterMealAllowanceColumnIds, isMealAllowanceEnabled } from '../utils/systemFeatureFlags';
import { useSalaryToolbar } from '../contexts/SalaryToolbarContext';
import useCurrency from '../hooks/useCurrency';
import useWeeklySalaryData from '../hooks/salary/useWeeklySalaryData';
import useWeeklySalaryColumns from '../hooks/salary/useWeeklySalaryColumns';
import useWeeklySalaryPrint from '../hooks/salary/useWeeklySalaryPrint';
import useWeeklySalaryModals from '../hooks/salary/useWeeklySalaryModals';
import { resolveWeeklySalaryDataKey } from '../utils/salary/resolveWeeklySalaryDataKey';
import WeeklySalaryPageHeader from '../components/salary/WeeklySalaryPageHeader';
import WeeklySalaryTablePanel from '../components/salary/WeeklySalaryTablePanel';
import WeeklySalaryDetailsModal from '../components/salary/modals/WeeklySalaryDetailsModal';
import WeeklyAttendanceHistoryModal from '../components/salary/modals/WeeklyAttendanceHistoryModal';
import WeeklyFixIncompleteModal from '../components/salary/modals/WeeklyFixIncompleteModal';
import WeeklyEditSalaryModal from '../components/salary/modals/WeeklyEditSalaryModal';
import WeeklyEmployeeDetailsModal from '../components/salary/modals/WeeklyEmployeeDetailsModal';

const PremiumWeeklySalary = () => {
  const { settings } = useSettings();
  const mealAllowanceEnabled = isMealAllowanceEnabled(settings);
  const { weeklySalaryHeaderCollapsed, toggleWeeklySalaryHeaderCollapsed } = useSalaryToolbar();

  const toast = useToast();
  const navigate = useNavigate();
  const { formatCurrency: fmtCurrency } = useCurrency();

  const {
    loading,
    setLoading,
    tableData,
    departments,
    selectedDateRange,
    setSelectedDateRange,
    rangePickerValue,
    setRangePickerValue,
    isAutomaticMode,
    setIsAutomaticMode,
    weeklyPeriodIncompleteCount,
    sortConfig,
    handleSort,
    handleRangePickerChange,
    handleSetCurrentWeek,
    handleSetPreviousWeek,
    fetchData,
    getCurrentWeekRange,
    recomputeAttendanceRangeForWeeklyPrint,
  } = useWeeklySalaryData({ toast });

  const {
    dynamicColumns,
    entitlementsColumns,
    setEntitlementsColumns,
    deductionsColumns,
    setDeductionsColumns,
    columnVisibility,
    visibleColumns,
    setVisibleColumns,
    visibleDeductionColumns,
    weeklyMainColumns,
    toggleWeeklyMainColumn,
    moveWeeklyMainColumn,
    fetchDynamicColumns,
    fetchEntitlementsColumns,
    fetchDeductionsColumns,
    toggleColumnVisibility,
    savePreferences,
    moveColumnUp,
    moveColumnDown,
    moveDeductionColumnUp,
    moveDeductionColumnDown,
    toggleDeductionColumnVisibility,
  } = useWeeklySalaryColumns({ toast, onRefreshData: fetchData, mealAllowanceEnabled });

  const displayVisibleColumns = useMemo(
    () => filterMealAllowanceColumnIds(visibleColumns, entitlementsColumns, mealAllowanceEnabled),
    [visibleColumns, entitlementsColumns, mealAllowanceEnabled]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const weeklyDateToolbarRef = useRef(null);

  const modals = useWeeklySalaryModals({
    toast,
    selectedDateRange,
    fetchData,
    fetchDynamicColumns,
    fetchEntitlementsColumns,
    fetchDeductionsColumns,
    setEntitlementsColumns,
    setDeductionsColumns,
    setVisibleColumns,
  });

  const resolveDataKey = useCallback(
    (column, employeeData = null) =>
      resolveWeeklySalaryDataKey(column, employeeData ?? modals.selectedEmployee),
    [modals.selectedEmployee]
  );

  const filteredData = useMemo(
    () => filterWeeklySalaryRows(tableData, searchTerm, departmentFilter, sortConfig),
    [tableData, searchTerm, departmentFilter, sortConfig]
  );

  const hasNoAttendanceForPeriod = useMemo(() => weeklySalaryDataHasNoAttendance(tableData), [tableData]);

  const isNoWeeklyDataToShow = useMemo(
    () => filteredData.length === 0 || hasNoAttendanceForPeriod,
    [filteredData.length, hasNoAttendanceForPeriod]
  );

  const weeklyTotals = useMemo(() => {
    let totalEntitlements = 0;
    let totalDeductions = 0;
    let netSalary = 0;
    filteredData.forEach((row) => {
      totalEntitlements += parseFloat(row.total_entitlements) || 0;
      totalDeductions += parseFloat(row.total_deductions) || 0;
      netSalary += parseFloat(row.net_salary) || 0;
    });
    return { totalEntitlements, totalDeductions, netSalary };
  }, [filteredData]);

  const { handlePrintAllWeekly, handlePrintWeeklyReportExport } = useWeeklySalaryPrint({
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
  });

  const mainTableColumns = useMemo(() => {
    const nameAliases = { 'الراتب الأساسي': 'base_salary', 'التكلفة': 'cost_center', 'صافي الراتب': 'net_salary' };
    const byKey = {};
    WEEKLY_MAIN_TABLE_ALLOWED.forEach(({ key, label }) => {
      const col = dynamicColumns.find((c) => {
        const k = c.column_key || c.column_name || c.name;
        const nameAr = (c.display_name_ar || c.column_name_ar || '').trim();
        return k === key || nameAr === label || nameAliases[nameAr] === key;
      });
      if (col) byKey[key] = col;
    });
    return weeklyMainColumns.filter((c) => c.visible).map((c) => byKey[c.id]).filter(Boolean);
  }, [dynamicColumns, weeklyMainColumns]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setDepartmentFilter('');
    const [start, end] = getCurrentWeekRange();
    setSelectedDateRange([start, end]);
    setRangePickerValue([start, end]);
  }, [getCurrentWeekRange, setSelectedDateRange, setRangePickerValue]);

  const dateRangeLabel =
    selectedDateRange?.[0] && selectedDateRange?.[1]
      ? `${selectedDateRange[0].format('DD/MM/YYYY')} — ${selectedDateRange[1].format('DD/MM/YYYY')}`
      : '';

  const searchOnlyWeeklyData = useMemo(
    () => filterWeeklySalaryRows(tableData, searchTerm, '', sortConfig),
    [tableData, searchTerm, sortConfig]
  );

  const weeklyHeaderStatChips = useMemo(() => {
    const chip = (key, value, label, variant = 'total') => ({ key, value, label, variant });
    const pool = filteredData;
    const hasSearch = Boolean(searchTerm.trim());
    const hasDept = Boolean(departmentFilter);
    const deptLabel =
      (departments.find((d) => d.name === departmentFilter)?.description || departmentFilter || '').slice(0, 18);

    const compactMoney = (n) => {
      const v = Math.round(parseFloat(n) || 0);
      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}م`;
      if (v >= 1_000) return `${(v / 1_000).toFixed(0)}ألف`;
      return String(v);
    };

    const chips = [];
    if (hasDept) {
      chips.push(chip('matched', pool.length, deptLabel, 'filtered'));
      chips.push(chip('scope', searchOnlyWeeklyData.length, hasSearch ? 'ضمن البحث' : 'من الكل', 'total'));
    } else if (hasSearch) {
      chips.push(chip('matched', pool.length, `من ${searchOnlyWeeklyData.length}`, 'total'));
    } else {
      chips.push(chip('employees', pool.length, 'موظف', 'total'));
    }
    chips.push(chip('ent', compactMoney(weeklyTotals.totalEntitlements), 'مستحقات', 'active'));
    chips.push(chip('ded', compactMoney(weeklyTotals.totalDeductions), 'مستقطعات', 'inactive'));
    chips.push(chip('net', compactMoney(weeklyTotals.netSalary), 'صافي', 'filtered'));
    if (weeklyPeriodIncompleteCount > 0) {
      chips.push(chip('incomplete', weeklyPeriodIncompleteCount, 'ناقص', 'weekly'));
    }
    return chips;
  }, [
    filteredData,
    searchTerm,
    departmentFilter,
    departments,
    weeklyTotals,
    weeklyPeriodIncompleteCount,
    searchOnlyWeeklyData,
  ]);

  const weeklyHeaderSubtitle = useMemo(() => {
    if (departmentFilter) {
      const dept = departments.find((d) => d.name === departmentFilter);
      return `تصفية حسب القسم: ${dept?.description || departmentFilter}`;
    }
    if (searchTerm.trim()) return `نتائج البحث عن «${searchTerm.trim()}»`;
    if (dateRangeLabel) return `فترة الأجور: ${dateRangeLabel}`;
    return 'حساب ومراجعة أجور الموظفين الأسبوعية';
  }, [departmentFilter, searchTerm, dateRangeLabel, departments]);

  const scrollToDatePicker = useCallback(() => {
    weeklyDateToolbarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      const inp = document.querySelector('.weekly-salary-range-picker .ant-picker-input input');
      inp?.focus?.();
    }, 400);
  }, []);

  return (
    <Box
      className={`tp-table-page-layout tp-salary-page-layout tp-weekly-salary-page-layout${weeklySalaryHeaderCollapsed ? ' tp-salary-page-layout--header-collapsed' : ''}${isSearchFocused ? ' search-focused' : ''}`}
      w="100%"
      flex="1"
      minH="0"
      display="flex"
      flexDirection="column"
    >
      {!weeklySalaryHeaderCollapsed && (
        <WeeklySalaryPageHeader
          weeklyHeaderSubtitle={weeklyHeaderSubtitle}
          weeklyHeaderStatChips={weeklyHeaderStatChips}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onSearchFocus={() => setIsSearchFocused(true)}
          onSearchBlur={() => setIsSearchFocused(false)}
          departmentFilter={departmentFilter}
          onDepartmentFilterChange={setDepartmentFilter}
          departments={departments}
          onClearFilters={clearFilters}
          weeklyDateToolbarRef={weeklyDateToolbarRef}
          isAutomaticMode={isAutomaticMode}
          onAutomaticModeChange={setIsAutomaticMode}
          rangePickerValue={rangePickerValue}
          onRangePickerChange={handleRangePickerChange}
          onSetCurrentWeek={handleSetCurrentWeek}
          onSetPreviousWeek={handleSetPreviousWeek}
        />
      )}

      <WeeklySalaryTablePanel
        loading={loading}
        isNoWeeklyDataToShow={isNoWeeklyDataToShow}
        filteredData={filteredData}
        mainTableColumns={mainTableColumns}
        weeklyTotals={weeklyTotals}
        fmtCurrency={fmtCurrency}
        onSort={handleSort}
        onViewDetails={modals.handleViewDetails}
        weeklyPeriodIncompleteCount={weeklyPeriodIncompleteCount}
        selectedDateRange={selectedDateRange}
        weeklySalaryHeaderCollapsed={weeklySalaryHeaderCollapsed}
        onToggleHeaderCollapsed={toggleWeeklySalaryHeaderCollapsed}
        dateRangeLabel={dateRangeLabel}
        weeklyMainColumns={weeklyMainColumns}
        onToggleWeeklyMainColumn={toggleWeeklyMainColumn}
        onMoveWeeklyMainColumn={moveWeeklyMainColumn}
        onRefresh={fetchData}
        onPrintReport={handlePrintWeeklyReportExport}
        onPrintAll={handlePrintAllWeekly}
        onScrollToDatePicker={scrollToDatePicker}
      />

      <WeeklySalaryDetailsModal
        isOpen={modals.isDetailsModalOpen}
        onClose={() => modals.setIsDetailsModalOpen(false)}
        selectedEmployee={modals.selectedEmployee}
        selectedDateRange={selectedDateRange}
        detailsModalDateRange={modals.detailsModalDateRange}
        detailsRangePickerValue={modals.detailsRangePickerValue}
        onDetailsRangeChange={modals.handleDetailsModalRangeChange}
        incompleteRecords={modals.incompleteRecords}
        settings={settings}
        visibleColumns={displayVisibleColumns}
        entitlementsColumns={entitlementsColumns}
        deductionsColumns={deductionsColumns}
        visibleDeductionColumns={visibleDeductionColumns}
        columnVisibility={columnVisibility}
        fmtCurrency={fmtCurrency}
        resolveDataKey={resolveDataKey}
        moveColumnUp={moveColumnUp}
        moveColumnDown={moveColumnDown}
        moveDeductionColumnUp={moveDeductionColumnUp}
        moveDeductionColumnDown={moveDeductionColumnDown}
        onOpenEmployeeDetails={modals.handleOpenEmployeeDetailsFromSalary}
        onOpenAttendanceHistory={modals.handleOpenAttendanceHistoryModal}
        onOpenFixIncomplete={modals.handleOpenFixIncompleteModal}
        onOpenEdit={() => modals.setIsEditModalOpen(true)}
        nestedModalOpen={modals.detailsNestedModalOpen}
        attendanceHistoryLoading={modals.attendanceHistoryLoading}
        detailsWorkweekAttendanceRows={modals.detailsWorkweekAttendanceRows}
        detailsWorkweekWideBlocks={modals.detailsWorkweekWideBlocks}
        toggleColumnVisibility={toggleColumnVisibility}
        toggleDeductionColumnVisibility={toggleDeductionColumnVisibility}
        savePreferences={savePreferences}
      />

      <WeeklyAttendanceHistoryModal
        isOpen={modals.isAttendanceHistoryModalOpen}
        onClose={() => modals.setIsAttendanceHistoryModalOpen(false)}
        selectedEmployee={modals.selectedEmployee}
        detailsModalDateRange={modals.detailsModalDateRange}
        attendanceHistoryLoading={modals.attendanceHistoryLoading}
        attendanceHistoryRecords={modals.attendanceHistoryRecords}
      />

      <WeeklyFixIncompleteModal
        isOpen={modals.isFixIncompleteModalOpen}
        onClose={() => modals.setIsFixIncompleteModalOpen(false)}
        incompleteRecords={modals.incompleteRecords}
        savingIncompleteFix={modals.savingIncompleteFix}
        onUpdateField={modals.updateIncompleteRecordField}
        onSave={modals.handleSaveIncompleteRecords}
      />

      <WeeklyEditSalaryModal
        isOpen={modals.isEditModalOpen}
        onClose={() => modals.setIsEditModalOpen(false)}
        selectedEmployee={modals.selectedEmployee}
        setSelectedEmployee={modals.setSelectedEmployee}
        rangePickerValue={rangePickerValue}
        toast={toast}
        fetchData={fetchData}
      />

      <WeeklyEmployeeDetailsModal
        isOpen={modals.isEmployeeDetailsOpen}
        onClose={() => {
          modals.onEmployeeDetailsClose();
          modals.setEmployeeDetailsData(null);
        }}
        employeeDetailsData={modals.employeeDetailsData}
        formatCurrency={fmtCurrency}
        onEdit={() => {
          if (!modals.employeeDetailsData) return;
          modals.onEmployeeDetailsClose();
          modals.setEmployeeDetailsData(null);
          navigate('/unified-employees', {
            state: { openEmployeeId: modals.employeeDetailsData.id, openMode: 'edit' },
          });
        }}
        onDelete={() => {
          if (!modals.employeeDetailsData) return;
          const name = modals.employeeDetailsData.name_ar || modals.employeeDetailsData.name || 'هذا الموظف';
          if (
            window.confirm(
              `⚠️ تحذير: حذف الموظف نهائياً\n\nالموظف: ${name}\nالكود: ${modals.employeeDetailsData.employee_code || 'غير محدد'}\n\nهل أنت متأكد؟`
            )
          ) {
            modals.handleDeleteEmployeeFromDetailsModal(modals.employeeDetailsData);
          }
        }}
      />
    </Box>
  );
};

export default PremiumWeeklySalary;


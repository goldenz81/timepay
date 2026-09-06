import { useState, useEffect, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import { useDisclosure } from '@chakra-ui/react';
import { getApiUrl } from '../../utils/apiUrlHelper';
import { debugError } from '../../utils/debugLog';
import {
  buildWorkweekAttendanceRows,
  buildWorkweekWideBlocks,
} from '../../utils/salary/weeklySalaryHelpers';
import { prepareWeeklyDetailsColumns } from '../../utils/salary/prepareWeeklyDetailsColumns';

function isValidAttendanceTime(value) {
  const v = (value ?? '').toString().trim();
  return !!v && v !== '00:00' && v !== '00:00:00' && v !== '-';
}

function toTimeInputValue(value) {
  const v = (value ?? '').toString().trim();
  if (!v || v === '-' || v === '00:00' || v === '00:00:00') return '';
  return v.length >= 5 ? v.slice(0, 5) : v;
}

/**
 * حالة ومنطق مودالات التفاصيل + الحضور الناقص + سجل الحضور.
 */
export default function useWeeklySalaryModals({
  toast,
  selectedDateRange,
  fetchData,
  fetchDynamicColumns,
  fetchEntitlementsColumns,
  fetchDeductionsColumns,
  setEntitlementsColumns,
  setDeductionsColumns,
  setVisibleColumns,
}) {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isFixIncompleteModalOpen, setIsFixIncompleteModalOpen] = useState(false);
  const [incompleteRecords, setIncompleteRecords] = useState([]);
  const [savingIncompleteFix, setSavingIncompleteFix] = useState(false);
  const [detailsModalDateRange, setDetailsModalDateRange] = useState(() => [
    dayjs().startOf('week'),
    dayjs().endOf('week'),
  ]);
  const [detailsRangePickerValue, setDetailsRangePickerValue] = useState(() => [
    dayjs().startOf('week'),
    dayjs().endOf('week'),
  ]);
  const [isAttendanceHistoryModalOpen, setIsAttendanceHistoryModalOpen] = useState(false);
  const [attendanceHistoryRecords, setAttendanceHistoryRecords] = useState([]);
  const [attendanceHistoryLoading, setAttendanceHistoryLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { isOpen: isEmployeeDetailsOpen, onOpen: onEmployeeDetailsOpen, onClose: onEmployeeDetailsClose } =
    useDisclosure();
  const [employeeDetailsData, setEmployeeDetailsData] = useState(null);

  const detailsNestedModalOpen =
    isEditModalOpen ||
    isAttendanceHistoryModalOpen ||
    isFixIncompleteModalOpen ||
    isEmployeeDetailsOpen;

  const fetchIncompleteAttendanceForSelectedEmployee = useCallback(
    async (employeeRow = null, dateRange = null) => {
      try {
        const emp = employeeRow ?? selectedEmployee;
        const range = dateRange ?? selectedDateRange;
        const employeeId = emp?.employee_id ?? emp?.id;
        const start = range?.[0]?.format?.('YYYY-MM-DD');
        const end = range?.[1]?.format?.('YYYY-MM-DD');
        if (!employeeId || !start || !end) {
          setIncompleteRecords([]);
          return [];
        }

        const response = await fetch(
          getApiUrl(`/api/attendance_logs.php?employee_id=${employeeId}&start_date=${start}&end_date=${end}`)
        );
        const result = await response.json();
        if (!result?.success || !Array.isArray(result.data)) {
          setIncompleteRecords([]);
          return [];
        }

        const mapped = result.data
          .map((r) => {
            const checkIn = r.check_in_time || r.check_in || '';
            const checkOut = r.check_out_time || r.check_out || '';
            const hasCheckIn = isValidAttendanceTime(checkIn);
            const hasCheckOut = isValidAttendanceTime(checkOut);
            const isIncomplete = (hasCheckIn && !hasCheckOut) || (!hasCheckIn && hasCheckOut);
            if (!isIncomplete) return null;
            return {
              id: r.id,
              attendance_date: r.attendance_date,
              employee_name: emp?.name || emp?.employee_name || '-',
              missing_field:
                hasCheckIn && !hasCheckOut ? 'check_out' : !hasCheckIn && hasCheckOut ? 'check_in' : 'both',
              check_in_time: toTimeInputValue(checkIn),
              check_out_time: toTimeInputValue(checkOut),
            };
          })
          .filter(Boolean);

        setIncompleteRecords(mapped);
        return mapped;
      } catch (e) {
        setIncompleteRecords([]);
        return [];
      }
    },
    [selectedEmployee, selectedDateRange]
  );

  const loadAttendanceHistoryForDetailsModal = useCallback(async () => {
    const employeeId = selectedEmployee?.employee_id ?? selectedEmployee?.id;
    const start = detailsModalDateRange?.[0]?.format?.('YYYY-MM-DD');
    const end = detailsModalDateRange?.[1]?.format?.('YYYY-MM-DD');
    if (!employeeId || !start || !end) {
      setAttendanceHistoryRecords([]);
      return;
    }
    setAttendanceHistoryLoading(true);
    try {
      const response = await fetch(
        getApiUrl(`/api/attendance_logs.php?employee_id=${employeeId}&start_date=${start}&end_date=${end}`)
      );
      const result = await response.json();
      setAttendanceHistoryRecords(Array.isArray(result?.data) ? result.data : []);
    } catch (e) {
      setAttendanceHistoryRecords([]);
    } finally {
      setAttendanceHistoryLoading(false);
    }
  }, [selectedEmployee, detailsModalDateRange]);

  const detailsWorkweekAttendanceRows = useMemo(
    () =>
      buildWorkweekAttendanceRows(
        attendanceHistoryRecords,
        detailsModalDateRange?.[0],
        detailsModalDateRange?.[1]
      ),
    [attendanceHistoryRecords, detailsModalDateRange]
  );

  const detailsWorkweekWideBlocks = useMemo(
    () => buildWorkweekWideBlocks(detailsWorkweekAttendanceRows),
    [detailsWorkweekAttendanceRows]
  );

  useEffect(() => {
    if (!isDetailsModalOpen || !selectedEmployee) return;
    loadAttendanceHistoryForDetailsModal();
  }, [isDetailsModalOpen, selectedEmployee, detailsModalDateRange, loadAttendanceHistoryForDetailsModal]);

  const handleViewDetails = useCallback(
    async (row) => {
      setSelectedEmployee(row);
      setIsDetailsModalOpen(true);
      const detailRange =
        selectedDateRange?.[0] && selectedDateRange?.[1]
          ? [selectedDateRange[0].clone(), selectedDateRange[1].clone()]
          : null;
      if (detailRange) {
        setDetailsModalDateRange(detailRange);
        setDetailsRangePickerValue(detailRange);
      }

      fetchDynamicColumns();

      const { entitlementsCols, deductionsCols } = await prepareWeeklyDetailsColumns({
        fetchEntitlementsColumns,
        fetchDeductionsColumns,
        setVisibleColumns,
      });
      setEntitlementsColumns(entitlementsCols);
      setDeductionsColumns(deductionsCols);

      await fetchIncompleteAttendanceForSelectedEmployee(row, detailRange || selectedDateRange);
    },
    [
      selectedDateRange,
      fetchDynamicColumns,
      fetchEntitlementsColumns,
      fetchDeductionsColumns,
      setEntitlementsColumns,
      setDeductionsColumns,
      setVisibleColumns,
      fetchIncompleteAttendanceForSelectedEmployee,
    ]
  );

  const handleDetailsModalRangeChange = useCallback(
    (dates) => {
      if (!dates || !dates[0] || !dates[1]) return;
      const start = dayjs(dates[0]);
      const end = dayjs(dates[1]);
      const next = [start, end];
      setDetailsRangePickerValue(next);
      setDetailsModalDateRange(next);
      if (selectedEmployee) {
        fetchIncompleteAttendanceForSelectedEmployee(selectedEmployee, next);
      }
    },
    [selectedEmployee, fetchIncompleteAttendanceForSelectedEmployee]
  );

  const handleEdit = useCallback((row) => {
    setSelectedEmployee(row);
    setIsEditModalOpen(true);
  }, []);

  const handleOpenEmployeeDetailsFromSalary = useCallback(async () => {
    const employeeId = selectedEmployee?.employee_id ?? selectedEmployee?.id;
    if (!employeeId) return;
    try {
      const res = await fetch(
        getApiUrl(`/api/unified_employees_api.php?action=get_employee&employee_id=${employeeId}`)
      );
      const data = await res.json();
      if (data.success && data.data) {
        setEmployeeDetailsData(data.data);
        onEmployeeDetailsOpen();
      } else {
        toast({ title: 'فشل جلب بيانات الموظف', status: 'error', isClosable: true });
      }
    } catch (e) {
      debugError(e);
      toast({ title: 'خطأ في الاتصال', status: 'error', isClosable: true });
    }
  }, [selectedEmployee?.employee_id, selectedEmployee?.id, onEmployeeDetailsOpen, toast]);

  const handleDeleteEmployeeFromDetailsModal = useCallback(
    async (employee) => {
      try {
        const response = await fetch(getApiUrl('/api/unified_employees_api.php'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete_employee', employee_id: employee.id }),
        });
        const result = await response.json();
        if (result.success) {
          toast({
            title: 'تم حذف الموظف',
            description: `تم حذف ${employee.name_ar || employee.name} من قاعدة البيانات`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
          onEmployeeDetailsClose();
          setEmployeeDetailsData(null);
          setIsDetailsModalOpen(false);
          setSelectedEmployee(null);
        } else {
          throw new Error(result.message || 'فشل في حذف الموظف');
        }
      } catch (error) {
        toast({
          title: 'خطأ في حذف الموظف',
          description: error.message || 'حدث خطأ أثناء حذف الموظف',
          status: 'error',
          isClosable: true,
        });
      }
    },
    [onEmployeeDetailsClose, toast]
  );

  const handleOpenAttendanceHistoryModal = useCallback(() => {
    setIsAttendanceHistoryModalOpen(true);
    loadAttendanceHistoryForDetailsModal();
  }, [loadAttendanceHistoryForDetailsModal]);

  const handleOpenFixIncompleteModal = useCallback(async () => {
    const rows = await fetchIncompleteAttendanceForSelectedEmployee(
      selectedEmployee,
      detailsModalDateRange
    );
    if (!rows.length) {
      toast({
        title: 'لا توجد سجلات ناقصة',
        status: 'success',
        duration: 2500,
        isClosable: true,
      });
      return;
    }
    setIsFixIncompleteModalOpen(true);
  }, [fetchIncompleteAttendanceForSelectedEmployee, toast, selectedEmployee, detailsModalDateRange]);

  const updateIncompleteRecordField = useCallback((recordId, field, value) => {
    setIncompleteRecords((prev) => prev.map((r) => (r.id === recordId ? { ...r, [field]: value } : r)));
  }, []);

  const handleSaveIncompleteRecords = useCallback(async () => {
    if (!incompleteRecords.length || !selectedEmployee) return;
    const invalid = incompleteRecords.some((r) => !r.check_in_time || !r.check_out_time);
    if (invalid) {
      toast({
        title: 'بيانات غير مكتملة',
        description: 'يرجى إدخال وقت الحضور والانصراف لكل السجلات قبل الحفظ',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    const start = detailsModalDateRange?.[0]?.format?.('YYYY-MM-DD');
    const end = detailsModalDateRange?.[1]?.format?.('YYYY-MM-DD');
    const employeeId = selectedEmployee.employee_id ?? selectedEmployee.id;

    try {
      setSavingIncompleteFix(true);

      for (const row of incompleteRecords) {
        const res = await fetch(getApiUrl('/api/attendance_logs.php'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: row.id,
            check_in_time: `${row.check_in_time}:00`,
            check_out_time: `${row.check_out_time}:00`,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || json?.message || `فشل حفظ السجل #${row.id}`);
        }
      }

      const recomputeRes = await fetch(getApiUrl('/api/attendance_logs.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recompute_range',
          start_date: start,
          end_date: end,
          employee_id: employeeId,
        }),
      });
      const recomputeJson = await recomputeRes.json();
      if (!recomputeRes.ok || !recomputeJson?.success) {
        throw new Error(recomputeJson?.error || recomputeJson?.message || 'فشل إعادة الاحتساب');
      }

      const refreshed = await fetchData();
      if (refreshed?.success && Array.isArray(refreshed.data)) {
        const updatedEmp = refreshed.data.find(
          (e) => String(e.employee_id ?? e.id) === String(employeeId)
        );
        if (updatedEmp) setSelectedEmployee(updatedEmp);
      }

      await fetchIncompleteAttendanceForSelectedEmployee(selectedEmployee, detailsModalDateRange);
      setIsFixIncompleteModalOpen(false);
      toast({
        title: 'تم إصلاح السجلات الناقصة',
        description: 'تم الحفظ وإعادة الاحتساب وتحديث التفاصيل بنجاح',
        status: 'success',
        duration: 3500,
        isClosable: true,
      });
    } catch (e) {
      toast({
        title: 'خطأ في الإصلاح',
        description: e.message || 'حدث خطأ أثناء الحفظ',
        status: 'error',
        duration: 4500,
        isClosable: true,
      });
    } finally {
      setSavingIncompleteFix(false);
    }
  }, [
    incompleteRecords,
    selectedEmployee,
    detailsModalDateRange,
    fetchData,
    fetchIncompleteAttendanceForSelectedEmployee,
    toast,
  ]);

  return {
    selectedEmployee,
    setSelectedEmployee,
    isDetailsModalOpen,
    setIsDetailsModalOpen,
    isFixIncompleteModalOpen,
    setIsFixIncompleteModalOpen,
    incompleteRecords,
    savingIncompleteFix,
    detailsModalDateRange,
    detailsRangePickerValue,
    isAttendanceHistoryModalOpen,
    setIsAttendanceHistoryModalOpen,
    attendanceHistoryRecords,
    attendanceHistoryLoading,
    isEditModalOpen,
    setIsEditModalOpen,
    isEmployeeDetailsOpen,
    onEmployeeDetailsOpen,
    onEmployeeDetailsClose,
    employeeDetailsData,
    setEmployeeDetailsData,
    detailsNestedModalOpen,
    detailsWorkweekAttendanceRows,
    detailsWorkweekWideBlocks,
    handleViewDetails,
    handleDetailsModalRangeChange,
    handleEdit,
    handleOpenEmployeeDetailsFromSalary,
    handleDeleteEmployeeFromDetailsModal,
    handleOpenAttendanceHistoryModal,
    handleOpenFixIncompleteModal,
    updateIncompleteRecordField,
    handleSaveIncompleteRecords,
  };
}

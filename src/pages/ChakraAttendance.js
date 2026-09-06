import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getApiUrl } from '../utils/apiUrlHelper';
import { getFinancialTableColumnClass } from '../utils/financialColumnClasses';
import { useSettings } from '../contexts/SettingsContext';
import { isMealAllowanceEnabled } from '../utils/systemFeatureFlags';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Card,
  CardBody,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  Tooltip,
  FormLabel,
  FormErrorMessage,
  useDisclosure,
  useToast,
  useColorModeValue,
  Badge,
  IconButton,
  Grid,
  GridItem,
  Textarea,
  useBreakpointValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Spinner,
  Center,
  Heading,
  Flex,
  Divider,
  Alert,
  AlertIcon,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  Checkbox,
  CheckboxGroup,
  RadioGroup,
  Radio,
  Stack,
  Circle,
  Icon,
  Portal,
} from '@chakra-ui/react';
import {
  FiSearch,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiCheck,
  FiX,
  FiEye,
  FiMoreVertical,
  FiRefreshCw,
  FiDownload,
  FiUpload,
  FiSettings,
  FiZap,
  FiActivity,
  FiRotateCcw,
  FiCalendar,
  FiClock,
  FiUser,
  FiSave,
  FiTrendingUp,
  FiTrendingDown,
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiAlertTriangle,
  FiDollarSign,
  FiBarChart2,
  FiFilter,
  FiInfo,
  FiChevronUp,
  FiChevronDown,
  FiHash,
  FiKey,
  FiBriefcase,
  FiTarget,
  FiCheckCircle,
  FiXCircle,
  FiDivide,
  FiCpu,
  FiRepeat,
  FiCoffee,
  FiAlertCircle,
  FiMinusCircle,
  FiNavigation
} from 'react-icons/fi';
import EnglishKeyTooltip from '../components/EnglishKeyTooltip';
import { useForm } from 'react-hook-form';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import { useNavigate, useLocation } from 'react-router-dom';
import useCurrency from '../hooks/useCurrency';
import { useAttendanceToolbar } from '../contexts/AttendanceToolbarContext';
import PagePanelToggle from '../components/PagePanelToggle';

/** خلية التاريخ: يوم ثم شهر (يمين→يسار في RTL)، وتلميح = اسم اليوم + اليوم + الشهر + السنة بالعربية */
const getAttendanceDateCellParts = (dateStr) => {
  const d = dayjs(dateStr);
  if (!d.isValid()) return null;
  return {
    tooltip: d.locale('ar').format('dddd، D MMMM YYYY'),
    day: d.format('DD'),
    month: d.format('MM'),
  };
};

const ChakraAttendance = () => {
  const location = useLocation();
  const incomingSalaryNav = location.state?.fromWeeklySalary ? location.state : null;
  const incomingSalaryRange = incomingSalaryNav?.dateRange;
  const hasIncomingSalaryRange = Boolean(incomingSalaryRange?.[0] && incomingSalaryRange?.[1]);

  const { filtersCollapsed, setFiltersCollapsed, toggleFiltersCollapsed } = useAttendanceToolbar();
  const { settings } = useSettings();
  const mealAllowanceEnabled = isMealAllowanceEnabled(settings);
  const attendanceDateToolbarRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  // تطبيق إعدادات الجداول
  useEffect(() => {
    const applyTableSettings = () => {
      const root = document.documentElement;
      const tableFontFamily = getComputedStyle(root).getPropertyValue('--table-font-family');
      const tableFontSize = getComputedStyle(root).getPropertyValue('--table-font-size');
      const tableFontWeight = getComputedStyle(root).getPropertyValue('--table-font-weight');
      
      if (tableFontFamily) {
        root.style.setProperty('--table-font-family', tableFontFamily);
      }
      if (tableFontSize) {
        root.style.setProperty('--table-font-size', tableFontSize);
      }
      if (tableFontWeight) {
        root.style.setProperty('--table-font-weight', tableFontWeight);
      }
    };

    applyTableSettings();
  }, []);
  
  // Search and filter states
  const [searchText, setSearchText] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => incomingSalaryNav?.statusFilter || '');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [salaryTypeFilter, setSalaryTypeFilter] = useState('');
  
  // State for date range mode (automatic or manual)
  const [rangeLockedFromSalary, setRangeLockedFromSalary] = useState(hasIncomingSalaryRange);
  const [isAutomaticMode, setIsAutomaticMode] = useState(() => !hasIncomingSalaryRange);
  
  // State for showing/hiding holidays
  const [showHolidays, setShowHolidays] = useState(true);

  // State for system variables
  const [officialStartTime, setOfficialStartTime] = useState('08:00:00'); // Default value
  const [officialEndTime, setOfficialEndTime] = useState('18:30:00');
  const [overtimeStartGraceMinutes, setOvertimeStartGraceMinutes] = useState(15);

  // Get current week range (Friday to Thursday)
  const getCurrentWeekRange = () => {
    const today = dayjs();
    // Get day of week (0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday)
    const dayOfWeek = today.day();
    
    // Calculate days to subtract to get to Friday (5)
    // Formula examples:
    // - Friday (5): 0
    // - Saturday (6): 1
    // - Sunday (0): 2
    // - Monday (1): 3
    // - Tuesday (2): 4
    // - Wednesday (3): 5
    // - Thursday (4): 6
    const daysToSubtract = (dayOfWeek + 2) % 7;
    
    const startOfWeek = today.subtract(daysToSubtract, 'day').startOf('day');
    const endOfWeek = startOfWeek.add(6, 'day').endOf('day');
    
    return [startOfWeek, endOfWeek];
  };

  // Get week range for a specific date (Friday to Thursday)
  const getWeekRangeForDate = (date) => {
    if (!date) return null;
    
    const selectedDate = dayjs(date);
    const dayOfWeek = selectedDate.day();
    
    // Calculate days to subtract to get to Friday (5)
    const daysToSubtract = (dayOfWeek + 2) % 7;
    
    const startOfWeek = selectedDate.subtract(daysToSubtract, 'day').startOf('day');
    const endOfWeek = startOfWeek.add(6, 'day').endOf('day');
    
    return [startOfWeek, endOfWeek];
  };

  // Get current date for dynamic date range (manual mode)
  const getCurrentMonthRange = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Start from first day of current month
    const startDate = new Date(currentYear, currentMonth, 1);
    // End at last day of current month
    const endDate = new Date(currentYear, currentMonth + 1, 0);
    
    return [startDate, endDate];
  };

  // State for Ant Design Range DatePicker
  const [rangePickerValue, setRangePickerValue] = useState(() => {
    if (hasIncomingSalaryRange) {
      return [dayjs(incomingSalaryRange[0]), dayjs(incomingSalaryRange[1])];
    }
    if (isAutomaticMode) {
      const [start, end] = getCurrentWeekRange();
      return [start, end];
    } else {
      const [startDate, endDate] = getCurrentMonthRange();
      return [dayjs(startDate), dayjs(endDate)];
    }
  });

  // Update range picker when mode changes (unless range came from weekly salary page)
  useEffect(() => {
    if (rangeLockedFromSalary) return;
    if (isAutomaticMode) {
      const [start, end] = getCurrentWeekRange();
      setRangePickerValue([start, end]);
    } else {
      const [startDate, endDate] = getCurrentMonthRange();
      setRangePickerValue([dayjs(startDate), dayjs(endDate)]);
    }
  }, [isAutomaticMode, rangeLockedFromSalary]);
  
  // Function to handle Range DatePicker change
  const handleRangePickerChange = (dates) => {
    setRangeLockedFromSalary(false);
    if (isAutomaticMode) {
      // Automatic mode: automatically select full week (Friday to Thursday)
      if (dates && dates[0]) {
        const weekRange = getWeekRangeForDate(dates[0]);
        if (weekRange) {
          setRangePickerValue(weekRange);
          setDateFilter('');
        }
      } else {
        // If dates are cleared, reset to current week
        const [start, end] = getCurrentWeekRange();
        setRangePickerValue([start, end]);
        setDateFilter('');
      }
    } else {
      // Manual mode: allow free date selection
      if (dates && dates[0] && dates[1]) {
        setRangePickerValue(dates);
        setDateFilter('');
      } else {
        // If no dates selected, reset to current month
        const [startDate, endDate] = getCurrentMonthRange();
        setRangePickerValue([dayjs(startDate), dayjs(endDate)]);
        setDateFilter('');
      }
    }
  };

  const applyDateRange = (range) => {
    if (!range?.[0] || !range?.[1]) return;
    setRangePickerValue(range);
    setDateFilter('');
  };

  const handleSetCurrentWeek = () => {
    applyDateRange(getCurrentWeekRange());
  };

  const handleSetPreviousWeek = () => {
    const anchor = rangePickerValue?.[0] || getCurrentWeekRange()[0];
    const prevWeekStart = dayjs(anchor).subtract(7, 'day');
    applyDateRange(getWeekRangeForDate(prevWeekStart));
  };

  const handleSetCurrentMonth = () => {
    applyDateRange([dayjs().startOf('month'), dayjs().endOf('month')]);
  };

  const handleSetPreviousMonth = () => {
    const anchor = rangePickerValue?.[0] || dayjs();
    const prevMonth = dayjs(anchor).subtract(1, 'month');
    applyDateRange([prevMonth.startOf('month'), prevMonth.endOf('month')]);
  };
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // تنظيم أعمدة جدول الحضور (مثل صفحة الأقسام)
  const defaultAttTableColumns = [
    { id: 'date', label: 'التاريخ', visible: true },
    { id: 'employee_code', label: 'كود الموظف', visible: true },
    { id: 'employee', label: 'الموظف', visible: true },
    { id: 'salary_type', label: 'الراتب', visible: true },
    { id: 'department', label: 'القسم', visible: true },
    { id: 'cost_center', label: 'التكلفة', visible: true },
    { id: 'check_in_time', label: 'الحضور', visible: true },
    { id: 'check_out_time', label: 'الانصراف', visible: true },
    { id: 'work_hours', label: 'الساعات', visible: true },
    { id: 'overtime_hours', label: 'الإضافي', visible: true },
    { id: 'early_leave_minutes', label: 'الانصراف المبكر', visible: true },
    { id: 'meal_allowance', label: 'الوجبة', visible: true },
    { id: 'late_penalty', label: 'التأخير', visible: true },
    { id: 'status', label: 'الحالة', visible: true },
  ];
  const [attTableColumns, setAttTableColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('attTableColumns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.some(c => c.id === 'employee_code')) {
          const codeCol = { id: 'employee_code', label: 'كود الموظف', visible: true };
          const idx = parsed.findIndex(c => c.id === 'employee');
          parsed.splice(idx >= 0 ? idx : parsed.length, 0, codeCol);
        }
        if (!parsed.some(c => c.id === 'early_leave_minutes')) {
          const earlyLeaveCol = { id: 'early_leave_minutes', label: 'الانصراف المبكر', visible: true };
          const idx = parsed.findIndex(c => c.id === 'overtime_hours');
          parsed.splice(idx >= 0 ? idx + 1 : parsed.length, 0, earlyLeaveCol);
        }
        return parsed;
      }
      return defaultAttTableColumns;
    } catch {
      return defaultAttTableColumns;
    }
  });
  useEffect(() => {
    localStorage.setItem('attTableColumns', JSON.stringify(attTableColumns));
  }, [attTableColumns]);
  const toggleAttColumn = (id) => {
    setAttTableColumns(cols => cols.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };
  const visibleAttTableColumns = useMemo(
    () => attTableColumns.filter((c) => c.visible && (mealAllowanceEnabled || c.id !== 'meal_allowance')),
    [attTableColumns, mealAllowanceEnabled]
  );
  const moveAttColumn = (id, direction) => {
    setAttTableColumns(cols => {
      const idx = cols.findIndex(c => c.id === id);
      if (idx < 0) return cols;
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= cols.length) return cols;
      const newCols = [...cols];
      [newCols[idx], newCols[swapWith]] = [newCols[swapWith], newCols[idx]];
      return newCols;
    });
  };
  
  // Filter dropdown states
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [selectedFilterType, setSelectedFilterType] = useState('');
  
  // Employee attendance modal
  const [isEmployeeAttendanceOpen, setIsEmployeeAttendanceOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeAttendanceRecords, setEmployeeAttendanceRecords] = useState([]);
  const [dateInfo, setDateInfo] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(1); // For weekly employees
  const [editingAttendanceRecord, setEditingAttendanceRecord] = useState(null); // For editing records in attendance modal

  // Bulk selection and edit (when date range is selected)
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const [bulkEditTime, setBulkEditTime] = useState('08:00');
  const [bulkEditSaving, setBulkEditSaving] = useState(false);
  const { isOpen: isBulkEditOpen, onOpen: onBulkEditOpen, onClose: onBulkEditClose } = useDisclosure();
  const [bulkEditType, setBulkEditType] = useState(null); // 'check_in' | 'check_out'
  
  // Statistics
  const [stats, setStats] = useState({
    totalRecords: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    attendanceRate: 0,
    totalHours: 0,
    overtimeHours: 0,
  });
  
  // Modals
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
  const { isOpen: isEmployeeDetailsOpen, onOpen: onEmployeeDetailsOpen, onClose: onEmployeeDetailsClose } = useDisclosure();
  const [employeeDetailsData, setEmployeeDetailsData] = useState(null);
  
  const toast = useToast();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  
  // فتح مودال تفاصيل الموظف من سجل الحضور (عند النقر على اسم الموظف)
  const handleOpenEmployeeDetailsFromRecord = useCallback(async () => {
    if (!selectedRecord?.employee_id) return;
    try {
      const res = await fetch(getApiUrl(`/api/unified_employees_api.php?action=get_employee&employee_id=${selectedRecord.employee_id}`));
      const data = await res.json();
      if (data.success && data.data) {
        setEmployeeDetailsData(data.data);
        onEmployeeDetailsOpen();
      } else {
        toast({ title: 'فشل جلب بيانات الموظف', status: 'error', isClosable: true });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'خطأ في الاتصال', status: 'error', isClosable: true });
    }
  }, [selectedRecord?.employee_id, onEmployeeDetailsOpen, toast]);

  // حذف الموظف من مودال التفاصيل (نفس منطق صفحة إدارة الموظفين)
  const handleDeleteEmployeeFromDetailsModal = useCallback(async (employee) => {
    try {
      const response = await fetch(getApiUrl('/api/unified_employees_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_employee', employee_id: employee.id })
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
        loadAttendanceRecords(); // إعادة تحميل بيانات الحضور
      } else {
        throw new Error(result.message || 'فشل في حذف الموظف');
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({
        title: 'خطأ في حذف الموظف',
        description: error.message || 'حدث خطأ أثناء حذف الموظف',
        status: 'error',
        isClosable: true,
      });
    }
  }, [onEmployeeDetailsClose, toast]);
  
  // Form handling
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      employee_id: '',
      attendance_date: '',
      check_in_time: '08:00:00',
      check_out_time: '17:00:00',
      status: 'present',
      work_hours: 0,
      overtime_hours: 0,
      late_minutes: 0,
      early_leave_minutes: 0,
      is_holiday: false,
      is_excused: false,
      notes: ''
    }
  });
  const { register: bulkRegister, handleSubmit: handleBulkSubmit, reset: resetBulk } = useForm();
  
  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.400');
  
  // Responsive breakpoints
  const isMobile = useBreakpointValue({ base: true, lg: false });

  const normalizeTimeValue = useCallback((value, fallback) => {
    let timeValue = (value || '').toString().trim();
    if (!timeValue || !timeValue.includes(':')) return fallback;
    if (timeValue.match(/^\d{1,2}:\d{2}$/)) return `${timeValue}:00`;
    return timeValue;
  }, []);

  const fetchAttendanceSystemVariables = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/system_variables_api.php?action=get_variables'));
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        const byKey = Object.fromEntries(
          data.data.map(v => [v.variable_key, v.variable_value])
        );
        setOfficialStartTime(normalizeTimeValue(byKey.official_start_time, '08:00:00'));
        setOfficialEndTime(normalizeTimeValue(byKey.official_end_time, '18:30:00'));
        const grace = parseInt(byKey.overtime_start_grace_minutes, 10);
        setOvertimeStartGraceMinutes(Number.isNaN(grace) ? 15 : Math.max(0, grace));
      }
    } catch (error) {
      console.error('Error fetching attendance system variables:', error);
    }
  }, [normalizeTimeValue]);

  // جلب متغيرات الحضور وتحديثها تلقائياً حتى تظل الرسالة ديناميكية
  useEffect(() => {
    fetchAttendanceSystemVariables();

    const onFocus = () => {
      fetchAttendanceSystemVariables();
    };
    window.addEventListener('focus', onFocus);

    const timer = setInterval(() => {
      fetchAttendanceSystemVariables();
    }, 30000);

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, [fetchAttendanceSystemVariables]);

  const skipRangeAbsenceSyncRef = useRef(true);

  useEffect(() => {
    loadEmployees();
    loadDepartments();
    loadDateInfo();
    loadAttendanceRecords({ showSpinner: true });
    
    // Set default filter to current month dynamically
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setDateFilter(currentMonth);
  }, []);

  // عند تغيير الفترة: تصفية فورية من البيانات المحمّلة + مزامنة الغياب التلقائي في الخلفية دون إخفاء الصفحة
  useEffect(() => {
    if (!rangePickerValue || !rangePickerValue[0] || !rangePickerValue[1]) {
      return;
    }
    if (skipRangeAbsenceSyncRef.current) {
      skipRangeAbsenceSyncRef.current = false;
      return;
    }
    loadAttendanceRecords({ showSpinner: false });
  }, [rangePickerValue]);



  // Filter records (الفترة + الفلاتر؛ الجدول يعرض كل النتائج دون ترقيم صفحات)
  const filteredRecords = useMemo(() => {
    // Filter out any null or undefined records
    let filtered = (attendanceRecords || []).filter(record => record != null);

    // Search by employee name (Arabic or English)
    if (searchText) {
      filtered = filtered.filter(record => 
        record.Name?.toLowerCase().includes(searchText.toLowerCase()) ||
        record.name_ar?.toLowerCase().includes(searchText.toLowerCase()) ||
        record.employee_code?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Filter by date range
    if (rangePickerValue && rangePickerValue[0] && rangePickerValue[1]) {
      const startDate = rangePickerValue[0].format('YYYY-MM-DD');
      const endDate = rangePickerValue[1].format('YYYY-MM-DD');
      
      filtered = filtered.filter(record => {
        if (!record || !record.attendance_date) return false;
        const recordDate = record.attendance_date;
        // Normalize record date to YYYY-MM-DD format for comparison
        let normalizedRecordDate = recordDate;
        if (typeof recordDate === 'string') {
          // Extract date part if it includes time (e.g., "2026-01-03 00:00:00" -> "2026-01-03")
          normalizedRecordDate = recordDate.split(' ')[0];
          // Also handle other formats like "2026/01/03"
          normalizedRecordDate = normalizedRecordDate.replace(/\//g, '-');
        } else if (recordDate instanceof Date) {
          // Convert Date object to YYYY-MM-DD
          normalizedRecordDate = dayjs(recordDate).format('YYYY-MM-DD');
        }
        
        return normalizedRecordDate >= startDate && normalizedRecordDate <= endDate;
      });
    } else if (dateFilter) {
      // Fallback to old dateFilter logic for compatibility
      if (dateFilter.length === 10) {
        filtered = filtered.filter(record => record && record.attendance_date && record.attendance_date === dateFilter);
      } else if (dateFilter.length === 7) {
        filtered = filtered.filter(record => record && record.attendance_date && record.attendance_date.startsWith(dateFilter));
      }
    }

    // Filter by status
    if (statusFilter && statusFilter !== '') {
      if (statusFilter === 'holiday') {
        // تصفية حسب العطلة
        filtered = filtered.filter(record => 
          record.is_holiday === 1 || 
          record.is_holiday === true || 
          record.is_holiday === '1'
        );
      } else if (statusFilter === 'excused') {
        // تصفية حسب الأذونات
        filtered = filtered.filter(record => 
          record.is_excused === 1 || 
          record.is_excused === true || 
          record.is_excused === '1'
        );
      } else {
        // تصفية حسب الحالة العادية
        filtered = filtered.filter(record => calculateStatus(record) === statusFilter);
      }
    }

    // Filter by department
    if (departmentFilter && departmentFilter !== '') {
      filtered = filtered.filter(record => 
        record.department_description === departmentFilter || 
        record.department === departmentFilter
      );
    }

    // Filter by employee
    if (employeeFilter && employeeFilter !== '') {
      filtered = filtered.filter(record => record.employee_id === employeeFilter);
    }


    // Filter by salary type
    if (salaryTypeFilter && salaryTypeFilter !== '') {
      filtered = filtered.filter(record => record.salary_type === salaryTypeFilter);
    }

    // Filter holidays if showHolidays is false
    if (!showHolidays) {
      filtered = filtered.filter(record => 
        !(record.is_holiday === 1 || 
          record.is_holiday === true || 
          record.is_holiday === '1')
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        // Map sort key to actual field names
        let actualKey = sortConfig.key;
        if (sortConfig.key === 'date') actualKey = 'attendance_date';
        if (sortConfig.key === 'work_hours') actualKey = 'total_hours';
        if (sortConfig.key === 'late_penalty') actualKey = 'late_penalty_hours';

        let aValue = a[actualKey];
        let bValue = b[actualKey];

        // Handle different data types
        if (sortConfig.key === 'date' || sortConfig.key === 'attendance_date') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (sortConfig.key === 'employee') {
          aValue = ((a.name_ar || a.Name || a.employee_code) || '').toString().toLowerCase();
          bValue = ((b.name_ar || b.Name || b.employee_code) || '').toString().toLowerCase();
        } else if (sortConfig.key === 'work_hours' || sortConfig.key === 'overtime_hours' || sortConfig.key === 'early_leave_minutes' || sortConfig.key === 'late_penalty') {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        } else if (sortConfig.key === 'meal_allowance') {
          // الوجبة: ترتيب حسب وقت الحضور كبديل (لا يوجد حقل مباشر)
          aValue = (a.check_in_time || '').toString();
          bValue = (b.check_in_time || '').toString();
        } else {
          // String: salary_type, department, cost_center, check_in_time, check_out_time, status
          aValue = (aValue || '').toString().toLowerCase();
          bValue = (bValue || '').toString().toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [attendanceRecords, searchText, dateFilter, rangePickerValue, statusFilter, departmentFilter, employeeFilter, salaryTypeFilter, sortConfig, showHolidays]);

  const attendanceSearchDatePool = useMemo(() => {
    let filtered = (attendanceRecords || []).filter((record) => record != null);

    if (searchText) {
      const term = searchText.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.Name?.toLowerCase().includes(term) ||
          record.name_ar?.toLowerCase().includes(term) ||
          record.employee_code?.toLowerCase().includes(term)
      );
    }

    if (rangePickerValue && rangePickerValue[0] && rangePickerValue[1]) {
      const startDate = rangePickerValue[0].format('YYYY-MM-DD');
      const endDate = rangePickerValue[1].format('YYYY-MM-DD');
      filtered = filtered.filter((record) => {
        if (!record?.attendance_date) return false;
        let normalizedRecordDate = record.attendance_date;
        if (typeof normalizedRecordDate === 'string') {
          normalizedRecordDate = normalizedRecordDate.split(' ')[0].replace(/\//g, '-');
        } else if (normalizedRecordDate instanceof Date) {
          normalizedRecordDate = dayjs(normalizedRecordDate).format('YYYY-MM-DD');
        }
        return normalizedRecordDate >= startDate && normalizedRecordDate <= endDate;
      });
    } else if (dateFilter) {
      if (dateFilter.length === 10) {
        filtered = filtered.filter(
          (record) => record?.attendance_date && record.attendance_date === dateFilter
        );
      } else if (dateFilter.length === 7) {
        filtered = filtered.filter(
          (record) => record?.attendance_date && record.attendance_date.startsWith(dateFilter)
        );
      }
    }

    if (!showHolidays) {
      filtered = filtered.filter(
        (record) =>
          !(record.is_holiday === 1 || record.is_holiday === true || record.is_holiday === '1')
      );
    }

    return filtered;
  }, [attendanceRecords, searchText, dateFilter, rangePickerValue, showHolidays]);

  // Calculate statistics
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayRecords = (attendanceRecords || []).filter(record => record && (record.attendance_date === today || record.date === today));
    
    const presentCount = todayRecords.filter(record => record.status === 'present').length;
    const absentCount = todayRecords.filter(record => record.status === 'absent').length;
    const lateCount = todayRecords.filter(record => record.status === 'late').length;
    const totalCount = todayRecords.length;
    const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
    
    const totalHours = todayRecords.reduce((sum, record) => {
      return sum + (parseFloat(record.total_hours) || 0);
    }, 0);
    
    const overtimeHours = todayRecords.reduce((sum, record) => {
      return sum + (parseFloat(record.overtime_hours) || 0);
    }, 0);

    setStats({
      totalRecords: attendanceRecords.length,
      presentToday: presentCount,
      absentToday: absentCount,
      lateToday: lateCount,
      attendanceRate: attendanceRate,
      totalHours: totalHours,
      overtimeHours: overtimeHours,
    });
  }, [attendanceRecords]);

  const loadAttendanceRecords = async ({ showSpinner = true } = {}) => {
    if (showSpinner) {
      setLoading(true);
    }
    try {
      const hasRange = rangePickerValue && rangePickerValue[0] && rangePickerValue[1];
      if (hasRange) {
        const startDate = rangePickerValue[0].format('YYYY-MM-DD');
        const endDate = rangePickerValue[1].format('YYYY-MM-DD');
        try {
          await fetch(getApiUrl('/api/attendance_logs.php'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'fill_missing_absence',
              start_date: startDate,
              end_date: endDate,
            }),
          });
        } catch (fillError) {
          console.warn('fill_missing_absence failed:', fillError);
        }
      }

      const response = await fetch(getApiUrl('/api/attendance_logs.php'));
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        console.log('Loaded attendance records:', data.data);
        // التحقق من وجود is_excused في البيانات
        if (data.data && data.data.length > 0) {
          const sampleRecord = data.data[0];
          console.log('Sample record fields:', Object.keys(sampleRecord));
          console.log('Sample record is_excused:', sampleRecord.is_excused, 'type:', typeof sampleRecord.is_excused);
          const recordsWithExcused = data.data.filter(r => r.is_excused === 1 || r.is_excused === true || r.is_excused === '1');
          if (recordsWithExcused.length > 0) {
            console.log('Found', recordsWithExcused.length, 'records with excused:', recordsWithExcused.map(r => ({ id: r.id, date: r.attendance_date, is_excused: r.is_excused })));
          } else {
            console.log('No records with excused found. Checking all records...');
            data.data.forEach(r => {
              if (r.is_excused !== undefined && r.is_excused !== null && r.is_excused !== 0 && r.is_excused !== false) {
                console.log('Record with non-zero is_excused:', r.id, 'date:', r.attendance_date, 'is_excused:', r.is_excused, 'type:', typeof r.is_excused);
              }
            });
          }
        }
        setAttendanceRecords(data.data || []);
      } else {
        console.warn('API returned success: false', data);
        setAttendanceRecords([]);
        toast({
          title: 'تحذير',
          description: data.message || 'فشل في تحميل سجلات الحضور',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error loading attendance records:', error);
      setAttendanceRecords([]);
      toast({
        title: 'خطأ في الاتصال',
        description: 'فشل في الاتصال بخادم قاعدة البيانات',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  };

  const handleRecomputeRange = useCallback(async () => {
    const hasRange = rangePickerValue && rangePickerValue[0] && rangePickerValue[1];
    const startDate = hasRange ? rangePickerValue[0].format('YYYY-MM-DD') : null;
    const endDate = hasRange ? rangePickerValue[1].format('YYYY-MM-DD') : null;
    if (!hasRange) {
      toast({
        title: 'حدد فترة أولاً',
        description: 'يرجى اختيار فترة زمنية قبل إعادة الاحتساب الشامل',
        status: 'warning',
        duration: 4000,
      });
      return;
    }
    if (!window.confirm(`هل تريد إعادة احتساب جميع القيم (ساعات العمل + الإضافي + التأخير + الانصراف المبكر) وتحديث قاعدة البيانات للفترة ${startDate} إلى ${endDate}؟`)) {
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/api/attendance_logs.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recompute_range',
          start_date: startDate,
          end_date: endDate
        })
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: 'تمت إعادة الاحتساب الشامل',
          description: result.message || `تم تحديث ${result.updated_records || 0} سجل للفترة المحددة`,
          status: 'success',
          duration: 5000,
        });
        loadAttendanceRecords();
      } else {
        toast({
          title: 'خطأ في إعادة الحساب',
          description: result.error || result.message || 'حدث خطأ',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ في إعادة الحساب',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [rangePickerValue, toast]);

  const loadEmployees = async () => {
    try {
      const response = await fetch(getApiUrl('/api/simple_attendance_api.php?action=get_employees'));
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setEmployees(data.data || []);
      } else {
        console.warn('API returned success: false for employees', data);
        setEmployees([]);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await fetch(getApiUrl('/api/simple_attendance_api.php?action=get_departments'));
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data || []);
      } else {
        console.warn('API returned success: false for departments', data);
        setDepartments([]);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
      setDepartments([]);
    }
  };

  const loadDateInfo = async () => {
    try {
      const response = await fetch(getApiUrl('/api/simple_attendance_api.php?action=get_current_date_info'));
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setDateInfo(data.data);
      }
    } catch (error) {
      console.error('Error loading date info:', error);
    }
  };

  const loadEmployeeAttendance = async (employeeId, salaryType, weekNumber = null) => {
    try {
      let employeeRecords = (attendanceRecords || []).filter(record => 
        record && 
        record.employee_id === employeeId && 
        record.salary_type === salaryType
      );

      // For weekly employees, filter by selected week
      if (salaryType === 'Weekly' && weekNumber && dateFilter && dateFilter.length === 7) {
        const weeks = generateMonthWeeks();
        const selectedWeekData = weeks.find(w => w.week === weekNumber);
        
        if (selectedWeekData) {
          employeeRecords = employeeRecords.filter(record => {
            if (!record || !record.attendance_date) return false;
            const recordDate = new Date(record.attendance_date);
            const weekStart = new Date(selectedWeekData.start);
            const weekEnd = new Date(selectedWeekData.end);
            return recordDate >= weekStart && recordDate <= weekEnd;
          });
        }
      }
      
      setEmployeeAttendanceRecords(employeeRecords);
      
      return {
        success: true,
        data: employeeRecords,
        employee_id: employeeId,
        salary_type: salaryType,
        period_type: salaryType === 'Weekly' ? 'weekly' : 'monthly',
        week_number: weekNumber
      };
    } catch (error) {
      console.error('Error loading employee attendance:', error);
      toast({
        title: 'خطأ في الاتصال',
        description: 'فشل في جلب سجلات الحضور',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return null;
    }
  };

  const handleViewEmployeeAttendance = async (record) => {
    setSelectedEmployee(record);
    setSelectedWeek(1); // Reset to first week
    const result = await loadEmployeeAttendance(record.employee_id, record.salary_type, 1);
    if (result) {
      setIsEmployeeAttendanceOpen(true);
    }
  };

  const handleWeekChange = async (weekNumber) => {
    setSelectedWeek(weekNumber);
    if (selectedEmployee) {
      await loadEmployeeAttendance(selectedEmployee.employee_id, selectedEmployee.salary_type, weekNumber);
    }
  };

  // هل الفترة الزمنية محددة (لإظهار checkbox التحديد الجماعي)
  const hasDateRangeSelected = Boolean(rangePickerValue && rangePickerValue[0] && rangePickerValue[1]);

  const toggleSelectAllRecords = useCallback(() => {
    setSelectedRecordIds(prev => {
      const ids = (filteredRecords || []).map(r => r.id).filter(Boolean);
      const allSelected = ids.length > 0 && ids.every(id => prev.includes(id));
      if (allSelected) {
        return prev.filter(id => !ids.includes(id));
      }
      return [...new Set([...prev, ...ids])];
    });
  }, [filteredRecords]);

  const toggleSelectRecord = useCallback((recordId) => {
    setSelectedRecordIds(prev =>
      prev.includes(recordId) ? prev.filter(id => id !== recordId) : [...prev, recordId]
    );
  }, []);

  const openBulkEditModal = (type) => {
    setBulkEditType(type);

    // لو سجل واحد فقط: نملأ التوقيت من نفس السجل
    // لو أكثر من سجل: نخلي الحقل فاضي عشان المستخدم يكتب التوقيت بنفسه
    if (selectedRecordIds.length === 1) {
      const firstId = selectedRecordIds[0];
      const firstRecord = (attendanceRecords || []).find(r => r && r.id === firstId);
      let initialTime = '';
      if (firstRecord) {
        const raw = type === 'check_in'
          ? (firstRecord.check_in_time || firstRecord.check_in || '')
          : (firstRecord.check_out_time || firstRecord.check_out || '');
        initialTime = toFormTimeValue(raw);
      }
      setBulkEditTime(initialTime || '');
    } else {
      // أكثر من سجل: حقل فاضي
      setBulkEditTime('');
    }

    onBulkEditOpen();
  };

  const handleBulkEditSave = async () => {
    if (!bulkEditType || selectedRecordIds.length === 0) return;
    const timeValue = bulkEditTime.trim();
    if (!timeValue) {
      toast({ title: 'تنبيه', description: 'أدخل التوقيت', status: 'warning', isClosable: true });
      return;
    }
    setBulkEditSaving(true);
    try {
      const response = await fetch(getApiUrl('/api/unified_attendance_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_update_attendance',
          record_ids: selectedRecordIds,
          field: bulkEditType,
          value: timeValue.length === 5 ? timeValue + ':00' : timeValue,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'تم', description: data.message || 'تم التحديث بنجاح', status: 'success', isClosable: true });
        onBulkEditClose();
        setSelectedRecordIds([]);
        loadAttendanceRecords();
      } else {
        toast({ title: 'خطأ', description: data.message || 'فشل التحديث', status: 'error', isClosable: true });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', status: 'error', isClosable: true });
    } finally {
      setBulkEditSaving(false);
    }
  };

  // Get appropriate period for employee based on salary type
  const getEmployeePeriod = (record) => {
    if (!dateInfo) return '-';
    
    if (record.salary_type === 'Weekly') {
      return dateInfo.week_period;
    } else {
      return dateInfo.month_period;
    }
  };

  // Get appropriate period display for employee
  const getEmployeePeriodDisplay = (record) => {
    if (!dateInfo) return '-';
    
    if (record.salary_type === 'Weekly') {
      // إزالة "أسبوعي:" والسنة من الفترة
      const weekPeriod = dateInfo.week_period.replace('أسبوعي: ', '').replace(/\/\d{4}/, '');
      return weekPeriod;
    } else {
      // إزالة "شهري:" والسنة من الفترة
      const monthPeriod = dateInfo.month_period.replace('شهري: ', '').replace(/\/\d{4}/, '');
      return monthPeriod;
    }
  };

  // Format hours and minutes properly
  const formatHoursAndMinutes = (hours) => {
    const totalHours = parseFloat(hours) || 0;
    
    if (totalHours === 0) {
      return '0 س';
    } else if (totalHours < 1) {
      const minutes = Math.round(totalHours * 60);
      return `${minutes} د`;
    } else {
      const wholeHours = Math.floor(totalHours);
      const remainingMinutes = Math.round((totalHours - wholeHours) * 60);
      
      if (remainingMinutes === 0) {
        return `${wholeHours} س`;
      } else {
        return `${wholeHours} س ${remainingMinutes} د`;
      }
    }
  };

  // Format minutes as hours/minutes text
  const formatMinutesAsHoursAndMinutes = (minutes) => {
    const totalMinutes = parseFloat(minutes) || 0;
    if (totalMinutes <= 0) return '0 س';
    return formatHoursAndMinutes(totalMinutes / 60);
  };

  // هل وقت الحضور/الانصراف فارغ أو يعني «لا يوجد» (غياب)
  const isEmptyAttendanceTime = (time) => {
    if (time === null || time === undefined) return true;
    const normalized = String(time).trim();
    return (
      normalized === '' ||
      normalized === '00:00' ||
      normalized === '00:00:00' ||
      normalized.toUpperCase() === 'NULL'
    );
  };

  // قيمة لحقل type="time" — الفارغ/00:00 يُعرض كحقل فارغ وليس 12:00 AM
  const toFormTimeValue = (time) => {
    if (isEmptyAttendanceTime(time)) return '';
    const raw = String(time).trim();
    return raw.length >= 5 ? raw.substring(0, 5) : raw;
  };

  // Format time without seconds
  const formatTime = (time) => {
    if (isEmptyAttendanceTime(time)) return '-';
    return String(time).substring(0, 5); // Remove seconds (HH:mm:ss → HH:mm)
  };

  // Calculate late penalty hours
  const calculateLatePenalty = (lateMinutes) => {
    const minutes = parseFloat(lateMinutes) || 0;
    if (minutes <= 0) return 0;
    
    if (minutes >= 60) {
      const lateHours = minutes / 60;
      return lateHours * 2; // Full hour or more = double penalty
    } else {
      return 0.5 * 2; // Less than hour = half hour doubled = 1 hour
    }
  };

  // Convert time string to minutes for comparison
  const timeToMinutes = (timeString) => {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    return (hours * 60) + (minutes || 0);
  };

  // Check if employee is eligible for meal allowance
  // ملاحظة: grace_period لا يُستخدم في حساب استحقاق الوجبة - فقط official_start_time
  const isMealEligible = (record) => {
    if (record.salary_type !== 'Weekly') return false;
    
    // لا يتم حساب وجبة في أيام العطلات
    if (record.is_holiday) return false;

    const status = (record.status || '').toString().toLowerCase();
    if (status === 'absent') return false;
    
    // التحقق من notes - إذا كان السجل يحتوي على "عدم استحقاق الوجبة"، لا يستحق الوجبة
    if (record.notes && record.notes.includes('عدم استحقاق الوجبة')) {
      return false;
    }
    
    const checkInTime = record.check_in_time || record.check_in || '';
    if (isEmptyAttendanceTime(checkInTime)) return false;
    
    // استخدام official_start_time من قاعدة البيانات (بدون grace_period)
    const workStartTime = officialStartTime || '08:00:00'; // Default to 08:00:00 if not loaded yet
    
    const checkInMinutes = timeToMinutes(checkInTime);
    const workStartMinutes = timeToMinutes(workStartTime);
    
    // الموظف يستحق الوجبة إذا حضر في official_start_time أو قبله (بدون grace_period)
    return checkInMinutes <= workStartMinutes;
  };

  // Parse and format notes with icons and colors
  const parseNotes = (notes) => {
    if (!notes) return [];
    
    const noteParts = notes.split(' - ').filter(part => part.trim());
    const parsedNotes = [];
    
    noteParts.forEach(part => {
      const trimmed = part.trim();
      let icon = FiInfo;
      let color = 'blue';
      let bgColor = 'blue.50';
      let borderColor = 'blue.200';
      
      // تحديد نوع الملاحظة والأيقونة واللون
      if (trimmed.includes('حضور متأخر')) {
        icon = FiAlertCircle;
        color = 'orange';
        bgColor = 'orange.50';
        borderColor = 'orange.200';
      } else if (trimmed.includes('غياب')) {
        icon = FiUserX;
        color = 'red';
        bgColor = 'red.50';
        borderColor = 'red.200';
      } else if (trimmed.includes('عدم استحقاق الوجبة')) {
        icon = FiCoffee;
        color = 'yellow';
        bgColor = 'yellow.50';
        borderColor = 'yellow.200';
      } else if (trimmed.includes('خصم تأخير')) {
        icon = FiMinusCircle;
        color = 'red';
        bgColor = 'red.50';
        borderColor = 'red.200';
      } else if (trimmed.includes('إذن')) {
        icon = FiCheckCircle;
        color = 'green';
        bgColor = 'green.50';
        borderColor = 'green.200';
      } else if (trimmed.includes('أوفر تايم') || trimmed.includes('إضافي')) {
        icon = FiClock;
        color = 'purple';
        bgColor = 'purple.50';
        borderColor = 'purple.200';
      } else if (trimmed.includes('بدل مواصلات')) {
        icon = FiNavigation;
        color = 'cyan';
        bgColor = 'cyan.50';
        borderColor = 'cyan.200';
      }
      
      parsedNotes.push({
        text: trimmed,
        icon,
        color,
        bgColor,
        borderColor
      });
    });
    
    return parsedNotes;
  };

  // Get current filter period display
  const getCurrentFilterPeriod = () => {
    if (!rangePickerValue || !rangePickerValue[0] || !rangePickerValue[1]) {
      return 'جميع الفترات';
    }
    
    const startDate = rangePickerValue[0];
    const endDate = rangePickerValue[1];
    
    // If same month, show month name
    if (startDate.format('YYYY-MM') === endDate.format('YYYY-MM')) {
      const months = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];
      const monthName = months[parseInt(startDate.format('MM')) - 1];
      return `${monthName} ${startDate.format('YYYY')}`;
    }
    
    // If different dates, show range
    return `${startDate.format('DD/MM/YYYY')} - ${endDate.format('DD/MM/YYYY')}`;
  };

  // Generate weeks for the current month (starting from Friday, ending on Thursday)
  const generateMonthWeeks = () => {
    if (!rangePickerValue || !rangePickerValue[0] || !rangePickerValue[1]) return [];
    
    const startDate = rangePickerValue[0];
    const year = startDate.year();
    const month = startDate.month() + 1; // dayjs months are 0-based
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const weeks = [];
    
    // Find the first Friday of the month
    let currentDate = new Date(firstDay);
    const firstDayOfWeek = currentDate.getDay(); // 0 = Sunday ... 5 = Friday, 6 = Saturday
    
    // Calculate days to first Friday (if first day is not Friday)
    let daysToFriday = 0;
    if (firstDayOfWeek === 0) {
      // If first day is Sunday, go back 2 days to Friday
      daysToFriday = -2;
    } else if (firstDayOfWeek !== 5) {
      // If first day is not Friday, calculate days to next Friday
      daysToFriday = 5 - firstDayOfWeek;
    }
    
    // Start from the first Friday (or first day if it's Friday)
    currentDate.setDate(currentDate.getDate() + daysToFriday);
    
    // If we went back before month start, start from first day
    if (currentDate < firstDay) {
      currentDate = new Date(firstDay);
      // Find next Friday
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 5) {
        const daysToAdd = dayOfWeek === 0 ? 5 : (5 - dayOfWeek);
        currentDate.setDate(currentDate.getDate() + daysToAdd);
      }
    }
    
    let currentWeek = 1;
    
    while (currentDate <= lastDay) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6); // Thursday (6 days after Friday)
      
      // Adjust week end to not exceed month end
      if (weekEnd > lastDay) {
        weekEnd.setTime(lastDay.getTime());
      }
      
      // Only add week if it starts within the month
      if (weekStart <= lastDay) {
        const startFormatted = dayjs(weekStart).format('DD/MM/YYYY');
        const endFormatted = dayjs(weekEnd).format('DD/MM/YYYY');
      
      weeks.push({
        week: currentWeek,
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
          label: `الاسبوع${currentWeek}: ${startFormatted} - ${endFormatted}`
      });
      
      currentWeek++;
      }
      
      // Move to next Friday
      currentDate.setDate(currentDate.getDate() + 7);
    }
    
    return weeks;
  };

  // Get monthly days from current date to first day of month
  const getMonthlyDays = () => {
    try {
    if (!rangePickerValue || !rangePickerValue[0] || !rangePickerValue[1]) return [];
    
    const startDate = rangePickerValue[0];
      if (!startDate || !startDate.year || !startDate.month) return [];
      
    const year = startDate.year();
    const month = startDate.month() + 1; // dayjs months are 0-based
    const today = new Date();
    const currentMonth = new Date(year, month - 1, 1);
    const days = [];
    
    // Start from today and go back to first day of month
    let currentDate = new Date(today);
    
    while (currentDate >= currentMonth) {
        try {
          const dateStr = currentDate.toISOString().split('T')[0];
          if (dateStr && dateStr.length === 10) {
            const dayObj = {
              date: dateStr,
              label: currentDate.toLocaleDateString('ar-EG') || dateStr,
        isToday: currentDate.toDateString() === today.toDateString()
            };
            // التأكد من أن الكائن صالح قبل إضافته
            if (dayObj && dayObj.date && typeof dayObj.date === 'string') {
              days.push(dayObj);
            }
          }
        } catch (e) {
          console.error('Error creating day object:', e);
        }
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
      // Filter out any null/undefined values first, then reverse
      // First check if days array exists and is valid
      if (!Array.isArray(days) || days.length === 0) {
        return [];
      }
      
      const validDays = days.filter(day => {
        try {
          // Check if day exists first
          if (day == null || typeof day !== 'object') {
            return false;
          }
          // Then check date property
          if (day.date == null || typeof day.date !== 'string' || day.date.length !== 10) {
            return false;
          }
          return true;
        } catch (e) {
          console.error('Error filtering day:', e, day);
          return false;
        }
      });
      
      // Reverse the filtered array
      return validDays.reverse();
    } catch (error) {
      console.error('Error in getMonthlyDays:', error);
      return [];
    }
  };

  // Generate month options dynamically
  const generateMonthOptions = () => {
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    
    const currentYear = new Date().getFullYear();
    const options = [];
    
    // Add current year months
    for (let i = 0; i < 12; i++) {
      const monthValue = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
      const monthName = months[i];
      options.push(
        <option key={monthValue} value={monthValue}>
          {monthName} {currentYear}
        </option>
      );
    }
    
    // Add previous year months
    for (let i = 0; i < 12; i++) {
      const monthValue = `${currentYear - 1}-${String(i + 1).padStart(2, '0')}`;
      const monthName = months[i];
      options.push(
        <option key={monthValue} value={monthValue}>
          {monthName} {currentYear - 1}
        </option>
      );
    }
    
    return options;
  };

  // Callback functions
  const clearFilters = useCallback(() => {
    setSearchText('');
    setDateFilter('');
    setStatusFilter('');
    setDepartmentFilter('');
    setEmployeeFilter('');
    setSalaryTypeFilter('');
    setSelectedFilterType('');
    const [startDate, endDate] = getCurrentMonthRange();
    setRangePickerValue([dayjs(startDate), dayjs(endDate)]);
  }, []);

  /** نفس سلوك الراتب الأسبوعي: توسيع شريط الفلاتر إن وُجد مطويًا ثم التمرير لمنتقي الفترة */
  const handleScrollToAttendanceDateRange = useCallback(() => {
    const wasCollapsed = filtersCollapsed;
    if (wasCollapsed) {
      setFiltersCollapsed(false);
    }
    const delay = wasCollapsed ? 450 : 120;
    window.setTimeout(() => {
      attendanceDateToolbarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => {
        const inp = document.querySelector(
          '.weekly-salary-header-shell .weekly-salary-range-picker .ant-picker-input input'
        );
        inp?.focus?.();
      }, 400);
    }, delay);
  }, [filtersCollapsed, setFiltersCollapsed]);

  // Handle sorting
  const handleSort = useCallback((key) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        return {
          key,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        return { key, direction: 'asc' };
      }
    });
  }, []);

  // Handle filter type selection (clear other filter values when changing type)
  const handleFilterTypeSelect = (filterType) => {
    setSelectedFilterType(filterType);
    setStatusFilter('');
    setDepartmentFilter('');
    setSalaryTypeFilter('');
    setIsFilterDropdownOpen(false);
  };

  // Handle filter value selection
  const handleFilterValueSelect = (value) => {
    switch (selectedFilterType) {
      case 'status':
        setStatusFilter(value);
        break;
      case 'department':
        setDepartmentFilter(value);
        break;
      case 'salaryType':
        setSalaryTypeFilter(value);
        break;
      default:
        break;
    }
    setSelectedFilterType('');
  };

  // Clear specific filter
  const clearSpecificFilter = () => {
    switch (selectedFilterType) {
      case 'status':
        setStatusFilter('');
        break;
      case 'department':
        setDepartmentFilter('');
        break;
      case 'salaryType':
        setSalaryTypeFilter('');
        break;
      default:
        break;
    }
    setSelectedFilterType('');
  };

  const handleAddRecord = () => {
    setEditingRecord(null);
    reset();
    onAddOpen();
  };

  const handleEditRecord = (record) => {
    console.log('handleEditRecord called with:', record);
    setEditingRecord(record);
    
    // Reset form first
    reset();
    
    // تعيين القيم بشكل صريح
    setValue('employee_id', record.employee_id);
    setValue('attendance_date', record.attendance_date);
    setValue('check_in_time', toFormTimeValue(record.check_in_time || record.check_in));
    setValue('check_out_time', toFormTimeValue(record.check_out_time || record.check_out));
    setValue('status', record.status);
    setValue('work_hours', record.work_hours || 0);
    setValue('overtime_hours', record.overtime_hours || 0);
    setValue('late_minutes', record.late_minutes || 0);
    setValue('early_leave_minutes', record.early_leave_minutes || 0);
    setValue('is_holiday', record.is_holiday || false);
    setValue('is_excused', record.is_excused || false);
    setValue('notes', record.notes || '');
    
    onEditOpen();
  };

  const handleViewRecord = (record) => {
    setSelectedRecord(record);
    onViewOpen();
  };

  const handleDeleteRecord = async (record) => {
    try {
      const response = await fetch(getApiUrl('/api/attendance_logs.php'), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          record_id: record.id,
          source_type: record.source_type || 'manual',
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'تم حذف السجل بنجاح',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        loadAttendanceRecords();
      } else {
        toast({
          title: 'خطأ في حذف السجل',
          description: data.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ في حذف السجل',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const onSubmit = async (data) => {
    console.log('🚀 onSubmit called with data:', data);
    console.log('🚀 editingRecord:', editingRecord);
    console.log('🚀 Form is working!');
    
    setLoading(true);
    
    // Manual validation
    const employeeId = data.employee_id || editingRecord?.employee_id;
    if (!employeeId) {
      toast({
        title: 'خطأ في البيانات',
        description: 'الموظف مطلوب',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setLoading(false);
      return;
    }
    
    if (!data.attendance_date) {
      toast({
        title: 'خطأ في البيانات',
        description: 'التاريخ مطلوب',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setLoading(false);
      return;
    }
    
    try {
      const action = editingRecord ? 'update_record' : 'add_record';
      console.log('Action:', action);
      
      // لا نحسب الحالة في الواجهة الأمامية، بل نترك الخادم يحسبها بناءً على التأخير
      // فقط إذا كان check_in = 00:00، نرسل absent
      const checkIn = data.check_in_time || '';
      const checkOut = data.check_out_time || '';
      
      let calculatedStatus = null; // null يعني أن الخادم سيحسبها تلقائياً
      if (!checkIn || checkIn === '00:00' || checkIn === '00:00:00' || checkIn.trim() === '') {
        // إذا كان check_in فارغ أو 00:00، فالحالة = absent
        calculatedStatus = 'absent';
      }
      // إذا كان check_in صالح، نترك الخادم يحسب الحالة بناءً على التأخير
      
      const payload = {
        action,
        employee_id: employeeId,
        attendance_date: data.attendance_date,
        check_in_time: data.check_in_time,
        check_out_time: data.check_out_time,
        // إرسال status فقط إذا كان absent، وإلا نترك الخادم يحسبها
        ...(calculatedStatus ? { status: calculatedStatus } : {}),
        // لا نرسل work_hours, overtime_hours, late_minutes, early_leave_minutes
        // لأن الخادم يحسبها تلقائياً بناءً على check_in_time و check_out_time
        is_holiday: data.is_holiday || false,
        is_excused: data.is_excused || false,
        // بدل المواصلات يُدار يدوياً عند إصدار الراتب (مثل مكافأة خاصة) وليس يومياً من الحضور
        transport_allowance: editingRecord ? (editingRecord.transport_allowance ?? 0) : 0,
        notes: data.notes || ''
      };
      
      if (editingRecord) {
        payload.record_id = editingRecord.id;
      }

      console.log('Payload:', payload);

      const response = await fetch(getApiUrl('/api/attendance_logs.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      console.log('API Response:', result);
      if (result.success) {
        toast({
          title: editingRecord ? 'تم تحديث السجل بنجاح' : 'تم إضافة السجل بنجاح',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // تحديث selectedRecord إذا كان موجوداً ومفتوحاً (حتى لو كان المودال مفتوح)
        if (editingRecord) {
          // تحديث السجل في attendanceRecords أولاً
          const updatedRecord = result.record || { ...editingRecord, ...data };
          setAttendanceRecords(prev => prev.map(r => 
            r.id === editingRecord.id ? updatedRecord : r
          ));
          
          // تحديث selectedRecord إذا كان نفس السجل المحدد (حتى لو كان المودال مفتوح)
          if (selectedRecord && selectedRecord.id === editingRecord.id) {
            // استخدام result.record إذا كان موجوداً، وإلا استخدام البيانات المحدثة
            if (result.record) {
          setSelectedRecord(result.record);
            } else {
              // استخدام البيانات المحدثة من النموذج
              setSelectedRecord({ ...selectedRecord, ...data });
            }
          }
          
          // تحديث السجل في employeeAttendanceRecords إذا كان المودال مفتوح
          if (isEmployeeAttendanceOpen && selectedEmployee && selectedEmployee.employee_id === editingRecord.employee_id) {
            setEmployeeAttendanceRecords(prev => prev.map(r => 
              r.id === editingRecord.id ? updatedRecord : r
            ));
          }
        }
        
        // إغلاق المودال أولاً
        if (editingRecord) {
          onEditClose();
        } else {
          onAddClose();
        }
        
        // إعادة تحميل البيانات في الخلفية
        setTimeout(() => {
          loadAttendanceRecords();
        }, 100);
        
        setLoading(false);
      } else {
        toast({
          title: 'خطأ في حفظ السجل',
          description: result.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setLoading(false);
      }
    } catch (error) {
      console.error('Error in onSubmit:', error);
      toast({
        title: 'خطأ في حفظ السجل',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
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
      default:
        return 'gray';
    }
  };

  const getStatusText = (status) => {
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
      default:
        return 'غير محدد';
    }
  };

  const getStatusIcon = (status) => {
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
      case 'holiday':
        return FiCalendar;
      default:
        return FiUser;
    }
  };

  // حساب الحالة بناءً على البيانات الفعلية للسجل
  function calculateStatus(record) {
    if (!record) return 'absent';
    
    // 1. التحقق من العطلة أولاً
    if (record.is_holiday === 1 || record.is_holiday === true) {
      return 'holiday';
    }
    
    // 2. التحقق من وجود أوقات الحضور والانصراف
    const checkIn = record.check_in_time || record.check_in || '';
    const checkOut = record.check_out_time || record.check_out || '';
    
    const hasCheckIn = checkIn && 
                      checkIn !== '00:00:00' && 
                      checkIn !== '00:00' &&
                      checkIn.trim() !== '';
    const hasCheckOut = checkOut && 
                       checkOut !== '00:00:00' && 
                       checkOut !== '00:00' &&
                       checkOut.trim() !== '';
    
    // 3. إذا أحدهما فقط موجود => سجل ناقص
    if ((hasCheckIn && !hasCheckOut) || (!hasCheckIn && hasCheckOut)) {
      return 'incomplete';
    }

    // 4. إذا لم يكن هناك حضور أو انصراف، فهو غائب
    if (!hasCheckIn && !hasCheckOut) {
      return 'absent';
    }
    
    // 5. التحقق من التأخير (إذا كان هناك تأخير، فهو متأخر حتى لو كان حاضر)
    const lateMinutes = parseFloat(record.late_minutes) || 0;
    if (lateMinutes > 0 && (hasCheckIn || hasCheckOut)) {
      return 'late';
    }
    
    // 5. إذا كان هناك حضور أو انصراف، فهو حاضر
    if (hasCheckIn || hasCheckOut) {
      return 'present';
    }
    
    // 6. افتراضياً، نستخدم status من السجل إذا كان موجوداً
    return record.status || 'absent';
  }

  const attendanceHeaderStatChips = useMemo(() => {
    const STATUS_LABELS = {
      present: 'حاضر',
      absent: 'غائب',
      late: 'متأخر',
      incomplete: 'ناقص',
      half_day: 'نصف يوم',
      holiday: 'عطلة',
      excused: 'أذونات',
    };

    const pool = filteredRecords;
    const basePool = attendanceSearchDatePool;
    const hasSearch = Boolean(searchText.trim());
    const pendingType = selectedFilterType;

    const countPresent = (arr) => arr.filter((r) => calculateStatus(r) === 'present').length;
    const countAbsent = (arr) => arr.filter((r) => calculateStatus(r) === 'absent').length;
    const countLate = (arr) => arr.filter((r) => calculateStatus(r) === 'late').length;
    const countIncomplete = (arr) => arr.filter((r) => calculateStatus(r) === 'incomplete').length;
    const countMonthly = (arr) => arr.filter((r) => r.salary_type === 'Monthly').length;
    const countWeekly = (arr) => arr.filter((r) => r.salary_type === 'Weekly').length;
    const countExcused = (arr) =>
      arr.filter((r) => r.is_excused === 1 || r.is_excused === true || r.is_excused === '1').length;
    const countHoliday = (arr) =>
      arr.filter((r) => r.is_holiday === 1 || r.is_holiday === true || r.is_holiday === '1').length;
    const uniqueDepartments = (arr) =>
      new Set(arr.map((r) => r.department_description || r.department).filter(Boolean)).size;
    const uniqueEmployees = (arr) => new Set(arr.map((r) => r.employee_id).filter(Boolean)).size;

    const chip = (key, value, label, variant = 'total') => ({ key, value, label, variant });

    if (statusFilter) {
      const statusLabel = STATUS_LABELS[statusFilter] || statusFilter;
      return [
        chip('matched', pool.length, statusLabel, 'filtered'),
        chip('scope', basePool.length, hasSearch ? 'ضمن البحث' : 'من الفترة', 'total'),
        chip('present', countPresent(pool), 'حاضر', 'active'),
        chip('absent', countAbsent(pool), 'غائب', 'inactive'),
      ];
    }

    if (departmentFilter) {
      const deptLabel = departmentFilter.slice(0, 20);
      return [
        chip('matched', pool.length, deptLabel, 'filtered'),
        chip('present', countPresent(pool), 'حاضر', 'active'),
        chip('absent', countAbsent(pool), 'غائب', 'inactive'),
        chip('late', countLate(pool), 'متأخر', 'weekly'),
      ];
    }

    if (salaryTypeFilter) {
      return [
        chip('matched', pool.length, salaryTypeFilter === 'Monthly' ? 'شهري' : 'أسبوعي', 'filtered'),
        chip('scope', basePool.length, hasSearch ? 'ضمن البحث' : 'من الفترة', 'total'),
        chip('present', countPresent(pool), 'حاضر', 'active'),
        chip('absent', countAbsent(pool), 'غائب', 'inactive'),
      ];
    }

    if (pendingType === 'status') {
      return [
        chip('present', countPresent(basePool), 'حاضر', 'active'),
        chip('absent', countAbsent(basePool), 'غائب', 'inactive'),
        chip('late', countLate(basePool), 'متأخر', 'weekly'),
        chip('incomplete', countIncomplete(basePool), 'ناقص', 'filtered'),
        chip('excused', countExcused(basePool), 'أذونات', 'weekly'),
      ];
    }

    if (pendingType === 'department') {
      return [
        chip('depts', uniqueDepartments(basePool), 'أقسام', 'filtered'),
        chip('records', basePool.length, 'سجلات', 'total'),
        chip('employees', uniqueEmployees(basePool), 'موظف', 'total'),
        chip('present', countPresent(basePool), 'حاضر', 'active'),
      ];
    }

    if (pendingType === 'salaryType') {
      return [
        chip('monthly', countMonthly(basePool), 'شهري', 'filtered'),
        chip('weekly', countWeekly(basePool), 'أسبوعي', 'weekly'),
        chip('records', basePool.length, hasSearch ? 'نتائج البحث' : 'سجلات', 'total'),
      ];
    }

    if (hasSearch) {
      return [
        chip('matched', pool.length, `من ${basePool.length}`, 'total'),
        chip('present', countPresent(pool), 'حاضر', 'active'),
        chip('absent', countAbsent(pool), 'غائب', 'inactive'),
        chip('late', countLate(pool), 'متأخر', 'weekly'),
        chip('incomplete', countIncomplete(pool), 'ناقص', 'filtered'),
      ];
    }

    return [
      chip('total', pool.length, 'سجلات', 'total'),
      chip('present', countPresent(pool), 'حاضر', 'active'),
      chip('absent', countAbsent(pool), 'غائب', 'inactive'),
      chip('late', countLate(pool), 'متأخر', 'weekly'),
      chip('incomplete', countIncomplete(pool), 'ناقص', 'filtered'),
      ...(showHolidays ? [chip('holiday', countHoliday(pool), 'عطلة', 'filtered')] : []),
    ];
  }, [
    filteredRecords,
    attendanceSearchDatePool,
    searchText,
    statusFilter,
    departmentFilter,
    salaryTypeFilter,
    selectedFilterType,
    showHolidays,
  ]);

  const attendanceHeaderSubtitle = useMemo(() => {
    if (statusFilter) {
      const labels = {
        present: 'حاضر',
        absent: 'غائب',
        late: 'متأخر',
        incomplete: 'ناقص',
        half_day: 'نصف يوم',
        holiday: 'عطلة',
        excused: 'أذونات',
      };
      return `تصفية حسب الحالة: ${labels[statusFilter] || statusFilter}`;
    }
    if (departmentFilter) return `تصفية حسب القسم: ${departmentFilter}`;
    if (salaryTypeFilter) {
      return `تصفية حسب ${salaryTypeFilter === 'Monthly' ? 'المرتب الشهري' : 'المرتب الأسبوعي'}`;
    }
    if (selectedFilterType === 'status') return 'اختر الحالة لعرض الإحصائيات';
    if (selectedFilterType === 'department') return 'اختر القسم لعرض الإحصائيات';
    if (selectedFilterType === 'salaryType') return 'اختر نوع الراتب لعرض الإحصائيات';
    if (searchText.trim()) return `نتائج البحث عن «${searchText.trim()}»`;
    if (rangePickerValue?.[0] && rangePickerValue?.[1]) {
      return `الفترة: ${rangePickerValue[0].format('DD/MM/YYYY')} — ${rangePickerValue[1].format('DD/MM/YYYY')}`;
    }
    return 'بحث وتصفية ومتابعة سجلات الحضور والانصراف';
  }, [
    statusFilter,
    departmentFilter,
    salaryTypeFilter,
    selectedFilterType,
    searchText,
    rangePickerValue,
  ]);

  const dateRangeLabel =
    rangePickerValue?.[0] && rangePickerValue?.[1]
      ? `${rangePickerValue[0].format('DD/MM/YYYY')} — ${rangePickerValue[1].format('DD/MM/YYYY')}`
      : '';

  if (loading) {
    return (
      <Center minH="50vh">
        <VStack spacing="4">
          <Spinner size="xl" color="primary.500" />
          <Text color={mutedTextColor}>جاري تحميل سجلات الحضور...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box
      as="div"
      className={`tp-table-page-layout tp-attendance-page-layout tp-salary-page-layout${filtersCollapsed ? ' tp-salary-page-layout--header-collapsed' : ''}${isSearchFocused ? ' search-focused' : ''}`}
      flex="1"
      minH="0"
      w="100%"
      maxW="100%"
      display="flex"
      flexDirection="column"
      alignItems="stretch"
      overflow="hidden"
    >
      {/* عنوان + فلاتر + الفترة — نفس إدارة الموظفين؛ الطي من الهيدر العام يخفي الكل بما فيه التاريخ */}
      {!filtersCollapsed && (
      <Box mb={{ base: 2, md: 3 }} className="weekly-salary-header-shell tp-attendance-page-header" w="100%" maxW="100%" flexShrink={0}>
        <Box
          className="weekly-salary-toolbar-card tp-page-header-toolbar"
          w="100%"
          maxW="100%"
          px={{ base: 4, md: 6 }}
          py={{ base: 4, md: 4 }}
        >
          <VStack align="stretch" spacing={{ base: 3, md: 3.5 }} w="100%">
            <Flex
              align={{ base: 'stretch', md: 'center' }}
              gap={{ base: 3, md: 4 }}
              flexWrap="wrap"
              justify="space-between"
              className="tp-page-header-top"
            >
              <HStack spacing={3} align="center" minW={0} flex="1 1 240px" className="tp-page-header-brand">
                <Flex
                  align="center"
                  justify="center"
                  w={{ base: '42px', md: '48px' }}
                  h={{ base: '42px', md: '48px' }}
                  borderRadius="xl"
                  flexShrink={0}
                  className="weekly-salary-header-icon-wrap tp-attendance-header-icon-wrap"
                  aria-hidden
                >
                  <Icon as={FiCalendar} boxSize={{ base: 5, md: 6 }} />
                </Flex>
                <VStack align="flex-start" spacing={0.5} minW={0}>
                  <Heading className="stake-heading-3 weekly-salary-page-title tp-page-header-title" size="md" lineHeight="short" mb={0}>
                    إدارة الحضور والانصراف
                  </Heading>
                  <Text className="tp-page-header-subtitle" noOfLines={2}>
                    {attendanceHeaderSubtitle}
                  </Text>
                </VStack>
              </HStack>
              <HStack
                spacing={2}
                flexWrap="wrap"
                justify={{ base: 'flex-start', md: 'flex-end' }}
                flex="0 1 auto"
                className="tp-page-header-stats"
              >
                {attendanceHeaderStatChips.map((statChip) => (
                  <Box
                    key={statChip.key}
                    className={`tp-page-header-stat-chip tp-page-header-stat-chip--${statChip.variant}`}
                  >
                    <Text className="tp-page-header-stat-chip__value">{statChip.value}</Text>
                    <Text className="tp-page-header-stat-chip__label" title={statChip.label}>
                      {statChip.label}
                    </Text>
                  </Box>
                ))}
              </HStack>
            </Flex>

            <Divider className="tp-page-header-divider" borderColor="var(--stake-border-primary)" opacity={0.65} />

            <Flex
              w="100%"
              flexWrap={{ base: 'wrap', sm: 'nowrap' }}
              align="stretch"
              justify="space-between"
              gap={3}
              rowGap={3}
              className="weekly-salary-header-row weekly-salary-header-tools weekly-salary-toolbar-split weekly-salary-toolbar-split--dense"
            >
              <Flex
                flexWrap="nowrap"
                align="center"
                alignContent="center"
                gap={2}
                minW={0}
                flex={{ base: '1 1 100%', sm: '0 1 auto' }}
                className="fp-toolbar-zone--filters"
              >
                <HStack spacing={2} align="center" flexShrink={1} minW={0} className="fp-toolbar-filter-inner" flexWrap="nowrap" rowGap={2} w="auto">
                  <Box flex="1 1 0" minW={{ base: '80px', md: '100px' }} maxW={{ base: '130px', md: '160px' }} flexShrink={1}>
                    <InputGroup size="sm">
                      <Input
                        placeholder="البحث بالاسم أو الكود..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        borderRadius="md"
                        className="stake-input"
                        bg="var(--stake-bg-secondary)"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                        color="var(--stake-text-primary)"
                        pr="10"
                        fontSize="sm"
                        _focus={{ borderColor: 'var(--stake-border-accent)', boxShadow: '0 0 0 1px var(--stake-border-accent)', bg: 'var(--stake-bg-primary)' }}
                        _hover={{ borderColor: 'var(--stake-border-accent)', bg: 'var(--stake-bg-hover)' }}
                        _placeholder={{ color: 'var(--stake-text-secondary)', fontWeight: '500' }}
                      />
                      <InputRightElement>
                        <Icon as={FiSearch} color="var(--stake-text-secondary)" boxSize="4" />
                      </InputRightElement>
                    </InputGroup>
                  </Box>
                  <RadioGroup
                    value={selectedFilterType || ''}
                    onChange={handleFilterTypeSelect}
                    flexShrink={1}
                    minW={0}
                  >
                    <HStack spacing={{ base: 2, md: 3 }} flexWrap="nowrap">
                      <Radio value="status" colorScheme="blue" size="md" sx={{ '& .chakra-radio__control': { borderWidth: '2px', borderColor: 'var(--stake-border-primary)', _before: { bg: 'var(--stake-bg-secondary)' } } }}>
                        <Text fontSize="sm" fontWeight="medium" color="var(--stake-text-primary)">الحالة</Text>
                      </Radio>
                      <Radio value="department" colorScheme="blue" size="md" sx={{ '& .chakra-radio__control': { borderWidth: '2px', borderColor: 'var(--stake-border-primary)', _before: { bg: 'var(--stake-bg-secondary)' } } }}>
                        <Text fontSize="sm" fontWeight="medium" color="var(--stake-text-primary)">القسم</Text>
                      </Radio>
                      <Radio value="salaryType" colorScheme="blue" size="md" sx={{ '& .chakra-radio__control': { borderWidth: '2px', borderColor: 'var(--stake-border-primary)', _before: { bg: 'var(--stake-bg-secondary)' } } }}>
                        <Text fontSize="sm" fontWeight="medium" color="var(--stake-text-primary)">نوع الراتب</Text>
                      </Radio>
                    </HStack>
                  </RadioGroup>
                  <Menu>
                    <MenuButton
                      as={Button}
                      rightIcon={<FiChevronDown />}
                      variant="ghost"
                      size="sm"
                      h="auto"
                      minH="28px"
                      py="1"
                      px="2"
                      borderRadius="0"
                      border="none"
                      bg="transparent"
                      color="var(--stake-text-primary)"
                      fontWeight="medium"
                      fontSize="sm"
                      _hover={{ bg: 'transparent', opacity: 0.85 }}
                      _active={{ bg: 'transparent' }}
                      _focus={{ boxShadow: 'none' }}
                      isDisabled={!selectedFilterType}
                    >
                      {selectedFilterType === 'status' && statusFilter ? (statusFilter === 'present' ? 'حاضر' : statusFilter === 'absent' ? 'غائب' : statusFilter === 'late' ? 'متأخر' : statusFilter === 'incomplete' ? 'ناقص' : statusFilter === 'half_day' ? 'نصف يوم' : statusFilter === 'holiday' ? 'عطلة' : statusFilter === 'excused' ? 'أذونات' : '') : selectedFilterType === 'department' && departmentFilter ? (departments.find(d => (d.description || d.name) === departmentFilter)?.description || departmentFilter) : selectedFilterType === 'salaryType' && salaryTypeFilter ? (salaryTypeFilter === 'Monthly' ? 'شهري' : 'أسبوعي') : 'اختر القيمة'}
                    </MenuButton>
                    <Portal>
                      <MenuList
                        zIndex={2000}
                        className="stake-card"
                        bg="var(--stake-bg-primary)"
                        border="1px solid var(--stake-border-primary)"
                        boxShadow="0 12px 24px rgba(0,0,0,0.35)"
                        borderRadius="12px"
                      >
                        {selectedFilterType === 'status' && (
                          <>
                            <MenuItem icon={<FiCheckCircle />} onClick={() => handleFilterValueSelect('present')}>حاضر</MenuItem>
                            <MenuItem icon={<FiXCircle />} onClick={() => handleFilterValueSelect('absent')}>غائب</MenuItem>
                            <MenuItem icon={<FiClock />} onClick={() => handleFilterValueSelect('late')}>متأخر</MenuItem>
                            <MenuItem icon={<FiAlertTriangle />} onClick={() => handleFilterValueSelect('incomplete')}>ناقص</MenuItem>
                            <MenuItem icon={<FiDivide />} onClick={() => handleFilterValueSelect('half_day')}>نصف يوم</MenuItem>
                            <MenuItem icon={<FiCalendar />} onClick={() => handleFilterValueSelect('holiday')}>عطلة</MenuItem>
                            <MenuItem icon={<FiUserCheck />} onClick={() => handleFilterValueSelect('excused')}>أذونات</MenuItem>
                          </>
                        )}
                        {selectedFilterType === 'department' && departments.map(dept => (
                          <MenuItem key={dept.id} icon={<FiBriefcase />} onClick={() => handleFilterValueSelect(dept.description || dept.name)}>{dept.description || dept.name}</MenuItem>
                        ))}
                        {selectedFilterType === 'salaryType' && (
                          <>
                            <MenuItem icon={<FiDollarSign />} onClick={() => handleFilterValueSelect('Monthly')}>شهري</MenuItem>
                            <MenuItem icon={<FiDollarSign />} onClick={() => handleFilterValueSelect('Weekly')}>أسبوعي</MenuItem>
                          </>
                        )}
                      </MenuList>
                    </Portal>
                  </Menu>
                  <IconButton
                    icon={<FiX />}
                    variant="ghost"
                    size="sm"
                    aria-label="مسح الفلاتر"
                    className="weekly-salary-clear-filters-btn"
                    onClick={clearFilters}
                    color="var(--stake-text-primary)"
                    fontSize="sm"
                    fontWeight="medium"
                    border="none"
                    bg="transparent"
                    h="36px"
                    minW="36px"
                    flexShrink={0}
                    _hover={{ bg: 'transparent', opacity: 0.85 }}
                    _active={{ bg: 'transparent' }}
                    _focus={{ boxShadow: 'none' }}
                  />
                </HStack>
              </Flex>
              <Box
                ref={attendanceDateToolbarRef}
                className="weekly-salary-date-toolbar-anchor fp-toolbar-zone--dates"
                flex={{ base: '1 1 100%', sm: '1 1 0' }}
                minW={0}
                display="flex"
                alignItems="center"
              >
                <HStack
                  spacing={2}
                  align="center"
                  flexWrap="nowrap"
                  justify={{ base: 'flex-start', md: 'flex-end' }}
                  w="100%"
                  rowGap={2}
                  minW={0}
                  className="weekly-salary-dates-inner"
                >
                  <HStack spacing="2" align="center" flexShrink={0} className="weekly-salary-mode-toggle">
                    <Text fontSize="sm" className="stake-text-secondary" whiteSpace="nowrap">يدوي</Text>
                    <Switch isChecked={isAutomaticMode} onChange={(e) => setIsAutomaticMode(e.target.checked)} colorScheme="blue" size="sm" />
                    <Text fontSize="sm" className="stake-text-secondary" whiteSpace="nowrap">تلقائي</Text>
                  </HStack>
                  <DatePicker.RangePicker
                    className="weekly-salary-range-picker"
                    value={rangePickerValue}
                    onChange={handleRangePickerChange}
                    size="middle"
                    placeholder={['من', 'إلى']}
                    format="DD/MM/YYYY"
                    picker="date"
                    style={{
                      borderRadius: '10px',
                      height: '36px',
                      border: '1px solid var(--stake-border-primary, #2f4553)',
                      backgroundColor: 'var(--stake-bg-card, #111827)',
                      color: 'var(--stake-text-primary, #fff)',
                    }}
                  />
                  {isAutomaticMode ? (
                    <HStack spacing="2" flexWrap="nowrap" flexShrink={0} className="weekly-salary-week-btns">
                      <Button size="xs" className="stake-btn-secondary" onClick={handleSetCurrentWeek}>
                        الأسبوع الحالي
                      </Button>
                      <Button size="xs" className="stake-btn-secondary" onClick={handleSetPreviousWeek}>
                        الأسبوع السابق
                      </Button>
                    </HStack>
                  ) : (
                    <HStack spacing="2" flexWrap="nowrap" flexShrink={0} className="weekly-salary-week-btns">
                      <Button size="xs" className="stake-btn-secondary" onClick={handleSetCurrentMonth}>
                        الشهر الحالي
                      </Button>
                      <Button size="xs" className="stake-btn-secondary" onClick={handleSetPreviousMonth}>
                        الشهر السابق
                      </Button>
                    </HStack>
                  )}
                </HStack>
              </Box>
            </Flex>
          </VStack>
        </Box>
      </Box>
      )}

      {/* Main Content Card — نفس بطاقة قائمة الموظفين */}
      {(() => {
        const attendanceCard = (
      <Card
        className="stake-card weekly-salary-main-card attendance-main-card"
        overflow="hidden"
        flex="1"
        minH="0"
        display="flex"
        flexDirection="column"
      >
        <CardBody
          p="0"
          className="weekly-salary-main-card-body"
          flex="1"
          minH="0"
          display="flex"
          flexDirection="column"
          overflow="hidden"
        >
          <HStack
            justify="space-between"
            align="center"
            px={{ base: 4, md: 5 }}
            pt="3"
            pb="2"
            className="fp-list-toolbar weekly-salary-list-toolbar attendance-list-toolbar tp-attendance-card-toolbar"
            flexWrap={{ base: 'wrap', lg: 'nowrap' }}
            rowGap={2}
            columnGap={3}
            flexShrink={0}
          >
            <HStack spacing={2} align="center" flexShrink={0} minW={0} className="tp-list-toolbar__title-group">
              <PagePanelToggle
                collapsed={filtersCollapsed}
                onToggle={toggleFiltersCollapsed}
                variant="table"
              />
              <Heading size="md" className="stake-heading-3 weekly-salary-list-heading" flexShrink={0} minW={0}>
                سجلات الحضور والانصراف ({filteredRecords.length})
              </Heading>
              {filtersCollapsed && dateRangeLabel ? (
                <Text
                  className="stake-text-secondary weekly-salary-list-period"
                  fontSize="sm"
                  fontWeight="500"
                  whiteSpace="nowrap"
                  flexShrink={0}
                  title={`الفترة: ${dateRangeLabel}`}
                >
                  — {dateRangeLabel}
                </Text>
              ) : null}
            </HStack>
            <HStack
              spacing="3"
              align="center"
              justify="flex-end"
              flexWrap="wrap"
              rowGap={2}
              flex={{ base: '1 1 100%', lg: '0 1 auto' }}
              minW={0}
            >
              <HStack spacing="3" align="center">
                <Text fontSize="sm" color="var(--stake-text-secondary)">
                  إظهار العطلات
                </Text>
                <Switch
                  isChecked={showHolidays}
                  onChange={(e) => setShowHolidays(e.target.checked)}
                  colorScheme="blue"
                  size="md"
                />
              </HStack>
              <Menu>
                <MenuButton
                  as={Button}
                  size="sm"
                  h="44px"
                  minH="44px"
                  leftIcon={<FiSettings />}
                  rightIcon={<FiChevronDown />}
                  className="stake-btn-secondary"
                  borderRadius="lg"
                  borderColor="var(--stake-border-primary)"
                  _hover={{ bg: 'var(--stake-bg-hover)' }}
                >
                  تنظيم الأعمدة
                </MenuButton>
                <Portal>
                  <MenuList
                    zIndex={2000}
                    minW="260px"
                    className="stake-card"
                    bg="var(--stake-bg-primary)"
                    borderColor="var(--stake-border-primary)"
                  >
                    {attTableColumns.filter((col) => mealAllowanceEnabled || col.id !== 'meal_allowance').map((col) => (
                      <Box key={col.id} px="3" py="2">
                        <HStack justify="space-between">
                          <HStack>
                            <Switch isChecked={col.visible} onChange={() => toggleAttColumn(col.id)} />
                            <Text fontSize="sm">{col.label}</Text>
                          </HStack>
                          <HStack spacing="1">
                            <IconButton aria-label="أعلى" icon={<FiChevronUp />} size="xs" variant="ghost" onClick={() => moveAttColumn(col.id, 'up')} />
                            <IconButton aria-label="أسفل" icon={<FiChevronDown />} size="xs" variant="ghost" onClick={() => moveAttColumn(col.id, 'down')} />
                          </HStack>
                        </HStack>
                      </Box>
                    ))}
                  </MenuList>
                </Portal>
              </Menu>
              <Box position="relative" display="inline-block">
                <Tooltip
                  label="إعادة احتساب شامل للفترة المحددة"
                  bg="var(--stake-bg-secondary)"
                  color="var(--stake-text-primary)"
                  borderColor="var(--stake-border-primary)"
                  placement="top"
                  hasArrow
                  openDelay={400}
                >
                  <Box as="span" display="inline-block">
                    <Button
                      leftIcon={<FiRefreshCw />}
                      className="stake-btn-secondary"
                      size="md"
                      borderRadius="lg"
                      borderColor="var(--stake-border-primary)"
                      h="44px"
                      minH="44px"
                      minW="44px"
                      px={3}
                      fontWeight="600"
                      onClick={handleRecomputeRange}
                      isLoading={loading}
                      aria-label="إعادة احتساب شامل"
                      _hover={{ bg: 'var(--stake-bg-hover)' }}
                    >
                      <Text as="span" display={{ base: 'none', lg: 'inline' }} ms={1}>
                        إعادة احتساب شامل
                      </Text>
                    </Button>
                  </Box>
                </Tooltip>
              </Box>
              <Box position="relative" display="inline-block">
                <Tooltip
                  label="تسجيل حضور جديد"
                  bg="var(--stake-bg-secondary)"
                  color="var(--stake-text-primary)"
                  borderColor="var(--stake-border-primary)"
                  placement="top"
                  hasArrow
                  openDelay={400}
                >
                  <Box as="span" display="inline-block">
                    <Button
                      leftIcon={<FiPlus />}
                      className="stake-btn-secondary"
                      size="md"
                      onClick={handleAddRecord}
                      borderRadius="lg"
                      borderColor="var(--stake-border-primary)"
                      h="44px"
                      minH="44px"
                      minW="44px"
                      px={3}
                      fontWeight="600"
                      aria-label="تسجيل حضور جديد"
                      _hover={{ bg: 'var(--stake-bg-hover)' }}
                    >
                      <Text as="span" display={{ base: 'none', lg: 'inline' }} ms={1}>
                        تسجيل الحضور
                      </Text>
                    </Button>
                  </Box>
                </Tooltip>
              </Box>
            </HStack>
          </HStack>

          {filteredRecords.length > 0 && (
          <Alert
            status="info"
            className="tp-attendance-info-alert"
            borderRadius="0"
            py="2.5"
            px={{ base: 4, md: 5 }}
            flexShrink={0}
            alignItems="flex-start"
          >
            <AlertIcon mt="0.5" />
            <Text fontSize="sm" className="tp-attendance-info-alert__text">
              في أيام العمل الرسمية: إذا كان الانصراف قبل مرور (
              {overtimeStartGraceMinutes} دقيقة) بعد نهاية الدوام (
              {officialEndTime?.slice(0, 5) || '18:30'}) لا يُحسب إضافي. إذا مرّت المهلة أو تساوتها، يُحسب
              الإضافي كاملاً من نهاية الدوام الرسمي (من أول دقيقة بعد النهاية الرسمية وليس من بعد المهلة).
            </Text>
          </Alert>
          )}

          {/* Bulk actions when date range is selected and records are selected */}
          {filteredRecords.length > 0 && hasDateRangeSelected && selectedRecordIds.length > 0 && (
            <HStack p="3" bg="var(--stake-bg-secondary)" borderBottom="1px solid" borderColor={borderColor} spacing="3" wrap="wrap" flexShrink={0}>
              <Text fontSize="sm" fontWeight="medium" color="var(--stake-text-primary)">
                تم اختيار {selectedRecordIds.length} سجل
              </Text>
              <Button
                size="sm"
                leftIcon={<FiClock />}
                colorScheme="blue"
                onClick={() => openBulkEditModal('check_in')}
                className="stake-btn-primary"
              >
                تعديل الحضور
              </Button>
              <Button
                size="sm"
                leftIcon={<FiClock />}
                colorScheme="teal"
                onClick={() => openBulkEditModal('check_out')}
                className="stake-btn-primary"
              >
                تعديل الانصراف
              </Button>
            </HStack>
          )}

          {filteredRecords.length === 0 ? (
            <Center py="20" px={{ base: 4, md: 5 }} flex="1" minH="0" overflowY="auto">
              <VStack spacing="5" maxW="md">
                <Icon as={FiCalendar} boxSize="12" className="stake-text-secondary" opacity={0.85} />
                <Text color="gray.600" fontSize="lg" textAlign="center" fontWeight="600">
                  لا توجد بيانات للعرض في هذه الفترة
                </Text>
                <Text fontSize="sm" className="stake-text-secondary" textAlign="center" lineHeight="tall">
                  جرّب تغيير نطاق التواريخ أعلاه أو تخفيف شروط التصفية، أو التحقق من تسجيل الحضور في النظام ضمن الفترة.
                </Text>
                <Button
                  size="md"
                  className="stake-btn-secondary"
                  borderRadius="lg"
                  onClick={handleScrollToAttendanceDateRange}
                >
                  الانتقال إلى اختيار الفترة
                </Button>
              </VStack>
            </Center>
          ) : (
          <>
          {/* Table — التمرير داخل الحاوية فقط (لا scroll لكل صفحة tp-page) */}
          <TableContainer
            className="weekly-salary-main-table-scroll"
            flex="1"
            minH="0"
            overflowY="auto"
            overflowX="auto"
            w="100%"
            maxW="100%"
          >
            <Table
              variant="simple"
              size="xs"
              w="100%"
              layout="auto"
              className="stake-table main-content compact-data-table"
              style={{ fontFamily: 'var(--table-font-family)' }}
              sx={{
                'th, td': {
                  fontFamily: 'var(--table-font-family)',
                  fontSize: 'var(--table-font-size)',
                  fontWeight: 'var(--table-font-weight)'
                },
                'tr.holiday-row': {
                  background: 'var(--stake-bg-secondary) !important',
                  backgroundColor: 'var(--stake-bg-secondary) !important',
                },
                'tr.holiday-row td, tr.holiday-row > td': {
                  background: 'var(--stake-bg-secondary) !important',
                  backgroundColor: 'var(--stake-bg-secondary) !important',
                  color: 'var(--stake-text-primary) !important'
                },
                'tr.holiday-row:hover, tr.holiday-row:hover td, tr.holiday-row:hover > td': {
                  background: 'var(--stake-bg-hover) !important',
                  backgroundColor: 'var(--stake-bg-hover) !important',
                  color: 'var(--stake-text-primary) !important'
                },
                // tableLayout: 'fixed',
                maxWidth: '100%'
              }}
            >
              <Thead
                sx={{
                  '& th': {
                    color: 'var(--stake-table-header-text, var(--stake-text-primary)) !important',
                  },
                }}
              >
                <Tr>
                  {hasDateRangeSelected && (
                    <Th w="40px" minW="40px" maxW="40px" px="2">
                      <Checkbox
                        isChecked={filteredRecords.length > 0 && filteredRecords.every(r => selectedRecordIds.includes(r.id))}
                        isIndeterminate={filteredRecords.some(r => selectedRecordIds.includes(r.id)) && !filteredRecords.every(r => selectedRecordIds.includes(r.id))}
                        onChange={toggleSelectAllRecords}
                        colorScheme="blue"
                        aria-label="تحديد الكل"
                      />
                    </Th>
                  )}
                  {visibleAttTableColumns.map((col) => {
                    const canSort = true;
                    const headerLabel =
                      col.id === 'work_hours' ? (
                        <Tooltip
                          label="أيام عمل عادية: المدة ضمن نافذة الدوام الرسمي (من الإعدادات) — من أقصى(الحضور، بداية الدوام) إلى أدنى(الانصراف، نهاية الدوام). سجلات مُعلَّمة كعطلة: العمل اختياري فيُحسب من وقت الحضور إلى الانصراف الفعليين بالكامل دون قصّ بمواعيد الدوام."
                          placement="top"
                          hasArrow
                          openDelay={300}
                        >
                          <Box as="span" display="inline-block" cursor="help">
                            <EnglishKeyTooltip englishKey={col.id}>
                              {col.label}
                            </EnglishKeyTooltip>
                          </Box>
                        </Tooltip>
                      ) : (
                        <EnglishKeyTooltip englishKey={col.id}>{col.label}</EnglishKeyTooltip>
                      );
                    const centerHeader =
                      col.id === 'check_in_time' ||
                      col.id === 'check_out_time' ||
                      col.id === 'work_hours' ||
                      col.id === 'overtime_hours' ||
                      col.id === 'early_leave_minutes' ||
                      col.id === 'late_penalty' ||
                      col.id === 'meal_allowance' ||
                      col.id === 'status';
                    return (
                      <Th
                        key={col.id}
                        whiteSpace="normal"
                        lineHeight="1.2"
                        cursor="pointer"
                        onClick={() => handleSort(col.id)}
                        className={getFinancialTableColumnClass(col)}
                        textAlign={centerHeader ? 'center' : undefined}
                        verticalAlign="middle"
                      >
                        {headerLabel}
                      </Th>
                    );
                  })}
                </Tr>
              </Thead>
              <Tbody>
                {filteredRecords.map((record) => {
                  const displayStatus = calculateStatus(record);
                  const StatusIcon = getStatusIcon(displayStatus);
                  const isHoliday = record.is_holiday === 1 || record.is_holiday === true;
                  const holidayBg = isHoliday ? 'var(--stake-bg-primary)' : undefined;
                  const holidayHoverBg = isHoliday ? 'var(--stake-bg-secondary)' : 'var(--stake-bg-hover)';
                  return (
                    <Tr 
                      key={record.id} 
                      onDoubleClick={() => handleViewRecord(record)}
                      className={isHoliday ? 'holiday-row' : ''}
                      bg={holidayBg}
                      _hover={{
                        bg: holidayHoverBg
                      }}
                      sx={isHoliday ? {
                        '& td, & > td': {
                          background: 'var(--stake-bg-primary) !important',
                          backgroundColor: 'var(--stake-bg-primary) !important',
                          color: 'var(--stake-text-primary) !important',
                        },
                        '&:hover td, &:hover > td': {
                          background: 'var(--stake-bg-secondary) !important',
                          backgroundColor: 'var(--stake-bg-secondary) !important',
                          color: 'var(--stake-text-primary) !important',
                        }
                      } : undefined}
                    >
                      {hasDateRangeSelected && (
                        <Td w="40px" minW="40px" maxW="40px" px="2" bg={holidayBg} _hover={{ bg: holidayHoverBg }} onClick={e => e.stopPropagation()}>
                          <Checkbox
                            isChecked={selectedRecordIds.includes(record.id)}
                            onChange={() => toggleSelectRecord(record.id)}
                            colorScheme="blue"
                            aria-label={`تحديد سجل ${record.id}`}
                          />
                        </Td>
                      )}
                      {visibleAttTableColumns.map((col) => {
                        const cellProps = { bg: holidayBg, _hover: { bg: holidayHoverBg } };
                        const fpCls = getFinancialTableColumnClass(col);
                        if (col.id === 'date') {
                          const dateParts = getAttendanceDateCellParts(record.attendance_date);
                          if (!dateParts) {
                            return (
                              <Td key={col.id} {...cellProps} className={fpCls}>
                                <Text fontSize="sm">-</Text>
                              </Td>
                            );
                          }
                          return (
                            <Td key={col.id} {...cellProps} className={fpCls} whiteSpace="nowrap">
                              <Tooltip label={dateParts.tooltip} placement="top" hasArrow openDelay={200}>
                                <Box as="span" display="inline-block" cursor="default" whiteSpace="nowrap">
                                  <HStack
                                    spacing="1"
                                    display="inline-flex"
                                    flexWrap="nowrap"
                                    dir="rtl"
                                    alignItems="center"
                                  >
                                    <Text as="span" fontSize="sm" fontWeight="semibold" lineHeight="shorter">
                                      {dateParts.day}
                                    </Text>
                                    <Text as="span" fontSize="sm" color={mutedTextColor} lineHeight="shorter">
                                      /
                                    </Text>
                                    <Text as="span" fontSize="sm" fontWeight="medium" lineHeight="shorter">
                                      {dateParts.month}
                                    </Text>
                                  </HStack>
                                </Box>
                              </Tooltip>
                            </Td>
                          );
                        }
                        if (col.id === 'employee_code') return <Td key={col.id} {...cellProps} className={fpCls}><Text fontSize="sm" fontWeight="medium" fontFamily="mono" color={mutedTextColor}>{record.employee_code || '-'}</Text></Td>;
                        if (col.id === 'employee') return <Td key={col.id} {...cellProps} className={fpCls}><Text fontSize="sm" fontWeight="medium">{record.name_ar || record.Name || '-'}</Text></Td>;
                        if (col.id === 'salary_type') return <Td key={col.id} {...cellProps} className={fpCls}><Badge colorScheme={record.salary_type === 'Monthly' ? 'blue' : 'purple'}>{record.salary_type === 'Monthly' ? 'شهري' : 'أسبوعي'}</Badge></Td>;
                        if (col.id === 'department') return <Td key={col.id} {...cellProps} className={fpCls}><Text fontSize="sm">{record.department_description || record.department || '-'}</Text></Td>;
                        if (col.id === 'cost_center') return <Td key={col.id} {...cellProps} className={fpCls}>{record.cost_center ? <Badge colorScheme={(() => { const color = record.cost_center_color || 'blue'; const colorLower = String(color).toLowerCase().trim(); const colorMap = { red: 'red', blue: 'blue', green: 'green', yellow: 'yellow', purple: 'purple', pink: 'pink', orange: 'orange' }; return colorMap[colorLower] || 'gray'; })()} variant="solid" px="2" py="1" borderRadius="md" fontSize="xs">{record.cost_center}</Badge> : <Text fontSize="sm">-</Text>}</Td>;
                        if (col.id === 'check_in_time') return <Td key={col.id} {...cellProps} className={fpCls} textAlign="center"><HStack spacing="1" justify="center" w="100%"><Icon as={FiClock} boxSize="3" color="var(--stake-text-secondary)" flexShrink={0} aria-hidden /><Text fontSize="sm" whiteSpace="nowrap" className="fp-cell-text">{formatTime(record.check_in_time)}</Text></HStack></Td>;
                        if (col.id === 'check_out_time') return <Td key={col.id} {...cellProps} className={fpCls} textAlign="center"><HStack spacing="1" justify="center" w="100%"><Icon as={FiClock} boxSize="3" color="var(--stake-text-secondary)" flexShrink={0} aria-hidden /><Text fontSize="sm" whiteSpace="nowrap" className="fp-cell-text">{formatTime(record.check_out_time)}</Text></HStack></Td>;
                        if (col.id === 'work_hours') return <Td key={col.id} {...cellProps} className={fpCls} textAlign="center"><Text fontSize="sm" fontWeight="medium" className="fp-cell-text">{formatHoursAndMinutes(record.total_hours)}</Text></Td>;
                        if (col.id === 'overtime_hours') return <Td key={col.id} {...cellProps} className={fpCls} textAlign="center"><Text fontSize="sm" color="orange.300" className="fp-cell-text">{record && record.overtime_hours && parseFloat(record.overtime_hours) > 0 ? `+${formatHoursAndMinutes(record.overtime_hours)}` : '-'}</Text></Td>;
                        if (col.id === 'early_leave_minutes') return <Td key={col.id} {...cellProps} className={fpCls} textAlign="center"><Text fontSize="sm" color="red.300" className="fp-cell-text">{record && parseFloat(record.early_leave_minutes) > 0 ? `-${formatMinutesAsHoursAndMinutes(record.early_leave_minutes)}` : '-'}</Text></Td>;
                        if (col.id === 'meal_allowance') return <Td key={col.id} {...cellProps} className={fpCls} textAlign="center">{record.salary_type === 'Monthly' ? <Text fontSize="sm" color="gray.500" className="fp-cell-text">-</Text> : (record.is_holiday === 1 || record.is_holiday === true || record.is_holiday === '1') ? <Text fontSize="sm" color="gray.500" className="fp-cell-text">-</Text> : <Icon as={isMealEligible(record) ? FiCheck : FiX} color={isMealEligible(record) ? 'green.400' : 'red.400'} boxSize="5" aria-hidden />}</Td>;
                        if (col.id === 'late_penalty') return <Td key={col.id} {...cellProps} className={fpCls} textAlign="center"><Text fontSize="sm" color="red.300" className="fp-cell-text">{(record.is_holiday === 1 || record.is_holiday === true || record.is_holiday === '1') ? '-' : (record.late_penalty_hours && parseFloat(record.late_penalty_hours) > 0 ? `${formatHoursAndMinutes(record.late_penalty_hours)}` : '-')}</Text></Td>;
                        if (col.id === 'status') return <Td key={col.id} {...cellProps} className={fpCls} textAlign="center"><HStack spacing="2" justify="center" w="100%" flexWrap="wrap">{record.is_holiday ? <><Icon as={FiCalendar} boxSize="4" color="orange.400" flexShrink={0} aria-hidden /><Badge colorScheme="orange">عطلة</Badge></> : <><Icon as={StatusIcon} boxSize="4" color={`${getStatusColor(displayStatus)}.400`} flexShrink={0} aria-hidden /><Badge colorScheme={getStatusColor(displayStatus)}>{getStatusText(displayStatus)}</Badge></>}</HStack></Td>;
                        return <Td key={col.id} {...cellProps} className={fpCls}>-</Td>;
                      })}
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>

          </>
          )}
        </CardBody>
      </Card>
        );
        return attendanceCard;
      })()}

      {/* Add Record Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose} size="lg" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent
          bg="var(--stake-bg-primary)"
          border="none"
          borderRadius="3xl"
          boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          overflow="hidden"
        >
          <form>
            <ModalHeader
              bg="var(--stake-bg-primary, #0f212e)"
              color="white"
              borderRadius="0"
              p="4"
              position="relative"
              borderBottom="1px solid"
              borderColor="var(--stake-border-primary, #2f4553)"
              boxShadow="0 2px 12px rgba(0, 0, 0, 0.2)"
            >
              <Text fontSize="lg" fontWeight="bold" color="white">
                تسجيل حضور جديد
              </Text>
              <ModalCloseButton
                color="white"
                bg="rgba(255, 255, 255, 0.1)"
                borderRadius="full"
                size="md"
                _hover={{ bg: 'rgba(255, 255, 255, 0.2)', transform: 'scale(1.05)' }}
                _active={{ transform: 'scale(0.95)' }}
              />
            </ModalHeader>
            <ModalBody bg="var(--stake-bg-primary, #0f212e)" p="6">
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="4">
                <GridItem>
                  <FormControl isRequired className="modal-form-control">
                    <FormLabel className="modal-form-label">الموظف</FormLabel>
                    <Select {...register('employee_id', { required: 'الموظف مطلوب' })}>
                      <option value="">اختر الموظف</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </Select>
                    <FormErrorMessage>
                      {errors.employee_id && errors.employee_id.message}
                    </FormErrorMessage>
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl isRequired className="modal-form-control">
                    <FormLabel className="modal-form-label">التاريخ</FormLabel>
                    <Input
                      {...register('date', { required: 'التاريخ مطلوب' })}
                      type="date"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                    />
                    <FormErrorMessage>
                      {errors.date && errors.date.message}
                    </FormErrorMessage>
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl className="modal-form-control">
                    <FormLabel className="modal-form-label">الحضور</FormLabel>
                    <Input
                      {...register('check_in_time')}
                      type="time"
                    />
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl className="modal-form-control">
                    <FormLabel className="modal-form-label">الانصراف</FormLabel>
                    <Input
                      {...register('check_out_time')}
                      type="time"
                    />
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl className="modal-form-control">
                    <FormLabel className="modal-form-label">ساعات العمل</FormLabel>
                    <NumberInput>
                      <NumberInputField {...register('total_hours')} placeholder="ساعات العمل" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl className="modal-form-control">
                    <FormLabel className="modal-form-label">ساعات الإضافي</FormLabel>
                    <NumberInput>
                      <NumberInputField {...register('overtime_hours')} placeholder="ساعات الإضافي" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl isRequired className="modal-form-control">
                    <FormLabel className="modal-form-label">الحالة</FormLabel>
                    <Select {...register('status', { required: 'الحالة مطلوبة' })}>
                      <option value="present">حاضر</option>
                      <option value="absent">غائب</option>
                      <option value="late">متأخر</option>
                      <option value="half_day">نصف يوم</option>
                      <option value="overtime">إضافي</option>
                    </Select>
                    <FormErrorMessage>
                      {errors.status && errors.status.message}
                    </FormErrorMessage>
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl className="modal-form-control">
                    <FormLabel className="modal-form-label">ملاحظات</FormLabel>
                    <Textarea
                      {...register('notes')}
                      placeholder="ملاحظات إضافية"
                      rows={3}
                    />
                  </FormControl>
                </GridItem>
                <GridItem colSpan={{ base: 1, md: 2 }}>
                  <HStack spacing="6">
                    <FormControl display="flex" alignItems="center">
                      <Checkbox
                        {...register('is_holiday')}
                        colorScheme="orange"
                        size="lg"
                      >
                        <Text fontSize="sm" fontWeight="medium">
                          يوم عطلة
                        </Text>
                      </Checkbox>
                      <Tooltip label="تحديد هذا اليوم كعطلة رسمية - جميع ساعات العمل تعتبر إضافية">
                        <Icon as={FiInfo} ml={2} className="stake-text-secondary" boxSize="4" />
                      </Tooltip>
                    </FormControl>
                    <FormControl display="flex" alignItems="center">
                      <Checkbox
                        {...register('is_excused')}
                        colorScheme="green"
                        size="lg"
                      >
                        <Text fontSize="sm" fontWeight="medium">
                          بإذن
                        </Text>
                      </Checkbox>
                      <Tooltip label="الغياب أو التأخير بإذن رسمي">
                        <Icon as={FiInfo} ml={2} className="stake-text-secondary" boxSize="4" />
                      </Tooltip>
                    </FormControl>
                  </HStack>
                </GridItem>
              </Grid>
            </ModalBody>
            <ModalFooter
              display="flex"
              justifyContent="flex-end"
              gap="3"
              bg="var(--stake-bg-primary, #0f212e)"
              borderRadius="0"
              borderTop="2px solid"
              borderColor="var(--stake-border-primary, #2f4553)"
              py="4"
            >
              <Button 
                onClick={onAddClose}
                className="stake-btn-secondary"
                h="40px"
                px="6"
                fontWeight="500"
                borderRadius="lg"
              >
                إلغاء
              </Button>
              <Button
                leftIcon={<FiPlus />}
                className="stake-btn"
                type="submit"
                isLoading={loading}
                loadingText="جاري الحفظ..."
                h="40px"
                px="6"
                fontWeight="600"
                borderRadius="lg"
                onClick={(e) => {
                  console.log('Add button clicked');
                  e.preventDefault();
                  const formData = watch();
                  console.log('Form data from watch:', formData);
                  onSubmit(formData);
                }}
              >
                تسجيل
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Edit Record Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="lg" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden">
          <ModalHeader
            bg="var(--stake-bg-primary, #0f212e)"
            color="white"
            borderRadius="0"
            p="4"
            position="relative"
            borderBottom="1px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
            boxShadow="0 2px 12px rgba(0, 0, 0, 0.2)"
          >
            <HStack justify="space-between" align="center" w="100%">
              <HStack spacing="3">
                <Icon as={FiEdit} boxSize="5" />
                <Text fontSize="md" fontWeight="bold">
                  تعديل سجل الحضور - {editingRecord?.name_ar || editingRecord?.Name || 'غير محدد'}
                </Text>
              </HStack>
              <ModalCloseButton 
                color="white"
                bg="rgba(255, 255, 255, 0.1)"
                borderRadius="full"
                size="md"
                _hover={{
                  bg: "rgba(255, 255, 255, 0.2)",
                  transform: "scale(1.1)"
                }}
                _active={{
                  transform: "scale(0.95)"
                }}
              />
            </HStack>
          </ModalHeader>
          <ModalBody bg="var(--stake-bg-primary, #0f212e)" p="8">
            {editingRecord && (
              <VStack spacing="4" align="stretch">
                {/* Hidden field for employee_id */}
                <input type="hidden" {...register('employee_id')} />
                
                {/* Hidden field for status */}
                <input type="hidden" {...register('status')} />
                
                <FormControl>
                  <FormLabel className="stake-label">التاريخ</FormLabel>
                  <Input
                    {...register('attendance_date', { required: 'التاريخ مطلوب' })}
                    type="date"
                    className="stake-input"
                    bg="var(--stake-bg-secondary, #111827)"
                    borderColor="var(--stake-border-primary, #2f4553)"
                    color="white"
                    _focus={{
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 1px #3b82f6"
                    }}
                    _hover={{
                      borderColor: "#4a5568"
                    }}
                  />
                  <FormErrorMessage>
                    {errors.attendance_date && errors.attendance_date.message}
                  </FormErrorMessage>
                </FormControl>

                <HStack spacing="4" align="stretch">
                  <FormControl flex="1">
                    <FormLabel className="stake-label">الحضور</FormLabel>
                    <Input
                      {...register('check_in_time')}
                      type="time"
                      className="stake-input"
                      bg="var(--stake-bg-secondary, #111827)"
                      borderColor="var(--stake-border-primary, #2f4553)"
                      color="white"
                      _focus={{
                        borderColor: "#3b82f6",
                        boxShadow: "0 0 0 1px #3b82f6"
                      }}
                      _hover={{
                        borderColor: "#4a5568"
                      }}
                    />
                  </FormControl>

                  <FormControl flex="1">
                    <FormLabel className="stake-label">الانصراف</FormLabel>
                    <Input
                      {...register('check_out_time')}
                      type="time"
                      className="stake-input"
                      bg="var(--stake-bg-secondary, #111827)"
                      borderColor="var(--stake-border-primary, #2f4553)"
                      color="white"
                      _focus={{
                        borderColor: "#3b82f6",
                        boxShadow: "0 0 0 1px #3b82f6"
                      }}
                      _hover={{
                        borderColor: "#4a5568"
                      }}
                    />
                  </FormControl>
                </HStack>

                <HStack spacing="6" align="stretch">
                  <FormControl flex="1">
                    <FormLabel className="stake-label">يوم عطلة</FormLabel>
                    <Checkbox
                      {...register('is_holiday')}
                      colorScheme="orange"
                      size="lg"
                    >
                      <Text color="var(--stake-text-primary)">
                        تحديد هذا اليوم كعطلة رسمية
                      </Text>
                    </Checkbox>
                    <Text fontSize="xs" className="stake-text-secondary" mt="1">
                      جميع ساعات العمل تعتبر إضافية في أيام العطلات
                    </Text>
                  </FormControl>

                  <FormControl flex="1">
                    <FormLabel className="stake-label">أذن تأخير</FormLabel>
                    <Checkbox
                      {...register('is_excused')}
                      colorScheme="blue"
                      size="lg"
                    >
                      <Text color="var(--stake-text-primary)">
                        الموظف لديه أذن تأخير
                      </Text>
                    </Checkbox>
                  </FormControl>
                </HStack>

                <FormControl>
                  <FormLabel className="stake-label">ملاحظات</FormLabel>
                  <Textarea
                    {...register('notes')}
                    placeholder="أدخل أي ملاحظات إضافية..."
                    rows={3}
                    className="stake-input"
                    bg="var(--stake-bg-secondary, #111827)"
                    borderColor="var(--stake-border-primary, #2f4553)"
                    color="white"
                    resize="vertical"
                    _focus={{
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 1px #3b82f6"
                    }}
                    _hover={{
                      borderColor: "#4a5568"
                    }}
                  />
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter 
            display="flex" 
            justifyContent="flex-end" 
            gap="3"
            bg="var(--stake-bg-primary, #0f212e)"
            borderRadius="0"
            p="4"
            borderTop="2px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
          >
            <Button className="stake-btn-secondary" onClick={onEditClose}>
              إلغاء
            </Button>
            <Button 
              className="stake-btn-success"
              onClick={async () => {
                console.log('🔥 Save button clicked!');
                console.log('🔥 Form values:', watch());
                console.log('🔥 Form errors:', errors);
                
                // Get form data manually
                const formData = watch();
                console.log('🔥 Calling onSubmit with:', formData);
                
                // Call onSubmit directly
                await onSubmit(formData);
              }}
              isLoading={loading}
              loadingText="جاري الحفظ..."
            >
              حفظ التغييرات
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Bulk Edit Time Modal - التعديل */}
      <Modal isOpen={isBulkEditOpen} onClose={onBulkEditClose} size="md" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden">
          <ModalHeader
            bg="var(--stake-bg-primary, #0f212e)"
            color="white"
            borderRadius="0"
            p="4"
            position="relative"
            borderBottom="1px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
            boxShadow="0 2px 12px rgba(0, 0, 0, 0.2)"
          >
            <HStack justify="space-between" align="center" w="full">
              <Text fontSize="lg" fontWeight="bold">
                التعديل
              </Text>
              <ModalCloseButton
                color="white"
                bg="rgba(255, 255, 255, 0.1)"
                borderRadius="full"
                size="md"
                _hover={{
                  bg: "rgba(255, 255, 255, 0.2)"
                }}
                _active={{
                  transform: "scale(0.95)"
                }}
              />
            </HStack>
          </ModalHeader>
          <ModalBody bg="var(--stake-bg-primary, #0f212e)" p="8">
            <Box
              bg="var(--stake-bg-secondary)"
              p="6"
              borderRadius="xl"
              border="1px solid"
              borderColor="var(--stake-border-primary)"
            >
              <FormControl>
                <FormLabel fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium" mb="2">
                  {bulkEditType === 'check_in' ? 'الحضور' : 'الانصراف'}
                </FormLabel>
                <Input
                  type="time"
                  value={bulkEditTime}
                  onChange={(e) => setBulkEditTime(e.target.value)}
                  className="stake-input"
                  size="lg"
                  bg="var(--stake-bg-primary)"
                  borderColor="var(--stake-border-primary)"
                  _focus={{ borderColor: "var(--stake-border-accent)", boxShadow: "0 0 0 1px var(--stake-border-accent)" }}
                />
              </FormControl>
            </Box>
          </ModalBody>
          <ModalFooter
            display="flex"
            justifyContent="flex-end"
            bg="var(--stake-bg-primary, #0f212e)"
            borderRadius="0"
            borderTop="2px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
            py="4"
          >
            <Button variant="ghost" color="var(--stake-text-secondary)" onClick={onBulkEditClose} mr="3">
              إلغاء
            </Button>
            <Button className="stake-btn" onClick={handleBulkEditSave} isLoading={bulkEditSaving} leftIcon={<FiSave />}>
              حفظ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* View Record Modal */}
      <Modal isOpen={isViewOpen} onClose={onViewClose} size="4xl" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden">
          <ModalHeader
            bg="var(--stake-bg-primary, #0f212e)"
            color="white"
            borderRadius="0"
            p="4"
            position="relative"
            borderBottom="1px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
            boxShadow="0 2px 12px rgba(0, 0, 0, 0.2)"
          >
            <HStack justify="space-between" align="center" w="full">
              <Text fontSize="lg" fontWeight="bold">
                تفاصيل سجل الحضور
              </Text>
              
              <HStack spacing="6" align="center" flex="1" justify="center">
                <HStack spacing="2" as="button" type="button" onClick={handleOpenEmployeeDetailsFromRecord} cursor="pointer" _hover={{ opacity: 0.9 }} title="عرض تفاصيل الموظف">
                  <Icon as={FiUser} color="blue.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">
                    {selectedRecord?.name_ar || selectedRecord?.Name || 'غير محدد'}
                  </Text>
                </HStack>
                <HStack spacing="2">
                  <Icon as={FiHash} color="green.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">{selectedRecord?.employee_code || '-'}</Text>
                </HStack>
                {selectedRecord?.salary_type === 'Monthly' ? (
                  <HStack spacing="2">
                    <Icon as={FiBriefcase} color="purple.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">
                      {selectedRecord?.department_description || selectedRecord?.department || '-'}
                    </Text>
                  </HStack>
                ) : (
                  <HStack spacing="2">
                    <Icon as={FiTarget} color="blue.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">
                      {selectedRecord?.cost_center || '-'}
                    </Text>
                  </HStack>
                )}
                <HStack spacing="2">
                  <Icon as={FiDollarSign} color="orange.300" boxSize="4" />
                  <Badge 
                    colorScheme={selectedRecord?.salary_type === 'Monthly' ? 'purple' : 'blue'}
                    variant="solid"
                    px="2"
                    py="1"
                    borderRadius="md"
                    fontSize="xs"
                  >
                    {selectedRecord?.salary_type === 'Monthly' ? 'شهري' : 'أسبوعي'}
                  </Badge>
                </HStack>
              </HStack>
              
              <Box w="40px"></Box>
              <ModalCloseButton 
                color="white"
                bg="rgba(255, 255, 255, 0.1)"
                borderRadius="full"
                size="md"
                _hover={{
                  bg: "rgba(255, 255, 255, 0.2)"
                }}
                _active={{
                  transform: "scale(0.95)"
                }}
              />
            </HStack>
          </ModalHeader>
          <ModalBody p="8">
            {selectedRecord && (
              <VStack spacing="6" align="stretch">
                {/* أوقات الحضور */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    أوقات الحضور والانصراف
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 4 }} spacing="4">
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">
                          التاريخ
                        </Text>
                        <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">
                          {dayjs(selectedRecord.attendance_date).format('DD/MM')}
                        </Text>
                      </VStack>
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">
                          الحضور
                        </Text>
                        <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">
                          {formatTime(selectedRecord.check_in_time)}
                        </Text>
                      </VStack>
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">
                          الانصراف
                        </Text>
                        <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">
                          {formatTime(selectedRecord.check_out_time)}
                        </Text>
                      </VStack>
                    </Box>
                  </SimpleGrid>
                </Box>

                {/* ساعات العمل */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    ساعات العمل
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing="4">
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">
                          ساعات العمل
                        </Text>
                        <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">
                          {selectedRecord.total_hours ? formatHoursAndMinutes(selectedRecord.total_hours) : '-'}
                        </Text>
                      </VStack>
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">
                          ساعات الإضافي
                        </Text>
                        <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">
                          {selectedRecord.overtime_hours ? formatHoursAndMinutes(selectedRecord.overtime_hours) : '-'}
                        </Text>
                      </VStack>
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">
                          الانصراف المبكر
                        </Text>
                        <Text fontSize="md" fontWeight="bold" color="red.300">
                          {parseFloat(selectedRecord.early_leave_minutes) > 0
                            ? formatMinutesAsHoursAndMinutes(selectedRecord.early_leave_minutes)
                            : '-'}
                        </Text>
                      </VStack>
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">
                          الحالة
                        </Text>
                        <Badge colorScheme={getStatusColor(calculateStatus(selectedRecord))} size="lg" fontSize="md" px="3" py="1">
                          {getStatusText(calculateStatus(selectedRecord))}
                        </Badge>
                      </VStack>
                    </Box>
                  </SimpleGrid>
                </Box>

                {/* ملاحظات */}
                {selectedRecord.notes && (
                  <Box>
                    <HStack mb="4" spacing="2">
                      <Icon as={FiInfo} color="var(--stake-text-primary)" />
                      <Text fontSize="lg" fontWeight="bold" color="var(--stake-text-primary)">
                        ملاحظات
                      </Text>
                    </HStack>
                    <HStack spacing="2" flexWrap="wrap" align="flex-start">
                      {parseNotes(selectedRecord.notes).map((note, index) => (
                        <Badge
                          key={index}
                          colorScheme={note.color}
                          variant="subtle"
                          px="3"
                          py="1.5"
                          borderRadius="md"
                          fontSize="sm"
                          fontWeight="500"
                          display="flex"
                          alignItems="center"
                          gap="2"
                          transition="all 0.2s"
                          _hover={{
                            transform: 'translateY(-2px)',
                            boxShadow: 'md'
                          }}
                        >
                          <Icon
                            as={note.icon}
                            fontSize="16px"
                          />
                          {note.text}
                        </Badge>
                      ))}
                    </HStack>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter
            display="flex"
            justifyContent="space-between"
            bg="var(--stake-bg-primary, #0f212e)"
            borderRadius="0"
            borderTop="2px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
            py="4"
          >
            <HStack spacing="3">
              <Button
                leftIcon={<FiClock />}
                className="stake-btn-secondary"
                onClick={() => {
                  if (selectedRecord) handleViewEmployeeAttendance(selectedRecord);
                }}
              >
                عرض الحضور
              </Button>
              <Button
                leftIcon={<FiEdit />}
                className="stake-btn-success"
                onClick={() => {
                  if (selectedRecord) handleEditRecord(selectedRecord);
                }}
              >
                تعديل
              </Button>
            </HStack>
            <Button className="stake-btn" onClick={onViewClose}>إغلاق</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* مودال تفاصيل الموظف (يُفتح عند النقر على اسم الموظف في تفاصيل سجل الحضور) */}
      <Modal isOpen={isEmployeeDetailsOpen} onClose={() => { onEmployeeDetailsClose(); setEmployeeDetailsData(null); }} size="4xl" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden">
          <ModalHeader
            bg="var(--stake-bg-primary, #0f212e)"
            color="white"
            borderRadius="24px 24px 0 0"
            p="4"
            position="relative"
          >
            <HStack justify="space-between" align="center" w="full">
              <Text fontSize="lg" fontWeight="bold">
                تفاصيل الموظف
              </Text>
              {employeeDetailsData && (
                <HStack spacing="6" align="center" flex="1" justify="center">
                  <HStack spacing="2">
                    <Icon as={FiUser} color="blue.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">
                      {employeeDetailsData.name_ar || employeeDetailsData.name || 'غير محدد'}
                    </Text>
                  </HStack>
                  <HStack spacing="2">
                    <Icon as={FiHash} color="green.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">{employeeDetailsData.employee_code || '-'}</Text>
                  </HStack>
                  <HStack spacing="2">
                    <Icon as={FiKey} color="orange.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">{employeeDetailsData['AC-No.'] ?? '-'}</Text>
                  </HStack>
                  {employeeDetailsData.salary_type === 'Monthly' ? (
                    <HStack spacing="2">
                      <Icon as={FiBriefcase} color="purple.300" boxSize="4" />
                      <Text fontSize="sm" className="stake-text-secondary">
                        {employeeDetailsData.department_description || employeeDetailsData.department || '-'}
                      </Text>
                    </HStack>
                  ) : (
                    <HStack spacing="2">
                      <Icon as={FiTarget} color="blue.300" boxSize="4" />
                      <Text fontSize="sm" className="stake-text-secondary">
                        {employeeDetailsData.cost_center || '-'}
                      </Text>
                    </HStack>
                  )}
                  <HStack spacing="2">
                    <Icon as={FiDollarSign} color="orange.300" boxSize="4" />
                    <Badge
                      colorScheme={employeeDetailsData.salary_type === 'Monthly' ? 'purple' : 'blue'}
                      variant="solid"
                      px="2"
                      py="1"
                      borderRadius="md"
                      fontSize="xs"
                    >
                      {employeeDetailsData.salary_type === 'Monthly' ? 'شهري' : 'أسبوعي'}
                    </Badge>
                  </HStack>
                </HStack>
              )}
              <Box w="40px"></Box>
              <ModalCloseButton
                color="white"
                bg="rgba(255, 255, 255, 0.1)"
                borderRadius="full"
                size="md"
                _hover={{ bg: 'rgba(255, 255, 255, 0.2)' }}
                _active={{ transform: 'scale(0.95)' }}
              />
            </HStack>
          </ModalHeader>
          <ModalBody p="8">
            {employeeDetailsData && (
              <VStack spacing="6" align="stretch">
                {/* معلومات الراتب - مطابق لصفحة إدارة الموظفين */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    معلومات الراتب
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 4 }} spacing="4">
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">
                          الراتب الأساسي
                        </Text>
                        <Text fontSize="md" fontWeight="bold" color="green.400">
                          {formatCurrency(employeeDetailsData.base_salary || 0)}
                        </Text>
                      </VStack>
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">
                          التمييز والحوافز
                        </Text>
                        <Text fontSize="md" fontWeight="bold" color="orange.400">
                          {formatCurrency(employeeDetailsData.discrimination_incentive_allowance || 0)}
                        </Text>
                      </VStack>
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">
                          نوع الراتب
                        </Text>
                        <Badge
                          colorScheme={employeeDetailsData.salary_type === 'Monthly' ? 'purple' : 'blue'}
                          variant="solid"
                          px="3"
                          py="1"
                          borderRadius="md"
                        >
                          {employeeDetailsData.salary_type === 'Monthly' ? 'شهري' : 'أسبوعي'}
                        </Badge>
                      </VStack>
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">
                          مؤمن عليه
                        </Text>
                        <Badge
                          colorScheme={employeeDetailsData.is_insured ? 'green' : 'red'}
                          variant="solid"
                          px="3"
                          py="1"
                          borderRadius="md"
                        >
                          {employeeDetailsData.is_insured ? 'نعم' : 'لا'}
                        </Badge>
                      </VStack>
                    </Box>
                  </SimpleGrid>
                </Box>
                {/* معلومات العمل */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    معلومات العمل
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing="4">
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">
                          القسم
                        </Text>
                        <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">
                          {employeeDetailsData.department_description || employeeDetailsData.department || '-'}
                        </Text>
                      </VStack>
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">
                          التكلفة
                        </Text>
                        <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">
                          {employeeDetailsData.cost_center || '-'}
                        </Text>
                      </VStack>
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">
                          المنصب
                        </Text>
                        <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">
                          {employeeDetailsData.position || '-'}
                        </Text>
                      </VStack>
                    </Box>
                  </SimpleGrid>
                </Box>

                {/* معلومات إضافية */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    معلومات إضافية
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing="4">
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">
                          الموقع
                        </Text>
                        <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">
                          {employeeDetailsData.location || '-'}
                        </Text>
                      </VStack>
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">
                          تاريخ التعيين
                        </Text>
                        <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">
                          {employeeDetailsData.hire_date ? new Date(employeeDetailsData.hire_date).toLocaleDateString('ar-EG') : '-'}
                        </Text>
                      </VStack>
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">
                          الحالة
                        </Text>
                        <Badge
                          colorScheme={employeeDetailsData.status === 'active' ? 'green' : 'red'}
                          variant="solid"
                          px="3"
                          py="1"
                          borderRadius="md"
                        >
                          {employeeDetailsData.status === 'active' ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </VStack>
                    </Box>
                  </SimpleGrid>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter
            justifyContent="center"
            gap="4"
            bg="var(--stake-bg-primary, #0f212e)"
            borderTop="1px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
            borderRadius="0 0 24px 24px"
            p="6"
            boxShadow="0 -4px 20px rgba(0, 0, 0, 0.4)"
          >
            <HStack spacing="3">
              <Button
                leftIcon={<FiEdit />}
                h="48px"
                px="8"
                fontWeight="600"
                borderRadius="xl"
                bg="#3b82f6"
                color="white"
                _hover={{ bg: '#2563eb' }}
                onClick={() => {
                  if (!employeeDetailsData) return;
                  onEmployeeDetailsClose();
                  setEmployeeDetailsData(null);
                  navigate('/unified-employees', { state: { openEmployeeId: employeeDetailsData.id, openMode: 'edit' } });
                }}
              >
                تعديل البيانات
              </Button>
              <Button
                leftIcon={<FiTrash2 />}
                h="48px"
                px="8"
                fontWeight="600"
                borderRadius="xl"
                bg="#dc2626"
                color="white"
                _hover={{ bg: '#b91c1c' }}
                onClick={() => {
                  if (!employeeDetailsData) return;
                  const employeeName = employeeDetailsData.name_ar || employeeDetailsData.name || 'هذا الموظف';
                  const confirmMessage = `⚠️ تحذير: حذف الموظف نهائياً\n\nالموظف: ${employeeName}\nالكود: ${employeeDetailsData.employee_code || 'غير محدد'}\n\nهذا الإجراء سيحذف:\n• بيانات الموظف من قاعدة البيانات\n• جميع سجلات الحضور والانصراف\n• سجلات البصمة الخام (fingerprint_attendance) المرتبطة بكود البصمة AC-No.\n• جميع البيانات المرتبطة بالموظف\n\n⚠️ لا يمكن التراجع عن هذا الإجراء!\n\nهل أنت متأكد من المتابعة؟`;
                  if (window.confirm(confirmMessage)) {
                    handleDeleteEmployeeFromDetailsModal(employeeDetailsData);
                  }
                }}
              >
                حذف الموظف
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Employee Attendance Modal — غلاف زوايا مطابق لمودالات التفاصيل */}
      <Modal
        isOpen={isEmployeeAttendanceOpen}
        onClose={() => setIsEmployeeAttendanceOpen(false)}
        size="6xl"
        isCentered
        scrollBehavior="inside"
      >
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent
          bg="var(--stake-bg-primary)"
          border="none"
          borderRadius="3xl"
          boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          overflow="hidden"
        >
          <ModalHeader
            bg="var(--stake-bg-primary, #0f212e)"
            color="white"
            borderRadius="0"
            p="4"
            position="relative"
            borderBottom="1px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
            boxShadow="0 2px 12px rgba(0, 0, 0, 0.2)"
          >
            <HStack justify="space-between" align="center" w="full" flexWrap="wrap" spacing="3">
              <HStack spacing="4" align="center" flexWrap="wrap">
                <Text fontSize="lg" fontWeight="bold" color="white">
                  سجلات الحضور - {selectedEmployee?.Name}
                </Text>
                <Badge colorScheme={selectedEmployee?.salary_type === 'Monthly' ? 'blue' : 'purple'}>
                  {selectedEmployee?.salary_type === 'Monthly' ? 'شهري' : 'أسبوعي'}
                </Badge>
                <Text fontSize="sm" color="gray.300">
                  الفترة المفلترة: {getCurrentFilterPeriod()}
                </Text>
              </HStack>

              {selectedEmployee?.salary_type === 'Weekly' && (
                <HStack spacing="3" align="center" flexWrap="wrap">
                  <Text fontSize="sm" fontWeight="medium" color="gray.300">
                    اختر الأسبوع:
                  </Text>
                  <Select
                    value={selectedWeek}
                    onChange={(e) => handleWeekChange(parseInt(e.target.value))}
                    size="sm"
                    maxW="200px"
                    borderRadius="lg"
                    className="stake-input"
                  >
                    {generateMonthWeeks().map((week) => (
                      <option key={week.week} value={week.week}>
                        {week.label}
                      </option>
                    ))}
                  </Select>
                </HStack>
              )}
            </HStack>
            <ModalCloseButton
              color="white"
              bg="rgba(255, 255, 255, 0.1)"
              borderRadius="full"
              size="md"
              _hover={{ bg: 'rgba(255, 255, 255, 0.2)', transform: 'scale(1.05)' }}
              _active={{ transform: 'scale(0.95)' }}
            />
          </ModalHeader>
          <ModalBody bg="var(--stake-bg-primary, #0f212e)" p="6">
            {/* Monthly employees - show all days of month */}
            {selectedEmployee?.salary_type === 'Monthly' ? (
              <VStack spacing="4" align="stretch">
                <HStack justify="space-between" w="full">
                  <Text fontSize="md" fontWeight="medium" className="stake-text-secondary">
                    جميع أيام الشهر من أول يوم حتى اليوم الحالي:
                  </Text>
                  <Badge colorScheme="blue" fontSize="sm">
                    {employeeAttendanceRecords.length} سجل
                  </Badge>
                </HStack>
                <TableContainer 
                  maxH="60vh" 
                  overflowY="auto"
                  sx={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#94a3b8 #f1f5f9',
                    '&::-webkit-scrollbar': {
                      width: '12px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f1f5f9',
                      borderRadius: '6px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#94a3b8',
                      borderRadius: '6px',
                      border: '2px solid #f1f5f9',
                      '&:hover': {
                        background: '#64748b',
                      },
                    },
                  }}
                >
                  <Table 
                    variant="simple" 
                    size="sm" 
                    layout="fixed" 
                    className="stake-table"
                    sx={{
                      'tr.holiday-row, tr.holiday-row td, tr.holiday-row > td': {
                        background: 'var(--stake-bg-secondary) !important',
                        backgroundColor: 'var(--stake-bg-secondary) !important'
                      },
                      'tr.holiday-row:hover, tr.holiday-row:hover td, tr.holiday-row:hover > td': {
                        background: 'var(--stake-bg-hover) !important',
                        backgroundColor: 'var(--stake-bg-hover) !important'
                      },
                    }}
                  >
                    <Thead
                      sx={{
                        '& th': {
                          color: 'var(--stake-table-header-text, var(--stake-text-primary)) !important',
                        },
                      }}
                    >
                      <Tr>
                        <Th>
                          <EnglishKeyTooltip englishKey="date">
                            التاريخ
                          </EnglishKeyTooltip>
                        </Th>
                        <Th>
                          <EnglishKeyTooltip englishKey="check_in">
                            الحضور
                          </EnglishKeyTooltip>
                        </Th>
                        <Th>
                          <EnglishKeyTooltip englishKey="check_out">
                            الانصراف
                          </EnglishKeyTooltip>
                        </Th>
                        <Th>
                          <EnglishKeyTooltip englishKey="work_hours">
                            ساعات العمل
                          </EnglishKeyTooltip>
                        </Th>
                        <Th>
                          <EnglishKeyTooltip englishKey="overtime_hours">
                            الإضافي
                          </EnglishKeyTooltip>
                        </Th>
                        <Th>
                          <EnglishKeyTooltip englishKey="early_leave_minutes">
                            الانصراف المبكر
                          </EnglishKeyTooltip>
                        </Th>
                        <Th>
                          <EnglishKeyTooltip englishKey="late_penalty">
                            التأخير
                          </EnglishKeyTooltip>
                        </Th>
                        <Th>
                          <EnglishKeyTooltip englishKey="status">
                            الحالة
                          </EnglishKeyTooltip>
                        </Th>
                        <Th>
                          <EnglishKeyTooltip englishKey="source">
                            المصدر
                          </EnglishKeyTooltip>
                        </Th>
                        <Th>
                          <EnglishKeyTooltip englishKey="actions">
                            إجراءات
                          </EnglishKeyTooltip>
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {(() => {
                        try {
                          const monthlyDays = getMonthlyDays() || [];
                          if (!Array.isArray(monthlyDays)) return [];
                          return monthlyDays
                            .filter(day => {
                              try {
                                return day != null && 
                                       typeof day === 'object' && 
                                       day.date != null && 
                                       typeof day.date === 'string' &&
                                       day.date.length === 10;
                              } catch (e) {
                                console.error('Error in filter:', e, day);
                                return false;
                              }
                            })
                            .map((day) => {
                              if (!day || !day.date) return null;
                        const record = (employeeAttendanceRecords || []).find(r => r && r.attendance_date === day.date);
                        const isEditing = record && editingAttendanceRecord?.id === record?.id;
                        const editedRecord = isEditing ? editingAttendanceRecord : record;
                        return (
                          <Tr 
                            key={day.date}
                            className={
                        (record?.is_holiday === 1 || record?.is_holiday === true) 
                          ? 'holiday-row' 
                              : ''
                      }
                            style={{
                              background: (record?.is_holiday === 1 || record?.is_holiday === true)
                                ? '#0F212E !important' 
                                : day.isToday 
                                  ? '#EBF8FF !important' 
                                  : undefined
                            }}
                            bg={
                              (record?.is_holiday === 1 || record?.is_holiday === true)
                                ? '#0F212E' 
                                : day.isToday 
                                  ? 'blue.50' 
                                  : undefined
                            }
                            _hover={{
                              bg: (record?.is_holiday === 1 || record?.is_holiday === true)
                                ? '#1A2C38' 
                                : day.isToday 
                                  ? 'blue.100' 
                                  : 'gray.50'
                            }}
                            sx={{
                              background: (record?.is_holiday === 1 || record?.is_holiday === true)
                                ? '#0F212E !important' 
                                : day.isToday 
                                  ? '#EBF8FF !important' 
                                  : undefined,
                              '&:hover': {
                                background: (record?.is_holiday === 1 || record?.is_holiday === true)
                                  ? '#1A2C38 !important' 
                                  : day.isToday 
                                    ? '#BEE3F8 !important' 
                                    : undefined
                              }
                            }}
                          >
                            <Td>
                              <HStack>
                                <Text>{day.label}</Text>
                                {day.isToday && <Badge colorScheme="blue" size="sm">اليوم</Badge>}
                              </HStack>
                            </Td>
                            <Td>
                              {isEditing ? (
                                <Input
                                  type="time"
                                  value={toFormTimeValue(editedRecord?.check_in_time || editedRecord?.check_in)}
                                  onChange={(e) => {
                                    const newTime = e.target.value + ':00';
                                    setEditingAttendanceRecord({
                                      ...editedRecord,
                                      check_in_time: newTime
                                    });
                                  }}
                                  size="sm"
                                  w="120px"
                                />
                              ) : (
                                formatTime(record?.check_in_time)
                              )}
                            </Td>
                            <Td>
                              {isEditing ? (
                                <Input
                                  type="time"
                                  value={toFormTimeValue(editedRecord?.check_out_time || editedRecord?.check_out)}
                                  onChange={(e) => {
                                    const newTime = e.target.value + ':00';
                                    setEditingAttendanceRecord({
                                      ...editedRecord,
                                      check_out_time: newTime
                                    });
                                  }}
                                  size="sm"
                                  w="120px"
                                />
                              ) : (
                                formatTime(record?.check_out_time)
                              )}
                            </Td>
                            <Td>{formatHoursAndMinutes(editedRecord?.total_hours)}</Td>
                            <Td>
                              {record && record?.overtime_hours && parseFloat(record.overtime_hours) > 0 ? 
                                <Text color="orange.300">+{formatHoursAndMinutes(record.overtime_hours)}</Text> : '-'}
                            </Td>
                            <Td>
                              {record && parseFloat(record?.early_leave_minutes) > 0
                                ? <Text color="red.300">-{formatMinutesAsHoursAndMinutes(record.early_leave_minutes)}</Text>
                                : '-'}
                            </Td>
                            <Td>
                              {(record?.is_holiday === 1 || record?.is_holiday === true || record?.is_holiday === '1') ? '-' : (record?.late_penalty_hours && parseFloat(record.late_penalty_hours) > 0 ?
                                <Text color="red.300">{formatHoursAndMinutes(record.late_penalty_hours)}</Text> : '-')}
                            </Td>
                            <Td>
                              {record ? (
                                (() => {
                                  const calculatedStatus = calculateStatus(editedRecord || record);
                                  
                                  if (calculatedStatus === 'holiday') {
                                    return (
                                  <Badge colorScheme="orange">
                                    <HStack spacing="1">
                                      <Icon as={FiCalendar} boxSize="3" />
                                      <Text>عطلة</Text>
                                    </HStack>
                                  </Badge>
                                    );
                                  }
                                  
                                  const StatusIcon = getStatusIcon(calculatedStatus);
                                  return (
                                    <Badge colorScheme={getStatusColor(calculatedStatus)}>
                                      <HStack spacing="1">
                                        <StatusIcon size="12" />
                                        <Text>{getStatusText(calculatedStatus)}</Text>
                                      </HStack>
                                  </Badge>
                                  );
                                })()
                              ) : (
                                <Badge colorScheme="gray">لا يوجد سجل</Badge>
                              )}
                            </Td>
                            <Td>
                              {record ? (
                                <Badge colorScheme={record.source_type === 'manual' ? 'blue' : 'green'}>
                                  {record.source_type === 'manual' ? 'يدوي' : 'بصمة'}
                                </Badge>
                              ) : (
                                <Text className="stake-text-secondary">-</Text>
                              )}
                            </Td>
                            <Td>
                              {record ? (
                                isEditing ? (
                                  <HStack spacing="2">
                                    <IconButton
                                      icon={<FiCheck />}
                                      size="sm"
                                      colorScheme="green"
                                      onClick={async () => {
                                        try {
                                          setLoading(true);
                                          const payload = {
                                            action: 'update_record',
                                            record_id: editedRecord.id,
                                            employee_id: editedRecord.employee_id,
                                            attendance_date: editedRecord.attendance_date,
                                            check_in_time: editedRecord.check_in_time,
                                            check_out_time: editedRecord.check_out_time,
                                          };

                                          const response = await fetch(getApiUrl('/api/attendance_logs.php'), {
                                            method: 'POST',
                                            headers: {
                                              'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify(payload),
                                          });
                                          
                                          const result = await response.json();
                                          if (result.success) {
                                            toast({
                                              title: 'تم تحديث السجل بنجاح',
                                              status: 'success',
                                              duration: 3000,
                                            });
                                            
                                            // تحديث السجل في employeeAttendanceRecords
                                            setEmployeeAttendanceRecords(prev => prev.map(r => 
                                              r.id === editedRecord.id ? result.record : r
                                            ));
                                            
                                            // تحديث السجل في attendanceRecords
                                            setAttendanceRecords(prev => prev.map(r => 
                                              r.id === editedRecord.id ? result.record : r
                                            ));
                                            
                                            // تحديث selectedRecord إذا كان نفس السجل
                                            if (selectedRecord && selectedRecord.id === editedRecord.id) {
                                              setSelectedRecord(result.record);
                                            }
                                            
                                            setEditingAttendanceRecord(null);
                                            
                                            // إعادة تحميل البيانات
                                            setTimeout(() => {
                                              loadAttendanceRecords();
                                            }, 100);
                                          } else {
                                            toast({
                                              title: 'خطأ في تحديث السجل',
                                              description: result.message,
                                              status: 'error',
                                              duration: 3000,
                                            });
                                          }
                                        } catch (error) {
                                          toast({
                                            title: 'خطأ في تحديث السجل',
                                            description: error.message,
                                            status: 'error',
                                            duration: 3000,
                                          });
                                        } finally {
                                          setLoading(false);
                                        }
                                      }}
                                    />
                                    <IconButton
                                      icon={<FiX />}
                                      size="sm"
                                      colorScheme="red"
                                      onClick={() => setEditingAttendanceRecord(null)}
                                    />
                                  </HStack>
                                ) : (
                                  <IconButton
                                    icon={<FiEdit />}
                                    size="sm"
                                    colorScheme="blue"
                                    onClick={() => setEditingAttendanceRecord({ ...record })}
                                  />
                                )
                              ) : (
                                <Text className="stake-text-secondary">-</Text>
                              )}
                            </Td>
                          </Tr>
                        );
                      })
                            .filter(item => item != null);
                        } catch (error) {
                          console.error('Error rendering monthly days:', error);
                          return [];
                        }
                      })()}
                    </Tbody>
                  </Table>
                </TableContainer>
              </VStack>
            ) : (
              /* Weekly employees - show selected week records */
              employeeAttendanceRecords.length > 0 ? (
                <VStack spacing="4" align="stretch">
                  <HStack justify="space-between" w="full">
                    <Text fontSize="md" fontWeight="medium" className="stake-text-secondary">
                      سجلات الأسبوع المحدد:
                    </Text>
                    <Badge colorScheme="purple" fontSize="sm">
                      {employeeAttendanceRecords.length} سجل
                    </Badge>
                  </HStack>
                  <TableContainer 
                  maxH="60vh" 
                  overflowY="auto"
                  sx={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#94a3b8 #f1f5f9',
                    '&::-webkit-scrollbar': {
                      width: '12px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f1f5f9',
                      borderRadius: '6px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#94a3b8',
                      borderRadius: '6px',
                      border: '2px solid #f1f5f9',
                      '&:hover': {
                        background: '#64748b',
                      },
                    },
                  }}
                >
                  <Table 
                    variant="simple" 
                    size="sm" 
                    layout="fixed" 
                    className="stake-table"
                    sx={{
                      'tr.holiday-row, tr.holiday-row td, tr.holiday-row > td': {
                        background: 'var(--stake-bg-secondary) !important',
                        backgroundColor: 'var(--stake-bg-secondary) !important'
                      },
                      'tr.holiday-row:hover, tr.holiday-row:hover td, tr.holiday-row:hover > td': {
                        background: 'var(--stake-bg-hover) !important',
                        backgroundColor: 'var(--stake-bg-hover) !important'
                      },
                    }}
                  >
                    <Thead
                      sx={{
                        '& th': {
                          color: 'var(--stake-table-header-text, var(--stake-text-primary)) !important',
                        },
                      }}
                    >
                      <Tr>
                        <Th>
                          <EnglishKeyTooltip englishKey="date">
                            التاريخ
                          </EnglishKeyTooltip>
                        </Th>
                        <Th>
                          <EnglishKeyTooltip englishKey="check_in">
                            الحضور
                          </EnglishKeyTooltip>
                        </Th>
                        <Th>
                          <EnglishKeyTooltip englishKey="check_out">
                            الانصراف
                          </EnglishKeyTooltip>
                        </Th>
                        <Th>
                          <EnglishKeyTooltip englishKey="work_hours">
                            ساعات العمل
                          </EnglishKeyTooltip>
                        </Th>
                        <Th>
                          <EnglishKeyTooltip englishKey="overtime_hours">
                            الإضافي
                          </EnglishKeyTooltip>
                        </Th>
                        <Th>
                          <EnglishKeyTooltip englishKey="early_leave_minutes">
                            الانصراف المبكر
                          </EnglishKeyTooltip>
                        </Th>
                        <Th>
                          <EnglishKeyTooltip englishKey="late_penalty">
                            التأخير
                          </EnglishKeyTooltip>
                        </Th>
                        <Th>
                          <EnglishKeyTooltip englishKey="status">
                            الحالة
                          </EnglishKeyTooltip>
                        </Th>
                        <Th>
                          <EnglishKeyTooltip englishKey="source">
                            المصدر
                          </EnglishKeyTooltip>
                        </Th>
                        <Th>
                          <EnglishKeyTooltip englishKey="actions">
                            إجراءات
                          </EnglishKeyTooltip>
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {(employeeAttendanceRecords || []).filter(record => record != null).map((record, index) => {
                        const isEditing = editingAttendanceRecord?.id === record?.id;
                        const editedRecord = isEditing ? editingAttendanceRecord : record;
                        if (!record) return null;
                        return (
                        <Tr 
                          key={index}
                          className={
                            record.is_holiday === 1 || record.is_holiday === true 
                              ? 'holiday-row' 
                              : ''
                          }
                          style={{
                            background: record.is_holiday === 1 || record.is_holiday === true 
                              ? '#0F212E !important' 
                              : (record.is_excused === 1 || record.is_excused === true || record.is_excused === '1')
                                ? '#2F4553 !important' // لون غامق للإذن
                                : undefined
                          }}
                          bg={record.is_holiday === 1 || record.is_holiday === true 
                            ? '#0F212E' 
                            : undefined
                          }
                          _hover={{
                            bg: record.is_holiday === 1 || record.is_holiday === true 
                              ? '#1A2C38' 
                              : 'gray.50'
                          }}
                          sx={{
                            background: record.is_holiday === 1 || record.is_holiday === true 
                              ? '#0F212E !important' 
                              : undefined,
                            '&:hover': {
                              background: record.is_holiday === 1 || record.is_holiday === true 
                                ? '#1A2C38 !important' 
                                : undefined
                            }
                          }}
                        >
                          <Td>{dayjs(record.attendance_date).format('DD/MM')}</Td>
                          <Td>
                            {isEditing ? (
                              <Input
                                type="time"
                                value={toFormTimeValue(editedRecord.check_in_time || editedRecord.check_in)}
                                onChange={(e) => {
                                  const newTime = e.target.value + ':00';
                                  setEditingAttendanceRecord({
                                    ...editedRecord,
                                    check_in_time: newTime
                                  });
                                }}
                                size="sm"
                                w="120px"
                              />
                            ) : (
                              formatTime(record.check_in_time)
                            )}
                          </Td>
                          <Td>
                            {isEditing ? (
                              <Input
                                type="time"
                                value={toFormTimeValue(editedRecord.check_out_time || editedRecord.check_out)}
                                onChange={(e) => {
                                  const newTime = e.target.value + ':00';
                                  setEditingAttendanceRecord({
                                    ...editedRecord,
                                    check_out_time: newTime
                                  });
                                }}
                                size="sm"
                                w="120px"
                              />
                            ) : (
                              formatTime(record.check_out_time)
                            )}
                          </Td>
                          <Td>{formatHoursAndMinutes(editedRecord.total_hours)}</Td>
                          <Td>
                            {record && record.overtime_hours && parseFloat(record.overtime_hours) > 0 ? 
                              <Text color="orange.300">+{formatHoursAndMinutes(record.overtime_hours)}</Text> : '-'}
                          </Td>
                          <Td>
                            {record && parseFloat(record.early_leave_minutes) > 0
                              ? <Text color="red.300">-{formatMinutesAsHoursAndMinutes(record.early_leave_minutes)}</Text>
                              : '-'}
                          </Td>
                          <Td>
                            {(record?.is_holiday === 1 || record?.is_holiday === true || record?.is_holiday === '1') ? '-' : (record?.late_penalty_hours && parseFloat(record.late_penalty_hours) > 0 ?
                              <Text color="red.300">{formatHoursAndMinutes(record.late_penalty_hours)}</Text> : '-')}
                          </Td>
                          <Td>
                            {(() => {
                              const calculatedStatus = calculateStatus(editedRecord);
                              
                              if (calculatedStatus === 'holiday') {
                                return (
                              <Badge colorScheme="orange">
                                <HStack spacing="1">
                                  <Icon as={FiCalendar} boxSize="3" />
                                  <Text>عطلة</Text>
                                </HStack>
                              </Badge>
                                );
                              }
                              
                              const StatusIcon = getStatusIcon(calculatedStatus);
                              return (
                                <Badge colorScheme={getStatusColor(calculatedStatus)}>
                                  <HStack spacing="1">
                                    <StatusIcon size="12" />
                                    <Text>{getStatusText(calculatedStatus)}</Text>
                                  </HStack>
                              </Badge>
                              );
                            })()}
                          </Td>
                          <Td>
                            <Badge colorScheme={record.source_type === 'manual' ? 'blue' : 'green'}>
                              {record.source_type === 'manual' ? 'يدوي' : 'بصمة'}
                            </Badge>
                          </Td>
                          <Td>
                            {isEditing ? (
                              <HStack spacing="2">
                                <IconButton
                                  icon={<FiCheck />}
                                  size="sm"
                                  colorScheme="green"
                                  onClick={async () => {
                                    try {
                                      setLoading(true);
                                      const payload = {
                                        action: 'update_record',
                                        record_id: editedRecord.id,
                                        employee_id: editedRecord.employee_id,
                                        attendance_date: editedRecord.attendance_date,
                                        check_in_time: editedRecord.check_in_time,
                                        check_out_time: editedRecord.check_out_time,
                                      };

                                      const response = await fetch(getApiUrl('/api/attendance_logs.php'), {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify(payload),
                                      });
                                      
                                      const result = await response.json();
                                      if (result.success) {
                                        toast({
                                          title: 'تم تحديث السجل بنجاح',
                                          status: 'success',
                                          duration: 3000,
                                        });
                                        
                                        // تحديث السجل في employeeAttendanceRecords
                                        setEmployeeAttendanceRecords(prev => prev.map(r => 
                                          r.id === editedRecord.id ? result.record : r
                                        ));
                                        
                                        // تحديث السجل في attendanceRecords
                                        setAttendanceRecords(prev => prev.map(r => 
                                          r.id === editedRecord.id ? result.record : r
                                        ));
                                        
                                        // تحديث selectedRecord إذا كان نفس السجل
                                        if (selectedRecord && selectedRecord.id === editedRecord.id) {
                                          setSelectedRecord(result.record);
                                        }
                                        
                                        setEditingAttendanceRecord(null);
                                        
                                        // إعادة تحميل البيانات
                                        setTimeout(() => {
                                          loadAttendanceRecords();
                                        }, 100);
                                      } else {
                                        toast({
                                          title: 'خطأ في تحديث السجل',
                                          description: result.message,
                                          status: 'error',
                                          duration: 3000,
                                        });
                                      }
                                    } catch (error) {
                                      toast({
                                        title: 'خطأ في تحديث السجل',
                                        description: error.message,
                                        status: 'error',
                                        duration: 3000,
                                      });
                                    } finally {
                                      setLoading(false);
                                    }
                                  }}
                                />
                                <IconButton
                                  icon={<FiX />}
                                  size="sm"
                                  colorScheme="red"
                                  onClick={() => setEditingAttendanceRecord(null)}
                                />
                              </HStack>
                            ) : (
                              <IconButton
                                icon={<FiEdit />}
                                size="sm"
                                colorScheme="blue"
                                onClick={() => setEditingAttendanceRecord({ ...record })}
                              />
                            )}
                          </Td>
                        </Tr>
                      );
                      })}
                    </Tbody>
                  </Table>
                  </TableContainer>
                </VStack>
              ) : (
                <Center py="8">
                  <VStack spacing="4">
                    <Icon as={FiCalendar} boxSize="12" className="stake-text-secondary" />
                    <Text className="stake-text-secondary">لا توجد سجلات حضور لهذا الموظف في الأسبوع المحدد</Text>
                  </VStack>
                </Center>
              )
            )}
          </ModalBody>
          <ModalFooter
            display="flex"
            justifyContent="flex-end"
            bg="var(--stake-bg-primary, #0f212e)"
            borderRadius="0"
            borderTop="2px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
            py="4"
          >
            <Button
              className="stake-btn"
              onClick={() => setIsEmployeeAttendanceOpen(false)}
              h="40px"
              px="6"
              fontWeight="600"
              borderRadius="lg"
            >
              إغلاق
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ChakraAttendance;




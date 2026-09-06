import React, { useState, useEffect, useMemo } from 'react';
import { getApiUrl } from '../utils/apiUrlHelper';
import { getFinancialTableColumnClass } from '../utils/financialColumnClasses';
import {
  Box,
  Card,
  CardBody,
  Container,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  Avatar,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Divider,
  Flex,
  Spacer,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Spinner,
  Center,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Radio,
  RadioGroup,
  Stack,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  SimpleGrid,
  Icon,
  Checkbox,
  Switch,
  Tooltip,
  Portal,
} from '@chakra-ui/react';
import {
  FiSearch,
  FiPlus,
  FiMoreVertical,
  FiDollarSign,
  FiEdit,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiEye,
  FiX,
  FiRefreshCw,
  FiUser,
  FiHash,
  FiBriefcase,
  FiTarget,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiSettings,
  FiCalendar,
  FiPrinter,
} from 'react-icons/fi';
import useCurrency from '../hooks/useCurrency';
import { useAdvancesToolbar } from '../contexts/AdvancesToolbarContext';
import PagePanelToggle from '../components/PagePanelToggle';
import dayjs from 'dayjs';

/** تاريخ بداية السلفة = تاريخ المنح (نفس اليوم — يظهر في عمود ذلك اليوم بالجدول) */
const grantDateAsStartDate = (date) => {
  if (!date) return new Date().toISOString().split('T')[0];
  const d = dayjs(date);
  return d.isValid() ? d.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0];
};

const formatAdvanceGrantDate = (advance) => {
  if (!advance) return '—';
  const raw = advance.start_date || advance.created_at;
  if (!raw) return '—';
  const d = dayjs(String(raw).split(' ')[0]);
  return d.isValid() ? d.locale('ar').format('D MMMM YYYY') : '—';
};

const getCurrentWorkWeekStart = () => {
  const d = dayjs();
  const day = d.day();
  const saturdayOffset = (day + 1) % 7;
  return d.subtract(saturdayOffset, 'day').format('YYYY-MM-DD');
};

const normalizeToWorkWeekStart = (dateStr) => {
  if (!dateStr) return getCurrentWorkWeekStart();
  const d = dayjs(dateStr);
  if (!d.isValid()) return getCurrentWorkWeekStart();
  const saturdayOffset = (d.day() + 1) % 7;
  return d.subtract(saturdayOffset, 'day').format('YYYY-MM-DD');
};

const ADVANCE_SALARY_TYPE_LS = 'advanceSalaryTypeFilter';

const readAdvanceSalaryTypeFilter = () => {
  try {
    const saved = localStorage.getItem(ADVANCE_SALARY_TYPE_LS);
    return saved === 'Monthly' ? 'Monthly' : 'Weekly';
  } catch {
    return 'Weekly';
  }
};

const PremiumAdvances = () => {
  const { formatCurrency: fmtCurrency } = useCurrency();
  const toast = useToast();
  const { filtersCollapsed, toggleFiltersCollapsed } = useAdvancesToolbar();
  
  // States
  const [loading, setLoading] = useState(false);
  const [advances, setAdvances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [employeeLookupTerm, setEmployeeLookupTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [salaryTypeFilter, setSalaryTypeFilter] = useState(readAdvanceSalaryTypeFilter);
  // ملخص السلف الأسبوعي/الشهري
  const [weekStart, setWeekStart] = useState(() => getCurrentWorkWeekStart());
  const [month, setMonth] = useState(() => dayjs().format('YYYY-MM'));
  const [weeklySummary, setWeeklySummary] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [weeklyMeta, setWeeklyMeta] = useState({ day_dates: [] });
  const [monthlyMeta, setMonthlyMeta] = useState({ month_start: null, month_end: null });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [modalAdvances, setModalAdvances] = useState([]);
  const [modalAdvancesLoading, setModalAdvancesLoading] = useState(false);
  const [modalScopeAll, setModalScopeAll] = useState(false);
  const [modalPreviousBalance, setModalPreviousBalance] = useState(null);
  const [prevBalanceSaving, setPrevBalanceSaving] = useState(false);
  const [prevBalanceEditAmount, setPrevBalanceEditAmount] = useState('');
  // Modal states
  const { isOpen: isAddModalOpen, onOpen: onAddModalOpen, onClose: onAddModalClose } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const { isOpen: isDetailsModalOpen, onOpen: onDetailsModalOpen, onClose: onDetailsModalClose } = useDisclosure();
  const { isOpen: isEmployeeAdvancesOpen, onOpen: onEmployeeAdvancesOpen, onClose: onEmployeeAdvancesClose } = useDisclosure();
  const { isOpen: isPrevBalanceEditOpen, onOpen: onPrevBalanceEditOpen, onClose: onPrevBalanceEditClose } = useDisclosure();
  
  // Form states
  const [formData, setFormData] = useState({
    salary_type: 'Weekly',
    employee_id: '',
    advance_amount: '',
    duration: '',
    duration_type: 'weekly',
    notes: '',
    created_date: new Date().toISOString().split('T')[0], // Default to today
    start_date: '' // يُزامَن تلقائياً مع تاريخ المنح
  });
  const [selectedAdvance, setSelectedAdvance] = useState(null);

  // تنظيم أعمدة جدول السلف الأسبوعي (مثل صفحة الأقسام)
  const defaultAdvanceWeeklyColumns = [
    { id: 'index', label: 'البيان', visible: true },
    { id: 'employee_name', label: 'اسم العامل', visible: true },
    { id: 'location', label: 'الموقع', visible: true },
    { id: 'previous_balance', label: 'رصيد مديونية سابقة', visible: true },
    { id: 'day_sat', label: 'السبت', visible: true },
    { id: 'day_sun', label: 'الاحد', visible: true },
    { id: 'day_mon', label: 'الاثنين', visible: true },
    { id: 'day_tue', label: 'الثلاثاء', visible: true },
    { id: 'day_wed', label: 'الاربعاء', visible: true },
    { id: 'day_thu', label: 'الخميس', visible: true },
    { id: 'total_advances', label: 'اجمالي السلف', visible: true },
    { id: 'total_deducted', label: 'المستقطع من السلف (هذا الأسبوع)', visible: true },
    { id: 'remaining', label: 'باقي السلفه', visible: true },
  ];
  const [advanceWeeklyColumns, setAdvanceWeeklyColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('advanceWeeklyColumns');
      let cols = saved ? JSON.parse(saved) : defaultAdvanceWeeklyColumns;
      // ترحيل: توحيد التسميات مع نسخة طباعة التقرير
      const reportLabels = { total_deducted: 'المستقطع من السلف', day_sun: 'الاحد', day_wed: 'الاربعاء' };
      cols = cols.map(c => {
        if (c.id === 'total_deducted' && (c.label || '').includes('هذا الأسبوع')) return { ...c, label: reportLabels.total_deducted };
        if (reportLabels[c.id]) return { ...c, label: reportLabels[c.id] };
        return c;
      });
      return cols;
    } catch {
      return defaultAdvanceWeeklyColumns;
    }
  });
  useEffect(() => {
    localStorage.setItem('advanceWeeklyColumns', JSON.stringify(advanceWeeklyColumns));
  }, [advanceWeeklyColumns]);
  const toggleAdvanceWeeklyColumn = (id) => {
    setAdvanceWeeklyColumns(cols => cols.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };
  const moveAdvanceWeeklyColumn = (id, direction) => {
    setAdvanceWeeklyColumns(cols => {
      const idx = cols.findIndex(c => c.id === id);
      if (idx < 0) return cols;
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= cols.length) return cols;
      const newCols = [...cols];
      [newCols[idx], newCols[swapWith]] = [newCols[swapWith], newCols[idx]];
      return newCols;
    });
  };

  // تنظيم أعمدة جدول السلف الشهري
  const defaultAdvanceMonthlyColumns = [
    { id: 'index', label: 'البيان', visible: true },
    { id: 'employee_name', label: 'اسم العامل', visible: true },
    { id: 'location', label: 'الموقع', visible: true },
    { id: 'previous_balance', label: 'رصيد مديونية سابقة', visible: true },
    { id: 'month_total', label: 'إجمالي سلف الشهر', visible: true },
    { id: 'total_advances', label: 'اجمالي السلف', visible: true },
    { id: 'total_deducted', label: 'المستقطع من السلف (هذا الشهر)', visible: true },
    { id: 'remaining', label: 'باقي السلفه', visible: true },
  ];
  const [advanceMonthlyColumns, setAdvanceMonthlyColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('advanceMonthlyColumns');
      return saved ? JSON.parse(saved) : defaultAdvanceMonthlyColumns;
    } catch {
      return defaultAdvanceMonthlyColumns;
    }
  });
  useEffect(() => {
    localStorage.setItem('advanceMonthlyColumns', JSON.stringify(advanceMonthlyColumns));
  }, [advanceMonthlyColumns]);
  const toggleAdvanceMonthlyColumn = (id) => {
    setAdvanceMonthlyColumns(cols => cols.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };
  const moveAdvanceMonthlyColumn = (id, direction) => {
    setAdvanceMonthlyColumns(cols => {
      const idx = cols.findIndex(c => c.id === id);
      if (idx < 0) return cols;
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= cols.length) return cols;
      const newCols = [...cols];
      [newCols[idx], newCols[swapWith]] = [newCols[swapWith], newCols[idx]];
      return newCols;
    });
  };

  // Fetch advances
  const fetchAdvances = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (salaryTypeFilter) params.append('salary_type', salaryTypeFilter);
      
      const response = await fetch(getApiUrl(`/api/advances_api.php?action=get_advances&${params}`));
      const result = await response.json();
      
      if (result.success) {
        setAdvances(result.data || []);
      } else {
        toast({
          title: 'خطأ',
          description: result.message || 'فشل في جلب السلف',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في الاتصال بالخادم',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const response = await fetch(getApiUrl('/api/unified_employees_api.php?action=get_employees'));
      const result = await response.json();
      
      if (result.success) {
        setEmployees(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const syncGrantStartDates = async () => {
    try {
      await fetch(getApiUrl('/api/advances_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_grant_start_dates' }),
      });
    } catch {
      /* صامت — تصحيح السلف القديمة */
    }
  };

  // جلب ملخص السلف الأسبوعي (يدعم فلتر الحالة)
  const fetchWeeklySummary = async () => {
    setSummaryLoading(true);
    try {
      const params = new URLSearchParams({ action: 'get_advances_weekly_summary', week_start: weekStart });
      if (statusFilter) params.append('status', statusFilter);
      const res = await fetch(getApiUrl(`/api/advances_api.php?${params}`));
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('استجابة غير صالحة من الخادم');
      }
      if (data.success) {
        setWeeklySummary(data.data || []);
        setWeeklyMeta({ day_dates: data.day_dates || [], week_start: data.week_start, week_end: data.week_end });
      } else {
        setWeeklySummary([]);
        toast({ title: 'خطأ', description: data.message || 'فشل جلب الملخص الأسبوعي', status: 'error', duration: 3000, isClosable: true });
      }
    } catch (e) {
      setWeeklySummary([]);
      toast({ title: 'خطأ', description: e?.message || 'حدث خطأ في الاتصال', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setSummaryLoading(false);
    }
  };

  // جلب ملخص السلف الشهري (يدعم فلتر الحالة)
  const fetchMonthlySummary = async () => {
    setSummaryLoading(true);
    try {
      const params = new URLSearchParams({ action: 'get_advances_monthly_summary', month });
      if (statusFilter) params.append('status', statusFilter);
      const res = await fetch(getApiUrl(`/api/advances_api.php?${params}`));
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('استجابة غير صالحة من الخادم');
      }
      if (data.success) {
        setMonthlySummary(data.data || []);
        setMonthlyMeta({
          month_start: data.month_start || null,
          month_end: data.month_end || null,
        });
      } else {
        setMonthlySummary([]);
        toast({ title: 'خطأ', description: data.message || 'فشل جلب الملخص الشهري', status: 'error', duration: 3000, isClosable: true });
      }
    } catch (e) {
      setMonthlySummary([]);
      toast({ title: 'خطأ', description: e?.message || 'حدث خطأ في الاتصال', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(ADVANCE_SALARY_TYPE_LS, salaryTypeFilter);
    } catch {
      /* ignore */
    }
  }, [salaryTypeFilter]);

  const handleSalaryTypeChange = (value) => {
    setSalaryTypeFilter(value);
  };

  useEffect(() => {
    if (salaryTypeFilter !== 'Monthly') fetchWeeklySummary();
  }, [salaryTypeFilter, weekStart, statusFilter]);

  useEffect(() => {
    if (salaryTypeFilter === 'Monthly') fetchMonthlySummary();
  }, [salaryTypeFilter, month, statusFilter]);

  useEffect(() => {
    syncGrantStartDates().finally(() => {
      fetchAdvances();
      fetchEmployees();
      if (salaryTypeFilter !== 'Monthly') fetchWeeklySummary();
      else fetchMonthlySummary();
    });
  }, [statusFilter, salaryTypeFilter]);

  // Filter employees by salary type
  useEffect(() => {
    if (formData.salary_type) {
      const filtered = employees.filter(emp => emp.salary_type === formData.salary_type);
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [formData.salary_type, employees]);

  const getEmployeePreferredName = (emp) => {
    if (!emp) return '';
    return (emp.name_ar || '').trim() || (emp.name || '').trim() || (emp.name_en || '').trim() || '';
  };

  const getEmployeeFingerprintCode = (emp) => {
    if (!emp) return '';
    return String(
      emp.fingerprint_code ||
      emp.fingerprint_id ||
      emp.fingerprint_number ||
      emp.biometric_code ||
      emp.device_user_id ||
      ''
    ).trim();
  };

  const searchedEmployees = useMemo(() => {
    const term = employeeLookupTerm.trim().toLowerCase();
    const baseList = term ? filteredEmployees.filter((emp) => {
      const preferred = getEmployeePreferredName(emp).toLowerCase();
      const nameEn = String(emp.name_en || '').toLowerCase();
      const nameAr = String(emp.name_ar || '').toLowerCase();
      const nameDefault = String(emp.name || '').toLowerCase();
      const employeeCode = String(emp.employee_code || '').toLowerCase();
      const fingerprintCode = getEmployeeFingerprintCode(emp).toLowerCase();
      return (
        preferred.includes(term) ||
        nameEn.includes(term) ||
        nameAr.includes(term) ||
        nameDefault.includes(term) ||
        employeeCode.includes(term) ||
        fingerprintCode.includes(term)
      );
    }) : filteredEmployees;

    return [...baseList].sort((a, b) => {
      const aHasArabic = ((a.name_ar || '').trim().length > 0) ? 1 : 0;
      const bHasArabic = ((b.name_ar || '').trim().length > 0) ? 1 : 0;
      if (aHasArabic !== bHasArabic) return bHasArabic - aHasArabic;
      return getEmployeePreferredName(a).localeCompare(getEmployeePreferredName(b), 'ar');
    });
  }, [filteredEmployees, employeeLookupTerm]);

  const selectedEmployeeName = useMemo(() => {
    const selected = filteredEmployees.find((emp) => String(emp.id) === String(formData.employee_id));
    return getEmployeePreferredName(selected);
  }, [filteredEmployees, formData.employee_id]);

  // دالة مطابقة البحث: بالاسم (عربي أو إنجليزي) أو الكود
  const matchesSearch = (row) => {
    if (!searchTerm || !searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    const name = (row.employee_name || '').toLowerCase();
    const nameEn = (row.name || '').toLowerCase();
    const nameAr = (row.name_ar || '').toLowerCase();
    const code = String(row.employee_code || '').toLowerCase();
    return name.includes(term) || nameEn.includes(term) || nameAr.includes(term) || code.includes(term);
  };

  // فلترة جدول السلف الأسبوعي بالاسم (عربي/إنجليزي) أو الكود
  const filteredWeeklySummary = useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) return weeklySummary;
    return weeklySummary.filter(row => matchesSearch(row));
  }, [weeklySummary, searchTerm]);

  // فلترة جدول السلف الشهري بالاسم (عربي/إنجليزي) أو الكود
  const filteredMonthlySummary = useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) return monthlySummary;
    return monthlySummary.filter(row => matchesSearch(row));
  }, [monthlySummary, searchTerm]);

  const getDetailPeriodBounds = (ctx) => {
    if (!ctx) return null;
    if (ctx.period_start && ctx.period_end) {
      return {
        period_start: ctx.period_start,
        period_end: ctx.period_end,
        before_date: ctx.period_start,
      };
    }
    if (ctx.week_start && ctx.week_end) {
      return {
        period_start: ctx.week_start,
        period_end: ctx.week_end,
        before_date: ctx.week_start,
      };
    }
    if (ctx.month) {
      const period_start = ctx.month.length === 7 ? `${ctx.month}-01` : ctx.month;
      const period_end = dayjs(period_start).endOf('month').format('YYYY-MM-DD');
      return { period_start, period_end, before_date: period_start };
    }
    return null;
  };

  const fetchModalPreviousBalance = async (ctx) => {
    const bounds = getDetailPeriodBounds(ctx);
    if (!bounds || !ctx?.employee_id) {
      setModalPreviousBalance(null);
      return;
    }
    try {
      const params = new URLSearchParams({
        action: 'get_employee_previous_balance',
        employee_id: String(ctx.employee_id),
        period_start: bounds.period_start,
        period_end: bounds.period_end,
        before_date: bounds.before_date,
      });
      if (statusFilter) params.append('status', statusFilter);
      const res = await fetch(getApiUrl(`/api/advances_api.php?${params}`));
      const data = await res.json();
      if (data.success) {
        setModalPreviousBalance(data.data);
        setDetailEmployee((prev) => (prev && String(prev.employee_id) === String(ctx.employee_id)
          ? { ...prev, previous_balance: data.data.previous_balance }
          : prev));
      } else {
        setModalPreviousBalance({
          previous_balance: ctx.previous_balance ?? 0,
          calculated: ctx.previous_balance ?? 0,
          is_manual: false,
        });
      }
    } catch {
      setModalPreviousBalance({
        previous_balance: ctx.previous_balance ?? 0,
        calculated: ctx.previous_balance ?? 0,
        is_manual: false,
      });
    }
  };

  const fetchModalAdvancesForEmployee = async (ctx, showAll = false) => {
    setModalAdvancesLoading(true);
    fetchModalPreviousBalance(ctx);
    try {
      const params = new URLSearchParams({
        action: 'get_advances',
        employee_id: String(ctx.employee_id),
        salary_type: ctx.salary_type || salaryTypeFilter || 'Weekly',
      });
      if (statusFilter) params.append('status', statusFilter);
      if (!showAll) {
        if (ctx.week_start && ctx.week_end) {
          params.append('week_start', ctx.week_start);
          params.append('week_end', ctx.week_end);
        } else if (ctx.month) {
          params.append('month', ctx.month);
        }
      }
      const res = await fetch(getApiUrl(`/api/advances_api.php?${params}`));
      const data = await res.json();
      if (data.success) {
        setModalAdvances(data.data || []);
      } else {
        setModalAdvances([]);
        toast({
          title: 'خطأ',
          description: data.message || 'فشل جلب سلف الموظف',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch {
      setModalAdvances([]);
      toast({
        title: 'خطأ',
        description: 'تعذر الاتصال بالخادم',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setModalAdvancesLoading(false);
    }
  };

  const handleOpenEmployeeAdvancesList = (row) => {
    const isMonthly = salaryTypeFilter === 'Monthly';
    const period_start = isMonthly
      ? (monthlyMeta.month_start || `${month}-01`)
      : (row.week_start || weeklyMeta.week_start || weekStart);
    const period_end = isMonthly
      ? (monthlyMeta.month_end || dayjs(month).endOf('month').format('YYYY-MM-DD'))
      : (row.week_end || weeklyMeta.week_end);
    const ctx = {
      employee_id: row.employee_id,
      employee_name: row.employee_name,
      salary_type: isMonthly ? 'Monthly' : 'Weekly',
      week_start: !isMonthly ? period_start : null,
      week_end: !isMonthly ? period_end : null,
      month: isMonthly ? month : null,
      period_start,
      period_end,
      previous_balance: row.previous_balance ?? 0,
    };
    setDetailEmployee(ctx);
    setModalScopeAll(false);
    setModalAdvances([]);
    setModalPreviousBalance({
      previous_balance: row.previous_balance ?? 0,
      calculated: row.previous_balance ?? 0,
      is_manual: false,
    });
    onEmployeeAdvancesOpen();
    fetchModalAdvancesForEmployee(ctx, false);
  };

  const handleSavePreviousBalance = async (useCalculated = false) => {
    const bounds = getDetailPeriodBounds(detailEmployee);
    if (!detailEmployee?.employee_id || !bounds) return;
    setPrevBalanceSaving(true);
    try {
      const body = useCalculated
        ? {
            action: 'set_employee_previous_balance',
            employee_id: detailEmployee.employee_id,
            period_start: bounds.period_start,
            period_end: bounds.period_end,
            clear: true,
          }
        : {
            action: 'set_employee_previous_balance',
            employee_id: detailEmployee.employee_id,
            period_start: bounds.period_start,
            period_end: bounds.period_end,
            amount: parseFloat(prevBalanceEditAmount) || 0,
          };
      const res = await fetch(getApiUrl('/api/advances_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'نجح', description: data.message, status: 'success', duration: 3000, isClosable: true });
        onPrevBalanceEditClose();
        await fetchModalPreviousBalance(detailEmployee);
        if (salaryTypeFilter !== 'Monthly') fetchWeeklySummary();
        else fetchMonthlySummary();
      } else {
        toast({ title: 'خطأ', description: data.message, status: 'error', duration: 3000, isClosable: true });
      }
    } catch {
      toast({ title: 'خطأ', description: 'تعذر حفظ الرصيد', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setPrevBalanceSaving(false);
    }
  };

  const openPreviousBalanceEdit = () => {
    const val = modalPreviousBalance?.is_manual
      ? modalPreviousBalance.manual_override
      : modalPreviousBalance?.previous_balance;
    setPrevBalanceEditAmount(val != null ? String(val) : '');
    onPrevBalanceEditOpen();
  };

  const handleModalAdvancesScopeChange = (showAll) => {
    if (!detailEmployee) return;
    setModalScopeAll(showAll);
    fetchModalAdvancesForEmployee(detailEmployee, showAll);
  };

  // مجاميع وجدول السلف الأسبوعي (هيدر مثل الطباعة: قيم تحت اجمالي السلف/المستقطع/باقي، فوتر: صف مجمع ثم صف الاجمالي بقيمة باقي السلفه فقط)
  const weeklyTableSums = useMemo(() => {
    const reducers = { previous_balance: (s, r) => s + (r.previous_balance || 0), day_sat: (s, r) => s + (r.day_sat || 0), day_sun: (s, r) => s + (r.day_sun || 0), day_mon: (s, r) => s + (r.day_mon || 0), day_tue: (s, r) => s + (r.day_tue || 0), day_wed: (s, r) => s + (r.day_wed || 0), day_thu: (s, r) => s + (r.day_thu || 0), total_advances: (s, r) => s + (r.total_advances || 0), total_deducted: (s, r) => s + (r.total_deducted || 0), remaining: (s, r) => s + (r.remaining || 0) };
    return (key) => reducers[key] ? filteredWeeklySummary.reduce(reducers[key], 0) : 0;
  }, [filteredWeeklySummary]);
  const weeklyTableSumTd = (key) => fmtCurrency(weeklyTableSums(key));
  const advanceWeeklyVisible = useMemo(() => advanceWeeklyColumns.filter(c => c.visible), [advanceWeeklyColumns]);

  const monthlyTableSums = useMemo(() => {
    const reducers = { previous_balance: (s, r) => s + (r.previous_balance || 0), month_advances: (s, r) => s + (r.month_advances || 0), month_total: (s, r) => s + (r.month_advances || 0), total_advances: (s, r) => s + (r.total_advances || 0), total_deducted: (s, r) => s + (r.total_deducted || 0), remaining: (s, r) => s + (r.remaining || 0) };
    return (key) => reducers[key] ? filteredMonthlySummary.reduce(reducers[key], 0) : 0;
  }, [filteredMonthlySummary]);
  const monthlyTableSumTd = (key) => fmtCurrency(monthlyTableSums(key));
  const advanceMonthlyVisible = useMemo(() => advanceMonthlyColumns.filter(c => c.visible), [advanceMonthlyColumns]);

  // Handle create advance (الأسبوعي والشهري: نفس الحقول — موظف، مبلغ، تاريخ منح، ملاحظات)
  const handleCreateAdvance = async () => {
    const required = !formData.employee_id || !formData.advance_amount;
    if (required) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار الموظف وإدخال مبلغ السلفة وتاريخ المنح',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const createdDate = formData.created_date || new Date().toISOString().split('T')[0];
    const salaryType = formData.salary_type;
    const payload = {
      action: 'create_advance',
      ...formData,
      advance_amount: parseFloat(formData.advance_amount),
      created_date: createdDate,
      duration: 1,
      duration_type: salaryType === 'Weekly' ? 'weekly' : 'monthly',
      start_date: grantDateAsStartDate(createdDate),
      activate: true,
    };

    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/advances_api.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'نجح',
          description: result.message || 'تم تفعيل السلفة بنجاح',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onAddModalClose();
        resetForm();
        fetchAdvances();
        if (salaryTypeFilter !== 'Monthly') fetchWeeklySummary();
        if (salaryTypeFilter === 'Monthly') fetchMonthlySummary();
      } else {
        toast({
          title: 'خطأ',
          description: result.message || 'فشل في إنشاء السلفة',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في الاتصال بالخادم',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle activate advance
  const handleActivateAdvance = async (advanceId) => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/advances_api.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'activate_advance',
          advance_id: advanceId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'نجح',
          description: 'تم تفعيل السلفة بنجاح',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchAdvances();
        if (salaryTypeFilter !== 'Monthly') fetchWeeklySummary();
        if (salaryTypeFilter === 'Monthly') fetchMonthlySummary();
      } else {
        toast({
          title: 'خطأ',
          description: result.message || 'فشل في تفعيل السلفة',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في الاتصال بالخادم',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel advance
  const handleCancelAdvance = async (advanceId) => {
    const advance = advances.find(a => a.id === advanceId);
    const message = advance?.status === 'activated' 
      ? 'هل أنت متأكد من إلغاء هذه السلفة النشطة؟ سيتم حذف مبلغ السلفة من المستحقات والأقساط غير المدفوعة.'
      : 'هل أنت متأكد من إلغاء هذه السلفة؟';
    
    if (!window.confirm(message)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/advances_api.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancel_advance',
          advance_id: advanceId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'نجح',
          description: 'تم إلغاء السلفة بنجاح',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchAdvances();
        if (salaryTypeFilter !== 'Monthly') fetchWeeklySummary();
        if (salaryTypeFilter === 'Monthly') fetchMonthlySummary();
      } else {
        toast({
          title: 'خطأ',
          description: result.message || 'فشل في إلغاء السلفة',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في الاتصال بالخادم',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle delete advance
  const handleDeleteAdvance = async (advanceId) => {
    const message = 'هل أنت متأكد من حذف هذه السلفة الملغاة؟ سيتم حذف السلفة وجميع سجلات الأقساط المرتبطة بها نهائياً.';
    
    if (!window.confirm(message)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/advances_api.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete_advance',
          advance_id: advanceId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'نجح',
          description: 'تم حذف السلفة وجميع سجلات الأقساط بنجاح',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchAdvances();
        if (salaryTypeFilter !== 'Monthly') fetchWeeklySummary();
        if (salaryTypeFilter === 'Monthly') fetchMonthlySummary();
      } else {
        toast({
          title: 'خطأ',
          description: result.message || 'فشل في حذف السلفة',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في الاتصال بالخادم',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle edit advance
  const [editingAdvance, setEditingAdvance] = useState(null);
  const handleEditAdvance = (advance) => {
    setEditingAdvance(advance);
    const createdDate = advance.created_at ? advance.created_at.split(' ')[0] : new Date().toISOString().split('T')[0];
    const grantDate = grantDateAsStartDate(createdDate);
    setFormData({
      salary_type: advance.salary_type || 'Weekly',
      employee_id: String(advance.employee_id || ''),
      advance_amount: String(advance.advance_amount || ''),
      duration: String(advance.duration || 1),
      duration_type: advance.duration_type || (advance.salary_type === 'Weekly' ? 'weekly' : 'monthly'),
      notes: advance.notes || '',
      created_date: grantDate,
      start_date: grantDate,
    });
    onEditModalOpen();
  };

  const handleUpdateAdvance = async () => {
    const amount = parseFloat(formData.advance_amount);
    if (!amount || amount <= 0) {
      toast({ title: 'خطأ', description: 'مبلغ السلفة يجب أن يكون أكبر من صفر', status: 'error', duration: 3000, isClosable: true });
      return;
    }
    if (!editingAdvance) return;

    const grantDate = grantDateAsStartDate(formData.created_date);
    const payload = {
      action: 'update_advance',
      advance_id: editingAdvance.id,
      advance_amount: amount,
      notes: formData.notes || null,
      created_date: grantDate,
      start_date: grantDate,
    };

    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/advances_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (result.success) {
        toast({ title: 'نجح', description: 'تم تعديل السلفة بنجاح', status: 'success', duration: 3000, isClosable: true });
        onEditModalClose();
        setEditingAdvance(null);
        resetForm();
        fetchAdvances();
        if (salaryTypeFilter !== 'Monthly') fetchWeeklySummary();
        if (salaryTypeFilter === 'Monthly') fetchMonthlySummary();
      } else {
        toast({ title: 'خطأ', description: result.message || 'فشل في تعديل السلفة', status: 'error', duration: 3000, isClosable: true });
      }
    } catch (error) {
      toast({ title: 'خطأ', description: 'حدث خطأ في الاتصال بالخادم', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  };

  // Handle view details
  const handleViewDetails = async (advance) => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl(`/api/advances_api.php?action=get_advance_details&advance_id=${advance.id}`));
      const result = await response.json();

      if (result.success) {
        setSelectedAdvance(result.data);
        onDetailsModalOpen();
      } else {
        toast({
          title: 'خطأ',
          description: result.message || 'فشل في جلب تفاصيل السلفة',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في الاتصال بالخادم',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle defer installment
  const handleDeferInstallment = async (installment, shouldDefer) => {
    if (!selectedAdvance) return;
    
    try {
      const response = await fetch(getApiUrl('/api/unified_salary_api_v2.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'defer_advance_installment',
          employee_id: selectedAdvance.employee_id,
          period_start: installment.period_start,
          period_end: installment.period_end,
          defer: shouldDefer ? 1 : 0,
          salary_type: selectedAdvance.salary_type || 'Weekly'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: shouldDefer ? 'تم ترحيل قسط السلفة للفترة التالية' : 'تم إلغاء ترحيل قسط السلفة',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
        
        // إعادة تحميل تفاصيل السلفة لتحديث الأقساط
        const detailsResponse = await fetch(getApiUrl(`/api/advances_api.php?action=get_advance_details&advance_id=${selectedAdvance.id}`));
        const detailsResult = await detailsResponse.json();
        
        if (detailsResult.success) {
          setSelectedAdvance(detailsResult.data);
        }
      } else {
        throw new Error(data.message || 'حدث خطأ في ترحيل قسط السلفة');
      }
    } catch (error) {
      console.error('Error deferring installment:', error);
      toast({
        title: 'خطأ في ترحيل قسط السلفة',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  // Reset form
  const resetForm = () => {
    const defaultType = salaryTypeFilter === 'Monthly' || salaryTypeFilter === 'Weekly' ? salaryTypeFilter : 'Weekly';
    const today = new Date().toISOString().split('T')[0];
    const grantDate = grantDateAsStartDate(today);
    setFormData({
      salary_type: defaultType,
      employee_id: '',
      advance_amount: '',
      duration: '',
      duration_type: defaultType === 'Weekly' ? 'weekly' : 'monthly',
      notes: '',
      created_date: grantDate,
      start_date: grantDate,
    });
    setEmployeeLookupTerm('');
  };

  // عند فتح مودال "إضافة سلفة جديدة": مزامنة نوع الراتب مع التبويب الحالي (أسبوعي/شهري)
  const handleOpenAddModal = () => {
    const defaultType = salaryTypeFilter === 'Monthly' || salaryTypeFilter === 'Weekly' ? salaryTypeFilter : 'Weekly';
    const today = new Date().toISOString().split('T')[0];
    const grantDate = grantDateAsStartDate(today);
    setFormData(prev => ({
      ...prev,
      salary_type: defaultType,
      employee_id: '',
      duration_type: defaultType === 'Weekly' ? 'weekly' : 'monthly',
                    duration: '',
      created_date: grantDate,
      start_date: grantDate,
    }));
    setEmployeeLookupTerm('');
    onAddModalOpen();
  };

  const handleRefreshSummaries = () => {
    fetchAdvances();
    if (salaryTypeFilter === 'Monthly') {
      fetchMonthlySummary();
    } else {
      fetchWeeklySummary();
    }
  };

  const clearAdvancesFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
  };

  const handlePeriodInputChange = (value) => {
    if (salaryTypeFilter === 'Monthly') {
      setMonth(value);
      return;
    }
    setWeekStart(normalizeToWorkWeekStart(value));
  };

  const handleSetCurrentWeek = () => {
    setWeekStart(getCurrentWorkWeekStart());
  };

  const handleSetPreviousWeek = () => {
    const prevWeekStart = dayjs(weekStart).isValid()
      ? dayjs(weekStart).subtract(7, 'day').format('YYYY-MM-DD')
      : dayjs(getCurrentWorkWeekStart()).subtract(7, 'day').format('YYYY-MM-DD');
    setWeekStart(prevWeekStart);
  };

  const handleSetCurrentMonth = () => {
    setMonth(dayjs().format('YYYY-MM'));
  };

  const advanceColClass = (col) => getFinancialTableColumnClass({ id: col.id, label: col.label });

  const getEffectiveAdvanceStatus = (advance) => {
    if (!advance) return 'pending';
    const dbStatus = advance.status;
    if (dbStatus === 'cancelled' || dbStatus === 'pending') return dbStatus;
    const amount = parseFloat(advance.advance_amount) || 0;
    const remaining = parseFloat(advance.remaining_amount);
    const paid = parseFloat(advance.paid_amount) || 0;
    if (amount > 0) {
      const rem = Number.isFinite(remaining) ? remaining : amount - paid;
      if (rem <= 0.001 || paid + 0.001 >= amount) return 'completed';
    }
    return 'activated';
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { color: 'yellow', label: 'معلقة' },
      activated: { color: 'green', label: 'نشطة' },
      completed: { color: 'blue', label: 'مسددة' },
      cancelled: { color: 'red', label: 'ملغاة' },
    };
    const statusInfo = statusMap[status] || { color: 'gray', label: status };
    return (
      <Badge colorScheme={statusInfo.color} variant="solid">
        {statusInfo.label}
      </Badge>
    );
  };

  const getAdvanceStatusBadge = (advance) => getStatusBadge(getEffectiveAdvanceStatus(advance));

  const advancesPeriodLabel = useMemo(() => {
    if (salaryTypeFilter === 'Monthly') {
      if (monthlyMeta.month_start && monthlyMeta.month_end) {
        return `${dayjs(monthlyMeta.month_start).format('DD/MM/YYYY')} — ${dayjs(monthlyMeta.month_end).format('DD/MM/YYYY')}`;
      }
      return month ? dayjs(`${month}-01`).format('MMMM YYYY') : '';
    }
    if (weeklyMeta.week_start && weeklyMeta.week_end) {
      return `${dayjs(weeklyMeta.week_start).format('DD/MM/YYYY')} — ${dayjs(weeklyMeta.week_end).format('DD/MM/YYYY')}`;
    }
    return weekStart ? dayjs(weekStart).format('DD/MM/YYYY') : '';
  }, [salaryTypeFilter, month, monthlyMeta, weeklyMeta, weekStart]);

  const advancesHeaderStatChips = useMemo(() => {
    const chip = (key, value, label, variant = 'total') => ({ key, value, label, variant });
    const isMonthly = salaryTypeFilter === 'Monthly';
    const pool = isMonthly ? filteredMonthlySummary : filteredWeeklySummary;
    const basePool = isMonthly ? monthlySummary : weeklySummary;
    const hasSearch = Boolean(searchTerm.trim());

    const compactMoney = (n) => {
      const v = Math.round(parseFloat(n) || 0);
      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}م`;
      if (v >= 1_000) return `${(v / 1_000).toFixed(0)}ألف`;
      return String(v);
    };

    const sumAdvances = pool.reduce((s, r) => s + (parseFloat(r.total_advances) || 0), 0);
    const sumDeducted = pool.reduce((s, r) => s + (parseFloat(r.total_deducted) || 0), 0);
    const sumRemaining = pool.reduce((s, r) => s + (parseFloat(r.remaining) || 0), 0);

    const STATUS_LABELS = {
      pending: 'معلقة',
      activated: 'نشطة',
      completed: 'مسددة',
      cancelled: 'ملغاة',
    };

    const chips = [];

    if (statusFilter) {
      chips.push(chip('status', pool.length, STATUS_LABELS[statusFilter] || statusFilter, 'filtered'));
      chips.push(chip('scope', basePool.length, hasSearch ? 'ضمن البحث' : 'من الكل', 'total'));
    } else if (hasSearch) {
      chips.push(chip('matched', pool.length, `من ${basePool.length}`, 'total'));
    } else {
      chips.push(chip('employees', pool.length, isMonthly ? 'موظف شهري' : 'عامل أسبوعي', 'total'));
    }

    chips.push(chip('advances', compactMoney(sumAdvances), 'سلف', 'active'));
    chips.push(chip('deducted', compactMoney(sumDeducted), 'مستقطع', 'inactive'));
    chips.push(chip('remaining', compactMoney(sumRemaining), 'باقي', 'filtered'));

    return chips;
  }, [
    salaryTypeFilter,
    filteredWeeklySummary,
    filteredMonthlySummary,
    weeklySummary,
    monthlySummary,
    searchTerm,
    statusFilter,
  ]);

  const advancesHeaderSubtitle = useMemo(() => {
    const STATUS_LABELS = {
      pending: 'معلقة',
      activated: 'نشطة',
      completed: 'مسددة',
      cancelled: 'ملغاة',
    };
    if (statusFilter) {
      return `تصفية حسب الحالة: ${STATUS_LABELS[statusFilter] || statusFilter}`;
    }
    if (searchTerm.trim()) return `نتائج البحث عن «${searchTerm.trim()}»`;
    if (advancesPeriodLabel) {
      return salaryTypeFilter === 'Monthly'
        ? `فترة السلف الشهرية: ${advancesPeriodLabel}`
        : `فترة السلف الأسبوعية: ${advancesPeriodLabel}`;
    }
    return salaryTypeFilter === 'Monthly'
      ? 'متابعة وإدارة سلف الموظفين الشهريين'
      : 'متابعة وإدارة سلف العاملين الأسبوعيين';
  }, [statusFilter, searchTerm, advancesPeriodLabel, salaryTypeFilter]);

  return (
    <Box
      className="tp-table-page-layout tp-advances-page-layout"
      flex="1"
      minH="0"
      w="100%"
      maxW="100%"
      display="flex"
      flexDirection="column"
      alignItems="stretch"
      overflow="hidden"
    >
      {!filtersCollapsed && (
        <Box mb={{ base: 2, md: 3 }} className="weekly-salary-header-shell tp-advances-page-header" w="100%" maxW="100%" flexShrink={0}>
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
                    className="weekly-salary-header-icon-wrap tp-advances-header-icon-wrap"
                    aria-hidden
                  >
                    <Icon as={FiDollarSign} boxSize={{ base: 5, md: 6 }} />
                  </Flex>
                  <VStack align="flex-start" spacing={0.5} minW={0}>
                    <Heading className="stake-heading-3 weekly-salary-page-title tp-page-header-title" size="md" lineHeight="short" mb={0}>
                      إدارة السلف
                    </Heading>
                    <Text className="tp-page-header-subtitle" noOfLines={2}>
                      {advancesHeaderSubtitle}
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
                  {advancesHeaderStatChips.map((statChip) => (
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
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          borderRadius="md"
                          className="stake-input"
                          bg="var(--stake-bg-secondary)"
                          border="1px solid"
                          borderColor="var(--stake-border-primary)"
                          color="var(--stake-text-primary)"
                          pr="10"
                          fontSize="sm"
                          _focus={{ borderColor: 'var(--stake-border-accent)', boxShadow: '0 0 0 1px var(--stake-border-accent)', bg: 'var(--stake-bg-hover)' }}
                          _hover={{ borderColor: 'var(--stake-border-accent)', bg: 'var(--stake-bg-hover)' }}
                          _placeholder={{ color: 'var(--stake-text-secondary)', fontWeight: '500' }}
                        />
                        <InputRightElement>
                          <Icon as={FiSearch} color="var(--stake-text-secondary)" boxSize="4" />
                        </InputRightElement>
                      </InputGroup>
                    </Box>
                    <HStack spacing="2" align="center" h="32px" px="2" borderRadius="md" border="1px solid" borderColor="var(--stake-border-primary)" bg="var(--stake-bg-secondary)" flexShrink={1} minW={0}>
                      <RadioGroup value={salaryTypeFilter} onChange={handleSalaryTypeChange} display="flex">
                        <HStack spacing="3">
                          <Radio value="Weekly" colorScheme="blue" size="sm" sx={{ '& .chakra-radio__control': { borderWidth: '2px', borderColor: 'var(--stake-border-primary)' } }}><Text fontSize="sm" fontWeight="medium" color="var(--stake-text-primary)">أسبوعي</Text></Radio>
                          <Radio value="Monthly" colorScheme="blue" size="sm" sx={{ '& .chakra-radio__control': { borderWidth: '2px', borderColor: 'var(--stake-border-primary)' } }}><Text fontSize="sm" fontWeight="medium" color="var(--stake-text-primary)">شهري</Text></Radio>
                        </HStack>
                      </RadioGroup>
                    </HStack>
                    <Select
                      placeholder="جميع الحالات"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      size="sm"
                      flex="0 1 auto"
                      minW="72px"
                      w={{ base: '88px', md: '120px' }}
                      maxW="140px"
                      flexShrink={1}
                      borderRadius="md"
                      className="stake-input"
                      bg="var(--stake-bg-secondary)"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                      color="var(--stake-text-primary)"
                      fontSize="sm"
                      _focus={{ borderColor: 'var(--stake-border-accent)' }}
                      _hover={{ borderColor: 'var(--stake-border-accent)' }}
                    >
                      <option value="">الكل</option>
                      <option value="pending">معلقة</option>
                      <option value="activated">نشطة</option>
                      <option value="completed">مسددة</option>
                      <option value="cancelled">ملغاة</option>
                    </Select>
                    <IconButton
                      icon={<FiX />}
                      variant="ghost"
                      size="sm"
                      aria-label="مسح الفلاتر"
                      className="weekly-salary-clear-filters-btn"
                      onClick={clearAdvancesFilters}
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
                    <InputGroup w={{ base: '120px', sm: '140px' }} maxW="180px" flex="1 1 auto" flexShrink={1} minW={0} size="sm">
                      <InputLeftElement pointerEvents="none" h="32px">
                        <Icon as={FiCalendar} color="var(--stake-text-muted)" boxSize="4" />
                      </InputLeftElement>
                      <Input
                        type={salaryTypeFilter === 'Monthly' ? 'month' : 'date'}
                        value={salaryTypeFilter === 'Monthly' ? month : weekStart}
                        onChange={(e) => handlePeriodInputChange(e.target.value)}
                        placeholder="الفترة"
                        size="sm"
                        className="stake-input advances-period-input"
                        borderRadius="md"
                        height="32px"
                        pl="9"
                        bg="var(--stake-bg-secondary)"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                        color="var(--stake-text-primary)"
                        fontSize="sm"
                        _focus={{ borderColor: 'var(--stake-border-accent)', boxShadow: '0 0 0 1px var(--stake-border-accent)' }}
                        _hover={{ borderColor: 'var(--stake-border-accent)' }}
                        sx={{ '&::-webkit-calendar-picker-indicator': { opacity: 0, position: 'absolute', right: 0, width: '100%', height: '100%', cursor: 'pointer' } }}
                      />
                    </InputGroup>
                    {salaryTypeFilter === 'Weekly' ? (
                      <HStack spacing="2" flexWrap="nowrap" flexShrink={0} className="weekly-salary-week-btns">
                        <Button size="xs" className="stake-btn-secondary" onClick={handleSetCurrentWeek}>
                          الأسبوع الحالي
                        </Button>
                        <Button size="xs" className="stake-btn-secondary" onClick={handleSetPreviousWeek}>
                          الأسبوع السابق
                        </Button>
                      </HStack>
                    ) : (
                      <Button size="xs" className="stake-btn-secondary" onClick={handleSetCurrentMonth}>
                        هذا الشهر
                      </Button>
                    )}
                  </HStack>
                </Box>
              </Flex>
              {salaryTypeFilter === 'Weekly' && (
                <Text fontSize="xs" className="stake-text-secondary">
                  الفترة الأسبوعية المعتمدة: السبت إلى الخميس (يتم ضبط البداية تلقائياً على يوم السبت).
                </Text>
              )}
            </VStack>
          </Box>
        </Box>
      )}

      <Card
        className="stake-card weekly-salary-main-card advances-main-card"
        flex="1"
        minH="0"
        display="flex"
        flexDirection="column"
        overflow="hidden"
      >
        <Box p="0" flexShrink={0}>
          <HStack
            justify="space-between"
            align="center"
            mb="3"
            px={{ base: 4, md: 5 }}
            pt="3"
            pb="2"
            className="fp-list-toolbar weekly-salary-list-toolbar advances-list-toolbar"
            flexWrap={{ base: 'wrap', lg: 'nowrap' }}
            rowGap={2}
            columnGap={3}
          >
            <HStack spacing={3} align="center" flexWrap="wrap" flex="1" minW={0}>
              <HStack spacing={2} align="center" flexShrink={0} minW={0} className="tp-list-toolbar__title-group">
                <PagePanelToggle
                  collapsed={filtersCollapsed}
                  onToggle={toggleFiltersCollapsed}
                  variant="table"
                />
                <Heading size="md" className="stake-heading-3 weekly-salary-list-heading" flexShrink={0} minW={0}>
                  {salaryTypeFilter === 'Monthly'
                    ? `جدول السلف الشهري (موظفون شهريون) (${filteredMonthlySummary.length})`
                    : `جدول السلف الأسبوعي (عامل أسبوعي) (${filteredWeeklySummary.length})`}
                </Heading>
              </HStack>
              <HStack
                spacing={1}
                flexShrink={0}
                p="1"
                borderRadius="lg"
                border="1px solid"
                borderColor="var(--stake-border-primary)"
                bg="var(--stake-bg-secondary)"
                role="tablist"
                aria-label="نوع جدول السلف"
              >
                <Button
                  size="sm"
                  h="36px"
                  px={4}
                  borderRadius="md"
                  variant={salaryTypeFilter === 'Weekly' ? 'solid' : 'ghost'}
                  colorScheme={salaryTypeFilter === 'Weekly' ? 'blue' : 'gray'}
                  onClick={() => handleSalaryTypeChange('Weekly')}
                  aria-pressed={salaryTypeFilter === 'Weekly'}
                  fontWeight="600"
                >
                  أسبوعي
                </Button>
                <Button
                  size="sm"
                  h="36px"
                  px={4}
                  borderRadius="md"
                  variant={salaryTypeFilter === 'Monthly' ? 'solid' : 'ghost'}
                  colorScheme={salaryTypeFilter === 'Monthly' ? 'purple' : 'gray'}
                  onClick={() => handleSalaryTypeChange('Monthly')}
                  aria-pressed={salaryTypeFilter === 'Monthly'}
                  fontWeight="600"
                >
                  شهري
                </Button>
              </HStack>
            </HStack>
            <HStack spacing="3" align="center" flexWrap="wrap" justify="flex-end" flex={{ base: '1 1 100%', lg: '0 1 auto' }} minW={0}>
              {salaryTypeFilter !== 'Monthly' ? (
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
                      bg="var(--stake-content-surface-raised, var(--stake-bg-card))"
                      borderColor="var(--stake-border-primary)"
                    >
                      {advanceWeeklyColumns.map((col) => (
                        <Box key={col.id} px="3" py="2">
                          <HStack justify="space-between">
                            <HStack>
                              <Switch isChecked={col.visible} onChange={() => toggleAdvanceWeeklyColumn(col.id)} />
                              <Text fontSize="sm">{col.label}</Text>
                            </HStack>
                            <HStack spacing="1">
                              <IconButton aria-label="أعلى" icon={<FiChevronUp />} size="xs" variant="ghost" onClick={() => moveAdvanceWeeklyColumn(col.id, 'up')} />
                              <IconButton aria-label="أسفل" icon={<FiChevronDown />} size="xs" variant="ghost" onClick={() => moveAdvanceWeeklyColumn(col.id, 'down')} />
                            </HStack>
                          </HStack>
                        </Box>
                      ))}
                    </MenuList>
                  </Portal>
                </Menu>
              ) : (
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
                      bg="var(--stake-content-surface-raised, var(--stake-bg-card))"
                      borderColor="var(--stake-border-primary)"
                    >
                      {advanceMonthlyColumns.map((col) => (
                        <Box key={col.id} px="3" py="2">
                          <HStack justify="space-between">
                            <HStack>
                              <Switch isChecked={col.visible} onChange={() => toggleAdvanceMonthlyColumn(col.id)} />
                              <Text fontSize="sm">{col.label}</Text>
                            </HStack>
                            <HStack spacing="1">
                              <IconButton aria-label="أعلى" icon={<FiChevronUp />} size="xs" variant="ghost" onClick={() => moveAdvanceMonthlyColumn(col.id, 'up')} />
                              <IconButton aria-label="أسفل" icon={<FiChevronDown />} size="xs" variant="ghost" onClick={() => moveAdvanceMonthlyColumn(col.id, 'down')} />
                            </HStack>
                          </HStack>
                        </Box>
                      ))}
                    </MenuList>
                  </Portal>
                </Menu>
              )}
              {salaryTypeFilter !== 'Monthly' && weeklyMeta.week_start && (
                <Text fontSize="sm" className="stake-text-secondary" whiteSpace="nowrap" display={{ base: 'none', md: 'block' }}>
                  من {dayjs(weeklyMeta.week_start).format('DD-MMM')} إلى {weeklyMeta.week_end ? dayjs(weeklyMeta.week_end).format('DD-MMM') : ''}
                </Text>
              )}
              {salaryTypeFilter === 'Monthly' && (monthlyMeta.month_start && monthlyMeta.month_end ? (
                <Text fontSize="sm" className="stake-text-secondary" whiteSpace="nowrap" display={{ base: 'none', md: 'block' }}>
                  من {dayjs(monthlyMeta.month_start).format('DD-MMM')} إلى {dayjs(monthlyMeta.month_end).format('DD-MMM YYYY')}
                </Text>
              ) : month ? (
                <Text fontSize="sm" className="stake-text-secondary" display={{ base: 'none', md: 'block' }}>{dayjs(`${month}-01`).format('MMMM YYYY')}</Text>
              ) : null)}
              <Box position="relative" display="inline-block">
                <Tooltip
                  label="تحديث البيانات"
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
                      onClick={handleRefreshSummaries}
                      aria-label="تحديث البيانات"
                      h="44px"
                      minH="44px"
                      minW="44px"
                      px={3}
                      fontWeight="600"
                      borderRadius="lg"
                      borderColor="var(--stake-border-primary)"
                      _hover={{ bg: 'var(--stake-bg-hover)' }}
                      isLoading={loading || summaryLoading}
                    >
                      <Text as="span" display={{ base: 'none', lg: 'inline' }} ms={1}>
                        تحديث
                      </Text>
                    </Button>
                  </Box>
                </Tooltip>
              </Box>
              <Box position="relative" display="inline-block">
                <Tooltip
                  label="طباعة تقرير السلف (يفتح في تبويب جديد)"
                  bg="var(--stake-bg-secondary)"
                  color="var(--stake-text-primary)"
                  borderColor="var(--stake-border-primary)"
                  placement="top"
                  hasArrow
                  openDelay={400}
                >
                  <Box as="span" display="inline-block">
                    <Button
                      as="a"
                      href={getApiUrl(
                        '/api/advances_export_report.php?' +
                        new URLSearchParams({
                          ...(statusFilter && { status: statusFilter }),
                          ...(salaryTypeFilter && { salary_type: salaryTypeFilter }),
                          ...(salaryTypeFilter === 'Weekly' && weekStart && { week_start: weekStart }),
                          ...(salaryTypeFilter === 'Monthly' && month && { month }),
                        }).toString()
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      leftIcon={<FiPrinter />}
                      className="stake-btn-secondary"
                      size="md"
                      aria-label="طباعة تقرير السلف"
                      h="44px"
                      minH="44px"
                      minW="44px"
                      px={3}
                      fontWeight="600"
                      borderRadius="lg"
                      borderColor="var(--stake-border-primary)"
                      _hover={{ bg: 'var(--stake-bg-hover)' }}
                    >
                      <Text as="span" display={{ base: 'none', lg: 'inline' }} ms={1}>
                        طباعة تقرير
                      </Text>
                    </Button>
                  </Box>
                </Tooltip>
              </Box>
              <Box position="relative" display="inline-block">
                <Tooltip
                  label="إضافة سلفة جديدة"
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
                      onClick={handleOpenAddModal}
                      aria-label="إضافة سلفة جديدة"
                      h="44px"
                      minH="44px"
                      minW="44px"
                      px={3}
                      fontWeight="600"
                      borderRadius="lg"
                      borderColor="var(--stake-border-primary)"
                      _hover={{ bg: 'var(--stake-bg-hover)' }}
                    >
                      <Text as="span" display={{ base: 'none', lg: 'inline' }} ms={1}>
                        إضافة سلفة
                      </Text>
                    </Button>
                  </Box>
                </Tooltip>
              </Box>
            </HStack>
          </HStack>
        </Box>

        <CardBody
          p="0"
          flex="1"
          minH="0"
          display="flex"
          flexDirection="column"
          overflow="hidden"
        >
          {salaryTypeFilter !== 'Monthly' ? (
            <>
            {summaryLoading && weeklySummary.length === 0 ? (
              <Center py="10" px="4" flex="1" minH="0"><Spinner size="lg" color="green.500" /></Center>
            ) : weeklySummary.length === 0 ? (
              <Center py="10" px="4" flex="1" minH="0"><Text color="gray.500">لا يوجد موظفون أسبوعيون لديهم سلف في هذا الأسبوع</Text></Center>
            ) : filteredWeeklySummary.length === 0 ? (
              <Center py="10" px="4" flex="1" minH="0"><Text color="gray.500">لا توجد نتائج تطابق البحث بالاسم أو الكود</Text></Center>
            ) : (
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
                  layout="fixed"
                  className="stake-table main-content compact-data-table"
                  style={{ fontFamily: 'var(--table-font-family)' }}
                  sx={{
                    'th, td': {
                      fontFamily: 'var(--table-font-family)',
                      fontSize: 'var(--table-font-size)',
                      fontWeight: 'var(--table-font-weight)'
                    },
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
                      {advanceWeeklyVisible.map((col) => {
                        const dayIndex = ['day_sat', 'day_sun', 'day_mon', 'day_tue', 'day_wed', 'day_thu'].indexOf(col.id);
                        const isDayCol = dayIndex >= 0;
                        const isFirstFour = ['index', 'employee_name', 'location', 'previous_balance'].includes(col.id);
                        return (
                          <Th key={col.id} className={advanceColClass(col)} whiteSpace="nowrap" rowSpan={isFirstFour ? 2 : 1}>
                            {col.label}
                          </Th>
                        );
                      })}
                    </Tr>
                    <Tr>
                      {advanceWeeklyVisible.map((col) => {
                        const dayIndex = ['day_sat', 'day_sun', 'day_mon', 'day_tue', 'day_wed', 'day_thu'].indexOf(col.id);
                        if (dayIndex >= 0) {
                          const dateStr = weeklyMeta.day_dates && weeklyMeta.day_dates[dayIndex]
                            ? dayjs(weeklyMeta.day_dates[dayIndex]).format('D MMM')
                            : '—';
                          return (
                            <Th key={`${col.id}-date`} className={advanceColClass(col)} whiteSpace="nowrap" fontSize="xs" fontWeight="normal" color="gray.300">
                              {dateStr}
                            </Th>
                          );
                        }
                        if (col.id === 'total_advances') return <Th key={`${col.id}-sum`} className={getFinancialTableColumnClass({ id: 'total_advances' })} whiteSpace="nowrap" fontSize="xs" fontWeight="normal">{weeklyTableSumTd('total_advances')}</Th>;
                        if (col.id === 'total_deducted') return <Th key={`${col.id}-sum`} className={getFinancialTableColumnClass({ id: 'total_deducted' })} whiteSpace="nowrap" fontSize="xs" fontWeight="normal">{weeklyTableSumTd('total_deducted')}</Th>;
                        if (col.id === 'remaining') return <Th key={`${col.id}-sum`} className={getFinancialTableColumnClass({ id: 'remaining' })} whiteSpace="nowrap" fontSize="xs" fontWeight="normal">{weeklyTableSumTd('remaining')}</Th>;
                        return null;
                      })}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredWeeklySummary.map((row, idx) => (
                      <Tr
                        key={row.employee_id}
                        onDoubleClick={() => handleOpenEmployeeAdvancesList(row)}
                        cursor="pointer"
                        title="اضغط مرتين لعرض قائمة السلف (تفصيلي) لهذا العامل"
                        _hover={{ bg: 'var(--stake-bg-hover)' }}
                      >
                        {advanceWeeklyVisible.map((col) => {
                          if (col.id === 'index') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text" fontSize="sm">{idx + 1}</Text></Td>;
                          if (col.id === 'employee_name') return (
                            <Td key={col.id} className={advanceColClass(col)}>
                              <HStack spacing="2" justify="center" w="100%" flexWrap="wrap">
                                <Text className="fp-cell-text" fontSize="sm" fontWeight="medium" textAlign="center">
                                  {row.employee_name}
                                </Text>
                                {row.employee_status && row.employee_status !== 'active' && (
                                  <Badge colorScheme="red" variant="subtle" fontSize="2xs">غير نشط</Badge>
                                )}
                              </HStack>
                            </Td>
                          );
                          if (col.id === 'location') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text" fontSize="sm">{row.location}</Text></Td>;
                          if (col.id === 'previous_balance') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text fp-money" fontSize="sm">{fmtCurrency(row.previous_balance)}</Text></Td>;
                          if (col.id === 'day_sat') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text fp-money" fontSize="sm">{fmtCurrency(row.day_sat)}</Text></Td>;
                          if (col.id === 'day_sun') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text fp-money" fontSize="sm">{fmtCurrency(row.day_sun)}</Text></Td>;
                          if (col.id === 'day_mon') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text fp-money" fontSize="sm">{fmtCurrency(row.day_mon)}</Text></Td>;
                          if (col.id === 'day_tue') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text fp-money" fontSize="sm">{fmtCurrency(row.day_tue)}</Text></Td>;
                          if (col.id === 'day_wed') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text fp-money" fontSize="sm">{fmtCurrency(row.day_wed)}</Text></Td>;
                          if (col.id === 'day_thu') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text fp-money" fontSize="sm">{fmtCurrency(row.day_thu)}</Text></Td>;
                          if (col.id === 'total_advances') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text fp-money" fontSize="sm" fontWeight="bold">{fmtCurrency(row.total_advances)}</Text></Td>;
                          if (col.id === 'total_deducted') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text fp-money" fontSize="sm">{fmtCurrency(row.total_deducted)}</Text></Td>;
                          if (col.id === 'remaining') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text fp-money" fontSize="sm" fontWeight="bold">{fmtCurrency(row.remaining)}</Text></Td>;
                          return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text">-</Text></Td>;
                        })}
                      </Tr>
                    ))}
                    {filteredWeeklySummary.length > 0 && (
                      <>
                        <Tr bg="var(--stake-bg-secondary)" fontWeight="bold">
                          <Td colSpan={3}></Td>
                          {advanceWeeklyVisible.slice(3).map((col) => (
                            <Td key={col.id} className={advanceColClass(col)}>
                              <Text className="fp-cell-text fp-money" fontSize="sm">{weeklyTableSumTd(col.id)}</Text>
                            </Td>
                          ))}
                        </Tr>
                        <Tr bg="var(--stake-bg-secondary)" fontWeight="bold">
                          <Td colSpan={3}><Text className="fp-cell-text" fontSize="sm">الاجمالي</Text></Td>
                          {advanceWeeklyVisible.slice(3).map((col) => (
                            <Td key={col.id} className={advanceColClass(col)}>
                              <Text className="fp-cell-text fp-money" fontSize="sm">{col.id === 'remaining' ? weeklyTableSumTd('remaining') : ''}</Text>
                            </Td>
                          ))}
                        </Tr>
                      </>
                    )}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
            </>
          ) : (
            <>
            {summaryLoading && monthlySummary.length === 0 ? (
              <Center py="10" px="4" flex="1" minH="0"><Spinner size="lg" color="green.500" /></Center>
            ) : monthlySummary.length === 0 ? (
              <Center py="10" px="4" flex="1" minH="0"><Text color="gray.500">لا يوجد موظفون شهريون لديهم سلف في هذا الشهر</Text></Center>
            ) : filteredMonthlySummary.length === 0 ? (
              <Center py="10" px="4" flex="1" minH="0"><Text color="gray.500">لا توجد نتائج تطابق البحث بالاسم أو الكود</Text></Center>
            ) : (
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
                  layout="fixed"
                  className="stake-table main-content compact-data-table"
                  style={{ fontFamily: 'var(--table-font-family)' }}
                  sx={{
                    'th, td': {
                      fontFamily: 'var(--table-font-family)',
                      fontSize: 'var(--table-font-size)',
                      fontWeight: 'var(--table-font-weight)'
                    },
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
                      {advanceMonthlyVisible.map((col) => {
                        const isFirstFour = ['index', 'employee_name', 'location', 'previous_balance'].includes(col.id);
                        return (
                          <Th key={col.id} className={advanceColClass(col)} whiteSpace="nowrap" rowSpan={isFirstFour ? 2 : 1} title={col.id === 'total_deducted' ? 'المبلغ المستقطع في شهر الفترة المحددة فقط' : undefined}>
                            {col.label}
                          </Th>
                        );
                      })}
                    </Tr>
                    <Tr>
                      {advanceMonthlyVisible.map((col) => {
                        if (col.id === 'month_total') return <Th key={`${col.id}-sum`} className={getFinancialTableColumnClass({ id: 'month_total' })} whiteSpace="nowrap" fontSize="xs" fontWeight="normal" color="gray.300">{monthlyTableSumTd('month_advances')}</Th>;
                        if (col.id === 'total_advances') return <Th key={`${col.id}-sum`} className={getFinancialTableColumnClass({ id: 'total_advances' })} whiteSpace="nowrap" fontSize="xs" fontWeight="normal" color="gray.300">{monthlyTableSumTd('total_advances')}</Th>;
                        if (col.id === 'total_deducted') return <Th key={`${col.id}-sum`} className={getFinancialTableColumnClass({ id: 'total_deducted' })} whiteSpace="nowrap" fontSize="xs" fontWeight="normal" color="gray.300">{monthlyTableSumTd('total_deducted')}</Th>;
                        if (col.id === 'remaining') return <Th key={`${col.id}-sum`} className={getFinancialTableColumnClass({ id: 'remaining' })} whiteSpace="nowrap" fontSize="xs" fontWeight="normal" color="gray.300">{monthlyTableSumTd('remaining')}</Th>;
                        return null;
                      })}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredMonthlySummary.map((row, idx) => (
                      <Tr
                        key={row.employee_id}
                        onDoubleClick={() => handleOpenEmployeeAdvancesList(row)}
                        cursor="pointer"
                        title="اضغط مرتين لعرض قائمة السلف (تفصيلي) لهذا العامل"
                        _hover={{ bg: 'var(--stake-bg-hover)' }}
                      >
                        {advanceMonthlyVisible.map((col) => {
                          if (col.id === 'index') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text" fontSize="sm">{idx + 1}</Text></Td>;
                          if (col.id === 'employee_name') return (
                            <Td key={col.id} className={advanceColClass(col)}>
                              <HStack spacing="2" justify="center" w="100%" flexWrap="wrap">
                                <Text className="fp-cell-text" fontSize="sm" fontWeight="medium" textAlign="center">
                                  {row.employee_name}
                                </Text>
                                {row.employee_status && row.employee_status !== 'active' && (
                                  <Badge colorScheme="red" variant="subtle" fontSize="2xs">غير نشط</Badge>
                                )}
                              </HStack>
                            </Td>
                          );
                          if (col.id === 'location') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text" fontSize="sm">{row.location}</Text></Td>;
                          if (col.id === 'previous_balance') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text fp-money" fontSize="sm">{fmtCurrency(row.previous_balance)}</Text></Td>;
                          if (col.id === 'month_total') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text fp-money" fontSize="sm">{fmtCurrency(row.month_advances)}</Text></Td>;
                          if (col.id === 'total_advances') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text fp-money" fontSize="sm" fontWeight="bold">{fmtCurrency(row.total_advances)}</Text></Td>;
                          if (col.id === 'total_deducted') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text fp-money" fontSize="sm">{fmtCurrency(row.total_deducted)}</Text></Td>;
                          if (col.id === 'remaining') return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text fp-money" fontSize="sm" fontWeight="bold">{fmtCurrency(row.remaining)}</Text></Td>;
                          return <Td key={col.id} className={advanceColClass(col)}><Text className="fp-cell-text">-</Text></Td>;
                        })}
                      </Tr>
                    ))}
                    {filteredMonthlySummary.length > 0 && (
                      <>
                        <Tr bg="var(--stake-bg-secondary)" fontWeight="bold">
                          <Td colSpan={3}></Td>
                          {advanceMonthlyVisible.slice(3).map((col) => (
                            <Td key={col.id} className={advanceColClass(col)}>
                              <Text className="fp-cell-text fp-money" fontSize="sm">{monthlyTableSumTd(col.id === 'month_total' ? 'month_advances' : col.id)}</Text>
                            </Td>
                          ))}
                        </Tr>
                        <Tr bg="var(--stake-bg-secondary)" fontWeight="bold">
                          <Td colSpan={3}><Text className="fp-cell-text" fontSize="sm">الاجمالي</Text></Td>
                          {advanceMonthlyVisible.slice(3).map((col) => (
                            <Td key={col.id} className={advanceColClass(col)}>
                              <Text className="fp-cell-text fp-money" fontSize="sm">{col.id === 'remaining' ? monthlyTableSumTd('remaining') : ''}</Text>
                            </Td>
                          ))}
                        </Tr>
                      </>
                    )}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
            </>
          )}
        </CardBody>
      </Card>

      {/* Employee Advances List Modal (من جدول السلف الأسبوعي) */}
      <Modal isOpen={isEmployeeAdvancesOpen} onClose={onEmployeeAdvancesClose} size="4xl" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent
          dir="rtl"
          lang="ar"
          bg="var(--stake-bg-primary)"
          border="none"
          borderRadius="3xl"
          boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          overflow="hidden"
        >
          <ModalHeader
            bg="var(--stake-bg-primary, #0f212e)"
            color="white"
            borderRadius="24px 24px 0 0"
            p="4"
            position="relative"
            boxShadow="0 4px 20px rgba(0, 0, 0, 0.4)"
          >
            <HStack justify="space-between" align="flex-start" w="100%" spacing="4" pe="10">
              <VStack align="start" spacing="2" flex="1" minW={0}>
                <Text fontSize="md" fontWeight="bold">
                  قائمة السلف (تفصيلي) — {detailEmployee?.employee_name || ''}
                </Text>
                {detailEmployee && (
                  <Text fontSize="xs" color="gray.400">
                    {modalScopeAll
                      ? 'كل سلفات الموظف (كل الفترات) — المسدد/المتبقي تراكمي لكل سلفة'
                      : detailEmployee.week_start && detailEmployee.week_end
                      ? `سلف الفترة: ${dayjs(detailEmployee.week_start).format('DD/MM/YYYY')} — ${dayjs(detailEmployee.week_end).format('DD/MM/YYYY')}`
                      : detailEmployee.month
                      ? `سلف شهر: ${detailEmployee.month}`
                      : 'سلف الموظف'}
                    {' · '}دبل كليك لعرض التفاصيل
                  </Text>
                )}
                <HStack spacing="2" flexWrap="wrap">
                  <Button
                    size="xs"
                    variant={modalScopeAll ? 'outline' : 'solid'}
                    colorScheme="green"
                    onClick={() => handleModalAdvancesScopeChange(false)}
                    isDisabled={modalAdvancesLoading}
                  >
                    سلف الفترة
                  </Button>
                  <Button
                    size="xs"
                    variant={modalScopeAll ? 'solid' : 'outline'}
                    colorScheme="green"
                    onClick={() => handleModalAdvancesScopeChange(true)}
                    isDisabled={modalAdvancesLoading}
                  >
                    كل السلف
                  </Button>
                </HStack>
              </VStack>
              {detailEmployee && getDetailPeriodBounds(detailEmployee) && (
                <Box
                  flexShrink={0}
                  minW="200px"
                  p="3"
                  borderRadius="lg"
                  border="2px solid"
                  borderColor="red.400"
                  bg="rgba(229, 62, 62, 0.1)"
                  textAlign="right"
                >
                  <HStack justify="space-between" align="flex-start" spacing="2">
                    <VStack align="start" spacing="0" flex="1">
                      <Text fontSize="sm" color="red.300" fontWeight="bold">
                        سلف سابقة
                      </Text>
                      <Text fontSize="xl" fontWeight="bold" color="red.200" lineHeight="1.2">
                        {fmtCurrency(modalPreviousBalance?.previous_balance ?? detailEmployee.previous_balance ?? 0)}
                      </Text>
                      {modalPreviousBalance?.is_manual ? (
                        <Badge colorScheme="red" variant="solid" fontSize="2xs" mt="1">
                          تعديل يدوي
                        </Badge>
                      ) : (
                        <Text fontSize="2xs" color="gray.500" mt="1">
                          متبقي سلف قبل هذه الفترة (FIFO)
                        </Text>
                      )}
                      {!modalPreviousBalance?.is_manual &&
                        modalPreviousBalance?.calculated != null &&
                        Math.abs((modalPreviousBalance.calculated ?? 0) - (modalPreviousBalance.previous_balance ?? 0)) > 0.01 && (
                          <Text fontSize="2xs" color="gray.500">
                            محسوب: {fmtCurrency(modalPreviousBalance.calculated)}
                          </Text>
                        )}
                    </VStack>
                    <IconButton
                      aria-label="تعديل سلف سابقة"
                      icon={<FiEdit />}
                      size="sm"
                      variant="outline"
                      colorScheme="red"
                      onClick={openPreviousBalanceEdit}
                      isDisabled={modalAdvancesLoading}
                    />
                  </HStack>
                </Box>
              )}
              <ModalCloseButton
                flexShrink={0}
                color="white"
                bg="rgba(255, 255, 255, 0.1)"
                borderRadius="full"
                size="md"
                _hover={{
                  bg: 'rgba(255, 255, 255, 0.2)',
                  transform: 'scale(1.1)',
                }}
                _active={{
                  transform: 'scale(0.95)',
                }}
              />
            </HStack>
          </ModalHeader>
          <ModalBody p="6">
            {modalAdvancesLoading ? (
              <Center py="10">
                <Spinner size="lg" color="green.500" />
              </Center>
            ) : modalAdvances.length === 0 ? (
              <Center py="10">
                <Text color="gray.500">لا توجد سلف في الفترة المحددة لهذا العامل</Text>
              </Center>
            ) : (
              <TableContainer
                maxH="calc(100vh - 360px)"
                overflowY="auto"
                overflowX="auto"
                w="100%"
                maxW="100%"
                dir="rtl"
                sx={{
                  '&::-webkit-scrollbar': { width: '8px', height: '8px' },
                  '&::-webkit-scrollbar-track': { background: 'var(--stake-bg-secondary)' },
                  '&::-webkit-scrollbar-thumb': { background: 'var(--stake-border-primary)', borderRadius: '4px' }
                }}
              >
                <Table
                  variant="simple"
                  size="xs"
                  w="100%"
                  layout="fixed"
                  dir="rtl"
                  className="stake-table main-content compact-data-table advances-detail-modal-table"
                  style={{ fontFamily: 'var(--table-font-family)' }}
                  sx={{
                    'th, td': {
                      fontFamily: 'var(--table-font-family)',
                      fontSize: 'var(--table-font-size)',
                      fontWeight: 'var(--table-font-weight)'
                    },
                    maxWidth: '100%'
                  }}
                >
                  <colgroup>
                    <col style={{ width: '4.5rem' }} />
                    <col style={{ width: '5.5rem' }} />
                    <col />
                    <col />
                    <col />
                    <col style={{ width: '5.5rem' }} />
                    <col style={{ width: '6.5rem' }} />
                    <col style={{ width: '2.75rem' }} />
                  </colgroup>
                  <Thead
                    position="sticky"
                    top="0"
                    zIndex="10"
                    bg="linear-gradient(358deg, rgb(7 23 37) 0%, #000000 100%)"
                    sx={{
                      background: 'linear-gradient(358deg, rgb(7 23 37) 0%, #000000 100%) !important',
                      position: 'sticky !important',
                      top: '0 !important',
                      zIndex: '10 !important'
                    }}
                  >
                    <Tr>
                      <Th className={getFinancialTableColumnClass({ id: 'advance_id' })}>رقم السلفة</Th>
                      <Th className={getFinancialTableColumnClass({ id: 'salary_type' })}>نوع الراتب</Th>
                      <Th className={getFinancialTableColumnClass({ id: 'advance_amount', label: 'مبلغ السلفة' })}>مبلغ السلفة</Th>
                      <Th className={getFinancialTableColumnClass({ id: 'paid_amount', label: 'المسدد' })}>المسدد</Th>
                      <Th className={getFinancialTableColumnClass({ id: 'remaining_amount', label: 'المتبقي' })}>المتبقي</Th>
                      <Th className={getFinancialTableColumnClass({ id: 'status' })}>الحالة</Th>
                      <Th className={getFinancialTableColumnClass({ id: 'created_at' })}>تاريخ الإنشاء</Th>
                      <Th className={getFinancialTableColumnClass({ id: 'actions' })}>الإجراءات</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {modalAdvances.map((advance) => (
                      <Tr
                        key={advance.id}
                        onDoubleClick={() => handleViewDetails(advance)}
                        cursor="pointer"
                        title="اضغط مرتين لعرض تفاصيل السلفة"
                        _hover={{ bg: 'var(--stake-bg-hover)' }}
                      >
                        <Td className={getFinancialTableColumnClass({ id: 'advance_id' })} fontSize="sm">
                          <Text className="fp-cell-text">#{advance.id}</Text>
                        </Td>
                        <Td className={getFinancialTableColumnClass({ id: 'salary_type' })}>
                          <Badge colorScheme={advance.salary_type === 'Weekly' ? 'purple' : 'blue'} variant="subtle" px="2" py="1" borderRadius="md">
                            {advance.salary_type === 'Weekly' ? 'أسبوعي' : 'شهري'}
                          </Badge>
                        </Td>
                        <Td className={getFinancialTableColumnClass({ id: 'advance_amount', label: 'مبلغ السلفة' })}>
                          <Text className="fp-cell-text fp-money" fontWeight="bold">{fmtCurrency(advance.advance_amount)}</Text>
                        </Td>
                        <Td className={getFinancialTableColumnClass({ id: 'paid_amount', label: 'المسدد' })}>
                          <Text className="fp-cell-text fp-money" fontWeight="bold">{fmtCurrency(advance.paid_amount || 0)}</Text>
                        </Td>
                        <Td className={getFinancialTableColumnClass({ id: 'remaining_amount', label: 'المتبقي' })}>
                          <Text className="fp-cell-text fp-money" fontWeight="bold">{fmtCurrency(advance.remaining_amount || 0)}</Text>
                        </Td>
                        <Td className={getFinancialTableColumnClass({ id: 'status' })}>{getAdvanceStatusBadge(advance)}</Td>
                        <Td className={getFinancialTableColumnClass({ id: 'created_at' })}>
                          <Text className="fp-cell-text">{new Date(advance.created_at).toLocaleDateString('en-GB')}</Text>
                        </Td>
                        <Td className={getFinancialTableColumnClass({ id: 'actions' })}>
                          <Menu>
                            <MenuButton as={IconButton} icon={<FiMoreVertical />} variant="ghost" size="sm" />
                            <MenuList>
                              <MenuItem icon={<FiEye />} onClick={() => handleViewDetails(advance)}>عرض التفاصيل</MenuItem>
                              {(advance.status === 'pending' || advance.status === 'activated' || advance.status === 'completed') && (
                                <>
                                  <MenuItem icon={<FiEdit />} onClick={() => handleEditAdvance(advance)}>تعديل السلفة</MenuItem>
                                  <MenuDivider />
                                </>
                              )}
                              {advance.status === 'pending' && (
                                <>
                                  <MenuItem icon={<FiCheckCircle />} onClick={() => handleActivateAdvance(advance.id)}>تفعيل السلفة</MenuItem>
                                  <MenuDivider />
                                  <MenuItem icon={<FiX />} onClick={() => handleCancelAdvance(advance.id)}>إلغاء السلفة</MenuItem>
                                  <MenuItem icon={<FiTrash2 />} onClick={() => handleDeleteAdvance(advance.id)} color="red.500">حذف السلفة</MenuItem>
                                </>
                              )}
                              {advance.status === 'activated' && (
                                <>
                                  <MenuItem icon={<FiX />} onClick={() => handleCancelAdvance(advance.id)} color="red.300">إلغاء السلفة</MenuItem>
                                  <MenuItem icon={<FiTrash2 />} onClick={() => handleDeleteAdvance(advance.id)} color="red.500">حذف السلفة</MenuItem>
                                </>
                              )}
                              {advance.status === 'cancelled' && (
                                <MenuItem icon={<FiTrash2 />} onClick={() => handleDeleteAdvance(advance.id)} color="red.500">حذف السلفة</MenuItem>
                              )}
                            </MenuList>
                          </Menu>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Edit Advance Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => { onEditModalClose(); setEditingAdvance(null); resetForm(); }} size="xl" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden">
          <ModalHeader
            bg="var(--stake-bg-primary, #0f212e)"
            color="white"
            borderRadius="24px 24px 0 0"
            p="4"
            position="relative"
            boxShadow="0 4px 20px rgba(0, 0, 0, 0.4)"
          >
            <HStack justify="space-between" align="center" w="100%">
              <HStack spacing="3">
                <Icon as={FiEdit} boxSize="5" />
                <Text fontSize="md" fontWeight="bold">
                  تعديل السلفة #{editingAdvance?.id || ''}
                </Text>
              </HStack>
              <ModalCloseButton 
                color="white"
                bg="rgba(255, 255, 255, 0.1)"
                borderRadius="full"
                size="md"
                _hover={{ bg: "rgba(255, 255, 255, 0.2)", transform: "scale(1.1)" }}
                _active={{ transform: "scale(0.95)" }}
              />
            </HStack>
          </ModalHeader>
          <ModalBody p="6">
            <VStack spacing="3.5">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing="3" w="100%">
                <FormControl>
                  <FormLabel className="stake-label">نوع الراتب</FormLabel>
                  <RadioGroup value={formData.salary_type} isDisabled>
                    <Stack direction="row" spacing="4">
                      <Radio value="Weekly">أسبوعي</Radio>
                      <Radio value="Monthly">شهري</Radio>
                    </Stack>
                  </RadioGroup>
                </FormControl>
                <FormControl>
                  <FormLabel className="stake-label">الموظف</FormLabel>
                  <Input value={selectedEmployeeName} isDisabled className="stake-input" bg="var(--stake-bg-secondary, #111827)" color="white" opacity="0.7" />
                </FormControl>
              </SimpleGrid>
              <FormControl isRequired w="100%">
                <FormLabel className="stake-label">مبلغ السلفة</FormLabel>
                <Input
                  type="number"
                  value={formData.advance_amount}
                  onChange={(e) => setFormData({ ...formData, advance_amount: e.target.value })}
                  className="stake-input"
                  bg="var(--stake-bg-secondary, #111827)"
                  borderColor="var(--stake-border-primary, #2f4553)"
                  color="white"
                  _focus={{ borderColor: "#3b82f6", boxShadow: "0 0 0 1px #3b82f6" }}
                  _hover={{ borderColor: "#4a5568" }}
                />
              </FormControl>
              <FormControl isRequired w="100%">
                <FormLabel className="stake-label">تاريخ منح السلفة</FormLabel>
                <Input
                  type="date"
                  value={formData.created_date}
                  onChange={(e) => {
                    const grantDate = grantDateAsStartDate(e.target.value);
                    setFormData({ ...formData, created_date: grantDate, start_date: grantDate });
                  }}
                  className="stake-input"
                  bg="var(--stake-bg-secondary, #111827)"
                  borderColor="var(--stake-border-primary, #2f4553)"
                  color="white"
                  _focus={{ borderColor: "#3b82f6", boxShadow: "0 0 0 1px #3b82f6" }}
                  _hover={{ borderColor: "#4a5568" }}
                />
                <Text fontSize="xs" color="gray.400" mt={1}>
                  يظهر المبلغ في جدول السلف تحت عمود هذا اليوم
                </Text>
              </FormControl>
              <FormControl w="100%">
                <FormLabel className="stake-label">ملاحظات</FormLabel>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="stake-input"
                  bg="var(--stake-bg-secondary, #111827)"
                  borderColor="var(--stake-border-primary, #2f4553)"
                  color="white"
                  _focus={{ borderColor: "#3b82f6", boxShadow: "0 0 0 1px #3b82f6" }}
                  _hover={{ borderColor: "#4a5568" }}
                  rows={3}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap="3">
            <Button variant="ghost" onClick={() => { onEditModalClose(); setEditingAdvance(null); resetForm(); }}>إلغاء</Button>
            <Button className="stake-btn-primary" onClick={handleUpdateAdvance} isLoading={loading} leftIcon={<FiEdit />}>حفظ التعديلات</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Advance Modal */}
      <Modal isOpen={isAddModalOpen} onClose={onAddModalClose} size="xl" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden">
          <ModalHeader
            bg="var(--stake-bg-primary, #0f212e)"
            color="white"
            borderRadius="24px 24px 0 0"
            p="4"
            position="relative"
            boxShadow="0 4px 20px rgba(0, 0, 0, 0.4)"
          >
            <HStack justify="space-between" align="center" w="100%">
              <HStack spacing="3">
                <Icon as={FiPlus} boxSize="5" />
                <Text fontSize="md" fontWeight="bold">
                  إضافة سلفة جديدة
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
          <ModalBody p="6">
            <VStack spacing="3.5">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing="3" w="100%">
                <FormControl isRequired>
                  <FormLabel className="stake-label">نوع الراتب</FormLabel>
                  <RadioGroup
                    value={formData.salary_type}
                    onChange={(value) => {
                      const durationType = value === 'Weekly' ? 'weekly' : 'monthly';
                      const grantDate = grantDateAsStartDate(formData.created_date || new Date().toISOString().split('T')[0]);
                      setEmployeeLookupTerm('');
                      setFormData({ 
                        ...formData, 
                        salary_type: value, 
                        employee_id: '', 
                        duration_type: durationType,
                        start_date: grantDate,
                      });
                    }}
                  >
                    <Stack direction="row" spacing="4">
                      <Radio value="Weekly">أسبوعي</Radio>
                      <Radio value="Monthly">شهري</Radio>
                    </Stack>
                  </RadioGroup>
                </FormControl>

                {/* تاريخ منح السلفة — نفس الحقل للأسبوعي والشهري */}
                <FormControl isRequired>
                  <FormLabel className="stake-label">تاريخ منح السلفة</FormLabel>
                  <Input
                    type="date"
                    value={formData.created_date}
                    onChange={(e) => {
                      const grantDate = grantDateAsStartDate(e.target.value);
                      setFormData({ ...formData, created_date: grantDate, start_date: grantDate });
                    }}
                    className="stake-input"
                    bg="var(--stake-bg-secondary, #111827)"
                    borderColor="var(--stake-border-primary, #2f4553)"
                    color="white"
                    _focus={{ borderColor: "#3b82f6", boxShadow: "0 0 0 1px #3b82f6" }}
                    _hover={{ borderColor: "#4a5568" }}
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl isRequired w="100%">
                <FormLabel className="stake-label">اسم الموظف*</FormLabel>
                <Menu matchWidth>
                  <MenuButton
                    as={Button}
                    rightIcon={<FiChevronDown />}
                    w="100%"
                    textAlign="right"
                    justifyContent="space-between"
                    className="stake-input"
                    bg="var(--stake-bg-secondary, #111827)"
                    border="1px solid"
                    borderColor="var(--stake-border-primary, #2f4553)"
                    color="white"
                    fontWeight="normal"
                    _focus={{
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 1px #3b82f6"
                    }}
                    _hover={{
                      borderColor: "#4a5568"
                    }}
                    onClick={() => setEmployeeLookupTerm('')}
                  >
                    {selectedEmployeeName || 'اختر الموظف'}
                  </MenuButton>
                  <MenuList
                    bg="var(--stake-bg-secondary, #111827)"
                    borderColor="var(--stake-border-primary, #2f4553)"
                    p="0"
                    minW="100%"
                    maxH="280px"
                    overflow="hidden"
                  >
                    <Box p="2" borderBottom="1px solid" borderColor="var(--stake-border-primary, #2f4553)">
                      <Input
                        placeholder="ابحث بالعربي أو الإنجليزي أو كود الموظف أو البصمة"
                        value={employeeLookupTerm}
                        onChange={(e) => setEmployeeLookupTerm(e.target.value)}
                        className="stake-input"
                        size="sm"
                        bg="var(--stake-bg-primary, #0f172a)"
                        borderColor="var(--stake-border-primary, #2f4553)"
                        color="white"
                        _focus={{
                          borderColor: "#3b82f6",
                          boxShadow: "0 0 0 1px #3b82f6"
                        }}
                        _hover={{
                          borderColor: "#4a5568"
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </Box>
                    <Box maxH="220px" overflowY="auto">
                      {searchedEmployees.length > 0 ? (
                        searchedEmployees.map((emp) => (
                          <MenuItem
                            key={emp.id}
                            onClick={() => setFormData({ ...formData, employee_id: String(emp.id) })}
                            bg="transparent"
                            color="white"
                            _hover={{ bg: 'var(--stake-bg-hover, #1f2937)' }}
                            _focus={{ bg: 'var(--stake-bg-hover, #1f2937)' }}
                          >
                            {getEmployeePreferredName(emp) || 'بدون اسم'}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem isDisabled color="orange.300" bg="transparent">
                          لا توجد نتائج مطابقة
                        </MenuItem>
                      )}
                    </Box>
                  </MenuList>
                </Menu>
              </FormControl>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing="3" w="100%">
                {/* مبلغ السلفة — نفس الحقل للأسبوعي والشهري (بدون مدة/أقساط) */}
                <FormControl isRequired>
                  <FormLabel className="stake-label">مبلغ السلفة</FormLabel>
                  <NumberInput
                    value={formData.advance_amount}
                    onChange={(value) => setFormData({ ...formData, advance_amount: value })}
                    min={0}
                    precision={2}
                    className="stake-input"
                  >
                    <NumberInputField 
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
                    <NumberInputStepper>
                      <NumberIncrementStepper 
                        bg="#2f4553"
                        borderColor="var(--stake-border-primary, #4a5568)"
                        color="white"
                        _hover={{ bg: "#4a5568" }}
                        _active={{ bg: "#3b82f6" }}
                      />
                      <NumberDecrementStepper 
                        bg="#2f4553"
                        borderColor="var(--stake-border-primary, #4a5568)"
                        color="white"
                        _hover={{ bg: "#4a5568" }}
                        _active={{ bg: "#3b82f6" }}
                      />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel className="stake-label">ملاحظات</FormLabel>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="ملاحظات إضافية..."
                    rows={2}
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
              </SimpleGrid>
            </VStack>
          </ModalBody>
          <ModalFooter 
            display="flex" 
            justifyContent="flex-end" 
            gap="3"
            bg="var(--stake-bg-primary, #0f212e)"
            borderRadius="0 0 24px 24px"
            p="4"
            borderTop="1px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
          >
            <HStack spacing="3">
              <Button className="stake-btn-secondary" onClick={onAddModalClose}>
                إلغاء
              </Button>
              <Button
                className="stake-btn-success"
                onClick={handleCreateAdvance}
                isLoading={loading}
              >
                تفعيل السلفة
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* تعديل سلف سابقة يدوياً */}
      <Modal isOpen={isPrevBalanceEditOpen} onClose={onPrevBalanceEditClose} size="md" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" />
        <ModalContent dir="rtl" lang="ar" bg="var(--stake-bg-primary)" borderRadius="2xl">
          <ModalHeader color="white" textAlign="right">تعديل سلف سابقة — {detailEmployee?.employee_name}</ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody>
            <VStack align="stretch" spacing="4">
              <Alert status="info" borderRadius="md" bg="rgba(49, 130, 206, 0.15)">
                <AlertIcon />
                <Box>
                  <Text fontSize="sm">
                    الرصيد المحسوب من النظام:{' '}
                    <strong>{fmtCurrency(modalPreviousBalance?.calculated ?? 0)}</strong>
                  </Text>
                  <Text fontSize="xs" color="gray.400" mt="1">
                    يُطبَّق على أسبوع/شهر:{' '}
                    {detailEmployee?.period_start
                      ? `${dayjs(detailEmployee.period_start).format('DD/MM/YYYY')} — ${dayjs(detailEmployee.period_end).format('DD/MM/YYYY')}`
                      : '—'}
                  </Text>
                </Box>
              </Alert>
              <FormControl>
                <FormLabel className="stake-label">رصيد السلف السابقة (يدوي)</FormLabel>
                <NumberInput
                  min={0}
                  value={prevBalanceEditAmount}
                  onChange={(_, v) => setPrevBalanceEditAmount(Number.isNaN(v) ? '' : String(v))}
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap="2" flexWrap="wrap">
            <Button variant="ghost" onClick={onPrevBalanceEditClose}>
              إلغاء
            </Button>
            <Button
              variant="outline"
              colorScheme="gray"
              onClick={() => handleSavePreviousBalance(true)}
              isLoading={prevBalanceSaving}
            >
              استخدام المحسوب
            </Button>
            <Button
              className="stake-btn-success"
              onClick={() => handleSavePreviousBalance(false)}
              isLoading={prevBalanceSaving}
            >
              حفظ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Details Modal */}
      <Modal isOpen={isDetailsModalOpen} onClose={onDetailsModalClose} size="4xl" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden">
          <ModalHeader
            bg="var(--stake-bg-primary, #0f212e)"
            color="white"
            borderRadius="24px 24px 0 0"
            p="4"
            position="relative"
            boxShadow="0 4px 20px rgba(0, 0, 0, 0.4)"
          >
            <VStack spacing="4" align="center" w="100%" position="relative">
              <HStack spacing="3" align="center" justify="center" w="100%">
                <Text fontSize="lg" fontWeight="bold" color="white">
                  تفاصيل السلفة
                </Text>
              </HStack>
              {selectedAdvance && (
                <HStack spacing="6" align="center" justify="center">
                  <HStack spacing="2">
                    <Icon as={FiUser} color="blue.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">{selectedAdvance.employee_name}</Text>
                  </HStack>
                  <HStack spacing="2">
                    <Icon as={FiHash} color="green.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">{selectedAdvance.employee_code}</Text>
                  </HStack>
                  <HStack spacing="2">
                    <Icon as={FiDollarSign} color="orange.300" boxSize="4" />
                    <Badge 
                      colorScheme={selectedAdvance.salary_type === 'Weekly' ? 'purple' : 'blue'}
                      variant="solid"
                      px="2"
                      py="1"
                      borderRadius="full"
                      fontSize="xs"
                      fontWeight="bold"
                    >
                      {selectedAdvance.salary_type === 'Weekly' ? 'أسبوعي' : 'شهري'}
                    </Badge>
                  </HStack>
                </HStack>
              )}
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
            </VStack>
          </ModalHeader>
          <ModalBody p="8">
            {selectedAdvance && (
              <VStack spacing="6" align="stretch">
                {/* Basic Info */}
                <Box 
                  bg="var(--stake-bg-primary, #0f212e)"
                  border="1px solid" 
                  borderColor="var(--stake-border-primary, #3e5665)" 
                  borderRadius="xl" 
                  p="6"
                >
                  <SimpleGrid columns={2} spacing="4">
                    <HStack justify="space-between">
                      <Text fontWeight="bold" className="stake-text-secondary">اسم الموظف:</Text>
                      <Text color="white">{selectedAdvance.employee_name}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="bold" className="stake-text-secondary">نوع الراتب:</Text>
                      <Badge colorScheme={selectedAdvance.salary_type === 'Weekly' ? 'purple' : 'blue'} variant="solid">
                        {selectedAdvance.salary_type === 'Weekly' ? 'أسبوعي' : 'شهري'}
                      </Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="bold" className="stake-text-secondary">مبلغ السلفة:</Text>
                      <Text fontWeight="bold" color="green.300">
                        {fmtCurrency(selectedAdvance.advance_amount)}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="bold" className="stake-text-secondary">رقم السلفة:</Text>
                      <Text color="white">#{selectedAdvance.id}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="bold" className="stake-text-secondary">تاريخ المنح:</Text>
                      <Text color="white">{formatAdvanceGrantDate(selectedAdvance)}</Text>
                    </HStack>
                    {selectedAdvance.salary_type === 'Monthly' && Number(selectedAdvance.duration) > 1 && (
                      <>
                        <HStack justify="space-between">
                          <Text fontWeight="bold" className="stake-text-secondary">المدة:</Text>
                          <Text color="white">
                            {selectedAdvance.duration} {selectedAdvance.duration_type === 'weekly' ? 'أسبوع' : 'شهر'}
                          </Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontWeight="bold" className="stake-text-secondary">قسط السلفة:</Text>
                          <Text fontWeight="bold" color="white">{fmtCurrency(selectedAdvance.installment_amount)}</Text>
                        </HStack>
                      </>
                    )}
                    <HStack justify="space-between">
                      <Text fontWeight="bold" className="stake-text-secondary">الحالة:</Text>
                      {getAdvanceStatusBadge(selectedAdvance)}
                    </HStack>
                  </SimpleGrid>
                </Box>

                {/* سجل سداد السلفة من الراتب (مستقطع أسبوعي/شهري فعلي) */}
                {selectedAdvance.payments_history && selectedAdvance.payments_history.length > 0 && (
                  <Box>
                    <Text fontWeight="bold" mb="3" color="white" fontSize="lg">
                      حركة سداد السلفة من الراتب
                    </Text>
                    <TableContainer>
                      <Table size="sm" variant="simple" bg="var(--stake-bg-secondary, #111827)" borderRadius="lg" overflow="hidden">
                        <Thead bg="var(--stake-bg-primary, #0f212e)">
                          <Tr>
                            <Th color="white">تاريخ السداد</Th>
                            <Th color="white">
                              {selectedAdvance.salary_type === 'Monthly' ? 'فترة الراتب' : 'أسبوع الراتب'}
                            </Th>
                            <Th color="white">المبلغ المستقطع</Th>
                            <Th color="white">المتبقي بعد السداد</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {selectedAdvance.payments_history.map((p, idx) => (
                            <Tr key={`${p.period_start}-${p.period_end}-${idx}`} _hover={{ bg: "#2f4553" }} transition="all 0.2s">
                              <Td color="white" fontWeight="medium">
                                {p.paid_at
                                  ? new Date(p.paid_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' })
                                  : '—'}
                              </Td>
                              <Td color="gray.300" fontSize="sm">
                                {new Date(p.period_start).toLocaleDateString('ar-EG')}{' '}
                                —{' '}
                                {new Date(p.period_end).toLocaleDateString('ar-EG')}
                              </Td>
                              <Td color="green.300" fontWeight="bold">
                                {fmtCurrency(p.paid_amount)}
                              </Td>
                              <Td color={p.remaining_after > 0 ? "yellow.200" : "green.300"} fontWeight="bold">
                                {fmtCurrency(p.remaining_after)} {p.remaining_after > 0 ? '(متبقي)' : '(تم السداد بالكامل)'}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter 
            display="flex" 
            justifyContent="flex-end" 
            gap="3"
            bg="var(--stake-bg-primary, #0f212e)"
            borderRadius="0 0 24px 24px"
            p="4"
            borderTop="1px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
          >
            <Button className="stake-btn-secondary" onClick={onDetailsModalClose}>
              إغلاق
            </Button>
            {selectedAdvance && (selectedAdvance.status === 'pending' || selectedAdvance.status === 'activated') && (
              <Button
                className="stake-btn-secondary"
                colorScheme="red"
                onClick={() => {
                  onDetailsModalClose();
                  handleCancelAdvance(selectedAdvance.id);
                }}
                isLoading={loading}
              >
                إلغاء السلفة
              </Button>
            )}
            {selectedAdvance && selectedAdvance.status === 'cancelled' && (
              <Button
                className="stake-btn-secondary"
                colorScheme="red"
                onClick={() => {
                  onDetailsModalClose();
                  handleDeleteAdvance(selectedAdvance.id);
                }}
                isLoading={loading}
              >
                حذف السلفة
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default PremiumAdvances;


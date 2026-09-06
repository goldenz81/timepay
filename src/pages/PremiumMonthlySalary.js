import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { debugLog, debugWarn, debugError } from '../utils/debugLog';
import { getFinancialTableColumnClass } from '../utils/financialColumnClasses';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Card,
  CardBody,
  CardHeader,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  Icon,
  useColorModeValue,
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
  Circle,
  Image,
  Stack,
  SimpleGrid,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Menu,
  MenuButton,
  MenuList,
  MenuDivider,
  IconButton,
  Tooltip,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Checkbox,
  CheckboxGroup,
  Spinner,
  Center,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  Portal,
} from '@chakra-ui/react';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import {
  FiSearch,
  FiFilter,
  FiDownload,
  FiRefreshCw,
  FiEdit,
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiPlus,
  FiCalendar,
  FiDollarSign,
  FiUsers,
  FiTrendingUp,
  FiTrendingDown,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiInfo,
  FiSettings,
  FiSave,
  FiX,
  FiUser,
  FiHash,
  FiBriefcase,
  FiPrinter,
  FiChevronUp,
  FiChevronDown,
  FiDroplet,
  FiLink,
  FiKey,
  FiTarget
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import EnglishKeyTooltip from '../components/EnglishKeyTooltip';
import ChakraEnglishKeyTooltip from '../components/ChakraEnglishKeyTooltip';
import { useSettings } from '../contexts/SettingsContext';
import { useSalaryToolbar } from '../contexts/SalaryToolbarContext';
import PagePanelToggle from '../components/PagePanelToggle';
import useCurrency from '../hooks/useCurrency';
import { getApiUrl } from '../utils/apiUrlHelper';

function formatOvertimeHoursPairLabel(regularOvertime, holidayOvertime, totalOverride) {
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

// دالة لتصحيح المصطلحات العربية
const getArabicPlural = (count, singular, plural) => {
  if (count === 1) {
    return `${count} ${singular}`;
  } else if (count === 2) {
    return `${count} ${singular}`;
  } else if (count >= 3 && count <= 10) {
    return `${count} ${plural}`;
  } else {
    return `${count} ${singular}`;
  }
};

const PremiumMonthlySalary = () => {
  // Settings
  const { settings } = useSettings();
  const { monthlySalaryHeaderCollapsed, toggleMonthlySalaryHeaderCollapsed } = useSalaryToolbar();

  // States
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [salaryTypeFilter, setSalaryTypeFilter] = useState('Monthly');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  const [activeTable, setActiveTable] = useState('monthly_salary_entitlements');
  const [selectedDateRange, setSelectedDateRange] = useState([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ]);
  const [rangePickerValue, setRangePickerValue] = useState([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ]);
  const [isAutomaticMode, setIsAutomaticMode] = useState(true); // تلقائي = شهر كامل، يدوي = نطاق حر
  const [formatCurrency, setFormatCurrency] = useState(true);
  const [editingBonusRowId, setEditingBonusRowId] = useState(null);
  const [savingRowId, setSavingRowId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isDeductionColumnManagerOpen, setIsDeductionColumnManagerOpen] = useState(false);
  
  // متغيرات النظام الديناميكي
  const [dynamicColumns, setDynamicColumns] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [visibleDeductionColumns, setVisibleDeductionColumns] = useState([]);
  const [customColumns, setCustomColumns] = useState([]);
  const [entitlementsColumns, setEntitlementsColumns] = useState([]);
  const [deductionsColumns, setDeductionsColumns] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [saveTimeout, setSaveTimeout] = useState(null);
  const [isBadgeColorModalOpen, setIsBadgeColorModalOpen] = useState(false);
  const [editingBadgeColumn, setEditingBadgeColumn] = useState(null);
  const [isImportColumnModalOpen, setIsImportColumnModalOpen] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [importableColumns, setImportableColumns] = useState([]);
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { formatCurrency: fmtCurrency } = useCurrency();
  const monthlyDateToolbarRef = useRef(null);

  const { isOpen: isEmployeeDetailsOpen, onOpen: onEmployeeDetailsOpen, onClose: onEmployeeDetailsClose } = useDisclosure();
  const [employeeDetailsData, setEmployeeDetailsData] = useState(null);

  const handleOpenEmployeeDetailsFromSalary = useCallback(async () => {
    const employeeId = selectedEmployee?.employee_id ?? selectedEmployee?.id;
    if (!employeeId) return;
    try {
      const res = await fetch(getApiUrl(`/api/unified_employees_api.php?action=get_employee&employee_id=${employeeId}`));
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
  }, [onEmployeeDetailsClose, toast]);

  // تنظيم أعمدة جدول الراتب الشهري (مثل صفحة الأقسام)
  const MONTHLY_TABLE_COLUMNS_STORAGE_KEY = 'monthlyTableColumns';
  const MONTHLY_SALARY_LIST_COLUMNS_SETTING_KEY = 'monthly_salary_list_columns_json';

  const defaultMonthlyTableColumns = [
    { id: 'name', label: 'الاسم', visible: true },
    { id: 'employee_code', label: 'كود الموظف', visible: true },
    { id: 'department', label: 'القسم', visible: true },
    { id: 'basic_monthly_salary', label: 'الاساسي', visible: true },
    { id: 'total_entitlements', label: 'إجمالي المستحقات', visible: true },
    { id: 'total_deductions', label: 'إجمالي المستقطع', visible: true },
    { id: 'net_monthly_amount', label: 'صافي المرتب', visible: true },
  ];

  const mergeMonthlyTableColumnsFromSaved = (savedList) => {
    if (!Array.isArray(savedList) || savedList.length === 0) return defaultMonthlyTableColumns;
    const allowed = new Set(
      defaultMonthlyTableColumns
        .map((c) => c.id)
        .filter((id) => id !== 'actions' && id !== 'salary_type')
    );
    const defaultById = Object.fromEntries(defaultMonthlyTableColumns.map((c) => [c.id, c]));
    const seen = new Set();
    const out = [];
    for (const s of savedList) {
      if (!s || typeof s.id !== 'string') continue;
      if (s.id === 'actions' || s.id === 'salary_type') continue;
      if (!allowed.has(s.id) || seen.has(s.id)) continue;
      seen.add(s.id);
      const d = defaultById[s.id];
      out.push({
        id: d.id,
        label: d.label,
        visible: typeof s.visible === 'boolean' ? s.visible : d.visible,
      });
    }
    for (const d of defaultMonthlyTableColumns) {
      if (!seen.has(d.id)) out.push({ ...d });
    }
    return out;
  };

  const [monthlyTableColumns, setMonthlyTableColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(MONTHLY_TABLE_COLUMNS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return mergeMonthlyTableColumnsFromSaved(parsed);
      }
      return defaultMonthlyTableColumns;
    } catch {
      return defaultMonthlyTableColumns;
    }
  });

  const [monthlyTableColumnsServerHydrated, setMonthlyTableColumnsServerHydrated] = useState(false);
  const monthlyTableColumnsPersistTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          getApiUrl(`/api/comprehensive_settings_api.php?action=get_settings_by_category&category=salary`)
        );
        const data = await res.json();
        if (cancelled || !data.success || !Array.isArray(data.settings)) return;
        const row = data.settings.find((s) => s.setting_key === MONTHLY_SALARY_LIST_COLUMNS_SETTING_KEY);
        const rawVal = row?.setting_value;
        if (rawVal && String(rawVal).trim()) {
          const parsed = JSON.parse(rawVal);
          const merged = mergeMonthlyTableColumnsFromSaved(parsed);
          setMonthlyTableColumns(merged);
          try {
            localStorage.setItem(MONTHLY_TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(merged));
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        debugError(e);
      } finally {
        if (!cancelled) setMonthlyTableColumnsServerHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(MONTHLY_TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(monthlyTableColumns));
    } catch {
      /* ignore */
    }
    if (!monthlyTableColumnsServerHydrated) return;
    if (monthlyTableColumnsPersistTimerRef.current) {
      clearTimeout(monthlyTableColumnsPersistTimerRef.current);
    }
    monthlyTableColumnsPersistTimerRef.current = setTimeout(async () => {
      monthlyTableColumnsPersistTimerRef.current = null;
      try {
        await fetch(getApiUrl('/api/comprehensive_settings_api.php'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_multiple_settings',
            category: 'salary',
            settings: [
              {
                key: MONTHLY_SALARY_LIST_COLUMNS_SETTING_KEY,
                value: JSON.stringify(monthlyTableColumns),
                category: 'salary',
              },
            ],
          }),
        });
      } catch (e) {
        debugError(e);
      }
    }, 800);
    return () => {
      if (monthlyTableColumnsPersistTimerRef.current) {
        clearTimeout(monthlyTableColumnsPersistTimerRef.current);
        monthlyTableColumnsPersistTimerRef.current = null;
      }
    };
  }, [monthlyTableColumns, monthlyTableColumnsServerHydrated]);
  const toggleMonthlyColumn = (id) => {
    setMonthlyTableColumns(cols => cols.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };
  const moveMonthlyColumn = (id, direction) => {
    setMonthlyTableColumns(cols => {
      const idx = cols.findIndex(c => c.id === id);
      if (idx < 0) return cols;
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= cols.length) return cols;
      const newCols = [...cols];
      [newCols[idx], newCols[swapWith]] = [newCols[swapWith], newCols[idx]];
      return newCols;
    });
  };

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle ESC key to close modals
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (isDetailsModalOpen) setIsDetailsModalOpen(false);
        if (isEditModalOpen) setIsEditModalOpen(false);
        if (isOvertimeModalOpen) setIsOvertimeModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDetailsModalOpen, isEditModalOpen, isOvertimeModalOpen]);

  // Get current month range
  const getCurrentMonthRange = () => {
    const startOfMonth = dayjs().startOf('month');
    const endOfMonth = dayjs().endOf('month');
    return [startOfMonth, endOfMonth];
  };

  // نطاق الشهر لتاريخ معيّن (للوضع التلقائي)
  const getMonthRangeForDate = (date) => {
    if (!date) return null;
    const d = dayjs(date);
    return [d.startOf('month'), d.endOf('month')];
  };

  // Initialize date range
  useEffect(() => {
    if (isAutomaticMode) {
      const [start, end] = getCurrentMonthRange();
      setSelectedDateRange([start, end]);
      setRangePickerValue([start, end]);
    } else {
      const [start, end] = getCurrentMonthRange();
      setSelectedDateRange([start, end]);
      setRangePickerValue([start, end]);
    }
  }, [isAutomaticMode]);

  // Handle range picker change
  const handleRangePickerChange = (dates) => {
    if (isAutomaticMode) {
      if (dates && dates[0]) {
        const monthRange = getMonthRangeForDate(dates[0]);
        if (monthRange) {
          setRangePickerValue(monthRange);
          setSelectedDateRange(monthRange);
        }
      } else {
        const [start, end] = getCurrentMonthRange();
        setRangePickerValue([start, end]);
        setSelectedDateRange([start, end]);
      }
    } else {
      if (dates && dates[0] && dates[1]) {
        setRangePickerValue(dates);
        setSelectedDateRange(dates);
      } else {
        const [start, end] = getCurrentMonthRange();
        setRangePickerValue([start, end]);
        setSelectedDateRange([start, end]);
      }
    }
  };

  // Format date range for display
  const formatDateRange = (dates) => {
    if (!dates || !dates[0] || !dates[1]) return 'اختر الفترة';
    return `${dates[0].format('DD/MM/YYYY')} - ${dates[1].format('DD/MM/YYYY')}`;
  };

  // دالة لاستخراج مفتاح البيانات الصحيح حتى لو كانت column_key/column_name غير متوفرة
  const resolveDataKey = useCallback((column, employeeData = null) => {
    if (!column) return '';
    
    // أولاً: استخدام column_key مباشرة إذا كان موجوداً (هذا هو الأهم!)
    const direct = column.column_key || column.column_name || column.name_key;
    if (direct) return direct;
    
    // ثانياً: إذا لم يكن column_key موجوداً، استخدم display_name_ar للبحث
    const ar = (column.display_name_ar || column.name || '').trim();
    const emp = employeeData || selectedEmployee;
    
    switch (ar) {
      case 'الراتب الأساسي': return 'basic_monthly_salary';
      case 'ساعات الإضافي': 
      case 'ساعات الإضافي العادية':
        if (emp) {
          if (emp.overtime_hours_work !== undefined && emp.overtime_hours_work !== null) return 'overtime_hours_work';
          if (emp.regular_overtime_hours !== undefined && emp.regular_overtime_hours !== null) return 'regular_overtime_hours';
          if (emp.overtime_hours !== undefined && emp.overtime_hours !== null) return 'overtime_hours';
        }
        return 'overtime_hours_work';
      case 'أجر الإضافي': return 'overtime_total_amount';
      case 'ساعات العمل':
      case 'work_hours':
        return 'work_hours';
      case 'بدل المواصلات': return 'transport_allowance';
      case 'مكافأة خاصة':
        if (emp) {
          if (emp.special_bonus !== undefined && emp.special_bonus !== null) return 'special_bonus';
          if (emp.special_bonus_weekly !== undefined && emp.special_bonus_weekly !== null) return 'special_bonus_weekly';
        }
        return 'special_bonus';
      case 'إجمالي المستحقات': return 'total_entitlements';
      // المستقطعات
      case 'أيام الغياب': return 'absent_days';
      case 'قيمة الغياب': 
      case 'خصم الغياب': 
        return 'absent_value';
      case 'أيام التأخيرات': 
      case 'أيام التأخير': 
        return 'delay_days';
      case 'التأخيرات': 
      case 'خصم التأخير': 
        return 'delay_fine';
      case 'التأمين': 
      case 'قيمة التأمين': 
        return 'insurance_value';
      case 'قسط السلفة': 
      case 'خصم السلفة': 
        return 'advance_installment';
      case 'إجمالي المستقطعات': return 'total_deductions';
      case 'صافي المرتب': return 'net_monthly_amount';
      default:
        return '';
    }
  }, [selectedEmployee]);

  // Fetch columns for entitlements table (monthly_salary_entitlements_columns)
  const fetchEntitlementsColumns = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php?action=get_columns&table_name=monthly_salary_entitlements_columns'));
      
      const result = await response.json();
      if (result.success) {
        debugLog('Raw API response for monthly entitlements columns:', result.data);
        
        const sorted = result.data.sort((a, b) => {
          const orderA = parseInt(a.display_order || a.order) || 0;
          const orderB = parseInt(b.display_order || b.order) || 0;
          return orderA - orderB;
        });
        
        // إزالة التكرار بناءً على column_key أولاً، ثم id
        const uniqueColumns = [];
        const seenKeys = new Set();
        const seenIds = new Set();
        
        for (const col of sorted) {
          if (!col) continue;
          
          const key = col.column_key || col.column_name || col.name;
          const id = col.id;
          const type = col.type;
          const name = col.display_name_ar || col.column_name_ar || '';
          
          // للأعمدة من نوع "reference" أو "إجمالي المستحقات"، نتأكد من عدم حذفها
          const isTotalEntitlements = (key === 'total_entitlements' || name === 'إجمالي المستحقات');
          const isReference = type === 'reference';
          
          // تسجيل المراجع و"إجمالي المستحقات" للتشخيص
          if (isReference || isTotalEntitlements) {
            debugLog('Found reference/total_entitlements column:', { id, key, name, type, isReference, isTotalEntitlements });
          }
          
          // التحقق من عدم التكرار بناءً على column_key أولاً
          // إذا كان column_key موجوداً، نتجاهل العمود حتى لو كان id مختلفاً
          // لكن نستثني المراجع و"إجمالي المستحقات" (يمكن أن يكون لها نفس column_key)
          if (key && seenKeys.has(key) && !isReference && !isTotalEntitlements) {
            // إذا كان العمود موجوداً بالفعل، نتحقق من أي واحد نحتفظ به
            const existingCol = uniqueColumns.find(c => (c.column_key || c.column_name || c.name) === key);
            if (existingCol) {
              // نحتفظ بالعمود الذي له id أصغر (الأقدم) أو display_order أصغر
              const existingOrder = parseInt(existingCol.display_order || existingCol.order) || 999;
              const currentOrder = parseInt(col.display_order || col.order) || 999;
              if (currentOrder >= existingOrder) {
                debugWarn('تم تجاهل عمود مكرر (column_key) - الاحتفاظ بالأقدم:', { id, key, name, type });
                continue; // تخطي العمود المكرر
              } else {
                // إزالة العمود القديم وإضافة الجديد
                const index = uniqueColumns.findIndex(c => (c.column_key || c.column_name || c.name) === key);
                if (index >= 0) {
                  uniqueColumns.splice(index, 1);
                  seenIds.delete(existingCol.id);
                  debugWarn('تم استبدال عمود مكرر (column_key) - الاحتفاظ بالأحدث:', { id, key, name, type });
                }
              }
            } else {
              debugWarn('تم تجاهل عمود مكرر (column_key):', { id, key, name, type });
              continue; // تخطي العمود المكرر
            }
          }
          
          // التحقق من id أيضاً
          if (id && seenIds.has(id) && !isReference && !isTotalEntitlements) {
            debugWarn('تم تجاهل عمود مكرر (id):', { id, key, name, type });
            continue; // تخطي العمود المكرر
          }
          
          // إضافة العمود إذا لم يكن مكرراً
          if (key) seenKeys.add(key);
          if (id) seenIds.add(id);
          uniqueColumns.push(col);
          
          // تسجيل المراجع و"إجمالي المستحقات" بعد الإضافة
          if (isReference || isTotalEntitlements) {
            debugLog('Added reference/total_entitlements column to uniqueColumns:', { id, key, name, type });
          }
        }
        
        debugLog('Processed monthly entitlements columns (after deduplication):', uniqueColumns.map(col => ({
          id: col.id,
          name: col.display_name_ar || col.column_name_ar,
          column_key: col.column_key || col.column_name || col.name,
          type: col.type,
          is_visible: col.is_visible
        })));
        
        return uniqueColumns;
      }
    } catch (error) {
      debugError('Error fetching monthly entitlements columns:', error);
    }
    return [];
  }, []);

  // Fetch columns for deductions table (monthly_salary_deductions_columns)
  const fetchDeductionsColumns = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php?action=get_columns&table_name=monthly_salary_deductions_columns'));
      
      const result = await response.json();
      
      if (result.success) {
        const sorted = result.data.sort((a, b) => {
          const orderA = parseInt(a.display_order) || 0;
          const orderB = parseInt(b.display_order) || 0;
          return orderA - orderB;
        });
        
        // إزالة التكرار بناءً على column_key أولاً، ثم id
        const uniqueColumns = [];
        const seenKeys = new Set();
        const seenIds = new Set();
        
        for (const col of sorted) {
          if (!col) continue;
          
          const key = col.column_key || col.column_name || col.name;
          const id = col.id;
          
          // التحقق من عدم التكرار بناءً على column_key أولاً
          // إذا كان column_key موجوداً، نتجاهل العمود حتى لو كان id مختلفاً
          if (key && seenKeys.has(key)) {
            debugWarn('تم تجاهل عمود مكرر (column_key) في المستقطعات:', { id, key, name: col.display_name_ar || col.column_name_ar });
            continue; // تخطي العمود المكرر
          }
          
          // التحقق من id أيضاً
          if (id && seenIds.has(id)) {
            debugWarn('تم تجاهل عمود مكرر (id) في المستقطعات:', { id, key, name: col.display_name_ar || col.column_name_ar });
            continue; // تخطي العمود المكرر
          }
          
          // إضافة العمود إذا لم يكن مكرراً
          if (key) seenKeys.add(key);
          if (id) seenIds.add(id);
          uniqueColumns.push(col);
        }
        
        return uniqueColumns;
      }
    } catch (error) {
      debugError('Error fetching monthly deductions columns:', error);
    }
    return [];
  }, []);

  // Fetch available tables for import
  const fetchAvailableTables = useCallback(async () => {
    try {
      const tables = [
        { id: 1, table_name: 'net_monthly_salary', name: 'جدول صافي المرتب الشهري', description: 'أعمدة صافي الراتب' },
        { id: 2, table_name: 'monthly_salary_entitlements_columns', name: 'جدول المستحقات الشهري', description: 'أعمدة المستحقات' },
        { id: 3, table_name: 'monthly_salary_deductions_columns', name: 'جدول المستقطعات الشهري', description: 'أعمدة المستقطعات' },
        { id: 4, table_name: 'employees', name: 'جدول الموظفين', description: 'أعمدة بيانات الموظفين' }
      ];
      setAvailableTables(tables);
    } catch (error) {
      debugError('Error fetching available tables:', error);
    }
  }, []);

  // Fetch columns from selected table for import
  const fetchImportableColumns = useCallback(async (tableName) => {
    try {
      const response = await fetch(getApiUrl(`/api/dynamic_system/dynamic_system_api.php?action=get_columns&table_name=${tableName}`));
      const result = await response.json();
      if (result.success) {
        setImportableColumns(result.data);
      }
    } catch (error) {
      debugError('Error fetching importable columns:', error);
    }
  }, []);

  // Import column from another table
  const importColumn = useCallback(async (column, targetTable, importType = 'reference') => {
    try {
      const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_column',
          source_column: column,
          target_table: targetTable,
          import_type: importType
        })
      });
      
      const result = await response.json();
      if (result.success) {
        const importTypeText = importType === 'reference' ? 'مرجع' : 'نسخة';
        toast({
          title: `تم استيراد العمود بنجاح (${importTypeText})`,
          description: `تم استيراد ${column.display_name_ar} من ${column.table_name} ك${importTypeText}`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        if (targetTable === 'monthly_salary_entitlements_columns') {
          const newColumns = await fetchEntitlementsColumns();
          setEntitlementsColumns(newColumns);
        } else if (targetTable === 'monthly_salary_deductions_columns') {
          const newColumns = await fetchDeductionsColumns();
          setDeductionsColumns(newColumns);
        }
        setIsImportColumnModalOpen(false);
      } else {
        throw new Error(result.message || 'فشل في استيراد العمود');
      }
    } catch (error) {
      debugError('Error importing column:', error);
      toast({
        title: 'خطأ في الاستيراد',
        description: error.message || 'حدث خطأ أثناء استيراد العمود',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [fetchEntitlementsColumns, fetchDeductionsColumns, toast]);

  // Add custom column
  const addCustomColumn = (columnName, displayName, dataType = 'number', isCalculated = false, isRequired = false) => {
    const newColumn = {
      id: `custom_${Date.now()}`,
      column_name: columnName,
      display_name_ar: displayName,
      data_type: dataType,
      is_calculated: isCalculated,
      is_required: isRequired,
      table_name: 'custom',
      is_custom: true,
      badge_color: 'blue',
      badge_variant: 'solid',
      is_currency: 0
    };
    setCustomColumns(prev => {
      const newColumns = [...prev, newColumn];
      setTimeout(() => savePreferences(false), 100);
      return newColumns;
    });
  };

  // Add column from system
  const addColumnFromSystem = (column) => {
    if (!visibleColumns.includes(column.id)) {
      setVisibleColumns(prev => {
        const newColumns = [...prev, column.id];
        setColumnVisibility(prevVis => ({
          ...prevVis,
          [column.id]: true
        }));
        setTimeout(() => savePreferences(false), 100);
        return newColumns;
      });
    } else {
      setColumnVisibility(prevVis => ({
        ...prevVis,
        [column.id]: true
      }));
      setTimeout(() => savePreferences(false), 100);
    }
  };

  // Remove column from display
  const removeColumnFromDisplay = (columnId) => {
    setVisibleColumns(prev => {
      const newColumns = prev.filter(id => id !== columnId);
      setColumnVisibility(prevVis => ({
        ...prevVis,
        [columnId]: false
      }));
      setTimeout(() => savePreferences(false), 500);
      return newColumns;
    });
  };

  // Save preferences
  const savePreferences = useCallback(async (closeModal = false) => {
    try {
      if (isColumnManagerOpen && entitlementsColumns.length > 0) {
        const columnsToSave = entitlementsColumns.map((col, index) => {
          const isVisible = columnVisibility[col.id] !== undefined 
            ? columnVisibility[col.id] 
            : col.is_visible;
          const displayOrder = visibleColumns.indexOf(col.id) >= 0 
            ? visibleColumns.indexOf(col.id) + 1 
            : col.display_order || index + 1;
          
          return {
            id: col.id,
            display_order: displayOrder,
            is_visible: isVisible ? 1 : 0
          };
        });
        
        try {
          const dbResponse = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_columns_order_and_visibility',
              table_name: 'monthly_salary_entitlements_columns',
              columns: columnsToSave
            })
          });
          
          const dbResult = await dbResponse.json();
          if (dbResult.success) {
            await fetchEntitlementsColumns();
          }
        } catch (dbError) {
          debugError('Error saving columns to database:', dbError);
        }
      }
      
      if (closeModal) {
        toast({
          title: "تم الحفظ بنجاح",
          description: "تم حفظ تفضيلات الأعمدة في قاعدة البيانات",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
        setIsColumnManagerOpen(false);
        setIsDeductionColumnManagerOpen(false);
      }
    } catch (error) {
      debugError('Error saving preferences:', error);
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ التفضيلات",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  }, [visibleColumns, entitlementsColumns, columnVisibility, isColumnManagerOpen, fetchEntitlementsColumns, toast]);

  // Create default preferences
  const createDefaultPreferences = async () => {
    const defaultColumns = dynamicColumns
      .filter(col => 
        col.table_name === 'monthly_salary_entitlements_columns' || 
        col.table_display_name_ar === 'المستحقات الشهرية'
      )
      .slice(0, 5)
      .map(col => col.id);

    const newPreferences = {
      visibleColumns: [...new Set([...defaultColumns, ...visibleColumns])],
      visibleDeductionColumns: [...visibleDeductionColumns],
      customColumns: customColumns
    };

    try {
      setVisibleColumns(newPreferences.visibleColumns);
      setVisibleDeductionColumns(newPreferences.visibleDeductionColumns);
      setCustomColumns(newPreferences.customColumns);
      
      if (entitlementsColumns.length > 0) {
        const columnsToSave = entitlementsColumns.map((col) => {
          const isVisible = newPreferences.visibleColumns.includes(col.id);
          const displayOrder = newPreferences.visibleColumns.indexOf(col.id) >= 0
            ? newPreferences.visibleColumns.indexOf(col.id) + 1
            : 999;
          
          return {
            id: col.id,
            display_order: displayOrder,
            is_visible: isVisible ? 1 : 0
          };
        });
        
        const dbResponse = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_columns_order_and_visibility',
            table_name: 'monthly_salary_entitlements_columns',
            columns: columnsToSave
          })
        });
        
        const dbResult = await dbResponse.json();
        if (dbResult.success) {
          await fetchEntitlementsColumns();
        }
      }
      
      toast({
        title: "تم إضافة التفضيلات الافتراضية",
        description: "تم إضافة الأعمدة الافتراضية بنجاح",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      setIsColumnManagerOpen(false);
      setIsDeductionColumnManagerOpen(false);
    } catch (error) {
      debugError('Error creating default preferences:', error);
      toast({
        title: "خطأ في إضافة التفضيلات",
        description: "حدث خطأ أثناء إضافة التفضيلات الافتراضية",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Reset preferences
  const resetPreferences = async () => {
    try {
      setVisibleColumns([]);
      setVisibleDeductionColumns([]);
      setCustomColumns([]);
      toast({
        title: "تم حذف التفضيلات",
        description: "تم حذف جميع التفضيلات بنجاح",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
      setIsColumnManagerOpen(false);
      setIsDeductionColumnManagerOpen(false);
    } catch (error) {
      debugError('Error deleting preferences:', error);
    }
  };

  // Update badge color
  const updateBadgeColor = async (columnId, badgeColor, badgeVariant, isCurrency, tableName = null) => {
    if (columnId && columnId.toString().startsWith('custom_')) {
      toast({
        title: 'تحذير',
        description: 'لا يمكن تحديث لون البادج للأعمدة المخصصة',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // تحديد table_name بناءً على العمود إذا لم يكن محدداً
    let targetTableName = tableName;
    if (!targetTableName) {
      // البحث في deductionsColumns أولاً
      const deductionCol = deductionsColumns.find(col => col.id === columnId);
      if (deductionCol) {
        targetTableName = 'monthly_salary_deductions_columns';
      } else {
        // البحث في entitlementsColumns
        const entitlementCol = entitlementsColumns.find(col => col.id === columnId);
        if (entitlementCol) {
          targetTableName = 'monthly_salary_entitlements_columns';
        } else {
          // افتراضي
          targetTableName = 'monthly_salary_deductions_columns';
        }
      }
    }
    
    try {
      const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_badge_color',
          id: columnId,
          badge_color: badgeColor,
          badge_variant: badgeVariant,
          is_currency: isCurrency,
          table_name: targetTableName
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setDynamicColumns(prev => 
          prev.map(col => 
            col.id === columnId 
              ? { ...col, badge_color: badgeColor, badge_variant: badgeVariant, is_currency: isCurrency }
              : col
          )
        );
        
        setEntitlementsColumns(prev =>
          prev.map(col =>
            col.id === columnId
              ? { ...col, badge_color: badgeColor, badge_variant: badgeVariant, is_currency: isCurrency }
              : col
          )
        );
        setDeductionsColumns(prev =>
          prev.map(col =>
            col.id === columnId
              ? { ...col, badge_color: badgeColor, badge_variant: badgeVariant, is_currency: isCurrency }
              : col
          )
        );
        
        toast({
          title: "تم تحديث اللون",
          description: "تم تحديث لون البادج بنجاح",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
        
        setIsBadgeColorModalOpen(false);
        setEditingBadgeColumn(null);
        
        fetchDynamicColumns();
        fetchEntitlementsColumns();
        fetchDeductionsColumns();
      } else {
        toast({
          title: "خطأ في التحديث",
          description: result.message || "حدث خطأ أثناء تحديث اللون",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      debugError('Error updating badge color:', error);
      toast({
        title: "خطأ في التحديث",
        description: "حدث خطأ أثناء تحديث اللون",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Toggle column visibility
  const handleToggleColumnVisibility = async (column) => {
    try {
      const currentVisibility = columnVisibility[column.id] !== undefined ? columnVisibility[column.id] : column.is_visible;
      const newVisibility = !currentVisibility;
      
      const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_column_visibility',
          id: column.id,
          is_visible: newVisibility,
          table_name: 'monthly_salary_entitlements_columns'
        })
      });

      const result = await response.json();
      if (result.success) {
        setColumnVisibility(prev => ({
          ...prev,
          [column.id]: newVisibility
        }));
        
        if (newVisibility && !visibleColumns.includes(column.id)) {
          setVisibleColumns(prev => [...prev, column.id]);
        }
        
        toast({
          title: 'تم التحديث بنجاح',
          description: newVisibility ? 'تم إظهار العمود' : 'تم إخفاء العمود',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchDynamicColumns();
        fetchEntitlementsColumns();
        fetchDeductionsColumns();
        
        setTimeout(async () => {
          await fetchEntitlementsColumns();
          await fetchDeductionsColumns();
        }, 500);
      } else {
        toast({
          title: 'خطأ في التحديث',
          description: result.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ في الاتصال',
        description: 'حدث خطأ في الاتصال بالخادم',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Delete column
  const handleDeleteColumn = async (column) => {
    if (!window.confirm(`هل أنت متأكد من حذف العمود "${column.display_name_ar}"؟`)) {
      return;
    }

    try {
      const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_column',
          id: column.id,
          table_name: 'net_monthly_salary'
        })
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'تم الحذف بنجاح',
          description: 'تم حذف العمود',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchDynamicColumns();
      } else {
        toast({
          title: 'خطأ في الحذف',
          description: result.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ في الاتصال',
        description: 'حدث خطأ في الاتصال بالخادم',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Move column up
  const moveColumnUp = useCallback((columnId) => {
    setVisibleColumns(prev => {
      const uniquePrev = prev.filter((id, idx) => prev.indexOf(id) === idx);
      const index = uniquePrev.indexOf(columnId);
      
      if (index === -1) {
        const newColumns = [columnId, ...uniquePrev];
        setTimeout(() => savePreferences(false), 100);
        return newColumns;
      }
      
      if (index === 0) {
        return uniquePrev;
      }
      
      const newColumns = [...uniquePrev];
      [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
      setTimeout(() => savePreferences(false), 100);
      return newColumns;
    });
  }, [savePreferences]);

  // Move column down
  const moveColumnDown = useCallback((columnId) => {
    setVisibleColumns(prev => {
      const uniquePrev = prev.filter((id, idx) => prev.indexOf(id) === idx);
      const index = uniquePrev.indexOf(columnId);
      
      if (index === -1) {
        const newColumns = [...uniquePrev, columnId];
        setTimeout(() => savePreferences(false), 100);
        return newColumns;
      }
      
      if (index === uniquePrev.length - 1) {
        return uniquePrev;
      }
      
      const newColumns = [...uniquePrev];
      [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
      setTimeout(() => savePreferences(false), 100);
      return newColumns;
    });
  }, [savePreferences]);

  // Move deduction column up
  const moveDeductionColumnUp = useCallback((columnId) => {
    setVisibleDeductionColumns(prev => {
      const index = prev.indexOf(columnId);
      if (index > 0) {
        const newColumns = [...prev];
        [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
        setTimeout(() => savePreferences(false), 100);
        return newColumns;
      }
      return prev;
    });
  }, [savePreferences]);

  // Move deduction column down
  const moveDeductionColumnDown = useCallback((columnId) => {
    setVisibleDeductionColumns(prev => {
      const index = prev.indexOf(columnId);
      if (index < prev.length - 1) {
        const newColumns = [...prev];
        [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
        setTimeout(() => savePreferences(false), 100);
        return newColumns;
      }
      return prev;
    });
  }, [savePreferences]);

  // Add deduction column from system
  const addDeductionColumnFromSystem = (column) => {
    if (!visibleDeductionColumns.includes(column.id)) {
      setVisibleDeductionColumns(prev => {
        const newColumns = [...prev, column.id];
        setTimeout(() => savePreferences(false), 100);
        return newColumns;
      });
    }
  };

  // Remove deduction column from display
  const removeDeductionColumnFromDisplay = (columnId) => {
    setVisibleDeductionColumns(prev => {
      const newColumns = prev.filter(id => id !== columnId);
      setTimeout(() => savePreferences(false), 100);
      return newColumns;
    });
  };

  // Load columns when modals open
  useEffect(() => {
    if (isDeductionColumnManagerOpen) {
      fetchDeductionsColumns().then(columns => {
        setDeductionsColumns(columns);
      });
    }
  }, [isDeductionColumnManagerOpen, fetchDeductionsColumns]);

  useEffect(() => {
    if (isColumnManagerOpen) {
      fetchEntitlementsColumns().then(columns => {
        setEntitlementsColumns(columns);
      });
    }
  }, [isColumnManagerOpen, fetchEntitlementsColumns]);

  // Handle view details
  const handleViewDetails = async (row) => {
    setSelectedEmployee(row);
    setIsDetailsModalOpen(true);
    // إعادة تحميل البيانات للتأكد من وجود أحدث ألوان البادجات
    fetchDynamicColumns();
    
    // جلب أعمدة المستحقات والمستقطعات
    const normalizeColumn = (col) => ({
      // حافظ على id كما هو
      id: col.id,
      // توحيد أسماء الحقول المتوقعة في الواجهة
      display_name_ar: col.display_name_ar || col.column_name_ar || col.name || '',
      display_name_en: col.display_name_en || col.column_name_en || '',
      column_name: col.column_name || col.column_key || col.name || '',
      column_key: col.column_key || col.column_name || col.name || '',
      data_type: col.data_type || col.type || 'number',
      type: col.type || col.data_type || 'number', // حفظ type بشكل صريح
      is_calculated: col.is_calculated ?? 0,
      is_editable: col.is_editable ?? 1,
      is_required: col.is_required ?? 0,
      is_active: (col.is_active ?? col.is_visible) ?? 1,
      is_visible: col.is_visible ?? 1, // حفظ is_visible بشكل صريح
      display_order: col.display_order ?? col.order ?? 0,
      table_id: col.table_id,
      table_name: col.table_name,
      table_display_name_ar: col.table_display_name_ar,
      badge_color: col.badge_color || 'blue',
      badge_variant: col.badge_variant || 'solid',
      is_currency: (col.is_currency ?? 0) ? 1 : 0,
    });

    let entitlementsCols = (await fetchEntitlementsColumns()).map(normalizeColumn);
    
    // تسجيل المراجع في entitlementsCols
    const referenceCols = entitlementsCols.filter(col => col.type === 'reference' || (col.column_key === 'total_entitlements' || col.display_name_ar === 'إجمالي المستحقات'));
    debugLog('Reference columns in monthly entitlementsCols (after normalizeColumn):', referenceCols.map(col => ({
      id: col.id,
      name: col.display_name_ar,
      column_key: col.column_key,
      type: col.type
    })));
    
    // التحقق من وجود عمود "التمييز والحوافز" وإضافته كعمود مرجعي إذا لم يكن موجوداً
    const hasDiscriminationIncentive = entitlementsCols.some(col => {
      const key = col.column_key || col.column_name || col.name;
      const name = col.display_name_ar || col.column_name_ar || '';
      return key === 'discrimination_incentive_allowance' || name === 'التمييز والحوافز';
    });
    
    if (!hasDiscriminationIncentive) {
      // إضافة "التمييز والحوافز" كعمود مرجعي
      entitlementsCols.push({
        id: 'discrimination_incentive_allowance_ref',
        display_name_ar: 'التمييز والحوافز',
        display_name_en: 'Discrimination and Incentives',
        column_name: 'discrimination_incentive_allowance',
        column_key: 'discrimination_incentive_allowance',
        data_type: 'decimal',
        type: 'reference',
        is_calculated: 0,
        is_editable: 0,
        is_required: 0,
        is_active: 1,
        is_visible: 1,
        display_order: 2, // بعد "الأساسي" (1) وقبل "أجر الساعة" (3)
        table_id: null,
        table_name: 'employees',
        table_display_name_ar: 'الموظفين',
        badge_color: 'orange',
        badge_variant: 'solid',
        is_currency: 1,
      });
    }
    
    // التحقق من وجود عمود "إجمالي المستحقات" وإضافته إذا لم يكن موجوداً
    const hasTotalEntitlements = entitlementsCols.some(col => {
      const key = col.column_key || col.column_name || col.name;
      const name = col.display_name_ar || col.column_name_ar || '';
      return key === 'total_entitlements' || name === 'إجمالي المستحقات';
    });
    
    if (!hasTotalEntitlements) {
      // جلب عمود "إجمالي المستحقات" مباشرة من API
      try {
        const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php?action=get_columns&table_name=monthly_salary_entitlements_columns'));
        const result = await response.json();
        if (result.success) {
          const totalEntitlementsCol = result.data.find(col => {
            const key = col.column_key || col.column_name || col.name;
            const name = col.display_name_ar || col.column_name_ar || '';
            return key === 'total_entitlements' || name === 'إجمالي المستحقات';
          });
          
          if (totalEntitlementsCol) {
            entitlementsCols.push(normalizeColumn(totalEntitlementsCol));
            debugLog('Added total_entitlements column manually:', totalEntitlementsCol);
          }
        }
      } catch (error) {
        debugError('Error fetching total_entitlements column:', error);
      }
    }
    
    const deductionsCols = (await fetchDeductionsColumns()).map(normalizeColumn);
    debugLog('Loaded monthly deductions columns in handleViewDetails:', deductionsCols);
    debugLog('Loaded monthly entitlements columns in handleViewDetails (including total_entitlements):', entitlementsCols.map(col => ({
      id: col.id,
      name: col.display_name_ar || col.column_name_ar,
      column_key: col.column_key || col.column_name || col.name,
      type: col.type
    })));
    setEntitlementsColumns(entitlementsCols);
    setDeductionsColumns(deductionsCols);
    
    // التحقق من وجود "إجمالي المستحقات" في entitlementsCols بعد setEntitlementsColumns
    const totalEntitlementsAfterSet = entitlementsCols.find(col => {
      if (!col) return false;
      const key = col.column_key || col.column_name || col.name;
      const name = col.display_name_ar || col.column_name_ar || '';
      return key === 'total_entitlements' || name === 'إجمالي المستحقات';
    });
    debugLog('🔍 total_entitlements after setEntitlementsColumns:', totalEntitlementsAfterSet ? {
      id: totalEntitlementsAfterSet.id,
      name: totalEntitlementsAfterSet.display_name_ar,
      column_key: totalEntitlementsAfterSet.column_key,
      type: totalEntitlementsAfterSet.type,
      is_visible: totalEntitlementsAfterSet.is_visible
    } : 'NOT FOUND');
  };


  // Handle edit
  const handleEdit = (row) => {
    setSelectedEmployee(row);
    setIsEditModalOpen(true);
  };

  // Fetch dynamic columns for monthly salary table
  const fetchDynamicColumns = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php?action=get_columns&table_type=monthly'), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      if (result.success) {
        // ترتيب الأعمدة حسب display_order
        const sortedColumns = result.data.sort((a, b) => {
          return (a.display_order || 0) - (b.display_order || 0);
        });
        
        setDynamicColumns(sortedColumns);
        
        // تحميل التفضيلات المحفوظة
        const saved = localStorage.getItem('monthlySalaryModalPreferences');
        if (saved) {
          const preferences = JSON.parse(saved);
          setVisibleColumns(preferences.visibleColumns || []);
          setVisibleDeductionColumns(preferences.visibleDeductionColumns || []);
          setCustomColumns(preferences.customColumns || []);
        } else {
          // إعداد افتراضي للأعمدة المرئية
          const entitlementsColumns = sortedColumns.filter(col => 
            col.table_type === 'monthly' && col.category === 'entitlements'
          );
          const deductionsColumns = sortedColumns.filter(col => 
            col.table_type === 'monthly' && col.category === 'deductions'
          );
          
          setVisibleColumns(entitlementsColumns);
          setVisibleDeductionColumns(deductionsColumns);
        }
      } else {
        debugError('Error fetching dynamic columns:', result.message);
      }
    } catch (error) {
      debugError('Error fetching dynamic columns:', error);
    }
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [startDate, endDate] = selectedDateRange;
      const response = await fetch(getApiUrl('/api/unified_salary_api_v2.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_monthly_salary_data',
          start_date: startDate.format('YYYY-MM-DD'),
          end_date: endDate.format('YYYY-MM-DD'),
          salary_type: 'Monthly'
        })
      });
      
      const text = await response.text();
      let result;
      try {
        result = text ? JSON.parse(text) : {};
      } catch (parseError) {
        debugError('JSON Parse Error:', parseError);
        debugError('Response text (first 500 chars):', text ? text.slice(0, 500) : '');
        result = { success: false, message: 'استجابة غير صحيحة من الخادم' };
      }
      
      if (!response.ok) {
        const msg = result.message || result.error || `HTTP error! status: ${response.status}`;
        toast({
          title: 'خطأ في الخادم',
          description: msg,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setLoading(false);
        return;
      }
      
      if (result.success) {
        debugLog('Monthly salary data loaded:', result.data);
        debugLog('First employee department_description:', result.data[0]?.department_description);
        setTableData(result.data || []);
      } else {
        toast({
          title: 'خطأ في تحميل البيانات',
          description: result.message || 'حدث خطأ غير متوقع',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      debugError('Error fetching data:', error);
      toast({
        title: 'خطأ في الاتصال',
        description: error.message || 'تعذر الاتصال بالخادم',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDateRange, toast]);

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/departments_api.php'));
      const result = await response.json();
      if (result.success) {
        setDepartments(result.data || []);
      }
    } catch (error) {
      debugError('Error fetching departments:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchDepartments();
    fetchDynamicColumns();
  }, [fetchData, fetchDepartments, fetchDynamicColumns]);

  // Filter data + sorting
  const filteredData = useMemo(() => {
    let filtered = tableData.filter(item => {
      const matchesSearch = !searchTerm || 
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.employee_code && item.employee_code.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesSalaryType = item.salary_type === 'Monthly';
      const matchesDepartment = !departmentFilter || item.department === departmentFilter;
      
      return matchesSearch && matchesSalaryType && matchesDepartment;
    });

    if (sortConfig.key) {
      const numericKeys = ['basic_monthly_salary', 'total_entitlements', 'total_deductions', 'net_monthly_amount'];
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === 'net_monthly_amount') {
          aVal = (parseFloat(a.total_entitlements) || 0) - (parseFloat(a.total_deductions ?? a.deductions) || 0);
          bVal = (parseFloat(b.total_entitlements) || 0) - (parseFloat(b.total_deductions ?? b.deductions) || 0);
        } else if (numericKeys.includes(sortConfig.key)) {
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
  }, [tableData, searchTerm, departmentFilter, sortConfig]);

  const searchOnlyMonthlyData = useMemo(() => {
    return tableData.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.employee_code && item.employee_code.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch && item.salary_type === 'Monthly';
    });
  }, [tableData, searchTerm]);

  const monthlyTotals = useMemo(() => {
    let totalEntitlements = 0;
    let totalDeductions = 0;
    let netSalary = 0;

    filteredData.forEach((row) => {
      const overtimePay =
        parseFloat(row.overtime_pay ?? row.overtime_total_amount ?? row.overtime_amount) || 0;
      const entitlements = (parseFloat(row.total_entitlements) || 0) - overtimePay;
      const deductions = parseFloat(row.total_deductions ?? row.deductions) || 0;
      totalEntitlements += entitlements;
      totalDeductions += deductions;
      netSalary += entitlements - deductions;
    });

    return { totalEntitlements, totalDeductions, netSalary };
  }, [filteredData]);

  // لا توجد سجلات حضور للفترة المحددة = عرض الرسالة بدل الجدول بأصفار (الـ API يرجع work_hours وليس attendance_days)
  const hasNoAttendanceForPeriod = useMemo(() => {
    if (tableData.length === 0) return false;
    const hasAnyAttendance = tableData.some(row => (Number(row.work_hours) || 0) > 0);
    return !hasAnyAttendance;
  }, [tableData]);

  const isNoMonthlyDataToShow = useMemo(
    () => filteredData.length === 0 || hasNoAttendanceForPeriod,
    [filteredData.length, hasNoAttendanceForPeriod]
  );

  // طباعة الكل: إنشاء محتوى ورقة صرف واحدة (للاستخدام في الطباعة الفردية والكل)
  const buildOneMonthlySlipBody = useCallback((employee) => {
    if (!employee) return '';
    const visibleColsForPrint = visibleColumns
      .map(id => entitlementsColumns.find(col => col && col.id === id && col.is_visible !== 0))
      .filter(col => col !== undefined);
    const otherColsForPrint = entitlementsColumns
      .filter(col => col && col.is_visible !== 0 && !visibleColumns.includes(col.id))
      .sort((a, b) => (a.display_order || 999) - (b.display_order || 999));
    const orderedEntitlementsColumns = [...visibleColsForPrint, ...otherColsForPrint];
    const requiredEntitlementsFields = [
      { key: 'base_salary', name: 'الأساسي', isCurrency: true },
      { key: 'discrimination_incentive_allowance', name: 'التمييز والحوافز', isCurrency: true },
      { key: 'regularity_days', name: 'أيام الانتظام', isCurrency: false },
      { key: 'regularity_pay', name: 'أجر الانتظام', isCurrency: true },
      { key: 'overtime_hours', name: 'ساعات الإضافي', isCurrency: false, specialFormat: true },
      { key: 'overtime_pay', name: 'أجر الإضافي', isCurrency: true },
      { key: 'transport_allowance', name: 'بدل المواصلات', isCurrency: true },
      { key: 'special_bonus', name: 'مكافأة خاصة', isCurrency: true }
    ];
    const entitlementsDataMap = new Map();
    orderedEntitlementsColumns
      .filter(col => {
        const name = col.display_name_ar || col.column_name_ar || col.name || '';
        const key = col.column_key || col.column_name || col.name || '';
        return name !== 'إجمالي المستحقات' && key !== 'total_entitlements' && name.toLowerCase() !== 'total_entitlements';
      })
      .forEach(col => {
        const key = col.column_key || col.column_name || col.name || resolveDataKey(col, employee);
        const value = key ? (parseFloat(employee?.[key]) || 0) : 0;
        const name = col.display_name_ar || col.column_name_ar || col.name;
        const formattedValue = col.is_currency ? (fmtCurrency ? fmtCurrency(value) : value.toLocaleString() + ' ج.م') : String(value);
        entitlementsDataMap.set(key, { name, value: formattedValue, key });
      });
    requiredEntitlementsFields.forEach(field => {
      if (!entitlementsDataMap.has(field.key)) {
        const value = parseFloat(employee?.[field.key]) || 0;
        let formattedValue;
        if (field.specialFormat && field.key === 'overtime_hours') {
          const regularOvertime = parseFloat(employee?.regular_overtime_hours) || 0;
          const holidayOvertime = parseFloat(employee?.holiday_overtime_hours) || 0;
          formattedValue = formatOvertimeHoursPairLabel(
            regularOvertime,
            holidayOvertime,
            employee?.total_overtime_hours
          );
        } else {
          formattedValue = field.isCurrency ? (fmtCurrency ? fmtCurrency(value) : value.toLocaleString() + ' ج.م') : String(value);
        }
        entitlementsDataMap.set(field.key, { name: field.name, value: formattedValue, key: field.key });
      } else if (field.specialFormat && field.key === 'overtime_hours') {
        const regularOvertime = parseFloat(employee?.regular_overtime_hours) || 0;
        const holidayOvertime = parseFloat(employee?.holiday_overtime_hours) || 0;
        entitlementsDataMap.get(field.key).value = formatOvertimeHoursPairLabel(
          regularOvertime,
          holidayOvertime,
          employee?.total_overtime_hours
        );
      }
    });
    const entitlementsData = requiredEntitlementsFields.map(field => entitlementsDataMap.get(field.key)).filter(Boolean);
    const filteredEntitlementsData = entitlementsData.filter(item =>
      item.name !== 'السلفة' && item.name !== 'سلفة' && !item.name?.includes('سلفة') &&
      item.key !== 'regularity_days' && item.key !== 'regularity_pay' && item.name !== 'أيام الانتظام' && item.name !== 'أجر الانتظام'
    );
    const requiredDeductionsFields = [
      { key: 'absence_days', name: 'أيام الغياب', isCurrency: false },
      { key: 'absence_deduction', name: 'خصم الغياب', isCurrency: true },
      { key: 'late_hours', name: 'ساعات التأخير', isCurrency: false },
      { key: 'late_deduction', name: 'خصم التأخير', isCurrency: true },
      { key: 'insurance_deduction', name: 'قيمة التأمين', isCurrency: true },
      { key: 'advance_installment', name: 'خصم السلفة', isCurrency: true, isAdvance: true },
      { key: 'early_leave_penalty', name: 'خصم الانصراف المبكر', isCurrency: true }
    ];
    const deductionsDataMap = new Map();
    deductionsColumns
      .filter(col => col.is_visible !== 0)
      .filter(col => {
        const name = col.display_name_ar || col.column_name_ar || col.name || '';
        const key = col.column_key || col.column_name || col.name || '';
        return name !== 'إجمالي المستقطعات' && key !== 'total_deductions' && name.toLowerCase() !== 'total_deductions';
      })
      .forEach(col => {
        const key = col.column_key || col.column_name || col.name || resolveDataKey(col, employee);
        const value = key ? (parseFloat(employee?.[key]) || 0) : 0;
        const formattedValue = col.is_currency ? (fmtCurrency ? fmtCurrency(value) : value.toLocaleString() + ' ج.م') : String(value);
        const isAdvanceInstallment = col.display_name_ar === 'خصم السلفة' || col.column_name === 'advance_installment' || col.column_key === 'advance_installment';
        const installmentNumber = employee?.advance_installment_number || 0;
        const totalInstallments = employee?.total_installments || 0;
        const isDeferred = (employee?.advance_installment_is_paid ?? 0) === 2;
        let displayName = isAdvanceInstallment && isDeferred ? 'قسط مرحل للفترة التالية' : (isAdvanceInstallment && installmentNumber > 0 && totalInstallments > 0 ? `${col.display_name_ar || col.column_name_ar || col.name} (قسط ${installmentNumber} من أصل ${totalInstallments})` : col.display_name_ar || col.column_name_ar || col.name);
        deductionsDataMap.set(key, { name: displayName, value: isAdvanceInstallment && isDeferred ? '0.00 ج.م' : formattedValue, key });
      });
    requiredDeductionsFields.forEach(field => {
      if (!deductionsDataMap.has(field.key)) {
        let value = 0, displayName = field.name, formattedValue;
        if (field.isAdvance) {
          value = parseFloat(employee?.advance_installment || employee?.advance_installment_amount) || 0;
          const installmentNumber = employee?.advance_installment_number || 0;
          const totalInstallments = employee?.total_installments || 0;
          const isDeferred = (employee?.advance_installment_is_paid ?? 0) === 2;
          displayName = isDeferred ? 'قسط مرحل للفترة التالية' : (installmentNumber > 0 && totalInstallments > 0 ? `${field.name} (قسط ${installmentNumber} من أصل ${totalInstallments})` : field.name);
          formattedValue = isDeferred ? '0.00 ج.م' : (fmtCurrency ? fmtCurrency(value) : value.toLocaleString() + ' ج.م');
        } else {
          value = parseFloat(employee?.[field.key]) || 0;
          formattedValue = field.isCurrency ? (fmtCurrency ? fmtCurrency(value) : value.toLocaleString() + ' ج.م') : String(value);
        }
        deductionsDataMap.set(field.key, { name: displayName, value: formattedValue, key: field.key });
      }
    });
    const deductionsData = requiredDeductionsFields.map(field => deductionsDataMap.get(field.key)).filter(Boolean);
    const overtimePayPrint = parseFloat(employee.overtime_pay) || 0;
    const totalEntitlementsRaw = parseFloat(employee.total_entitlements) || 0;
    const totalEntitlements = totalEntitlementsRaw - overtimePayPrint;
    const totalDeductions = parseFloat(employee.total_deductions ?? employee.deductions) || 0;
    const netSalary = totalEntitlements - totalDeductions;
    const netSalaryRounded = Math.round(netSalary / 5) * 5;
    const position = employee?.position || '';
    const department = employee?.department_description || employee?.department || '';
    const positionDept = position && department ? `${position} - ${department}` : (position || department || '-');
    return `
  <div class="header">
    <div class="company-name">${settings?.companyName || settings?.company_name || 'اسم الشركة'}</div>
    <div class="title">صرف مرتبات الموظفين</div>
    <div class="date-range">${selectedDateRange && selectedDateRange[0] && selectedDateRange[1] ? (() => {
      const start = selectedDateRange[0], end = selectedDateRange[1];
      const isFullMonth = start.isSame(start.clone().startOf('month'), 'day') && end.isSame(end.clone().endOf('month'), 'day');
      if (isFullMonth) {
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return `لشهر ${monthNames[start.month()]} ${start.year()}`;
      }
      return `للفترة من ${start.format('DD/MM/YYYY')} إلى ${end.format('DD/MM/YYYY')}`;
    })() : ''}</div>
    <div class="payment-date">تاريخ الصرف: ${dayjs().format('DD/MM/YYYY')}</div>
  </div>
  <div class="employee-info">
    <div class="info-item"><span class="info-label">كود الموظف:</span><span class="info-value">${employee?.employee_code || '-'}</span></div>
    <div class="info-item"><span class="info-label">الأسم:</span><span class="info-value">${employee?.name || employee?.employee_name || '-'}</span></div>
    <div class="info-item"><span class="info-label">الموقع:</span><span class="info-value">${employee?.location || '-'}</span></div>
    <div class="info-item"><span class="info-label">الوظيفة/القسم:</span><span class="info-value">${positionDept}</span></div>
  </div>
  <div class="content-grid">
    <div class="section">
      <div class="section-title">المستحقات</div>
      <div class="section-content">
        ${filteredEntitlementsData.map(item => `<div class="section-item"><span class="item-name">${item.name}</span><span class="item-value">${item.value}</span></div>`).join('')}
        <div class="section-item total-row"><span class="item-name">إجمالي المستحقات</span><span class="item-value">${fmtCurrency ? fmtCurrency(totalEntitlements) : (totalEntitlements.toLocaleString() + ' ج.م')}</span></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">المستقطعات</div>
      <div class="section-content">
        ${deductionsData.map(item => `<div class="section-item"><span class="item-name">${item.name}</span><span class="item-value">${item.value}</span></div>`).join('')}
        <div class="section-item total-row"><span class="item-name">إجمالي المستقطعات</span><span class="item-value">${fmtCurrency ? fmtCurrency(totalDeductions) : totalDeductions.toLocaleString() + ' ج.م'}</span></div>
      </div>
    </div>
  </div>
  <div class="net-salary">
    <div class="net-salary-label">صافي المرتب</div>
    <div class="net-salary-value">${fmtCurrency ? fmtCurrency(netSalaryRounded) : netSalaryRounded.toLocaleString() + ' ج.م'}</div>
  </div>`;
  }, [visibleColumns, entitlementsColumns, deductionsColumns, fmtCurrency, resolveDataKey, selectedDateRange, settings]);

  const handlePrintAllMonthly = useCallback(() => {
    if (!filteredData.length) return;
    const slipStyle = `
    @page { size: A5; margin: 8mm; }
    @media print { body { margin: 0; padding: 0; } .no-print { display: none; } }
    * { box-sizing: border-box; }
    body { font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif; direction: rtl; text-align: right; padding: 8mm; margin: 0; font-size: 11px; line-height: 1.5; color: #000; }
    .header { text-align: center; margin-bottom: 12px; border-bottom: 3px solid #000; padding-bottom: 8px; }
    .company-name { font-size: 20px; font-weight: bold; margin-bottom: 4px; color: #000; }
    .title { font-size: 16px; font-weight: bold; margin: 6px 0; color: #000; }
    .date-range { font-size: 13px; margin: 4px 0; color: #333; }
    .payment-date { font-size: 11px; margin: 4px 0; color: #666; }
    .employee-info { margin: 12px 0; padding: 8px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .info-item { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #ccc; }
    .info-label { font-weight: bold; color: #333; margin-left: 8px; }
    .info-value { color: #000; text-align: right; }
    .content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0; }
    .section { margin: 0; border: 1px solid #ddd; border-radius: 4px; overflow: visible; }
    .section-title { font-size: 13px; font-weight: bold; background-color: #333; color: white; padding: 6px 8px; margin: 0; text-align: center; }
    .section-content { padding: 6px; background-color: #fff; }
    .section-item { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #ccc; font-size: 10px; }
    .section-item:last-child { border-bottom: none; }
    .item-name { flex: 1 1 auto; min-width: 0; text-align: right; padding-right: 6px; white-space: nowrap; overflow: visible; }
    .item-value { flex: 0 0 52%; min-width: 0; text-align: left; font-weight: bold; font-family: 'Courier New', monospace; white-space: nowrap; overflow: visible; }
    .total-row { margin-top: 6px; padding-top: 6px; border-top: 2px solid #000; font-weight: bold; font-size: 11px; }
    .net-salary { margin-top: 12px; padding: 10px; background-color: #e8f5e9; border: 2px solid #4caf50; border-radius: 4px; text-align: center; }
    .net-salary-label { font-size: 14px; font-weight: bold; color: #2e7d32; margin-bottom: 4px; }
    .net-salary-value { font-size: 20px; font-weight: bold; color: #000; font-family: 'Courier New', monospace; }
    .slip-page { page-break-after: always; }
    `;
    const slipsHtml = filteredData.map(emp => `<div class="slip-page">${buildOneMonthlySlipBody(emp)}</div>`).join('');
    const fullHtml = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>صرف مرتبات الموظفين - الكل</title><style>${slipStyle}</style></head><body>${slipsHtml}</body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(fullHtml);
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); w.close(); }, 250);
    }
  }, [filteredData, buildOneMonthlySlipBody]);

  // Save special bonus (for monthly salary)
  const saveSpecialBonus = async (row) => {
    try {
      setSavingRowId(row.id || row.employee_id);
      const [startDate, endDate] = selectedDateRange;
      
      const response = await fetch(getApiUrl('/api/unified_salary_api_v2.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_monthly_special_bonus',
          employee_id: row.employee_id || row.id,
          month_start: startDate.format('YYYY-MM-DD'),
          month_end: endDate.format('YYYY-MM-DD'),
          amount: parseFloat(row.special_bonus || 0) || 0
        })
      });
      
      const text = await response.text();
      let result;
      try {
        result = text ? JSON.parse(text) : { success: false, message: 'لا توجد استجابة' };
      } catch (_) {
        result = { success: false, message: 'استجابة غير صالحة من الخادم' };
      }
      if (result.success) {
        setEditingBonusRowId(null);
        toast({
          title: 'تم الحفظ بنجاح',
          description: 'تم حفظ المكافأة الخاصة',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchData(); // Refresh data
      } else {
        toast({
          title: 'خطأ في الحفظ',
          description: result.message || 'حدث خطأ أثناء الحفظ',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      debugError('Error saving bonus:', error);
      toast({
        title: 'خطأ في الاتصال',
        description: 'تعذر الاتصال بالخادم',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSavingRowId(null);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setSalaryTypeFilter('Monthly');
    setDepartmentFilter('');
    const [start, end] = getCurrentMonthRange();
    setSelectedDateRange([start, end]);
    setRangePickerValue([start, end]);
  };

  const dateRangeLabel =
    selectedDateRange?.[0] && selectedDateRange?.[1]
      ? `${selectedDateRange[0].format('DD/MM/YYYY')} — ${selectedDateRange[1].format('DD/MM/YYYY')}`
      : '';

  const monthlyHeaderStatChips = useMemo(() => {
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
      chips.push(chip('scope', searchOnlyMonthlyData.length, hasSearch ? 'ضمن البحث' : 'من الكل', 'total'));
    } else if (hasSearch) {
      chips.push(chip('matched', pool.length, `من ${searchOnlyMonthlyData.length}`, 'total'));
    } else {
      chips.push(chip('employees', pool.length, 'موظف', 'total'));
    }

    chips.push(chip('ent', compactMoney(monthlyTotals.totalEntitlements), 'مستحقات', 'active'));
    chips.push(chip('ded', compactMoney(monthlyTotals.totalDeductions), 'مستقطعات', 'inactive'));
    chips.push(chip('net', compactMoney(monthlyTotals.netSalary), 'صافي', 'filtered'));

    return chips;
  }, [
    filteredData,
    searchTerm,
    departmentFilter,
    departments,
    monthlyTotals,
    searchOnlyMonthlyData,
  ]);

  const monthlyHeaderSubtitle = useMemo(() => {
    if (departmentFilter) {
      const dept = departments.find((d) => d.name === departmentFilter);
      return `تصفية حسب القسم: ${dept?.description || departmentFilter}`;
    }
    if (searchTerm.trim()) return `نتائج البحث عن «${searchTerm.trim()}»`;
    if (dateRangeLabel) return `فترة الرواتب: ${dateRangeLabel}`;
    return 'حساب ومراجعة رواتب الموظفين الشهرية';
  }, [departmentFilter, searchTerm, dateRangeLabel, departments]);

  return (
    <Box
      className={`tp-table-page-layout tp-salary-page-layout tp-monthly-salary-page-layout${monthlySalaryHeaderCollapsed ? ' tp-salary-page-layout--header-collapsed' : ''}`}
      w="100%"
      flex="1"
      minH="0"
      display="flex"
      flexDirection="column"
    >
        {!monthlySalaryHeaderCollapsed && (
        <Box mb={{ base: 1.5, md: 2 }} className="weekly-salary-header-shell tp-monthly-salary-page-header" flexShrink={0} w="100%" maxW="100%">
          <Box
            className="weekly-salary-toolbar-card tp-page-header-toolbar"
            w="100%"
            maxW="100%"
            px={{ base: 3, md: 5 }}
            py={{ base: 3, md: 4 }}
          >
            <VStack align="stretch" spacing={{ base: 2.5, md: 3 }} w="100%">
              <Flex
                align={{ base: 'stretch', md: 'center' }}
                gap={{ base: 3, md: 4 }}
                flexWrap="wrap"
                justify="space-between"
                className="tp-page-header-top"
              >
                <HStack spacing={3} align="center" minW={0} flex="1 1 220px" className="tp-page-header-brand">
                  <Flex
                    align="center"
                    justify="center"
                    w={{ base: '42px', md: '48px' }}
                    h={{ base: '42px', md: '48px' }}
                    borderRadius="xl"
                    flexShrink={0}
                    className="weekly-salary-header-icon-wrap tp-monthly-salary-header-icon-wrap"
                    aria-hidden
                  >
                    <Icon as={FiCalendar} boxSize={{ base: 5, md: 6 }} />
                  </Flex>
                  <VStack align="flex-start" spacing={0.5} minW={0}>
                    <Heading
                      className="stake-heading-3 weekly-salary-page-title tp-page-header-title"
                      size="md"
                      lineHeight="short"
                      mb={0}
                    >
                      إدارة الراتب الشهري
                    </Heading>
                    <Text className="tp-page-header-subtitle" noOfLines={2}>
                      {monthlyHeaderSubtitle}
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
                  {monthlyHeaderStatChips.map((statChip) => (
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
                className="weekly-salary-header-row weekly-salary-header-tools weekly-salary-toolbar-split"
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
                    <Box flex="1 1 0" minW={{ base: '80px', md: '120px' }} maxW={{ base: '140px', md: '200px' }} flexShrink={1}>
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
                    <Select
                      placeholder="جميع الأقسام"
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      size="sm"
                      flex="0 1 auto"
                      w={{ base: '96px', md: '140px' }}
                      maxW="160px"
                      flexShrink={1}
                      minW="72px"
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
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>
                          {dept.description || dept.name}
                        </option>
                      ))}
                    </Select>
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
                  ref={monthlyDateToolbarRef}
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
                      <Switch
                        isChecked={isAutomaticMode}
                        onChange={(e) => setIsAutomaticMode(e.target.checked)}
                        colorScheme="blue"
                        size="sm"
                      />
                      <Text fontSize="sm" className="stake-text-secondary" whiteSpace="nowrap">تلقائي</Text>
                    </HStack>
                    <DatePicker.RangePicker
                      className="weekly-salary-range-picker"
                      value={rangePickerValue}
                      onChange={handleRangePickerChange}
                      showWeekNumber={false}
                      size="middle"
                      placeholder={['من', 'إلى']}
                      format="DD/MM/YYYY"
                      style={{
                        borderRadius: '10px',
                        height: '36px',
                        border: '1px solid var(--stake-border-primary, #2f4553)',
                        backgroundColor: 'var(--stake-bg-card, #111827)',
                        color: 'var(--stake-text-primary, #fff)',
                      }}
                    />
                  </HStack>
                </Box>
              </Flex>
            </VStack>
          </Box>
        </Box>
        )}

        <Box
          className="stake-card weekly-salary-main-card"
          overflow="hidden"
          w="100%"
          maxW="100%"
          flex="1"
          minH="0"
          display="flex"
          flexDirection="column"
          border="1px solid var(--stake-border-primary, #2d3a4d)"
          borderRadius="2xl"
          boxShadow="var(--stake-shadow-lg, 0 10px 25px rgba(0,0,0,0.35))"
        >
          <Box p="0" className="weekly-salary-main-card-body" flex="1" minH="0" display="flex" flexDirection="column">
            <HStack
              justify="space-between"
              align="center"
              mb="2"
              px={{ base: 3, md: 4 }}
              pt="2"
              pb="1"
              className="fp-list-toolbar weekly-salary-list-toolbar"
              flexWrap={{ base: 'wrap', lg: 'nowrap' }}
              rowGap={2}
              columnGap={3}
            >
              <HStack spacing={2} align="center" flexShrink={0} minW={0} className="tp-list-toolbar__title-group">
                <PagePanelToggle
                  collapsed={monthlySalaryHeaderCollapsed}
                  onToggle={toggleMonthlySalaryHeaderCollapsed}
                  variant="table"
                />
                <Heading size="md" className="stake-heading-3 weekly-salary-list-heading" flexShrink={0}>
                  قائمة الرواتب الشهرية
                </Heading>
              </HStack>

              <HStack spacing="3" flexWrap="wrap" rowGap="2" align="center" justify="flex-end" flex={{ base: '1 1 100%', lg: '0 1 auto' }} minW={0}>
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
                    {monthlyTableColumns.map((col) => (
                      <Box key={col.id} px="3" py="2">
                        <HStack justify="space-between">
                          <HStack>
                            <Switch isChecked={col.visible} onChange={() => toggleMonthlyColumn(col.id)} />
                            <Text fontSize="sm">{col.label}</Text>
                          </HStack>
                          <HStack spacing="1">
                            <IconButton aria-label="أعلى" icon={<FiChevronUp />} size="xs" variant="ghost" onClick={() => moveMonthlyColumn(col.id, 'up')} />
                            <IconButton aria-label="أسفل" icon={<FiChevronDown />} size="xs" variant="ghost" onClick={() => moveMonthlyColumn(col.id, 'down')} />
                          </HStack>
                        </HStack>
                      </Box>
                    ))}
                  </MenuList>
                </Portal>
              </Menu>
              <Button
                leftIcon={<FiClock />}
                className="stake-btn-secondary"
                size="md"
                onClick={() => setIsOvertimeModalOpen(true)}
                h="44px"
                fontWeight="600"
              >
                عرض مبلغ الإضافي + تفاصيل ساعات الإضافي
              </Button>
              
              <Box position="relative">
                <Button
                  leftIcon={<FiRefreshCw />}
                  className="stake-btn-secondary expandable-btn"
                  size="md"
                  onClick={fetchData}
                  isLoading={loading}
                  h="44px"
                  w="44px"
                  minW="44px"
                  px="0"
                  fontWeight="600"
                  transition="all 0.3s ease"
                  overflow="hidden"
                  justifyContent="center"
                  _hover={{
                    w: "120px",
                    minW: "120px",
                    px: "6",
                    justifyContent: "flex-start"
                  }}
                >
                  <Text
                    position="absolute"
                    left="50px"
                    top="50%"
                    transform="translateY(-50%)"
                    opacity="0"
                    transition="opacity 0.3s ease 0.1s"
                    whiteSpace="nowrap"
                    fontSize="14px"
                    fontWeight="600"
                    color="inherit"
                    className="expandable-text"
                  >
                    تحديث
                  </Text>
                </Button>
              </Box>
              <Box position="relative" display="inline-block">
                <Tooltip
                  label={isNoMonthlyDataToShow ? 'لا توجد بيانات للعرض' : 'طباعة تقرير مجمّع للفترة'}
                  placement="top"
                  hasArrow
                  openDelay={400}
                  shouldWrapChildren
                >
                  <Box as="span" display="inline-block">
                    <Button
                      as="a"
                      href={
                        selectedDateRange?.[0] &&
                        selectedDateRange?.[1] &&
                        !isNoMonthlyDataToShow
                          ? getApiUrl(
                              '/api/monthly_salary_export_report.php?' +
                                new URLSearchParams({
                                  start_date: selectedDateRange[0].format('YYYY-MM-DD'),
                                  end_date: selectedDateRange[1].format('YYYY-MM-DD'),
                                })
                            )
                          : '#'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      leftIcon={<FiPrinter />}
                      className="stake-btn-success expandable-btn"
                      size="md"
                      h="44px"
                      w="44px"
                      minW="44px"
                      px="0"
                      fontWeight="600"
                      transition="all 0.3s ease"
                      overflow="hidden"
                      justifyContent="center"
                      isDisabled={!selectedDateRange?.[0] || !selectedDateRange?.[1] || isNoMonthlyDataToShow}
                      title={
                        isNoMonthlyDataToShow
                          ? 'لا توجد بيانات للعرض — تأكد من الفترة الزمنية'
                          : 'طباعة تقرير'
                      }
                      _hover={{
                        w: '140px',
                        minW: '140px',
                        px: '6',
                        transform: 'translateY(-1px)',
                        boxShadow: 'var(--stake-shadow-md)',
                        justifyContent: 'flex-start',
                      }}
                      _disabled={{ opacity: 0.55, cursor: 'not-allowed' }}
                    >
                      <Text
                        position="absolute"
                        left="50px"
                        top="50%"
                        transform="translateY(-50%)"
                        opacity="0"
                        transition="opacity 0.3s ease 0.1s"
                        whiteSpace="nowrap"
                        fontSize="14px"
                        fontWeight="600"
                        color="inherit"
                        className="expandable-text"
                      >
                        طباعة تقرير
                      </Text>
                    </Button>
                  </Box>
                </Tooltip>
              </Box>
              <Box position="relative" display="inline-block">
                <Tooltip
                  label={isNoMonthlyDataToShow ? 'لا توجد بيانات للعرض' : 'طباعة أوراق صرف لجميع الموظفين'}
                  placement="top"
                  hasArrow
                  openDelay={400}
                  shouldWrapChildren
                >
                  <Box as="span" display="inline-block">
                    <Button
                      leftIcon={<FiPrinter />}
                      className="stake-btn-primary expandable-btn weekly-salary-print-all-btn"
                      size="md"
                      h="44px"
                      w="44px"
                      minW="44px"
                      px="0"
                      fontWeight="600"
                      transition="all 0.3s ease"
                      overflow="hidden"
                      justifyContent="center"
                      color="white"
                      bg="var(--stake-primary, #3b82f6)"
                      onClick={handlePrintAllMonthly}
                      isDisabled={isNoMonthlyDataToShow}
                      title={
                        isNoMonthlyDataToShow
                          ? 'لا توجد بيانات للعرض — تأكد من الفترة الزمنية'
                          : 'طباعة الكل'
                      }
                      _hover={{
                        w: '120px',
                        minW: '120px',
                        px: '6',
                        transform: 'translateY(-1px)',
                        boxShadow: 'var(--stake-shadow-md)',
                        justifyContent: 'flex-start',
                        bg: 'var(--stake-primary, #2563eb)',
                        color: 'white',
                        borderColor: 'transparent',
                        filter: 'brightness(0.94)',
                      }}
                      _active={{
                        bg: 'var(--stake-primary, #1d4ed8)',
                        color: 'white',
                        filter: 'brightness(0.88)',
                      }}
                      _focusVisible={{ boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.45)' }}
                      _disabled={{ opacity: 0.55, cursor: 'not-allowed' }}
                    >
                      <Text
                        position="absolute"
                        left="50px"
                        top="50%"
                        transform="translateY(-50%)"
                        opacity="0"
                        transition="opacity 0.3s ease 0.1s"
                        whiteSpace="nowrap"
                        fontSize="14px"
                        fontWeight="600"
                        color="inherit"
                        className="expandable-text"
                      >
                        طباعة الكل
                      </Text>
                    </Button>
                  </Box>
                </Tooltip>
              </Box>
            </HStack>
          </HStack>
          {loading ? (
            <Center className="weekly-salary-loading-state">
              <VStack spacing="3">
                <Spinner size="lg" color="green.500" />
                <Text color="gray.600" fontSize="sm">جاري تحميل البيانات...</Text>
              </VStack>
            </Center>
          ) : isNoMonthlyDataToShow ? (
            <Box className="weekly-salary-empty-state" px={{ base: 3, md: 4 }}>
              <VStack spacing="4" maxW="md" mx="auto">
                <Icon as={FiUsers} boxSize="10" className="stake-text-secondary" opacity={0.85} />
                <Text color="gray.600" fontSize="md" textAlign="center" fontWeight="600">
                  لا توجد بيانات للعرض في هذه الفترة
                </Text>
                <Text fontSize="sm" className="stake-text-secondary" textAlign="center" lineHeight="tall">
                  جرّب تغيير نطاق التواريخ أعلاه أو التحقق من أن الموظفين لديهم راتب شهري ضمن الفترة.
                </Text>
                <Button
                  size="sm"
                  className="stake-btn-secondary"
                  borderRadius="lg"
                  onClick={() => {
                    monthlyDateToolbarRef.current?.scrollIntoView?.({
                      behavior: 'smooth',
                      block: 'center',
                    });
                    setTimeout(() => {
                      const inp = monthlyDateToolbarRef.current?.querySelector?.(
                        '.weekly-salary-range-picker .ant-picker-input input'
                      );
                      inp?.focus?.();
                    }, 400);
                  }}
                >
                  الانتقال إلى اختيار الفترة
                </Button>
              </VStack>
            </Box>
          ) : (
            <TableContainer
              overflowY="auto"
              overflowX="auto"
              w="100%"
              maxW="100%"
              className="weekly-salary-main-table-scroll weekly-salary-table-scroll"
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
                {(() => {
                  const visibleMonthlyCols = monthlyTableColumns.filter((c) => c.visible);
                  const codeW = 'var(--fp-col-code-width)';
                  const hasCodeCol = visibleMonthlyCols.some((c) => c.id === 'employee_code');
                  const subParts = [];
                  if (hasCodeCol) subParts.push(codeW);
                  const fluidCols = visibleMonthlyCols.filter((c) => {
                    if (hasCodeCol && c.id === 'employee_code') return false;
                    return true;
                  });
                  const fluidStyle =
                    fluidCols.length > 0
                      ? subParts.length > 0
                        ? { width: `calc((100% - ${subParts.join(' - ')}) / ${fluidCols.length})` }
                        : { width: `calc(100% / ${visibleMonthlyCols.length})` }
                      : { width: 'auto' };
                  return (
                    <colgroup>
                      {visibleMonthlyCols.map((c) => {
                        if (hasCodeCol && c.id === 'employee_code') {
                          return <col key={c.id} style={{ width: codeW, minWidth: codeW, maxWidth: codeW }} />;
                        }
                        return <col key={c.id} style={fluidStyle} />;
                      })}
                    </colgroup>
                  );
                })()}
                <Thead
                  sx={{
                    '& th': {
                      color: 'var(--stake-table-header-text, var(--stake-text-primary)) !important',
                    },
                  }}
                >
                  <Tr>
                    {monthlyTableColumns.filter(c => c.visible).map((col) => (
                      <Th
                        key={col.id}
                        cursor="pointer"
                        onClick={() => handleSort(col.id)}
                        className={getFinancialTableColumnClass({ id: col.id, label: col.label })}
                      >
                        <EnglishKeyTooltip englishKey={col.id}>{col.label}</EnglishKeyTooltip>
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredData.map((row, index) => {
                    const basic = parseFloat(row.basic_monthly_salary) || 0;
                    const allowances = parseFloat(row.allowances ?? row.total_allowances) || 0;
                    const specialBonus = parseFloat(row.special_bonus) || 0;
                    const overtimeTotal = parseFloat(row.overtime_total_amount ?? row.overtime_amount) || 0;
                    const transportAllowance = parseFloat(row.transport_allowance) || 0;
                    const overtimePay = parseFloat(row.overtime_pay ?? row.overtime_total_amount ?? row.overtime_amount) || 0;
                    const totalEntitlementsRaw = parseFloat(row.total_entitlements) || (basic + allowances + specialBonus + overtimeTotal + transportAllowance);
                    const totalEntitlements = totalEntitlementsRaw - overtimePay;
                    const si = parseFloat(row.social_insurance ?? row.insurance_value) || 0;
                    const tax = parseFloat(row.income_tax) || 0;
                    const other = parseFloat(row.other_deductions ?? row.loan_installment) || 0;
                    const totalDeductions = parseFloat(row.total_deductions ?? row.deductions) || (si + tax + other);
                    const net = totalEntitlements - totalDeductions;
                    return (
                      <Tr
                        key={row.id || index}
                        onDoubleClick={() => handleViewDetails(row)}
                        cursor="pointer"
                        title="اضغط مرتين لعرض التفاصيل"
                        _hover={{ bg: 'var(--stake-bg-hover)' }}
                      >
                        {monthlyTableColumns.filter(c => c.visible).map((col) => {
                          const fp = getFinancialTableColumnClass({ id: col.id, label: col.label });
                          if (col.id === 'name') return <Td key={col.id} className={fp}><Text className="fp-cell-text" fontWeight="medium" fontSize="sm">{row.name || 'غير محدد'}</Text></Td>;
                          if (col.id === 'employee_code') return <Td key={col.id} className={fp}>{row.employee_code || '-'}</Td>;
                          if (col.id === 'department') return <Td key={col.id} className={fp}>{row.department_description || row.department || '-'}</Td>;
                          if (col.id === 'basic_monthly_salary') return <Td key={col.id} className={fp}><Text className="fp-cell-text fp-money" fontWeight="medium">{fmtCurrency ? fmtCurrency(basic) : basic}</Text></Td>;
                          if (col.id === 'total_entitlements') return <Td key={col.id} className={fp}><Text className="fp-cell-text fp-money" fontWeight="bold">{fmtCurrency ? fmtCurrency(totalEntitlements) : totalEntitlements}</Text></Td>;
                          if (col.id === 'total_deductions') return <Td key={col.id} className={fp}><Text className="fp-cell-text fp-money" fontWeight="500">{fmtCurrency ? fmtCurrency(totalDeductions) : totalDeductions}</Text></Td>;
                          if (col.id === 'net_monthly_amount') return <Td key={col.id} className={fp}><Text className="fp-cell-text fp-money" fontWeight="bold" fontSize="md">{fmtCurrency ? fmtCurrency(net) : net}</Text></Td>;
                          return <Td key={col.id} className={fp}>-</Td>;
                        })}
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Box>

      {/* Modal عرض التفاصيل */}
      <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} size="4xl" isCentered>
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
              <HStack spacing="2" position="absolute" top="0" right="0">
                <IconButton
                  aria-label="طباعة"
                  icon={<FiPrinter />}
                  size="sm"
                  colorScheme="blue"
                  bg="blue.500"
                  color="white"
                  _hover={{ bg: "blue.600" }}
                  onClick={() => {
                    if (!selectedEmployee) return;
                    
                    // إنشاء نافذة طباعة
                    const printWindow = window.open('', '_blank');
                    const companyName = settings?.companyName || settings?.company_name || 'اسم الشركة';
                    const printDate = dayjs().format('DD/MM/YYYY');
                    
                    // تنسيق المدة للطباعة (المدة المحددة في الفلتر: شهر كامل أو نطاق يدوي)
                    let monthText = '';
                    if (selectedDateRange && selectedDateRange[0] && selectedDateRange[1]) {
                      const start = selectedDateRange[0];
                      const end = selectedDateRange[1];
                      const isFullMonth = start.isSame(start.clone().startOf('month'), 'day') && end.isSame(end.clone().endOf('month'), 'day');
                      if (isFullMonth) {
                        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
                        monthText = `لشهر ${monthNames[start.month()]} ${start.year()}`;
                      } else {
                        monthText = `للفترة من ${start.format('DD/MM/YYYY')} إلى ${end.format('DD/MM/YYYY')}`;
                      }
                    }
                    
                    // جمع بيانات المستحقات (للاستخدام في الطباعة فقط - بدون إجمالي المستحقات)
                    const visibleColsForPrint = visibleColumns
                      .map(id => entitlementsColumns.find(col => col && col.id === id && col.is_visible !== 0))
                      .filter(col => col !== undefined);
                    
                    const otherColsForPrint = entitlementsColumns
                      .filter(col => col && col.is_visible !== 0 && !visibleColumns.includes(col.id))
                      .sort((a, b) => (a.display_order || 999) - (b.display_order || 999));
                    
                    const orderedEntitlementsColumns = [...visibleColsForPrint, ...otherColsForPrint];
                    
                    // قائمة الحقول المطلوبة للمستحقات (يجب أن تظهر دائماً حتى لو كانت قيمتها صفر)
                    const requiredEntitlementsFields = [
                      { key: 'base_salary', name: 'الأساسي', isCurrency: true },
                      { key: 'discrimination_incentive_allowance', name: 'التمييز والحوافز', isCurrency: true },
                      { key: 'regularity_days', name: 'أيام الانتظام', isCurrency: false },
                      { key: 'regularity_pay', name: 'أجر الانتظام', isCurrency: true },
                      { key: 'overtime_hours', name: 'ساعات الإضافي', isCurrency: false, specialFormat: true },
                      { key: 'overtime_pay', name: 'أجر الإضافي', isCurrency: true },
                      { key: 'transport_allowance', name: 'بدل المواصلات', isCurrency: true },
                      { key: 'special_bonus', name: 'مكافأة خاصة', isCurrency: true }
                    ];

                    // جمع بيانات المستحقات مع ضمان ظهور الحقول المطلوبة
                    const entitlementsDataMap = new Map();
                    
                    // أولاً: جمع البيانات من الأعمدة الموجودة
                    orderedEntitlementsColumns
                      .filter(col => {
                        // إزالة "إجمالي المستحقات" من قائمة العناصر في الطباعة
                        const name = col.display_name_ar || col.column_name_ar || col.name || '';
                        const key = col.column_key || col.column_name || col.name || '';
                        return name !== 'إجمالي المستحقات' && 
                               key !== 'total_entitlements' && 
                               name.toLowerCase() !== 'total_entitlements';
                      })
                      .forEach(col => {
                        const key = col.column_key || col.column_name || col.name || resolveDataKey(col, selectedEmployee);
                        const value = key ? (parseFloat(selectedEmployee?.[key]) || 0) : 0;
                        const name = col.display_name_ar || col.column_name_ar || col.name;
                        const formattedValue = col.is_currency 
                          ? (fmtCurrency ? fmtCurrency(value) : value.toLocaleString() + ' ج.م')
                          : String(value);
                        entitlementsDataMap.set(key, {
                          name: name,
                          value: formattedValue,
                          key: key
                        });
                      });

                    // ثانياً: إضافة الحقول المطلوبة إذا لم تكن موجودة
                    requiredEntitlementsFields.forEach(field => {
                      if (!entitlementsDataMap.has(field.key)) {
                        const value = parseFloat(selectedEmployee?.[field.key]) || 0;
                        let formattedValue;
                        
                        if (field.specialFormat && field.key === 'overtime_hours') {
                          const regularOvertime = parseFloat(selectedEmployee?.regular_overtime_hours) || 0;
                          const holidayOvertime = parseFloat(selectedEmployee?.holiday_overtime_hours) || 0;
                          formattedValue = formatOvertimeHoursPairLabel(
                            regularOvertime,
                            holidayOvertime,
                            selectedEmployee?.total_overtime_hours
                          );
                        } else if (field.isCurrency) {
                          formattedValue = fmtCurrency ? fmtCurrency(value) : value.toLocaleString() + ' ج.م';
                        } else {
                          formattedValue = String(value);
                        }
                        
                        entitlementsDataMap.set(field.key, {
                          name: field.name,
                          value: formattedValue,
                          key: field.key
                        });
                      } else {
                        // تحديث التنسيق للحقول الموجودة إذا كانت ساعات الإضافي
                        if (field.specialFormat && field.key === 'overtime_hours') {
                          const regularOvertime = parseFloat(selectedEmployee?.regular_overtime_hours) || 0;
                          const holidayOvertime = parseFloat(selectedEmployee?.holiday_overtime_hours) || 0;
                          entitlementsDataMap.get(field.key).value = formatOvertimeHoursPairLabel(
                            regularOvertime,
                            holidayOvertime,
                            selectedEmployee?.total_overtime_hours
                          );
                        }
                      }
                    });

                    // تحويل Map إلى Array مع الحفاظ على الترتيب المطلوب
                    const entitlementsData = requiredEntitlementsFields
                      .map(field => entitlementsDataMap.get(field.key))
                      .filter(item => item !== undefined);
                    
                    // تصفية "السلفة" وأيام الانتظام وأجر الانتظام من المستحقات في الطباعة
                    const filteredEntitlementsData = entitlementsData.filter(item => 
                      item.name !== 'السلفة' && 
                      item.name !== 'سلفة' &&
                      !item.name?.includes('سلفة') &&
                      item.key !== 'regularity_days' &&
                      item.key !== 'regularity_pay' &&
                      item.name !== 'أيام الانتظام' &&
                      item.name !== 'أجر الانتظام'
                    );
                    
                    // قائمة الحقول المطلوبة للمستقطعات (يجب أن تظهر دائماً حتى لو كانت قيمتها صفر)
                    const requiredDeductionsFields = [
                      { key: 'absence_days', name: 'أيام الغياب', isCurrency: false },
                      { key: 'absence_deduction', name: 'خصم الغياب', isCurrency: true },
                      { key: 'late_hours', name: 'ساعات التأخير', isCurrency: false },
                      { key: 'late_deduction', name: 'خصم التأخير', isCurrency: true },
                      { key: 'insurance_deduction', name: 'قيمة التأمين', isCurrency: true },
                      { key: 'advance_installment', name: 'خصم السلفة', isCurrency: true, isAdvance: true },
                      { key: 'early_leave_penalty', name: 'خصم الانصراف المبكر', isCurrency: true }
                    ];

                    // جمع بيانات المستقطعات مع ضمان ظهور الحقول المطلوبة
                    const deductionsDataMap = new Map();
                    
                    // أولاً: جمع البيانات من الأعمدة الموجودة
                    deductionsColumns
                      .filter(col => col.is_visible !== 0)
                      .filter(col => {
                        // إزالة "إجمالي المستقطعات" من قائمة العناصر في الطباعة
                        const name = col.display_name_ar || col.column_name_ar || col.name || '';
                        const key = col.column_key || col.column_name || col.name || '';
                        return name !== 'إجمالي المستقطعات' && 
                               key !== 'total_deductions' && 
                               name.toLowerCase() !== 'total_deductions';
                      })
                      .forEach(col => {
                        const key = col.column_key || col.column_name || col.name || resolveDataKey(col, selectedEmployee);
                        const value = key ? (parseFloat(selectedEmployee?.[key]) || 0) : 0;
                        const formattedValue = col.is_currency 
                          ? (fmtCurrency ? fmtCurrency(value) : value.toLocaleString() + ' ج.م')
                          : String(value);
                        
                        // إضافة رقم القسط لـ "خصم السلفة" أو عرض "قسط مرحل للفترة التالية"
                        const isAdvanceInstallment = col.display_name_ar === 'خصم السلفة' || 
                                                   col.display_name_ar === 'قسط السلفة' ||
                                                   col.column_name === 'advance_installment' ||
                                                   col.column_key === 'advance_installment';
                        const installmentNumber = selectedEmployee?.advance_installment_number || 0;
                        const totalInstallments = selectedEmployee?.total_installments || 0;
                        const advanceInstallmentIsPaid = selectedEmployee?.advance_installment_is_paid ?? 0;
                        const isDeferred = advanceInstallmentIsPaid === 2;
                        
                        let displayName;
                        if (isAdvanceInstallment && isDeferred) {
                          displayName = 'قسط مرحل للفترة التالية';
                        } else if (isAdvanceInstallment && installmentNumber > 0 && totalInstallments > 0) {
                          displayName = `${col.display_name_ar || col.column_name_ar || col.name} (قسط ${installmentNumber} من أصل ${totalInstallments})`;
                        } else {
                          displayName = col.display_name_ar || col.column_name_ar || col.name;
                        }
                        
                        deductionsDataMap.set(key, {
                          name: displayName,
                          value: isAdvanceInstallment && isDeferred ? '0.00 ج.م' : formattedValue,
                          key: key
                        });
                      });

                    // ثانياً: إضافة الحقول المطلوبة إذا لم تكن موجودة
                    requiredDeductionsFields.forEach(field => {
                      if (!deductionsDataMap.has(field.key)) {
                        let value = 0;
                        let displayName = field.name;
                        let formattedValue;
                        
                        if (field.isAdvance) {
                          // معالجة خاصة لخصم السلفة
                          value = parseFloat(selectedEmployee?.advance_installment || selectedEmployee?.advance_installment_amount) || 0;
                          const installmentNumber = selectedEmployee?.advance_installment_number || 0;
                          const totalInstallments = selectedEmployee?.total_installments || 0;
                          const advanceInstallmentIsPaid = selectedEmployee?.advance_installment_is_paid ?? 0;
                          const isDeferred = advanceInstallmentIsPaid === 2;
                          
                          if (isDeferred) {
                            displayName = 'قسط مرحل للفترة التالية';
                            formattedValue = '0.00 ج.م';
                          } else if (installmentNumber > 0 && totalInstallments > 0) {
                            displayName = `${field.name} (قسط ${installmentNumber} من أصل ${totalInstallments})`;
                            formattedValue = fmtCurrency ? fmtCurrency(value) : value.toLocaleString() + ' ج.م';
                          } else {
                            formattedValue = fmtCurrency ? fmtCurrency(value) : value.toLocaleString() + ' ج.م';
                          }
                        } else {
                          value = parseFloat(selectedEmployee?.[field.key]) || 0;
                          formattedValue = field.isCurrency 
                            ? (fmtCurrency ? fmtCurrency(value) : value.toLocaleString() + ' ج.م')
                            : String(value);
                        }
                        
                        deductionsDataMap.set(field.key, {
                          name: displayName,
                          value: formattedValue,
                          key: field.key
                        });
                      }
                    });

                    // تحويل Map إلى Array مع الحفاظ على الترتيب المطلوب
                    const deductionsData = requiredDeductionsFields
                      .map(field => deductionsDataMap.get(field.key))
                      .filter(item => item !== undefined);
                    
                    // إجمالي المستحقات بدون أجر الإضافي (الموظف الشهري يأخذ أجر الإضافي أسبوعياً - يبقى في القائمة كمرجع فقط)
                    const overtimePayPrint = parseFloat(selectedEmployee.overtime_pay) || 0;
                    const totalEntitlementsRaw = parseFloat(selectedEmployee.total_entitlements) || 0;
                    const totalEntitlements = totalEntitlementsRaw - overtimePayPrint;
                    const totalDeductions = parseFloat(selectedEmployee.total_deductions) || 0;
                    const netSalary = totalEntitlements - totalDeductions;
                    const netSalaryRounded = Math.round(netSalary / 5) * 5;
                    
                    const printContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>صرف مرتبات الموظفين</title>
  <style>
    @page {
      size: A5;
      margin: 8mm;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif;
      direction: rtl;
      text-align: right;
      padding: 8mm;
      margin: 0;
      font-size: 11px;
      line-height: 1.5;
      color: #000;
    }
    .header {
      text-align: center;
      margin-bottom: 12px;
      border-bottom: 3px solid #000;
      padding-bottom: 8px;
    }
    .company-name {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 4px;
      color: #000;
    }
    .title {
      font-size: 16px;
      font-weight: bold;
      margin: 6px 0;
      color: #000;
    }
    .date-range {
      font-size: 13px;
      margin: 4px 0;
      color: #333;
    }
    .payment-date {
      font-size: 11px;
      margin: 4px 0;
      color: #666;
    }
    .employee-info {
      margin: 12px 0;
      padding: 8px;
      background-color: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 4px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px dotted #ccc;
    }
    .info-label {
      font-weight: bold;
      color: #333;
      margin-left: 8px;
    }
    .info-value {
      color: #000;
      text-align: right;
    }
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 12px 0;
    }
    .section {
      margin: 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: visible;
    }
    .section-title {
      font-size: 13px;
      font-weight: bold;
      background-color: #333;
      color: white;
      padding: 6px 8px;
      margin: 0;
      text-align: center;
    }
    .section-content {
      padding: 6px;
      background-color: #fff;
    }
    .section-item {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px dotted #ccc;
      font-size: 10px;
    }
    .section-item:last-child {
      border-bottom: none;
    }
    .item-name {
      flex: 1 1 auto;
      min-width: 0;
      text-align: right;
      padding-right: 6px;
      white-space: nowrap;
      overflow: visible;
    }
    .item-value {
      flex: 0 0 52%;
      min-width: 0;
      text-align: left;
      font-weight: bold;
      font-family: 'Courier New', monospace;
      white-space: nowrap;
      overflow: visible;
    }
    .total-row {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 2px solid #000;
      font-weight: bold;
      font-size: 11px;
    }
    .net-salary {
      margin-top: 12px;
      padding: 10px;
      background-color: #e8f5e9;
      border: 2px solid #4caf50;
      border-radius: 4px;
      text-align: center;
    }
    .net-salary-label {
      font-size: 14px;
      font-weight: bold;
      color: #2e7d32;
      margin-bottom: 4px;
    }
    .net-salary-value {
      font-size: 20px;
      font-weight: bold;
      color: #000;
      font-family: 'Courier New', monospace;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">${companyName}</div>
    <div class="title">صرف مرتبات الموظفين</div>
    <div class="date-range">${monthText}</div>
    <div class="payment-date">تاريخ الصرف: ${printDate}</div>
  </div>
  
  <div class="employee-info">
    <div class="info-item">
      <span class="info-label">كود الموظف:</span>
      <span class="info-value">${selectedEmployee?.employee_code || '-'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">الأسم:</span>
      <span class="info-value">${selectedEmployee?.name || selectedEmployee?.employee_name || '-'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">الموقع:</span>
      <span class="info-value">${selectedEmployee?.location || '-'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">الوظيفة/القسم:</span>
      <span class="info-value">${(() => {
        const position = selectedEmployee?.position || '';
        const department = selectedEmployee?.department_description || selectedEmployee?.department || '';
        if (position && department) {
          return `${position} - ${department}`;
        } else if (position) {
          return position;
        } else if (department) {
          return department;
        }
        return '-';
      })()}</span>
    </div>
  </div>
  
  <div class="content-grid">
    <div class="section">
      <div class="section-title">المستحقات</div>
      <div class="section-content">
        ${filteredEntitlementsData.map(item => `
          <div class="section-item">
            <span class="item-name">${item.name}</span>
            <span class="item-value">${item.value}</span>
          </div>
        `).join('')}
        <div class="section-item total-row">
          <span class="item-name">إجمالي المستحقات</span>
          <span class="item-value">${fmtCurrency ? fmtCurrency(totalEntitlements) : (totalEntitlements.toLocaleString() + ' ج.م')}</span>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">المستقطعات</div>
      <div class="section-content">
        ${deductionsData.map(item => `
          <div class="section-item">
            <span class="item-name">${item.name}</span>
            <span class="item-value">${item.value}</span>
          </div>
        `).join('')}
        <div class="section-item total-row">
          <span class="item-name">إجمالي المستقطعات</span>
          <span class="item-value">${fmtCurrency ? fmtCurrency(totalDeductions) : totalDeductions.toLocaleString() + ' ج.م'}</span>
        </div>
      </div>
    </div>
  </div>
  
  <div class="net-salary">
    <div class="net-salary-label">صافي المرتب</div>
    <div class="net-salary-value">${fmtCurrency ? fmtCurrency(netSalaryRounded) : netSalaryRounded.toLocaleString() + ' ج.م'}</div>
  </div>
</body>
</html>
                    `;
                    
                    printWindow.document.write(printContent);
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => {
                      printWindow.print();
                      printWindow.close();
                    }, 250);
                  }}
                />
                <IconButton
                  aria-label="تعديل"
                  icon={<FiEdit />}
                  size="sm"
                  colorScheme="green"
                  bg="green.500"
                  color="white"
                  _hover={{ bg: "green.600" }}
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    setIsEditModalOpen(true);
                  }}
                />
              </HStack>
              <HStack spacing="4" align="center" justify="center" flexWrap="wrap">
                <Text fontSize="lg" fontWeight="bold" color="white">
                  عرض تفاصيل الراتب الشهري
                </Text>
                {selectedDateRange && selectedDateRange[0] && selectedDateRange[1] && (
                  <HStack spacing="2" align="center" ml="4">
                    <Icon as={FiCalendar} color="cyan.300" boxSize="4" />
                    <Text 
                      fontSize="sm" 
                      color="cyan.300" 
                      fontWeight="medium"
                      px="3"
                      py="1"
                      bg="rgba(56, 189, 248, 0.15)"
                      borderRadius="md"
                      border="1px solid rgba(56, 189, 248, 0.3)"
                    >
                      {selectedDateRange[0].format('DD/MM/YYYY')} - {selectedDateRange[1].format('DD/MM/YYYY')}
                    </Text>
                  </HStack>
                )}
              </HStack>
              <HStack spacing="6" align="center" justify="center">
                <HStack spacing="2" as="button" type="button" onClick={handleOpenEmployeeDetailsFromSalary} cursor="pointer" _hover={{ opacity: 0.9 }} title="عرض تفاصيل الموظف">
                  <Icon as={FiUser} color="blue.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">{selectedEmployee?.name || selectedEmployee?.employee_name}</Text>
                </HStack>
                <HStack spacing="2">
                  <Icon as={FiHash} color="green.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">{selectedEmployee?.employee_code}</Text>
                </HStack>
                <HStack spacing="2">
                  <Icon as={FiBriefcase} color="purple.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">{selectedEmployee?.department_description || selectedEmployee?.department || '-'}</Text>
                </HStack>
                <HStack spacing="2">
                  <Icon as={FiDollarSign} color="orange.300" boxSize="4" />
                  <Badge 
                    colorScheme={(selectedEmployee?.salary_type || 'Monthly') === 'Monthly' ? 'purple' : 'blue'}
                    variant="solid"
                    px="2"
                    py="1"
                    borderRadius="full"
                    fontSize="xs"
                    fontWeight="bold"
                  >
                    {(selectedEmployee?.salary_type || 'Monthly') === 'Monthly' ? 'شهري' : 'أسبوعي'}
                  </Badge>
                </HStack>
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
              </VStack>
          </ModalHeader>
          <ModalBody p="8">
            {selectedEmployee && (() => {
              const fmt = (n) => (n || 0).toLocaleString();
  
              // دالة تنسيق القيم للبادجات
              const formatValueForBadge = (value, column) => {
                // استخدام is_currency من قاعدة البيانات أولاً - هذا هو المعيار الوحيد
                if (column.is_currency) {
                  return fmtCurrency ? fmtCurrency(value) : fmt(value);
                }
                
                // إذا لم يكن is_currency = true، اعرض كرقم عادي
                if (value === null || value === undefined || value === '') {
                  return '-';
                } else {
                  return String(value);
                }
              };
              
              // دالة عرض القيمة (بادج أو نص عادي)
              const renderValue = (value, column) => {
                const formattedValue = formatValueForBadge(value, column);
                
                // إذا كان اللون "none"، اعرض النص العادي
                if (column.badge_color === 'none') {
                  return (
                    <Text color="white" fontSize="sm">
                      {formattedValue}
                    </Text>
                  );
                }
                
                // وإلا اعرض البادج
                const badgeColor = column.badge_color || (column.is_calculated ? "green" : column.is_required ? "red" : "blue");
                const badgeVariant = column.badge_variant || "solid";
                
                return (
                  <Badge 
                    colorScheme={badgeColor} 
                    variant={badgeVariant} 
                    fontSize="sm" 
                    px="2" 
                    py="1" 
                    bg={badgeVariant === 'solid' ? `${badgeColor}.500` : undefined}
                    borderColor={badgeVariant === 'outline' ? `${badgeColor}.500` : undefined}
                    color={badgeVariant === 'outline' ? `${badgeColor}.500` : 'white'}
                  >
                    {formattedValue}
                  </Badge>
                );
              };

              return (
                <VStack spacing="6" align="stretch">
                  {/* أقسام المستحقات والمستقطعات كجداول منظمة */}
                  <SimpleGrid columns={2} spacing="6">
                    <Box 
                      bg="var(--stake-bg-primary, #0f212e)"
                      border="1px solid" 
                      borderColor="var(--stake-border-primary, #3e5665)" 
                      borderRadius="xl" 
                      p="6"
                    >
                      <HStack spacing="3" mb="4" justify="space-between">
                        <HStack spacing="3">
                          <Icon as={FiTrendingUp} color="green.300" boxSize="6" />
                          <Text as="span" fontWeight="bold" color="green.200" fontSize="lg">
                            <ChakraEnglishKeyTooltip englishKey="entitlements">المستحقات</ChakraEnglishKeyTooltip>
                          </Text>
                        </HStack>
                        <Menu>
                          <MenuButton as={Button} size="sm" leftIcon={<FiSettings />} colorScheme="green" variant="outline" rightIcon={<FiChevronDown />}>
                            تنظيم الأعمدة
                          </MenuButton>
                          <MenuList minW="280px" className="stake-card" bg="var(--stake-bg-primary)" borderColor="var(--stake-border-primary)">
                            {(entitlementsColumns || []).map((col) => {
                              const isVisible = columnVisibility[col.id] !== undefined ? columnVisibility[col.id] : (col.is_visible !== 0);
                              const visibleIndex = visibleColumns.indexOf(col.id);
                              return (
                                <Box key={col.id} px="3" py="2">
                                  <HStack justify="space-between">
                                    <HStack>
                                      <Switch isChecked={isVisible} onChange={() => { if (isVisible) removeColumnFromDisplay(col.id); else addColumnFromSystem(col); setTimeout(() => savePreferences(false), 100); }} />
                                      <Text fontSize="sm">{col.display_name_ar || col.column_name_ar || col.column_name || col.id}</Text>
                                    </HStack>
                                    <HStack spacing="1">
                                      <IconButton aria-label="أعلى" icon={<FiChevronUp />} size="xs" variant="ghost" onClick={() => moveColumnUp(col.id)} isDisabled={!isVisible || visibleIndex <= 0} />
                                      <IconButton aria-label="أسفل" icon={<FiChevronDown />} size="xs" variant="ghost" onClick={() => moveColumnDown(col.id)} isDisabled={!isVisible || visibleIndex < 0 || visibleIndex >= visibleColumns.length - 1} />
                                    </HStack>
                                  </HStack>
                                </Box>
                              );
                            })}
                          </MenuList>
                        </Menu>
                      </HStack>
                      <TableContainer>
                        <Table size="sm" variant="simple" bg="var(--stake-bg-secondary, #111827)" borderRadius="lg" overflow="hidden">
                          <Tbody>
                            {/* عرض الأعمدة المرئية للمستحقات من النظام المبسط */}
                            {(() => {
                              // استخدام نفس منطق المستقطعات - أبسط وأكثر فعالية
                              // إزالة التكرار من أعمدة المستحقات
                              const seenKeys = new Set();
                              const seenNames = new Set();
                              const seenIds = new Set();
                              const uniqueColumns = [];
                              
                              // أولاً: إضافة الأعمدة المرئية من entitlementsColumns
                              for (const col of entitlementsColumns) {
                                if (!col) continue;
                                
                                const key = col.column_key || col.column_name || col.name;
                                const name = col.display_name_ar || col.column_name_ar || '';
                                const id = col.id;
                                const isReference = col.type === 'reference';
                                const isTotalEntitlements = (key === 'total_entitlements' || name === 'إجمالي المستحقات');
                                
                                // لا نزيل أي أعمدة بناءً على قائمة ثابتة
                                // نعتمد فقط على is_visible من قاعدة البيانات و visibleColumns
                                // المستخدم يتحكم في الرؤية من خلال toggle "مرئي" في تنظيم الأعمدة
                                
                                // إزالة "السلفة" (advance_amount) من المستحقات - لأنها تُعطى باليد ولا تُضاف للمستحقات
                                if (name === 'سلفة' || key === 'advance_amount' || key === 'advance') {
                                  continue; // تخطي عمود السلفة
                                }
                                
                                // للمراجع و"إجمالي المستحقات"، نعرضها دائماً حتى لو كانت is_visible = 0
                                if (isReference || isTotalEntitlements) {
                                  // التحقق من وجود عمود عادي بنفس column_key - إذا كان موجوداً، نحذفه ونحتفظ بالمرجع فقط
                                  const existingNormalColIndex = uniqueColumns.findIndex(uc => {
                                    const ucKey = uc.column_key || uc.column_name || uc.name;
                                    return ucKey === key && uc.type !== 'reference';
                                  });
                                  
                                  if (existingNormalColIndex >= 0) {
                                    debugLog('🔄 Removing normal column in favor of reference:', { id, key, name });
                                    const removedCol = uniqueColumns.splice(existingNormalColIndex, 1)[0];
                                    seenKeys.delete(key);
                                    seenNames.delete(removedCol.display_name_ar || removedCol.column_name_ar || '');
                                    seenIds.delete(removedCol.id);
                                  }
                                  
                                  // التحقق من عدم التكرار بناءً على column_key للمراجع
                                  if (key && seenKeys.has(key)) {
                                    // إذا كان هناك مرجع آخر بنفس column_key، نحتفظ بأحدهم فقط
                                    const existingRefIndex = uniqueColumns.findIndex(uc => {
                                      const ucKey = uc.column_key || uc.column_name || uc.name;
                                      return ucKey === key && uc.type === 'reference';
                                    });
                                    
                                    if (existingRefIndex >= 0) {
                                      debugWarn('⚠️ Skipping duplicate reference (column_key):', { id, key, name });
                                      continue; // تخطي المرجع المكرر
                                    }
                                  }
                                  
                                  // التحقق من id أيضاً
                                  if (id && seenIds.has(id)) {
                                    debugWarn('⚠️ Skipping duplicate reference/total_entitlements (id):', { id, key, name });
                                    continue; // تخطي إذا كان id مكرراً
                                  }
                                  
                                  if (key) seenKeys.add(key);
                                  if (name) seenNames.add(name);
                                  if (id) seenIds.add(id);
                                  uniqueColumns.push(col);
                                  continue;
                                }
                                
                                // للأعمدة العادية، نتحقق من is_visible
                                if (col.is_visible === 0) continue;
                                
                                // التحقق من وجود مرجع بنفس column_key - إذا كان موجوداً، نتجاهل العمود العادي
                                if (key && seenKeys.has(key)) {
                                  const existingRef = uniqueColumns.find(uc => {
                                    const ucKey = uc.column_key || uc.column_name || uc.name;
                                    return ucKey === key && uc.type === 'reference';
                                  });
                                  
                                  if (existingRef) {
                                    debugLog('🚫 Skipping normal column - reference exists:', { id, key, name });
                                    continue; // تخطي العمود العادي إذا كان هناك مرجع
                                  }
                                }
                                
                                // التحقق من عدم التكرار بناءً على column_key أولاً
                                if (key && seenKeys.has(key)) {
                                  continue; // تخطي العمود المكرر
                                }
                                
                                // التحقق من display_name_ar أيضاً (للتأكد من عدم تكرار الأعمدة بنفس الاسم)
                                if (name && seenNames.has(name)) {
                                  continue; // تخطي العمود المكرر
                                }
                                
                                // التحقق من id أيضاً
                                if (id && seenIds.has(id)) {
                                  continue; // تخطي العمود المكرر
                                }
                                
                                // إضافة العمود إذا لم يكن مكرراً
                                if (key) seenKeys.add(key);
                                if (name) seenNames.add(name);
                                if (id) seenIds.add(id);
                                uniqueColumns.push(col);
                              }
                              
                              // ترتيب الأعمدة حسب visibleColumns إذا كان موجوداً
                              const orderedColumns = uniqueColumns.sort((a, b) => {
                                const indexA = visibleColumns.indexOf(a.id);
                                const indexB = visibleColumns.indexOf(b.id);
                                if (indexA >= 0 && indexB >= 0) return indexA - indexB;
                                if (indexA >= 0) return -1; // الأعمدة في visibleColumns تأتي أولاً
                                if (indexB >= 0) return 1;
                                // للمراجع و"إجمالي المستحقات"، نضعها في النهاية
                                const aIsTotal = (a.column_key === 'total_entitlements' || a.display_name_ar === 'إجمالي المستحقات');
                                const bIsTotal = (b.column_key === 'total_entitlements' || b.display_name_ar === 'إجمالي المستحقات');
                                if (aIsTotal && !bIsTotal) return 1; // a في النهاية
                                if (!aIsTotal && bIsTotal) return -1; // b في النهاية
                                return (a.display_order || 999) - (b.display_order || 999);
                              });
                              
                              // نقل "إجمالي المستحقات" إلى النهاية
                              const totalEntitlementsIndex = orderedColumns.findIndex(col => {
                                const key = col.column_key || col.column_name || col.name;
                                const name = col.display_name_ar || col.column_name_ar || '';
                                return key === 'total_entitlements' || name === 'إجمالي المستحقات';
                              });
                              
                              if (totalEntitlementsIndex >= 0 && totalEntitlementsIndex < orderedColumns.length - 1) {
                                const totalEntitlementsCol = orderedColumns.splice(totalEntitlementsIndex, 1)[0];
                                orderedColumns.push(totalEntitlementsCol);
                              }
                              
                              // التحقق من وجود "التمييز والحوافز" في الأعمدة المرتبة قبل إضافته
                              const hasDiscriminationIncentive = orderedColumns.some(col => {
                                const key = col.column_key || col.column_name || col.name;
                                const name = col.display_name_ar || col.column_name_ar || '';
                                return key === 'discrimination_incentive_allowance' || name === 'التمييز والحوافز';
                              });
                              
                              // إضافة "التمييز والحوافز" فقط إذا لم يكن موجوداً
                              if (!hasDiscriminationIncentive) {
                                const discriminationIncentiveCol = {
                                  id: 'discrimination_incentive_allowance_ref',
                                  display_name_ar: 'التمييز والحوافز',
                                  column_key: 'discrimination_incentive_allowance',
                                  column_name: 'discrimination_incentive_allowance',
                                  type: 'reference',
                                  is_visible: 1,
                                  display_order: 2,
                                  badge_color: 'orange',
                                  badge_variant: 'solid',
                                  is_currency: 1,
                                };
                                
                                // البحث عن موضع "الأساسي" و"أجر الساعة" في الأعمدة المرتبة
                                const baseSalaryIndex = orderedColumns.findIndex(col => 
                                  (col.display_name_ar === 'الراتب الأساسي' || 
                                   col.display_name_ar === 'الأساسي' ||
                                   col.column_key === 'base_salary' ||
                                   col.column_name === 'base_salary' ||
                                   col.column_key === 'basic_monthly_salary' ||
                                   col.column_name === 'basic_monthly_salary')
                                );
                                const hourlyWageIndex = orderedColumns.findIndex(col => 
                                  col.display_name_ar === 'أجر الساعة' || 
                                  col.column_key === 'hourly_wage' ||
                                  col.column_name === 'hourly_wage'
                                );
                                
                                // إضافة "التمييز والحوافز" بعد "الأساسي" إذا كان موجوداً، أو قبل "أجر الساعة" إذا لم يكن "الأساسي" موجوداً
                                if (baseSalaryIndex >= 0) {
                                  // إدراج بعد "الأساسي"
                                  orderedColumns.splice(baseSalaryIndex + 1, 0, discriminationIncentiveCol);
                                } else if (hourlyWageIndex >= 0) {
                                  // إدراج قبل "أجر الساعة"
                                  orderedColumns.splice(hourlyWageIndex, 0, discriminationIncentiveCol);
                                } else {
                                  // إذا لم يكن أي منهما موجوداً، أضفه في البداية
                                  orderedColumns.unshift(discriminationIncentiveCol);
                                }
                              }
                              
                              return orderedColumns;
                            })()
                              .flatMap((column, index) => {
                                // استخدام resolveDataKey أولاً للحصول على المفتاح الصحيح
                                let key = resolveDataKey(column, selectedEmployee);
                                // إذا لم يعطِ resolveDataKey نتيجة، استخدم column_key
                                if (!key) {
                                  key = column.column_key || column.column_name || column.name;
                                }
                                
                                // التحقق إذا كان العمود هو "التمييز والحوافز"
                                const isDiscriminationIncentive = column.display_name_ar === 'التمييز والحوافز' || 
                                                                  column.column_key === 'discrimination_incentive_allowance' ||
                                                                  column.column_name === 'discrimination_incentive_allowance';
                                
                                // إضافة صف "ساعات العمل" قبل "أيام الانتظام"
                                const isOnTimeDays = column.display_name_ar === 'أيام الانتظام' || 
                                                     column.column_name === 'on_time_days' ||
                                                     column.column_key === 'on_time_days';
                                
                                const workHours = parseFloat(selectedEmployee?.work_hours) || 0;
                                const rows = [];
                                
                                // إذا كان هذا العمود هو "أيام الانتظام"، أضف صف "ساعات العمل" قبله
                                if (isOnTimeDays && workHours > 0) {
                                  rows.push(
                                    <Tr key={`entitlement-work_hours`} _hover={{ bg: "#2f4553" }} transition="all 0.2s">
                                      <Td color="white" verticalAlign="top">
                                        <HStack spacing="2" align="center">
                                          <ChakraEnglishKeyTooltip englishKey="work_hours">
                                            ساعات العمل
                                          </ChakraEnglishKeyTooltip>
                                        </HStack>
                                      </Td>
                                      <Td isNumeric fontFamily="mono" verticalAlign="top">
                                        {workHours.toFixed(2)} س
                                      </Td>
                                    </Tr>
                                  );
                                }
                                
                                // التحقق من كلا المفتاحين المحتملين للمكافأة الخاصة
                                const isTotalEntitlementsCol = (key === 'total_entitlements' || column.display_name_ar === 'إجمالي المستحقات');
                                let value = 0;
                                if (isDiscriminationIncentive) {
                                  // إذا كان العمود هو "التمييز والحوافز"، استخدم القيمة من selectedEmployee
                                  value = parseFloat(selectedEmployee?.discrimination_incentive_allowance) || 0;
                                } else if (key === 'special_bonus') {
                                  value = selectedEmployee?.special_bonus ?? 0;
                                } else if (isTotalEntitlementsCol) {
                                  // إجمالي المستحقات بدون أجر الإضافي (الموظف الشهري يأخذ أجر الإضافي أسبوعياً - للعرض كمرجع فقط)
                                  const total = parseFloat(selectedEmployee?.total_entitlements) || 0;
                                  const overtimePay = parseFloat(selectedEmployee?.overtime_pay) || 0;
                                  value = total - overtimePay;
                                } else {
                                  value = key ? (selectedEmployee?.[key] ?? 0) : 0;
                                }
                                
                                // التحقق إذا كان العمود هو "ساعات الإضافي" لعرض التفاصيل
                                const isOvertimeHours = column.display_name_ar === 'ساعات الإضافي' || 
                                                       column.column_name === 'overtime_hours' ||
                                                       column.column_key === 'overtime_hours';
                                
                                // الحصول على قيم ساعات الإضافي من البيانات
                                const regularOvertime = parseFloat(selectedEmployee?.regular_overtime_hours) || 0;
                                const holidayOvertime = parseFloat(selectedEmployee?.holiday_overtime_hours) || 0;
                                
                                // إضافة صف العمود الحالي
                                rows.push(
                                  <Tr key={`entitlement-${column.id || column.column_key || column.column_name || column.name || index}`} _hover={{ bg: "#2f4553" }} transition="all 0.2s">
                                    <Td color="white" verticalAlign="top">
                                      <HStack spacing="2" align="center">
                                        <ChakraEnglishKeyTooltip englishKey={column.name}>
                                          {isOvertimeHours ? (
                                            <Text fontSize="xs" lineHeight="1.4" whiteSpace="normal">
                                              {column.display_name_ar}{' '}
                                              <Text as="span" fontSize="sm" color="green.200">
                                                {formatOvertimeHoursPairLabel(
                                                  regularOvertime,
                                                  holidayOvertime,
                                                  selectedEmployee?.total_overtime_hours
                                                )}
                                              </Text>
                                            </Text>
                                          ) : (
                                            column.display_name_ar
                                          )}
                                        </ChakraEnglishKeyTooltip>
                                      </HStack>
                                    </Td>
                                    <Td isNumeric fontFamily="mono" verticalAlign="top">
                                      {renderValue(value, column)}
                                    </Td>
                                  </Tr>
                                );
                                
                                return rows;
                              })}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    </Box>
                    <Box 
                      bg="var(--stake-bg-primary, #0f212e)"
                      border="1px solid" 
                      borderColor="var(--stake-border-primary, #3e5665)" 
                      borderRadius="xl" 
                      p="6"
                    >
                      <HStack spacing="3" mb="4" justify="space-between">
                        <HStack spacing="3">
                          <Icon as={FiTrendingDown} color="red.300" boxSize="6" />
                          <Text as="span" fontWeight="bold" color="red.200" fontSize="lg">
                            <ChakraEnglishKeyTooltip englishKey="deductions">المستقطعات</ChakraEnglishKeyTooltip>
                          </Text>
                        </HStack>
                        <Menu>
                          <MenuButton as={Button} size="sm" leftIcon={<FiSettings />} colorScheme="red" variant="outline" rightIcon={<FiChevronDown />}>
                            تنظيم الأعمدة
                          </MenuButton>
                          <MenuList minW="280px" className="stake-card" bg="var(--stake-bg-primary)" borderColor="var(--stake-border-primary)">
                            {(deductionsColumns || []).map((col) => {
                              const isVisible = visibleDeductionColumns.includes(col.id);
                              const visibleIndex = visibleDeductionColumns.indexOf(col.id);
                              return (
                                <Box key={col.id} px="3" py="2">
                                  <HStack justify="space-between">
                                    <HStack>
                                      <Switch isChecked={isVisible} onChange={() => { if (isVisible) removeDeductionColumnFromDisplay(col.id); else addDeductionColumnFromSystem(col); setTimeout(() => savePreferences(false), 100); }} />
                                      <Text fontSize="sm">{col.display_name_ar || col.column_name_ar || col.column_name || col.id}</Text>
                                    </HStack>
                                    <HStack spacing="1">
                                      <IconButton aria-label="أعلى" icon={<FiChevronUp />} size="xs" variant="ghost" onClick={() => moveDeductionColumnUp(col.id)} isDisabled={!isVisible || visibleIndex <= 0} />
                                      <IconButton aria-label="أسفل" icon={<FiChevronDown />} size="xs" variant="ghost" onClick={() => moveDeductionColumnDown(col.id)} isDisabled={!isVisible || visibleIndex < 0 || visibleIndex >= visibleDeductionColumns.length - 1} />
                                    </HStack>
                                  </HStack>
                                </Box>
                              );
                            })}
                          </MenuList>
                        </Menu>
                      </HStack>
                      <TableContainer>
                        <Table size="sm" variant="simple" bg="var(--stake-bg-secondary, #111827)" borderRadius="lg" overflow="hidden">
                          <Tbody>
                            {/* عرض الأعمدة المرئية للمستقطعات من النظام المبسط مع ضمان ظهور خصم السلفة حتى لو لم يكن العمود مفعلاً */}
                            {(() => {
                              // إزالة التكرار من أعمدة المستقطعات
                              const seenKeys = new Set();
                              const seenNames = new Set();
                              const seenIds = new Set();
                              const uniqueDeductions = [];
                              
                              for (const col of deductionsColumns) {
                                if (!col || col.is_visible === 0) continue;
                                
                                const key = col.column_key || col.column_name || col.name;
                                const name = col.display_name_ar || col.column_name_ar || '';
                                const id = col.id;
                                
                                // التحقق من عدم التكرار بناءً على column_key أولاً
                                if (key && seenKeys.has(key)) {
                                  continue; // تخطي العمود المكرر
                                }
                                
                                // التحقق من display_name_ar أيضاً (للتأكد من عدم تكرار الأعمدة بنفس الاسم)
                                // خاصة للأعمدة المهمة مثل "خصم السلفة"
                                if (name && (name === 'سلفة' || name === 'خصم السلفة' || name === 'قسط السلفة')) {
                                  if (seenNames.has(name)) {
                                    continue; // تخطي العمود المكرر
                                  }
                                  seenNames.add(name);
                                }
                                
                                // التحقق من id أيضاً
                                if (id && seenIds.has(id)) {
                                  continue; // تخطي العمود المكرر
                                }
                                
                                // إضافة العمود إذا لم يكن مكرراً
                                if (key) seenKeys.add(key);
                                if (id) seenIds.add(id);
                                uniqueDeductions.push(col);
                              }

                              const rows = [];
                              let hasAdvanceInstallmentRow = false;
                              
                              uniqueDeductions.forEach((column, index) => {
                                const key = column.column_key || column.column_name || column.name || resolveDataKey(column, selectedEmployee);
                                const value = key ? (selectedEmployee?.[key] ?? 0) : 0;
                                
                                const isCalculated = column.is_calculated;
                                const isRequired = column.is_required;
                                
                                // التحقق إذا كان العمود هو "خصم السلفة" لعرض رقم القسط
                                const isAdvanceInstallment = column.display_name_ar === 'خصم السلفة' || 
                                                           column.display_name_ar === 'قسط السلفة' ||
                                                           column.column_name === 'advance_installment' ||
                                                           column.column_key === 'advance_installment';
                                const installmentNumber = selectedEmployee?.advance_installment_number || 0;
                                const totalInstallments = selectedEmployee?.total_installments || 0;
                                const advanceInstallmentIsPaid = selectedEmployee?.advance_installment_is_paid ?? 0;
                                const isDeferred = advanceInstallmentIsPaid === 2;

                                if (isAdvanceInstallment) {
                                  hasAdvanceInstallmentRow = true;
                                }
                                
                                rows.push(
                                  <React.Fragment key={`deduction-${column.id || column.column_key || column.column_name || column.name || index}`}>
                                    <Tr _hover={{ bg: "#2f4553" }} transition="all 0.2s">
                                      <Td color="white">
                                        <ChakraEnglishKeyTooltip englishKey={column.name}>
                                          {isAdvanceInstallment && isDeferred ? (
                                            <Text>قسط مرحل للفترة التالية</Text>
                                          ) : isAdvanceInstallment && installmentNumber > 0 && totalInstallments > 0 ? (
                                            <HStack spacing="2" align="center">
                                              <Text>{column.display_name_ar}</Text>
                                              <Text fontSize="xs" color="white">
                                                (قسط {installmentNumber} من أصل {totalInstallments})
                                              </Text>
                                            </HStack>
                                          ) : (
                                            column.display_name_ar
                                          )}
                                        </ChakraEnglishKeyTooltip>
                                      </Td>
                                      <Td isNumeric fontFamily="mono">
                                        <Badge 
                                          colorScheme={column.badge_color || (isCalculated ? "red" : isRequired ? "red" : "orange")} 
                                          variant={column.badge_variant || "solid"} 
                                          fontSize="sm" 
                                          px="2" 
                                          py="1" 
                                          bg={column.badge_variant === 'solid' ? `${column.badge_color || 'blue'}.500` : undefined}
                                          borderColor={column.badge_variant === 'outline' ? `${column.badge_color || 'blue'}.500` : undefined}
                                          color={column.badge_variant === 'outline' ? `${column.badge_color || 'blue'}.500` : 'white'}
                                        >
                                          {isAdvanceInstallment && isDeferred ? '0.00' : formatValueForBadge(value, column)}
                                        </Badge>
                                      </Td>
                                    </Tr>
                                  </React.Fragment>
                                );
                              });

                              // إذا لم يكن هناك عمود "خصم السلفة" مفعّل في النظام الديناميكي، نضيف صفاً يدوياً باستخدام advance_installment
                              if (!hasAdvanceInstallmentRow) {
                                const value = parseFloat(selectedEmployee?.advance_installment || selectedEmployee?.advance_installment_amount) || 0;
                                const formattedValue = fmtCurrency ? fmtCurrency(value) : value.toLocaleString() + ' ج.م';

                                rows.push(
                                  <Tr key="deduction-manual-advance-installment" _hover={{ bg: "#2f4553" }} transition="all 0.2s">
                                    <Td color="white">
                                      <ChakraEnglishKeyTooltip englishKey="advance_installment">
                                        خصم السلفة
                                      </ChakraEnglishKeyTooltip>
                                    </Td>
                                    <Td isNumeric fontFamily="mono">
                                      <Badge 
                                        colorScheme="orange"
                                        variant="solid"
                                        fontSize="sm"
                                        px="2"
                                        py="1"
                                      >
                                        {formattedValue}
                                      </Badge>
                                    </Td>
                                  </Tr>
                                );
                              }

                              return rows;
                            })()}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </SimpleGrid>
                </VStack>
              );
            })()}
          </ModalBody>
          <ModalFooter 
            display="flex" 
            justifyContent="center" 
            alignItems="center"
            bg="var(--stake-bg-primary, #0f212e)"
            borderRadius="0 0 24px 24px"
            p="4"
            borderTop="2px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
          >
            <HStack spacing="2" align="center" flexWrap="wrap">
              <Text fontSize="sm" color="gray.400" fontWeight="medium" whiteSpace="nowrap">
                صافي المرتب:
              </Text>
              <Text fontSize="xl" fontWeight="bold" color="blue.300" whiteSpace="nowrap">
                {(() => {
                  const tot = parseFloat(selectedEmployee?.total_entitlements) || 0;
                  const ov = parseFloat(selectedEmployee?.overtime_pay) || 0;
                  const ded = parseFloat(selectedEmployee?.total_deductions) || 0;
                  const netRaw = tot - ov - ded;
                  const roundedNet = Math.round(netRaw / 5) * 5;
                  return fmtCurrency ? fmtCurrency(roundedNet) : roundedNet.toLocaleString() + ' ج.م';
                })()}
              </Text>
              <Text as="span" className="rounding-diff-no-print" fontSize="sm" color="var(--stake-text-muted)" whiteSpace="nowrap">
                {(() => {
                  const tot = parseFloat(selectedEmployee?.total_entitlements) || 0;
                  const ov = parseFloat(selectedEmployee?.overtime_pay) || 0;
                  const ded = parseFloat(selectedEmployee?.total_deductions) || 0;
                  const netRaw = tot - ov - ded;
                  const roundedNet = Math.round(netRaw / 5) * 5;
                  const diff = roundedNet - netRaw;
                  const sign = diff >= 0 ? '+' : '';
                  return ` (فروقات تقريب ${sign}${diff.toFixed(2)})`;
                })()}
              </Text>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal مبلغ الإضافي + تفاصيل ساعات الإضافي لجميع الموظفين (حسب فلتر الفترة) */}
      <Modal isOpen={isOvertimeModalOpen} onClose={() => setIsOvertimeModalOpen(false)} size="6xl" isCentered scrollBehavior="inside">
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden" maxH="90vh">
          <ModalHeader
            bg="var(--stake-bg-primary, #0f212e)"
            color="white"
            borderRadius="24px 24px 0 0"
            p="4"
            boxShadow="0 4px 20px rgba(0, 0, 0, 0.4)"
          >
            <HStack justify="space-between" align="center" w="100%">
              <HStack spacing="3">
                <Icon as={FiClock} boxSize="6" color="orange.300" />
                <VStack align="flex-start" spacing="0">
                  <Text fontSize="lg" fontWeight="bold">مبلغ الإضافي + تفاصيل ساعات الإضافي</Text>
                  <Text fontSize="sm" color="gray.400" fontWeight="normal">
                    الفترة: {selectedDateRange?.[0]?.format?.('DD/MM/YYYY') || '-'} — {selectedDateRange?.[1]?.format?.('DD/MM/YYYY') || '-'}
                  </Text>
                </VStack>
              </HStack>
              <ModalCloseButton color="white" _hover={{ bg: 'whiteAlpha.200' }} />
            </HStack>
          </ModalHeader>
          <ModalBody p="6" overflowY="auto">
            <TableContainer>
              <Table size="sm" variant="simple" className="stake-table">
                <Thead bg="var(--stake-bg-secondary, #111827)">
                  <Tr>
                    <Th color="gray.300">#</Th>
                    <Th color="gray.300">الاسم</Th>
                    <Th color="gray.300">كود الموظف</Th>
                    <Th color="gray.300">القسم</Th>
                    <Th color="gray.300">ساعات الإضافي العادية</Th>
                    <Th color="gray.300">ساعات الإضافي العطلات</Th>
                    <Th color="gray.300">مبلغ الإضافي (ج.م)</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredData.map((row, index) => {
                    const regularOvertime = parseFloat(row.regular_overtime_hours) || 0;
                    const holidayOvertime = parseFloat(row.holiday_overtime_hours) || 0;
                    const overtimePay = parseFloat(row.overtime_pay ?? row.overtime_total_amount ?? row.overtime_amount) || 0;
                    return (
                      <Tr key={row.id || row.employee_id || index} _hover={{ bg: 'var(--stake-bg-hover)' }}>
                        <Td color="gray.400">{index + 1}</Td>
                        <Td fontWeight="medium">{row.name || '-'}</Td>
                        <Td>{row.employee_code || '-'}</Td>
                        <Td>{row.department_description || row.department || '-'}</Td>
                        <Td isNumeric fontFamily="mono">{regularOvertime.toFixed(2)}</Td>
                        <Td isNumeric fontFamily="mono">{holidayOvertime.toFixed(2)}</Td>
                        <Td isNumeric fontWeight="semibold" color="orange.300">
                          {fmtCurrency ? fmtCurrency(overtimePay) : overtimePay.toLocaleString() + ' ج.م'}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </TableContainer>
            {filteredData.length === 0 && (
              <Center py="8">
                <Text color="gray.500">لا يوجد موظفين ضمن الفلتر الحالي.</Text>
              </Center>
            )}
          </ModalBody>
          <ModalFooter
            bg="var(--stake-bg-primary, #0f212e)"
            borderTop="2px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
            p="4"
          >
            <HStack spacing="3">
              <Button
                leftIcon={<FiPrinter />}
                colorScheme="blue"
                onClick={() => {
                  const periodStr = selectedDateRange?.[0]?.format?.('DD/MM/YYYY') && selectedDateRange?.[1]?.format?.('DD/MM/YYYY')
                    ? `${selectedDateRange[0].format('DD/MM/YYYY')} - ${selectedDateRange[1].format('DD/MM/YYYY')}`
                    : '-';
                  const rowsHtml = filteredData.map((row, index) => {
                    const regularOvertime = parseFloat(row.regular_overtime_hours) || 0;
                    const holidayOvertime = parseFloat(row.holiday_overtime_hours) || 0;
                    const overtimePay = parseFloat(row.overtime_pay ?? row.overtime_total_amount ?? row.overtime_amount) || 0;
                    const payStr = fmtCurrency ? fmtCurrency(overtimePay) : overtimePay.toLocaleString() + ' ج.م';
                    return `<tr><td>${index + 1}</td><td>${row.name || '-'}</td><td>${row.employee_code || '-'}</td><td>${row.department_description || row.department || '-'}</td><td>${regularOvertime.toFixed(2)}</td><td>${holidayOvertime.toFixed(2)}</td><td>${payStr}</td></tr>`;
                  }).join('');
                  const printContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>مبلغ الإضافي وتفاصيل ساعات الإضافي</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; color: #1a1a1a; }
    h1 { font-size: 1.5rem; margin-bottom: 4px; }
    .period { color: #666; font-size: 0.95rem; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: right; }
    th { background: #111827; color: #eee; }
    tr:nth-child(even) { background: #f5f5f5; }
    .footer { margin-top: 20px; font-size: 0.85rem; color: #666; }
  </style>
</head>
<body>
  <h1>مبلغ الإضافي + تفاصيل ساعات الإضافي</h1>
  <div class="period">الفترة: ${periodStr}</div>
  <table>
    <thead><tr><th>#</th><th>الاسم</th><th>كود الموظف</th><th>القسم</th><th>ساعات الإضافي العادية</th><th>ساعات الإضافي العطلات</th><th>مبلغ الإضافي (ج.م)</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="footer">عدد الموظفين: ${filteredData.length}</div>
</body>
</html>`;
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(printContent);
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
                  }
                }}
              >
                طباعة
              </Button>
              <Button variant="ghost" onClick={() => setIsOvertimeModalOpen(false)}>إغلاق</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal التعديل */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} size="lg" isCentered>
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
                  {(selectedEmployee?.salary_type || 'Monthly') === 'Weekly' ? 'تعديل بيانات الأجر' : 'تعديل بيانات الراتب'} - {selectedEmployee?.name || selectedEmployee?.employee_name}
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
          <ModalBody
            p="8"
            sx={{
              '& input[type=number]': { MozAppearance: 'textfield' },
              '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 }
            }}
          >
            {selectedEmployee && (
              <VStack spacing="4" align="stretch">
                <FormControl>
                  <FormLabel className="stake-label">مكافأة خاصة</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={selectedEmployee.special_bonus ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedEmployee(prev => ({ ...prev, special_bonus: v === '' ? 0 : parseFloat(v) || 0 }));
                    }}
                    className="stake-input"
                    bg="var(--stake-bg-secondary, #111827)"
                    borderColor="var(--stake-border-primary, #2f4553)"
                    color="white"
                    _focus={{ borderColor: '#3b82f6', boxShadow: '0 0 0 1px #3b82f6' }}
                    _hover={{ borderColor: '#4a5568' }}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel className="stake-label">بدل المواصلات</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={selectedEmployee.transport_allowance ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedEmployee(prev => ({ ...prev, transport_allowance: v === '' ? 0 : parseFloat(v) || 0 }));
                    }}
                    className="stake-input"
                    bg="var(--stake-bg-secondary, #111827)"
                    borderColor="var(--stake-border-primary, #2f4553)"
                    color="white"
                    _focus={{ borderColor: '#3b82f6', boxShadow: '0 0 0 1px #3b82f6' }}
                    _hover={{ borderColor: '#4a5568' }}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel className="stake-label">المستقطع من السلف (لهذا الشهر)</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={selectedEmployee.advance_installment ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedEmployee(prev => ({ ...prev, advance_installment: v === '' ? 0 : parseFloat(v) || 0 }));
                    }}
                    className="stake-input"
                    bg="var(--stake-bg-secondary, #111827)"
                    borderColor="var(--stake-border-primary, #2f4553)"
                    color="white"
                    _focus={{ borderColor: '#3b82f6', boxShadow: '0 0 0 1px #3b82f6' }}
                    _hover={{ borderColor: '#4a5568' }}
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
            borderRadius="0 0 24px 24px"
            p="4"
            borderTop="1px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
          >
            <HStack spacing="3">
              <Button className="stake-btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                إلغاء
              </Button>
              <Button 
                className="stake-btn-success"
              onClick={async () => {
                try {
                  const monthStart = rangePickerValue[0]?.format('YYYY-MM-DD');
                  const monthEnd = rangePickerValue[1]?.format('YYYY-MM-DD');
                  // حفظ المكافأة الخاصة في النظام الديناميكي
                  if (selectedEmployee.special_bonus !== undefined) {
                    const response = await fetch(getApiUrl('/api/unified_salary_api_v2.php'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'upsert_monthly_special_bonus',
                        employee_id: selectedEmployee.employee_id,
                        amount: selectedEmployee.special_bonus,
                        special_bonus: selectedEmployee.special_bonus,
                        month_start: monthStart,
                        month_end: monthEnd
                      }),
                    });
                    const respText = await response.text();
                    let data = null;
                    try { data = respText ? JSON.parse(respText) : null; } catch (_) { data = { success: false, message: 'استجابة غير صالحة من الخادم' }; }
                    if (!response.ok || !data || !data.success) {
                      throw new Error((data && data.message) ? data.message : 'فشل في حفظ المكافأة الخاصة');
                    }
                  }
                  // حفظ بدل المواصلات (يدوي) للفترة الشهرية
                  if (monthStart && monthEnd && selectedEmployee.employee_id != null) {
                    const transportRes = await fetch(getApiUrl('/api/unified_salary_api_v2.php'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'upsert_monthly_transport_allowance',
                        employee_id: selectedEmployee.employee_id,
                        transport_allowance: parseFloat(selectedEmployee.transport_allowance) || 0,
                        month_start: monthStart,
                        month_end: monthEnd
                      }),
                    });
                    const transportText = await transportRes.text();
                    let transportData = null;
                    try { transportData = transportText ? JSON.parse(transportText) : null; } catch (_) { transportData = { success: false }; }
                    if (!transportRes.ok || !transportData || !transportData.success) {
                      throw new Error((transportData && transportData.message) ? transportData.message : 'فشل في حفظ بدل المواصلات');
                    }
                  }
                  // حفظ المستقطع من السلف (شهري) لربط الراتب الشهري بجدول السلف
                  if (monthStart && monthEnd && selectedEmployee.employee_id != null) {
                    const advRes = await fetch(getApiUrl('/api/advances_api.php'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'set_advance_deducted',
                        employee_id: selectedEmployee.employee_id,
                        period_start: monthStart,
                        period_end: monthEnd,
                        amount: parseFloat(selectedEmployee.advance_installment) || 0
                      })
                    });
                    const advResultText = await advRes.text();
                    let advResult = null;
                    try { advResult = advResultText ? JSON.parse(advResultText) : null; } catch (_) { advResult = { success: false, message: 'استجابة غير صالحة من خادم السلف' }; }
                    if (!advRes.ok || !advResult || !advResult.success) {
                      const msg = advResult && advResult.message ? advResult.message : 'فشل في حفظ المستقطع من السلف';
                      throw new Error(msg);
                    }
                  }
                  toast({
                    title: "تم الحفظ",
                    description: "تم حفظ التغييرات بنجاح",
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                  });
                  setIsEditModalOpen(false);
                  fetchData(); // إعادة تحميل البيانات
                } catch (error) {
                  debugError('خطأ في حفظ بيانات الراتب الشهري:', error);
                  toast({
                    title: "خطأ في الاتصال",
                    description: error.message || "حدث خطأ أثناء حفظ التغييرات",
                    status: "error",
                    duration: 4000,
                    isClosable: true,
                  });
                }
              }}
            >
              حفظ التغييرات
            </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* مودال تفاصيل الموظف (يُفتح عند النقر على اسم الموظف في مودال عرض تفاصيل الراتب الشهري) */}
      <Modal isOpen={isEmployeeDetailsOpen} onClose={() => { onEmployeeDetailsClose(); setEmployeeDetailsData(null); }} size="4xl" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden">
          <ModalHeader bg="var(--stake-bg-primary, #0f212e)" color="white" borderRadius="24px 24px 0 0" p="4" position="relative">
            <HStack justify="space-between" align="center" w="full">
              <Text fontSize="lg" fontWeight="bold">تفاصيل الموظف</Text>
              {employeeDetailsData && (
                <HStack spacing="6" align="center" flex="1" justify="center">
                  <HStack spacing="2">
                    <Icon as={FiUser} color="blue.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">{employeeDetailsData.name_ar || employeeDetailsData.name || 'غير محدد'}</Text>
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
                      <Text fontSize="sm" className="stake-text-secondary">{employeeDetailsData.department_description || employeeDetailsData.department || '-'}</Text>
                    </HStack>
                  ) : (
                    <HStack spacing="2">
                      <Icon as={FiTarget} color="blue.300" boxSize="4" />
                      <Text fontSize="sm" className="stake-text-secondary">{employeeDetailsData.cost_center || '-'}</Text>
                    </HStack>
                  )}
                  <HStack spacing="2">
                    <Icon as={FiDollarSign} color="orange.300" boxSize="4" />
                    <Badge colorScheme={employeeDetailsData.salary_type === 'Monthly' ? 'purple' : 'blue'} variant="solid" px="2" py="1" borderRadius="md" fontSize="xs">
                      {employeeDetailsData.salary_type === 'Monthly' ? 'شهري' : 'أسبوعي'}
                    </Badge>
                  </HStack>
                </HStack>
              )}
              <Box w="40px" />
              <ModalCloseButton color="white" bg="rgba(255, 255, 255, 0.1)" borderRadius="full" size="md" _hover={{ bg: 'rgba(255, 255, 255, 0.2)' }} _active={{ transform: 'scale(0.95)' }} />
            </HStack>
          </ModalHeader>
          <ModalBody p="8">
            {employeeDetailsData && (
              <VStack spacing="6" align="stretch">
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">معلومات الراتب</Text>
                  <SimpleGrid columns={{ base: 1, md: 4 }} spacing="4">
                    <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">الراتب الأساسي</Text>
                        <Text fontSize="md" fontWeight="bold" color="green.400">{fmtCurrency(employeeDetailsData.base_salary || 0)}</Text>
                      </VStack>
                    </Box>
                    <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">التمييز والحوافز</Text>
                        <Text fontSize="md" fontWeight="bold" color="orange.400">{fmtCurrency(employeeDetailsData.discrimination_incentive_allowance || 0)}</Text>
                      </VStack>
                    </Box>
                    <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">نوع الراتب</Text>
                        <Badge colorScheme={employeeDetailsData.salary_type === 'Monthly' ? 'purple' : 'blue'} variant="solid" px="3" py="1" borderRadius="md">{employeeDetailsData.salary_type === 'Monthly' ? 'شهري' : 'أسبوعي'}</Badge>
                      </VStack>
                    </Box>
                    <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">مؤمن عليه</Text>
                        <Badge colorScheme={employeeDetailsData.is_insured ? 'green' : 'red'} variant="solid" px="3" py="1" borderRadius="md">{employeeDetailsData.is_insured ? 'نعم' : 'لا'}</Badge>
                      </VStack>
                    </Box>
                  </SimpleGrid>
                </Box>
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">معلومات العمل</Text>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing="4">
                    <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">القسم</Text>
                        <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">{employeeDetailsData.department_description || employeeDetailsData.department || '-'}</Text>
                      </VStack>
                    </Box>
                    <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">التكلفة</Text>
                        <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">{employeeDetailsData.cost_center || '-'}</Text>
                      </VStack>
                    </Box>
                    <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">المنصب</Text>
                        <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">{employeeDetailsData.position || '-'}</Text>
                      </VStack>
                    </Box>
                  </SimpleGrid>
                </Box>
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">معلومات إضافية</Text>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing="4">
                    <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">الموقع</Text>
                        <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">{employeeDetailsData.location || '-'}</Text>
                      </VStack>
                    </Box>
                    <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">تاريخ التعيين</Text>
                        <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">{employeeDetailsData.hire_date ? new Date(employeeDetailsData.hire_date).toLocaleDateString('ar-EG') : '-'}</Text>
                      </VStack>
                    </Box>
                    <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                      <VStack align="flex-start" spacing="2">
                        <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">الحالة</Text>
                        <Badge colorScheme={employeeDetailsData.status === 'active' ? 'green' : 'red'} variant="solid" px="3" py="1" borderRadius="md">{employeeDetailsData.status === 'active' ? 'نشط' : 'غير نشط'}</Badge>
                      </VStack>
                    </Box>
                  </SimpleGrid>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter justifyContent="center" gap="4" bg="var(--stake-bg-primary, #0f212e)" borderTop="1px solid" borderColor="var(--stake-border-primary, #2f4553)" borderRadius="0 0 24px 24px" p="6">
            <HStack spacing="3">
              <Button leftIcon={<FiEdit />} h="48px" px="8" fontWeight="600" borderRadius="xl" bg="#3b82f6" color="white" _hover={{ bg: '#2563eb' }} onClick={() => { if (!employeeDetailsData) return; onEmployeeDetailsClose(); setEmployeeDetailsData(null); navigate('/unified-employees', { state: { openEmployeeId: employeeDetailsData.id, openMode: 'edit' } }); }}>
                تعديل البيانات
              </Button>
              <Button leftIcon={<FiTrash2 />} h="48px" px="8" fontWeight="600" borderRadius="xl" bg="#dc2626" color="white" _hover={{ bg: '#b91c1c' }} onClick={() => { if (!employeeDetailsData) return; const name = employeeDetailsData.name_ar || employeeDetailsData.name || 'هذا الموظف'; if (window.confirm(`⚠️ تحذير: حذف الموظف نهائياً\n\nالموظف: ${name}\nالكود: ${employeeDetailsData.employee_code || 'غير محدد'}\n\nهل أنت متأكد؟`)) handleDeleteEmployeeFromDetailsModal(employeeDetailsData); }}>
                حذف الموظف
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* مودال تنظيم الأعمدة */}
      <Modal isOpen={isColumnManagerOpen} onClose={() => setIsColumnManagerOpen(false)} size="4xl" isCentered>
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
                <Icon as={FiSettings} boxSize="5" />
                <Text fontSize="lg" fontWeight="bold">تنظيم أعمدة جدول المستحقات</Text>
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
          <ModalBody p="6" maxH="70vh" overflowY="auto">
            <VStack spacing="6" align="stretch">
              {/* الأعمدة المرئية حالياً */}
              <Box>
                <HStack justify="space-between" align="center" mb="4">
                  <Heading size="md" color="green.200">
                    الأعمدة المرئية حالياً
                  </Heading>
                  <Text fontSize="xs" color="white">
                    استخدم الأسهم لإعادة ترتيب الأعمدة
                  </Text>
                </HStack>
                <SimpleGrid columns={2} spacing="3">
                  {(() => {
                    const uniqueVisibleColumns = visibleColumns.filter((id, idx) => visibleColumns.indexOf(id) === idx);
                    
                    const visibleCols = uniqueVisibleColumns
                      .map(id => {
                        const col = entitlementsColumns.find(col => col.id === id);
                        if (!col) return undefined;
                        const isTotalEntitlements = (col.column_key === 'total_entitlements' || 
                                                     col.display_name_ar === 'إجمالي المستحقات' ||
                                                     col.column_name_ar === 'إجمالي المستحقات');
                        const isReference = col.type === 'reference';
                        if (isTotalEntitlements || isReference) {
                          return col;
                        }
                        return col.is_visible !== 0 ? col : undefined;
                      })
                      .filter(col => col !== undefined);
                    
                    let hiddenCols = entitlementsColumns
                      .filter(col => {
                        if (!col) return false;
                        const isTotalEntitlements = (col.column_key === 'total_entitlements' || 
                                                     col.display_name_ar === 'إجمالي المستحقات' ||
                                                     col.column_name_ar === 'إجمالي المستحقات');
                        const isReference = col.type === 'reference';
                        
                        if (isTotalEntitlements || isReference) {
                          return !uniqueVisibleColumns.includes(col.id);
                        }
                        
                        return !uniqueVisibleColumns.includes(col.id);
                      })
                      .sort((a, b) => (a.display_order || 999) - (b.display_order || 999));
                    
                    const totalEntitlementsFromDynamic = dynamicColumns.find(col => {
                      if (!col) return false;
                      const key = col.column_key || col.column_name || col.name;
                      const name = col.display_name_ar || col.column_name_ar || '';
                      return (key === 'total_entitlements' || name === 'إجمالي المستحقات');
                    });
                    
                    if (totalEntitlementsFromDynamic && 
                        !uniqueVisibleColumns.includes(totalEntitlementsFromDynamic.id) &&
                        !hiddenCols.find(col => col.id === totalEntitlementsFromDynamic.id) &&
                        !visibleCols.find(col => col.id === totalEntitlementsFromDynamic.id)) {
                      hiddenCols.push(totalEntitlementsFromDynamic);
                    }
                    
                    const allColumnsOrdered = [...visibleCols, ...hiddenCols];
                    
                    return allColumnsOrdered.map((column, displayIndex) => {
                      const uniqueVisibleColumns = visibleColumns.filter((id, idx) => visibleColumns.indexOf(id) === idx);
                      const visibleIndex = uniqueVisibleColumns.indexOf(column.id);
                      const isVisible = visibleIndex >= 0;
                        debugLog('Rendering column in manager modal:', column.id, column.display_name_ar);
                        return (
                      <Card 
                        key={column.id} 
                        bg="var(--stake-bg-secondary, #111827)" 
                        border="1px solid" 
                        borderColor="var(--stake-border-primary, #2f4553)"
                        _hover={{ bg: "#1a2f3a" }}
                        transition="all 0.2s ease"
                      >
                        <CardBody p="3">
                          <HStack justify="space-between" align="center">
                            <VStack align="start" spacing="1" flex="1" minW="0">
                              <Text color="white" fontWeight="medium" fontSize="sm" noOfLines={2}>
                                {column.display_name_ar}
                              </Text>
                              <Text className="stake-text-secondary" fontSize="xs" noOfLines={1}>
                                {column.name}
                              </Text>
                              <HStack spacing="1" mt="1">
                                {column.badge_color === 'none' ? (
                                  <Text className="stake-text-secondary" fontSize="xs">
                                    بدون بادج
                                  </Text>
                                ) : (
                                  <Badge 
                                    colorScheme={(column.badge_color || 'blue')} 
                                    variant={(column.badge_variant || 'solid')}
                                    fontSize="xs"
                                    px="1"
                                    py="0"
                                    bg={(column.badge_variant || 'solid') === 'solid' ? `${column.badge_color || 'blue'}.500` : undefined}
                                    borderColor={(column.badge_variant || 'solid') === 'outline' ? `${column.badge_color || 'blue'}.500` : undefined}
                                    color={(column.badge_variant || 'solid') === 'outline' ? `${column.badge_color || 'blue'}.500` : 'white'}
                                  >
                                    {column.display_name_ar || column.name}
                                  </Badge>
                                )}
                                <IconButton
                                  icon={<FiEdit />}
                                  size="xs"
                                  variant="ghost"
                                  colorScheme="blue"
                                  onClick={() => {
                                    setEditingBadgeColumn(column);
                                    setIsBadgeColorModalOpen(true);
                                  }}
                                />
                              </HStack>
                            </VStack>
                            <HStack spacing="1">
                              <IconButton
                                icon={<FiChevronUp />}
                                size="xs"
                                colorScheme="blue"
                                variant="ghost"
                                onClick={() => {
                                  moveColumnUp(column.id);
                                }}
                                isDisabled={!isVisible ? false : visibleIndex === 0}
                                title="نقل لأعلى"
                              />
                              <IconButton
                                icon={<FiChevronDown />}
                                size="xs"
                                colorScheme="blue"
                                variant="ghost"
                                onClick={() => {
                                  moveColumnDown(column.id);
                                }}
                                isDisabled={!isVisible ? false : visibleIndex === visibleColumns.length - 1}
                                title="نقل لأسفل"
                              />
                              
                              <IconButton
                                icon={(() => {
                                  const isVisible = columnVisibility[column.id] !== undefined 
                                    ? columnVisibility[column.id] 
                                    : (column.is_visible !== 0);
                                  return isVisible ? <FiEyeOff /> : <FiEye />;
                                })()}
                                size="xs"
                                colorScheme={(() => {
                                  const isVisible = columnVisibility[column.id] !== undefined 
                                    ? columnVisibility[column.id] 
                                    : (column.is_visible !== 0);
                                  return isVisible ? "orange" : "green";
                                })()}
                                variant="ghost"
                                onClick={() => handleToggleColumnVisibility(column)}
                                title={(() => {
                                  const isVisible = columnVisibility[column.id] !== undefined 
                                    ? columnVisibility[column.id] 
                                    : (column.is_visible !== 0);
                                  return isVisible ? "إخفاء العمود" : "إظهار العمود";
                                })()}
                              />
                              
                              <IconButton
                                icon={<FiTrash2 />}
                                size="xs"
                                colorScheme="red"
                                variant="ghost"
                                onClick={() => handleDeleteColumn(column)}
                                title="حذف العمود"
                              />
                            </HStack>
                          </HStack>
                        </CardBody>
                      </Card>
                      );
                    });
                  })()}
                </SimpleGrid>
              </Box>

              {/* استيراد عمود من جدول آخر */}
              <Box>
                <HStack justify="space-between" align="center" mb="4">
                  <Heading size="md" color="purple.200">
                    استيراد عمود من جدول آخر
                  </Heading>
                  <Button
                    leftIcon={<FiDownload />}
                    colorScheme="purple"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchAvailableTables();
                      setIsImportColumnModalOpen(true);
                    }}
                  >
                    استيراد عمود
                  </Button>
                </HStack>
              </Box>

              {/* الأعمدة المتاحة للإضافة */}
              <Box>
                <Heading size="md" mb="4" color="blue.200">
                  الأعمدة المتاحة للإضافة
                </Heading>
                <SimpleGrid columns={2} spacing="3">
                  {(() => {
                    const availableColumns = [...entitlementsColumns, ...customColumns];
                    const filteredColumns = availableColumns.filter(col => {
                      const notInVisible = !visibleColumns.includes(col.id);
                      const isHidden = columnVisibility[col.id] !== undefined 
                        ? !columnVisibility[col.id] 
                        : (col.is_visible === 0);
                      
                      return notInVisible || isHidden;
                    });
                    
                    return filteredColumns;
                  })()
                    .map((column) => (
                      <Card key={column.id} bg="var(--stake-bg-secondary, #111827)" border="1px solid" borderColor="var(--stake-border-primary, #2f4553)">
                        <CardBody p="3">
                          <HStack justify="space-between" align="center">
                            <VStack align="start" spacing="1" flex="1" minW="0">
                              <Text color="white" fontWeight="medium" fontSize="sm" noOfLines={2}>
                                {column.display_name_ar}
                              </Text>
                              <Text className="stake-text-secondary" fontSize="xs" noOfLines={1}>
                                {column.name}
                              </Text>
                              <Text color="gray.500" fontSize="xs" noOfLines={1}>
                                {column.table_display_name_ar || column.table_name}
                              </Text>
                            </VStack>
                            <IconButton
                              icon={<FiPlus />}
                              size="sm"
                              colorScheme="green"
                              variant="ghost"
                              onClick={() => addColumnFromSystem(column)}
                            />
                          </HStack>
                        </CardBody>
                      </Card>
                    ))}
                </SimpleGrid>
              </Box>

              {/* إضافة عمود مخصص */}
              <Box>
                <Heading size="md" mb="4" color="purple.200">
                  إضافة عمود مخصص
                </Heading>
                <HStack spacing="3">
                  <Input
                    placeholder="اسم العمود (بالإنجليزية)"
                    bg="var(--stake-bg-secondary, #111827)"
                    borderColor="var(--stake-border-primary, #2f4553)"
                    color="white"
                    _focus={{
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 1px #3b82f6"
                    }}
                    id="customColumnName"
                  />
                  <Input
                    placeholder="اسم العرض (بالعربية)"
                    bg="var(--stake-bg-secondary, #111827)"
                    borderColor="var(--stake-border-primary, #2f4553)"
                    color="white"
                    _focus={{
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 1px #3b82f6"
                    }}
                    id="customDisplayName"
                  />
                  <Button
                    leftIcon={<FiPlus />}
                    colorScheme="purple"
                    onClick={() => {
                      const columnName = document.getElementById('customColumnName').value;
                      const displayName = document.getElementById('customDisplayName').value;
                      if (columnName && displayName) {
                        addCustomColumn(columnName, displayName, 'decimal', false, false);
                        document.getElementById('customColumnName').value = '';
                        document.getElementById('customDisplayName').value = '';
                      }
                    }}
                  >
                    إضافة
                  </Button>
                </HStack>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter 
            display="flex" 
            justifyContent="space-between" 
            gap="3"
            bg="var(--stake-bg-primary, #0f212e)"
            borderRadius="0 0 24px 24px"
            p="4"
            borderTop="1px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
          >
            <HStack spacing="2">
              <Button 
                className="stake-btn-success" 
                onClick={() => savePreferences(true)}
                leftIcon={<FiSave />}
                size="sm"
              >
                حفظ
              </Button>
              <Button 
                className="stake-btn-warning" 
                onClick={createDefaultPreferences}
                leftIcon={<FiPlus />}
                size="sm"
              >
                إضافة افتراضي
              </Button>
              <Button 
                className="stake-btn-danger" 
                onClick={resetPreferences}
                leftIcon={<FiRefreshCw />}
                size="sm"
              >
                حذف الكل
              </Button>
            </HStack>
            <Button 
              className="stake-btn-secondary" 
              onClick={() => setIsColumnManagerOpen(false)}
            >
              إغلاق
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* مودال تنظيم أعمدة المستقطعات */}
      <Modal isOpen={isDeductionColumnManagerOpen} onClose={() => setIsDeductionColumnManagerOpen(false)} size="4xl" isCentered>
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
                <Icon as={FiSettings} boxSize="5" />
                <Text fontSize="lg" fontWeight="bold">تنظيم أعمدة المستقطعات</Text>
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
          <ModalBody p="6" maxH="70vh" overflowY="auto">
            <VStack spacing="6" align="stretch">
              {/* الأعمدة المرئية حالياً */}
              <Box>
                <HStack justify="space-between" align="center" mb="4">
                  <Heading size="md" color="red.200">
                    الأعمدة المرئية حالياً
                  </Heading>
                  <Text fontSize="xs" className="stake-text-secondary">
                    استخدم الأسهم لإعادة ترتيب الأعمدة
                  </Text>
                </HStack>
                <SimpleGrid columns={2} spacing="3">
                  {(() => {
                    const visibleCols = deductionsColumns
                      .filter(col => col && col.is_visible !== 0)
                      .sort((a, b) => {
                        const indexA = visibleDeductionColumns.indexOf(a.id);
                        const indexB = visibleDeductionColumns.indexOf(b.id);
                        if (indexA >= 0 && indexB >= 0) return indexA - indexB;
                        if (indexA >= 0) return -1;
                        if (indexB >= 0) return 1;
                        return (a.display_order || 999) - (b.display_order || 999);
                      });
                    
                    return visibleCols;
                  })()
                    .map((column) => (
                      <Card 
                          key={`${column.id}-${column.badge_color}-${column.badge_variant}`} 
                        bg="var(--stake-bg-secondary, #111827)" 
                        border="1px solid" 
                        borderColor="var(--stake-border-primary, #2f4553)"
                        _hover={{ bg: "#1a2f3a" }}
                        transition="all 0.2s ease"
                      >
                        <CardBody p="3">
                          <HStack justify="space-between" align="center">
                            <VStack align="start" spacing="1" flex="1" minW="0">
                              <Text color="white" fontWeight="medium" fontSize="sm" noOfLines={2}>
                                {column.display_name_ar}
                              </Text>
                              <Text className="stake-text-secondary" fontSize="xs" noOfLines={1}>
                                  {column.name}
                              </Text>
                              <HStack spacing="1" mt="1">
                                {column.badge_color === 'none' ? (
                                  <Text className="stake-text-secondary" fontSize="xs">
                                    بدون بادج
                                  </Text>
                                ) : (
                                  <Badge 
                                    colorScheme={column.badge_color || "red"} 
                                    variant={column.badge_variant || "solid"}
                                    fontSize="xs"
                                    px="1"
                                    py="0"
                                    bg={column.badge_variant === 'solid' ? `${column.badge_color || 'red'}.500` : undefined}
                                    borderColor={column.badge_variant === 'outline' ? `${column.badge_color || 'red'}.500` : undefined}
                                    color={column.badge_variant === 'outline' ? `${column.badge_color || 'red'}.500` : 'white'}
                                  >
                                    {column.display_name_ar || column.name}
                                  </Badge>
                                )}
                                <IconButton
                                  icon={<FiEdit />}
                                  size="xs"
                                  variant="ghost"
                                  colorScheme="red"
                                  onClick={() => {
                                    setEditingBadgeColumn(column);
                                    setIsBadgeColorModalOpen(true);
                                  }}
                                    title="اختيار لون البادج"
                                />
                              </HStack>
                            </VStack>
                            <HStack spacing="1">
                              <IconButton
                                icon={<FiChevronUp />}
                                size="xs"
                                colorScheme="blue"
                                variant="ghost"
                                onClick={() => moveDeductionColumnUp(column.id)}
                                isDisabled={visibleDeductionColumns.indexOf(column.id) === 0}
                                  title="نقل لأعلى"
                              />
                              <IconButton
                                icon={<FiChevronDown />}
                                size="xs"
                                colorScheme="blue"
                                variant="ghost"
                                onClick={() => moveDeductionColumnDown(column.id)}
                                isDisabled={visibleDeductionColumns.indexOf(column.id) === visibleDeductionColumns.length - 1}
                                  title="نقل لأسفل"
                              />
                              <IconButton
                                icon={<FiX />}
                                size="sm"
                                colorScheme="red"
                                variant="ghost"
                                  onClick={() => {
                                    debugLog('Hide deduction column button clicked for column:', column.id, column.display_name_ar);
                                    removeDeductionColumnFromDisplay(column.id);
                                  }}
                              />
                            </HStack>
                          </HStack>
                        </CardBody>
                      </Card>
                    ))}
                </SimpleGrid>
              </Box>

              {/* استيراد عمود من جدول آخر */}
              <Box>
                <HStack justify="space-between" align="center" mb="4">
                  <Heading size="md" color="purple.200">
                    استيراد عمود من جدول آخر
                  </Heading>
                  <Button
                    leftIcon={<FiDownload />}
                    colorScheme="purple"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchAvailableTables();
                      setIsImportColumnModalOpen(true);
                    }}
                  >
                    استيراد عمود
                  </Button>
                </HStack>
              </Box>

              {/* الأعمدة المتاحة للإضافة */}
              <Box>
                <Heading size="md" mb="4" color="blue.200">
                  الأعمدة المتاحة للإضافة
                </Heading>
                <SimpleGrid columns={2} spacing="3">
                  {(() => {
                    const availableCols = [...deductionsColumns, ...dynamicColumns.filter(col => col.table_id === 1), ...customColumns]
                      .filter(col => {
                        if (!col) return false;
                        const inDeductions = deductionsColumns.find(dc => dc.id === col.id);
                        if (inDeductions) {
                          return inDeductions.is_visible === 0;
                        }
                        return true;
                      });
                    
                    return availableCols;
                  })()
                    .map((column) => (
                      <Card key={column.id} bg="var(--stake-bg-secondary, #111827)" border="1px solid" borderColor="var(--stake-border-primary, #2f4553)">
                        <CardBody p="3">
                          <HStack justify="space-between" align="center">
                            <VStack align="start" spacing="1" flex="1" minW="0">
                              <Text color="white" fontWeight="medium" fontSize="sm" noOfLines={2}>
                                {column.display_name_ar}
                              </Text>
                              <Text className="stake-text-secondary" fontSize="xs" noOfLines={1}>
                                  {column.name}
                              </Text>
                              <Text color="gray.500" fontSize="xs" noOfLines={1}>
                                {column.table_display_name_ar || column.table_name}
                              </Text>
                            </VStack>
                            <IconButton
                              icon={<FiPlus />}
                              size="sm"
                              colorScheme="green"
                              variant="ghost"
                              onClick={() => addDeductionColumnFromSystem(column)}
                            />
                          </HStack>
                        </CardBody>
                      </Card>
                    ))}
                </SimpleGrid>
              </Box>

              {/* إضافة عمود مخصص */}
              <Box>
                <Heading size="md" mb="4" color="purple.200">
                  إضافة عمود مخصص
                </Heading>
                <HStack spacing="3">
                  <Input
                    placeholder="اسم العمود (بالإنجليزية)"
                    bg="var(--stake-bg-secondary, #111827)"
                    borderColor="var(--stake-border-primary, #2f4553)"
                    color="white"
                    _focus={{
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 1px #3b82f6"
                    }}
                    id="customDeductionColumnName"
                  />
                  <Input
                    placeholder="اسم العرض (بالعربية)"
                    bg="var(--stake-bg-secondary, #111827)"
                    borderColor="var(--stake-border-primary, #2f4553)"
                    color="white"
                    _focus={{
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 1px #3b82f6"
                    }}
                    id="customDeductionDisplayName"
                  />
                  <Button
                    leftIcon={<FiPlus />}
                    colorScheme="purple"
                    onClick={() => {
                      const columnName = document.getElementById('customDeductionColumnName').value;
                      const displayName = document.getElementById('customDeductionDisplayName').value;
                      if (columnName && displayName) {
                        addCustomColumn(columnName, displayName, 'decimal', false, false);
                        document.getElementById('customDeductionColumnName').value = '';
                        document.getElementById('customDeductionDisplayName').value = '';
                      }
                    }}
                  >
                    إضافة
                  </Button>
                </HStack>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter 
            display="flex" 
            justifyContent="space-between" 
            gap="3"
            bg="var(--stake-bg-primary, #0f212e)"
            borderRadius="0 0 24px 24px"
            p="4"
            borderTop="1px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
          >
            <HStack spacing="2">
              <Button 
                className="stake-btn-success" 
                onClick={() => savePreferences(true)}
                leftIcon={<FiSave />}
                size="sm"
              >
                حفظ
              </Button>
              <Button 
                className="stake-btn-warning" 
                onClick={createDefaultPreferences}
                leftIcon={<FiPlus />}
                size="sm"
              >
                إضافة افتراضي
              </Button>
              <Button 
                className="stake-btn-danger" 
                onClick={resetPreferences}
                leftIcon={<FiRefreshCw />}
                size="sm"
              >
                حذف الكل
              </Button>
            </HStack>
            <Button 
              className="stake-btn-secondary" 
              onClick={() => setIsDeductionColumnManagerOpen(false)}
            >
              إغلاق
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* مودال اختيار لون البادج */}
      <Modal isOpen={isBadgeColorModalOpen} onClose={() => setIsBadgeColorModalOpen(false)} size="md">
        <ModalOverlay />
        <ModalContent 
          bg="var(--stake-bg-primary, #0f212e)" 
          border="1px solid" 
          borderColor="var(--stake-border-primary, #2f4553)" 
          borderRadius="3xl"
          overflow="hidden"
        >
          <ModalHeader 
            bg="var(--stake-bg-primary, #0f212e)"
            borderRadius="24px 24px 0 0"
            p="4"
            borderBottom="1px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
            position="relative"
          >
            <HStack spacing="3">
              <Icon as={FiDroplet} color="purple.300" boxSize="6" />
              <Text as="span" fontWeight="bold" color="purple.200" fontSize="lg">
                اختيار لون البادج
              </Text>
            </HStack>
            <ModalCloseButton 
              position="absolute"
              top="4"
              right="4"
              className="stake-text-secondary"
              _hover={{ color: "white", bg: "#2f4553" }}
            />
          </ModalHeader>
          
          <ModalBody p="6">
            {editingBadgeColumn && (
              <VStack spacing="6" align="stretch">
                <Box>
                  <Text color="white" fontWeight="medium" mb="3">
                    العمود: {editingBadgeColumn.display_name_ar}
                  </Text>
                  
                  <Text className="stake-text-secondary" fontSize="sm" mb="2">اللون:</Text>
                  <SimpleGrid columns={4} spacing="2" mb="4">
                    {['none', 'blue', 'green', 'red', 'orange', 'purple', 'pink', 'yellow', 'cyan', 'teal', 'gray'].map(color => (
                      <Button
                        key={color}
                        size="sm"
                        colorScheme={color === 'none' ? 'gray' : color}
                        variant={editingBadgeColumn.badge_color === color ? "solid" : "outline"}
                        onClick={() => {
                          setEditingBadgeColumn(prev => ({ ...prev, badge_color: color }));
                        }}
                      >
                        {color === 'none' ? 'بدون بادج' : color}
                      </Button>
                    ))}
                  </SimpleGrid>
                  
                  {editingBadgeColumn.badge_color !== 'none' && (
                    <>
                      <Text className="stake-text-secondary" fontSize="sm" mb="2">النوع:</Text>
                      <HStack spacing="2">
                        {['solid', 'outline'].map(variant => (
                          <Button
                            key={variant}
                            size="sm"
                            colorScheme={editingBadgeColumn.badge_color || 'blue'}
                            variant={editingBadgeColumn.badge_variant === variant ? "solid" : "outline"}
                            onClick={() => {
                              setEditingBadgeColumn(prev => ({ ...prev, badge_variant: variant }));
                            }}
                          >
                            {variant}
                          </Button>
                        ))}
                      </HStack>
                    </>
                  )}
                  
                  <Box mt="4">
                    <Text className="stake-text-secondary" fontSize="sm" mb="2">تنسيق العملة:</Text>
                    <HStack spacing="2">
                      <Button
                        size="sm"
                        colorScheme={editingBadgeColumn.is_currency ? "green" : "gray"}
                        variant={editingBadgeColumn.is_currency ? "solid" : "outline"}
                        onClick={() => {
                          setEditingBadgeColumn(prev => ({ ...prev, is_currency: !prev.is_currency }));
                        }}
                      >
                        {editingBadgeColumn.is_currency ? "✓ عملة" : "عملة"}
                      </Button>
                      <Text className="stake-text-secondary" fontSize="xs">
                        {editingBadgeColumn.is_currency ? "سيظهر مع رمز العملة (ج.م)" : "سيظهر كرقم عادي"}
                      </Text>
                    </HStack>
                  </Box>
                  
                  <Box mt="4" p="3" bg="var(--stake-bg-secondary, #111827)" borderRadius="md" border="1px solid" borderColor="var(--stake-border-primary, #2f4553)">
                    <Text className="stake-text-secondary" fontSize="sm" mb="2">معاينة:</Text>
                    {editingBadgeColumn.badge_color === 'none' ? (
                      <Text color="white" fontSize="sm">
                        {editingBadgeColumn.display_name_ar} (بدون بادج)
                      </Text>
                    ) : (
                      <Badge 
                        colorScheme={editingBadgeColumn.badge_color || 'blue'} 
                        variant={editingBadgeColumn.badge_variant || 'solid'}
                        fontSize="sm"
                        px="2"
                        py="1"
                        bg={editingBadgeColumn.badge_variant === 'solid' ? `${editingBadgeColumn.badge_color || 'blue'}.500` : undefined}
                        borderColor={editingBadgeColumn.badge_variant === 'outline' ? `${editingBadgeColumn.badge_color || 'blue'}.500` : undefined}
                        color={editingBadgeColumn.badge_variant === 'outline' ? `${editingBadgeColumn.badge_color || 'blue'}.500` : 'white'}
                      >
                        {editingBadgeColumn.display_name_ar}
                      </Badge>
                    )}
                    <Text color="gray.500" fontSize="xs" mt="2">
                      اللون: {editingBadgeColumn.badge_color || 'blue'} | النوع: {editingBadgeColumn.badge_variant || 'solid'} | عملة: {editingBadgeColumn.is_currency ? 'نعم' : 'لا'}
                    </Text>
                  </Box>
                </Box>
              </VStack>
            )}
          </ModalBody>
          
          <ModalFooter 
            bg="var(--stake-bg-primary, #0f212e)"
            borderRadius="0 0 24px 24px"
            p="4"
            borderTop="1px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
          >
            <HStack spacing="3" justify="flex-end">
              <Button 
                className="stake-btn-secondary" 
                onClick={() => setIsBadgeColorModalOpen(false)}
              >
                إلغاء
              </Button>
              <Button 
                className="stake-btn-success"
                onClick={() => {
                  if (editingBadgeColumn) {
                    // تحديد table_name بناءً على العمود
                    let tableName = editingBadgeColumn.table_name;
                    if (!tableName) {
                      // البحث في deductionsColumns أولاً
                      const deductionCol = deductionsColumns.find(col => col.id === editingBadgeColumn.id);
                      if (deductionCol) {
                        tableName = 'monthly_salary_deductions_columns';
                      } else {
                        // البحث في entitlementsColumns
                        const entitlementCol = entitlementsColumns.find(col => col.id === editingBadgeColumn.id);
                        if (entitlementCol) {
                          tableName = 'monthly_salary_entitlements_columns';
                        }
                      }
                    }
                    
                    updateBadgeColor(
                      editingBadgeColumn.id,
                      editingBadgeColumn.badge_color || 'blue',
                      editingBadgeColumn.badge_variant || 'solid',
                      editingBadgeColumn.is_currency || false,
                      tableName
                    );
                  }
                }}
                leftIcon={<FiSave />}
              >
                حفظ
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* مودال استيراد العمود */}
      <Modal isOpen={isImportColumnModalOpen} onClose={() => setIsImportColumnModalOpen(false)} size="2xl" isCentered>
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
                <Icon as={FiDownload} boxSize="5" />
                <Text fontSize="lg" fontWeight="bold">استيراد عمود من جدول آخر</Text>
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
          <ModalBody p="6" maxH="70vh" overflowY="auto">
            <VStack spacing="6" align="stretch">
              <Box>
                <FormLabel color="white" mb="3">اختر الجدول المصدر:</FormLabel>
                <Select
                  value={selectedTable}
                  onChange={(e) => {
                    setSelectedTable(e.target.value);
                    if (e.target.value) {
                      fetchImportableColumns(e.target.value);
                    }
                  }}
                  placeholder="اختر جدول..."
                  bg="var(--stake-bg-card, #1a2c38)"
                  color="white"
                  borderColor="var(--stake-border-primary, #2f4553)"
                  _hover={{ borderColor: "#1a2c38", bg: "#2f4553" }}
                  _focus={{ borderColor: "#1a2c38", boxShadow: "0 0 0 1px #1a2c38", bg: "#1a2c38" }}
                  _expanded={{ bg: "#1a2c38" }}
                  sx={{
                    '& option': {
                      backgroundColor: '#1a2c38',
                      color: 'white'
                    }
                  }}
                >
                  {availableTables.map((table) => (
                    <option key={table.id} value={table.table_name}>
                      {table.name}
                    </option>
                  ))}
                </Select>
              </Box>

              <Box>
                <HStack spacing="3" align="center">
                  <Icon as={FiLink} color="purple.300" boxSize="5" />
                  <VStack align="start" spacing="1">
                    <Text color="purple.200" fontWeight="bold" fontSize="md">
                      إنشاء مرجع للعمود
                    </Text>
                    <Text className="stake-text-secondary" fontSize="sm">
                      سيتم إنشاء مرجع للعمود الأصلي، أي تغيير في المصدر سيؤثر على الهدف تلقائياً
                    </Text>
                  </VStack>
                </HStack>
              </Box>

              {selectedTable && importableColumns.length > 0 && (
                <Box>
                  <FormLabel color="white" mb="3">الأعمدة المتاحة للاستيراد:</FormLabel>
                  <SimpleGrid columns={1} spacing="3" maxH="300px" overflowY="auto">
                    {importableColumns.map((column) => (
                      <Card key={column.id} bg="var(--stake-bg-secondary, #111827)" border="1px solid" borderColor="var(--stake-border-primary, #2f4553)">
                        <CardBody p="3">
                          <HStack justify="space-between" align="center">
                            <VStack align="start" spacing="1" flex="1" minW="0">
                              <Text color="white" fontWeight="medium" fontSize="sm" noOfLines={2}>
                                {column.display_name_ar || column.column_name_ar}
                              </Text>
                              <Text className="stake-text-secondary" fontSize="xs" noOfLines={1}>
                                {column.name || column.column_key}
                              </Text>
                              <Text color="gray.500" fontSize="xs" noOfLines={1}>
                                {column.data_type || column.type}
                              </Text>
                            </VStack>
                            <Button
                              leftIcon={<FiLink />}
                              colorScheme="purple"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const targetTable = isColumnManagerOpen ? 'monthly_salary_entitlements_columns' : 'monthly_salary_deductions_columns';
                                importColumn(column, targetTable, 'reference');
                                setIsImportColumnModalOpen(false);
                              }}
                            >
                              إنشاء مرجع
                            </Button>
                          </HStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </Box>
              )}

              {selectedTable && importableColumns.length === 0 && (
                <Box textAlign="center" py="8">
                  <Text className="stake-text-secondary">لا توجد أعمدة متاحة للاستيراد في هذا الجدول</Text>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter 
            bg="var(--stake-bg-primary, #0f212e)"
            borderRadius="0 0 24px 24px"
            p="4"
            borderTop="1px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
          >
            <HStack spacing="3" justify="flex-end">
              <Button 
                className="stake-btn-secondary" 
                onClick={() => setIsImportColumnModalOpen(false)}
              >
                إلغاء
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default PremiumMonthlySalary;

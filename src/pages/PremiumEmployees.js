import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getApiUrl } from '../utils/apiUrlHelper';
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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  Grid,
  GridItem,
  Avatar,
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
  FormErrorMessage,
  Input,
  Select,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
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
  MenuItem,
  MenuDivider,
  IconButton,
  Tooltip,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  CircularProgress,
  CircularProgressLabel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Checkbox,
  CheckboxGroup,
  Switch,
  RadioGroup,
  Radio,
  Portal,
} from '@chakra-ui/react';
import {
  FiUsers,
  FiPlus,
  FiSearch,
  FiChevronUp,
  FiChevronDown,
  FiFilter,
  FiEdit,
  FiTrash2,
  FiEye,
  FiMoreVertical,
  FiDownload,
  FiUpload,
  FiRefreshCw,
  FiUser,
  FiMail,
  FiCheckCircle,
  FiXCircle,
  FiBriefcase,
  FiDollarSign,
  FiX,
  FiHash,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiClock,
  FiAlertCircle,
  FiUserPlus,
  FiUserMinus,
  FiSettings,
  FiSave,
  FiPercent,
  FiTarget,
  FiKey,
} from 'react-icons/fi';
import EnglishKeyTooltip from '../components/EnglishKeyTooltip';
// import './PremiumEmployees.dark.css'; // REMOVED - using Tailwind + stake-theme.css #0B1120
import { useEmployeesToolbar } from '../contexts/EmployeesToolbarContext';
import PagePanelToggle from '../components/PagePanelToggle';
import { useForm, useWatch, Controller, watch } from 'react-hook-form';
import useCurrency from '../hooks/useCurrency';
import { useLocation, useNavigate } from 'react-router-dom';

// TAILWIND MODERN TABLE - Stake.com style #0B1120
const TailwindTableWrapper = ({ children }) => (
  <div className="bg-[#151E32] border border-[#1F2A44] rounded-[20px] overflow-hidden shadow-[0_4px_24px_-10px_rgba(0,0,0,0.38)]">
    <div className="overflow-x-auto">
      {children}
    </div>
  </div>
);

const TailwindTableHeaderCell = ({ children, className = "" }) => (
  <th className={`px-4 py-3 text-[11px] font-bold tracking-[0.8px] uppercase text-white/40 bg-[#0F172A] border-b border-[#1F2A44] whitespace-nowrap ${className}`}>
    {children}
  </th>
);

const TailwindTableCell = ({ children, className = "" }) => (
  <td className={`px-4 py-3 text-[13px] text-white/80 border-b border-[#1F2A44]/50 whitespace-nowrap ${className}`}>
    {children}
  </td>
);


const DEFAULT_IMPORT_XML_PREVIEW = {
  total: 0,
  monthly: 0,
  weekly: 0,
  active: 0,
  inactive: 0,
  terminated: 0,
};

const DEFAULT_EMP_TABLE_COLUMNS = [
  { id: 'employee_code', label: 'كود الموظف', visible: true },
  { id: 'fingerprint_code', label: 'كود البصمة', visible: true },
  { id: 'name', label: 'اسم الموظف', visible: true },
  { id: 'base_salary', label: 'الاساسي', visible: true },
  { id: 'discrimination_incentive_allowance', label: 'المتغير', visible: true },
  { id: 'salary_type', label: 'نوع الراتب', visible: true },
  { id: 'status', label: 'الحالة', visible: true },
  { id: 'is_insured', label: 'التأمين', visible: true },
  { id: 'department', label: 'القسم', visible: true },
  { id: 'cost_center', label: 'التكلفة', visible: true },
  { id: 'position', label: 'المنصب', visible: true },
  { id: 'location', label: 'الموقع', visible: true },
];

const EMP_TABLE_COLS_PREF_KEY = 'emp_table_columns';
const EMPLOYMENT_STATUS_FILTER_DEFAULT = 'active';

function getEmploymentStatusFilterLabel(value) {
  if (value === 'all') return 'الكل';
  if (value === 'active') return 'نشط';
  if (value === 'inactive') return 'غير نشط';
  return '';
}

function getUiPrefUserKey() {
  try {
    const raw = localStorage.getItem('userData');
    if (!raw) return 'anon';
    const u = JSON.parse(raw);
    return String(u.id ?? u.username ?? u.user_id ?? 'anon');
  } catch {
    return 'anon';
  }
}

/** دمج أعمدة جديدة وترجمة التسميات عند التحميل من التخزين أو الخادم */
function normalizeEmpTableColumns(parsed) {
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const cols = [...parsed];
  if (!cols.some((c) => c.id === 'is_insured')) {
    const insuredCol = { id: 'is_insured', label: 'التأمين', visible: true };
    const idx = cols.findIndex((c) => c.id === 'salary_type');
    cols.splice(idx >= 0 ? idx + 1 : cols.length, 0, insuredCol);
  }
  if (!cols.some((c) => c.id === 'status')) {
    const statusCol = { id: 'status', label: 'الحالة', visible: true };
    const idx = cols.findIndex((c) => c.id === 'salary_type');
    cols.splice(idx >= 0 ? idx + 1 : cols.length, 0, statusCol);
  }
  if (!cols.some((c) => c.id === 'discrimination_incentive_allowance')) {
    const variableCol = { id: 'discrimination_incentive_allowance', label: 'المتغير', visible: true };
    const idx = cols.findIndex((c) => c.id === 'base_salary');
    cols.splice(idx >= 0 ? idx + 1 : cols.length, 0, variableCol);
  }
  return cols.map((c) => ({
    ...c,
    label:
      c.id === 'employee_code'
        ? 'كود الموظف'
        : c.id === 'base_salary'
        ? 'الاساسي'
        : c.id === 'discrimination_incentive_allowance'
        ? 'المتغير'
        : c.label,
  }));
}

const PremiumEmployees = () => {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { filtersCollapsed, toggleFiltersCollapsed } = useEmployeesToolbar();
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
  const { isOpen: isErrorModalOpen, onOpen: onErrorModalOpen, onClose: onErrorModalClose } = useDisclosure();
  const [errorModalData, setErrorModalData] = useState({
    title: '',
    message: '',
    actionButton: null // { label, onClick, icon }
  });
  
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [departmentCostCenters, setDepartmentCostCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedCostCenter, setSelectedCostCenter] = useState('');
  const [selectedSalaryType, setSelectedSalaryType] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const { isOpen: isBulkEditOpen, onOpen: onBulkEditOpen, onClose: onBulkEditClose } = useDisclosure();
  const { isOpen: isBulkDeleteOpen, onOpen: onBulkDeleteOpen, onClose: onBulkDeleteClose } = useDisclosure();
  const { isOpen: isExportOpen, onOpen: onExportOpen, onClose: onExportClose } = useDisclosure();
  const { isOpen: isImportOpen, onOpen: onImportOpen, onClose: onImportClose } = useDisclosure();
  const { isOpen: isImportResultOpen, onOpen: onImportResultOpen, onClose: onImportResultClose } = useDisclosure();
  const [includeRelatedExport, setIncludeRelatedExport] = useState(true);
  const [importXmlContent, setImportXmlContent] = useState('');
  const [importXmlFileName, setImportXmlFileName] = useState('');
  const [importXmlEmployeeCount, setImportXmlEmployeeCount] = useState(0);
  const [importXmlPreview, setImportXmlPreview] = useState(DEFAULT_IMPORT_XML_PREVIEW);
  const [importXmlProgress, setImportXmlProgress] = useState(0);
  const [importXmlPhase, setImportXmlPhase] = useState('idle');
  const [importXmlResult, setImportXmlResult] = useState(null);
  const [importXmlCleanMode, setImportXmlCleanMode] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const parseXmlImportPreview = useCallback((xmlString) => {
    const empty = { ...DEFAULT_IMPORT_XML_PREVIEW };
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlString, 'text/xml');
      if (doc.querySelector('parsererror')) return empty;

      const employees = doc.querySelectorAll('Employee');
      const preview = { ...empty, total: employees.length };

      employees.forEach((emp) => {
        const salaryType = (emp.querySelector(':scope > SalaryType')?.textContent || '').trim().toLowerCase();
        const statusRaw = (emp.querySelector(':scope > Status')?.textContent || '').trim().toLowerCase();

        if (salaryType === 'weekly') {
          preview.weekly += 1;
        } else if (salaryType === 'monthly' || salaryType === '') {
          preview.monthly += 1;
        }

        let status = statusRaw;
        if (!status || ['1', 'true', 'yes', 'on', 'نشط', 'فعال'].includes(status)) {
          status = 'active';
        } else if (['0', 'false', 'no', 'off', 'غير نشط', 'غير_نشط', 'معطل'].includes(status)) {
          status = 'inactive';
        } else if (!['active', 'inactive', 'terminated'].includes(status)) {
          status = 'active';
        }

        if (status === 'active') preview.active += 1;
        else if (status === 'inactive') preview.inactive += 1;
        else if (status === 'terminated') preview.terminated += 1;
      });

      return preview;
    } catch {
      return empty;
    }
  }, []);

  const resetImportXmlFormState = useCallback(() => {
    setImportXmlContent('');
    setImportXmlFileName('');
    setImportXmlEmployeeCount(0);
    setImportXmlPreview(DEFAULT_IMPORT_XML_PREVIEW);
    setImportXmlProgress(0);
    setImportXmlPhase('idle');
    setImportXmlCleanMode(false);
  }, []);

  const handleImportModalClose = useCallback(() => {
    if (isImporting) return;
    resetImportXmlFormState();
    onImportClose();
  }, [isImporting, resetImportXmlFormState, onImportClose]);

  const handleImportResultClose = useCallback(() => {
    setImportXmlResult(null);
    onImportResultClose();
  }, [onImportResultClose]);

  const getFingerprintSkipReasonLabel = useCallback((reason) => {
    switch (reason) {
      case 'duplicate_in_file':
        return 'مكرر داخل ملف XML';
      case 'duplicate_in_db':
        return 'مستخدم في النظام';
      case 'duplicate_assigned_in_file':
        return 'عُيِّن لموظف آخر في نفس الاستيراد';
      default:
        return reason || 'غير معروف';
    }
  }, []);
  
  // دالة مساعدة لعرض مودال الخطأ
  const showErrorModal = (title, message, actionButton = null) => {
    setErrorModalData({ title, message, actionButton });
    onErrorModalOpen();
  };
  
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    departments: 0,
  });
  
  // View mode state
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

  // تنظيم أعمدة جدول الموظفين — محلي + قاعدة البيانات (يبقى بعد إعادة تشغيل السيرفر)
  const [empTableColumns, setEmpTableColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('empTableColumns');
      if (saved) {
        const parsed = JSON.parse(saved);
        const normalized = normalizeEmpTableColumns(parsed);
        if (normalized) return normalized;
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_EMP_TABLE_COLUMNS;
  });
  const [empColsPrefsReady, setEmpColsPrefsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(getApiUrl('/api/user_ui_preferences.php'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'load',
            user_key: getUiPrefUserKey(),
            pref_key: EMP_TABLE_COLS_PREF_KEY,
          }),
        });
        const data = await res.json();
        if (cancelled || !data.success) {
          return;
        }
        if (data.value != null) {
          const normalized = normalizeEmpTableColumns(data.value);
          if (normalized) {
            setEmpTableColumns(normalized);
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) {
          setEmpColsPrefsReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('empTableColumns', JSON.stringify(empTableColumns));
  }, [empTableColumns]);

  useEffect(() => {
    if (!empColsPrefsReady) return;
    const t = setTimeout(() => {
      fetch(getApiUrl('/api/user_ui_preferences.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          user_key: getUiPrefUserKey(),
          pref_key: EMP_TABLE_COLS_PREF_KEY,
          value: empTableColumns,
        }),
      }).catch(() => {});
    }, 700);
    return () => clearTimeout(t);
  }, [empTableColumns, empColsPrefsReady]);
  const toggleEmpColumn = (id) => {
    setEmpTableColumns(cols => cols.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };
  const moveEmpColumn = (id, direction) => {
    setEmpTableColumns(cols => {
      const idx = cols.findIndex(c => c.id === id);
      if (idx < 0) return cols;
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= cols.length) return cols;
      const newCols = [...cols];
      [newCols[idx], newCols[swapWith]] = [newCols[swapWith], newCols[idx]];
      return newCols;
    });
  };
  
  // Sorting function
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Bulk edit form state
  const [bulkEditForm, setBulkEditForm] = useState({
    salary_type: '',
    department: '',
    cost_center: '',
    position: '',
    status: '',
    base_salary: '',
    location: '',
    is_insured: '' // '' = لا تغيير، '1' = مؤمن عليه، '0' = غير مؤمن عليه
  });
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc' // 'asc' or 'desc'
  });
  
  // Filter states - Updated to fix undefined error
  const [salaryTypeFilter, setSalaryTypeFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [costCenterFilter, setCostCenterFilter] = useState('');
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState(EMPLOYMENT_STATUS_FILTER_DEFAULT);
  
  // Combined filter states
  const [selectedFilterType, setSelectedFilterType] = useState('');

  const { register, handleSubmit, reset, control, setValue, trigger, watch, formState: { errors } } = useForm();
  const { formatCurrency, isCurrencyEnabled, reloadSettings } = useCurrency();

  // Clear all filters - تحسين الأداء
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSalaryTypeFilter('');
    setDepartmentFilter('');
    setCostCenterFilter('');
    setEmploymentStatusFilter(EMPLOYMENT_STATUS_FILTER_DEFAULT);
    setSelectedFilterType('');
  }, []);

  // Handle filter type selection
  const handleFilterTypeSelect = (filterType) => {
    setSelectedFilterType(filterType);
    // Clear other filters when selecting a new type
    setSalaryTypeFilter('');
    setDepartmentFilter('');
    setCostCenterFilter('');
    setEmploymentStatusFilter(EMPLOYMENT_STATUS_FILTER_DEFAULT);
  };

  // Handle filter value selection
  const handleFilterValueSelect = (value) => {
    switch (selectedFilterType) {
      case 'salaryType':
        setSalaryTypeFilter(value);
        break;
      case 'department':
        setDepartmentFilter(value);
        break;
      case 'costCenter':
        setCostCenterFilter(value);
        break;
      case 'employmentStatus':
        setEmploymentStatusFilter(value);
        break;
      default:
        break;
    }
    setSelectedFilterType('');
  };

  useEffect(() => {
    loadEmployees();
    loadDepartments();
    loadCostCenters();
    reloadSettings(); // إعادة تحميل إعدادات العملة
  }, []);

  // مراقبة تغيير القسم في مودال إضافة موظف جديد
  const watchedDepartment = watch('department');
  useEffect(() => {
    if (watchedDepartment && isAddOpen) {
      loadCostCentersByDepartment(watchedDepartment);
    } else if (isAddOpen && !watchedDepartment) {
      // مسح مراكز التكلفة عند عدم وجود قسم مختار
      setDepartmentCostCenters([]);
    }
  }, [watchedDepartment, isAddOpen]);

  // مراقبة تغيير القسم في مودال تعديل الموظف
  useEffect(() => {
    if (watchedDepartment && isEditOpen) {
      loadCostCentersByDepartment(watchedDepartment);
    } else if (isEditOpen && !watchedDepartment) {
      // مسح مراكز التكلفة عند عدم وجود قسم مختار
      setDepartmentCostCenters([]);
    }
  }, [watchedDepartment, isEditOpen]);

  // مراقبة نوع الراتب في مودال التعديل
  const watchedSalaryType = watch('salary_type');
  
  // إعداد قيمة salary_type عند فتح مودال التعديل
  useEffect(() => {
    if (isEditOpen && selectedEmployee) {
      setValue('salary_type', selectedEmployee.salary_type || 'Monthly');
      setValue('department', selectedEmployee.department || '');
      // تحميل مراكز التكلفة للقسم المختار
      if (selectedEmployee.department) {
        loadCostCentersByDepartment(selectedEmployee.department);
      }
    }
  }, [isEditOpen, selectedEmployee, setValue]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      console.log('Loading employees from database...');
      const response = await fetch(getApiUrl('/api/unified_employees_api.php?action=get_employees'));
      const data = await response.json();
      
      if (data.success && data.data) {
        console.log('Employees loaded successfully:', data.data);
        console.log('First employee department_description:', data.data[0]?.department_description);
        console.log('First employee AC-No.:', data.data[0]?.['AC-No.']);
        
        // تحويل البيانات إلى التنسيق المطلوب
        const formattedEmployees = data.data.map(emp => ({
          id: emp.id,
          employee_code: emp.employee_code || '',
          name: emp.name || emp.name_en || '',
          name_ar: emp.name_ar || emp.name || '',
          base_salary: emp.base_salary || emp.salary || 0,
          discrimination_incentive_allowance: emp.discrimination_incentive_allowance ?? 0,
          salary_type: emp.salary_type || 'Monthly',
          department: emp.department || emp.department_name || '',
          department_description: emp.department_description || '',
          cost_center: emp.cost_center || '',
          position: emp.position || '',
          location: emp.location || 'برج العرب',
          status: emp.status || 'active',
          hire_date: emp.hire_date || emp.created_at || new Date().toISOString().split('T')[0],
          is_insured: emp.is_insured || false,
          daily_work_hours: emp.daily_work_hours || 8,
          'AC-No.': emp['AC-No.'] || '',
        }));
        
        setEmployees(formattedEmployees);
        console.log('Formatted employees with AC-No.:', formattedEmployees.map(emp => ({ name: emp.name, ac_no: emp['AC-No.'] })));
        setStats({
          total: formattedEmployees.length,
          active: formattedEmployees.filter(emp => emp.status === 'active').length,
          inactive: formattedEmployees.filter(emp => emp.status === 'inactive').length,
          departments: [...new Set(formattedEmployees.map(emp => emp.department).filter(Boolean))].length,
        });
      } else {
        throw new Error(data.message || 'فشل في تحميل بيانات الموظفين');
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      showErrorModal(
        'خطأ في تحميل الموظفين',
        error.message || 'حدث خطأ أثناء تحميل بيانات الموظفين'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      console.log('Loading departments from database...');
      const response = await fetch(getApiUrl('/api/unified_employees_api.php?action=get_departments'));
      const data = await response.json();
      
      if (data.success && data.data) {
        console.log('Departments loaded successfully:', data.data);
        setDepartments(data.data);
      } else {
        console.warn('Failed to load departments, using fallback data');
        // Fallback data
        const fallbackDepartments = [
          { id: 1, name: 'المبيعات' },
          { id: 2, name: 'المحاسبة' },
          { id: 3, name: 'التقنية' },
          { id: 4, name: 'الموارد البشرية' },
          { id: 5, name: 'التسويق' },
        ];
        setDepartments(fallbackDepartments);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
      // Fallback data on error
      const fallbackDepartments = [
        { id: 1, name: 'المبيعات' },
        { id: 2, name: 'المحاسبة' },
        { id: 3, name: 'التقنية' },
        { id: 4, name: 'الموارد البشرية' },
        { id: 5, name: 'التسويق' },
      ];
      setDepartments(fallbackDepartments);
    }
  };

  const loadCostCenters = async () => {
    try {
      console.log('Loading cost centers from database...');
      const response = await fetch(getApiUrl('/api/cost_centers.php?action=list'));
      const data = await response.json();
      
      if (data.success && data.data) {
        console.log('Cost centers loaded successfully:', data.data);
        setCostCenters(data.data);
      } else {
        console.warn('Failed to load cost centers, using fallback data');
        // Fallback data
        const fallbackCostCenters = [
          { id: 1, name: 'مركز مبيعات 1' },
          { id: 2, name: 'مركز محاسبة 1' },
          { id: 3, name: 'مركز تقنية 1' },
          { id: 4, name: 'مركز موارد بشرية 1' },
          { id: 5, name: 'مركز تسويق 1' },
        ];
        setCostCenters(fallbackCostCenters);
      }
    } catch (error) {
      console.error('Error loading cost centers:', error);
      // Fallback data on error
      const fallbackCostCenters = [
        { id: 1, name: 'مركز مبيعات 1' },
        { id: 2, name: 'مركز محاسبة 1' },
        { id: 3, name: 'مركز تقنية 1' },
        { id: 4, name: 'مركز موارد بشرية 1' },
        { id: 5, name: 'مركز تسويق 1' },
      ];
      setCostCenters(fallbackCostCenters);
    }
  };

  const loadCostCentersByDepartment = async (departmentName) => {
    try {
      console.log('Loading cost centers for department:', departmentName);
      const response = await fetch(getApiUrl(`/api/unified_employees_api.php?action=get_cost_centers_by_department&department=${encodeURIComponent(departmentName)}`));
      const data = await response.json();
      
      if (data.success && data.data) {
        console.log('Department cost centers loaded successfully:', data.data);
        setDepartmentCostCenters(data.data);
      } else {
        console.warn('Failed to load department cost centers, using all cost centers');
        setDepartmentCostCenters(costCenters);
      }
    } catch (error) {
      console.error('Error loading department cost centers:', error);
      setDepartmentCostCenters(costCenters);
    }
  };

  const handleAddEmployee = async (data) => {
    try {
      console.log('Adding new employee:', data);
      console.log('Cost center value:', data.cost_center);
      console.log('Department value:', data.department);
      console.log('AC-No. value:', data.ac_no);
      
      const response = await fetch(getApiUrl('/api/unified_employees_api.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add_employee',
          employee_data: {
            employee_code: data.employee_code,
            'AC-No.': data.ac_no,
            name: data.name,
            name_ar: data.name_ar,
            base_salary: data.base_salary,
            salary_type: data.salary_type,
            department: data.department,
            cost_center: data.cost_center,
            position: data.position,
            location: data.location,
            hire_date: data.hire_date,
            status: data.status || 'active',
            is_insured: data.is_insured === true || data.is_insured === 'true',
          }
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'تم إضافة الموظف بنجاح',
          description: `تم إضافة ${data.name_ar || data.name} إلى قاعدة البيانات`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        reset();
        onAddClose();
        
        // إعادة تحميل قائمة الموظفين
        await loadEmployees();
      } else {
        throw new Error(result.message || 'فشل في إضافة الموظف');
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      
      // التحقق من خطأ التكرار في employee_code
      const errorMessage = error.message || '';
      if (errorMessage.includes('DUPLICATE_CODE:')) {
        const duplicateMessage = errorMessage.replace('DUPLICATE_CODE: ', '');
        showErrorModal(
          'كود الموظف مستخدم',
          duplicateMessage,
          {
            label: 'توليد كود جديد',
            icon: FiRefreshCw,
            onClick: async () => {
              try {
                const response = await fetch(getApiUrl('/api/unified_employees_api.php?action=generate_employee_code'));
                const data = await response.json();
                if (data.success) {
                  setValue('employee_code', data.employee_code);
                  await trigger('employee_code');
                  onErrorModalClose();
                  toast({
                    title: 'تم توليد كود الموظف',
                    description: `الكود الجديد: ${data.employee_code}`,
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                  });
                }
              } catch (err) {
                showErrorModal(
                  'خطأ في توليد الكود',
                  err.message || 'حدث خطأ أثناء توليد الكود'
                );
              }
            }
          }
        );
      } else {
        showErrorModal(
          'خطأ في إضافة الموظف',
          error.message || 'حدث خطأ أثناء إضافة الموظف'
        );
      }
    }
  };

  const handleEditEmployee = async (data) => {
    try {
      console.log('Updating employee:', selectedEmployee.id, data);
      console.log('AC-No. value:', data.ac_no);
      console.log('AC-No. type:', typeof data.ac_no);
      console.log('AC-No. is empty?', !data.ac_no || data.ac_no === '');
      
      // تحويل hire_date إلى تنسيق yyyy-MM-dd فقط إذا كان يحتوي على وقت
      let hireDate = data.hire_date || '';
      if (hireDate && hireDate.includes(' ')) {
        hireDate = hireDate.split(' ')[0];
      }
      
      // إعداد بيانات الموظف مع التأكد من أن AC-No. موجود
      const employeeData = {
        employee_code: data.employee_code || '',
        'AC-No.': data.ac_no || '',
        name: data.name,
        name_ar: data.name_ar,
        base_salary: data.base_salary,
        discrimination_incentive_allowance: data.discrimination_incentive_allowance || 0,
        salary_type: data.salary_type,
        department: data.department,
        cost_center: data.cost_center,
        position: data.position,
        location: data.location,
        hire_date: hireDate,
        status: data.status || 'active',
        is_insured: data.is_insured === true || data.is_insured === 'true',
      };
      
      console.log('Employee data to send:', employeeData);
      console.log('AC-No. in employeeData:', employeeData['AC-No.']);
      
      const requestBody = {
        action: 'update_employee',
        employee_id: selectedEmployee.id,
        employee_data: employeeData
      };
      
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(getApiUrl('/api/unified_employees_api.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'تم تحديث بيانات الموظف',
          description: `تم تحديث بيانات ${data.name_ar || data.name} بنجاح`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        reset();
        onEditClose();
        
        // إعادة تحميل قائمة الموظفين
        await loadEmployees();
        
        // تحديث selectedEmployee بجلب البيانات المحدثة من API
        if (selectedEmployee && isViewOpen) {
          try {
            const fetchResponse = await fetch(getApiUrl(`/api/unified_employees_api.php?action=get_employee&employee_id=${selectedEmployee.id}`));
            const fetchData = await fetchResponse.json();
            if (fetchData.success && fetchData.data) {
              setSelectedEmployee(fetchData.data);
            } else {
              // إذا فشل جلب البيانات، استخدم البيانات المحلية المحدثة
              setSelectedEmployee({
                ...selectedEmployee,
                ...employeeData,
                discrimination_incentive_allowance: data.discrimination_incentive_allowance || 0
              });
            }
          } catch (err) {
            console.error('Error fetching updated employee:', err);
            // في حالة الخطأ، استخدم البيانات المحلية المحدثة
            setSelectedEmployee({
              ...selectedEmployee,
              ...employeeData,
              discrimination_incentive_allowance: data.discrimination_incentive_allowance || 0
            });
          }
        }
      } else {
        throw new Error(result.message || 'فشل في تحديث بيانات الموظف');
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      
      // التحقق من خطأ التكرار في employee_code
      const errorMessage = error.message || '';
      if (errorMessage.includes('DUPLICATE_CODE:')) {
        const duplicateMessage = errorMessage.replace('DUPLICATE_CODE: ', '');
        showErrorModal(
          'كود الموظف مستخدم',
          duplicateMessage,
          {
            label: 'توليد كود جديد',
            icon: FiRefreshCw,
            onClick: async () => {
              try {
                const response = await fetch(getApiUrl('/api/unified_employees_api.php?action=generate_employee_code'));
                const data = await response.json();
                if (data.success) {
                  setValue('employee_code', data.employee_code);
                  await trigger('employee_code');
                  onErrorModalClose();
                  toast({
                    title: 'تم توليد كود الموظف',
                    description: `الكود الجديد: ${data.employee_code}`,
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                  });
                }
              } catch (err) {
                showErrorModal(
                  'خطأ في توليد الكود',
                  err.message || 'حدث خطأ أثناء توليد الكود'
                );
              }
            }
          }
        );
      } else {
        showErrorModal(
          'خطأ في تحديث بيانات الموظف',
          error.message || 'حدث خطأ أثناء تحديث بيانات الموظف'
        );
      }
    }
  };

  const handleDeleteEmployee = async (employee) => {
    try {
      console.log('Deleting employee:', employee.id);
      
      const response = await fetch(getApiUrl('/api/unified_employees_api.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete_employee',
          employee_id: employee.id
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const fpDeleted = result.deleted_records?.fingerprint_attendance ?? 0;
        toast({
          title: 'تم حذف الموظف',
          description: fpDeleted > 0
            ? `تم حذف ${employee.name_ar || employee.name} مع ${fpDeleted} سجل بصمة خام`
            : `تم حذف ${employee.name_ar || employee.name} من قاعدة البيانات`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // إعادة تحميل قائمة الموظفين
        await loadEmployees();
      } else {
        throw new Error(result.message || 'فشل في حذف الموظف');
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      showErrorModal(
        'خطأ في حذف الموظف',
        error.message || 'حدث خطأ أثناء حذف الموظف'
      );
    }
  };

  // دوال التحديد الجماعي
  const handleRowSelection = {
    selectedRowKeys,
    onChange: (selectedRowKeys, selectedRows) => {
      setSelectedRowKeys(selectedRowKeys);
      setSelectedEmployees(selectedRows);
    },
    getCheckboxProps: (record) => ({
      name: record.name,
    }),
  };

  const handleBulkEdit = () => {
    if (selectedEmployees.length === 0) {
      toast({
        title: 'تحذير',
        description: 'يرجى اختيار موظف واحد على الأقل',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setBulkEditForm({
      salary_type: '',
      department: '',
      cost_center: '',
      position: '',
      status: '',
      base_salary: '',
      location: '',
      is_insured: '',
    });
    onBulkEditOpen();
  };

  const handleBulkDelete = async () => {
    if (selectedEmployees.length === 0) {
      toast({
        title: 'تحذير',
        description: 'يرجى اختيار موظف واحد على الأقل',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const employeeIds = selectedEmployees.map(emp => emp.id);
      const response = await fetch(getApiUrl('/api/unified_employees_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_delete_employees',
          employee_ids: employeeIds
        })
      });
      
      const data = await response.json();
      if (data.success) {
        const fpDeleted = data.deleted_records?.fingerprint_attendance ?? 0;
        toast({
          title: 'تم الحذف بنجاح',
          description: fpDeleted > 0
            ? `تم حذف ${selectedEmployees.length} موظف مع ${fpDeleted} سجل بصمة خام`
            : `تم حذف ${selectedEmployees.length} موظف بنجاح`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        setSelectedRowKeys([]);
        setSelectedEmployees([]);
        loadEmployees();
      } else {
        showErrorModal(
          'خطأ في الحذف',
          'خطأ في حذف الموظفين: ' + data.message
        );
      }
    } catch (error) {
      showErrorModal(
        'خطأ في الحذف',
        'خطأ في حذف الموظفين: ' + error.message
      );
    }
  };

  // === تصدير / استيراد XML للموظفين ===
  const handleExportXml = useCallback(() => {
    try {
      const params = new URLSearchParams();
      if (includeRelatedExport) {
        params.append('include_related', '1');
      }
      const url = getApiUrl(`/api/employees_export_xml.php?${params.toString()}`);
      window.open(url, '_blank');
      onExportClose();
    } catch (e) {
      toast({
        title: 'خطأ في التصدير',
        description: e?.message || 'تعذر تصدير ملف الموظفين',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
  }, [includeRelatedExport, onExportClose, toast]);

  const handleImportXml = useCallback(async () => {
    if (!importXmlContent || isImporting) return;
    setIsImporting(true);
    setImportXmlProgress(0);
    setImportXmlPhase('upload');

    const payload = JSON.stringify({
      xml: importXmlContent,
      clean_import: importXmlCleanMode,
      import_mode: importXmlCleanMode ? 'clean' : 'standard',
    });
    const url = getApiUrl('/api/employees_import_xml.php');

    try {
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let processingInterval = null;

        const cleanup = () => {
          if (processingInterval) {
            clearInterval(processingInterval);
            processingInterval = null;
          }
        };

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && event.total > 0) {
            const uploadPct = Math.min(38, Math.round((event.loaded / event.total) * 38));
            setImportXmlProgress(uploadPct);
          }
        });

        xhr.upload.addEventListener('load', () => {
          setImportXmlPhase('processing');
          setImportXmlProgress((prev) => Math.max(prev, 40));
          processingInterval = setInterval(() => {
            setImportXmlProgress((prev) => (prev >= 92 ? prev : prev + 2));
          }, 350);
        });

        xhr.addEventListener('load', () => {
          cleanup();
          try {
            const parsed = JSON.parse(xhr.responseText || '{}');
            if (xhr.status >= 200 && xhr.status < 300 && parsed.success) {
              setImportXmlProgress(100);
              setImportXmlPhase('done');
              resolve(parsed);
            } else {
              reject(new Error(parsed.message || 'فشل استيراد الملف'));
            }
          } catch {
            reject(new Error('استجابة غير صالحة من الخادم'));
          }
        });

        xhr.addEventListener('error', () => {
          cleanup();
          reject(new Error('تعذر الاتصال بالخادم'));
        });

        xhr.addEventListener('abort', () => {
          cleanup();
          reject(new Error('تم إلغاء الاستيراد'));
        });

        xhr.open('POST', url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(payload);
      });

      setImportXmlResult(data);
      await loadEmployees();
      resetImportXmlFormState();
      onImportClose();
      onImportResultOpen();
    } catch (e) {
      toast({
        title: 'خطأ في الاستيراد',
        description: e?.message || 'تعذر استيراد ملف الموظفين',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsImporting(false);
      setImportXmlProgress(0);
      setImportXmlPhase('idle');
    }
  }, [importXmlContent, importXmlCleanMode, isImporting, resetImportXmlFormState, onImportClose, onImportResultOpen, toast, loadEmployees]);

  const handleBulkEditSubmit = async (values) => {
    try {
      const employeeIds = selectedEmployees.map(emp => emp.id);
      const response = await fetch(getApiUrl('/api/unified_employees_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_update_employees',
          employee_ids: employeeIds,
          update_data: values
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'تم التحديث بنجاح',
          description: `تم تحديث ${selectedEmployees.length} موظف بنجاح`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onBulkEditClose();
        setSelectedRowKeys([]);
        setSelectedEmployees([]);
        loadEmployees();
      } else {
        showErrorModal(
          'خطأ في التحديث',
          'خطأ في تحديث الموظفين: ' + data.message
        );
      }
    } catch (error) {
      showErrorModal(
        'خطأ في التحديث',
        'خطأ في تحديث الموظفين: ' + error.message
      );
    }
  };

  const handleCalculateSalary = async (employee) => {
    try {
      console.log('Calculating salary for employee:', employee.id);
      
      const response = await fetch(getApiUrl('/api/unified_salary_api_v2.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'calculate_employee',
          employee_id: employee.id,
          period: new Date().toISOString().slice(0, 7) // YYYY-MM format
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const salaryAmount = result.data.net_salary || result.data.total_salary || 0;
        toast({
          title: 'تم حساب الراتب بنجاح',
          description: `راتب ${employee.name_ar || employee.name}: ${formatCurrency(salaryAmount)}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error(result.message || 'فشل في حساب الراتب');
      }
    } catch (error) {
      console.error('Error calculating salary:', error);
      showErrorModal(
        'خطأ في حساب الراتب',
        error.message || 'حدث خطأ أثناء حساب الراتب'
      );
    }
  };

  // Handle view employee - Fixed undefined error + تحسين الأداء
  const handleViewEmployee = useCallback(async (employee) => {
    // جلب أحدث بيانات الموظف من API لضمان الحصول على جميع الحقول المحدثة
    try {
      const response = await fetch(getApiUrl(`/api/unified_employees_api.php?action=get_employee&employee_id=${employee.id}`));
      const data = await response.json();
      if (data.success && data.data) {
        setSelectedEmployee(data.data);
      } else {
        // إذا فشل الجلب، استخدم البيانات المحلية
        setSelectedEmployee(employee);
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
      // في حالة الخطأ، استخدم البيانات المحلية
      setSelectedEmployee(employee);
    }
    onViewOpen();
  }, [onViewOpen]);

  // Handle edit employee - Open edit modal + تحسين الأداء
  const handleEditEmployeeClick = useCallback((employee) => {
    console.log('Editing employee:', employee);
    setSelectedEmployee(employee);
    
    const formData = {
      employee_code: employee.employee_code || '',
      ac_no: employee['AC-No.'] || '',
      name: employee.name || '',
      name_ar: employee.name_ar || '',
      base_salary: employee.base_salary || 0,
      discrimination_incentive_allowance: employee.discrimination_incentive_allowance ?? 0,
      salary_type: employee.salary_type || 'Monthly',
      department: employee.department || '',
      cost_center: employee.cost_center || '',
      position: employee.position || '',
      location: employee.location || '',
      hire_date: employee.hire_date ? (employee.hire_date.includes(' ') ? employee.hire_date.split(' ')[0] : employee.hire_date) : '',
      status: employee.status || 'active',
      is_insured: !!(employee.is_insured === 1 || employee.is_insured === true || employee.is_insured === '1' || employee.is_insured === 'true'),
    };
    
    console.log('Form data to reset:', formData);
    console.log('Employee salary_type:', employee.salary_type);
    reset(formData);
    onEditOpen();
  }, [reset, onEditOpen]);

  // Handle edit modal close - Return to view modal
  const handleEditClose = useCallback(() => {
    onEditClose();
    // فتح مودال التفاصيل مرة أخرى بعد إغلاق مودال التعديل
    if (selectedEmployee) {
      onViewOpen();
    }
  }, [onEditClose, onViewOpen, selectedEmployee]);

  // فتح مودال التعديل عند الانتقال من صفحة الحضور (زر "تعديل البيانات")
  useEffect(() => {
    const state = location.state;
    if (state?.openEmployeeId && state?.openMode === 'edit') {
      fetch(getApiUrl(`/api/unified_employees_api.php?action=get_employee&employee_id=${state.openEmployeeId}`))
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data) {
            handleEditEmployeeClick(data.data);
          }
        })
        .catch((err) => console.error('Error opening employee for edit:', err));
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate, handleEditEmployeeClick]);

  // تحسين الأداء - استخدام useMemo لتجنب إعادة الحساب في كل render
  const filteredEmployees = useMemo(() => {
    let filtered = employees.filter(employee => {
      const matchesSearch = employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           employee.name_ar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           employee.employee_code?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // استخدام الفلاتر الصحيحة - دمج فلاتر الوضع العادي ووضع ملء الشاشة
      const departmentFilterToUse = departmentFilter || selectedDepartment;
      const costCenterFilterToUse = costCenterFilter || selectedCostCenter;
      const salaryTypeFilterToUse = salaryTypeFilter || selectedSalaryType;
      const empStatus = (employee.status || 'active').toString().toLowerCase();
      
      const matchesDepartment = !departmentFilterToUse || employee.department === departmentFilterToUse;
      const matchesCostCenter = !costCenterFilterToUse || employee.cost_center === costCenterFilterToUse;
      const matchesSalaryType = !salaryTypeFilterToUse || employee.salary_type === salaryTypeFilterToUse;
      const matchesEmploymentStatus =
        employmentStatusFilter === 'all' ||
        empStatus === employmentStatusFilter.toLowerCase();
      return matchesSearch && matchesDepartment && matchesCostCenter && matchesSalaryType && matchesEmploymentStatus;
    });

    // Apply sorting if configured
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle different data types
        if (sortConfig.key === 'employee_code' || sortConfig.key === 'AC-No.') {
          // For employee codes, try to parse as numbers first
          aValue = parseInt(aValue) || aValue || '';
          bValue = parseInt(bValue) || bValue || '';
        } else if (sortConfig.key === 'base_salary' || sortConfig.key === 'discrimination_incentive_allowance') {
          // For salary, parse as numbers
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        } else if (sortConfig.key === 'name') {
          aValue = ((a.name_ar || a.name) || '').toString().toLowerCase();
          bValue = ((b.name_ar || b.name) || '').toString().toLowerCase();
        } else if (sortConfig.key === 'is_insured') {
          aValue = (a.is_insured === 1 || a.is_insured === true || a.is_insured === '1' || a.is_insured === 'true') ? 1 : 0;
          bValue = (b.is_insured === 1 || b.is_insured === true || b.is_insured === '1' || b.is_insured === 'true') ? 1 : 0;
        } else {
          // For text fields (salary_type, status, department, cost_center, position, location), convert to lowercase
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
  }, [employees, searchTerm, departmentFilter, costCenterFilter, salaryTypeFilter, employmentStatusFilter, selectedDepartment, selectedCostCenter, selectedSalaryType, sortConfig]);

  const searchOnlyEmployees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter(
      (employee) =>
        employee.name?.toLowerCase().includes(term) ||
        employee.name_ar?.toLowerCase().includes(term) ||
        employee.employee_code?.toLowerCase().includes(term)
    );
  }, [employees, searchTerm]);

  const employeeHeaderStatChips = useMemo(() => {
    const isActive = (emp) => (emp.status || 'active').toString().toLowerCase() === 'active';
    const countActive = (arr) => arr.filter(isActive).length;
    const countInactive = (arr) => arr.length - countActive(arr);
    const countMonthly = (arr) => arr.filter((e) => e.salary_type === 'Monthly').length;
    const countWeekly = (arr) => arr.filter((e) => e.salary_type === 'Weekly').length;
    const countInsured = (arr) =>
      arr.filter(
        (e) => e.is_insured === 1 || e.is_insured === true || e.is_insured === '1' || e.is_insured === 'true'
      ).length;
    const uniqueDepartments = (arr) => new Set(arr.map((e) => e.department).filter(Boolean)).size;
    const uniqueCostCenters = (arr) => new Set(arr.map((e) => e.cost_center).filter(Boolean)).size;

    const pool = filteredEmployees;
    const searchPool = searchOnlyEmployees;
    const hasSearch = Boolean(searchTerm.trim());
    const pendingType = selectedFilterType;

    const chip = (key, value, label, variant = 'total') => ({ key, value, label, variant });

    if (salaryTypeFilter) {
      return [
        chip('matched', pool.length, salaryTypeFilter === 'Monthly' ? 'شهري' : 'أسبوعي', 'filtered'),
        chip('scope', hasSearch ? searchPool.length : stats.total, hasSearch ? 'ضمن البحث' : 'من الإجمالي', 'total'),
        chip('active', countActive(pool), 'نشط', 'active'),
        chip('inactive', countInactive(pool), 'غير نشط', 'inactive'),
      ];
    }

    if (departmentFilter) {
      const dept = departments.find((d) => d.name === departmentFilter);
      const deptLabel = (dept?.description || departmentFilter).slice(0, 20);
      return [
        chip('matched', pool.length, deptLabel, 'filtered'),
        chip('active', countActive(pool), 'نشط', 'active'),
        chip('inactive', countInactive(pool), 'غير نشط', 'inactive'),
        chip('insured', countInsured(pool), 'مؤمّن', 'weekly'),
      ];
    }

    if (costCenterFilter) {
      return [
        chip('matched', pool.length, costCenterFilter.slice(0, 18), 'filtered'),
        chip('active', countActive(pool), 'نشط', 'active'),
        chip('inactive', countInactive(pool), 'غير نشط', 'inactive'),
        chip('insured', countInsured(pool), 'مؤمّن', 'weekly'),
      ];
    }

    if (employmentStatusFilter) {
      const statusLabel = getEmploymentStatusFilterLabel(employmentStatusFilter);
      const statusVariant =
        employmentStatusFilter === 'all'
          ? 'total'
          : employmentStatusFilter === 'active'
            ? 'active'
            : 'inactive';
      return [
        chip('matched', pool.length, statusLabel, statusVariant),
        chip('scope', hasSearch ? searchPool.length : stats.total, hasSearch ? 'ضمن البحث' : 'من الإجمالي', 'total'),
        chip('monthly', countMonthly(pool), 'شهري', 'filtered'),
        chip('weekly', countWeekly(pool), 'أسبوعي', 'weekly'),
      ];
    }

    if (pendingType === 'salaryType') {
      return [
        chip('monthly', countMonthly(searchPool), 'شهري', 'filtered'),
        chip('weekly', countWeekly(searchPool), 'أسبوعي', 'weekly'),
        chip('base', searchPool.length, hasSearch ? 'نتائج البحث' : 'إجمالي', 'total'),
      ];
    }

    if (pendingType === 'department') {
      return [
        chip('depts', uniqueDepartments(searchPool), 'أقسام', 'filtered'),
        chip('employees', searchPool.length, 'موظف', 'total'),
        chip('active', countActive(searchPool), 'نشط', 'active'),
        chip('inactive', countInactive(searchPool), 'غير نشط', 'inactive'),
      ];
    }

    if (pendingType === 'costCenter') {
      return [
        chip('centers', uniqueCostCenters(searchPool), 'مراكز تكلفة', 'filtered'),
        chip('employees', searchPool.length, 'موظف', 'total'),
        chip('active', countActive(searchPool), 'نشط', 'active'),
      ];
    }

    if (pendingType === 'employmentStatus') {
      return [
        chip('active', countActive(searchPool), 'نشط', 'active'),
        chip('inactive', countInactive(searchPool), 'غير نشط', 'inactive'),
        chip('base', searchPool.length, hasSearch ? 'نتائج البحث' : 'إجمالي', 'total'),
      ];
    }

    if (hasSearch) {
      return [
        chip('matched', pool.length, `من ${stats.total}`, 'total'),
        chip('active', countActive(pool), 'نشط', 'active'),
        chip('inactive', countInactive(pool), 'غير نشط', 'inactive'),
        chip('monthly', countMonthly(pool), 'شهري', 'filtered'),
        chip('weekly', countWeekly(pool), 'أسبوعي', 'weekly'),
      ];
    }

    return [
      chip('total', stats.total, 'الإجمالي', 'total'),
      chip('active', stats.active, 'نشط', 'active'),
      chip('inactive', stats.inactive, 'غير نشط', 'inactive'),
      chip('monthly', countMonthly(employees), 'شهري', 'filtered'),
      chip('weekly', countWeekly(employees), 'أسبوعي', 'weekly'),
    ];
  }, [
    filteredEmployees,
    searchOnlyEmployees,
    employees,
    stats,
    salaryTypeFilter,
    departmentFilter,
    costCenterFilter,
    employmentStatusFilter,
    selectedFilterType,
    searchTerm,
    departments,
  ]);

  const employeeHeaderSubtitle = useMemo(() => {
    if (salaryTypeFilter) {
      return `تصفية حسب ${salaryTypeFilter === 'Monthly' ? 'المرتب الشهري' : 'المرتب الأسبوعي'}`;
    }
    if (departmentFilter) {
      const dept = departments.find((d) => d.name === departmentFilter);
      return `تصفية حسب القسم: ${dept?.description || departmentFilter}`;
    }
    if (costCenterFilter) {
      return `تصفية حسب مركز التكلفة: ${costCenterFilter}`;
    }
    if (employmentStatusFilter) {
      return `تصفية حسب الحالة: ${getEmploymentStatusFilterLabel(employmentStatusFilter)}`;
    }
    if (selectedFilterType === 'salaryType') return 'اختر نوع المرتب لعرض الإحصائيات';
    if (selectedFilterType === 'department') return 'اختر القسم لعرض الإحصائيات';
    if (selectedFilterType === 'costCenter') return 'اختر مركز التكلفة لعرض الإحصائيات';
    if (selectedFilterType === 'employmentStatus') return 'اختر الحالة لعرض الإحصائيات';
    if (searchTerm.trim()) return `نتائج البحث عن «${searchTerm.trim()}»`;
    return 'بحث وتصفية وإدارة سجلات الموظفين';
  }, [
    salaryTypeFilter,
    departmentFilter,
    costCenterFilter,
    employmentStatusFilter,
    selectedFilterType,
    searchTerm,
    departments,
  ]);

  const employeeListContextLabel = useMemo(() => {
    if (searchTerm.trim()) return `بحث: «${searchTerm.trim()}»`;
    if (departmentFilter) {
      const dept = departments.find((d) => d.name === departmentFilter);
      return dept?.description || departmentFilter;
    }
    if (costCenterFilter) return costCenterFilter;
    if (salaryTypeFilter) {
      return salaryTypeFilter === 'Monthly' ? 'مرتب شهري' : 'مرتب أسبوعي';
    }
    return getEmploymentStatusFilterLabel(employmentStatusFilter || EMPLOYMENT_STATUS_FILTER_DEFAULT);
  }, [
    searchTerm,
    departmentFilter,
    costCenterFilter,
    salaryTypeFilter,
    employmentStatusFilter,
    departments,
  ]);

  const StatCard = ({ title, value, change, changeType, icon, color, bgGradient }) => (
    <Card
      className="stake-card"
      overflow="hidden"
      position="relative"
      transition="all 0.3s ease"
      boxShadow="0 4px 15px rgba(0, 0, 0, 0.05)"
    >
      <CardBody p="6">
        <HStack justify="space-between" align="flex-start" mb="4">
          <VStack align="flex-start" spacing="1">
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              {title}
            </Text>
            <Heading  color="gray.800" fontWeight="bold">
              {value}
            </Heading>
          </VStack>
          <Circle size="10" bg={bgGradient} color="white">
            <Icon as={icon} boxSize="5" />
          </Circle>
        </HStack>
        {change && (
          <HStack spacing="2">
            <Icon as={changeType === 'increase' ? 'FiTrendingUp' : 'FiTrendingDown'} color={changeType === 'increase' ? 'green.500' : 'red.500'} />
            <Text fontSize="sm" color={changeType === 'increase' ? 'green.600' : 'red.600'} fontWeight="medium">
              {change}
            </Text>
          </HStack>
        )}
      </CardBody>
    </Card>
  );

  return (
    <Box
      className={`tp-table-page-layout tp-employees-page-layout tp-salary-page-layout${filtersCollapsed ? ' tp-salary-page-layout--header-collapsed' : ''}`}
      flex="1"
      minH="0"
      w="100%"
      maxW="100%"
      display="flex"
      flexDirection="column"
      alignItems="stretch"
    >
      {/* عنوان الصفحة + الفلاتر — زر الإظهار/الإخفاء في الهيدر العام (TimePay | زر | اسم الشركة) */}
      {!filtersCollapsed && (
      <Box mb={{ base: 2, md: 3 }} className="weekly-salary-header-shell tp-employees-page-header" w="100%" maxW="100%">
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
                  className="weekly-salary-header-icon-wrap tp-employees-header-icon-wrap"
                  aria-hidden
                >
                  <Icon as={FiUsers} boxSize={{ base: 5, md: 6 }} />
                </Flex>
                <VStack align="flex-start" spacing={0.5} minW={0}>
                  <Heading className="stake-heading-3 weekly-salary-page-title tp-page-header-title" size="md" lineHeight="short" mb={0}>
                    إدارة الموظفين
                  </Heading>
                  <Text className="tp-page-header-subtitle" noOfLines={2}>
                    {employeeHeaderSubtitle}
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
                {employeeHeaderStatChips.map((statChip) => (
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
              flexWrap="wrap"
              align="stretch"
              justify="space-between"
              gap={3}
              rowGap={3}
              className="weekly-salary-header-row weekly-salary-header-tools"
            >
              <Flex
                flexWrap="wrap"
                align="center"
                alignContent="center"
                gap={3}
                minW={0}
                flex="1 1 280px"
                className="fp-toolbar-zone--filters"
              >
                <HStack spacing={3} align="center" flexShrink={0} className="fp-toolbar-filter-inner" flexWrap="wrap" rowGap={2} w="100%">
              <Box w={{ base: '100%', sm: '200px' }} maxW="260px" flexShrink={0}>
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
                value={
                  selectedFilterType === 'salaryType'
                    ? 'salaryType'
                    : selectedFilterType === 'department'
                    ? 'department'
                    : selectedFilterType === 'costCenter'
                    ? 'costCenter'
                    : selectedFilterType === 'employmentStatus'
                    ? 'employmentStatus'
                    : ''
                }
                onChange={(val) => handleFilterTypeSelect(val)}
              >
                <HStack spacing="4">
                  <Radio
                    value="salaryType"
                    colorScheme="blue"
                    size="md"
                    sx={{
                      '& .chakra-radio__control': {
                        borderWidth: '2px',
                        borderColor: 'var(--stake-border-primary)',
                        _before: { bg: 'var(--stake-bg-secondary)' }
                      }
                    }}
                  >
                    <Text fontSize="sm" fontWeight="medium" color="var(--stake-text-primary)">نوع المرتب</Text>
                  </Radio>
                  <Radio
                    value="department"
                    colorScheme="blue"
                    size="md"
                    sx={{
                      '& .chakra-radio__control': {
                        borderWidth: '2px',
                        borderColor: 'var(--stake-border-primary)',
                        _before: { bg: 'var(--stake-bg-secondary)' }
                      }
                    }}
                  >
                    <Text fontSize="sm" fontWeight="medium" color="var(--stake-text-primary)">القسم</Text>
                  </Radio>
                  <Radio
                    value="costCenter"
                    colorScheme="blue"
                    size="md"
                    sx={{
                      '& .chakra-radio__control': {
                        borderWidth: '2px',
                        borderColor: 'var(--stake-border-primary)',
                        _before: { bg: 'var(--stake-bg-secondary)' }
                      }
                    }}
                  >
                    <Text fontSize="sm" fontWeight="medium" color="var(--stake-text-primary)">التكلفة</Text>
                  </Radio>
                  <Radio
                    value="employmentStatus"
                    colorScheme="blue"
                    size="md"
                    sx={{
                      '& .chakra-radio__control': {
                        borderWidth: '2px',
                        borderColor: 'var(--stake-border-primary)',
                        _before: { bg: 'var(--stake-bg-secondary)' }
                      }
                    }}
                  >
                    <Text fontSize="sm" fontWeight="medium" color="var(--stake-text-primary)">الحالة</Text>
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
                  {selectedFilterType === 'salaryType' && salaryTypeFilter
                    ? (salaryTypeFilter === 'Monthly' ? 'شهري' : 'أسبوعي')
                    : selectedFilterType === 'department' && departmentFilter
                    ? (departments.find(d => d.name === departmentFilter)?.description || departmentFilter)
                    : selectedFilterType === 'costCenter' && costCenterFilter
                    ? costCenterFilter
                    : selectedFilterType === 'employmentStatus' && employmentStatusFilter
                    ? getEmploymentStatusFilterLabel(employmentStatusFilter)
                    : 'اختر القيمة'}
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
                    {selectedFilterType === 'salaryType' && (
                      <>
                        <MenuItem icon={<FiDollarSign />} onClick={() => setSalaryTypeFilter('Monthly')}>شهري</MenuItem>
                        <MenuItem icon={<FiDollarSign />} onClick={() => setSalaryTypeFilter('Weekly')}>أسبوعي</MenuItem>
                      </>
                    )}
                    {selectedFilterType === 'department' && departments.map(dept => (
                      <MenuItem key={dept.id} icon={<FiBriefcase />} onClick={() => setDepartmentFilter(dept.name)}>{dept.description || dept.name}</MenuItem>
                    ))}
                    {selectedFilterType === 'costCenter' && costCenters.map(center => (
                      <MenuItem key={center.id} icon={<FiBriefcase />} onClick={() => setCostCenterFilter(center.name)}>{center.name}</MenuItem>
                    ))}
                    {selectedFilterType === 'employmentStatus' && (
                      <>
                        <MenuItem icon={<FiUser />} onClick={() => handleFilterValueSelect('all')}>الكل</MenuItem>
                        <MenuItem icon={<FiCheckCircle />} onClick={() => handleFilterValueSelect('active')}>نشط</MenuItem>
                        <MenuItem icon={<FiXCircle />} onClick={() => handleFilterValueSelect('inactive')}>غير نشط</MenuItem>
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
                _hover={{ bg: 'transparent', opacity: 0.85 }}
                _active={{ bg: 'transparent' }}
                _focus={{ boxShadow: 'none' }}
              />
                </HStack>
              </Flex>
            </Flex>
          </VStack>
        </Box>
      </Box>
      )}

        {/* Statistics Cards */}

      {/* Employees Table */}
      <Card
        className="stake-card weekly-salary-main-card employees-main-card"
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
            className="fp-list-toolbar weekly-salary-list-toolbar employees-list-toolbar tp-employees-card-toolbar"
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
              <Heading size="md" className="stake-heading-3 weekly-salary-list-heading" flexShrink={0}>
                قائمة الموظفين ({filteredEmployees.length})
              </Heading>
              {filtersCollapsed && employeeListContextLabel ? (
                <Text
                  className="stake-text-secondary weekly-salary-list-period"
                  fontSize="sm"
                  fontWeight="500"
                  whiteSpace="nowrap"
                  flexShrink={0}
                  title={employeeHeaderSubtitle}
                >
                  — {employeeListContextLabel}
                </Text>
              ) : null}
            </HStack>
            <HStack spacing="3" flexWrap="wrap" rowGap="2" align="center" justify="flex-end" flex={{ base: '1 1 100%', lg: '0 1 auto' }} minW={0}>
              {viewMode === 'table' && (
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
                  <MenuList minW="260px" className="stake-card" bg="var(--stake-bg-primary)" borderColor="var(--stake-border-primary)">
                    {empTableColumns.map((col) => (
                      <Box key={col.id} px="3" py="2">
                        <HStack justify="space-between">
                          <HStack>
                            <Switch isChecked={col.visible} onChange={() => toggleEmpColumn(col.id)} />
                            <Text fontSize="sm">{col.label}</Text>
                          </HStack>
                          <HStack spacing="1">
                            <IconButton aria-label="أعلى" icon={<FiChevronUp />} size="xs" variant="ghost" onClick={() => moveEmpColumn(col.id, 'up')} />
                            <IconButton aria-label="أسفل" icon={<FiChevronDown />} size="xs" variant="ghost" onClick={() => moveEmpColumn(col.id, 'down')} />
                          </HStack>
                        </HStack>
                      </Box>
                    ))}
                  </MenuList>
                </Menu>
              )}
              <Box position="relative" display="inline-block" order={2}>
                <Tooltip
                  label="تصدير بيانات الموظفين (XML)"
                  bg="var(--stake-bg-secondary)"
                  color="var(--stake-text-primary)"
                  borderColor="var(--stake-border-primary)"
                  placement="top"
                  hasArrow
                  openDelay={400}
                >
                  <Box as="span" display="inline-block">
                    <Button
                      leftIcon={<FiUpload />}
                      className="stake-btn-secondary"
                      size="md"
                      onClick={onExportOpen}
                      aria-label="تصدير بيانات الموظفين"
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
                        تصدير
                      </Text>
                    </Button>
                  </Box>
                </Tooltip>
              </Box>
              <Box position="relative" display="inline-block" order={1}>
                <Tooltip
                  label="استيراد بيانات الموظفين من XML"
                  bg="var(--stake-bg-secondary)"
                  color="var(--stake-text-primary)"
                  borderColor="var(--stake-border-primary)"
                  placement="top"
                  hasArrow
                  openDelay={400}
                >
                  <Box as="span" display="inline-block">
                    <Button
                      leftIcon={<FiDownload />}
                      className="stake-btn-secondary"
                      size="md"
                      onClick={onImportOpen}
                      aria-label="استيراد بيانات الموظفين"
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
                        استيراد
                      </Text>
                    </Button>
                  </Box>
                </Tooltip>
              </Box>
              <Box position="relative" display="inline-block">
                <Tooltip
                  label="إضافة موظف جديد"
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
                      onClick={onAddOpen}
                      aria-label="إضافة موظف جديد"
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
                        إضافة موظف
                      </Text>
                    </Button>
                  </Box>
                </Tooltip>
              </Box>
            </HStack>
          </HStack>

        {/* Bulk Actions for Normal Table */}
        {viewMode === 'table' && selectedEmployees.length > 0 && (
          <HStack spacing="3" p="3" bg="var(--stake-bg-secondary)" borderBottom="1px solid" borderColor="var(--stake-border-primary)" wrap="wrap" flexShrink={0} w="full" justify="space-between">
            <HStack spacing="3">
              <Text fontSize="sm" fontWeight="medium" color="var(--stake-text-primary)">
                تم اختيار {selectedEmployees.length} موظف
              </Text>
              <HStack spacing="2">
                <Button
                  bg="var(--stake-primary, #3b82f6)"
                  color="white"
                  _hover={{ opacity: 0.9 }}
                  _active={{ opacity: 0.85 }}
                  leftIcon={<FiEdit />}
                  onClick={handleBulkEdit}
                >
                  تعديل الكل
                </Button>
                <Button
                  bg="red.500"
                  color="white"
                  _hover={{ bg: "red.600" }}
                  _active={{ bg: "red.700" }}
                  leftIcon={<FiTrash2 />}
                  onClick={handleBulkDelete}
                >
                  حذف الكل
                </Button>
              </HStack>
            </HStack>
            <IconButton
              aria-label="إلغاء الاختيارات"
              icon={<FiX />}
              size="sm"
              variant="ghost"
              color="var(--stake-text-secondary)"
              _hover={{ color: "var(--stake-text-primary)", bg: "var(--stake-bg-hover)" }}
              ms="3"
              me="4"
              onClick={() => {
                setSelectedRowKeys([]);
                setSelectedEmployees([]);
              }}
            />
          </HStack>
        )}
        
          {viewMode === 'table' ? (
            <div className="bg-[#151E32] border border-[#1F2A44] rounded-[20px] overflow-hidden" style={{background:'#151E32', border:'1px solid #1F2A44', borderRadius:'20px'}}
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
                className="stake-table main-content compact-data-table w-full" style={{background:"#151E32"}}
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
                  const visibleCols = empTableColumns.filter((c) => c.visible);
                  const codeW = 'var(--fp-col-code-width)';
                  const hasCodeCol = visibleCols.some((c) => c.id === 'employee_code');
                  const fluidCols = visibleCols.filter((c) => !(hasCodeCol && c.id === 'employee_code'));
                  const subParts = ['40px'];
                  if (hasCodeCol) subParts.push(codeW);
                  const fluidStyle =
                    fluidCols.length > 0
                      ? { width: `calc((100% - ${subParts.join(' - ')}) / ${fluidCols.length})`, minWidth: 0 }
                      : { width: 'auto', minWidth: 0 };
                  return (
                    <colgroup>
                      <col style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }} />
                      {visibleCols.map((c) => {
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
                    <Th w="40px" minW="40px" maxW="40px" px="2" textAlign="center" verticalAlign="middle">
                      <Checkbox
                        isChecked={selectedRowKeys.length === filteredEmployees.length && filteredEmployees.length > 0}
                        isIndeterminate={selectedRowKeys.length > 0 && selectedRowKeys.length < filteredEmployees.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const allKeys = filteredEmployees.map(emp => emp.id);
                            setSelectedRowKeys(allKeys);
                            setSelectedEmployees(filteredEmployees);
                          } else {
                            setSelectedRowKeys([]);
                            setSelectedEmployees([]);
                          }
                        }}
                      />
                    </Th>
                    {empTableColumns.filter(c => c.visible).map((col) => {
                      const sortKey = col.id === 'fingerprint_code' ? 'AC-No.' : col.id;
                      const canSort = ['employee_code', 'AC-No.', 'name', 'base_salary', 'discrimination_incentive_allowance', 'salary_type', 'status', 'is_insured', 'department', 'cost_center', 'position', 'location'].includes(sortKey);
                      return (
                        <Th
                          key={col.id}
                          cursor={canSort ? 'pointer' : undefined}
                          onClick={canSort ? () => handleSort(sortKey) : undefined}
                          className={getFinancialTableColumnClass({ id: col.id, label: col.label })}
                        >
                          <EnglishKeyTooltip englishKey={col.id}>{col.label}</EnglishKeyTooltip>
                        </Th>
                      );
                    })}
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredEmployees.map((employee) => (
                    <Tr 
                      key={employee.id}
                      onDoubleClick={() => handleViewEmployee(employee)}
                      cursor="pointer"
                      _hover={{ bg: "var(--stake-bg-hover)" }}
                    >
                      <Td w="40px" minW="40px" maxW="40px" px="2" textAlign="center" verticalAlign="middle">
                        <Checkbox
                          isChecked={selectedRowKeys.includes(employee.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRowKeys([...selectedRowKeys, employee.id]);
                              setSelectedEmployees([...selectedEmployees, employee]);
                            } else {
                              setSelectedRowKeys(selectedRowKeys.filter(key => key !== employee.id));
                              setSelectedEmployees(selectedEmployees.filter(emp => emp.id !== employee.id));
                            }
                          }}
                        />
                      </Td>
                      {empTableColumns.filter(c => c.visible).map((col) => {
                        if (col.id === 'employee_code') {
                          const fpCode = getFinancialTableColumnClass({ id: col.id, label: col.label });
                          return (
                            <Td key={col.id} className={fpCode}>
                              <Text className="fp-cell-text" fontWeight="semibold" color="blue.600" fontFamily="mono">
                                {employee.employee_code}
                              </Text>
                            </Td>
                          );
                        }
                        if (col.id === 'fingerprint_code') {
                          const fpFp = getFinancialTableColumnClass({ id: col.id, label: col.label });
                          return (
                            <Td key={col.id} className={fpFp}>
                              <Text className="fp-cell-text" fontWeight="semibold" color="green.600" fontFamily="mono">
                                {employee['AC-No.'] || '-'}
                              </Text>
                            </Td>
                          );
                        }
                        if (col.id === 'name') {
                          const fpN = getFinancialTableColumnClass({ id: col.id, label: col.label });
                          return (
                            <Td key={col.id} className={fpN}>
                              <Text className="fp-cell-text" fontWeight="semibold" color="gray.800">
                                {employee.name_ar || employee.name}
                              </Text>
                            </Td>
                          );
                        }
                        if (col.id === 'base_salary') {
                          const fp = getFinancialTableColumnClass({ id: col.id, label: col.label });
                          return (
                            <Td key={col.id} className={fp}>
                              <Text className="fp-cell-text fp-money" fontWeight="semibold">{formatCurrency(employee.base_salary || 0)}</Text>
                            </Td>
                          );
                        }
                        if (col.id === 'discrimination_incentive_allowance') {
                          const fp = getFinancialTableColumnClass({ id: col.id, label: col.label });
                          return (
                            <Td key={col.id} className={fp}>
                              <Text className="fp-cell-text fp-money" fontWeight="semibold">{formatCurrency(employee.discrimination_incentive_allowance ?? 0)}</Text>
                            </Td>
                          );
                        }
                        if (col.id === 'salary_type') {
                          const fpSt = getFinancialTableColumnClass({ id: col.id, label: col.label });
                          return (
                            <Td key={col.id} className={fpSt}>
                              <Badge colorScheme={employee.salary_type === 'Monthly' ? 'blue' : 'purple'} variant="subtle" borderRadius="full" px="3" py="1">
                                {employee.salary_type === 'Monthly' ? 'شهري' : 'أسبوعي'}
                              </Badge>
                            </Td>
                          );
                        }
                        if (col.id === 'status') {
                          const fpStat = getFinancialTableColumnClass({ id: col.id, label: col.label });
                          return (
                            <Td key={col.id} className={fpStat}>
                              <Badge colorScheme={employee.status === 'active' ? 'green' : 'red'} variant="subtle" borderRadius="full" px="3" py="1">
                                {employee.status === 'active' ? 'نشط' : 'غير نشط'}
                              </Badge>
                            </Td>
                          );
                        }
                        if (col.id === 'is_insured') {
                          const fpIns = getFinancialTableColumnClass({ id: col.id, label: col.label });
                          return (
                            <Td key={col.id} className={fpIns}>
                              {employee.is_insured ? (
                                <Icon
                                  as={FiCheckCircle}
                                  className="tp-employee-insurance-icon tp-employee-insurance-icon--insured"
                                  boxSize="5"
                                  title="مؤمن عليه"
                                  aria-label="مؤمن عليه"
                                />
                              ) : (
                                <Icon
                                  as={FiXCircle}
                                  className="tp-employee-insurance-icon tp-employee-insurance-icon--uninsured"
                                  boxSize="5"
                                  title="غير مؤمن عليه"
                                  aria-label="غير مؤمن عليه"
                                />
                              )}
                            </Td>
                          );
                        }
                        if (col.id === 'department') {
                          const fpDep = getFinancialTableColumnClass({ id: col.id, label: col.label });
                          return (
                            <Td key={col.id} className={fpDep}>
                              <Badge colorScheme="purple" variant="subtle" borderRadius="full" px="3" py="1">
                                {employee.department_description || employee.department || '-'}
                              </Badge>
                            </Td>
                          );
                        }
                        if (col.id === 'cost_center') {
                          const fpCc = getFinancialTableColumnClass({ id: col.id, label: col.label });
                          return (
                            <Td key={col.id} className={fpCc}>
                              <Text className="fp-cell-text" fontSize="sm" color="gray.600">
                                {employee.salary_type === 'Weekly' ? (employee.cost_center || '-') : '-'}
                              </Text>
                            </Td>
                          );
                        }
                        if (col.id === 'position') {
                          const fpPos = getFinancialTableColumnClass({ id: col.id, label: col.label });
                          return (
                            <Td key={col.id} className={fpPos}>
                              <Text className="fp-cell-text" fontSize="sm" color="gray.700">
                                {employee.position || '-'}
                              </Text>
                            </Td>
                          );
                        }
                        if (col.id === 'location') {
                          const fpLoc = getFinancialTableColumnClass({ id: col.id, label: col.label });
                          return (
                            <Td key={col.id} className={fpLoc}>
                              <Badge colorScheme={employee.location === 'برج العرب' ? 'blue' : 'green'} variant="subtle" borderRadius="full" px="3" py="1">
                                {employee.location || '-'}
                              </Badge>
                            </Td>
                          );
                        }
                        const fpFallback = getFinancialTableColumnClass({ id: col.id, label: col.label });
                        return (
                          <Td key={col.id} className={fpFallback}>
                            <Text className="fp-cell-text">-</Text>
                          </Td>
                        );
                      })}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing="6">
              {filteredEmployees.map((employee) => (
                <Card 
                  key={employee.id} 
                  bg="white" 
                  border="1px solid" 
                  borderColor="gray.200" 
                  borderRadius="xl" 
                  overflow="hidden"
                  onDoubleClick={() => handleViewEmployeeClick(employee)}
                  cursor="pointer"
                  _hover={{ 
                    transform: "translateY(-2px)",
                    boxShadow: "lg",
                    borderColor: "blue.300"
                  }}
                  transition="all 0.2s ease"
                >
                  <CardBody p="6">
                    <VStack spacing="4" align="stretch">
                      {/* Header with Avatar */}
                      <HStack justify="space-between" align="flex-start">
                        <Avatar name={employee.name_ar || employee.name} bg="blue.500" />
                      </HStack>
                      
                      {/* Employee Info */}
                      <VStack spacing="2" align="stretch">
                        <VStack spacing="1" align="flex-start">
                          <Text fontWeight="bold" fontSize="lg" color="gray.800">
                            {employee.name_ar || employee.name}
                          </Text>
                          <Text fontSize="xs" color="blue.600" fontFamily="mono" fontWeight="semibold">
                            #{employee.employee_code}
                          </Text>
                        </VStack>
                        
                        <Divider />
                        
                        <VStack spacing="2" align="stretch">
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.600">الراتب:</Text>
                            <Text fontWeight="semibold" color="green.600">
                              {formatCurrency(employee.base_salary || 0)}
                            </Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.600">المتغير:</Text>
                            <Text fontWeight="semibold" color="orange.500">
                              {formatCurrency(employee.discrimination_incentive_allowance ?? 0)}
                            </Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.600">النوع:</Text>
                            <Badge
                              colorScheme={employee.salary_type === 'Monthly' ? 'blue' : 'green'}
                              variant="subtle"
                            >
                              {employee.salary_type}
                            </Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.600">القسم:</Text>
                            <Text fontSize="sm" color="gray.700">{employee.department_description || employee.department || '-'}</Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.600">المنصب:</Text>
                            <Text fontSize="sm" color="gray.700">{employee.position || '-'}</Text>
                          </HStack>
                        </VStack>
                      </VStack>
                      
                      {/* Actions */}
                      <HStack spacing="2" justify="center">
                        <Tooltip 
                          label="عرض التفاصيل"
                          bg="var(--stake-bg-secondary)"
                          color="var(--stake-text-primary)"
                          borderColor="var(--stake-border-primary)"
                        >
                          <IconButton
                            icon={<FiEye />}
                            variant="outline"
                            colorScheme="blue"
                            onClick={() => handleViewEmployee(employee)}
                          />
                        </Tooltip>
                        <Tooltip 
                          label="تعديل"
                          bg="var(--stake-bg-secondary)"
                          color="var(--stake-text-primary)"
                          borderColor="var(--stake-border-primary)"
                        >
                          <IconButton
                            icon={<FiEdit />}
                            variant="outline"
                            colorScheme="green"
                            onClick={() => handleEditEmployeeClick(employee)}
                          />
                        </Tooltip>
                        <Tooltip 
                          label="حساب الراتب"
                          bg="var(--stake-bg-secondary)"
                          color="var(--stake-text-primary)"
                          borderColor="var(--stake-border-primary)"
                        >
                          <IconButton
                            icon={<FiPercent />}
                            variant="outline"
                            colorScheme="purple"
                            onClick={() => handleCalculateSalary(employee)}
                          />
                        </Tooltip>
                        <Tooltip 
                          label="حذف"
                          bg="var(--stake-bg-secondary)"
                          color="var(--stake-text-primary)"
                          borderColor="var(--stake-border-primary)"
                        >
                          <IconButton
                            icon={<FiTrash2 />}
                            variant="outline"
                            colorScheme="red"
                            onClick={() => handleDeleteEmployee(employee)}
                          />
                        </Tooltip>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </CardBody>
      </Card>

      {/* Add Employee Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose} size="3xl" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="2xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden" maxH="90vh">
          <ModalHeader
            bg="var(--stake-bg-primary)"
            color="white"
            borderRadius="16px 16px 0 0"
            p="3"
            position="relative"
            boxShadow="0 2px 10px rgba(0, 0, 0, 0.4)"
          >
            <HStack justify="space-between" align="center" w="full">
              <Text fontSize="md" fontWeight="bold">
                إضافة موظف جديد
              </Text>
              
              <HStack spacing="3" align="center" flex="1" justify="center" flexWrap="wrap">
                <HStack spacing="1">
                  <Icon as={FiUser} color="blue.300" boxSize="3" />
                  <Text fontSize="xs" className="stake-text-secondary" noOfLines={1}>
                    موظف جديد
                  </Text>
                </HStack>
                <HStack spacing="1">
                  <Icon as={FiHash} color="green.300" boxSize="3" />
                  <Text fontSize="xs" className="stake-text-secondary">سيتم إنشاء كود تلقائياً</Text>
                </HStack>
                <HStack spacing="1">
                  <Icon as={FiBriefcase} color="purple.300" boxSize="3" />
                  <Text fontSize="xs" className="stake-text-secondary" noOfLines={1}>
                    سيتم تحديده لاحقاً
                  </Text>
                </HStack>
              </HStack>
              
              <Box w="30px"></Box>
              <ModalCloseButton 
                color="white"
                bg="rgba(255, 255, 255, 0.1)"
                borderRadius="full"
                size="sm"
                _hover={{
                  bg: "rgba(255, 255, 255, 0.2)"
                }}
                _active={{
                  transform: "scale(0.95)"
                }}
              />
            </HStack>
          </ModalHeader>
          <ModalBody p="4" overflowY="auto">
            <form id="add-employee-form" onSubmit={handleSubmit(handleAddEmployee)}>
              <VStack spacing="3" align="stretch">
                {/* المعلومات الأساسية */}
                <Box>
                  <Text fontSize="sm" fontWeight="bold" mb="2" color="var(--stake-text-primary)">
                    المعلومات الأساسية
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing="2">
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="2.5"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <FormControl isRequired>
                        <FormLabel className="stake-label" fontSize="xs" mb="1">الاسم بالإنجليزية</FormLabel>
                        <Input
                          {...register('name', { required: 'الاسم بالإنجليزية مطلوب' })}
                          placeholder="Employee Name"
                          className="stake-input"
                          size="sm"
                          fontSize="sm"
                          h="32px"
                          bg="var(--stake-bg-secondary)"
                          borderColor="var(--stake-border-primary)"
                          color="white"
                          _focus={{
                            borderColor: "#3b82f6",
                            boxShadow: "0 0 0 1px #3b82f6"
                          }}
                          _hover={{
                            borderColor: "#4a5568"
                          }}
                        />
                        <FormErrorMessage fontSize="xs">
                          {errors.name && errors.name.message}
                        </FormErrorMessage>
                      </FormControl>
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="2.5"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <FormControl>
                        <FormLabel className="stake-label" fontSize="xs" mb="1">الاسم بالعربية</FormLabel>
                        <Input
                          {...register('name_ar')}
                          placeholder="اسم الموظف بالعربية"
                          className="stake-input"
                          size="sm"
                          fontSize="sm"
                          h="32px"
                          bg="var(--stake-bg-secondary)"
                          borderColor="var(--stake-border-primary)"
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
                    </Box>
                  </SimpleGrid>
                  
                  {/* الصف الثاني: الأكواد والراتب */}
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing="2">
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="2.5"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <FormControl isRequired>
                        <FormLabel className="stake-label" fontSize="xs" mb="1">كود الموظف</FormLabel>
                        <HStack spacing="2">
                          <Input
                            {...register('employee_code', { required: 'كود الموظف مطلوب' })}
                            placeholder="كود الموظف"
                            className="stake-input"
                            size="sm"
                            fontSize="sm"
                            bg="var(--stake-bg-secondary)"
                            borderColor="var(--stake-border-primary)"
                            color="white"
                            flex="1"
                            h="32px"
                            _focus={{
                              borderColor: "#3b82f6",
                              boxShadow: "0 0 0 1px #3b82f6"
                            }}
                            _hover={{
                              borderColor: "#4a5568"
                            }}
                          />
                          <Button
                            size="sm"
                            leftIcon={<Icon as={FiRefreshCw} />}
                            onClick={async () => {
                              try {
                                const response = await fetch(getApiUrl('/api/unified_employees_api.php?action=generate_employee_code'));
                                const data = await response.json();
                                if (data.success) {
                                  setValue('employee_code', data.employee_code);
                                  await trigger('employee_code');
                                  toast({
                                    title: 'تم توليد كود الموظف',
                                    description: `الكود الجديد: ${data.employee_code}`,
                                    status: 'success',
                                    duration: 3000,
                                    isClosable: true,
                                  });
                                }
                              } catch (err) {
                                toast({
                                  title: 'خطأ في توليد الكود',
                                  description: err.message || 'حدث خطأ أثناء توليد الكود',
                                  status: 'error',
                                  duration: 3000,
                                  isClosable: true,
                                });
                              }
                            }}
                            bg="var(--stake-bg-secondary)"
                            color="white"
                            border="1px solid"
                            borderColor="var(--stake-border-primary)"
                            _hover={{
                              bg: "#1a2d3a",
                              borderColor: "#3b82f6"
                            }}
                            fontSize="xs"
                            px="3"
                            h="32px"
                          >
                            توليد
                          </Button>
                        </HStack>
                        <FormErrorMessage fontSize="xs">
                          {errors.employee_code && errors.employee_code.message}
                        </FormErrorMessage>
                      </FormControl>
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="2.5"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <FormControl>
                        <FormLabel className="stake-label" fontSize="xs" mb="1">كود البصمة</FormLabel>
                        <Input
                          {...register('ac_no')}
                          placeholder="AC-No."
                          className="stake-input"
                          size="sm"
                          fontSize="sm"
                          h="32px"
                          bg="var(--stake-bg-secondary)"
                          borderColor="var(--stake-border-primary)"
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
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="2.5"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <FormControl isRequired>
                        <FormLabel className="stake-label" fontSize="xs" mb="1">الراتب الأساسي</FormLabel>
                        <Input
                          type="number"
                          {...register('base_salary', { required: 'الراتب الأساسي مطلوب' })}
                          placeholder="0"
                          defaultValue={0}
                          className="stake-input"
                          size="sm"
                          fontSize="sm"
                          h="32px"
                          bg="var(--stake-bg-secondary)"
                          borderColor="var(--stake-border-primary)"
                          color="white"
                          _focus={{
                            borderColor: "#3b82f6",
                            boxShadow: "0 0 0 1px #3b82f6"
                          }}
                          _hover={{
                            borderColor: "#4a5568"
                          }}
                        />
                        <FormErrorMessage fontSize="xs">
                          {errors.base_salary && errors.base_salary.message}
                        </FormErrorMessage>
                      </FormControl>
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="2.5"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <FormControl>
                        <FormLabel className="stake-label" fontSize="xs" mb="1">التمييز والحوافز</FormLabel>
                        <Input
                          type="number"
                          {...register('discrimination_incentive_allowance')}
                          placeholder="0"
                          defaultValue={0}
                          className="stake-input"
                          size="sm"
                          fontSize="sm"
                          h="32px"
                          bg="var(--stake-bg-secondary)"
                          borderColor="var(--stake-border-primary)"
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
                    </Box>
                  </SimpleGrid>
                </Box>

                {/* معلومات العمل */}
                <Box>
                  <Text fontSize="sm" fontWeight="bold" mb="2" color="var(--stake-text-primary)">
                    معلومات العمل
                  </Text>
                  {watch('salary_type') === 'Weekly' ? (
                    <SimpleGrid columns={{ base: 1, md: 4 }} spacing="2">
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="2.5"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl isRequired>
                          <FormLabel className="stake-label" fontSize="xs" mb="1">نوع الراتب</FormLabel>
                          <Select
                            {...register('salary_type', { required: 'نوع الراتب مطلوب' })}
                            placeholder="اختر نوع الراتب"
                            className="stake-input"
                            size="sm"
                            fontSize="sm"
                            h="32px"
                            bg="var(--stake-bg-secondary)"
                            borderColor="var(--stake-border-primary)"
                            color="white"
                            _focus={{
                              borderColor: "#3b82f6",
                              boxShadow: "0 0 0 1px #3b82f6"
                            }}
                            _hover={{
                              borderColor: "#4a5568"
                            }}
                          >
                            <option value="Monthly" >شهري</option>
                            <option value="Weekly" >أسبوعي</option>
                          </Select>
                          <FormErrorMessage fontSize="xs">
                            {errors.salary_type && errors.salary_type.message}
                          </FormErrorMessage>
                        </FormControl>
                      </Box>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="2.5"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl>
                          <FormLabel className="stake-label" fontSize="xs" mb="1">القسم</FormLabel>
                          <Select
                            {...register('department')}
                            placeholder="اختر القسم"
                            className="stake-input"
                            size="sm"
                            fontSize="sm"
                            h="32px"
                            bg="var(--stake-bg-secondary)"
                            borderColor="var(--stake-border-primary)"
                            color="white"
                            _focus={{
                              borderColor: "#3b82f6",
                              boxShadow: "0 0 0 1px #3b82f6"
                            }}
                            _hover={{
                              borderColor: "#4a5568"
                            }}
                          >
                            {departments.map(dept => (
                              <option key={dept.id} value={dept.name} title={dept.description || dept.name}>{dept.description || dept.name}</option>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="2.5"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl>
                          <FormLabel className="stake-label" fontSize="xs" mb="1">التكلفة</FormLabel>
                          <Controller
                            name="cost_center"
                            control={control}
                            render={({ field }) => (
                              <Select
                                {...field}
                                placeholder={watch('department') ? "اختر التكلفة" : "اختر القسم أولاً"}
                                className="stake-input"
                                size="sm"
                                fontSize="sm"
                                h="32px"
                                bg="var(--stake-bg-secondary)"
                                borderColor="var(--stake-border-primary)"
                                color="white"
                                isDisabled={!watch('department')}
                                _focus={{
                                  borderColor: "#3b82f6",
                                  boxShadow: "0 0 0 1px #3b82f6"
                                }}
                                _hover={{
                                  borderColor: "#4a5568"
                                }}
                              >
                                {(watch('department') && departmentCostCenters.length > 0 ? departmentCostCenters : []).map(center => (
                                  <option key={center.id} value={center.name} title={center.name}>{center.name}</option>
                                ))}
                              </Select>
                            )}
                          />
                          {!watch('department') && (
                            <Text fontSize="xs" color="orange.300" mt="1">
                              يجب اختيار القسم أولاً
                            </Text>
                          )}
                        </FormControl>
                      </Box>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="2.5"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl>
                          <FormLabel className="stake-label" fontSize="xs" mb="1">المنصب</FormLabel>
                          <Input
                            {...register('position')}
                            placeholder="المنصب"
                            className="stake-input"
                            size="sm"
                            fontSize="sm"
                            h="32px"
                            bg="var(--stake-bg-secondary)"
                            borderColor="var(--stake-border-primary)"
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
                      </Box>
                    </SimpleGrid>
                  ) : (
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing="2">
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="2.5"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl isRequired>
                          <FormLabel className="stake-label" fontSize="xs" mb="1">نوع الراتب</FormLabel>
                          <Select
                            {...register('salary_type', { required: 'نوع الراتب مطلوب' })}
                            placeholder="اختر نوع الراتب"
                            className="stake-input"
                            size="sm"
                            fontSize="sm"
                            h="32px"
                            bg="var(--stake-bg-secondary)"
                            borderColor="var(--stake-border-primary)"
                            color="white"
                            _focus={{
                              borderColor: "#3b82f6",
                              boxShadow: "0 0 0 1px #3b82f6"
                            }}
                            _hover={{
                              borderColor: "#4a5568"
                            }}
                          >
                            <option value="Monthly" >شهري</option>
                            <option value="Weekly" >أسبوعي</option>
                          </Select>
                          <FormErrorMessage fontSize="xs">
                            {errors.salary_type && errors.salary_type.message}
                          </FormErrorMessage>
                        </FormControl>
                      </Box>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="2.5"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl>
                          <FormLabel className="stake-label" fontSize="xs" mb="1">القسم</FormLabel>
                          <Select
                            {...register('department')}
                            placeholder="اختر القسم"
                            className="stake-input"
                            size="sm"
                            fontSize="sm"
                            h="32px"
                            bg="var(--stake-bg-secondary)"
                            borderColor="var(--stake-border-primary)"
                            color="white"
                            _focus={{
                              borderColor: "#3b82f6",
                              boxShadow: "0 0 0 1px #3b82f6"
                            }}
                            _hover={{
                              borderColor: "#4a5568"
                            }}
                          >
                            {departments.map(dept => (
                              <option key={dept.id} value={dept.name} title={dept.description || dept.name}>{dept.description || dept.name}</option>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="2.5"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl>
                          <FormLabel className="stake-label" fontSize="xs" mb="1">المنصب</FormLabel>
                          <Input
                            {...register('position')}
                            placeholder="المنصب"
                            className="stake-input"
                            size="sm"
                            fontSize="sm"
                            h="32px"
                            bg="var(--stake-bg-secondary)"
                            borderColor="var(--stake-border-primary)"
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
                      </Box>
                    </SimpleGrid>
                  )}
                </Box>

                {/* معلومات إضافية */}
                <Box>
                  <Text fontSize="sm" fontWeight="bold" mb="2" color="var(--stake-text-primary)">
                    معلومات إضافية
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing="2">
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="2.5"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <FormControl>
                        <FormLabel className="stake-label" fontSize="xs" mb="1">الموقع</FormLabel>
                        <Select
                          {...register('location')}
                          placeholder="اختر الموقع"
                          className="stake-input"
                          size="sm"
                          fontSize="sm"
                          h="32px"
                          bg="var(--stake-bg-secondary)"
                          borderColor="var(--stake-border-primary)"
                          color="white"
                          _focus={{
                            borderColor: "#3b82f6",
                            boxShadow: "0 0 0 1px #3b82f6"
                          }}
                          _hover={{
                            borderColor: "#4a5568"
                          }}
                        >
                          <option value="برج العرب" >برج العرب</option>
                          <option value="محرم بك" >محرم بك</option>
                        </Select>
                      </FormControl>
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="2.5"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <FormControl>
                        <FormLabel className="stake-label" fontSize="xs" mb="1">تاريخ التعيين</FormLabel>
                        <Input
                          {...register('hire_date')}
                          type="date"
                          defaultValue={new Date().toISOString().split('T')[0]}
                          className="stake-input"
                          size="sm"
                          fontSize="sm"
                          h="32px"
                          bg="var(--stake-bg-secondary)"
                          borderColor="var(--stake-border-primary)"
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
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="2.5"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <FormControl>
                        <FormLabel className="stake-label" fontSize="xs" mb="1">الحالة</FormLabel>
                        <Select
                          {...register('status')}
                          placeholder="اختر الحالة"
                          className="stake-input"
                          size="sm"
                          fontSize="sm"
                          h="32px"
                          bg="var(--stake-bg-secondary)"
                          borderColor="var(--stake-border-primary)"
                          color="white"
                          _focus={{
                            borderColor: "#3b82f6",
                            boxShadow: "0 0 0 1px #3b82f6"
                          }}
                          _hover={{
                            borderColor: "#4a5568"
                          }}
                        >
                          <option value="active" >نشط</option>
                          <option value="inactive" >غير نشط</option>
                          <option value="terminated" >منتهي الخدمة</option>
                        </Select>
                      </FormControl>
                    </Box>
                  </SimpleGrid>
                </Box>

              </VStack>
            </form>
          </ModalBody>
          <ModalFooter 
            justifyContent="space-between"
            gap="2"
            bg="var(--stake-bg-primary)"
            borderTop="1px solid"
            borderColor="var(--stake-border-primary)"
            borderRadius="0 0 12px 12px"
            p="2.5"
            boxShadow="0 -2px 10px rgba(0, 0, 0, 0.4)"
          >
            <HStack spacing="2" align="center">
              <Checkbox
                {...register('is_insured')}
                defaultChecked={false}
                colorScheme="blue"
                size="sm"
                onChange={(e) => {
                  setValue('is_insured', e.target.checked);
                }}
              >
                <Text color="#d5dceb" fontWeight="medium" fontSize="xs">
                  مؤمن عليه
                </Text>
              </Checkbox>
            </HStack>
            <HStack spacing="2">
              <Button 
                onClick={onAddClose}
                h="36px"
                px="4"
                fontWeight="600"
                borderRadius="lg"
                fontSize="sm"
                bg="var(--stake-bg-secondary)"
                color="#d5dceb"
                border="1px solid"
                borderColor="var(--stake-border-primary)"
                _hover={{
                  bg: "#213743",
                  borderColor: "#3b82f6"
                }}
              >
                إلغاء
              </Button>
              <Button
                leftIcon={<FiSave />}
                type="submit"
                form="add-employee-form"
                h="36px"
                px="4"
                fontWeight="600"
                borderRadius="lg"
                fontSize="sm"
                bg="#3b82f6"
                color="white"
                _hover={{
                  bg: "#2563eb"
                }}
              >
                إضافة موظف
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* View Employee Modal */}
      <Modal isOpen={isViewOpen} onClose={onViewClose} size="4xl" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden">
          <ModalHeader
            bg="var(--stake-bg-primary)"
            color="white"
            borderRadius="24px 24px 0 0"
            p="4"
            position="relative"
          >
            <HStack justify="space-between" align="center" w="full">
              <Text fontSize="lg" fontWeight="bold">
                تفاصيل الموظف
              </Text>
              
              <HStack spacing="6" align="center" flex="1" justify="center">
                <HStack spacing="2">
                  <Icon as={FiUser} color="blue.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">
                    {selectedEmployee?.name_ar || selectedEmployee?.name || 'غير محدد'}
                  </Text>
                </HStack>
                <HStack spacing="2">
                  <Icon as={FiHash} color="green.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">{selectedEmployee?.employee_code || '-'}</Text>
                </HStack>
                <HStack spacing="2">
                  <Icon as={FiKey} color="orange.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">{selectedEmployee?.['AC-No.'] || '-'}</Text>
                </HStack>
                {selectedEmployee?.salary_type === 'Monthly' ? (
                  <HStack spacing="2">
                    <Icon as={FiBriefcase} color="purple.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">
                      {selectedEmployee?.department_description || selectedEmployee?.department || '-'}
                    </Text>
                  </HStack>
                ) : (
                  <HStack spacing="2">
                    <Icon as={FiTarget} color="blue.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">
                      {selectedEmployee?.cost_center || '-'}
                    </Text>
                  </HStack>
                )}
                <HStack spacing="2">
                  <Icon as={FiDollarSign} color="orange.300" boxSize="4" />
                  <Badge 
                    colorScheme={selectedEmployee?.salary_type === 'Monthly' ? 'purple' : 'blue'}
                    variant="solid"
                    px="2"
                    py="1"
                    borderRadius="md"
                    fontSize="xs"
                  >
                    {selectedEmployee?.salary_type === 'Monthly' ? 'شهري' : 'أسبوعي'}
                  </Badge>
                </HStack>
              </HStack>
              
              <Box w="40px"></Box>
              <ModalCloseButton 
                color="white"
                bg="rgba(255, 255, 255, 0.1)"
                borderRadius="full"
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
            {selectedEmployee && (
              <VStack spacing="6" align="stretch">
                {/* معلومات الراتب */}
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
                          {formatCurrency(selectedEmployee.base_salary || 0)}
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
                          {formatCurrency(selectedEmployee.discrimination_incentive_allowance || 0)}
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
                          colorScheme={selectedEmployee.salary_type === 'Monthly' ? 'purple' : 'blue'}
                          variant="solid"
                          px="3"
                          py="1"
                          borderRadius="md"
                        >
                          {selectedEmployee.salary_type === 'Monthly' ? 'شهري' : 'أسبوعي'}
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
                          colorScheme={selectedEmployee.is_insured ? 'green' : 'red'}
                          variant="solid"
                          px="3"
                          py="1"
                          borderRadius="md"
                        >
                          {selectedEmployee.is_insured ? 'نعم' : 'لا'}
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
                          {selectedEmployee.department_description || selectedEmployee.department || '-'}
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
                          {selectedEmployee.cost_center || '-'}
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
                          {selectedEmployee.position || '-'}
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
                          {selectedEmployee.location || '-'}
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
                          {selectedEmployee.hire_date ? new Date(selectedEmployee.hire_date).toLocaleDateString('ar-EG') : '-'}
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
                          colorScheme={selectedEmployee.status === 'active' ? 'green' : 'red'}
                          variant="solid"
                          px="3"
                          py="1"
                          borderRadius="md"
                        >
                          {selectedEmployee.status === 'active' ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </VStack>
                    </Box>
                  </SimpleGrid>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter 
            justifyContent="center" // Center content horizontally
            gap="4"
            bg="var(--stake-bg-primary)"
            borderTop="1px solid"
            borderColor="var(--stake-border-primary)"
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
                _hover={{ bg: "#2563eb" }}
                onClick={() => {
                  onViewClose();
                  onEditOpen();
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
                _hover={{ bg: "#b91c1c" }}
                onClick={() => {
                  const employeeName = selectedEmployee?.name_ar || selectedEmployee?.name || 'هذا الموظف';
                  const confirmMessage = `⚠️ تحذير: حذف الموظف نهائياً\n\nالموظف: ${employeeName}\nالكود: ${selectedEmployee?.employee_code || 'غير محدد'}\n\nهذا الإجراء سيحذف:\n• بيانات الموظف من قاعدة البيانات\n• جميع سجلات الحضور والانصراف\n• سجلات البصمة الخام (fingerprint_attendance) المرتبطة بكود البصمة AC-No.\n• جميع البيانات المرتبطة بالموظف\n\n⚠️ لا يمكن التراجع عن هذا الإجراء!\n\nهل أنت متأكد من المتابعة؟`;

                  if (window.confirm(confirmMessage)) {
                    handleDeleteEmployee(selectedEmployee);
                    onViewClose();
                  }
                }}
              >
                حذف الموظف
              </Button>
            </HStack>
          </ModalFooter>

        </ModalContent>
      </Modal>

      {/* Edit Employee Modal - unified format to match new design */}
      <Modal isOpen={isEditOpen} onClose={handleEditClose} size="3xl" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="2xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden" maxH="90vh">
          <ModalHeader
            bg="var(--stake-bg-primary)"
            color="white"
            borderRadius="16px 16px 0 0"
            p="3"
            position="relative"
            boxShadow="0 2px 10px rgba(0, 0, 0, 0.4)"
          >
            <HStack justify="space-between" align="center" w="full">
              <Text fontSize="md" fontWeight="bold">
                تعديل بيانات الموظف
              </Text>
              
              <HStack spacing="3" align="center" flex="1" justify="center" flexWrap="wrap">
                <HStack spacing="1">
                  <Icon as={FiUser} color="blue.300" boxSize="3" />
                  <Text fontSize="xs" className="stake-text-secondary" noOfLines={1}>
                    {selectedEmployee?.name_ar || selectedEmployee?.name || 'غير محدد'}
                  </Text>
                </HStack>
                <HStack spacing="1">
                  <Icon as={FiHash} color="green.300" boxSize="3" />
                  <Text fontSize="xs" className="stake-text-secondary">{selectedEmployee?.employee_code || '-'}</Text>
                </HStack>
                <HStack spacing="1">
                  <Icon as={FiKey} color="orange.300" boxSize="3" />
                  <Text fontSize="xs" className="stake-text-secondary">{selectedEmployee?.['AC-No.'] || '-'}</Text>
                </HStack>
                <HStack spacing="1">
                  <Icon as={FiBriefcase} color="purple.300" boxSize="3" />
                  <Text fontSize="xs" className="stake-text-secondary" noOfLines={1}>
                    {selectedEmployee?.department_description || selectedEmployee?.department || '-'}
                  </Text>
                </HStack>
                <HStack spacing="1">
                  <Icon as={FiDollarSign} color="orange.300" boxSize="3" />
                  <Badge 
                    colorScheme={selectedEmployee?.salary_type === 'Monthly' ? 'purple' : 'blue'}
                    variant="solid"
                    px="1.5"
                    py="0.5"
                    borderRadius="md"
                    fontSize="2xs"
                  >
                    {selectedEmployee?.salary_type === 'Monthly' ? 'شهري' : 'أسبوعي'}
                  </Badge>
                </HStack>
              </HStack>
              
              <Box w="30px"></Box>
              <ModalCloseButton 
                color="white"
                bg="rgba(255, 255, 255, 0.1)"
                borderRadius="full"
                size="sm"
                _hover={{
                  bg: "rgba(255, 255, 255, 0.2)"
                }}
                _active={{
                  transform: "scale(0.95)"
                }}
              />
            </HStack>
          </ModalHeader>
          <ModalBody p="4" overflowY="auto" maxH="calc(90vh - 200px)">
            <form onSubmit={handleSubmit(handleEditEmployee)}>
              <VStack spacing="3" align="stretch">
                {/* المعلومات الأساسية */}
                <Box>
                  <Text fontSize="sm" fontWeight="bold" mb="2" color="var(--stake-text-primary)">
                    المعلومات الأساسية
                  </Text>
                  <VStack spacing="2" align="stretch">
                    {/* الصف الأول: الأسماء */}
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing="2">
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="2.5"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl isRequired>
                          <FormLabel className="stake-label" fontSize="xs" mb="1">الاسم بالإنجليزية</FormLabel>
                          <Input
                            {...register('name', { required: 'الاسم بالإنجليزية مطلوب' })}
                            placeholder="Employee Name"
                            defaultValue={selectedEmployee?.name || ''}
                            className="stake-input"
                            size="sm"
                            h="32px"
                            bg="var(--stake-bg-secondary)"
                            borderColor="var(--stake-border-primary)"
                            color="white"
                            fontSize="sm"
                            _focus={{
                              borderColor: "#3b82f6",
                              boxShadow: "0 0 0 1px #3b82f6"
                            }}
                            _hover={{
                              borderColor: "#4a5568"
                            }}
                          />
                          <FormErrorMessage fontSize="xs">
                            {errors.name && errors.name.message}
                          </FormErrorMessage>
                        </FormControl>
                      </Box>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="2.5"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl>
                          <FormLabel className="stake-label" fontSize="xs" mb="1">الاسم بالعربية</FormLabel>
                          <Input
                            {...register('name_ar')}
                            placeholder="اسم الموظف بالعربية"
                            defaultValue={selectedEmployee?.name_ar || ''}
                            className="stake-input"
                            size="sm"
                            h="32px"
                            bg="var(--stake-bg-secondary)"
                            borderColor="var(--stake-border-primary)"
                            color="white"
                            fontSize="sm"
                            _focus={{
                              borderColor: "#3b82f6",
                              boxShadow: "0 0 0 1px #3b82f6"
                            }}
                            _hover={{
                              borderColor: "#4a5568"
                            }}
                          />
                        </FormControl>
                      </Box>
                    </SimpleGrid>
                    
                    {/* الصف الثاني: الأكواد والراتب */}
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing="2">
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="2.5"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl isRequired>
                          <FormLabel className="stake-label" fontSize="xs" mb="1">كود الموظف</FormLabel>
                          <HStack spacing="2">
                            <Input
                              {...register('employee_code', { required: 'كود الموظف مطلوب' })}
                              placeholder="كود الموظف"
                              defaultValue={selectedEmployee?.employee_code || ''}
                              className="stake-input"
                              size="sm"
                              fontSize="sm"
                              bg="var(--stake-bg-secondary)"
                              borderColor="var(--stake-border-primary)"
                              color="white"
                              flex="1"
                              _focus={{
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 1px #3b82f6"
                              }}
                              _hover={{
                                borderColor: "#4a5568"
                              }}
                            />
                            <Button
                              size="sm"
                              leftIcon={<Icon as={FiRefreshCw} />}
                              onClick={async () => {
                                try {
                                  const response = await fetch(getApiUrl('/api/unified_employees_api.php?action=generate_employee_code'));
                                  const data = await response.json();
                                  if (data.success) {
                                    setValue('employee_code', data.employee_code);
                                    await trigger('employee_code');
                                    toast({
                                      title: 'تم توليد كود الموظف',
                                      description: `الكود الجديد: ${data.employee_code}`,
                                      status: 'success',
                                      duration: 3000,
                                      isClosable: true,
                                    });
                                  }
                                } catch (err) {
                                  showErrorModal(
                                    'خطأ في توليد الكود',
                                    err.message || 'حدث خطأ أثناء توليد الكود'
                                  );
                                }
                              }}
                              bg="var(--stake-bg-secondary)"
                              color="white"
                              border="1px solid"
                              borderColor="var(--stake-border-primary)"
                              _hover={{
                                bg: "#1a2d3a",
                                borderColor: "#3b82f6"
                              }}
                              fontSize="xs"
                              px="3"
                              h="32px"
                            >
                              توليد
                            </Button>
                          </HStack>
                          <FormErrorMessage fontSize="xs">
                            {errors.employee_code && errors.employee_code.message}
                          </FormErrorMessage>
                        </FormControl>
                      </Box>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="2.5"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl>
                          <FormLabel className="stake-label" fontSize="xs" mb="1">كود البصمة</FormLabel>
                          <Input
                            {...register('ac_no')}
                            placeholder="AC-No."
                            defaultValue={selectedEmployee?.['AC-No.'] || ''}
                            className="stake-input"
                            size="sm"
                            fontSize="sm"
                            bg="var(--stake-bg-secondary)"
                            borderColor="var(--stake-border-primary)"
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
                      </Box>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="2.5"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl isRequired>
                          <FormLabel className="stake-label" fontSize="xs" mb="1">الراتب الأساسي</FormLabel>
                          <Input
                            type="number"
                            {...register('base_salary', { required: 'الراتب الأساسي مطلوب' })}
                            placeholder="0"
                            defaultValue={selectedEmployee?.base_salary || 0}
                            className="stake-input"
                            size="sm"
                            fontSize="sm"
                            bg="var(--stake-bg-secondary)"
                            borderColor="var(--stake-border-primary)"
                            color="white"
                            _focus={{
                              borderColor: "#3b82f6",
                              boxShadow: "0 0 0 1px #3b82f6"
                            }}
                            _hover={{
                              borderColor: "#4a5568"
                            }}
                          />
                          <FormErrorMessage fontSize="xs">
                            {errors.base_salary && errors.base_salary.message}
                          </FormErrorMessage>
                        </FormControl>
                      </Box>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="2.5"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl>
                          <FormLabel className="stake-label" fontSize="xs" mb="1">التمييز والحوافز</FormLabel>
                          <Input
                            type="number"
                            {...register('discrimination_incentive_allowance')}
                            placeholder="0"
                            defaultValue={selectedEmployee?.discrimination_incentive_allowance || 0}
                            className="stake-input"
                            size="sm"
                            fontSize="sm"
                            bg="var(--stake-bg-secondary)"
                            borderColor="var(--stake-border-primary)"
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
                      </Box>
                    </SimpleGrid>
                  </VStack>
                </Box>


                {/* معلومات العمل */}
                <Box>
                  <Text fontSize="sm" fontWeight="bold" mb="2" color="var(--stake-text-primary)">
                    معلومات العمل
                  </Text>
                  {watchedSalaryType === 'Monthly' ? (
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing="2">
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="2.5"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl>
                          <FormLabel className="stake-label" fontSize="xs" mb="1">نوع الراتب</FormLabel>
                          <Controller
                            name="salary_type"
                            control={control}
                            render={({ field }) => (
                              <Select
                                {...field}
                                placeholder="اختر نوع الراتب"
                                size="sm"
                                fontSize="sm"
                                className="stake-input"
                                bg="var(--stake-bg-secondary)"
                                borderColor="var(--stake-border-primary)"
                                color="white"
                                _focus={{
                                  borderColor: "#3b82f6",
                                  boxShadow: "0 0 0 1px #3b82f6"
                                }}
                                _hover={{
                                  borderColor: "#4a5568"
                                }}
                              >
                                <option value="Monthly" >شهري</option>
                                <option value="Weekly" >أسبوعي</option>
                              </Select>
                            )}
                          />
                        </FormControl>
                      </Box>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="2.5"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl>
                          <FormLabel className="stake-label" fontSize="xs" mb="1">القسم</FormLabel>
                          <Controller
                            name="department"
                            control={control}
                            render={({ field }) => (
                              <Select
                                {...field}
                                placeholder="اختر القسم"
                                size="sm"
                                fontSize="sm"
                                className="stake-input"
                                bg="var(--stake-bg-secondary)"
                                borderColor="var(--stake-border-primary)"
                                color="white"
                                _focus={{
                                  borderColor: "#3b82f6",
                                  boxShadow: "0 0 0 1px #3b82f6"
                                }}
                                _hover={{
                                  borderColor: "#4a5568"
                                }}
                              >
                                {departments.map(dept => {
                                  const displayText = dept.description || dept.name;
                                  return (
                                    <option 
                                      key={dept.id} 
                                      value={dept.name} 
                                      title={displayText}
                                    >
                                      {displayText}
                                    </option>
                                  );
                                })}
                              </Select>
                            )}
                          />
                        </FormControl>
                      </Box>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="2.5"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl>
                          <FormLabel className="stake-label" fontSize="xs" mb="1">المنصب</FormLabel>
                          <Input
                            {...register('position')}
                            placeholder="المنصب"
                            defaultValue={selectedEmployee?.position || ''}
                            className="stake-input"
                            size="sm"
                            h="32px"
                            fontSize="sm"
                            bg="var(--stake-bg-secondary)"
                            borderColor="var(--stake-border-primary)"
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
                      </Box>
                    </SimpleGrid>
                  ) : (
                    <VStack spacing="2" align="stretch">
                      {/* الصف الأول */}
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing="2">
                        <Box
                          bg="var(--stake-bg-secondary)"
                          p="2.5"
                          borderRadius="lg"
                          border="1px solid"
                          borderColor="var(--stake-border-primary)"
                        >
                          <FormControl>
                            <FormLabel className="stake-label" fontSize="xs" mb="1">نوع الراتب</FormLabel>
                            <Controller
                              name="salary_type"
                              control={control}
                              render={({ field }) => (
                                <Select
                                  {...field}
                                  placeholder="اختر نوع الراتب"
                                  size="sm"
                                  fontSize="sm"
                                  className="stake-input"
                                  bg="var(--stake-bg-secondary)"
                                  borderColor="var(--stake-border-primary)"
                                  color="white"
                                  _focus={{
                                    borderColor: "#3b82f6",
                                    boxShadow: "0 0 0 1px #3b82f6"
                                  }}
                                  _hover={{
                                    borderColor: "#4a5568"
                                  }}
                                >
                                  <option value="Monthly" >شهري</option>
                                  <option value="Weekly" >أسبوعي</option>
                                </Select>
                              )}
                            />
                          </FormControl>
                        </Box>
                        <Box
                          bg="var(--stake-bg-secondary)"
                          p="2.5"
                          borderRadius="lg"
                          border="1px solid"
                          borderColor="var(--stake-border-primary)"
                        >
                          <FormControl>
                            <FormLabel className="stake-label" fontSize="xs" mb="1">القسم</FormLabel>
                            <Controller
                              name="department"
                              control={control}
                              render={({ field }) => (
                              <Select
                                {...field}
                                placeholder="اختر القسم"
                                size="sm"
                                fontSize="sm"
                                className="stake-input"
                                bg="var(--stake-bg-secondary)"
                                borderColor="var(--stake-border-primary)"
                                color="var(--stake-text-primary)"
                                whiteSpace="normal"
                                minW="100%"
                                sx={{
                                  '&': {
                                    minWidth: '100%',
                                    width: '100%'
                                  },
                                  '& option': {
                                    background: 'var(--stake-bg-card)',
                                    color: 'var(--stake-text-primary)',
                                    whiteSpace: 'normal',
                                    overflow: 'visible',
                                    textOverflow: 'clip',
                                    padding: '8px 12px'
                                  }
                                }}
                                _focus={{
                                  borderColor: 'var(--stake-primary)',
                                  boxShadow: '0 0 0 1px var(--stake-primary)'
                                }}
                                _hover={{
                                  borderColor: 'var(--stake-border-secondary)'
                                }}
                              >
                                {departments.map(dept => {
                                  const displayText = dept.description || dept.name;
                                  return (
                                    <option 
                                      key={dept.id} 
                                      value={dept.name} 
                                      title={displayText}
                                    >
                                      {displayText}
                                    </option>
                                  );
                                })}
                              </Select>
                              )}
                            />
                          </FormControl>
                        </Box>
                      </SimpleGrid>
                      
                      {/* الصف الثاني */}
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing="2">
                        <Box
                          bg="var(--stake-bg-secondary)"
                          p="2.5"
                          borderRadius="lg"
                          border="1px solid"
                          borderColor="var(--stake-border-primary)"
                        >
                          <FormControl>
                            <FormLabel className="stake-label" fontSize="xs" mb="1">التكلفة</FormLabel>
                            <Controller
                              name="cost_center"
                              control={control}
                              defaultValue={selectedEmployee?.cost_center || ''}
                              render={({ field }) => (
                                <Select
                                  {...field}
                                  placeholder={watchedDepartment ? "اختر التكلفة" : "اختر القسم أولاً"}
                                  size="sm"
                                  fontSize="sm"
                                  className="stake-input"
                                  bg="var(--stake-bg-secondary)"
                                  borderColor="var(--stake-border-primary)"
                                  color="white"
                                  isDisabled={!watchedDepartment}
                                  _focus={{
                                    borderColor: "#3b82f6",
                                    boxShadow: "0 0 0 1px #3b82f6"
                                  }}
                                  _hover={{
                                    borderColor: "#4a5568"
                                  }}
                                >
                                  {(watchedDepartment && departmentCostCenters.length > 0 ? departmentCostCenters : []).map(center => (
                                    <option key={center.id} value={center.name} title={center.name} >{center.name}</option>
                                  ))}
                                </Select>
                              )}
                            />
                            {!watchedDepartment && (
                              <Text fontSize="xs" color="orange.300" mt="1">
                                يجب اختيار القسم أولاً لعرض مراكز التكلفة
                              </Text>
                            )}
                          </FormControl>
                        </Box>
                        <Box
                          bg="var(--stake-bg-secondary)"
                          p="2.5"
                          borderRadius="lg"
                          border="1px solid"
                          borderColor="var(--stake-border-primary)"
                        >
                          <FormControl>
                            <FormLabel className="stake-label" fontSize="xs" mb="1">المنصب</FormLabel>
                            <Input
                              {...register('position')}
                              placeholder="المنصب"
                              defaultValue={selectedEmployee?.position || ''}
                              className="stake-input"
                              size="sm"
                              h="32px"
                              fontSize="sm"
                              bg="var(--stake-bg-secondary)"
                              borderColor="var(--stake-border-primary)"
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
                        </Box>
                      </SimpleGrid>
                    </VStack>
                  )}
                </Box>

                {/* معلومات إضافية */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    معلومات إضافية
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing="4">
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="2.5"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <FormControl>
                        <FormLabel className="stake-label" fontSize="xs" mb="1">الموقع</FormLabel>
                        <Select
                          {...register('location')}
                          placeholder="اختر الموقع"
                          defaultValue={selectedEmployee?.location || ''}
                          size="sm"
                          fontSize="sm"
                          className="stake-input"
                          bg="var(--stake-bg-secondary)"
                          borderColor="var(--stake-border-primary)"
                          color="white"
                          _focus={{
                            borderColor: "#3b82f6",
                            boxShadow: "0 0 0 1px #3b82f6"
                          }}
                          _hover={{
                            borderColor: "#4a5568"
                          }}
                        >
                          <option value="برج العرب" >برج العرب</option>
                          <option value="محرم بك" >محرم بك</option>
                        </Select>
                      </FormControl>
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="2.5"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <FormControl>
                        <FormLabel className="stake-label" fontSize="xs" mb="1">تاريخ التعيين</FormLabel>
                        <Input
                          {...register('hire_date')}
                          type="date"
                          defaultValue={selectedEmployee?.hire_date ? (selectedEmployee.hire_date.includes(' ') ? selectedEmployee.hire_date.split(' ')[0] : selectedEmployee.hire_date) : ''}
                          className="stake-input"
                          size="sm"
                          h="32px"
                          fontSize="sm"
                          bg="var(--stake-bg-secondary)"
                          borderColor="var(--stake-border-primary)"
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
                    </Box>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="2.5"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <FormControl>
                        <FormLabel className="stake-label" fontSize="xs" mb="1">الحالة</FormLabel>
                        <Select
                          {...register('status')}
                          placeholder="اختر الحالة"
                          defaultValue={selectedEmployee?.status || 'active'}
                          size="sm"
                          fontSize="sm"
                          className="stake-input"
                          bg="var(--stake-bg-secondary)"
                          borderColor="var(--stake-border-primary)"
                          color="white"
                          _focus={{
                            borderColor: "#3b82f6",
                            boxShadow: "0 0 0 1px #3b82f6"
                          }}
                          _hover={{
                            borderColor: "#4a5568"
                          }}
                        >
                          <option value="active" >نشط</option>
                          <option value="inactive" >غير نشط</option>
                          <option value="terminated" >منتهي الخدمة</option>
                        </Select>
                      </FormControl>
                    </Box>
                  </SimpleGrid>
                </Box>
              </VStack>
            </form>
          </ModalBody>
          <ModalFooter 
            justifyContent="space-between"
            gap="4"
            bg="var(--stake-bg-primary)"
            borderTop="1px solid"
            borderColor="var(--stake-border-primary)"
            borderRadius="0 0 24px 24px"
            p="6"
            boxShadow="0 -4px 20px rgba(0, 0, 0, 0.4)"
          >
            <HStack spacing="3" align="center">
              <Controller
                name="is_insured"
                control={control}
                render={({ field: { value, onChange, ref } }) => (
                  <Checkbox
                    ref={ref}
                    isChecked={!!value}
                    colorScheme="blue"
                    size="sm"
                    onChange={(e) => onChange(e.target.checked)}
                  >
                    <Text color="#d5dceb" fontWeight="medium" fontSize="sm">
                      مؤمن عليه
                    </Text>
                  </Checkbox>
                )}
              />
            </HStack>
            <HStack spacing="2">
              <Button 
                onClick={handleEditClose}
                h="36px"
                px="6"
                fontWeight="600"
                borderRadius="lg"
                fontSize="sm"
                bg="var(--stake-bg-secondary)"
                color="#d5dceb"
                border="1px solid"
                borderColor="var(--stake-border-primary)"
                _hover={{
                  bg: "#213743",
                  borderColor: "#3b82f6"
                }}
              >
                إلغاء
              </Button>
              <Button
                leftIcon={<FiSave />}
                h="36px"
                px="6"
                fontWeight="600"
                borderRadius="lg"
                fontSize="sm"
                bg="#3b82f6"
                color="white"
                _hover={{
                  bg: "#2563eb"
                }}
                onClick={async () => {
                  console.log('🔥 Save button clicked!');
                  console.log('🔥 Form values:', watch());
                  console.log('🔥 Form errors:', errors);
                  
                  // Get form data manually
                  const formData = watch();
                  console.log('🔥 AC-No. value in form:', formData.ac_no);
                  console.log('🔥 Calling handleEditEmployee with:', formData);
                  
                  // Call handleEditEmployee directly
                  await handleEditEmployee(formData);
                }}
              >
                حفظ التعديلات
              </Button>
              <Button
                leftIcon={<FiTrash2 />}
                h="36px"
                px="6"
                fontWeight="600"
                borderRadius="lg"
                fontSize="sm"
                bg="#dc2626"
                color="white"
                _hover={{
                  bg: "#b91c1c"
                }}
                onClick={() => {
                  const employeeName = selectedEmployee?.name_ar || selectedEmployee?.name || 'هذا الموظف';
                  const confirmMessage = `⚠️ تحذير: حذف الموظف نهائياً\n\nالموظف: ${employeeName}\nالكود: ${selectedEmployee?.employee_code || 'غير محدد'}\n\nهذا الإجراء سيحذف:\n• بيانات الموظف من قاعدة البيانات\n• جميع سجلات الحضور والانصراف\n• سجلات البصمة الخام (fingerprint_attendance) المرتبطة بكود البصمة AC-No.\n• جميع البيانات المرتبطة بالموظف\n\n⚠️ لا يمكن التراجع عن هذا الإجراء!\n\nهل أنت متأكد من المتابعة؟`;
                  
                  if (window.confirm(confirmMessage)) {
                    handleDeleteEmployee(selectedEmployee);
                    handleEditClose();
                  }
                }}
              >
                حذف الموظف
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* مودال التعديل الجماعي */}
      <Modal isOpen={isBulkEditOpen} onClose={onBulkEditClose} size="xl">
        <ModalOverlay />
        <ModalContent borderRadius="3xl" overflow="hidden">
          <ModalHeader 
            bg="var(--stake-bg-primary)" 
            borderBottom="1px solid" 
            borderColor="var(--stake-border)"
            position="relative"
          >
            <HStack spacing="3" align="center">
              <Icon as={FiEdit} color="blue.400" boxSize="5" />
              <Text fontSize="lg" fontWeight="semibold" color="var(--stake-text-primary)">
                تعديل {selectedEmployees.length} موظف
              </Text>
            </HStack>
            <ModalCloseButton 
              position="absolute" 
              top="4" 
              right="4" 
              color="var(--stake-text-secondary)"
              _hover={{ color: "var(--stake-text-primary)" }}
            />
          </ModalHeader>
          <ModalBody>
            <VStack spacing="4" align="stretch">
              <Alert status="info" borderRadius="lg">
                <AlertIcon />
                <AlertDescription>
                  سيتم تطبيق التغييرات على {selectedEmployees.length} موظف. اترك الحقول فارغة إذا كنت لا تريد تغييرها.
                </AlertDescription>
              </Alert>
              
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
                <Box>
                  <FormLabel>نوع الراتب</FormLabel>
                  <Select
                    placeholder="اختر نوع الراتب"
                    value={bulkEditForm.salary_type}
                    onChange={(e) => setBulkEditForm({...bulkEditForm, salary_type: e.target.value})}
                    bg="white"
                    border="1px solid"
                    borderColor="gray.300"
                    className="stake-input"
                    _focus={{ borderColor: "var(--stake-border-accent)", boxShadow: "0 0 0 1px var(--stake-border-accent)" }}
                    _hover={{ borderColor: "var(--stake-border-accent)" }}
                  >
<option value="Monthly" >شهري</option>
                                <option value="Weekly" >أسبوعي</option>
                  </Select>
                </Box>
                
                <Box>
                  <FormLabel>القسم</FormLabel>
                  <Select
                    placeholder="لا تغيير"
                    value={bulkEditForm.department}
                    onChange={(e) => setBulkEditForm({ ...bulkEditForm, department: e.target.value })}
                    bg="white"
                    border="1px solid"
                    borderColor="gray.300"
                    className="stake-input"
                    _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                  >
                    <option value="">لا تغيير</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.description || dept.name}
                      </option>
                    ))}
                  </Select>
                </Box>
                
                <Box>
                  <FormLabel>التكلفة</FormLabel>
                  <Select
                    placeholder="لا تغيير"
                    value={bulkEditForm.cost_center}
                    onChange={(e) => setBulkEditForm({ ...bulkEditForm, cost_center: e.target.value })}
                    bg="white"
                    border="1px solid"
                    borderColor="gray.300"
                    className="stake-input"
                    _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                  >
                    <option value="">لا تغيير</option>
                    {costCenters.map((center) => (
                      <option key={center.id} value={center.name}>
                        {center.name}
                      </option>
                    ))}
                  </Select>
                </Box>
                
                <Box>
                  <FormLabel>المنصب</FormLabel>
                  <Input
                    placeholder="المنصب"
                    value={bulkEditForm.position}
                    onChange={(e) => setBulkEditForm({...bulkEditForm, position: e.target.value})}
                    bg="white"
                    border="1px solid"
                    borderColor="gray.300"
                    _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                  />
                </Box>
                
                <Box>
                  <FormLabel>الحالة</FormLabel>
                  <Select
                    placeholder="لا تغيير"
                    value={bulkEditForm.status}
                    onChange={(e) => setBulkEditForm({ ...bulkEditForm, status: e.target.value })}
                    bg="white"
                    border="1px solid"
                    borderColor="gray.300"
                    className="stake-input"
                    _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                  >
                    <option value="">لا تغيير</option>
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </Select>
                </Box>
                
                <Box>
                  <FormLabel>الراتب الأساسي</FormLabel>
                  <Input
                    type="number"
                    placeholder="0"
                    value={bulkEditForm.base_salary}
                    onChange={(e) => setBulkEditForm({...bulkEditForm, base_salary: e.target.value})}
                    bg="white"
                    border="1px solid"
                    borderColor="gray.300"
                    _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                  />
                </Box>
                
                <Box>
                  <FormLabel>الموقع</FormLabel>
                  <Select
                    placeholder="اختر الموقع"
                    value={bulkEditForm.location}
                    onChange={(e) => setBulkEditForm({...bulkEditForm, location: e.target.value})}
                    bg="white"
                    border="1px solid"
                    borderColor="gray.300"
                    _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                  >
                    <option value="برج العرب">برج العرب</option>
                    <option value="محرم بك">محرم بك</option>
                  </Select>
                </Box>
                
                <Box>
                  <FormLabel>التأمين</FormLabel>
                  <Select
                    placeholder="لا تغيير"
                    value={bulkEditForm.is_insured}
                    onChange={(e) => setBulkEditForm({...bulkEditForm, is_insured: e.target.value})}
                    bg="white"
                    border="1px solid"
                    borderColor="gray.300"
                    className="stake-input"
                    _focus={{ borderColor: "var(--stake-border-accent)", boxShadow: "0 0 0 1px var(--stake-border-accent)" }}
                    _hover={{ borderColor: "var(--stake-border-accent)" }}
                  >
                    <option value="">لا تغيير</option>
                    <option value="1">مؤمن عليه</option>
                    <option value="0">غير مؤمن عليه</option>
                  </Select>
                </Box>
              </SimpleGrid>
            </VStack>
          </ModalBody>
          <ModalFooter 
            bg="var(--stake-bg-secondary)" 
            borderTop="1px solid" 
            borderColor="var(--stake-border)"
            py="4"
            px="6"
          >
            <HStack spacing="3" w="full" justify="flex-end">
              <Button 
                variant="outline" 
                onClick={onBulkEditClose}
                borderColor="var(--stake-border)"
                color="var(--stake-text-secondary)"
                _hover={{ 
                  borderColor: "var(--stake-border-accent)", 
                  color: "var(--stake-text-primary)",
                  bg: "var(--stake-bg-hover)"
                }}
              >
                إلغاء
              </Button>
              <Button
                colorScheme="blue"
                onClick={() => handleBulkEditSubmit(bulkEditForm)}
                bg="blue.500"
                color="white"
                _hover={{ bg: "blue.600" }}
                _active={{ bg: "blue.700" }}
                leftIcon={<FiSave />}
              >
                تطبيق التغييرات
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Export XML Modal - نفس تصميم المودالات الأخرى */}
      <Modal isOpen={isExportOpen} onClose={onExportClose} isCentered size="md">
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent
          bg="var(--stake-bg-primary)"
          border="none"
          borderRadius="2xl"
          boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          overflow="hidden"
          maxH="90vh"
        >
          <ModalHeader
            bg="var(--stake-bg-primary)"
            color="white"
            borderRadius="16px 16px 0 0"
            p="3"
            position="relative"
            boxShadow="0 2px 10px rgba(0, 0, 0, 0.4)"
          >
            <HStack justify="space-between" align="center" w="full">
              <ModalCloseButton
                color="white"
                bg="rgba(255, 255, 255, 0.1)"
                borderRadius="full"
                size="sm"
                _hover={{ bg: "rgba(255, 255, 255, 0.2)" }}
                _active={{ transform: "scale(0.95)" }}
                position="relative"
                top="0"
                right="0"
                left="0"
              />
              <HStack spacing="3" align="center" flex="1" justify="center">
                <Box
                  bg="rgba(59, 130, 246, 0.15)"
                  borderRadius="full"
                  p="2"
                >
                  <Icon as={FiUpload} color="#3b82f6" boxSize="4" />
                </Box>
                <Text
                  fontSize="md"
                  fontWeight="bold"
                  color="var(--stake-text-primary, #ffffff)"
                >
                  تصدير بيانات الموظفين
                </Text>
              </HStack>
              <Box w="30px" />
            </HStack>
          </ModalHeader>
          <ModalBody p="5">
            <VStack align="flex-start" spacing={4}>
              <Text
                fontSize="sm"
                color="var(--stake-text-secondary, #d5dceb)"
                lineHeight="1.7"
              >
                سيتم إنشاء ملف XML يحتوي على جميع سجلات الموظفين النشطة، ويمكنك اختيار إضافة بيانات الحضور والسلف والتعديلات معاً.
              </Text>
              <Checkbox
                isChecked={includeRelatedExport}
                onChange={(e) => setIncludeRelatedExport(e.target.checked)}
                colorScheme="blue"
              >
                إضافة سجلات الحضور والانصراف والسلف والتعديلات (المكافآت وبدل المواصلات) مع الموظفين
              </Checkbox>
            </VStack>
          </ModalBody>
          <ModalFooter
            justifyContent="space-between"
            gap="2"
            bg="var(--stake-bg-primary)"
            borderTop="1px solid"
            borderColor="var(--stake-border-primary)"
            borderRadius="0 0 12px 12px"
            p="3"
            boxShadow="0 -2px 10px rgba(0, 0, 0, 0.4)"
          >
            <Button
              variant="ghost"
              onClick={onExportClose}
              color="var(--stake-text-secondary, #d5dceb)"
              _hover={{
                color: "var(--stake-text-primary, #ffffff)",
                bg: "rgba(255, 255, 255, 0.06)",
              }}
              h="36px"
              px="4"
              fontSize="sm"
            >
              إلغاء
            </Button>
            <Button
              leftIcon={<Icon as={FiUpload} />}
              onClick={handleExportXml}
              bg="#3b82f6"
              color="white"
              _hover={{ bg: "#2563eb" }}
              _active={{ bg: "#1d4ed8" }}
              h="36px"
              px="4"
              fontSize="sm"
              borderRadius="lg"
            >
              تصدير XML
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Import XML Modal - نفس تصميم المودالات الأخرى */}
      <Modal isOpen={isImportOpen} onClose={handleImportModalClose} isCentered size="md" closeOnOverlayClick={!isImporting}>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent
          bg="var(--stake-bg-primary)"
          border="none"
          borderRadius="2xl"
          boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          overflow="hidden"
          maxH="90vh"
        >
          <ModalHeader
            bg="var(--stake-bg-primary)"
            color="white"
            borderRadius="16px 16px 0 0"
            p="3"
            position="relative"
            boxShadow="0 2px 10px rgba(0, 0, 0, 0.4)"
          >
            <HStack justify="space-between" align="center" w="full">
              <ModalCloseButton
                color="white"
                bg="rgba(255, 255, 255, 0.1)"
                borderRadius="full"
                size="sm"
                _hover={{ bg: "rgba(255, 255, 255, 0.2)" }}
                _active={{ transform: "scale(0.95)" }}
                position="relative"
                top="0"
                right="0"
                left="0"
              />
              <HStack spacing="3" align="center" flex="1" justify="center">
                <Box
                  bg="rgba(34, 197, 94, 0.15)"
                  borderRadius="full"
                  p="2"
                >
                  <Icon as={FiDownload} color="#22c55e" boxSize="4" />
                </Box>
                <Text
                  fontSize="md"
                  fontWeight="bold"
                  color="var(--stake-text-primary, #ffffff)"
                >
                  استيراد بيانات الموظفين من XML
                </Text>
              </HStack>
              <Box w="30px" />
            </HStack>
          </ModalHeader>
          <ModalBody p="5">
            {isImporting ? (
              <VStack spacing={5} py={4} w="full" align="center">
                <CircularProgress
                  value={importXmlProgress}
                  size="120px"
                  thickness="8px"
                  color="green.400"
                  trackColor="var(--stake-border-primary)"
                >
                  <CircularProgressLabel fontSize="xl" fontWeight="bold" color="var(--stake-text-primary, white)">
                    {importXmlProgress}%
                  </CircularProgressLabel>
                </CircularProgress>
                <VStack spacing={1} w="full">
                  <Text color="var(--stake-text-primary, white)" fontWeight="600" fontSize="sm">
                    {importXmlPhase === 'upload'
                      ? 'جاري رفع الملف...'
                      : importXmlPhase === 'done'
                        ? 'اكتمل الاستيراد'
                        : 'جاري معالجة البيانات على الخادم...'}
                  </Text>
                  {importXmlEmployeeCount > 0 && (
                    <Text fontSize="sm" color="var(--stake-text-secondary, #d5dceb)">
                      {importXmlEmployeeCount} موظف في الملف
                    </Text>
                  )}
                </VStack>
                <Progress
                  value={importXmlProgress}
                  size="lg"
                  w="full"
                  colorScheme="green"
                  borderRadius="full"
                  hasStripe={importXmlPhase === 'processing'}
                  isAnimated={importXmlPhase === 'processing'}
                />
              </VStack>
            ) : (
              <VStack align="flex-start" spacing={4} w="full">
                <Text
                  fontSize="sm"
                  color="var(--stake-text-secondary, #d5dceb)"
                  lineHeight="1.7"
                >
                  اختر ملف XML تم تصديره من نفس النظام، يمكن أن يحتوي على بيانات الموظفين فقط أو مع الحضور والسلف والتعديلات.
                </Text>
                <FormControl display="flex" alignItems="flex-start" gap={3}>
                  <Switch
                    id="import-xml-clean-mode"
                    isChecked={importXmlCleanMode}
                    onChange={(e) => setImportXmlCleanMode(e.target.checked)}
                    colorScheme="green"
                    mt={1}
                  />
                  <Box flex="1">
                    <FormLabel htmlFor="import-xml-clean-mode" mb={1} fontSize="sm" color="var(--stake-text-primary, #ffffff)" cursor="pointer">
                      استيراد نظيف (موصى به بعد حذف الموظفين)
                    </FormLabel>
                    <Text fontSize="xs" color="var(--stake-text-secondary, #d5dceb)" lineHeight="1.6">
                      يطابق الموظفين بـ <strong>كود الموظف الرسمي</strong> فقط — بدون دمج عبر id من XML أو كود البصمة أو الاسم.
                      الصفوف بدون كود موظف تُتخطى.
                    </Text>
                  </Box>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm" color="var(--stake-text-secondary, #d5dceb)">
                    ملف XML
                  </FormLabel>
                  <Input
                    type="file"
                    accept=".xml,text/xml"
                    bg="var(--stake-bg-secondary, #152636)"
                    borderColor="var(--stake-border-primary)"
                    _hover={{ borderColor: "var(--stake-border-accent, #3b82f6)" }}
                    _focus={{
                      borderColor: "var(--stake-border-accent, #3b82f6)",
                      boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.4)",
                    }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const content = ev.target?.result || '';
                        const preview = parseXmlImportPreview(content);
                        setImportXmlContent(content);
                        setImportXmlFileName(file.name);
                        setImportXmlPreview(preview);
                        setImportXmlEmployeeCount(preview.total);
                      };
                      reader.readAsText(file, 'utf-8');
                    }}
                  />
                </FormControl>
                {importXmlContent && (
                  <VStack align="stretch" spacing={3} w="full">
                    <HStack spacing={2} flexWrap="wrap">
                      {importXmlFileName && (
                        <Badge colorScheme="blue" borderRadius="full" px={3} py={1}>
                          {importXmlFileName}
                        </Badge>
                      )}
                      {importXmlEmployeeCount > 0 && (
                        <Badge colorScheme="green" borderRadius="full" px={3} py={1}>
                          {importXmlEmployeeCount} موظف في الملف
                        </Badge>
                      )}
                    </HStack>

                    {importXmlPreview.total > 0 && (
                      <Box w="full">
                        <Text fontSize="sm" fontWeight="600" color="var(--stake-text-primary, white)" mb={2}>
                          معاينة الملف قبل الاستيراد
                        </Text>
                        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} w="full">
                          {[
                            { key: 'weekly', label: 'أسبوعي', value: importXmlPreview.weekly, color: 'blue.300' },
                            { key: 'monthly', label: 'شهري', value: importXmlPreview.monthly, color: 'purple.300' },
                            { key: 'active', label: 'نشط', value: importXmlPreview.active, color: 'green.400' },
                            { key: 'inactive', label: 'غير نشط', value: importXmlPreview.inactive, color: 'orange.300' },
                          ].map((stat) => (
                            <Box
                              key={stat.key}
                              bg="var(--stake-bg-secondary, #152636)"
                              border="1px solid"
                              borderColor="var(--stake-border-primary)"
                              borderRadius="xl"
                              p={3}
                              textAlign="center"
                            >
                              <Text fontSize="xs" color="var(--stake-text-secondary, #d5dceb)" mb={1}>
                                {stat.label}
                              </Text>
                              <Text fontSize="2xl" fontWeight="bold" color={stat.color} lineHeight="1.2">
                                {stat.value}
                              </Text>
                            </Box>
                          ))}
                        </SimpleGrid>
                        {importXmlPreview.terminated > 0 && (
                          <Text fontSize="xs" color="var(--stake-text-secondary, #d5dceb)" mt={2}>
                            منتهي الخدمة: {importXmlPreview.terminated}
                          </Text>
                        )}
                      </Box>
                    )}
                  </VStack>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter
            justifyContent="space-between"
            gap="2"
            bg="var(--stake-bg-primary)"
            borderTop="1px solid"
            borderColor="var(--stake-border-primary)"
            borderRadius="0 0 12px 12px"
            p="3"
            boxShadow="0 -2px 10px rgba(0, 0, 0, 0.4)"
          >
            <Button
              variant="ghost"
              onClick={handleImportModalClose}
              isDisabled={isImporting}
              color="var(--stake-text-secondary, #d5dceb)"
              _hover={{
                color: "var(--stake-text-primary, #ffffff)",
                bg: "rgba(255, 255, 255, 0.06)",
              }}
              h="36px"
              px="4"
              fontSize="sm"
            >
              إلغاء
            </Button>
            <Button
              leftIcon={<Icon as={FiDownload} />}
              onClick={handleImportXml}
              isLoading={isImporting}
              loadingText={`${importXmlProgress}%`}
              isDisabled={!importXmlContent || isImporting}
              bg="#22c55e"
              color="white"
              _hover={{ bg: "#16a34a" }}
              _active={{ bg: "#15803d" }}
              h="36px"
              px="4"
              fontSize="sm"
              borderRadius="lg"
            >
              استيراد XML
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* تقرير نتيجة استيراد XML */}
      <Modal
        isOpen={isImportResultOpen && !!importXmlResult}
        onClose={handleImportResultClose}
        isCentered
        size={{ base: 'md', lg: '4xl' }}
        scrollBehavior="inside"
      >
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent
          bg="var(--stake-bg-primary)"
          border="none"
          borderRadius="2xl"
          boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          overflow="hidden"
          maxH="90vh"
        >
          <ModalHeader
            bg="var(--stake-bg-primary)"
            color="white"
            borderRadius="16px 16px 0 0"
            p="3"
            boxShadow="0 2px 10px rgba(0, 0, 0, 0.4)"
          >
            <HStack justify="space-between" align="center" w="full">
              <ModalCloseButton
                color="white"
                bg="rgba(255, 255, 255, 0.1)"
                borderRadius="full"
                size="sm"
                _hover={{ bg: "rgba(255, 255, 255, 0.2)" }}
                position="relative"
                top="0"
                right="0"
                left="0"
              />
              <HStack spacing="3" align="center" flex="1" justify="center">
                <Box
                  bg={
                    Number(importXmlResult?.duplicate_fingerprint_skipped || 0) > 0
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(34, 197, 94, 0.15)'
                  }
                  borderRadius="full"
                  p="2"
                >
                  <Icon
                    as={Number(importXmlResult?.duplicate_fingerprint_skipped || 0) > 0 ? FiAlertCircle : FiCheckCircle}
                    color={Number(importXmlResult?.duplicate_fingerprint_skipped || 0) > 0 ? '#f59e0b' : '#22c55e'}
                    boxSize="4"
                  />
                </Box>
                <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary, #ffffff)">
                  {importXmlResult?.clean_import ? 'تم الاستيراد (وضع نظيف)' : (
                    Number(importXmlResult?.duplicate_fingerprint_skipped || 0) > 0
                      ? 'تم الاستيراد مع تحذيرات'
                      : 'تم الاستيراد بنجاح'
                  )}
                </Text>
              </HStack>
              <Box w="30px" />
            </HStack>
          </ModalHeader>

          <ModalBody p="5">
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5} w="full">
              {/* العمود الأيسر — ملخص الموظفين */}
              <Box
                bg="var(--stake-bg-secondary, #152636)"
                border="1px solid"
                borderColor="var(--stake-border-primary)"
                borderRadius="xl"
                p={4}
              >
                <Text fontSize="sm" fontWeight="700" color="var(--stake-text-primary, white)" mb={3}>
                  ملخص الموظفين
                </Text>
                <VStack align="stretch" spacing={0} divider={<Divider borderColor="var(--stake-border-primary)" />}>
                  {[
                    { label: 'وضع الاستيراد', value: importXmlResult?.clean_import ? 'نظيف' : 'عادي', color: importXmlResult?.clean_import ? 'green.300' : 'gray.300' },
                    { label: 'صفوف في الملف', value: importXmlResult?.file_employee_count ?? 0, color: 'gray.300' },
                    { label: 'إجمالي الموظفين في النظام', value: importXmlResult?.total_employees_in_db ?? 0, color: 'teal.300' },
                    { label: 'موظفون جدد', value: importXmlResult?.created ?? 0, color: 'green.400' },
                    { label: 'محدّثون', value: importXmlResult?.updated ?? 0, color: 'blue.400' },
                    { label: 'مطابقون بكود الموظف', value: importXmlResult?.matched_by_employee_code ?? 0 },
                    { label: 'مطابقون بـ id من XML', value: importXmlResult?.matched_by_xml_id ?? 0 },
                    { label: 'مطابقون بكود البصمة', value: importXmlResult?.matched_by_fingerprint ?? 0 },
                    { label: 'غير نشط من الملف', value: importXmlResult?.inactive_imported ?? 0, color: 'orange.300' },
                    { label: 'مؤمن عليهم', value: importXmlResult?.insured_imported ?? 0 },
                    {
                      label: 'تخطّي كود بصمة مكرر',
                      value: importXmlResult?.duplicate_fingerprint_skipped ?? 0,
                      color: Number(importXmlResult?.duplicate_fingerprint_skipped || 0) > 0 ? 'orange.300' : undefined,
                    },
                    { label: 'متخطّون بدون كود', value: importXmlResult?.skipped_no_code ?? 0 },
                  ].map((row) => (
                    <HStack key={row.label} justify="space-between" py={2.5}>
                      <Text fontSize="sm" color="var(--stake-text-secondary, #d5dceb)">
                        {row.label}
                      </Text>
                      <Text fontSize="sm" fontWeight="700" color={row.color || 'var(--stake-text-primary, white)'}>
                        {row.value}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>

              {/* العمود الأيمن — البيانات المرتبطة والتحذيرات */}
              <Box
                bg="var(--stake-bg-secondary, #152636)"
                border="1px solid"
                borderColor="var(--stake-border-primary)"
                borderRadius="xl"
                p={4}
                display="flex"
                flexDirection="column"
                minH={{ md: '280px' }}
              >
                <Text fontSize="sm" fontWeight="700" color="var(--stake-text-primary, white)" mb={3}>
                  البيانات المرتبطة
                </Text>
                <VStack align="stretch" spacing={0} divider={<Divider borderColor="var(--stake-border-primary)" />} mb={4}>
                  {[
                    { label: 'سجلات حضور', value: importXmlResult?.attendance_imported ?? 0, color: 'cyan.300' },
                    { label: 'سلف', value: importXmlResult?.advances_imported ?? 0, color: 'purple.300' },
                    { label: 'تعديلات', value: importXmlResult?.adjustments_imported ?? 0, color: 'pink.300' },
                  ].map((row) => (
                    <HStack key={row.label} justify="space-between" py={2.5}>
                      <Text fontSize="sm" color="var(--stake-text-secondary, #d5dceb)">
                        {row.label}
                      </Text>
                      <Text fontSize="sm" fontWeight="700" color={row.color}>
                        {row.value}
                      </Text>
                    </HStack>
                  ))}
                </VStack>

                {Array.isArray(importXmlResult?.duplicate_fingerprint_skipped_details)
                  && importXmlResult.duplicate_fingerprint_skipped_details.length > 0 ? (
                  <Box flex="1" minH={0}>
                    <Text fontSize="sm" fontWeight="600" color="orange.300" mb={2}>
                      موظفون لم يُعيَّن لهم كود البصمة ({importXmlResult.duplicate_fingerprint_skipped_details.length})
                    </Text>
                    <div className="bg-[#151E32] border border-[#1F2A44] rounded-[20px] overflow-hidden" style={{background:'#151E32', border:'1px solid #1F2A44', borderRadius:'20px'}}
                      flex="1"
                      maxH="200px"
                      overflowY="auto"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                      borderRadius="lg"
                    >
                      <Table size="sm" variant="simple">
                        <Thead position="sticky" top={0} bg="var(--stake-bg-primary)" zIndex={1}>
                          <Tr>
                            <Th color="var(--stake-text-secondary, #d5dceb)" fontSize="xs">الموظف</Th>
                            <Th color="var(--stake-text-secondary, #d5dceb)" fontSize="xs">الكود</Th>
                            <Th color="var(--stake-text-secondary, #d5dceb)" fontSize="xs">السبب</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {importXmlResult.duplicate_fingerprint_skipped_details.map((item, idx) => (
                            <Tr key={`${item.xml_id || item.name}-${item.fingerprint_code}-${idx}`}>
                              <Td color="var(--stake-text-primary, white)" fontSize="xs" whiteSpace="normal">
                                {item.name}
                              </Td>
                              <Td color="orange.300" fontSize="xs">{item.fingerprint_code}</Td>
                              <Td color="var(--stake-text-secondary, #d5dceb)" fontSize="xs" whiteSpace="normal">
                                {getFingerprintSkipReasonLabel(item.reason)}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </div>
                  </Box>
                ) : (
                  <VStack align="stretch" spacing={3} mt="auto">
                    {importXmlResult?.clean_import ? (
                      <Text fontSize="xs" color="green.300" lineHeight="1.7">
                        تم الاستيراد بوضع «نظيف»: المطابقة كانت بكود الموظف الرسمي فقط دون دمج عبر id أو البصمة أو الاسم.
                      </Text>
                    ) : Number(importXmlResult?.file_employee_count || 0) > Number(importXmlResult?.total_employees_in_db || 0) ? (
                      <Alert status="info" borderRadius="lg" bg="rgba(59, 130, 246, 0.12)">
                        <AlertIcon color="blue.300" />
                        <Box>
                          <AlertTitle fontSize="sm" color="blue.200">لماذا عدد القائمة أقل من الملف؟</AlertTitle>
                          <AlertDescription fontSize="sm" color="var(--stake-text-secondary, #d5dceb)" lineHeight="tall">
                            الملف يحتوي على {importXmlResult?.file_employee_count} صفاً، لكن إجمالي الموظفين الفريدين في النظام {importXmlResult?.total_employees_in_db}.
                            الاستيراد يُحدّث الموظفين الموجودين ({importXmlResult?.updated}) ويُضيف الجدد فقط ({importXmlResult?.created}) — وليس إنشاء صف جديد لكل سطر في الملف.
                            {Number(importXmlResult?.matched_by_xml_id || 0) > 0 ? (
                              <> تم دمج {importXmlResult.matched_by_xml_id} سجل عبر مطابقة id من XML مع موظف موجود مسبقاً.</>
                            ) : null}
                          </AlertDescription>
                        </Box>
                      </Alert>
                    ) : (
                      <Text fontSize="sm" color="var(--stake-text-secondary, #d5dceb)">
                        لا توجد تحذيرات إضافية. تم استيراد جميع البيانات بنجاح.
                      </Text>
                    )}
                  </VStack>
                )}
              </Box>
            </SimpleGrid>
          </ModalBody>

          <ModalFooter
            justifyContent="center"
            bg="var(--stake-bg-primary)"
            borderTop="1px solid"
            borderColor="var(--stake-border-primary)"
            borderRadius="0 0 12px 12px"
            p="3"
          >
            <Button
              onClick={handleImportResultClose}
              bg="#22c55e"
              color="white"
              _hover={{ bg: '#16a34a' }}
              _active={{ bg: '#15803d' }}
              h="36px"
              px="8"
              fontSize="sm"
              borderRadius="lg"
            >
              إغلاق
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal موحد لرسائل الأخطاء */}
      <Modal isOpen={isErrorModalOpen} onClose={onErrorModalClose} size="md" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="2xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden" maxH="90vh">
          <ModalHeader
            bg="var(--stake-bg-primary)"
            color="white"
            borderRadius="16px 16px 0 0"
            p="3"
            position="relative"
            boxShadow="0 2px 10px rgba(0, 0, 0, 0.4)"
          >
            <HStack justify="space-between" align="center" w="full">
              <ModalCloseButton 
                color="white"
                bg="rgba(255, 255, 255, 0.1)"
                borderRadius="full"
                size="sm"
                _hover={{
                  bg: "rgba(255, 255, 255, 0.2)"
                }}
                _active={{
                  transform: "scale(0.95)"
                }}
                position="relative"
                top="0"
                right="0"
                left="0"
              />
              <HStack spacing="3" align="center" flex="1" justify="center">
                <Box
                  bg="rgba(239, 68, 68, 0.15)"
                  borderRadius="full"
                  p="2"
                >
                  <Icon as={FiAlertCircle} color="#ef4444" boxSize="4" />
                </Box>
                <Text
                  fontSize="md"
                  fontWeight="bold"
                  color="var(--stake-text-primary, #ffffff)"
                >
                  {errorModalData.title}
                </Text>
              </HStack>
              <Box w="30px"></Box>
            </HStack>
          </ModalHeader>
          <ModalBody p="4" overflowY="auto">
            <Text
              fontSize="sm"
              color="var(--stake-text-secondary, #d5dceb)"
              lineHeight="1.7"
            >
              {errorModalData.message}
            </Text>
          </ModalBody>
          <ModalFooter 
            justifyContent="space-between"
            gap="2"
            bg="var(--stake-bg-primary)"
            borderTop="1px solid"
            borderColor="var(--stake-border-primary)"
            borderRadius="0 0 12px 12px"
            p="2.5"
            boxShadow="0 -2px 10px rgba(0, 0, 0, 0.4)"
          >
            <Button
              variant="ghost"
              onClick={onErrorModalClose}
              color="var(--stake-text-secondary, #d5dceb)"
              _hover={{
                color: "var(--stake-text-primary, #ffffff)",
                bg: "rgba(255, 255, 255, 0.1)"
              }}
              h="36px"
              px="4"
              fontSize="sm"
            >
              إغلاق
            </Button>
            {errorModalData.actionButton && (
              <Button
                leftIcon={errorModalData.actionButton.icon ? <Icon as={errorModalData.actionButton.icon} /> : undefined}
                onClick={errorModalData.actionButton.onClick}
                bg="#3b82f6"
                color="white"
                _hover={{
                  bg: "#2563eb"
                }}
                h="36px"
                px="4"
                fontSize="sm"
                borderRadius="lg"
              >
                {errorModalData.actionButton.label}
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default PremiumEmployees;



import React, { useState, useEffect, useMemo } from 'react';
import { getApiUrl } from '../utils/apiUrlHelper';
import {
  Box,
  VStack,
  HStack,
  Flex,
  Text,
  Button,
  Select,
  useToast,
  Spinner,
  Center,
  Divider,
  Badge,
  IconButton,
  Tooltip,
  useDisclosure,
  SimpleGrid,
  Heading,
  Card,
  CardBody,
  CardHeader,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  Grid,
  GridItem,
  Icon
} from '@chakra-ui/react';
import {
  FiSettings,
  FiEye,
  FiSave,
  FiRefreshCw,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiArrowUp,
  FiArrowDown,
  FiInfo,
  FiCheck,
  FiX,
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiArrowRight,
  FiDatabase,
  FiGlobe,
  FiDownload,
  FiLink,
  FiZap,
} from 'react-icons/fi';
import TemplateSelector from '../components/TemplateSelector';
import SimpleColumnManager from '../components/SimpleColumnManager';
import FormulaPreviewSimple from '../components/FormulaPreviewSimple';
import ChangesPreviewModal from '../components/ChangesPreviewModal';
import { useSalaryColumnsToolbar } from '../contexts/SalaryColumnsToolbarContext';
import PagePanelToggle from '../components/PagePanelToggle';
import { useSettings } from '../contexts/SettingsContext';
import { filterMealAllowanceColumns, isMealAllowanceEnabled } from '../utils/systemFeatureFlags';

const SimplifiedDynamicManager = () => {
  const { filtersCollapsed, toggleFiltersCollapsed } = useSalaryColumnsToolbar();
  const { settings } = useSettings();
  const mealAllowanceEnabled = isMealAllowanceEnabled(settings);
  // قراءة معاملات URL لتحديد الجدول والنوع تلقائياً
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    const table = params.get('table');
    const type = params.get('type'); // 'weekly' or 'monthly'
    return { table, type };
  };

  const urlParams = getUrlParams();
  const [selectedTableType, setSelectedTableType] = useState(urlParams.type || 'weekly');
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // System Variables states
  const [systemVariables, setSystemVariables] = useState([]);
  const [variableCategories, setVariableCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [variableChanges, setVariableChanges] = useState({});
  const [previewData, setPreviewData] = useState(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isBadgeColorModalOpen, setIsBadgeColorModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [isVariableModalOpen, setIsVariableModalOpen] = useState(false);
  
  // Import column states
  const [isImportColumnModalOpen, setIsImportColumnModalOpen] = useState(false);
  const [importAvailableTables, setImportAvailableTables] = useState([]);
  const [selectedImportTable, setSelectedImportTable] = useState('');
  const [importableColumns, setImportableColumns] = useState([]);
  const [importMode, setImportMode] = useState('reference'); // 'reference' or 'copy'
  const [editingVariable, setEditingVariable] = useState(null);
  const [variableFormData, setVariableFormData] = useState({
    variable_key: '',
    variable_name_ar: '',
    variable_name_en: '',
    variable_value: '',
    variable_type: 'text',
    category: 'system',
    is_editable: true,
    is_required: false,
    description_ar: '',
    description_en: ''
  });
  
  const { isOpen: isPreviewOpen, onOpen: onPreviewOpen, onClose: onPreviewClose } = useDisclosure();
  const toast = useToast();

  // جلب الأعمدة من قاعدة البيانات
  const fetchColumnsFromDatabase = async (tableName) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dynamic_system/dynamic_system_api.php?action=get_columns&table_name=${tableName}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      if (result.success) {
        setColumns(result.data);
        console.log(`Loaded ${result.data.length} columns for ${tableName} from database`);
        
        // إذا كان هناك جدول محدد، تأكد من تحديث selectedTable
        if (!selectedTable || selectedTable.table_name !== tableName) {
          const tables = getAvailableTables(selectedTableType);
          const table = tables.find(t => t.table_name === tableName);
          if (table) {
            setSelectedTable(table);
          }
        }
      } else {
        throw new Error(result.message || 'Failed to load columns');
      }
    } catch (error) {
      console.error('Error fetching columns:', error);
      toast({
        title: 'خطأ في تحميل الأعمدة',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // الجداول الحقيقية من قاعدة البيانات
  const getAvailableTables = (tableType) => {
    if (tableType === 'weekly') {
      return [
        { id: 'net_weekly_wage', name: 'صافي الأجر', description: 'الأعمدة الأساسية للراتب', table_name: 'net_weekly_wage' },
        { id: 'weekly_wage_entitlements', name: 'المستحقات', description: 'مستحقات الراتب', table_name: 'weekly_wage_entitlements' },
        { id: 'weekly_wage_deductions', name: 'المستقطعات', description: 'مستقطعات الراتب', table_name: 'weekly_wage_deductions' }
      ];
    } else if (tableType === 'monthly') {
      return [
        { id: 'net_monthly_salary', name: 'صافي المرتب', description: 'الأعمدة الأساسية للراتب', table_name: 'net_monthly_salary' },
        { id: 'monthly_salary_entitlements_columns', name: 'المستحقات', description: 'مستحقات الراتب', table_name: 'monthly_salary_entitlements_columns' },
        { id: 'monthly_salary_deductions_columns', name: 'المستقطعات', description: 'مستقطعات الراتب', table_name: 'monthly_salary_deductions_columns' }
      ];
    }
    return [];
  };

  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableFormulas, setTableFormulas] = useState({});
  const [allColumns, setAllColumns] = useState([]);

  // تحديد الجدول من معاملات URL عند التحميل
  useEffect(() => {
    if (urlParams.table && urlParams.type) {
      const tables = getAvailableTables(urlParams.type);
      const table = tables.find(t => t.table_name === urlParams.table);
      if (table) {
        setSelectedTable(table);
        setSelectedTableType(urlParams.type);
        // تحديد التاب الصحيح
        if (urlParams.type === 'weekly') {
          setActiveTabIndex(0);
        } else if (urlParams.type === 'monthly') {
          setActiveTabIndex(1);
        }
        // تحميل الأعمدة للجدول المحدد
        fetchColumnsFromDatabase(table.table_name);
      }
    }
  }, []);

  // تحميل الأعمدة الحالية
  // تم استبدال loadColumns بـ fetchColumnsFromDatabase
  const loadColumns = () => {
    if (selectedTable) {
      fetchColumnsFromDatabase(selectedTable.table_name);
    } else {
      // إذا لم يكن هناك جدول محدد، استخدم أول جدول متاح
      const tables = getAvailableTables(selectedTableType);
      if (tables.length > 0) {
        const firstTable = tables[0];
        setSelectedTable(firstTable);
        fetchColumnsFromDatabase(firstTable.table_name);
      }
    }
  };

  // تم إزالة applyTemplate - النظام يستخدم قاعدة البيانات فقط
  const applyTemplate = () => {
    // لا يوجد قوالب - النظام يستخدم قاعدة البيانات
    toast({
      title: 'النظام يستخدم قاعدة البيانات',
      description: 'لا توجد قوالب جاهزة - النظام يستخدم الأعمدة من قاعدة البيانات',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  // حفظ التغييرات
  const saveChanges = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/dynamic_system/dynamic_system_api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save_simplified_columns',
          table_type: selectedTableType,
          table_name: selectedTable?.table_name,
          template_id: selectedTemplate?.id,
          columns: columns
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setHasChanges(false);
        // إعادة تحميل الأعمدة من قاعدة البيانات بعد الحفظ
        loadColumns();
        toast({
          title: 'تم الحفظ بنجاح',
          description: 'تم حفظ التغييرات بنجاح',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'خطأ في الحفظ',
          description: data.message || 'فشل في حفظ التغييرات',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: 'خطأ في الاتصال',
        description: 'فشل في الاتصال بالخادم',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  // تحديث لون البادج
  const updateBadgeColor = async (columnId, badgeColor, badgeVariant, isCurrency) => {
    try {
      const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_badge_color',
          id: columnId,
          badge_color: badgeColor,
          badge_variant: badgeVariant,
          is_currency: isCurrency,
          table_name: selectedTable?.table_name
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // تحديث العمود في القائمة المحلية
        setColumns(prev => prev.map(col => 
          col.id === columnId 
            ? { ...col, badge_color: badgeColor, badge_variant: badgeVariant, is_currency: isCurrency }
            : col
        ));
        
        toast({
          title: "تم تحديث لون البادج",
          description: "تم حفظ التغييرات بنجاح",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        
        // إعادة تحميل البيانات للتأكد من التزامن
        loadColumns();
      } else {
        throw new Error(result.message || 'فشل في تحديث لون البادج');
      }
    } catch (error) {
      console.error('Error updating badge color:', error);
      toast({
        title: "خطأ في التحديث",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // معاينة التغييرات
  const previewChanges = async () => {
    try {
      const response = await fetch('/api/dynamic_system/dynamic_system_api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'preview_changes',
          table_type: selectedTableType,
          columns: columns
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPreviewData(data.data);
        onPreviewOpen();
      } else {
        toast({
          title: 'خطأ في المعاينة',
          description: data.message || 'فشل في معاينة التغييرات',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error previewing changes:', error);
      toast({
        title: 'خطأ في الاتصال',
        description: 'فشل في الاتصال بالخادم',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // تحديث عمود
  const updateColumn = (index, updatedColumn) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], ...updatedColumn };
    setColumns(newColumns);
    setHasChanges(true);
  };

  // إضافة عمود جديد
  const addColumn = () => {
    const newColumn = {
      name: 'عمود جديد',
      type: 'text',
      required: false,
      order: columns.length + 1,
      formula: ''
    };
    setColumns([...columns, newColumn]);
    setHasChanges(true);
  };

  // حذف عمود
  const deleteColumn = (index) => {
    const newColumns = columns.filter((_, i) => i !== index);
    setColumns(newColumns);
    setHasChanges(true);
  };

  // تغيير ترتيب العمود
  const moveColumn = (index, direction) => {
    const newColumns = [...columns];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < newColumns.length) {
      [newColumns[index], newColumns[newIndex]] = [newColumns[newIndex], newColumns[index]];
      newColumns[index].order = index + 1;
      newColumns[newIndex].order = newIndex + 1;
      setColumns(newColumns);
      setHasChanges(true);
    }
  };

  // إلغاء التغييرات
  const handleCancel = () => {
    setHasChanges(false);
    setPreviewData(null);
    // إعادة تحميل البيانات الأصلية
    if (selectedTable) {
      loadColumns();
    }
  };

  // Import column functions
  const fetchImportAvailableTables = async () => {
    try {
      // جلب جميع جداول قاعدة البيانات المتاحة
      const allTables = [
        { id: 1, table_name: 'net_weekly_wage', name: 'جدول صافي الأجر الأسبوعي', description: 'أعمدة صافي الراتب الأسبوعي' },
        { id: 2, table_name: 'weekly_wage_entitlements', name: 'جدول المستحقات الأسبوعي', description: 'أعمدة المستحقات الأسبوعي' },
        { id: 3, table_name: 'weekly_wage_deductions', name: 'جدول المستقطعات الأسبوعي', description: 'أعمدة المستقطعات الأسبوعي' },
        { id: 4, table_name: 'net_monthly_salary', name: 'جدول صافي المرتب الشهري', description: 'أعمدة صافي الراتب الشهري' },
        { id: 5, table_name: 'monthly_salary_entitlements_columns', name: 'جدول المستحقات الشهري', description: 'أعمدة المستحقات الشهري' },
        { id: 6, table_name: 'monthly_salary_deductions_columns', name: 'جدول المستقطعات الشهري', description: 'أعمدة المستقطعات الشهري' },
        { id: 7, table_name: 'employees', name: 'جدول الموظفين', description: 'أعمدة بيانات الموظفين' },
        { id: 8, table_name: 'attendance_logs', name: 'جدول سجلات الحضور', description: 'أعمدة سجلات الحضور والانصراف' }
      ];
      setImportAvailableTables(allTables);
    } catch (error) {
      console.error('Error fetching available tables:', error);
      toast({
        title: 'خطأ في تحميل الجداول',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const fetchImportableColumns = async (tableName) => {
    try {
      const response = await fetch(getApiUrl(`/api/dynamic_system/dynamic_system_api.php?action=get_columns&table_name=${tableName}`));
      const result = await response.json();
      if (result.success) {
        setImportableColumns(result.data || []);
      } else {
        throw new Error(result.message || 'فشل في جلب الأعمدة');
      }
    } catch (error) {
      console.error('Error fetching importable columns:', error);
      toast({
        title: 'خطأ في تحميل الأعمدة',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setImportableColumns([]);
    }
  };

  const importColumn = async (column, importType = 'reference') => {
    if (!selectedTable) {
      toast({
        title: 'خطأ',
        description: 'يرجى تحديد جدول أولاً',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_column',
          source_column: column,
          target_table: selectedTable.table_name,
          import_type: importType
        })
      });
      
      const result = await response.json();
      if (result.success) {
        const importTypeText = importType === 'reference' ? 'مرجع' : 'نسخة';
        toast({
          title: `تم استيراد العمود بنجاح (${importTypeText})`,
          description: `تم استيراد ${column.display_name_ar || column.column_name_ar || column.name} من ${column.table_name || selectedImportTable} ك${importTypeText}`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        // إعادة تحميل الأعمدة
        loadColumns();
        setIsImportColumnModalOpen(false);
        setSelectedImportTable('');
        setImportableColumns([]);
      } else {
        throw new Error(result.message || 'فشل في استيراد العمود');
      }
    } catch (error) {
      console.error('Error importing column:', error);
      toast({
        title: "فشل في استيراد العمود",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // System Variables functions
  const fetchSystemVariables = async () => {
    try {
      const response = await fetch(getApiUrl('/api/system_variables_api.php?action=get_variables'));
      const data = await response.json();
      if (data.success) {
        setSystemVariables(data.data);
      }
    } catch (error) {
      console.error('Error fetching system variables:', error);
    }
  };

  const fetchVariableCategories = async () => {
    try {
      const response = await fetch(getApiUrl('/api/system_variables_api.php?action=get_categories'));
      const data = await response.json();
      if (data.success) {
        setVariableCategories(['all', ...data.data]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const updateSystemVariable = async (id, value) => {
    try {
      const response = await fetch(getApiUrl('/api/system_variables_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_variable', id, value })
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'تم تحديث المتغير بنجاح', status: 'success' });
        fetchSystemVariables();
      } else {
        toast({ title: 'خطأ في التحديث', description: data.message, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'خطأ في الاتصال', status: 'error' });
    }
  };

  const saveAllVariableChanges = async () => {
    try {
      const updates = Object.entries(variableChanges).map(([id, value]) => ({ id, value }));
      const response = await fetch(getApiUrl('/api/system_variables_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_multiple', updates })
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'تم حفظ جميع التغييرات بنجاح', status: 'success' });
        setVariableChanges({});
        fetchSystemVariables();
      } else {
        toast({ title: 'خطأ في الحفظ', description: data.message, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'خطأ في الاتصال', status: 'error' });
    }
  };

  const openAddVariableModal = () => {
    setEditingVariable(null);
    setVariableFormData({
      variable_key: '',
      variable_name_ar: '',
      variable_name_en: '',
      variable_value: '',
      variable_type: 'text',
      category: 'system',
      is_editable: true,
      is_required: false,
      description_ar: '',
      description_en: ''
    });
    setIsVariableModalOpen(true);
  };

  const openEditVariableModal = (variable) => {
    setEditingVariable(variable);
    setVariableFormData({
      variable_key: variable.variable_key,
      variable_name_ar: variable.variable_name_ar,
      variable_name_en: variable.variable_name_en,
      variable_value: variable.variable_value,
      variable_type: variable.variable_type,
      category: variable.category || 'system',
      is_editable: variable.is_editable === 1,
      is_required: variable.is_required === 1,
      description_ar: variable.description_ar || '',
      description_en: variable.description_en || ''
    });
    setIsVariableModalOpen(true);
  };

  const saveVariable = async () => {
    try {
      const action = editingVariable ? 'update_variable_full' : 'create_variable';
      const payload = {
        action,
        ...variableFormData,
        is_editable: variableFormData.is_editable ? 1 : 0,
        is_required: variableFormData.is_required ? 1 : 0
      };
      
      if (editingVariable) {
        payload.id = editingVariable.id;
      }

      const response = await fetch(getApiUrl('/api/system_variables_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        toast({ 
          title: editingVariable ? 'تم تحديث المتغير بنجاح' : 'تم إنشاء المتغير بنجاح', 
          status: 'success' 
        });
        setIsVariableModalOpen(false);
        fetchSystemVariables();
        fetchVariableCategories();
      } else {
        toast({ title: 'خطأ', description: data.message, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'خطأ في الاتصال', status: 'error' });
    }
  };

  const deleteVariable = async (variableId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المتغير؟')) {
      return;
    }

    try {
      const response = await fetch(getApiUrl('/api/system_variables_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_variable', id: variableId })
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: 'تم حذف المتغير بنجاح', status: 'success' });
        fetchSystemVariables();
        fetchVariableCategories();
      } else {
        toast({ title: 'خطأ في الحذف', description: data.message, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'خطأ في الاتصال', status: 'error' });
    }
  };

  // تم استبدال useEffect القديم بـ fetchColumnsFromDatabase

  // تحديث الجداول المتاحة عند تغيير نوع الجدول
  useEffect(() => {
    const tables = getAvailableTables(selectedTableType);
    setAvailableTables(tables);
    // اختيار أول جدول كافتراضي
    if (tables.length > 0) {
      setSelectedTable(tables[0]);
      setActiveTabIndex(0);
      handleTableSelect(tables[0]);
    }
    setColumns([]);
    setHasChanges(false);
    setTableFormulas({});
  }, [selectedTableType]);

  // تحميل متغيرات النظام
  useEffect(() => {
    fetchSystemVariables();
    fetchVariableCategories();
  }, []);

  // جلب المعادلات المرتبطة بالجدول
  const fetchTableFormulas = async (tableName) => {
    try {
      const response = await fetch(`/api/dynamic_system/dynamic_system_api.php?action=get_formulas&table_name=${tableName}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      if (result.success) {
        return result.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching formulas:', error);
      return [];
    }
  };

  // تحميل الأعمدة عند اختيار جدول معين
  const handleTableSelect = async (table) => {
    setSelectedTable(table);
    setLoading(true);
    try {
      // جلب الأعمدة من الجدول المحدد والمعادلات
      const requests = [
        fetch(`/api/dynamic_system/dynamic_system_api.php?action=get_columns&table_name=${table.table_name}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetchTableFormulas(table.table_name)
      ];
      
      // جلب أعمدة من جميع الجداول للاستخدام في المعادلات فقط (ليس للعرض)
      const allTables = ['net_weekly_wage', 'weekly_wage_entitlements', 'weekly_wage_deductions'];
      allTables.forEach(tableName => {
        if (tableName !== table.table_name) {
          requests.push(
            fetch(`/api/dynamic_system/dynamic_system_api.php?action=get_columns&table_name=${tableName}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            })
          );
        }
      });
      
      const responses = await Promise.all(requests);
      const columnsResponse = responses[0];
      const formulasResponse = responses[1];
      
      const columnsResult = await columnsResponse.json();
      const tableColumns = columnsResult.success ? columnsResult.data : [];
      
      // جمع أعمدة من جميع الجداول للاستخدام في المعادلات فقط
      let allColumnsForFormulas = [...tableColumns];
      for (let i = 2; i < responses.length; i++) {
        const otherColumnsResult = await responses[i].json();
        if (otherColumnsResult.success) {
          const otherColumns = otherColumnsResult.data || [];
          allColumnsForFormulas = [...allColumnsForFormulas, ...otherColumns];
        }
      }
      
      if (columnsResult.success) {
        setColumns(tableColumns); // عرض أعمدة الجدول المحدد فقط
        setAllColumns(allColumnsForFormulas); // جميع الأعمدة للاستخدام في المعادلات
        setTableFormulas(prev => ({
          ...prev,
          [table.table_name]: formulasResponse
        }));
        console.log(`Loaded ${tableColumns.length} table columns and ${allColumnsForFormulas.length} total columns for formulas for table ${table.name}`);
      } else {
        throw new Error(columnsResult.message || 'Failed to load columns');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'خطأ في تحميل البيانات',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const isSystemVariablesTab =
    availableTables.length > 0 && activeTabIndex === availableTables.length;

  const displayManagerColumns = useMemo(() => {
    if (selectedTable?.table_name !== 'weekly_wage_entitlements') {
      return columns;
    }
    return filterMealAllowanceColumns(columns, mealAllowanceEnabled);
  }, [columns, selectedTable?.table_name, mealAllowanceEnabled]);

  const visibleColumnsCount = useMemo(
    () => displayManagerColumns.filter((col) => col && col.is_visible !== 0 && col.is_visible !== false).length,
    [displayManagerColumns]
  );

  const tabBtnProps = (index) => ({
    className: activeTabIndex === index ? 'stake-tab-active' : '',
    variant: 'ghost',
    h: '48px',
    px: '4',
    minW: 'fit-content',
    bg: activeTabIndex === index ? 'var(--stake-bg-hover)' : 'transparent',
    color: 'var(--stake-text-primary)',
    _hover: { bg: 'var(--stake-bg-hover)' },
    _active: { bg: 'var(--stake-bg-hover)' },
    borderRadius: 'xl',
    borderBottomRadius: '0',
  });

  const getTableTabIcon = (tableName) => {
    if (tableName === 'net_weekly_wage' || tableName === 'net_monthly_salary') {
      return <FiDollarSign size="16" />;
    }
    if (tableName?.includes('entitlements')) {
      return <FiTrendingUp size="16" />;
    }
    return <FiTrendingDown size="16" />;
  };

  const salaryColumnsHeaderSubtitle = useMemo(() => {
    if (isSystemVariablesTab) {
      return 'تعريف متغيرات الحساب والصيغ المستخدمة في أعمدة الرواتب';
    }
    if (selectedTable?.description) {
      return selectedTable.description;
    }
    return selectedTableType === 'monthly'
      ? 'تعريف أعمدة الرواتب الشهرية: صافي المرتب، المستحقات، والمستقطعات'
      : 'تعريف أعمدة الأجور الأسبوعية: صافي الأجر، المستحقات، والمستقطعات';
  }, [isSystemVariablesTab, selectedTable, selectedTableType]);

  const salaryColumnsHeaderTabHint = useMemo(() => {
    if (isSystemVariablesTab) {
      return `التبويب النشط: متغيرات النظام — ${systemVariables.length} متغير`;
    }
    if (selectedTable) {
      return `التبويب النشط: ${selectedTable.name} — ${displayManagerColumns.length} عمود (${visibleColumnsCount} مرئي)`;
    }
    return selectedTableType === 'monthly'
      ? 'اختر جدولاً من التبويبات لإدارة أعمدة الراتب الشهري'
      : 'اختر جدولاً من التبويبات لإدارة أعمدة الأجر الأسبوعي';
  }, [
    isSystemVariablesTab,
    selectedTable,
    systemVariables.length,
    columns.length,
    displayManagerColumns.length,
    visibleColumnsCount,
    selectedTableType,
  ]);

  const salaryColumnsHeaderStatChips = useMemo(() => {
    const chip = (key, value, label, variant = 'total') => ({ key, value, label, variant });
    const chips = [
      chip(
        'type',
        selectedTableType === 'monthly' ? 'شهري' : 'أسبوعي',
        'نوع الراتب',
        selectedTableType === 'monthly' ? 'active' : 'weekly'
      ),
    ];

    if (isSystemVariablesTab) {
      chips.push(chip('tab', 'متغيرات', 'التبويب', 'filtered'));
      chips.push(chip('vars', systemVariables.length, 'متغير', 'total'));
    } else if (selectedTable) {
      chips.push(chip('tab', selectedTable.name, 'الجدول', 'filtered'));
      chips.push(chip('cols', visibleColumnsCount, 'مرئي', 'active'));
      chips.push(chip('all', columns.length, 'إجمالي', 'total'));
    }

    if (hasChanges) {
      chips.push(chip('dirty', '!', 'غير محفوظ', 'inactive'));
    }

    return chips;
  }, [
    selectedTableType,
    isSystemVariablesTab,
    selectedTable,
    systemVariables.length,
    visibleColumnsCount,
    columns.length,
    hasChanges,
  ]);

  return (
    <>
    <Box
      className={`tp-settings-page-layout${isSearchFocused ? ' search-focused' : ''}`}
      w="100%"
      flex="1"
      minH="0"
      display="flex"
      flexDirection="column"
    >
      {!filtersCollapsed && (
      <Box className="tp-settings-page-header weekly-salary-header-shell tp-salary-columns-page-header" flexShrink={0} w="100%" maxW="100%">
        <Box
          className="weekly-salary-toolbar-card tp-page-header-toolbar"
          w="100%"
          maxW="100%"
          px={{ base: 4, md: 6 }}
          py={{ base: 4, md: 4 }}
        >
          <VStack align="stretch" spacing={{ base: 2.5, md: 3 }} w="100%">
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
                  className="weekly-salary-header-icon-wrap tp-salary-columns-header-icon-wrap"
                  aria-hidden
                >
                  <Icon as={FiZap} boxSize={{ base: 5, md: 6 }} />
                </Flex>
                <VStack align="flex-start" spacing={0.5} minW={0}>
                  <Heading
                    className="stake-heading-3 weekly-salary-page-title tp-page-header-title"
                    size="md"
                    lineHeight="short"
                    mb={0}
                  >
                    نظام أعمدة الرواتب
                  </Heading>
                  <Text className="tp-page-header-subtitle" noOfLines={2}>
                    {salaryColumnsHeaderSubtitle}
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
                {salaryColumnsHeaderStatChips.map((statChip) => (
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

            <Flex align="center" justify="space-between" gap={3} flexWrap="wrap">
              <Text className="tp-page-header-tab-hint" fontSize="sm" flex="1 1 200px" minW={0}>
                {salaryColumnsHeaderTabHint}
              </Text>
              <HStack spacing={2} flexShrink={0} align="center">
                <Text fontSize="sm" fontWeight="medium" color="var(--stake-text-secondary)" whiteSpace="nowrap">
                  نوع الجدول
                </Text>
                <Select
                  value={selectedTableType}
                  onChange={(e) => setSelectedTableType(e.target.value)}
                  className="stake-input"
                  borderRadius="lg"
                  height="40px"
                  minW="180px"
                  size="sm"
                  fontSize="sm"
                  bg="var(--stake-bg-secondary)"
                  borderColor="var(--stake-border-primary)"
                  _focus={{
                    borderColor: 'var(--stake-border-accent)',
                    boxShadow: '0 0 0 1px var(--stake-border-accent)',
                  }}
                  _hover={{
                    borderColor: 'var(--stake-border-accent)',
                  }}
                >
                  <option value="weekly">الراتب الأسبوعي</option>
                  <option value="monthly">الراتب الشهري</option>
                </Select>
              </HStack>
            </Flex>
          </VStack>
        </Box>
      </Box>
      )}

      <Box className="stake-page-tabs" flex="1" minH="0" minW="0" display="flex" flexDirection="column">
        <HStack
          className="tp-settings-tab-bar"
          spacing="0"
          flexShrink={0}
          align="stretch"
          borderBottom="2px solid"
          borderColor="var(--stake-border-primary, #3e5665)"
          mb="0"
          bg="var(--stake-bg-primary, #0f212e)"
          borderRadius="xl"
          border="1px solid"
          borderBottomRadius="0"
          borderBottomColor="var(--stake-border-primary, #3e5665)"
          overflowX="auto"
          flexWrap="nowrap"
        >
          <Flex align="center" flexShrink={0} px={2} className="tp-tab-bar-panel-toggle-wrap">
            <PagePanelToggle
              collapsed={filtersCollapsed}
              onToggle={toggleFiltersCollapsed}
              variant="table"
            />
          </Flex>
          {availableTables.map((table, index) => (
            <Button
              key={table.id}
              leftIcon={getTableTabIcon(table.table_name)}
              {...tabBtnProps(index)}
              onClick={() => {
                setActiveTabIndex(index);
                handleTableSelect(table);
              }}
            >
              <HStack spacing="2">
                <Text>{table.name}</Text>
                {activeTabIndex === index && displayManagerColumns.length > 0 && (
                  <Badge colorScheme="blue" borderRadius="full" px="2" py="1" fontSize="xs">
                    {displayManagerColumns.length}
                  </Badge>
                )}
              </HStack>
            </Button>
          ))}
          <Button
            leftIcon={<FiDatabase size="16" />}
            {...tabBtnProps(availableTables.length)}
            onClick={() => setActiveTabIndex(availableTables.length)}
          >
            <HStack spacing="2">
              <Text>متغيرات النظام</Text>
              {isSystemVariablesTab && systemVariables.length > 0 && (
                <Badge colorScheme="purple" borderRadius="full" px="2" py="1" fontSize="xs">
                  {systemVariables.length}
                </Badge>
              )}
            </HStack>
          </Button>
        </HStack>

        <Box
          className="tp-settings-tab-panel"
          flex="1"
          minH="0"
          minW="0"
          display="flex"
          flexDirection="column"
          bg="var(--stake-bg-primary, #0f212e)"
          borderRadius="xl"
          border="1px solid"
          borderColor="var(--stake-border-primary, #3e5665)"
          borderTopRadius="0"
          borderBottomLeftRadius="2xl"
          borderBottomRightRadius="2xl"
          overflow="hidden"
        >
          <Box
            className="tp-settings-tab-panel-scroll"
            flex="1"
            minH="0"
            minW="0"
            display="flex"
            flexDirection="column"
            p="0"
          >
          {availableTables.map((table, index) => (
            activeTabIndex === index && selectedTable && (
              <Box key={table.id} p="0" flex="1" minH="0" display="flex" flexDirection="column">
                <HStack
                  justify="space-between"
                  mb="4"
                  px={{ base: 3, md: 4, lg: 6 }}
                  pt={{ base: 3, md: 4 }}
                  pb="2"
                  flexShrink={0}
                  flexWrap="wrap"
                  gap={2}
                >
                  <Heading size="md" className="stake-heading-3">
                    أعمدة {selectedTable.name}
                  </Heading>
                  <Button
                    onClick={() => {
                      fetchImportAvailableTables();
                      setIsImportColumnModalOpen(true);
                    }}
                    leftIcon={<FiDownload />}
                    className="stake-btn-secondary"
                    size="sm"
                    h="40px"
                    fontWeight="600"
                    borderRadius="lg"
                    borderColor="var(--stake-border-primary)"
                    _hover={{ bg: 'var(--stake-bg-hover)' }}
                  >
                    استيراد عمود
                  </Button>
                </HStack>

                <SimpleColumnManager
                  columns={displayManagerColumns}
                  allColumns={allColumns}
                  onUpdateColumn={updateColumn}
                  onDeleteColumn={deleteColumn}
                  onMoveColumn={moveColumn}
                  onBadgeColorChange={updateBadgeColor}
                  selectedTable={selectedTable}
                />
              </Box>
            )
          ))}

          {isSystemVariablesTab && (
            <Box p="0" flex="1" minH="0" display="flex" flexDirection="column">
              <VStack spacing="6" align="stretch" px={{ base: 3, md: 4, lg: 6 }} pt={{ base: 3, md: 4 }} pb="2">
                <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
                  <Heading size="md" className="stake-heading-3">
                    متغيرات النظام
                  </Heading>
                  <HStack spacing="3">
                    <Select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="stake-input"
                      size="sm"
                      w="200px"
                      h="40px"
                      borderRadius="lg"
                      bg="var(--stake-bg-secondary)"
                      borderColor="var(--stake-border-primary)"
                      color="var(--stake-text-primary)"
                      _hover={{ borderColor: 'var(--stake-border-accent)' }}
                      _focus={{
                        borderColor: 'var(--stake-border-accent)',
                        boxShadow: '0 0 0 1px var(--stake-border-accent)',
                      }}
                    >
                      <option value="all">جميع الفئات</option>
                      {variableCategories.filter(cat => cat !== 'all').map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </Select>
                    <Button
                      onClick={saveAllVariableChanges}
                      className="stake-btn"
                      size="sm"
                      h="40px"
                      fontWeight="600"
                      leftIcon={<FiSave />}
                      isDisabled={Object.keys(variableChanges).length === 0}
                    >
                      حفظ التغييرات
                    </Button>
                    <Button
                      onClick={openAddVariableModal}
                      className="stake-btn-secondary"
                      size="sm"
                      h="40px"
                      fontWeight="600"
                      borderRadius="lg"
                      borderColor="var(--stake-border-primary)"
                      _hover={{ bg: 'var(--stake-bg-hover)' }}
                      leftIcon={<FiPlus />}
                    >
                      إضافة متغير جديد
                    </Button>
                  </HStack>
                </HStack>

                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing="4" className="salary-columns-vars-grid" pb={4}>
                  {systemVariables
                    .filter(variable => selectedCategory === 'all' || variable.category === selectedCategory)
                    .map((variable) => (
                    <Box
                      key={variable.id}
                      className="salary-columns-var-card stake-card"
                      p="4"
                      borderRadius="xl"
                      transition="border-color 0.15s ease, box-shadow 0.15s ease"
                      _hover={{
                        borderColor: 'var(--stake-border-accent)',
                        boxShadow: 'var(--stake-content-shadow-soft)',
                      }}
                    >
                      <VStack spacing="3" align="stretch">
                        <HStack justify="space-between" align="flex-start" gap={2}>
                          <VStack align="flex-start" spacing={0.5} minW={0} flex="1">
                            <Text fontWeight="semibold" color="var(--stake-text-primary)" fontSize="sm" noOfLines={2}>
                              {variable.variable_name_ar}
                            </Text>
                            <Text fontSize="xs" color="var(--stake-text-secondary)" dir="ltr" textAlign="right" noOfLines={1}>
                              {variable.variable_key}
                            </Text>
                          </VStack>
                          <Badge
                            className={variable.is_editable ? 'salary-var-badge--editable' : 'salary-var-badge--locked'}
                            fontSize="xs"
                            px={2}
                            py={0.5}
                            borderRadius="md"
                            flexShrink={0}
                          >
                            {variable.is_editable ? 'قابل للتعديل' : 'مقفول'}
                          </Badge>
                        </HStack>

                        {variable.description_ar && (
                          <Text fontSize="xs" color="var(--stake-text-secondary)" noOfLines={2}>
                            {variable.description_ar}
                          </Text>
                        )}

                        <Box>
                          <Text fontSize="xs" color="var(--stake-text-secondary)" mb="1.5" fontWeight="medium">
                            القيمة الحالية
                          </Text>
                          {variable.is_editable ? (
                            <Input
                              type={variable.variable_type === 'number' ? 'number' : 'text'}
                              value={variableChanges[variable.id] !== undefined ? variableChanges[variable.id] : variable.variable_value}
                              onChange={(e) => setVariableChanges({
                                ...variableChanges,
                                [variable.id]: e.target.value
                              })}
                              className="stake-input"
                              size="sm"
                              bg="var(--stake-bg-secondary)"
                              borderColor="var(--stake-border-primary)"
                              color="var(--stake-text-primary)"
                              _hover={{ borderColor: 'var(--stake-border-accent)' }}
                              _focus={{
                                borderColor: 'var(--stake-border-accent)',
                                boxShadow: '0 0 0 1px var(--stake-border-accent)',
                              }}
                            />
                          ) : (
                            <Box className="salary-var-value-readonly" px={3} py={2} borderRadius="lg" fontSize="sm" fontWeight="medium">
                              {variable.variable_value}
                            </Box>
                          )}
                        </Box>

                        <HStack justify="space-between" align="center">
                          <Box className="salary-col-type-chip salary-col-type-chip--text" fontSize="xs">
                            {variable.variable_type}
                          </Box>
                          {variable.is_required ? (
                            <Badge className="salary-var-badge--required" fontSize="xs" px={2} py={0.5} borderRadius="md">
                              مطلوب
                            </Badge>
                          ) : null}
                        </HStack>

                        <HStack spacing="2" justify="flex-end" pt="1">
                          <IconButton
                            icon={<FiEdit />}
                            size="sm"
                            variant="ghost"
                            color="var(--stake-text-secondary)"
                            _hover={{ bg: 'var(--stake-bg-hover)', color: 'var(--stake-primary)' }}
                            onClick={() => openEditVariableModal(variable)}
                            aria-label="تعديل"
                          />
                          <IconButton
                            icon={<FiTrash2 />}
                            size="sm"
                            variant="ghost"
                            color="var(--stake-text-secondary)"
                            _hover={{ bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171' }}
                            onClick={() => deleteVariable(variable.id)}
                            aria-label="حذف"
                            isDisabled={variable.is_required === 1}
                          />
                        </HStack>
                      </VStack>
                    </Box>
                  ))}
                </SimpleGrid>
              </VStack>
            </Box>
          )}

          {hasChanges && (
            <Box
              mt={4}
              mx={{ base: 3, md: 4, lg: 6 }}
              mb={4}
              p={4}
              bg="var(--stake-bg-card, #1a2c38)"
              borderRadius="xl"
              border="1px solid"
              borderColor="var(--stake-border-primary, #2f4553)"
              flexShrink={0}
            >
              <HStack spacing={4} justify="center" flexWrap="wrap">
                <Button
                  onClick={saveChanges}
                  leftIcon={<FiSave />}
                  className="stake-btn"
                  size="md"
                  isLoading={saving}
                  loadingText="جاري الحفظ..."
                  h="40px"
                  fontWeight="600"
                >
                  حفظ التغييرات
                </Button>
                <Button
                  onClick={() => {
                    setHasChanges(false);
                    loadColumns();
                  }}
                  leftIcon={<FiX />}
                  className="stake-btn-secondary"
                  size="md"
                  h="40px"
                  fontWeight="600"
                  borderRadius="lg"
                  borderColor="var(--stake-border-primary)"
                  _hover={{ bg: 'var(--stake-bg-hover)' }}
                >
                  إلغاء التغييرات
                </Button>
              </HStack>
            </Box>
          )}
          </Box>
        </Box>
      </Box>
    </Box>

        {/* مودال المعاينة */}
        <ChangesPreviewModal
          isOpen={isPreviewOpen}
          onClose={onPreviewClose}
          previewData={previewData}
          columns={columns}
        />

        {/* مودال إضافة/تعديل متغير */}
        <Modal isOpen={isVariableModalOpen} onClose={() => setIsVariableModalOpen(false)} size="4xl" isCentered>
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
              <HStack justify="space-between" align="center" w="full">
                <Text fontSize="lg" fontWeight="bold">
                  {editingVariable ? 'تعديل متغير' : 'إضافة متغير جديد'}
                </Text>
                <Box flex="1"></Box>
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
              <VStack spacing="6" align="stretch">
                {/* المعلومات الأساسية */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    المعلومات الأساسية
                  </Text>
                  <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap="4">
                    <GridItem>
                      <FormControl>
                        <FormLabel color="var(--stake-text-secondary)" fontSize="sm" fontWeight="bold" mb="2">
                          مفتاح المتغير (Key)
                        </FormLabel>
                        <Input
                          value={variableFormData.variable_key}
                          onChange={(e) => setVariableFormData({...variableFormData, variable_key: e.target.value})}
                          bg="var(--stake-bg-secondary)"
                          borderColor="var(--stake-border-primary)"
                          color="var(--stake-text-primary)"
                          _placeholder={{ color: 'gray.500' }}
                          _focus={{ borderColor: '#4a90e2', bg: 'var(--stake-bg-secondary)', color: 'var(--stake-text-primary)' }}
                          _hover={{ borderColor: '#3a7bc8' }}
                          isDisabled={!!editingVariable}
                        />
                        <FormHelperText className="stake-text-secondary" fontSize="xs" mt="1">
                          يجب أن يكون فريداً (لا يمكن تعديله بعد الإنشاء)
                        </FormHelperText>
                      </FormControl>
                    </GridItem>

                    <GridItem>
                      <FormControl isRequired>
                        <FormLabel color="var(--stake-text-secondary)" fontSize="sm" fontWeight="bold" mb="2">
                          الاسم بالعربية
                        </FormLabel>
                        <Input
                          value={variableFormData.variable_name_ar}
                          onChange={(e) => setVariableFormData({...variableFormData, variable_name_ar: e.target.value})}
                          bg="var(--stake-bg-secondary)"
                          borderColor="var(--stake-border-primary)"
                          color="var(--stake-text-primary)"
                          _placeholder={{ color: 'gray.500' }}
                          _focus={{ borderColor: '#4a90e2', bg: 'var(--stake-bg-secondary)', color: 'var(--stake-text-primary)' }}
                          _hover={{ borderColor: '#3a7bc8' }}
                        />
                      </FormControl>
                    </GridItem>

                    <GridItem>
                      <FormControl isRequired>
                        <FormLabel color="var(--stake-text-secondary)" fontSize="sm" fontWeight="bold" mb="2">
                          الاسم بالإنجليزية
                        </FormLabel>
                        <Input
                          value={variableFormData.variable_name_en}
                          onChange={(e) => setVariableFormData({...variableFormData, variable_name_en: e.target.value})}
                          bg="var(--stake-bg-secondary)"
                          borderColor="var(--stake-border-primary)"
                          color="var(--stake-text-primary)"
                          _placeholder={{ color: 'gray.500' }}
                          _focus={{ borderColor: '#4a90e2', bg: 'var(--stake-bg-secondary)', color: 'var(--stake-text-primary)' }}
                          _hover={{ borderColor: '#3a7bc8' }}
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>
                </Box>

                {/* القيمة والإعدادات */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    القيمة والإعدادات
                  </Text>
                  <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
                    <GridItem>
                      <FormControl>
                        <FormLabel color="var(--stake-text-secondary)" fontSize="sm" fontWeight="bold" mb="2">
                          القيمة
                        </FormLabel>
                        {variableFormData.variable_type === 'number' ? (
                          <NumberInput
                            value={variableFormData.variable_value}
                            onChange={(value) => setVariableFormData({...variableFormData, variable_value: value})}
                          >
                            <NumberInputField 
                              bg="var(--stake-bg-secondary)" 
                              borderColor="var(--stake-border-primary)" 
                              color="var(--stake-text-primary)"
                              _placeholder={{ color: 'gray.500' }}
                              _focus={{ borderColor: '#4a90e2', bg: 'var(--stake-bg-secondary)', color: 'var(--stake-text-primary)' }}
                              _hover={{ borderColor: '#3a7bc8' }}
                            />
                            <NumberInputStepper>
                              <NumberIncrementStepper color="var(--stake-text-primary)" />
                              <NumberDecrementStepper color="var(--stake-text-primary)" />
                            </NumberInputStepper>
                          </NumberInput>
                        ) : (
                          <Input
                            value={variableFormData.variable_value}
                            onChange={(e) => setVariableFormData({...variableFormData, variable_value: e.target.value})}
                            bg="var(--stake-bg-secondary)"
                            borderColor="var(--stake-border-primary)"
                            color="var(--stake-text-primary)"
                            _placeholder={{ color: 'gray.500' }}
                            _focus={{ borderColor: '#4a90e2', bg: 'var(--stake-bg-secondary)', color: 'var(--stake-text-primary)' }}
                            _hover={{ borderColor: '#3a7bc8' }}
                          />
                        )}
                      </FormControl>
                    </GridItem>

                    <GridItem>
                      <FormControl>
                        <FormLabel color="var(--stake-text-secondary)" fontSize="sm" fontWeight="bold" mb="2">
                          النوع
                        </FormLabel>
                        <Select
                          value={variableFormData.variable_type}
                          onChange={(e) => setVariableFormData({...variableFormData, variable_type: e.target.value})}
                          bg="var(--stake-bg-secondary)"
                          borderColor="var(--stake-border-primary)"
                          color="var(--stake-text-primary)"
                          _focus={{ borderColor: '#4a90e2', bg: 'var(--stake-bg-secondary)', color: 'var(--stake-text-primary)' }}
                          _hover={{ borderColor: '#3a7bc8' }}
                          sx={{
                            option: {
                              bg: 'var(--stake-bg-secondary)',
                              color: 'var(--stake-text-primary)'
                            }
                          }}
                        >
                          <option value="text" style={{ backgroundColor: 'var(--stake-bg-secondary)', color: 'var(--stake-text-primary)' }}>نص</option>
                          <option value="number" style={{ backgroundColor: 'var(--stake-bg-secondary)', color: 'var(--stake-text-primary)' }}>رقم</option>
                          <option value="time" style={{ backgroundColor: 'var(--stake-bg-secondary)', color: 'var(--stake-text-primary)' }}>وقت</option>
                          <option value="date" style={{ backgroundColor: 'var(--stake-bg-secondary)', color: 'var(--stake-text-primary)' }}>تاريخ</option>
                        </Select>
                      </FormControl>
                    </GridItem>
                  </Grid>
                </Box>

                {/* الإعدادات الإضافية */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    الإعدادات الإضافية
                  </Text>
                  <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap="4">
                    <GridItem>
                      <FormControl>
                        <FormLabel color="var(--stake-text-secondary)" fontSize="sm" fontWeight="bold" mb="2">
                          الفئة
                        </FormLabel>
                        <Input
                          value={variableFormData.category}
                          onChange={(e) => setVariableFormData({...variableFormData, category: e.target.value})}
                          bg="var(--stake-bg-secondary)"
                          borderColor="var(--stake-border-primary)"
                          color="var(--stake-text-primary)"
                          placeholder="system"
                          _placeholder={{ color: 'gray.500' }}
                          _focus={{ borderColor: '#4a90e2', bg: 'var(--stake-bg-secondary)', color: 'var(--stake-text-primary)' }}
                          _hover={{ borderColor: '#3a7bc8' }}
                        />
                      </FormControl>
                    </GridItem>

                    <GridItem>
                      <FormControl>
                        <FormLabel color="var(--stake-text-secondary)" fontSize="sm" fontWeight="bold" mb="2">
                          قابل للتعديل
                        </FormLabel>
                        <HStack>
                          <Switch
                            isChecked={variableFormData.is_editable}
                            onChange={(e) => setVariableFormData({...variableFormData, is_editable: e.target.checked})}
                            colorScheme="green"
                            size="lg"
                          />
                          <Text color="var(--stake-text-primary)" fontSize="sm">
                            {variableFormData.is_editable ? 'نعم' : 'لا'}
                          </Text>
                        </HStack>
                      </FormControl>
                    </GridItem>

                    <GridItem>
                      <FormControl>
                        <FormLabel color="var(--stake-text-secondary)" fontSize="sm" fontWeight="bold" mb="2">
                          مطلوب
                        </FormLabel>
                        <HStack>
                          <Switch
                            isChecked={variableFormData.is_required}
                            onChange={(e) => setVariableFormData({...variableFormData, is_required: e.target.checked})}
                            colorScheme="red"
                            size="lg"
                          />
                          <Text color="var(--stake-text-primary)" fontSize="sm">
                            {variableFormData.is_required ? 'نعم' : 'لا'}
                          </Text>
                        </HStack>
                      </FormControl>
                    </GridItem>
                  </Grid>
                </Box>

                {/* الوصف */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    الوصف
                  </Text>
                  <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
                    <GridItem>
                      <FormControl>
                        <FormLabel color="var(--stake-text-secondary)" fontSize="sm" fontWeight="bold" mb="2">
                          الوصف بالعربية
                        </FormLabel>
                        <Textarea
                          value={variableFormData.description_ar}
                          onChange={(e) => setVariableFormData({...variableFormData, description_ar: e.target.value})}
                          bg="var(--stake-bg-secondary)"
                          borderColor="var(--stake-border-primary)"
                          color="var(--stake-text-primary)"
                          _placeholder={{ color: 'gray.500' }}
                          _focus={{ borderColor: '#4a90e2', bg: 'var(--stake-bg-secondary)', color: 'var(--stake-text-primary)' }}
                          _hover={{ borderColor: '#3a7bc8' }}
                          rows={3}
                        />
                      </FormControl>
                    </GridItem>

                    <GridItem>
                      <FormControl>
                        <FormLabel color="var(--stake-text-secondary)" fontSize="sm" fontWeight="bold" mb="2">
                          الوصف بالإنجليزية
                        </FormLabel>
                        <Textarea
                          value={variableFormData.description_en}
                          onChange={(e) => setVariableFormData({...variableFormData, description_en: e.target.value})}
                          bg="var(--stake-bg-secondary)"
                          borderColor="var(--stake-border-primary)"
                          color="var(--stake-text-primary)"
                          _placeholder={{ color: 'gray.500' }}
                          _focus={{ borderColor: '#4a90e2', bg: 'var(--stake-bg-secondary)', color: 'var(--stake-text-primary)' }}
                          _hover={{ borderColor: '#3a7bc8' }}
                          rows={3}
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>
                </Box>
              </VStack>
            </ModalBody>
            <ModalFooter bg="var(--stake-bg-secondary)" borderRadius="0 0 24px 24px" p="4">
              <Button
                variant="ghost"
                color="var(--stake-text-primary)"
                mr={3}
                onClick={() => setIsVariableModalOpen(false)}
                _hover={{ bg: "var(--stake-bg-primary)" }}
              >
                إلغاء
              </Button>
              <Button
                bg="var(--stake-button-primary)"
                color="white"
                _hover={{ bg: "var(--stake-button-hover)" }}
                onClick={saveVariable}
                px={8}
              >
                {editingVariable ? 'تحديث' : 'إضافة'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* مودال اختيار لون البادج */}
        {isBadgeColorModalOpen && editingColumn && (
          <Box
            position="fixed"
            top="0"
            left="0"
            right="0"
            bottom="0"
            bg="rgba(0, 0, 0, 0.7)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            zIndex="1000"
          >
            <Box
              bg="var(--stake-bg-card, #1a2c38)"
              p="6"
              borderRadius="xl"
              border="1px solid"
              borderColor="var(--stake-border-primary, #2f4553)"
              maxW="500px"
              w="90%"
            >
              <VStack spacing="6" align="stretch">
                <HStack justify="space-between" align="center">
                  <Text fontSize="lg" fontWeight="bold" color="white">
                    تخصيص لون البادج
                  </Text>
                  <Button
                    size="sm"
                    variant="ghost"
                    color="white"
                    onClick={() => setIsBadgeColorModalOpen(false)}
                  >
                    <FiX />
                  </Button>
                </HStack>

                <Box>
                  <Text color="white" mb="3">العمود: {editingColumn.display_name_ar || editingColumn.name}</Text>
                  
                  <VStack spacing="4" align="stretch">
                    {/* لون البادج */}
                    <Box>
                      <Text color="white" mb="2">لون البادج:</Text>
                      <HStack spacing="2" wrap="wrap">
                        {['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'orange', 'teal', 'cyan', 'gray'].map(color => (
                          <Button
                            key={color}
                            size="sm"
                            colorScheme={color}
                            variant={editingColumn.badge_color === color ? 'solid' : 'outline'}
                            onClick={() => setEditingColumn({...editingColumn, badge_color: color})}
                          >
                            {color}
                          </Button>
                        ))}
                      </HStack>
                    </Box>

                    {/* نوع البادج */}
                    <Box>
                      <Text color="white" mb="2">نوع البادج:</Text>
                      <HStack spacing="2">
                        {['solid', 'outline', 'subtle'].map(variant => (
                          <Button
                            key={variant}
                            size="sm"
                            colorScheme={editingColumn.badge_variant === variant ? 'blue' : 'gray'}
                            variant={editingColumn.badge_variant === variant ? 'solid' : 'outline'}
                            onClick={() => setEditingColumn({...editingColumn, badge_variant: variant})}
                          >
                            {variant}
                          </Button>
                        ))}
                      </HStack>
                    </Box>

                    {/* عملة */}
                    <Box>
                      <HStack spacing="2">
                        <input
                          type="checkbox"
                          id="is_currency"
                          checked={editingColumn.is_currency}
                          onChange={(e) => setEditingColumn({...editingColumn, is_currency: e.target.checked})}
                        />
                        <Text color="white" fontSize="sm">عرض كعملة</Text>
                      </HStack>
                    </Box>

                    {/* معاينة */}
                    <Box p="3" bg="#2f4553" borderRadius="md">
                      <Text color="white" mb="2">معاينة:</Text>
                      <Badge
                        colorScheme={editingColumn.badge_color || 'blue'}
                        variant={editingColumn.badge_variant || 'solid'}
                        fontSize="sm"
                        px="2"
                        py="1"
                      >
                        {editingColumn.display_name_ar || editingColumn.name}
                      </Badge>
                    </Box>
                  </VStack>
                </Box>

                <HStack spacing="3" justify="flex-end">
                  <Button
                    variant="ghost"
                    color="white"
                    onClick={() => setIsBadgeColorModalOpen(false)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    bg="#2f4553"
                    color="white"
                    border="1px solid"
                    borderColor="var(--stake-border-primary, #1a2c38)"
                    _hover={{ bg: "#111827" }}
                    onClick={() => {
                      updateBadgeColor(
                        editingColumn.id,
                        editingColumn.badge_color,
                        editingColumn.badge_variant,
                        editingColumn.is_currency
                      );
                      setIsBadgeColorModalOpen(false);
                    }}
                  >
                    حفظ
                  </Button>
                </HStack>
              </VStack>
            </Box>
          </Box>
        )}

      {/* Modal استيراد عمود */}
      <Modal isOpen={isImportColumnModalOpen} onClose={() => {
        setIsImportColumnModalOpen(false);
        setSelectedImportTable('');
        setImportableColumns([]);
      }} size="2xl" isCentered>
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
                _hover={{ bg: "rgba(255, 255, 255, 0.2)" }}
              />
            </HStack>
          </ModalHeader>
          <ModalBody p="6" maxH="70vh" overflowY="auto">
            <VStack spacing="6" align="stretch">
              {/* اختيار الجدول المصدر */}
              <Box>
                <FormControl>
                  <FormLabel color="white" mb="2">اختر الجدول المصدر:</FormLabel>
                  <Select
                    value={selectedImportTable}
                    onChange={(e) => {
                      const tableName = e.target.value;
                      setSelectedImportTable(tableName);
                      if (tableName) {
                        fetchImportableColumns(tableName);
                      } else {
                        setImportableColumns([]);
                      }
                    }}
                    bg="var(--stake-bg-secondary, #111827)"
                    borderColor="var(--stake-border-primary, #2f4553)"
                    color="white"
                    placeholder="اختر الجدول..."
                    _hover={{ bg: "#111827" }}
                    _focus={{ bg: "#111827", borderColor: "#3b82f6" }}
                    sx={{
                      option: {
                        bg: "#111827",
                        color: "white"
                      }
                    }}
                  >
                    {importAvailableTables.map((table) => (
                      <option key={table.id} value={table.table_name}>
                        {table.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* نوع الاستيراد */}
              <Box>
                <HStack spacing="3" align="center">
                  <Icon as={FiLink} color="purple.300" boxSize="5" />
                  <VStack align="start" spacing="1">
                    <Text color="purple.200" fontWeight="bold" fontSize="md">
                      نوع الاستيراد
                    </Text>
                    <HStack spacing="4">
                      <Button
                        size="sm"
                        colorScheme={importMode === 'reference' ? 'purple' : 'gray'}
                        variant={importMode === 'reference' ? 'solid' : 'outline'}
                        onClick={() => setImportMode('reference')}
                      >
                        مرجع
                      </Button>
                      <Button
                        size="sm"
                        colorScheme={importMode === 'copy' ? 'purple' : 'gray'}
                        variant={importMode === 'copy' ? 'solid' : 'outline'}
                        onClick={() => setImportMode('copy')}
                      >
                        نسخة
                      </Button>
                    </HStack>
                    <Text className="stake-text-secondary" fontSize="sm">
                      {importMode === 'reference' 
                        ? 'سيتم إنشاء مرجع للعمود الأصلي، أي تغيير في المصدر سيؤثر على الهدف تلقائياً'
                        : 'سيتم نسخ العمود كعمود جديد مستقل'}
                    </Text>
                  </VStack>
                </HStack>
              </Box>

              {/* قائمة الأعمدة المتاحة */}
              {selectedImportTable && (
                <Box>
                  <Text color="white" fontWeight="bold" mb="3">
                    الأعمدة المتاحة من {importAvailableTables.find(t => t.table_name === selectedImportTable)?.name}:
                  </Text>
                  {importableColumns.length === 0 ? (
                    <Text color="gray.400" textAlign="center" py="8">
                      {loading ? 'جاري التحميل...' : 'لا توجد أعمدة متاحة'}
                    </Text>
                  ) : (
                    <SimpleGrid columns={2} spacing="3" maxH="300px" overflowY="auto">
                      {importableColumns.map((column) => {
                        const key = column.column_key || column.column_name || column.name;
                        const name = column.display_name_ar || column.column_name_ar || column.name || key;
                        const isAlreadyImported = columns.some(col => {
                          const colKey = col.column_key || col.column_name || col.name;
                          return colKey === key;
                        });
                        
                        return (
                          <Card
                            key={column.id || key}
                            bg={isAlreadyImported ? "rgba(255, 0, 0, 0.1)" : "var(--stake-bg-secondary, #111827)"}
                            borderColor={isAlreadyImported ? "red.500" : "var(--stake-border-primary, #2f4553)"}
                            borderWidth="1px"
                            cursor={isAlreadyImported ? "not-allowed" : "pointer"}
                            _hover={isAlreadyImported ? {} : { bg: "#1a2c38", borderColor: "#3b82f6" }}
                            onClick={() => {
                              if (!isAlreadyImported) {
                                importColumn({ ...column, table_name: selectedImportTable }, importMode);
                              }
                            }}
                            opacity={isAlreadyImported ? 0.6 : 1}
                          >
                            <CardBody p="3">
                              <VStack align="start" spacing="1">
                                <HStack justify="space-between" w="100%">
                                  <Text color="white" fontWeight="medium" fontSize="sm">
                                    {name}
                                  </Text>
                                  {isAlreadyImported && (
                                    <Badge colorScheme="red" fontSize="xs">
                                      موجود
                                    </Badge>
                                  )}
                                </HStack>
                                <Text color="gray.400" fontSize="xs">
                                  {key}
                                </Text>
                                {column.type && (
                                  <Badge colorScheme="blue" fontSize="xs">
                                    {column.type === 'reference' ? 'مرجع' : column.type}
                                  </Badge>
                                )}
                              </VStack>
                            </CardBody>
                          </Card>
                        );
                      })}
                    </SimpleGrid>
                  )}
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter bg="var(--stake-bg-primary, #0f212e)" borderTop="1px solid" borderColor="var(--stake-border-primary, #2f4553)">
            <Button
              variant="ghost"
              color="white"
              onClick={() => {
                setIsImportColumnModalOpen(false);
                setSelectedImportTable('');
                setImportableColumns([]);
              }}
            >
              إلغاء
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default SimplifiedDynamicManager;

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Card,
  CardBody,
  CardHeader,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  Textarea,
  Select,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Text,
  Heading,
  Badge,
  Tooltip,
  IconButton,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Grid,
  GridItem,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  useToast,
  useDisclosure,
  Icon,
  Switch,
  FormHelperText
} from '@chakra-ui/react';
import {
  FiSave,
  FiX,
  FiSearch,
  FiEdit,
  FiPlus,
  FiDownload,
  FiRefreshCw,
  FiDatabase,
  FiCode,
  FiTool,
  FiSettings,
  FiCalendar,
  FiTrash2,
  FiLink,
  FiEye,
  FiMove,
  FiInfo
} from 'react-icons/fi';
import ChakraEnglishKeyTooltip from '../components/ChakraEnglishKeyTooltip';
import { DYNAMIC_SYSTEM_API, makeDynamicSystemApiCall, createApiOptions } from '../config/dynamicSystemApi';
import '../styles/formula-direction.css';

const PremiumDynamicSystemManager = () => {
  // Refs for scrolling
  const formulasTableRef = useRef(null);
  
  // تم إزالة المعادلات والمتغيرات الافتراضية - النظام يقرأ من قاعدة البيانات ديناميكياً

  // تم إزالة المتغيرات الافتراضية - النظام يقرأ من قاعدة البيانات ديناميكياً

  // States - حفظ جميع الـ states من النظام القديم
  const [tables, setTables] = useState([]);
  const [columns, setColumns] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [variables, setVariables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tables');
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [activeFormulaTab, setActiveFormulaTab] = useState('1');

  // Update activeTab when activeTabIndex changes
  const handleTabChange = (index) => {
    setActiveTabIndex(index);
    const tabs = ['tables', 'columns', 'formulas', 'variables', 'mappings'];
    setActiveTab(tabs[index]);
  };
  const [weeklyFormulas, setWeeklyFormulas] = useState([]);
  const [monthlyFormulas, setMonthlyFormulas] = useState([]);
  const [weeklyVariables, setWeeklyVariables] = useState([]);
  const [monthlyVariables, setMonthlyVariables] = useState([]);
  const [formulaPreview, setFormulaPreview] = useState(null);
  const [variableSearchTerm, setVariableSearchTerm] = useState('');
  const [fieldDirections, setFieldDirections] = useState({
    formula_key: 'ltr',
    formula_expression: 'ltr',
    variable_key: 'ltr',
    variable_value: 'ltr'
  });
  
  // Modal states - تحويل Ant Design modals إلى Chakra UI
  const { isOpen: isTableModalOpen, onOpen: onTableModalOpen, onClose: onTableModalClose } = useDisclosure();
  const { isOpen: isColumnModalOpen, onOpen: onColumnModalOpen, onClose: onColumnModalClose } = useDisclosure();
  const { isOpen: isFormulaModalOpen, onOpen: onFormulaModalOpen, onClose: onFormulaModalClose } = useDisclosure();
  const [columnForm, setColumnForm] = useState({
    table_id: '',
    column_name: '',
    display_name_ar: '',
    display_name_en: '',
    data_type: 'text',
    edit_type: 'input',
    default_value: '',
    is_required: false,
    is_active: true,
    description_ar: ''
  });
  const { isOpen: isVariableModalOpen, onOpen: onVariableModalOpen, onClose: onVariableModalClose } = useDisclosure();
  const { isOpen: isTestModalOpen, onOpen: onTestModalOpen, onClose: onTestModalClose } = useDisclosure();
  const { isOpen: isMoveFormulaModalOpen, onOpen: onMoveFormulaModalOpen, onClose: onMoveFormulaModalClose } = useDisclosure();
  const { isOpen: isAddExistingFormulaModalOpen, onOpen: onAddExistingFormulaModalOpen, onClose: onAddExistingFormulaModalClose } = useDisclosure();
  const { isOpen: isLinkFormulaModalOpen, onOpen: onLinkFormulaModalOpen, onClose: onLinkFormulaModalClose } = useDisclosure();
  
  // Selected items
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedFormula, setSelectedFormula] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [selectedVariable, setSelectedVariable] = useState(null);
  const [selectedColumnMapping, setSelectedColumnMapping] = useState(null);
  const [quickLinkModal, setQuickLinkModal] = useState({ isOpen: false, column: null, currentMapping: null });
  const [selectedFormulaId, setSelectedFormulaId] = useState('');
  const [formulaSearchQuery, setFormulaSearchQuery] = useState('');
  const { isOpen: isFormulaListOpen, onOpen: onFormulaListOpen, onClose: onFormulaListClose } = useDisclosure();
  const [advancedSearchModal, setAdvancedSearchModal] = useState({ isOpen: false, selectedFormula: null });
  
  // إغلاق قائمة المعادلات عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isFormulaListOpen && !event.target.closest('[data-formula-search]')) {
        onFormulaListClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFormulaListOpen, onFormulaListClose]);
  const [columnMappings, setColumnMappings] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [formulaFilter, setFormulaFilter] = useState('all'); // 'all', 'weekly', 'monthly', 'general'
  const [variableFilter, setVariableFilter] = useState('all'); // 'all', 'weekly', 'monthly', 'general'
  const [selectedTableForFormula, setSelectedTableForFormula] = useState(null);
  const [selectedColumnForMapping, setSelectedColumnForMapping] = useState(null);
  const [formulaSearchTerm, setFormulaSearchTerm] = useState('');
  const [testResult, setTestResult] = useState(null);
  // Modal form states
  const [formulaForm, setFormulaForm] = useState({
    formula_key: '',
    formula_name_ar: '',
    formula_name_en: '',
    formula_expression: '',
    description_ar: ''
  });
  const [variableForm, setVariableForm] = useState({
    variable_key: '',
    variable_name_ar: '',
    variable_name_en: '',
    variable_value: '',
    description_ar: ''
  });
  const [linkForm, setLinkForm] = useState({
    column_id: '',
    formula_id: '',
    is_auto_calculate: true
  });
  
  const toast = useToast();
  
  // Formula preview function
  const previewFormula = async (formula) => {
    try {
      const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `action=preview_formula&formula=${encodeURIComponent(formula)}`
      });
      
      const data = await response.json();
      if (data.success) {
        setFormulaPreview(data.preview);
      }
    } catch (error) {
      console.error('Error previewing formula:', error);
    }
  };

  // Formula syntax highlighter
  const highlightFormula = (formula, variables = {}) => {
    let result = formula;
    
    // Replace variables with colored spans
    Object.values(variables).forEach(variable => {
      const regex = new RegExp(`\\b${variable.variable}\\b`, 'g');
      const color = variable.color === 'green' ? '#52c41a' : '#ff4d4f';
      const backgroundColor = variable.color === 'green' ? '#f6ffed' : '#fff2f0';
      const borderColor = variable.color === 'green' ? '#b7eb8f' : '#ffccc7';
      
      result = result.replace(regex, 
        `<span style="
          color: ${color}; 
          background-color: ${backgroundColor}; 
          border: 1px solid ${borderColor}; 
          padding: 2px 4px; 
          border-radius: 3px; 
          font-weight: bold;
          margin: 0 1px;
        " title="${variable.exists ? 'متغير موجود' : 'متغير مفقود'}">${variable.variable}</span>`
      );
    });
    
    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };
  
  // Load data - نفس الوظائف من النظام القديم
  useEffect(() => {
    loadTables();
    loadColumns();
    loadFormulas();
    loadVariables();
    loadColumnMappings();
  }, []);


  const loadTables = async () => {
    try {
      setLoading(true);
      const response = await fetch(DYNAMIC_SYSTEM_API.TABLES);
      const data = await response.json();
      console.log('API Response - Tables:', data);
      console.log('Is data.data an array?', Array.isArray(data.data));
      if (data.success) {
        // Ensure data.data is always an array
        const tablesData = Array.isArray(data.data) ? data.data : [];
        console.log('Setting tables to:', tablesData);
        setTables(tablesData);
      } else {
        setTables([]);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
      setTables([]);
      toast({
        title: 'خطأ في تحميل الجداول',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadColumns = async (tableId = null) => {
    try {
      let url = `${DYNAMIC_SYSTEM_API.BASE_URL}/dynamic_system_api.php?action=get_columns`;
      if (tableId) {
        url += `&table_id=${tableId}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setColumns(data.data);
      }
    } catch (error) {
      console.error('Error loading columns:', error);
      toast({
        title: 'خطأ في تحميل الأعمدة',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const loadFormulas = async () => {
    try {
      const response = await fetch(DYNAMIC_SYSTEM_API.FORMULAS);
      const data = await response.json();
      if (data.success) {
        setFormulas(data.data);
      }
    } catch (error) {
      console.error('Error loading formulas:', error);
      toast({
        title: 'خطأ في تحميل المعادلات',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const loadVariables = async () => {
    try {
      const response = await fetch(DYNAMIC_SYSTEM_API.VARIABLES);
      const data = await response.json();
      if (data.success) {
        setVariables(data.data);
      }
    } catch (error) {
      console.error('Error loading variables:', error);
      toast({
        title: 'خطأ في تحميل المتغيرات',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Split formulas to weekly/monthly buckets or use defaults when empty
  useEffect(() => {
    if (!Array.isArray(formulas)) {
      setWeeklyFormulas([]);
      setMonthlyFormulas([]);
      return;
    }

    const toKey = (f) => (f.formula_key || f.key || '').toString();
    const toExpr = (f) => (f.formula_expression || f.expression || '').toString();
    const toName = (f) => (f.formula_name_ar || f.name || '').toString();
    const toDesc = (f) => (f.description_ar || f.description || '').toString();

    const excludedVariableKeys = new Set(['weekly_work_days']);

    const weekly = formulas
      .filter(f => (/weekly|week|أسبوع/i.test(toKey(f)) || /weekly|week|أسبوع/i.test(toName(f))) && !excludedVariableKeys.has(toKey(f)))
      .map(f => ({ name: toName(f) || toKey(f), key: toKey(f), expression: toExpr(f), description: toDesc(f) }));

    const monthly = formulas
      .filter(f => /monthly|month|شهري/i.test(toKey(f)) || /monthly|month|شهري/i.test(toName(f)))
      .map(f => ({ name: toName(f) || toKey(f), key: toKey(f), expression: toExpr(f), description: toDesc(f) }));

    setWeeklyFormulas(weekly);
    setMonthlyFormulas(monthly);
  }, [formulas]);

  // Split variables to weekly/monthly buckets or use defaults when empty
  useEffect(() => {
    if (!Array.isArray(variables)) {
      setWeeklyVariables([]);
      setMonthlyVariables([]);
      return;
    }

    const vKey = (v) => (v.variable_key || v.key || '').toString();
    const vName = (v) => (v.variable_name_ar || v.name || '').toString();
    const vVal = (v) => (v.variable_value || v.value || '').toString();
    const vDesc = (v) => (v.description_ar || v.description || '').toString();
    const vCat = (v) => (v.category || '').toString();

    const weeklyVars = variables
      .filter(v => /weekly|week|أسبوع/i.test(vKey(v)) || /weekly|week|أسبوع/i.test(vName(v)) || /weekly/i.test(vCat(v)))
      .map(v => ({
        // UI fields
        name: vName(v) || vKey(v),
        key: vKey(v),
        value: vVal(v),
        description: vDesc(v),
        // Original fields (preserve for edit)
        id: v.id,
        variable_key: v.variable_key,
        variable_name_ar: v.variable_name_ar,
        variable_name_en: v.variable_name_en,
        variable_value: v.variable_value,
        description_ar: v.description_ar,
        category: v.category,
        is_active: v.is_active
      }));

    const monthlyVars = variables
      .filter(v => /monthly|month|شهري/i.test(vKey(v)) || /monthly|month|شهري/i.test(vName(v)) || /monthly/i.test(vCat(v)))
      .map(v => ({
        name: vName(v) || vKey(v),
        key: vKey(v),
        value: vVal(v),
        description: vDesc(v),
        id: v.id,
        variable_key: v.variable_key,
        variable_name_ar: v.variable_name_ar,
        variable_name_en: v.variable_name_en,
        variable_value: v.variable_value,
        description_ar: v.description_ar,
        category: v.category,
        is_active: v.is_active
      }));

    setWeeklyVariables(weeklyVars);
    setMonthlyVariables(monthlyVars);
  }, [variables]);

  const loadColumnMappings = async () => {
    try {
      const response = await fetch(`${DYNAMIC_SYSTEM_API.BASE_URL}/dynamic_system_api.php?action=get_column_formula_mappings`);
      const data = await response.json();
      console.log('Column Mappings API Response:', data);
      if (data.success) {
        console.log('Mappings data:', data.data);
        setColumnMappings(data.data);
        setMappings(data.data);
      }
    } catch (error) {
      console.error('Error loading column mappings:', error);
    }
  };

  const loadColumnMapping = async (columnId) => {
    try {
      const response = await fetch(`${DYNAMIC_SYSTEM_API.BASE_URL}/dynamic_system_api.php?action=get_column_formula_mappings`);
      const data = await response.json();
      if (data.success) {
        const mapping = data.data.find(m => m.column_id === columnId);
        setSelectedColumnMapping(mapping);
      }
    } catch (error) {
      console.error('Error loading column mapping:', error);
    }
  };

  const saveColumnMapping = async () => {
    try {
      if (!linkForm.column_id || !linkForm.formula_id) {
        toast({
          title: 'خطأ في الحفظ',
          description: 'جميع الحقول مطلوبة',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const payload = {
        action: 'create_column_formula_mapping',
        column_id: linkForm.column_id,
        formula_id: linkForm.formula_id,
        is_auto_calculate: linkForm.is_auto_calculate ? 1 : 0
      };

      const response = await fetch(`${DYNAMIC_SYSTEM_API.BASE_URL}/dynamic_system_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'تم ربط المعادلة بالعمود بنجاح',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onLinkFormulaModalClose();
        loadColumnMappings();
        setLinkForm({
          column_id: '',
          formula_id: '',
          is_auto_calculate: true
        });
      } else {
        toast({
          title: 'خطأ في الربط',
          description: result.message || 'حدث خطأ غير متوقع',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error saving column mapping:', error);
      toast({
        title: 'خطأ في الربط',
        description: 'حدث خطأ في الاتصال',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleQuickLinkFormula = (column, currentMapping) => {
    setQuickLinkModal({
      isOpen: true,
      column: column,
      currentMapping: currentMapping
    });
    setSelectedFormulaId('');
    setFormulaSearchQuery('');
  };

  const deleteMapping = async (mappingId) => {
    try {
      const payload = {
        action: 'delete_column_formula_mapping',
        mapping_id: mappingId
      };

      const response = await fetch(`${DYNAMIC_SYSTEM_API.BASE_URL}/dynamic_system_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'تم حذف الربط بنجاح',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        loadColumnMappings();
      } else {
        toast({
          title: 'خطأ في الحذف',
          description: result.message || 'حدث خطأ غير متوقع',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast({
        title: 'خطأ في الحذف',
        description: 'حدث خطأ في الاتصال',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleLinkFormula = (column) => {
    setSelectedColumnForMapping(column);
    setLinkForm({
      column_id: column.id,
      formula_id: '',
      is_auto_calculate: true
    });
    onLinkFormulaModalOpen();
  };

  // Save functions
  const handleSaveTable = async () => {
    try {
      if (!selectedTable?.table_name || !selectedTable?.display_name_ar) {
        toast({
          title: "خطأ",
          description: "يرجى ملء جميع الحقول المطلوبة",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const payload = {
        action: selectedTable?.id ? 'update_table' : 'create_table',
        table_name: selectedTable.table_name,
        display_name_ar: selectedTable.display_name_ar,
        description_ar: selectedTable.description_ar || '',
        ...(selectedTable?.id && { id: selectedTable.id })
      };

      const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "نجح",
          description: selectedTable?.id ? "تم تحديث الجدول بنجاح" : "تم إنشاء الجدول بنجاح",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        onTableModalClose();
        setSelectedTable(null);
        loadTables();
      } else {
        throw new Error(result.message || 'حدث خطأ أثناء حفظ الجدول');
      }
    } catch (error) {
      console.error('Error saving table:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء حفظ الجدول",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const saveColumn = async () => {
    try {
      const { table_id, column_name, display_name_ar, data_type } = columnForm;
      
      if (!table_id || !column_name || !display_name_ar || !data_type) {
        console.error('Missing required fields', { table_id, column_name, display_name_ar, data_type });
        return;
      }

      const payload = {
        action: selectedColumn ? 'update_column' : 'create_column',
        ...columnForm,
        display_name_en: columnForm.display_name_en || columnForm.display_name_ar
      };

      if (selectedColumn) {
        payload.id = selectedColumn.id;
      }

      const resp = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await resp.json();
      
      if (result.success) {
        toast({
          title: 'تم الحفظ بنجاح',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onColumnModalClose();
        loadColumns();
        setColumnForm({
          table_id: '',
          column_name: '',
          display_name_ar: '',
          display_name_en: '',
          data_type: 'text',
          edit_type: 'input',
          default_value: '',
          is_required: false,
          is_active: true,
          description_ar: ''
        });
      } else {
        toast({
          title: 'خطأ في الحفظ',
          description: result.message || 'حدث خطأ غير متوقع',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error saving column:', error);
      toast({
        title: 'خطأ في الحفظ',
        description: 'حدث خطأ في الاتصال',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const saveFormula = async () => {
    try {
      // Front-end validation
      const key = (formulaForm.formula_key || '').trim();
      const nameAr = (formulaForm.formula_name_ar || '').trim();
      const nameEn = (formulaForm.formula_name_en || formulaForm.formula_name_ar || '').trim();
      const expr = (formulaForm.formula_expression || '').trim();
      if (!key || !nameAr || !nameEn || !expr) {
        toast({
          title: 'خطأ في الحفظ',
          description: 'جميع الحقول مطلوبة',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const payload = {
        action: selectedFormula ? 'update_formula' : 'create_formula',
        formula_key: key,
        formula_name_ar: nameAr,
        formula_name_en: nameEn,
        formula_expression: expr,
        description_ar: formulaForm.description_ar
      };

      if (selectedFormula && selectedFormula.id) {
        payload.id = selectedFormula.id;
      }

      const resp = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await resp.json();
      
      if (result.success) {
        toast({
          title: 'تم الحفظ بنجاح',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onFormulaModalClose();
        loadFormulas();
      } else {
        toast({
          title: 'خطأ في الحفظ',
          description: result.message || 'حدث خطأ غير متوقع',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error saving formula:', error);
      toast({
        title: 'خطأ في الحفظ',
        description: 'حدث خطأ في الاتصال',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const saveVariable = async () => {
    try {
      // Front-end validation
      const vKey = (variableForm.variable_key || '').trim();
      const vNameAr = (variableForm.variable_name_ar || '').trim();
      const vNameEn = (variableForm.variable_name_en || variableForm.variable_name_ar || '').trim();
      const vVal = (variableForm.variable_value !== null && variableForm.variable_value !== undefined) ? variableForm.variable_value.toString().trim() : '';
      
      // Check if value is empty (but allow 0 as a valid value)
      const isValueEmpty = vVal === '' && variableForm.variable_value !== 0 && variableForm.variable_value !== '0';
      
      // Debug logging
      console.log('Variable validation debug:', {
        vKey,
        vNameAr,
        vNameEn,
        vVal,
        originalValue: variableForm.variable_value,
        isValueEmpty,
        keyCheck: !vKey,
        nameArCheck: !vNameAr,
        nameEnCheck: !vNameEn,
        valueCheck: isValueEmpty,
        description: variableForm.description_ar
      });
      
      // More detailed validation
      if (!vKey) {
        console.log('Error: vKey is empty');
        toast({
          title: 'خطأ في الحفظ',
          description: 'مفتاح المتغير مطلوب',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      
      if (!vNameAr) {
        console.log('Error: vNameAr is empty');
        toast({
          title: 'خطأ في الحفظ',
          description: 'اسم المتغير العربي مطلوب',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      
      if (!vNameEn) {
        console.log('Error: vNameEn is empty');
        toast({
          title: 'خطأ في الحفظ',
          description: 'اسم المتغير الإنجليزي مطلوب',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      
      if (isValueEmpty) {
        console.log('Error: value is empty');
        toast({
          title: 'خطأ في الحفظ',
          description: 'قيمة المتغير مطلوبة',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const payload = {
        action: selectedVariable ? 'update_variable' : 'create_variable',
        variable_key: vKey,
        variable_name_ar: vNameAr,
        variable_name_en: vNameEn,
        variable_value: vVal,
        variable_type: 'text',
        category: activeTab === 'monthly-salary' ? 'monthly' : 'weekly',
        description_ar: variableForm.description_ar,
        is_editable: 1,
        is_required: 0
      };

      if (selectedVariable && selectedVariable.id) {
        payload.id = selectedVariable.id;
      }

      // Debug log to help diagnose any missing field
      console.log('Saving variable payload:', payload);

      const resp = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await resp.json();
      if (result.success) {
        toast({
          title: 'تم الحفظ بنجاح',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onVariableModalClose();
        loadVariables();
      } else {
        toast({
          title: 'خطأ في الحفظ',
          description: result.message || 'حدث خطأ غير متوقع',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error saving variable:', error);
      toast({
        title: 'خطأ في الحفظ',
        description: 'حدث خطأ في الاتصال',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Sync modal forms with selected items
  useEffect(() => {
    if (isFormulaModalOpen) {
      setFormulaForm({
        formula_key: selectedFormula?.formula_key || '',
        formula_name_ar: selectedFormula?.formula_name_ar || '',
        formula_name_en: selectedFormula?.formula_name_en || '',
        formula_expression: selectedFormula?.formula_expression || '',
        description_ar: selectedFormula?.description_ar || ''
      });
    }
  }, [isFormulaModalOpen, selectedFormula]);

  useEffect(() => {
    if (isVariableModalOpen) {
      setVariableForm({
        variable_key: selectedVariable?.variable_key || '',
        variable_name_ar: selectedVariable?.variable_name_ar || '',
        variable_name_en: selectedVariable?.variable_name_en || '',
        variable_value: (selectedVariable?.variable_value ?? '').toString(),
        description_ar: selectedVariable?.description_ar || ''
      });
    }
  }, [isVariableModalOpen, selectedVariable]);

  // Event handlers
  const handleCreateTable = () => {
    setSelectedTable(null);
    onTableModalOpen();
  };

  const handleEditTable = (table) => {
    setSelectedTable(table);
    onTableModalOpen();
  };

  const handleCreateColumn = () => {
    setSelectedColumn(null);
    setColumnForm({
      table_id: '',
      column_name: '',
      display_name_ar: '',
      display_name_en: '',
      data_type: 'text',
      edit_type: 'input',
      default_value: '',
      is_required: false,
      is_active: true,
      description_ar: ''
    });
    onColumnModalOpen();
  };

  const handleEditColumn = (column) => {
    setSelectedColumn(column);
    setColumnForm({
      table_id: column.table_id || '',
      column_name: column.column_name || '',
      display_name_ar: column.display_name_ar || '',
      display_name_en: column.display_name_en || '',
      data_type: column.data_type || 'text',
      edit_type: column.edit_type || 'input',
      default_value: column.default_value || '',
      is_required: column.is_required || false,
      is_active: column.is_active !== false,
      description_ar: column.description_ar || ''
    });
    onColumnModalOpen();
  };

  const handleCreateFormula = () => {
    setSelectedFormula(null);
    onFormulaModalOpen();
  };

  const handleEditFormula = (formula) => {
    setSelectedFormula(formula);
    onFormulaModalOpen();
  };

  const handleCreateVariable = () => {
    setSelectedVariable(null);
    onVariableModalOpen();
  };

  const handleEditVariable = (variable) => {
    setSelectedVariable(variable);
    onVariableModalOpen();
  };

  // Map-and-edit helpers for weekly preset rows (not directly from backend)
  const handleEditWeeklyFormula = (f) => {
    const mapped = {
      id: null,
      formula_key: f.key || '',
      formula_name_ar: f.name || '',
      formula_name_en: f.name || '',
      formula_expression: f.expression || '',
      description_ar: f.description || ''
    };
    setSelectedFormula(mapped);
    onFormulaModalOpen();
  };

  const handleEditWeeklyVariable = (v) => {
    // Prefer the original record from variables state to guarantee id and names
    const orig = variables.find(
      (it) => (it.variable_key === (v.variable_key || v.key))
    );
    const mapped = {
      id: (orig?.id ?? v.id) || null,
      variable_key: orig?.variable_key || v.variable_key || v.key || '',
      variable_name_ar: orig?.variable_name_ar || v.variable_name_ar || v.name || '',
      variable_name_en: orig?.variable_name_en || v.variable_name_en || v.name || '',
      variable_value: (orig?.variable_value ?? v.variable_value ?? v.value ?? ''),
      description_ar: orig?.description_ar || v.description_ar || v.description || '',
      is_active: (orig?.is_active ?? v.is_active) !== false,
      category: orig?.category || v.category || 'weekly'
    };
    setSelectedVariable(mapped);
    onVariableModalOpen();
  };

  const handleViewTableColumns = (table) => {
    setSelectedTableForFormula(table);
    setActiveTab('columns');
  };


  const handleDeleteTable = (table) => {
    if (window.confirm(`هل أنت متأكد من حذف الجدول "${table.table_name}"؟`)) {
      // Implement delete logic
      setTables(tables.filter(t => t.id !== table.id));
      toast({
        title: 'تم حذف الجدول',
        description: `تم حذف الجدول ${table.table_name} بنجاح`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteColumn = (column) => {
    if (window.confirm(`هل أنت متأكد من حذف العمود "${column.column_name}"؟`)) {
      setColumns(columns.filter(c => c.id !== column.id));
      toast({
        title: 'تم حذف العمود',
        description: `تم حذف العمود ${column.column_name} بنجاح`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteFormula = async (formula) => {
    const formulaName = formula.formula_name_ar || formula.formula_name || formula.formula_key || 'غير محدد';
    if (window.confirm(`هل أنت متأكد من حذف المعادلة "${formulaName}"؟`)) {
      try {
        const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'delete_formula',
            id: formula.id
          })
        });

        const result = await response.json();
        
        if (result.success) {
          setFormulas(formulas.filter(f => f.id !== formula.id));
          toast({
            title: 'تم حذف المعادلة',
            description: `تم حذف المعادلة ${formulaName} بنجاح`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        } else {
          toast({
            title: 'خطأ في الحذف',
            description: result.message || 'فشل في حذف المعادلة',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }
      } catch (error) {
        console.error('Error deleting formula:', error);
        toast({
          title: 'خطأ في الحذف',
          description: 'حدث خطأ أثناء حذف المعادلة',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const handleDeleteVariable = async (variable) => {
    const variableName = variable.variable_name_ar || variable.variable_name || variable.variable_key || 'غير محدد';
    if (window.confirm(`هل أنت متأكد من حذف المتغير "${variableName}"؟`)) {
      try {
        const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'delete_variable',
            id: variable.id
          })
        });

        const result = await response.json();
        
        if (result.success) {
          setVariables(variables.filter(v => v.id !== variable.id));
          toast({
            title: 'تم حذف المتغير',
            description: `تم حذف المتغير ${variableName} بنجاح`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        } else {
          toast({
            title: 'خطأ في الحذف',
            description: result.message || 'فشل في حذف المتغير',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }
      } catch (error) {
        console.error('Error deleting variable:', error);
        toast({
          title: 'خطأ في الحذف',
          description: 'حدث خطأ أثناء حذف المتغير',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  // Filter data based on search term
  const filteredTables = tables.filter(table => {
    if (!table || typeof table !== 'object') return false;
    return (
      (table.table_name && table.table_name.toLowerCase().includes(formulaSearchTerm.toLowerCase())) ||
      (table.description && table.description.toLowerCase().includes(formulaSearchTerm.toLowerCase()))
    );
  });
  
  const filteredColumns = columns.filter(column => {
    if (!column || typeof column !== 'object') return false;
    return (
      (column.column_name && column.column_name.toLowerCase().includes(formulaSearchTerm.toLowerCase())) ||
      (column.display_name && column.display_name.toLowerCase().includes(formulaSearchTerm.toLowerCase()))
    );
  });
  
  const filteredFormulas = formulas.filter(formula => {
    if (!formula || typeof formula !== 'object') return false;
    return (
      (formula.formula_name_ar && formula.formula_name_ar.toLowerCase().includes(formulaSearchTerm.toLowerCase())) ||
      (formula.formula_name_en && formula.formula_name_en.toLowerCase().includes(formulaSearchTerm.toLowerCase())) ||
      (formula.formula_name && formula.formula_name.toLowerCase().includes(formulaSearchTerm.toLowerCase())) ||
      (formula.description_ar && formula.description_ar.toLowerCase().includes(formulaSearchTerm.toLowerCase())) ||
      (formula.description && formula.description.toLowerCase().includes(formulaSearchTerm.toLowerCase()))
    );
  });
  
  const filteredVariablesData = variables.filter(variable => {
    if (!variable || typeof variable !== 'object') return false;
    
    // Apply filter first
    if (variableFilter !== 'all') {
      const variableKey = variable.variable_key?.toLowerCase() || '';
      const variableName = variable.variable_name_ar?.toLowerCase() || '';
      const category = (variable.category || '').toString().toLowerCase();
      
      switch (variableFilter) {
        case 'weekly':
          return variableKey.includes('weekly') || 
                 variableKey.includes('attendance_bonus') ||
                 variableKey.includes('on_time_days') ||
                 variableKey.includes('overtime_work') ||
                 variableKey.includes('overtime_holiday') ||
                 variableKey.includes('basic_salary_weekly') ||
                 variableKey.includes('special_bonus_weekly') ||
                 variableKey.includes('absent_days_count') ||
                 variableName.includes('أسبوعي') ||
                 category === 'weekly';
        case 'monthly':
          return variableKey.includes('monthly') || 
                 variableKey.includes('basic_salary_monthly') ||
                 variableKey.includes('special_bonus_monthly') ||
                 variableName.includes('شهري') ||
                 category === 'monthly';
        case 'general':
          return !variableKey.includes('weekly') && 
                 !variableKey.includes('monthly') &&
                 !variableKey.includes('attendance_bonus') &&
                 !variableKey.includes('on_time_days') &&
                 !variableKey.includes('overtime_work') &&
                 !variableKey.includes('overtime_holiday') &&
                 !variableKey.includes('basic_salary_weekly') &&
                 !variableKey.includes('special_bonus_weekly') &&
                 !variableKey.includes('absent_days_count') &&
                 !variableKey.includes('basic_salary_monthly') &&
                 !variableKey.includes('special_bonus_monthly') &&
                 !variableName.includes('أسبوعي') &&
                 !variableName.includes('شهري') &&
                 category !== 'weekly' &&
                 category !== 'monthly';
        default:
          return true;
      }
    }
    
    // Then apply search term
    return (
      (variable.variable_name_ar && variable.variable_name_ar.toLowerCase().includes(formulaSearchTerm.toLowerCase())) ||
      (variable.variable_name_en && variable.variable_name_en.toLowerCase().includes(formulaSearchTerm.toLowerCase())) ||
      (variable.variable_name && variable.variable_name.toLowerCase().includes(formulaSearchTerm.toLowerCase())) ||
      (variable.display_name && variable.display_name.toLowerCase().includes(formulaSearchTerm.toLowerCase()))
    );
  });

  // Filter formulas based on selected filter
  const [filteredFormulasData, setFilteredFormulasData] = useState([]);
  
  useEffect(() => {
    if (!formulas || formulas.length === 0) {
      setFilteredFormulasData([]);
      return;
    }
    
    let filtered = formulas;
    
    // Apply filter first
    if (formulaFilter !== 'all') {
      filtered = formulas.filter(formula => {
        const formulaKey = formula.formula_key?.toLowerCase() || '';
        const formulaName = formula.formula_name_ar?.toLowerCase() || '';
        
        switch (formulaFilter) {
          case 'weekly':
            return formulaKey.includes('weekly') || 
                   formulaKey.includes('attendance_bonus') ||
                   formulaKey.includes('on_time_days') ||
                   formulaKey.includes('overtime_work') ||
                   formulaKey.includes('overtime_holiday') ||
                   formulaKey.includes('weekly_incentive') ||
                   formulaKey.includes('total_weekly_amount') ||
                   formulaKey.includes('net_weekly_amount') ||
                   formulaKey.includes('weekly_work_days') ||
                   formulaKey.includes('insurance_amount_weekly_monthly') ||
                   formulaName.includes('أسبوعي') ||
                   formulaName.includes('انتظام') ||
                   formulaName.includes('حافز') ||
                   formulaName.includes('إضافي') ||
                   formulaName.includes('تأمين');
          case 'monthly':
            return formulaKey.includes('monthly') ||
                   formulaKey.includes('basic_monthly_salary') ||
                   formulaKey.includes('total_monthly_earnings') ||
                   formulaKey.includes('total_monthly_deductions') ||
                   formulaKey.includes('net_monthly_amount') ||
                   formulaKey.includes('monthly_insurance_amount') ||
                   formulaKey.includes('social_insurance') ||
                   formulaKey.includes('income_tax') ||
                   formulaName.includes('شهري') ||
                   formulaName.includes('مستقطعات شهرية') ||
                   formulaName.includes('استحقاقات شهرية');
          case 'general':
            return !formulaKey.includes('weekly') && 
                   !formulaKey.includes('monthly') &&
                   !formulaKey.includes('attendance_bonus') &&
                   !formulaKey.includes('on_time_days') &&
                   !formulaKey.includes('overtime_work') &&
                   !formulaKey.includes('overtime_holiday') &&
                   !formulaKey.includes('weekly_incentive') &&
                   !formulaKey.includes('basic_monthly_salary') &&
                   !formulaKey.includes('total_entitlements') &&
                   !formulaKey.includes('total_deductions') &&
                   !formulaKey.includes('net_salary') &&
                   !formulaKey.includes('insurance_amount_weekly_monthly');
          default:
            return true;
        }
      });
    }
    
    // Apply search term filter
    if (formulaSearchTerm && formulaSearchTerm.trim() !== '') {
      filtered = filtered.filter(formula => {
        const searchTerm = formulaSearchTerm.toLowerCase();
        return (
          (formula.formula_name_ar && formula.formula_name_ar.toLowerCase().includes(searchTerm)) ||
          (formula.formula_name_en && formula.formula_name_en.toLowerCase().includes(searchTerm)) ||
          (formula.formula_key && formula.formula_key.toLowerCase().includes(searchTerm)) ||
          (formula.formula_expression && formula.formula_expression.toLowerCase().includes(searchTerm)) ||
          (formula.description_ar && formula.description_ar.toLowerCase().includes(searchTerm)) ||
          (formula.description_en && formula.description_en.toLowerCase().includes(searchTerm))
        );
      });
    }
    
    setFilteredFormulasData(filtered);
  }, [formulas, formulaFilter, formulaSearchTerm]);

  return (
    <>
      {/* Header Section */}
      <Box mb="8">
        <HStack spacing="8" align="flex-start">
          {/* Title Section */}
          <VStack align="flex-start" spacing="2" flex="1" minW="300px">
            <Heading size="lg" className="stake-heading-3">
              إدارة النظام الديناميكي
            </Heading>

          </VStack>
          
          {/* Five Cards in One Row */}
          {/* Action Buttons */}
          <HStack spacing="3">
            <Box position="relative">
              <Button
                leftIcon={<FiPlus />}
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
                  transition="opacity 0.3s ease"
                  className="expandable-text"
                >
                  إضافة
                </Text>
              </Button>
            </Box>
          </HStack>
        </HStack>
      </Box>

        
      {/* Sidebar and Content Layout */}
      <HStack align="flex-start" spacing="6">
        {/* Sidebar Navigation */}
        <Box w="250px" p="4" bg="var(--stake-bg-primary, #0f212e)" borderRadius="xl" border="1px solid" borderColor="gray.200">
          <VStack align="stretch" spacing="2">
            <Button
              leftIcon={<FiDatabase size="16" />}
              variant="ghost"
              justifyContent="flex-start"
              h="48px"
              w="100%"
              bg={activeTabIndex === 0 ? "rgba(255, 255, 255, 0.1)" : "transparent"}
              color="white"
              onClick={() => handleTabChange(0)}
              _hover={{
                bg: "rgba(255, 255, 255, 0.1)"
              }}
              _active={{
                bg: "rgba(255, 255, 255, 0.1)"
              }}
            >
              الجداول
            </Button>
            <Button
              leftIcon={<FiSettings size="16" />}
              variant="ghost"
              justifyContent="flex-start"
              h="48px"
              w="100%"
              bg={activeTabIndex === 1 ? "rgba(255, 255, 255, 0.1)" : "transparent"}
              color="white"
              onClick={() => handleTabChange(1)}
              _hover={{
                bg: "rgba(255, 255, 255, 0.1)"
              }}
              _active={{
                bg: "rgba(255, 255, 255, 0.1)"
              }}
            >
              الأعمدة
            </Button>
            <Button
              leftIcon={<FiCode size="16" />}
              variant="ghost"
              justifyContent="flex-start"
              h="48px"
              w="100%"
              bg={activeTabIndex === 2 ? "rgba(255, 255, 255, 0.1)" : "transparent"}
              color="white"
              onClick={() => handleTabChange(2)}
              _hover={{
                bg: "rgba(255, 255, 255, 0.1)"
              }}
              _active={{
                bg: "rgba(255, 255, 255, 0.1)"
              }}
            >
              المعادلات
            </Button>
            <Button
              leftIcon={<FiTool size="16" />}
              variant="ghost"
              justifyContent="flex-start"
              h="48px"
              w="100%"
              bg={activeTabIndex === 3 ? "rgba(255, 255, 255, 0.1)" : "transparent"}
              color="white"
              onClick={() => handleTabChange(3)}
              _hover={{
                bg: "rgba(255, 255, 255, 0.1)"
              }}
              _active={{
                bg: "rgba(255, 255, 255, 0.1)"
              }}
            >
              المتغيرات
            </Button>
            <Button
              leftIcon={<FiLink size="16" />}
              variant="ghost"
              justifyContent="flex-start"
              h="48px"
              w="100%"
              bg={activeTabIndex === 4 ? "rgba(255, 255, 255, 0.1)" : "transparent"}
              color="white"
              onClick={() => handleTabChange(4)}
              _hover={{
                bg: "rgba(255, 255, 255, 0.1)"
              }}
              _active={{
                bg: "rgba(255, 255, 255, 0.1)"
              }}
            >
              الربط
            </Button>
          </VStack>
        </Box>

        {/* Main Content */}
        <Box className="stake-card" flex="1" overflow="hidden">
          <Box p="0">
            <HStack justify="space-between" align="center" px="4" pt="4" pb="2">
              <HStack spacing="3">
                <Icon 
                  as={
                    activeTab === 'tables' ? FiDatabase :
                    activeTab === 'columns' ? FiSettings :
                    activeTab === 'formulas' ? FiCode :
                    activeTab === 'variables' ? FiTool :
                    activeTab === 'mappings' ? FiLink : FiDatabase
                  } 
                  color={
                    activeTab === 'tables' ? 'blue.500' :
                    activeTab === 'columns' ? 'green.500' :
                    activeTab === 'formulas' ? 'purple.500' :
                    activeTab === 'variables' ? 'orange.500' :
                    activeTab === 'mappings' ? 'teal.500' : 'blue.500'
                  } 
                  boxSize="6" 
                />
                <VStack align="flex-start" spacing="0">
                  <Heading size="md" className="stake-heading-3">
                    {activeTab === 'tables' && ' الجداول'}
                    {activeTab === 'columns' && ' الأعمدة'}
                    {activeTab === 'formulas' && ' المعادلات'}
                    {activeTab === 'variables' && ' المتغيرات'}
                    {activeTab === 'mappings' && ' الربط'}
                  </Heading>
                  
                </VStack>
              </HStack>
              
              {/* Search Bar and Formula Filters in Center */}
              <HStack spacing="4">
                <InputGroup maxW="300px">
                  <InputRightElement>
                    <Icon as={FiSearch} color="var(--stake-text-muted)" />
                  </InputRightElement>
                  <Input
                    placeholder="البحث في البيانات..."
                    value={formulaSearchTerm}
                    onChange={(e) => setFormulaSearchTerm(e.target.value)}
                    className="stake-input"
                    borderRadius="xl"
                    height="44px"
                    _focus={{
                      borderColor: "var(--stake-border-accent)",
                      boxShadow: "0 0 0 2px rgba(20, 117, 225, 0.2)"
                    }}
                    _hover={{
                      borderColor: "var(--stake-border-accent)"
                    }}
                  />
                </InputGroup>
                
                {/* Formula Filters - Only show when in formulas tab */}
                {activeTab === 'formulas' && (
                  <HStack spacing="2">
                    <Button
                      size="xs"
                      bg={formulaFilter === 'all' ? 'purple.500' : 'white'}
                      color={formulaFilter === 'all' ? 'white' : 'gray.700'}
                      borderColor={formulaFilter === 'all' ? 'purple.500' : 'gray.300'}
                      borderWidth="1px"
                      _hover={{
                        bg: formulaFilter === 'all' ? 'purple.600' : 'gray.50'
                      }}
                      onClick={() => setFormulaFilter('all')}
                    >
                      الكل
                    </Button>
                    <Button
                      size="xs"
                      bg={formulaFilter === 'general' ? 'purple.500' : 'white'}
                      color={formulaFilter === 'general' ? 'white' : 'gray.700'}
                      borderColor={formulaFilter === 'general' ? 'purple.500' : 'gray.300'}
                      borderWidth="1px"
                      _hover={{
                        bg: formulaFilter === 'general' ? 'purple.600' : 'gray.50'
                      }}
                      onClick={() => setFormulaFilter('general')}
                    >
                      عام
                    </Button>
                    <Button
                      size="xs"
                      bg={formulaFilter === 'weekly' ? 'purple.500' : 'white'}
                      color={formulaFilter === 'weekly' ? 'white' : 'gray.700'}
                      borderColor={formulaFilter === 'weekly' ? 'purple.500' : 'gray.300'}
                      borderWidth="1px"
                      _hover={{
                        bg: formulaFilter === 'weekly' ? 'purple.600' : 'gray.50'
                      }}
                      onClick={() => setFormulaFilter('weekly')}
                    >
                      أسبوعي
                    </Button>
                    <Button
                      size="xs"
                      bg={formulaFilter === 'monthly' ? 'purple.500' : 'white'}
                      color={formulaFilter === 'monthly' ? 'white' : 'gray.700'}
                      borderColor={formulaFilter === 'monthly' ? 'purple.500' : 'gray.300'}
                      borderWidth="1px"
                      _hover={{
                        bg: formulaFilter === 'monthly' ? 'purple.600' : 'gray.50'
                      }}
                      onClick={() => setFormulaFilter('monthly')}
                    >
                      شهري
                    </Button>
                  </HStack>
                )}

                {/* Variable Filters - Only show when in variables tab */}
                {activeTab === 'variables' && (
                  <HStack spacing="2">
                    <Button
                      size="xs"
                      bg={variableFilter === 'all' ? 'orange.500' : 'white'}
                      color={variableFilter === 'all' ? 'white' : 'gray.700'}
                      borderColor={variableFilter === 'all' ? 'orange.500' : 'gray.300'}
                      borderWidth="1px"
                      _hover={{
                        bg: variableFilter === 'all' ? 'orange.600' : 'gray.50'
                      }}
                      onClick={() => setVariableFilter('all')}
                    >
                      الكل
                    </Button>
                    <Button
                      size="xs"
                      bg={variableFilter === 'general' ? 'orange.500' : 'white'}
                      color={variableFilter === 'general' ? 'white' : 'gray.700'}
                      borderColor={variableFilter === 'general' ? 'orange.500' : 'gray.300'}
                      borderWidth="1px"
                      _hover={{
                        bg: variableFilter === 'general' ? 'orange.600' : 'gray.50'
                      }}
                      onClick={() => setVariableFilter('general')}
                    >
                      عام
                    </Button>
                    <Button
                      size="xs"
                      bg={variableFilter === 'weekly' ? 'orange.500' : 'white'}
                      color={variableFilter === 'weekly' ? 'white' : 'gray.700'}
                      borderColor={variableFilter === 'weekly' ? 'orange.500' : 'gray.300'}
                      borderWidth="1px"
                      _hover={{
                        bg: variableFilter === 'weekly' ? 'orange.600' : 'gray.50'
                      }}
                      onClick={() => setVariableFilter('weekly')}
                    >
                      أسبوعي
                    </Button>
                    <Button
                      size="xs"
                      bg={variableFilter === 'monthly' ? 'orange.500' : 'white'}
                      color={variableFilter === 'monthly' ? 'white' : 'gray.700'}
                      borderColor={variableFilter === 'monthly' ? 'orange.500' : 'gray.300'}
                      borderWidth="1px"
                      _hover={{
                        bg: variableFilter === 'monthly' ? 'orange.600' : 'gray.50'
                      }}
                      onClick={() => setVariableFilter('monthly')}
                    >
                      شهري
                    </Button>
                  </HStack>
                )}
              </HStack>
              
              <HStack spacing="2">
                <Box position="relative">
                  <Button
                    leftIcon={<FiPlus />}
                    className="stake-btn-primary expandable-btn"
                    size="md"
                    onClick={handleCreateTable}
                    h="44px"
                    w="44px"
                    minW="44px"
                    px="0"
                    _hover={{
                      w: "auto",
                      minW: "120px",
                      px: "4"
                    }}
                    transition="all 0.3s ease"
                  >
                    <Text className="expandable-text" opacity="0" ml="2">
                      إضافة جدول
                    </Text>
                  </Button>
                </Box>
                <Box position="relative">
                  <Button
                    leftIcon={<FiPlus />}
                    className="stake-btn-success expandable-btn"
                    size="md"
                    onClick={handleCreateColumn}
                    h="44px"
                    w="44px"
                    minW="44px"
                    px="0"
                    _hover={{
                      w: "auto",
                      minW: "120px",
                      px: "4"
                    }}
                    transition="all 0.3s ease"
                  >
                    <Text className="expandable-text" opacity="0" ml="2">
                      إضافة عمود
                    </Text>
                  </Button>
                </Box>
                <Box position="relative">
                  <Button
                    leftIcon={<FiTool />}
                    className="stake-btn-warning expandable-btn"
                    size="md"
                    onClick={handleCreateFormula}
                    h="44px"
                    w="44px"
                    minW="44px"
                    px="0"
                    _hover={{
                      w: "auto",
                      minW: "120px",
                      px: "4"
                    }}
                    transition="all 0.3s ease"
                  >
                    <Text className="expandable-text" opacity="0" ml="2">
                      إضافة معادلة
                    </Text>
                  </Button>
                </Box>
                <Box position="relative">
                  <Button
                    leftIcon={<FiPlus />}
                    className="stake-btn-secondary expandable-btn"
                    size="md"
                    onClick={handleCreateVariable}
                    h="44px"
                    w="44px"
                    minW="44px"
                    px="0"
                    _hover={{
                      w: "auto",
                      minW: "120px",
                      px: "4"
                    }}
                    transition="all 0.3s ease"
                  >
                    <Text className="expandable-text" opacity="0" ml="2">
                      إضافة متغير
                    </Text>
                  </Button>
                </Box>
              </HStack>
              
            </HStack>
          </Box>
          
          <Box>
            
            {/* Content based on active tab */}
            {activeTabIndex === 0 && (
              <Box p="0">
                <TableContainer maxH="70vh" overflowY="auto" className="stake-table main-content">
                    <Table variant="simple" size="md" className="stake-table main-content">
                      <Thead position="sticky" top="0" bg="var(--stake-bg-primary)" zIndex="1" boxShadow="var(--stake-shadow-sm)">
                        <Tr>
                          <Th>
                            <ChakraEnglishKeyTooltip englishKey="table_name">
                              اسم الجدول
                            </ChakraEnglishKeyTooltip>
                          </Th>
                          <Th>
                            <ChakraEnglishKeyTooltip englishKey="description">
                              الوصف
                            </ChakraEnglishKeyTooltip>
                          </Th>
                          <Th>
                            <ChakraEnglishKeyTooltip englishKey="status">
                              الحالة
                            </ChakraEnglishKeyTooltip>
                          </Th>
                          <Th>
                            <ChakraEnglishKeyTooltip englishKey="actions">
                              الإجراءات
                            </ChakraEnglishKeyTooltip>
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {filteredTables.map((table) => (
                          <Tr key={table.id}>
                            <Td fontWeight="medium" maxW="200px">
                              <Text isTruncated>{table.display_name_ar || table.table_name || 'غير محدد'}</Text>
                            </Td>
                            <Td maxW="250px">
                              <Text isTruncated title={table.description_ar || table.description || ''}>
                                {table.description_ar || table.description || '-'}
                              </Text>
                            </Td>
                            <Td>
                              <Badge colorScheme={table.is_active ? 'green' : 'red'}>
                                {table.is_active ? 'نشط' : 'غير نشط'}
                              </Badge>
                            </Td>
                            <Td>
                              <HStack spacing="1">
                                <Tooltip label="إظهار الأعمدة">
                                  <IconButton
                                    icon={<FiEye />}
                                    size="xs"
                                    variant="ghost"
                                    colorScheme="green"
                                    onClick={() => handleViewTableColumns(table)}
                                  />
                                </Tooltip>
                                <Tooltip label="تعديل">
                                  <IconButton
                                    icon={<FiEdit />}
                                    size="xs"
                                    variant="ghost"
                                    colorScheme="blue"
                                    onClick={() => handleEditTable(table)}
                                  />
                                </Tooltip>
                                <Tooltip label="حذف">
                                  <IconButton
                                    icon={<FiTrash2 />}
                                    size="xs"
                                    variant="ghost"
                                    colorScheme="red"
                                    onClick={() => handleDeleteTable(table)}
                                  />
                                </Tooltip>
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
              </Box>
            )}
            
            {activeTabIndex === 1 && (
              <Box p="0">
                  {selectedTableForFormula ? (
                    <VStack spacing="4" align="stretch">
                      {/* Table Info */}
                      <Card>
                        <CardBody>
                          <HStack justify="space-between" align="center">
                            <VStack align="flex-start" spacing="1">
                              <Heading size="sm" color="gray.800">
                                أعمدة الجدول: {selectedTableForFormula.display_name_ar || selectedTableForFormula.table_name}
                              </Heading>
                              <Text fontSize="sm" color="gray.600">
                                {selectedTableForFormula.description_ar || selectedTableForFormula.description}
                              </Text>
                            </VStack>
                            <HStack spacing="2">
                              <Badge colorScheme={selectedTableForFormula.is_active ? 'green' : 'red'}>
                                {selectedTableForFormula.is_active ? 'نشط' : 'غير نشط'}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedTableForFormula(null)}
                              >
                                العودة للقائمة
                              </Button>
                            </HStack>
                          </HStack>
                        </CardBody>
                      </Card>
                      
                      {/* Columns Table */}
                      <TableContainer maxH="60vh" overflowY="auto" className="stake-table main-content">
                        <Table variant="simple" size="md" className="stake-table main-content">
                          <Thead position="sticky" top="0" bg="var(--stake-bg-primary)" zIndex="1" boxShadow="var(--stake-shadow-sm)">
                            <Tr>
                              <Th>
                                <ChakraEnglishKeyTooltip englishKey="column_name">
                                  اسم العمود
                                </ChakraEnglishKeyTooltip>
                              </Th>
                              <Th>
                                <ChakraEnglishKeyTooltip englishKey="display_name">
                                  اسم العرض
                                </ChakraEnglishKeyTooltip>
                              </Th>
                              <Th>
                                <ChakraEnglishKeyTooltip englishKey="data_type">
                                  نوع البيانات
                                </ChakraEnglishKeyTooltip>
                              </Th>
                              <Th>
                                <ChakraEnglishKeyTooltip englishKey="linked_formula">
                                  المعادلة المرتبطة
                                </ChakraEnglishKeyTooltip>
                              </Th>
                              <Th>
                                <ChakraEnglishKeyTooltip englishKey="status">
                                  الحالة
                                </ChakraEnglishKeyTooltip>
                              </Th>
                              <Th>
                                <ChakraEnglishKeyTooltip englishKey="actions">
                                  الإجراءات
                                </ChakraEnglishKeyTooltip>
                              </Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {filteredColumns
                              .filter(column => column.table_id == selectedTableForFormula.id)
                              .map((column) => (
                                <Tr key={column.id}>
                                  <Td fontWeight="medium">{column.column_name}</Td>
                                  <Td>{column.display_name_ar || column.display_name}</Td>
                                  <Td>
                                    <Badge colorScheme="blue" variant="outline">
                                      {column.data_type}
                                    </Badge>
                                  </Td>
                                  <Td>
                                    {(() => {
                                      const mapping = mappings.find(m => m.column_id === column.id);
                                      if (mapping) {
                                        return (
                                          <HStack spacing="2">
                                            <Badge colorScheme="purple" variant="solid">
                                              {mapping.formula_key}
                                            </Badge>
                                            <IconButton
                                              icon={<FiEdit />}
                                              size="xs"
                                              variant="ghost"
                                              colorScheme="purple"
                                              onClick={() => handleQuickLinkFormula(column, mapping)}
                                              title="تغيير المعادلة"
                                            />
                                          </HStack>
                                        );
                                      } else {
                                        return (
                                          <HStack spacing="2">
                                            <Badge colorScheme="gray" variant="outline">
                                              غير مربوط
                                            </Badge>
                                            <IconButton
                                              icon={<FiLink />}
                                              size="xs"
                                              variant="ghost"
                                              colorScheme="green"
                                              onClick={() => handleQuickLinkFormula(column, null)}
                                              title="ربط معادلة"
                                            />
                                          </HStack>
                                        );
                                      }
                                    })()}
                                  </Td>
                                  <Td>
                                    <Badge colorScheme={column.is_active ? 'green' : 'red'}>
                                      {column.is_active ? 'نشط' : 'غير نشط'}
                                    </Badge>
                                  </Td>
                                  <Td>
                                    <HStack spacing="1">
                                      <Tooltip label="تعديل">
                                        <IconButton
                                          icon={<FiEdit />}
                                          size="xs"
                                          variant="ghost"
                                          colorScheme="blue"
                                          onClick={() => handleEditColumn(column)}
                                        />
                                      </Tooltip>
                                      <Tooltip label="ربط معادلة">
                                        <IconButton
                                          icon={<FiLink />}
                                          size="xs"
                                          variant="ghost"
                                          colorScheme="green"
                                          onClick={() => handleLinkFormula(column)}
                                        />
                                      </Tooltip>
                                      <Tooltip label="حذف">
                                        <IconButton
                                          icon={<FiTrash2 />}
                                          size="xs"
                                          variant="ghost"
                                          colorScheme="red"
                                          onClick={() => handleDeleteColumn(column)}
                                        />
                                      </Tooltip>
                                    </HStack>
                                  </Td>
                                </Tr>
                              ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    </VStack>
                  ) : (
                    <VStack spacing="4" align="center" py="8">
                      <Icon as={FiDatabase} boxSize="12" className="stake-text-secondary" />
                      <Text color="gray.600" fontSize="lg">
                        اختر جدولاً لعرض أعمدةه
                      </Text>
                      <Text color="gray.500" fontSize="sm">
                        اضغط على أيقونة "إظهار الأعمدة" في جدول الجداول
                      </Text>
                    </VStack>
                  )}
              </Box>
            )}
            
            {activeTabIndex === 2 && (
              <Box p="0">
                <TableContainer ref={formulasTableRef} maxH="70vh" overflowY="auto" className="stake-table main-content">
                    <Table variant="simple" size="md" className="stake-table main-content">
                      <Thead position="sticky" top="0" bg="var(--stake-bg-primary)" zIndex="1" boxShadow="var(--stake-shadow-sm)">
                        <Tr>
                          <Th>
                            <ChakraEnglishKeyTooltip englishKey="formula_name">
                              اسم المعادلة
                            </ChakraEnglishKeyTooltip>
                          </Th>
                          <Th maxW="300px">
                            <ChakraEnglishKeyTooltip englishKey="formula">
                              المعادلة
                            </ChakraEnglishKeyTooltip>
                          </Th>
                          <Th maxW="200px">
                            <ChakraEnglishKeyTooltip englishKey="description">
                              الوصف
                            </ChakraEnglishKeyTooltip>
                          </Th>
                          <Th>
                            <ChakraEnglishKeyTooltip englishKey="status">
                              الحالة
                            </ChakraEnglishKeyTooltip>
                          </Th>
                          <Th>
                            <ChakraEnglishKeyTooltip englishKey="actions">
                              الإجراءات
                            </ChakraEnglishKeyTooltip>
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {filteredFormulasData.map((formula) => (
                          <Tr key={formula.id} id={`formula-${formula.id}`}>
                            <Td fontWeight="medium" maxW="200px">
                              <ChakraEnglishKeyTooltip 
                                englishKey={formula.formula_key || formula.key || 'formula_key'}
                                tooltipText={formula.formula_key || formula.key || 'formula_key'}
                              >
                                <Text isTruncated>{formula.formula_name_ar || formula.formula_name}</Text>
                              </ChakraEnglishKeyTooltip>
                            </Td>
                            <Td maxW="300px">
                              <Text 
                                fontFamily="mono" 
                                fontSize="xs" 
                                bg="gray.100" 
                                p="2" 
                                borderRadius="md"
                                isTruncated
                                title={formula.formula_expression || formula.formula}
                              >
                                {formula.formula_expression || formula.formula}
                              </Text>
                            </Td>
                            <Td maxW="200px">
                              <Text isTruncated title={formula.description_ar || formula.description}>
                                {formula.description_ar || formula.description}
                              </Text>
                            </Td>
                            <Td>
                              <Badge colorScheme={formula.is_active ? 'green' : 'red'}>
                                {formula.is_active ? 'نشط' : 'غير نشط'}
                              </Badge>
                            </Td>
                            <Td>
                              <HStack spacing="1">
                                <Tooltip label="تعديل">
                                  <IconButton
                                    icon={<FiEdit />}
                                    size="xs"
                                    variant="ghost"
                                    colorScheme="blue"
                                    onClick={() => handleEditFormula(formula)}
                                  />
                                </Tooltip>
                                <Tooltip label="اختبار المعادلة">
                                  <IconButton
                                    icon={<FiTool />}
                                    size="xs"
                                    variant="ghost"
                                    colorScheme="orange"
                                    onClick={() => previewFormula(formula.formula_expression || formula.formula)}
                                  />
                                </Tooltip>
                                <Tooltip label="حذف">
                                  <IconButton
                                    icon={<FiTrash2 />}
                                    size="xs"
                                    variant="ghost"
                                    colorScheme="red"
                                    onClick={() => handleDeleteFormula(formula)}
                                  />
                                </Tooltip>
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
              </Box>
            )}
            
            {activeTabIndex === 3 && (
              <Box p="0">
                  <TableContainer maxH="70vh" overflowY="auto" className="stake-table main-content">
                    <Table variant="simple" size="md" className="stake-table main-content">
                      <Thead position="sticky" top="0" bg="var(--stake-bg-primary)" zIndex="1" boxShadow="var(--stake-shadow-sm)">
                        <Tr>
                          <Th>
                            <ChakraEnglishKeyTooltip englishKey="variable_name">
                              اسم المتغير
                            </ChakraEnglishKeyTooltip>
                          </Th>
                          <Th>
                            <ChakraEnglishKeyTooltip englishKey="key">
                              المفتاح
                            </ChakraEnglishKeyTooltip>
                          </Th>
                          <Th>
                            <ChakraEnglishKeyTooltip englishKey="value">
                              القيمة
                            </ChakraEnglishKeyTooltip>
                          </Th>
                          <Th>
                            <ChakraEnglishKeyTooltip englishKey="description">
                              الوصف
                            </ChakraEnglishKeyTooltip>
                          </Th>
                          <Th>
                            <ChakraEnglishKeyTooltip englishKey="status">
                              الحالة
                            </ChakraEnglishKeyTooltip>
                          </Th>
                          <Th>
                            <ChakraEnglishKeyTooltip englishKey="actions">
                              الإجراءات
                            </ChakraEnglishKeyTooltip>
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {filteredVariablesData.map((variable) => (
                          <Tr key={variable.id}>
                            <Td fontWeight="medium" maxW="200px">
                              <Text isTruncated>{variable.variable_name_ar || variable.variable_name}</Text>
                            </Td>
                            <Td maxW="150px">
                              <Text 
                                fontFamily="mono" 
                                fontSize="xs" 
                                bg="gray.100" 
                                p="2" 
                                borderRadius="md"
                                isTruncated
                                title={variable.variable_key}
                              >
                                {variable.variable_key}
                              </Text>
                            </Td>
                            <Td maxW="150px">
                              <Text 
                                fontFamily="mono" 
                                fontSize="xs" 
                                bg="#2f4553" 
                                color="white"
                                p="2" 
                                borderRadius="md"
                                isTruncated
                                title={variable.variable_value}
                              >
                                {variable.variable_value}
                              </Text>
                            </Td>
                            <Td maxW="200px">
                              <Text isTruncated title={variable.description_ar || variable.description}>
                                {variable.description_ar || variable.description}
                              </Text>
                            </Td>
                            <Td>
                              <Badge colorScheme={variable.is_active ? 'green' : 'red'}>
                                {variable.is_active ? 'نشط' : 'غير نشط'}
                              </Badge>
                            </Td>
                            <Td>
                              <HStack spacing="1">
                                <Tooltip label="تعديل">
                                  <IconButton
                                    icon={<FiEdit />}
                                    size="xs"
                                    variant="ghost"
                                    colorScheme="blue"
                                    onClick={() => handleEditVariable(variable)}
                                  />
                                </Tooltip>
                                <Tooltip label="حذف">
                                  <IconButton
                                    icon={<FiTrash2 />}
                                    size="xs"
                                    variant="ghost"
                                    colorScheme="red"
                                    onClick={() => handleDeleteVariable(variable)}
                                  />
                                </Tooltip>
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
              </Box>
            )}
            
            {false && activeTab === 'weekly-salary' && (
              <Box>
                <VStack spacing="4" align="stretch">
                  {/* Header with Add Button */}
                  <HStack justify="space-between" align="center">
                    <Text fontSize="lg" fontWeight="semibold" color="gray.700">
                      إدارة معادلات ومتغيرات الراتب الأسبوعي
                    </Text>
                    <HStack spacing="2">
                      <Button
                        leftIcon={<FiPlus />}
                        colorScheme="green"
                        size="sm"
                        bg="green.500"
                        color="white"
                        _hover={{ bg: 'green.600' }}
                        onClick={() => {
                          console.log('إضافة معادلة راتب أسبوعي');
                        }}
                      >
                        إضافة معادلة
                      </Button>
                      <Button
                        leftIcon={<FiPlus />}
                        colorScheme="green"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('إضافة متغير راتب أسبوعي');
                        }}
                      >
                        إضافة متغير
                      </Button>
                    </HStack>
                  </HStack>
                  
                  {/* Weekly Salary Formulas */}
                  <Box>
                    <Text fontSize="md" fontWeight="semibold" color="green.600" mb="3">
                      معادلات الراتب الأسبوعي
                    </Text>
                    <TableContainer maxH={{ base: '50vh', md: '40vh' }} overflowY="auto" overflowX="auto" width="100%">
                      <Table variant="simple" size="sm" width="100%" style={{ tableLayout: 'fixed' }}>
                        <Thead position="sticky" top="0" bg="var(--stake-bg-primary)" zIndex="1" boxShadow="var(--stake-shadow-sm)">
                          <Tr>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="formula_name">
                                اسم المعادلة
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="key">
                                المفتاح
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="expression">
                                التعبير
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="description">
                                الوصف
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="actions">
                                الإجراءات
                              </ChakraEnglishKeyTooltip>
                            </Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {weeklyFormulas.length === 0 ? (
                            <Tr>
                              <Td colSpan={5} textAlign="center" py="8">
                                <VStack spacing="2">
                                  <Icon as={FiCalendar} boxSize="8" className="stake-text-secondary" />
                                  <Text color="gray.500">لا توجد معادلات للراتب الأسبوعي</Text>
                                  <Text fontSize="sm" className="stake-text-secondary">
                                    اضغط على "إضافة معادلة" لبدء إضافة المعادلات
                                  </Text>
                                </VStack>
                              </Td>
                            </Tr>
                          ) : (
                            weeklyFormulas.map((formula, index) => (
                              <Tr key={index}>
                                <Td fontWeight="medium" whiteSpace="normal">
                                  <Text whiteSpace="normal" sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                    {formula.name || `معادلة ${index + 1}`}
                                  </Text>
                                </Td>
                                <Td whiteSpace="normal">
                                  <Text fontFamily="mono" fontSize="xs" bg="gray.100" p="2" borderRadius="md" whiteSpace="pre-wrap" sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                    {formula.key || 'weekly_formula_' + (index + 1)}
                                  </Text>
                                </Td>
                                <Td whiteSpace="normal">
                                  <Text fontFamily="mono" fontSize="xs" bg="green.100" p="2" borderRadius="md" whiteSpace="pre-wrap" sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                    {formula.expression || 'basic_wage + overtime'}
                                  </Text>
                                </Td>
                                <Td whiteSpace="normal">
                                  <Text fontSize="sm" color="gray.600" whiteSpace="normal" sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                    {formula.description || 'معادلة حساب الراتب الأسبوعي'}
                                  </Text>
                                </Td>
                                <Td>
                                  <HStack spacing="1">
                                    <Tooltip label="تعديل">
                                      <IconButton
                                        icon={<FiEdit />}
                                        size="xs"
                                        variant="ghost"
                                    colorScheme="green"
                                    onClick={() => handleEditWeeklyFormula(formula)}
                                      />
                                    </Tooltip>
                                    <Tooltip label="حذف">
                                      <IconButton
                                        icon={<FiTrash2 />}
                                        size="xs"
                                        variant="ghost"
                                        colorScheme="red"
                                      />
                                    </Tooltip>
                                  </HStack>
                                </Td>
                              </Tr>
                            ))
                          )}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </Box>
                  
                  {/* Weekly Salary Variables */}
                  <Box>
                    <Text fontSize="md" fontWeight="semibold" color="green.600" mb="3">
                      متغيرات الراتب الأسبوعي
                    </Text>
                    <TableContainer maxH={{ base: '50vh', md: '40vh' }} overflowY="auto" overflowX="auto" width="100%">
                      <Table variant="simple" size="sm" width="100%" style={{ tableLayout: 'fixed' }}>
                        <Thead position="sticky" top="0" bg="var(--stake-bg-primary)" zIndex="1" boxShadow="var(--stake-shadow-sm)">
                          <Tr>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="variable_name">
                                اسم المتغير
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="key">
                                المفتاح
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="value">
                                القيمة
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="description">
                                الوصف
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="actions">
                                الإجراءات
                              </ChakraEnglishKeyTooltip>
                            </Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {weeklyVariables.length === 0 ? (
                            <Tr>
                              <Td colSpan={5} textAlign="center" py="8">
                                <VStack spacing="2">
                                  <Icon as={FiTool} boxSize="8" className="stake-text-secondary" />
                                  <Text color="gray.500">لا توجد متغيرات للراتب الأسبوعي</Text>
                                  <Text fontSize="sm" className="stake-text-secondary">
                                    اضغط على "إضافة متغير" لبدء إضافة المتغيرات
                                  </Text>
                                </VStack>
                              </Td>
                            </Tr>
                          ) : (
                            weeklyVariables.map((variable, index) => (
                              <Tr key={index}>
                                <Td fontWeight="medium" whiteSpace="normal">
                                  <Text whiteSpace="normal" sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                    {variable.name || `متغير ${index + 1}`}
                                  </Text>
                                </Td>
                                <Td whiteSpace="normal">
                                  <Text fontFamily="mono" fontSize="xs" bg="gray.100" p="2" borderRadius="md" whiteSpace="pre-wrap" sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                    {variable.key || 'weekly_var_' + (index + 1)}
                                  </Text>
                                </Td>
                                <Td whiteSpace="normal">
                                  <Text fontFamily="mono" fontSize="xs" bg="green.100" p="2" borderRadius="md" whiteSpace="pre-wrap" sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                    {variable.value || '0'}
                                  </Text>
                                </Td>
                                <Td whiteSpace="normal">
                                  <Text fontSize="sm" color="gray.600" whiteSpace="normal" sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                    {variable.description || 'متغير للراتب الأسبوعي'}
                                  </Text>
                                </Td>
                                <Td>
                                  <HStack spacing="1">
                                    <Tooltip label="تعديل">
                                      <IconButton
                                        icon={<FiEdit />}
                                        size="xs"
                                        variant="ghost"
                                    colorScheme="green"
                                    onClick={() => handleEditWeeklyVariable(variable)}
                                      />
                                    </Tooltip>
                                    <Tooltip label="حذف">
                                      <IconButton
                                        icon={<FiTrash2 />}
                                        size="xs"
                                        variant="ghost"
                                        colorScheme="red"
                                      />
                                    </Tooltip>
                                  </HStack>
                                </Td>
                              </Tr>
                            ))
                          )}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </Box>
                </VStack>
              </Box>
            )}
            
            {false && activeTab === 'monthly-salary' && (
              <Box>
                <VStack spacing="4" align="stretch">
                  {/* Header with Add Button */}
                  <HStack justify="space-between" align="center">
                    <Text fontSize="lg" fontWeight="semibold" color="gray.700">
                      إدارة معادلات ومتغيرات الراتب الشهري
                    </Text>
                    <HStack spacing="2">
                      <Button
                        leftIcon={<FiPlus />}
                        colorScheme="purple"
                        size="sm"
                        bg="purple.500"
                        color="white"
                        _hover={{ bg: 'purple.600' }}
                        onClick={() => {
                          console.log('إضافة معادلة راتب شهري');
                        }}
                      >
                        إضافة معادلة
                      </Button>
                      <Button
                        leftIcon={<FiPlus />}
                        colorScheme="purple"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('إضافة متغير راتب شهري');
                        }}
                      >
                        إضافة متغير
                      </Button>
                    </HStack>
                  </HStack>
                  
                  {/* Monthly Salary Formulas */}
                  <Box>
                    <Text fontSize="md" fontWeight="semibold" color="purple.600" mb="3">
                      معادلات الراتب الشهري
                    </Text>
                    <TableContainer maxH={{ base: '50vh', md: '40vh' }} overflowY="auto" overflowX="auto" width="100%">
                      <Table variant="simple" size="md">
                        <Thead position="sticky" top="0" bg="var(--stake-bg-primary)" zIndex="1" boxShadow="var(--stake-shadow-sm)">
                          <Tr>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="formula_name">
                                اسم المعادلة
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="key">
                                المفتاح
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="expression">
                                التعبير
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="description">
                                الوصف
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="actions">
                                الإجراءات
                              </ChakraEnglishKeyTooltip>
                            </Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {monthlyFormulas.length === 0 ? (
                            <Tr>
                              <Td colSpan={5} textAlign="center" py="8">
                                <VStack spacing="2">
                                  <Icon as={FiCalendar} boxSize="8" className="stake-text-secondary" />
                                  <Text color="gray.500">لا توجد معادلات للراتب الشهري</Text>
                                  <Text fontSize="sm" className="stake-text-secondary">
                                    اضغط على "إضافة معادلة" لبدء إضافة المعادلات
                                  </Text>
                                </VStack>
                              </Td>
                            </Tr>
                          ) : (
                            monthlyFormulas.map((formula, index) => (
                              <Tr key={index}>
                                <Td fontWeight="medium">
                                  <Text>{formula.name || `معادلة ${index + 1}`}</Text>
                                </Td>
                                <Td>
                                  <Text fontFamily="mono" fontSize="xs" bg="gray.100" p="2" borderRadius="md">
                                    {formula.key || 'monthly_formula_' + (index + 1)}
                                  </Text>
                                </Td>
                                <Td>
                                  <Text fontFamily="mono" fontSize="xs" bg="purple.100" p="2" borderRadius="md">
                                    {formula.expression || 'basic_salary + allowances - deductions'}
                                  </Text>
                                </Td>
                                <Td>
                                  <Text fontSize="sm" color="gray.600">
                                    {formula.description || 'معادلة حساب الراتب الشهري'}
                                  </Text>
                                </Td>
                                <Td>
                                  <HStack spacing="1">
                                    <Tooltip label="تعديل">
                                      <IconButton
                                        icon={<FiEdit />}
                                        size="xs"
                                        variant="ghost"
                                        colorScheme="purple"
                                      />
                                    </Tooltip>
                                    <Tooltip label="حذف">
                                      <IconButton
                                        icon={<FiTrash2 />}
                                        size="xs"
                                        variant="ghost"
                                        colorScheme="red"
                                      />
                                    </Tooltip>
                                  </HStack>
                                </Td>
                              </Tr>
                            ))
                          )}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </Box>
                  
                  {/* Monthly Salary Variables */}
                  <Box>
                    <Text fontSize="md" fontWeight="semibold" color="purple.600" mb="3">
                      متغيرات الراتب الشهري
                    </Text>
                    <TableContainer maxH={{ base: '50vh', md: '40vh' }} overflowY="auto" overflowX="auto" width="100%">
                      <Table variant="simple" size="md">
                        <Thead position="sticky" top="0" bg="var(--stake-bg-primary)" zIndex="1" boxShadow="var(--stake-shadow-sm)">
                          <Tr>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="variable_name">
                                اسم المتغير
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="key">
                                المفتاح
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="value">
                                القيمة
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="description">
                                الوصف
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th>
                              <ChakraEnglishKeyTooltip englishKey="actions">
                                الإجراءات
                              </ChakraEnglishKeyTooltip>
                            </Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {monthlyVariables.length === 0 ? (
                            <Tr>
                              <Td colSpan={5} textAlign="center" py="8">
                                <VStack spacing="2">
                                  <Icon as={FiTool} boxSize="8" className="stake-text-secondary" />
                                  <Text color="gray.500">لا توجد متغيرات للراتب الشهري</Text>
                                  <Text fontSize="sm" className="stake-text-secondary">
                                    اضغط على "إضافة متغير" لبدء إضافة المتغيرات
                                  </Text>
                                </VStack>
                              </Td>
                            </Tr>
                          ) : (
                            monthlyVariables.map((variable, index) => (
                              <Tr key={index}>
                                <Td fontWeight="medium">
                                  <Text>{variable.name || `متغير ${index + 1}`}</Text>
                                </Td>
                                <Td>
                                  <Text fontFamily="mono" fontSize="xs" bg="gray.100" p="2" borderRadius="md">
                                    {variable.key || 'monthly_var_' + (index + 1)}
                                  </Text>
                                </Td>
                                <Td>
                                  <Text fontFamily="mono" fontSize="xs" bg="purple.100" p="2" borderRadius="md">
                                    {variable.value || '0'}
                                  </Text>
                                </Td>
                                <Td>
                                  <Text fontSize="sm" color="gray.600">
                                    {variable.description || 'متغير للراتب الشهري'}
                                  </Text>
                                </Td>
                                <Td>
                                  <HStack spacing="1">
                                    <Tooltip label="تعديل">
                                      <IconButton
                                        icon={<FiEdit />}
                                        size="xs"
                                        variant="ghost"
                                        colorScheme="purple"
                                      />
                                    </Tooltip>
                                    <Tooltip label="حذف">
                                      <IconButton
                                        icon={<FiTrash2 />}
                                        size="xs"
                                        variant="ghost"
                                        colorScheme="red"
                                      />
                                    </Tooltip>
                                  </HStack>
                                </Td>
                              </Tr>
                            ))
                          )}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </Box>
                </VStack>
              </Box>
            )}
            
            {activeTabIndex === 4 && (
              <Box p="0">
                <VStack spacing="4" align="stretch">
                  {/* Header */}
                  <HStack justify="space-between" align="center">
                    <Text fontSize="lg" fontWeight="semibold" color="gray.700">
                      إدارة الربط بين الأعمدة والمعادلات
                    </Text>
                  </HStack>
                  
                  {/* Mappings Table */}
                  <Box>
                    <TableContainer maxH={{ base: '60vh', md: '50vh' }} overflowY="auto" overflowX="auto" width="100%" className="stake-table main-content">
                      <Table variant="simple" size="sm" style={{ tableLayout: 'fixed' }} className="stake-table main-content">
                        <Thead position="sticky" top="0" bg="var(--stake-bg-primary)" zIndex="1" boxShadow="var(--stake-shadow-sm)">
                          <Tr>
                            <Th width="5%">
                              <ChakraEnglishKeyTooltip englishKey="id">
                                المعرف
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th width="25%">
                              <ChakraEnglishKeyTooltip englishKey="column_name">
                                اسم العمود
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th width="25%">
                              <ChakraEnglishKeyTooltip englishKey="formula_name">
                                اسم المعادلة
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th width="15%">
                              <ChakraEnglishKeyTooltip englishKey="mapping_type">
                                نوع الربط
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th width="15%">
                              <ChakraEnglishKeyTooltip englishKey="status">
                                الحالة
                              </ChakraEnglishKeyTooltip>
                            </Th>
                            <Th width="15%">
                              <ChakraEnglishKeyTooltip englishKey="actions">
                                الإجراءات
                              </ChakraEnglishKeyTooltip>
                            </Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {mappings.length === 0 ? (
                            <Tr>
                              <Td colSpan={6} textAlign="center" py="8">
                                <VStack spacing="2">
                                  <Icon as={FiLink} boxSize="8" className="stake-text-secondary" />
                                  <Text color="gray.500">لا توجد روابط بين الأعمدة والمعادلات</Text>
                                  <Text fontSize="sm" className="stake-text-secondary">
                                    استخدم زر "ربط معادلة" في تبويب الأعمدة لإضافة روابط جديدة
                                  </Text>
                                </VStack>
                              </Td>
                            </Tr>
                          ) : (
                            mappings.map((mapping) => {
                              console.log('Mapping data:', mapping);
                              return (
                              <Tr key={mapping.id}>
                                <Td>
                                  <Text whiteSpace="normal" wordBreak="break-word" overflowWrap="break-word">
                                    {mapping.id}
                                  </Text>
                                </Td>
                                <Td fontWeight="medium">
                                  <ChakraEnglishKeyTooltip 
                                    englishKey="column_name"
                                    tooltipText={mapping.column_name || `column_${mapping.column_id}`}
                                  >
                                    <Text 
                                      whiteSpace="normal" 
                                      wordBreak="break-word" 
                                      overflowWrap="break-word"
                                      cursor="pointer"
                                      _hover={{ color: "blue.500", textDecoration: "underline" }}
                                      onClick={() => {
                                        // Determine which tab to switch to based on column category
                                        console.log('Column key:', mapping.column_name, 'Column name:', mapping.column_display_name_ar);
                                        
                                        // Always go to columns tab (index 1)
                                        handleTabChange(1);
                                      }}
                                      title="انقر للانتقال إلى العمود"
                                    >
                                      {mapping.column_display_name_ar || mapping.column_name || `عمود ${mapping.column_id}`}
                                    </Text>
                                  </ChakraEnglishKeyTooltip>
                                </Td>
                                <Td>
                                  <ChakraEnglishKeyTooltip 
                                    englishKey="formula_name"
                                    tooltipText={mapping.formula_key || `formula_${mapping.formula_id}`}
                                  >
                                    <Text 
                                      whiteSpace="normal" 
                                      wordBreak="break-word" 
                                      overflowWrap="break-word" 
                                      fontFamily="mono" 
                                      fontSize="xs" 
                                      bg="#2f4553" 
                                      color="white"
                                      p="2" 
                                      borderRadius="md"
                                      cursor="pointer"
                                      _hover={{ bg: "#3e5665" }}
                                      onClick={() => {
                                        // Determine which tab to switch to based on formula category
                                        console.log('Formula key:', mapping.formula_key, 'Formula name:', mapping.formula_display_name_ar);
                                        
                                        // Always go to formulas tab (index 2) and set appropriate filter
                                        handleTabChange(2);
                                        
                                        if (mapping.formula_key && (
                                          mapping.formula_key.includes('weekly') || 
                                          mapping.formula_key.includes('attendance_bonus') ||
                                          mapping.formula_key.includes('on_time_days') ||
                                          mapping.formula_key.includes('weekly_incentive') ||
                                          mapping.formula_key.includes('overtime_work') ||
                                          mapping.formula_key.includes('overtime_holiday')
                                        )) {
                                          setFormulaFilter('weekly');
                                        } else if (mapping.formula_key && (
                                          mapping.formula_key.includes('monthly') ||
                                          mapping.formula_key.includes('basic_monthly_salary') ||
                                          mapping.formula_key.includes('total_entitlements') ||
                                          mapping.formula_key.includes('total_deductions') ||
                                          mapping.formula_key.includes('net_salary') ||
                                          mapping.formula_key.includes('insurance_amount_weekly_monthly')
                                        )) {
                                          setFormulaFilter('monthly');
                                        } else {
                                          setFormulaFilter('general');
                                        }
                                        
                                        // Scroll to the specific formula after a short delay to allow tab change
                                        setTimeout(() => {
                                          if (mapping.formula_id && formulasTableRef.current) {
                                            const formulaElement = document.getElementById(`formula-${mapping.formula_id}`);
                                            if (formulaElement) {
                                              formulaElement.scrollIntoView({ 
                                                behavior: 'smooth', 
                                                block: 'center' 
                                              });
                                              // Highlight the row temporarily
                                              formulaElement.style.backgroundColor = '#3e5665';
                                              setTimeout(() => {
                                                formulaElement.style.backgroundColor = '';
                                              }, 2000);
                                            }
                                          }
                                        }, 300);
                                      }}
                                      title="انقر للانتقال إلى المعادلة"
                                    >
                                      {mapping.formula_display_name_ar || mapping.formula_name || mapping.formula_key || `معادلة ${mapping.formula_id}`}
                                    </Text>
                                  </ChakraEnglishKeyTooltip>
                                </Td>
                                <Td>
                                  <Badge colorScheme={mapping.mapping_type === 'calculation' ? 'green' : 'blue'}>
                                    {mapping.mapping_type === 'calculation' ? 'حساب تلقائي' : 'عرض فقط'}
                                  </Badge>
                                </Td>
                                <Td>
                                  <Badge colorScheme={mapping.is_active === 1 ? 'green' : 'red'}>
                                    {mapping.is_active === 1 ? 'نشط' : 'غير نشط'}
                                  </Badge>
                                </Td>
                                <Td>
                                  <HStack spacing="1">
                                    <Tooltip label="حذف">
                                      <IconButton
                                        icon={<FiTrash2 />}
                                        size="xs"
                                        variant="ghost"
                                        colorScheme="red"
                                        onClick={() => {
                                          if (window.confirm(`هل أنت متأكد من حذف الربط بين "${mapping.column_name}" و "${mapping.formula_name}"؟`)) {
                                            deleteMapping(mapping.id);
                                          }
                                        }}
                                      />
                                    </Tooltip>
                                  </HStack>
                                </Td>
                              </Tr>
                              );
                            })
                          )}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </Box>
                </VStack>
              </Box>
            )}
          </Box>
        </Box>
      </HStack>

      {/* Modals */}
      
      {/* Table Modal */}
      <Modal isOpen={isTableModalOpen} onClose={onTableModalClose} size="lg">
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
            borderRadius="24px 24px 0 0" 
            p="4" 
            position="relative" 
            boxShadow="0 4px 20px rgba(0, 0, 0, 0.4)"
          >
            <HStack justify="space-between" align="center" w="100%">
              <HStack spacing="3">
                <Icon as={FiDatabase} boxSize="5" />
                <Text fontSize="md" fontWeight="bold" color="white">
                  {selectedTable ? 'تعديل الجدول' : 'إضافة جدول جديد'}
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
          <ModalBody p="8">
            <VStack spacing="4">
              <FormControl>
                <FormLabel className="stake-label">اسم الجدول (إنجليزي)</FormLabel>
                <Input
                  placeholder="table_name"
                  value={selectedTable?.table_name || ''}
                  className="stake-input"
                />
              </FormControl>
              <FormControl>
                <FormLabel className="stake-label">اسم الجدول (عربي)</FormLabel>
                <Input
                  placeholder="اسم الجدول بالعربية"
                  value={selectedTable?.display_name_ar || ''}
                  className="stake-input"
                />
              </FormControl>
              <FormControl>
                <FormLabel className="stake-label">الوصف</FormLabel>
                <Input
                  placeholder="وصف الجدول"
                  value={selectedTable?.description_ar || ''}
                  className="stake-input"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter 
            bg="var(--stake-bg-primary, #0f212e)" 
            borderRadius="0 0 24px 24px" 
            p="4" 
            borderTop="1px solid" 
            borderColor="var(--stake-border-primary, #2f4553)"
          >
            <Button className="stake-btn-secondary" mr={3} onClick={onTableModalClose}>
              إلغاء
            </Button>
            <Button className="stake-btn-success" onClick={handleSaveTable}>
              {selectedTable ? 'تحديث' : 'إنشاء'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Column Modal */}
      <Modal isOpen={isColumnModalOpen} onClose={onColumnModalClose} size="lg">
        <ModalOverlay />
        <ModalContent bg="var(--stake-bg-primary)" border="1px solid" borderColor="var(--stake-border)">
          <ModalHeader bg="var(--stake-bg-secondary)" color="var(--stake-text-primary)">
            {selectedColumn ? 'تعديل العمود' : 'إضافة عمود جديد'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="4">
              <FormControl>
                <FormLabel>الجدول</FormLabel>
                <Select 
                  placeholder="اختر الجدول"
                  value={columnForm.table_id}
                  onChange={(e) => setColumnForm({...columnForm, table_id: e.target.value})}
                >
                  {tables.map(table => (
                    <option key={table.id} value={table.id}>
                      {table.display_name_ar || table.table_name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>اسم العمود (إنجليزي)</FormLabel>
                <Input
                  placeholder="column_name"
                  value={columnForm.column_name}
                  onChange={(e) => setColumnForm({...columnForm, column_name: e.target.value})}
                />
              </FormControl>
              <FormControl>
                <FormLabel>اسم العمود (عربي)</FormLabel>
                <Input
                  placeholder="اسم العمود بالعربية"
                  value={columnForm.display_name_ar}
                  onChange={(e) => setColumnForm({...columnForm, display_name_ar: e.target.value})}
                />
              </FormControl>
              <FormControl>
                <FormLabel>نوع البيانات</FormLabel>
                <Select
                  value={columnForm.data_type}
                  onChange={(e) => setColumnForm({...columnForm, data_type: e.target.value})}
                >
                  <option value="text">نص</option>
                  <option value="number">رقم</option>
                  <option value="currency">عملة</option>
                  <option value="date">تاريخ</option>
                  <option value="boolean">نعم/لا</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>نوع التعديل</FormLabel>
                <Select
                  value={columnForm.edit_type}
                  onChange={(e) => setColumnForm({...columnForm, edit_type: e.target.value})}
                >
                  <option value="input">حقل نص</option>
                  <option value="select">قائمة منسدلة</option>
                  <option value="textarea">نص طويل</option>
                  <option value="number">رقم</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>القيمة الافتراضية</FormLabel>
                <Input
                  placeholder="القيمة الافتراضية"
                  value={columnForm.default_value}
                  onChange={(e) => setColumnForm({...columnForm, default_value: e.target.value})}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onColumnModalClose}>
              إلغاء
            </Button>
            <Button colorScheme="blue" bg="blue.500" color="white" _hover={{ bg: "blue.600" }} onClick={saveColumn}>
              {selectedColumn ? 'تحديث' : 'إنشاء'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Formula Modal */}
      <Modal isOpen={isFormulaModalOpen} onClose={onFormulaModalClose} size="lg" isCentered>
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
              <Text fontSize="lg" fontWeight="bold" color="white">
                {selectedFormula ? 'تعديل المعادلة' : 'إضافة معادلة جديدة'}
              </Text>
              <HStack spacing="6" align="center" justify="center">
                <HStack spacing="2">
                  <Icon as={FiCode} color="blue.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">المعادلات الديناميكية</Text>
                </HStack>
                <HStack spacing="2">
                  <Icon as={FiSettings} color="green.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">إدارة النظام</Text>
                </HStack>
                <HStack spacing="2">
                  <Icon as={FiTool} color="purple.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">المتغيرات</Text>
                </HStack>
              </HStack>
              
              {/* زر الحفظ في الزاوية اليمنى العلوية */}
              <IconButton
                aria-label={selectedFormula ? 'تحديث المعادلة' : 'إنشاء المعادلة'}
                icon={<FiSave />}
                bg="var(--stake-bg-primary, #0f212e)"
                color="white"
                size="sm"
                position="absolute"
                top="2"
                right="2"
                border="1px solid"
                borderColor="rgba(255, 255, 255, 0.2)"
                _hover={{
                  bg: "#1a2f3d",
                  borderColor: "rgba(255, 255, 255, 0.3)",
                  transform: "translateY(-1px)",
                  boxShadow: "0 4px 12px rgba(15, 33, 46, 0.4)"
                }}
                _active={{
                  transform: "translateY(0)"
                }}
                onClick={saveFormula}
              />
              
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
          <ModalBody p="6">
            <VStack spacing="4">
              {/* الصف الأول: مفتاح المعادلة والوصف */}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4" w="full">
                <FormControl>
                  <FormLabel 
                    fontSize="sm" 
                    fontWeight="semibold" 
                    color="gray.700"
                    mb="2"
                  >
                    مفتاح المعادلة
                  </FormLabel>
                <Input
                  placeholder="formula_key"
                  value={formulaForm.formula_key}
                  onChange={(e) => setFormulaForm({ ...formulaForm, formula_key: e.target.value })}
                  bg="gray.100"
                  border="2px solid"
                  borderColor="gray.300"
                  borderRadius="lg"
                  color="gray.800"
                  _focus={{
                    borderColor: "#0f212e",
                    boxShadow: "0 0 0 3px rgba(15, 33, 46, 0.2)",
                    bg: "white",
                    color: "gray.900"
                  }}
                  _hover={{
                    borderColor: "gray.400",
                    bg: "gray.50"
                  }}
                />
                </FormControl>
                
                <FormControl>
                  <FormLabel 
                    fontSize="sm" 
                    fontWeight="semibold" 
                    color="gray.700"
                    mb="2"
                  >
                    الوصف
                  </FormLabel>
                  <Input
                    placeholder="وصف المعادلة"
                    value={formulaForm.description_ar}
                    onChange={(e) => setFormulaForm({ ...formulaForm, description_ar: e.target.value })}
                    bg="gray.100"
                    border="2px solid"
                    borderColor="gray.300"
                    borderRadius="lg"
                    color="gray.800"
                    _focus={{
                      borderColor: "#0f212e",
                      boxShadow: "0 0 0 3px rgba(15, 33, 46, 0.2)",
                      bg: "white",
                      color: "gray.900"
                    }}
                    _hover={{
                      borderColor: "gray.400",
                      bg: "gray.50"
                    }}
                  />
                </FormControl>
              </SimpleGrid>
              
              {/* الصف الثاني: أسماء المعادلة */}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4" w="full">
                <FormControl>
                  <FormLabel 
                    fontSize="sm" 
                    fontWeight="semibold" 
                    color="gray.700"
                    mb="2"
                  >
                    اسم المعادلة (عربي)
                  </FormLabel>
                  <Input
                    placeholder="اسم المعادلة بالعربية"
                    value={formulaForm.formula_name_ar}
                    onChange={(e) => setFormulaForm({ ...formulaForm, formula_name_ar: e.target.value })}
                    bg="gray.100"
                    border="2px solid"
                    borderColor="gray.300"
                    borderRadius="lg"
                    color="gray.800"
                    _focus={{
                      borderColor: "#0f212e",
                      boxShadow: "0 0 0 3px rgba(15, 33, 46, 0.2)",
                      bg: "white",
                      color: "gray.900"
                    }}
                    _hover={{
                      borderColor: "gray.400",
                      bg: "gray.50"
                    }}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel 
                    fontSize="sm" 
                    fontWeight="semibold" 
                    color="gray.700"
                    mb="2"
                  >
                    اسم المعادلة (إنجليزي)
                  </FormLabel>
                  <Input
                    placeholder="Formula Name"
                    value={formulaForm.formula_name_en}
                    onChange={(e) => setFormulaForm({ ...formulaForm, formula_name_en: e.target.value })}
                    bg="gray.50"
                    border="2px solid"
                    borderColor="gray.200"
                    borderRadius="lg"
                    _focus={{
                      borderColor: "#0f212e",
                      boxShadow: "0 0 0 3px rgba(15, 33, 46, 0.1)",
                      bg: "white"
                    }}
                    _hover={{
                      borderColor: "gray.300"
                    }}
                  />
                </FormControl>
              </SimpleGrid>
              
              {/* الصف الثالث: المعادلة */}
              <FormControl>
                <FormLabel 
                  fontSize="sm" 
                  fontWeight="semibold" 
                  color="gray.700"
                  mb="2"
                >
                  المعادلة
                </FormLabel>
                <Textarea
                  placeholder="base_salary + overtime_pay"
                  value={formulaForm.formula_expression}
                  onChange={(e) => setFormulaForm({ ...formulaForm, formula_expression: e.target.value })}
                  bg="gray.50"
                  border="2px solid"
                  borderColor="gray.200"
                  borderRadius="lg"
                  fontFamily="mono"
                  fontSize="sm"
                  minH="80px"
                  resize="vertical"
                  _focus={{
                    borderColor: "#0f212e",
                    boxShadow: "0 0 0 3px rgba(15, 33, 46, 0.1)",
                    bg: "white"
                  }}
                  _hover={{
                    borderColor: "gray.300"
                  }}
                />
              </FormControl>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Link Formula Modal */}
      <Modal isOpen={isLinkFormulaModalOpen} onClose={onLinkFormulaModalClose} size="lg">
        <ModalOverlay />
        <ModalContent bg="var(--stake-bg-primary)" border="1px solid" borderColor="var(--stake-border)">
          <ModalHeader bg="var(--stake-bg-secondary)" color="var(--stake-text-primary)">
            ربط معادلة بالعمود: {selectedColumnForMapping?.display_name_ar}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="4">
              <FormControl>
                <FormLabel>العمود</FormLabel>
                <Input
                  value={selectedColumnForMapping?.display_name_ar || ''}
                  isReadOnly
                  bg="gray.50"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>المعادلة</FormLabel>
                <Select
                  placeholder="اختر المعادلة"
                  value={linkForm.formula_id}
                  onChange={(e) => setLinkForm({ ...linkForm, formula_id: e.target.value })}
                >
                  {formulas.map((formula) => (
                    <option key={formula.id} value={formula.id}>
                      {formula.formula_name_ar || formula.name} - {formula.formula_key || formula.key}
                    </option>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>الحساب التلقائي</FormLabel>
                <Switch
                  isChecked={linkForm.is_auto_calculate}
                  onChange={(e) => setLinkForm({ ...linkForm, is_auto_calculate: e.target.checked })}
                />
                <FormHelperText>
                  إذا كان مفعلاً، سيتم حساب قيمة العمود تلقائياً باستخدام المعادلة
                </FormHelperText>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onLinkFormulaModalClose}>
              إلغاء
            </Button>
            <Button colorScheme="green" bg="green.500" color="white" _hover={{ bg: "green.600" }} onClick={saveColumnMapping}>
              ربط المعادلة
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Variable Modal */}
      <Modal isOpen={isVariableModalOpen} onClose={onVariableModalClose} size="lg" isCentered>
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
              <Text fontSize="lg" fontWeight="bold" color="white">
                {selectedVariable ? 'تعديل المتغير' : 'إضافة متغير جديد'}
              </Text>
              <HStack spacing="6" align="center" justify="center">
                <HStack spacing="2">
                  <Icon as={FiTool} color="blue.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">المتغيرات الديناميكية</Text>
                </HStack>
                <HStack spacing="2">
                  <Icon as={FiSettings} color="green.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">إدارة النظام</Text>
                </HStack>
                <HStack spacing="2">
                  <Icon as={FiCode} color="purple.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">المعادلات</Text>
                </HStack>
              </HStack>
              
              {/* زر الحفظ في الزاوية اليمنى العلوية */}
              <IconButton
                aria-label={selectedVariable ? 'تحديث المتغير' : 'إنشاء المتغير'}
                icon={<FiSave />}
                bg="var(--stake-bg-primary, #0f212e)"
                color="white"
                size="sm"
                position="absolute"
                top="2"
                right="2"
                border="1px solid"
                borderColor="rgba(255, 255, 255, 0.2)"
                _hover={{
                  bg: "#1a2f3d",
                  borderColor: "rgba(255, 255, 255, 0.3)",
                  transform: "translateY(-1px)",
                  boxShadow: "0 4px 12px rgba(15, 33, 46, 0.4)"
                }}
                _active={{
                  transform: "translateY(0)"
                }}
                onClick={saveVariable}
              />
              
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
          <ModalBody p="6">
            <VStack spacing="4">
              {/* الصف الأول: مفتاح المتغير والوصف */}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4" w="full">
                <FormControl>
                  <FormLabel 
                    fontSize="sm" 
                    fontWeight="semibold" 
                    color="gray.700"
                    mb="2"
                  >
                    مفتاح المتغير
                  </FormLabel>
                  <Input
                    placeholder="variable_key"
                    value={variableForm.variable_key}
                    onChange={(e) => setVariableForm({ ...variableForm, variable_key: e.target.value })}
                    bg="gray.100"
                    border="2px solid"
                    borderColor="gray.300"
                    borderRadius="lg"
                    color="gray.800"
                    _focus={{
                      borderColor: "#0f212e",
                      boxShadow: "0 0 0 3px rgba(15, 33, 46, 0.2)",
                      bg: "white",
                      color: "gray.900"
                    }}
                    _hover={{
                      borderColor: "gray.400",
                      bg: "gray.50"
                    }}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel 
                    fontSize="sm" 
                    fontWeight="semibold" 
                    color="gray.700"
                    mb="2"
                  >
                    الوصف
                  </FormLabel>
                  <Input
                    placeholder="وصف المتغير"
                    value={variableForm.description_ar}
                    onChange={(e) => setVariableForm({ ...variableForm, description_ar: e.target.value })}
                    bg="gray.100"
                    border="2px solid"
                    borderColor="gray.300"
                    borderRadius="lg"
                    color="gray.800"
                    _focus={{
                      borderColor: "#0f212e",
                      boxShadow: "0 0 0 3px rgba(15, 33, 46, 0.2)",
                      bg: "white",
                      color: "gray.900"
                    }}
                    _hover={{
                      borderColor: "gray.400",
                      bg: "gray.50"
                    }}
                  />
                </FormControl>
              </SimpleGrid>
              
              {/* الصف الثاني: أسماء المتغير */}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4" w="full">
                <FormControl>
                  <FormLabel 
                    fontSize="sm" 
                    fontWeight="semibold" 
                    color="gray.700"
                    mb="2"
                  >
                    اسم المتغير (عربي)
                  </FormLabel>
                  <Input
                    placeholder="اسم المتغير بالعربية"
                    value={variableForm.variable_name_ar}
                    onChange={(e) => setVariableForm({ ...variableForm, variable_name_ar: e.target.value })}
                    bg="gray.100"
                    border="2px solid"
                    borderColor="gray.300"
                    borderRadius="lg"
                    color="gray.800"
                    _focus={{
                      borderColor: "#0f212e",
                      boxShadow: "0 0 0 3px rgba(15, 33, 46, 0.2)",
                      bg: "white",
                      color: "gray.900"
                    }}
                    _hover={{
                      borderColor: "gray.400",
                      bg: "gray.50"
                    }}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel 
                    fontSize="sm" 
                    fontWeight="semibold" 
                    color="gray.700"
                    mb="2"
                  >
                    اسم المتغير (إنجليزي)
                  </FormLabel>
                  <Input
                    placeholder="Variable Name"
                    value={variableForm.variable_name_en}
                    onChange={(e) => setVariableForm({ ...variableForm, variable_name_en: e.target.value })}
                    bg="gray.100"
                    border="2px solid"
                    borderColor="gray.300"
                    borderRadius="lg"
                    color="gray.800"
                    _focus={{
                      borderColor: "#0f212e",
                      boxShadow: "0 0 0 3px rgba(15, 33, 46, 0.2)",
                      bg: "white",
                      color: "gray.900"
                    }}
                    _hover={{
                      borderColor: "gray.400",
                      bg: "gray.50"
                    }}
                  />
                </FormControl>
              </SimpleGrid>
              
              {/* الصف الثالث: قيمة المتغير */}
              <FormControl>
                <FormLabel 
                  fontSize="sm" 
                  fontWeight="semibold" 
                  color="gray.700"
                  mb="2"
                >
                  قيمة المتغير
                </FormLabel>
                <Input
                  placeholder="قيمة المتغير"
                  value={variableForm.variable_value}
                  onChange={(e) => setVariableForm({ ...variableForm, variable_value: e.target.value })}
                  bg="gray.100"
                  border="2px solid"
                  borderColor="gray.300"
                  borderRadius="lg"
                  color="gray.800"
                  fontFamily="mono"
                  _focus={{
                    borderColor: "#0f212e",
                    boxShadow: "0 0 0 3px rgba(15, 33, 46, 0.2)",
                    bg: "white",
                    color: "gray.900"
                  }}
                  _hover={{
                    borderColor: "gray.400",
                    bg: "gray.50"
                  }}
                />
              </FormControl>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Quick Link Formula Modal */}
      <Modal isOpen={quickLinkModal.isOpen} onClose={() => setQuickLinkModal({ isOpen: false, column: null, currentMapping: null })} size="4xl" isCentered>
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
                {quickLinkModal.currentMapping ? 'تغيير المعادلة' : 'ربط معادلة'}
              </Text>
              
              <HStack spacing="6" align="center" flex="1" justify="center">
                <HStack spacing="2">
                  <Icon as={FiSettings} color="blue.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">
                    العمود: {quickLinkModal.column?.column_name}
                  </Text>
                </HStack>
                <HStack spacing="2">
                  <Icon as={FiCode} color="green.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">
                    النوع: {quickLinkModal.column?.data_type}
                  </Text>
                </HStack>
                {quickLinkModal.currentMapping && (
                  <HStack spacing="2">
                    <Icon as={FiLink} color="purple.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">
                      الحالي: {quickLinkModal.currentMapping.formula_key}
                    </Text>
                  </HStack>
                )}
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
          <ModalBody p="6">
            <VStack spacing="6" align="stretch">
              {quickLinkModal.currentMapping && (
                <Box p="4" bg="var(--stake-bg-secondary)" borderRadius="lg" border="1px solid" borderColor="var(--stake-border)">
                  <HStack spacing="3" align="center">
                    <Icon as={FiInfo} color="blue.400" boxSize="5" />
                    <VStack align="flex-start" spacing="1">
                      <Text fontSize="sm" fontWeight="medium" color="var(--stake-text-primary)">المعادلة الحالية:</Text>
                      <Badge colorScheme="purple" variant="solid" fontSize="sm">
                        {quickLinkModal.currentMapping.formula_key}
                      </Badge>
                    </VStack>
                  </HStack>
                </Box>
              )}
              
                <Box p="4" bg="var(--stake-bg-secondary)" borderRadius="lg" border="1px solid" borderColor="var(--stake-border)">
                  <HStack spacing="3" align="center" mb="4">
                    <Icon as={FiSearch} color="green.400" boxSize="5" />
                    <Text fontSize="md" fontWeight="medium" color="var(--stake-text-primary)">اختر المعادلة الجديدة</Text>
                  </HStack>
                  <Button
                    leftIcon={<FiSearch />}
                    colorScheme="blue"
                    variant="outline"
                    size="lg"
                    w="100%"
                    h="50px"
                    onClick={() => {
                      setAdvancedSearchModal({ isOpen: true, selectedFormula: null });
                    }}
                  >
                    بحث متقدم في المعادلات
                  </Button>
                </Box>

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
              {quickLinkModal.currentMapping && (
                <Button
                  leftIcon={<FiTrash2 />}
                  h="48px"
                  px="8"
                  fontWeight="600"
                  colorScheme="red"
                  variant="outline"
                  borderColor="red.400"
                  color="red.400"
                  _hover={{
                    bg: "red.500",
                    color: "white",
                    borderColor: "red.500"
                  }}
                  onClick={() => {
                    // فك الربط
                    deleteMapping(quickLinkModal.currentMapping.id);
                    setQuickLinkModal({ isOpen: false, column: null, currentMapping: null });
                  }}
                >
                  فك الربط
                </Button>
              )}
              <Button
                leftIcon={<FiSave />}
                h="48px"
                px="8"
                fontWeight="600"
                colorScheme="blue"
                bg="blue.500"
                color="white"
                _hover={{
                  bg: "blue.600"
                }}
                onClick={async () => {
                  // حفظ الربط الجديد
                  if (selectedFormulaId && quickLinkModal.column) {
                    try {
                      const payload = {
                        action: quickLinkModal.currentMapping ? 'update_column_formula_mapping' : 'create_column_formula_mapping',
                        column_id: quickLinkModal.column.id,
                        formula_id: selectedFormulaId,
                        is_auto_calculate: 1
                      };

                      if (quickLinkModal.currentMapping) {
                        payload.mapping_id = quickLinkModal.currentMapping.id;
                      }

                      const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php'), {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload)
                      });

                      const result = await response.json();
                      
                      if (result.success) {
                        toast({
                          title: 'تم الحفظ بنجاح',
                          description: 'تم ربط المعادلة بالعمود',
                          status: 'success',
                          duration: 3000,
                          isClosable: true,
                        });
                        loadColumnMappings();
                      } else {
                        toast({
                          title: 'خطأ في الحفظ',
                          description: result.message || 'حدث خطأ غير متوقع',
                          status: 'error',
                          duration: 3000,
                          isClosable: true,
                        });
                      }
                    } catch (error) {
                      console.error('Error saving mapping:', error);
                      toast({
                        title: 'خطأ في الحفظ',
                        description: 'حدث خطأ في الاتصال',
                        status: 'error',
                        duration: 3000,
                        isClosable: true,
                      });
                    }
                  }
                  
                  setQuickLinkModal({ isOpen: false, column: null, currentMapping: null });
                  setSelectedFormulaId('');
                  setFormulaSearchQuery('');
                }}
              >
                حفظ التغييرات
              </Button>
            </HStack>
          </ModalFooter>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Advanced Search Modal */}
      <Modal isOpen={advancedSearchModal.isOpen} onClose={() => setAdvancedSearchModal({ isOpen: false, selectedFormula: null })} size="full" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.8)" backdropFilter="blur(10px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" maxH="95vh" overflow="hidden">
          <ModalHeader
            bg="var(--stake-bg-primary, #0f212e)"
            color="white"
            p="6"
            position="relative"
            boxShadow="0 4px 20px rgba(0, 0, 0, 0.4)"
          >
            <VStack spacing="4" align="center" w="100%" position="relative">
              <IconButton
                aria-label="إغلاق"
                icon={<FiX />}
                size="sm"
                colorScheme="red"
                bg="red.500"
                color="white"
                position="absolute"
                top="2"
                right="2"
                _hover={{ bg: "red.600" }}
                onClick={() => setAdvancedSearchModal({ isOpen: false, selectedFormula: null })}
              />
              <Text fontSize="2xl" fontWeight="bold" color="white">
                البحث المتقدم في المعادلات
              </Text>
              <HStack spacing="6" align="center" justify="center">
                <HStack spacing="2">
                  <Icon as={FiSearch} color="blue.300" boxSize="5" />
                  <Text fontSize="sm" className="stake-text-secondary">البحث في جميع المعادلات</Text>
                </HStack>
                <HStack spacing="2">
                  <Icon as={FiCode} color="green.300" boxSize="5" />
                  <Text fontSize="sm" className="stake-text-secondary">عرض تفصيلي</Text>
                </HStack>
              </HStack>
            </VStack>
          </ModalHeader>
          <ModalBody p="6" overflowY="auto">
            <VStack spacing="6" align="stretch">
              {/* Search Input */}
              <Box p="4" bg="var(--stake-bg-secondary)" borderRadius="lg" border="1px solid" borderColor="var(--stake-border)">
                <HStack spacing="3" align="center" mb="4">
                  <Icon as={FiSearch} color="green.400" boxSize="5" />
                  <Text fontSize="md" fontWeight="medium" color="var(--stake-text-primary)">ابحث في المعادلات</Text>
                </HStack>
                <Input
                  placeholder="ابحث بالاسم الإنجليزي أو العربي أو الوصف..."
                  size="lg"
                  bg="var(--stake-bg-primary)"
                  border="2px solid"
                  borderColor="var(--stake-border)"
                  borderRadius="lg"
                  color="var(--stake-text-primary)"
                  value={formulaSearchQuery}
                  onChange={(e) => setFormulaSearchQuery(e.target.value)}
                  _focus={{
                    borderColor: "#0f212e",
                    boxShadow: "0 0 0 3px rgba(15, 33, 46, 0.2)",
                    bg: "var(--stake-bg-primary)"
                  }}
                  _hover={{
                    borderColor: "var(--stake-border-hover)"
                  }}
                />
              </Box>

              {/* Formulas Grid */}
              <Box>
                <Text fontSize="lg" fontWeight="bold" color="var(--stake-text-primary)" mb="4">
                  جميع المعادلات ({formulas.filter(formula => {
                    if (!formulaSearchQuery.trim()) return true;
                    const searchTerm = formulaSearchQuery.toLowerCase();
                    return (
                      (formula.formula_name_ar && formula.formula_name_ar.toLowerCase().includes(searchTerm)) ||
                      (formula.formula_name_en && formula.formula_name_en.toLowerCase().includes(searchTerm)) ||
                      (formula.formula_key && formula.formula_key.toLowerCase().includes(searchTerm)) ||
                      (formula.formula_expression && formula.formula_expression.toLowerCase().includes(searchTerm)) ||
                      (formula.description_ar && formula.description_ar.toLowerCase().includes(searchTerm)) ||
                      (formula.description_en && formula.description_en.toLowerCase().includes(searchTerm))
                    );
                  }).length})
                </Text>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing="4">
                  {formulas.filter(formula => {
                    if (!formulaSearchQuery.trim()) return true;
                    const searchTerm = formulaSearchQuery.toLowerCase();
                    return (
                      (formula.formula_name_ar && formula.formula_name_ar.toLowerCase().includes(searchTerm)) ||
                      (formula.formula_name_en && formula.formula_name_en.toLowerCase().includes(searchTerm)) ||
                      (formula.formula_key && formula.formula_key.toLowerCase().includes(searchTerm)) ||
                      (formula.formula_expression && formula.formula_expression.toLowerCase().includes(searchTerm)) ||
                      (formula.description_ar && formula.description_ar.toLowerCase().includes(searchTerm)) ||
                      (formula.description_en && formula.description_en.toLowerCase().includes(searchTerm))
                    );
                  }).map((formula) => (
                    <Box
                      key={formula.id}
                      p="4"
                      cursor="pointer"
                      border="1px solid"
                      borderColor="var(--stake-border)"
                      borderRadius="lg"
                      bg="var(--stake-bg-secondary)"
                      transition="all 0.3s"
                      _hover={{
                        bg: "var(--stake-bg-primary)",
                        borderColor: "blue.400",
                        transform: "translateY(-2px)",
                        boxShadow: "lg"
                      }}
                      onClick={() => {
                        setAdvancedSearchModal({ isOpen: false, selectedFormula: formula });
                        setSelectedFormulaId(formula.id);
                        setFormulaSearchQuery(`${formula.formula_key} - ${formula.formula_name_ar}`);
                      }}
                    >
                      <VStack align="flex-start" spacing="3">
                        <HStack justify="space-between" w="100%">
                          <Badge colorScheme="blue" variant="solid" fontSize="xs">
                            {formula.formula_type || 'عام'}
                          </Badge>
                          <Text fontSize="xs" color="var(--stake-text-muted)">
                            ID: {formula.id}
                          </Text>
                        </HStack>
                        
                        <VStack align="flex-start" spacing="2" w="100%">
                          <Text fontSize="sm" fontWeight="bold" color="var(--stake-text-primary)">
                            {formula.formula_key}
                          </Text>
                          <Text fontSize="sm" color="var(--stake-text-primary)" noOfLines={2}>
                            {formula.formula_name_ar}
                          </Text>
                          {formula.description_ar && (
                            <Text fontSize="xs" color="var(--stake-text-muted)" noOfLines={2}>
                              {formula.description_ar}
                            </Text>
                          )}
                        </VStack>

                        <HStack justify="space-between" w="100%" pt="2" borderTop="1px solid" borderColor="var(--stake-border)">
                          <Text fontSize="xs" color="var(--stake-text-muted)">
                            {formula.created_at ? new Date(formula.created_at).toLocaleDateString('ar-EG') : 'غير محدد'}
                          </Text>
                          <Text fontSize="xs" color="green.400" fontWeight="medium">
                            اضغط للاختيار
                          </Text>
                        </HStack>
                      </VStack>
                    </Box>
                  ))}
                </SimpleGrid>
              </Box>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default PremiumDynamicSystemManager;

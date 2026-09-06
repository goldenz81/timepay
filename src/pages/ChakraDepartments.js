import React, { useState, useEffect, useMemo } from 'react';
import { getApiUrl } from '../utils/apiUrlHelper';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Circle,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Card,
  CardHeader,
  CardBody,
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
  useDisclosure,
  useToast,
  useColorModeValue,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Badge,
  IconButton,
  Tooltip,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
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
  Switch,
  Portal,
} from '@chakra-ui/react';
import {
  FiSearch,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiEye,
  FiMoreVertical,
  FiRefreshCw,
  FiBriefcase,
  FiUsers,
  FiDollarSign,
  FiMapPin,
  FiUser,
  FiCheck,
  FiX,
  FiTrendingUp,
  FiTrendingDown,
  FiChevronUp,
  FiChevronDown,
  FiTarget,
  FiCalendar,
} from 'react-icons/fi';
import { useForm, Controller } from 'react-hook-form';
import EnglishKeyTooltip from '../components/EnglishKeyTooltip';
import { useDepartmentsToolbar } from '../contexts/DepartmentsToolbarContext';
import PagePanelToggle from '../components/PagePanelToggle';

const ChakraDepartments = () => {
  const { filtersCollapsed, toggleFiltersCollapsed } = useDepartmentsToolbar();
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [filteredCostCenters, setFilteredCostCenters] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedCostCenter, setSelectedCostCenter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [costCenterLoading, setCostCenterLoading] = useState(false);
  
  // No search/filters for this premium simplified view
  
  // Modals
  const { isOpen: isAddDeptOpen, onOpen: onAddDeptOpen, onClose: onAddDeptClose } = useDisclosure();
  const { isOpen: isEditDeptOpen, onOpen: onEditDeptOpen, onClose: onEditDeptClose } = useDisclosure();
  const { isOpen: isViewDeptOpen, onOpen: onViewDeptOpen, onClose: onViewDeptClose } = useDisclosure();
  const { isOpen: isAddCostOpen, onOpen: onAddCostOpen, onClose: onAddCostClose } = useDisclosure();
  const { isOpen: isEditCostOpen, onOpen: onEditCostOpen, onClose: onEditCostClose } = useDisclosure();
  const { isOpen: isViewCostOpen, onOpen: onViewCostOpen, onClose: onViewCostClose } = useDisclosure();
  const { isOpen: isDeleteAlertOpen, onOpen: onDeleteAlertOpen, onClose: onDeleteAlertClose } = useDisclosure();
  
  const [deleteTarget, setDeleteTarget] = useState(null); // {type: 'department' | 'cost_center', id: number}
  const cancelRef = React.useRef();
  
  const toast = useToast();
  
  // Form handling
  const { register: deptRegister, handleSubmit: handleDeptSubmit, reset: resetDept, setValue: setDeptValue, control: deptControl, formState: { errors: deptErrors } } = useForm();
  const { register: costRegister, handleSubmit: handleCostSubmit, reset: resetCost, setValue: setCostValue, control: costControl, watch: costWatch, formState: { errors: costErrors } } = useForm();
  
  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.400');
  const headerBg = useColorModeValue('gray.50', 'gray.700');
  
  // Responsive breakpoints
  const isMobile = useBreakpointValue({ base: true, lg: false });

  // Tab state to track which tab is active
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Columns config with localStorage persistence
  const defaultDeptColumns = [
    { id: 'name', label: 'الاسم', visible: true },
    { id: 'description', label: 'الوصف', visible: true },
    { id: 'manager', label: 'المدير', visible: true },
    { id: 'location', label: 'الموقع', visible: true },
    { id: 'employee_count', label: 'عدد الموظفين', visible: true },
    { id: 'status', label: 'الحالة', visible: true },
    { id: 'actions', label: 'الإجراءات', visible: true },
  ];
  const defaultCostColumns = [
    { id: 'name', label: 'الاسم', visible: true },
    { id: 'description', label: 'الوصف', visible: true },
    { id: 'color', label: 'اللون', visible: true },
    { id: 'department_name', label: 'القسم', visible: true },
    { id: 'created_at', label: 'تاريخ الإنشاء', visible: true },
    { id: 'actions', label: 'الإجراءات', visible: true },
  ];

  const [deptColumns, setDeptColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('deptColumns');
      return saved ? JSON.parse(saved) : defaultDeptColumns;
    } catch {
      return defaultDeptColumns;
    }
  });

  const [costColumns, setCostColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('costColumns');
      return saved ? JSON.parse(saved) : defaultCostColumns;
    } catch {
      return defaultCostColumns;
    }
  });

  useEffect(() => {
    localStorage.setItem('deptColumns', JSON.stringify(deptColumns));
  }, [deptColumns]);

  useEffect(() => {
    localStorage.setItem('costColumns', JSON.stringify(costColumns));
  }, [costColumns]);

  const toggleDeptColumn = (id) => {
    setDeptColumns(cols => cols.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };
  const moveDeptColumn = (id, direction) => {
    setDeptColumns(cols => {
      const idx = cols.findIndex(c => c.id === id);
      if (idx < 0) return cols;
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= cols.length) return cols;
      const newCols = [...cols];
      const tmp = newCols[idx];
      newCols[idx] = newCols[swapWith];
      newCols[swapWith] = tmp;
      return newCols;
    });
  };

  const toggleCostColumn = (id) => {
    setCostColumns(cols => cols.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };
  const moveCostColumn = (id, direction) => {
    setCostColumns(cols => {
      const idx = cols.findIndex(c => c.id === id);
      if (idx < 0) return cols;
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= cols.length) return cols;
      const newCols = [...cols];
      const tmp = newCols[idx];
      newCols[idx] = newCols[swapWith];
      newCols[swapWith] = tmp;
      return newCols;
    });
  };

  // Reuse employees StatCard style for exact match
  const StatCard = ({ title, value, icon, bgGradient }) => (
    <Card
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="2xl"
      overflow="hidden"
      position="relative"
      boxShadow="0 4px 15px rgba(0, 0, 0, 0.05)"
    >
      <CardBody p="6">
        <HStack justify="space-between" align="flex-start" mb="4">
          <VStack align="flex-start" spacing="1">
            <Text fontSize="sm" fontWeight="medium" color="gray.600">{title}</Text>
            <Heading size="lg" color="gray.800" fontWeight="bold">{value}</Heading>
          </VStack>
          <Circle size="10" bg={bgGradient} color="white">
            <Icon as={icon} boxSize="5" />
          </Circle>
        </HStack>
      </CardBody>
    </Card>
  );

  useEffect(() => {
    loadDepartments();
    loadCostCenters();
  }, []);

  // Keep filtered equal to full list (no search)
  useEffect(() => {
    setFilteredDepartments(departments);
  }, [departments]);

  // Keep filtered equal to full list (no search)
  useEffect(() => {
    setFilteredCostCenters(costCenters);
  }, [costCenters]);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/departments_api.php?action=get_all'));
      const data = await response.json();
      if (data.success) {
        const list = Array.isArray(data.departments)
          ? data.departments
          : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.results)
          ? data.results
          : [];
        setDepartments(list);
      } else {
        toast({
          title: 'خطأ في تحميل الأقسام',
          description: data.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ في تحميل الأقسام',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCostCenters = async () => {
    setCostCenterLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/cost_centers.php?action=list'));
      const data = await response.json();
      if (data.success) {
        const list = Array.isArray(data.cost_centers)
          ? data.cost_centers
          : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.results)
          ? data.results
          : [];
        setCostCenters(list);
      } else {
        alert('خطأ في تحميل مراكز التكلفة: ' + data.message);
      }
    } catch (error) {
      alert('خطأ في تحميل مراكز التكلفة: ' + error.message);
    } finally {
      setCostCenterLoading(false);
    }
  };

  const handleAddDepartment = () => {
    setSelectedDepartment(null);
    resetDept();
    onAddDeptOpen();
  };

  const handleEditDepartment = (department) => {
    setSelectedDepartment(department);
    // تعيين القيم بشكل صريح
    setDeptValue('name', department.name || '');
    setDeptValue('description', department.description || '');
    setDeptValue('manager', department.manager || '');
    setDeptValue('location', department.location || '');
    setDeptValue('budget', department.budget || '');
    setDeptValue('status', department.status || 'active');
    onEditDeptOpen();
  };

  // Set form values when modal opens
  useEffect(() => {
    if (isEditDeptOpen && selectedDepartment) {
      console.log('Setting form values for department:', selectedDepartment);
      setDeptValue('name', selectedDepartment.name);
      setDeptValue('name_ar', selectedDepartment.name_ar);
      setDeptValue('description', selectedDepartment.description || '');
      setDeptValue('manager', selectedDepartment.manager || '');
      setDeptValue('location', selectedDepartment.location || '');
      setDeptValue('status', selectedDepartment.status || 'active');
    }
  }, [isEditDeptOpen, selectedDepartment, setDeptValue]);

  const handleViewDepartment = (department) => {
    setSelectedDepartment(department);
    onViewDeptOpen();
  };

  const handleViewCostCenter = (costCenter) => {
    setSelectedCostCenter(costCenter);
    onViewCostOpen();
  };

  const handleEditCostCenter = (costCenter) => {
    setSelectedCostCenter(costCenter);
    // تعيين القيم بشكل صريح
    setCostValue('name', costCenter.name || '');
    setCostValue('description', costCenter.description || '');
    setCostValue('color', costCenter.color || '');
    setCostValue('department_id', costCenter.department_id || '');
    onEditCostOpen();
  };

  // Set form values when modal opens
  useEffect(() => {
    if (isEditCostOpen && selectedCostCenter) {
      console.log('Setting form values for cost center:', selectedCostCenter);
      setCostValue('name', selectedCostCenter.name || '');
      setCostValue('description', selectedCostCenter.description || '');
      setCostValue('color', selectedCostCenter.color || 'blue');
      setCostValue('department_id', selectedCostCenter.department_id || '');
    }
  }, [isEditCostOpen, selectedCostCenter, setCostValue]);

  const handleDeleteDepartment = (departmentId) => {
    setDeleteTarget({ type: 'department', id: departmentId });
    onDeleteAlertOpen();
  };

  const onDepartmentSubmit = async (data) => {
    try {
      const action = selectedDepartment ? 'update' : 'add';
      const payload = {
        action,
        ...data,
      };
      
      if (selectedDepartment) {
        payload.id = selectedDepartment.id;
      }

      // Debug: طباعة البيانات المرسلة
      console.log('Payload being sent:', payload);
      console.log('Selected Department:', selectedDepartment);

      const response = await fetch(getApiUrl('/api/departments_api.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      if (result.success) {
        toast({
          title: selectedDepartment ? 'تم تحديث القسم بنجاح' : 'تم إضافة القسم بنجاح',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        loadDepartments();
        onAddDeptClose();
        onEditDeptClose();
      } else {
        toast({
          title: 'خطأ في حفظ القسم',
          description: result.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ في حفظ القسم',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleAddCostCenter = () => {
    setSelectedCostCenter(null);
    resetCost();
    onAddCostOpen();
  };


  const handleDeleteCostCenter = (costCenterId) => {
    setDeleteTarget({ type: 'cost_center', id: costCenterId });
    onDeleteAlertOpen();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const apiUrl = deleteTarget.type === 'department' 
        ? getApiUrl('/api/departments_api.php')
        : getApiUrl('/api/cost_centers.php');

      const action = deleteTarget.type === 'department' ? 'delete' : 'delete';
      const idKey = deleteTarget.type === 'department' ? 'id' : 'id';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          id: deleteTarget.id
        }),
      });
      
      const result = await response.json();
      console.log('Delete response:', result);
      if (result.success) {
        toast({
          title: deleteTarget.type === 'department' ? 'تم حذف القسم بنجاح' : 'تم حذف التكلفة بنجاح',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        if (deleteTarget.type === 'department') {
          loadDepartments();
        } else {
        loadCostCenters();
        }
      } else {
        toast({
          title: deleteTarget.type === 'department' ? 'فشل في حذف القسم' : 'فشل في حذف التكلفة',
          description: result.message || 'حدث خطأ',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'خطأ في الاتصال',
        description: deleteTarget.type === 'department' ? 'فشل في حذف القسم' : 'فشل في حذف التكلفة',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      onDeleteAlertClose();
      setDeleteTarget(null);
    }
  };

  const onCostCenterSubmit = async (data) => {
    try {
      const action = selectedCostCenter ? 'update' : 'create';
      const payload = {
        action,
        ...data,
      };
      
      console.log('Cost Center Payload:', payload);
      
      if (selectedCostCenter) {
        payload.id = selectedCostCenter.id;
      }

      const response = await fetch(getApiUrl('/api/cost_centers.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      console.log('Cost Center Response:', result);
      if (result.success) {
        toast({
          title: selectedCostCenter ? 'تم تحديث التكلفة بنجاح' : 'تم إضافة التكلفة بنجاح',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        loadCostCenters();
        onAddCostClose();
        onEditCostClose();
      } else {
        toast({
          title: 'خطأ في حفظ التكلفة',
          description: result.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ في حفظ التكلفة',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'inactive':
        return 'red';
      case 'suspended':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'نشط';
      case 'inactive':
        return 'غير نشط';
      case 'suspended':
        return 'معلق';
      default:
        return 'غير محدد';
    }
  };

  const getColorScheme = (color) => {
    if (!color) return 'gray';
    const colorLower = String(color).toLowerCase().trim();
    switch (colorLower) {
      case 'red':
        return 'red';
      case 'blue':
        return 'blue';
      case 'green':
        return 'green';
      case 'yellow':
        return 'yellow';
      case 'purple':
        return 'purple';
      case 'pink':
        return 'pink';
      case 'orange':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const tabBtnProps = (index) => ({
    className: activeTabIndex === index ? 'stake-tab-active' : '',
    variant: 'ghost',
    h: '48px',
    px: '4',
    minW: 'fit-content',
    bg: activeTabIndex === index ? 'var(--stake-bg-hover)' : 'transparent',
    color: 'var(--stake-text-primary)',
    onClick: () => setActiveTabIndex(index),
    _hover: { bg: 'var(--stake-bg-hover)' },
    _active: { bg: 'var(--stake-bg-hover)' },
    borderRadius: 'xl',
    borderBottomRadius: '0',
  });

  const departmentsHeaderStatChips = useMemo(() => {
    const chip = (key, value, label, variant = 'total') => ({ key, value, label, variant });

    if (activeTabIndex === 0) {
      const isActive = (d) => (d.status || 'active').toString().toLowerCase() === 'active';
      const activeCount = filteredDepartments.filter(isActive).length;
      const inactiveCount = filteredDepartments.length - activeCount;
      const totalEmployees = filteredDepartments.reduce(
        (sum, d) => sum + (parseInt(d.employee_count, 10) || 0),
        0
      );
      const withManager = filteredDepartments.filter((d) => d.manager?.trim()).length;

      return [
        chip('total', filteredDepartments.length, 'أقسام', 'total'),
        chip('active', activeCount, 'نشط', 'active'),
        chip('inactive', inactiveCount, 'غير نشط', 'inactive'),
        chip('employees', totalEmployees, 'موظف', 'filtered'),
        chip('managers', withManager, 'بمدير', 'weekly'),
      ];
    }

    const linkedDepartments = new Set(
      filteredCostCenters.map((c) => c.department_name).filter(Boolean)
    ).size;
    const withoutDepartment = filteredCostCenters.filter((c) => !c.department_name?.trim()).length;
    const withColor = filteredCostCenters.filter((c) => c.color?.trim()).length;

    return [
      chip('total', filteredCostCenters.length, 'مراكز', 'total'),
      chip('linked', linkedDepartments, 'أقسام', 'filtered'),
      chip('colored', withColor, 'ملوّنة', 'weekly'),
      chip('unlinked', withoutDepartment, 'بدون قسم', 'inactive'),
    ];
  }, [activeTabIndex, filteredDepartments, filteredCostCenters]);

  const departmentsHeaderSubtitle = useMemo(() => {
    if (activeTabIndex === 0) {
      return 'إدارة وتنظيم أقسام الشركة وتوزيع الموظفين';
    }
    return 'إدارة مراكز التكلفة وربطها بأقسام الشركة';
  }, [activeTabIndex]);

  const departmentsHeaderTabHint = useMemo(() => {
    if (activeTabIndex === 0) {
      return `التبويب النشط: الأقسام — ${filteredDepartments.length} قسم`;
    }
    return `التبويب النشط: مراكز التكلفة — ${filteredCostCenters.length} مركز`;
  }, [activeTabIndex, filteredDepartments.length, filteredCostCenters.length]);

  if (loading) {
    return (
      <Box className="tp-settings-page-layout" w="100%" flex="1" minH="0" display="flex" flexDirection="column">
        <Center flex="1" minH="40vh">
          <VStack spacing="4">
            <Spinner size="xl" color="primary.500" />
            <Text color={mutedTextColor}>جاري تحميل الأقسام...</Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  return (
    <>
    <Box className="tp-settings-page-layout" w="100%" flex="1" minH="0" display="flex" flexDirection="column">
      {!filtersCollapsed && (
      <Box className="tp-settings-page-header weekly-salary-header-shell tp-departments-page-header" flexShrink={0} w="100%" maxW="100%">
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
                  className="weekly-salary-header-icon-wrap tp-departments-header-icon-wrap"
                  aria-hidden
                >
                  <Icon as={FiBriefcase} boxSize={{ base: 5, md: 6 }} />
                </Flex>
                <VStack align="flex-start" spacing={0.5} minW={0}>
                  <Heading className="stake-heading-3 weekly-salary-page-title tp-page-header-title" size="md" lineHeight="short" mb={0}>
                    إدارة الأقسام ومراكز التكلفة
                  </Heading>
                  <Text className="tp-page-header-subtitle" noOfLines={2}>
                    {departmentsHeaderSubtitle}
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
                {departmentsHeaderStatChips.map((statChip) => (
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

            <Text className="tp-page-header-tab-hint" fontSize="sm">
              {departmentsHeaderTabHint}
            </Text>
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
          <Button leftIcon={<FiBriefcase size="16" />} {...tabBtnProps(0)}>
            <HStack spacing="2">
              <Text>الأقسام</Text>
              <Badge colorScheme="blue" borderRadius="full" px="2" py="1" fontSize="xs">
                {departments.length}
              </Badge>
            </HStack>
          </Button>
          <Button leftIcon={<FiDollarSign size="16" />} {...tabBtnProps(1)}>
            <HStack spacing="2">
              <Text>مراكز التكلفة</Text>
              <Badge colorScheme="green" borderRadius="full" px="2" py="1" fontSize="xs">
                {costCenters.length}
              </Badge>
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
          {activeTabIndex === 0 ? (
            <Box p="0" flex="1" minH="0" display="flex" flexDirection="column">
              <HStack justify="space-between" mb="4" px={{ base: 3, md: 4, lg: 6 }} pt={{ base: 3, md: 4 }} pb="2" flexShrink={0} flexWrap="wrap" gap={2}>
                <Heading size="md" className="stake-heading-3">قائمة الأقسام</Heading>
                <HStack spacing="2" flexWrap="wrap">
                  <Button
                    leftIcon={<FiPlus />}
                    className="stake-btn"
                    size="sm"
                    onClick={handleAddDepartment}
                    h="40px"
                    fontWeight="600"
                  >
                    إضافة قسم
                  </Button>
              <Menu>
                <MenuButton as={Button} size="sm" rightIcon={<FiMoreVertical />} className="stake-btn-secondary" borderRadius="lg" borderColor="var(--stake-border-primary)" _hover={{ bg: 'var(--stake-bg-hover)' }}>تنظيم الأعمدة</MenuButton>
                <Portal>
                  <MenuList
                    zIndex={2000}
                    minW="260px"
                    className="stake-card"
                    bg="var(--stake-bg-primary)"
                    borderColor="var(--stake-border-primary)"
                  >
                    {deptColumns.map((col) => (
                      <Box key={col.id} px="3" py="2">
                        <HStack justify="space-between">
                          <HStack>
                            <Switch isChecked={col.visible} onChange={() => toggleDeptColumn(col.id)} />
                            <Text fontSize="sm">{col.label}</Text>
                          </HStack>
                          <HStack spacing="1">
                            <IconButton aria-label="up" icon={<FiChevronUp />} size="xs" variant="ghost" onClick={() => moveDeptColumn(col.id, 'up')} />
                            <IconButton aria-label="down" icon={<FiChevronDown />} size="xs" variant="ghost" onClick={() => moveDeptColumn(col.id, 'down')} />
                          </HStack>
                        </HStack>
                      </Box>
                    ))}
                  </MenuList>
                </Portal>
              </Menu>
                </HStack>
            </HStack>
            <TableContainer
              flex="1"
              minH="0"
              overflowY="auto"
              overflowX="auto"
              w="100%"
              maxW="100%"
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
                    {deptColumns.filter(c => c.visible).map(col => (
                      <Th key={col.id}>
                        <EnglishKeyTooltip englishKey={col.id}>
                          {col.label}
                        </EnglishKeyTooltip>
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredDepartments.map((department) => (
                    <Tr 
                      key={department.id}
                      opacity={department.status === 'inactive' ? 0.4 : 1}
                      bg={department.status === 'inactive' ? 'gray.100' : 'transparent'}
                      cursor="pointer"
                      _hover={{ bg: department.status === 'inactive' ? 'gray.100' : 'var(--stake-bg-hover)' }}
                      transition="all 0.2s"
                      onDoubleClick={() => handleViewDepartment(department)}
                    >
                      {deptColumns.filter(c => c.visible).map(col => {
                        switch (col.id) {
                          case 'name':
                            return (
                              <Td key={col.id}>
                                <VStack align="flex-start" spacing="1">
                                  <Text 
                                    fontSize="sm" 
                                    fontWeight="medium"
                                    color={department.status === 'inactive' ? 'gray.400' : 'inherit'}
                                  >
                                    {department.name}
                                  </Text>
                                  <Text 
                                    fontSize="xs" 
                                    color={department.status === 'inactive' ? 'gray.300' : mutedTextColor}
                                  >
                                    ID: {department.id}
                                  </Text>
                                </VStack>
                              </Td>
                            );
                          case 'description':
                            return (
                              <Td key={col.id}>
                                <Text 
                                  fontSize="sm" 
                                  noOfLines={2}
                                  color={department.status === 'inactive' ? 'gray.400' : 'inherit'}
                                >
                                  {department.description || '-'}
                                </Text>
                              </Td>
                            );
                          case 'manager':
                            return (
                              <Td key={col.id}>
                                <Text 
                                  fontSize="sm"
                                  color={department.status === 'inactive' ? 'gray.400' : 'inherit'}
                                >
                                  {department.manager || '-'}
                                </Text>
                              </Td>
                            );
                          case 'location':
                            return (
                              <Td key={col.id}>
                                <Text 
                                  fontSize="sm"
                                  color={department.status === 'inactive' ? 'gray.400' : 'inherit'}
                                >
                                  {department.location || '-'}
                                </Text>
                              </Td>
                            );
                          case 'employee_count':
                            return (
                              <Td key={col.id}>
                                <HStack spacing="1">
                                  <FiUsers 
                                    size={14} 
                                    color={department.status === 'inactive' ? '#9CA3AF' : 'inherit'}
                                  />
                                  <Text 
                                    fontSize="sm" 
                                    fontWeight="medium"
                                    color={department.status === 'inactive' ? 'gray.400' : 'inherit'}
                                  >
                                    {department.employee_count || 0}
                                  </Text>
                                </HStack>
                              </Td>
                            );
                          case 'status':
                            return (
                              <Td key={col.id}><Badge colorScheme={getStatusColor(department.status)}>{getStatusText(department.status)}</Badge></Td>
                            );
                          case 'actions':
                            return (
                              <Td key={col.id}>
                                <Menu>
                                  <MenuButton 
                                    as={IconButton} 
                                    icon={<FiMoreVertical />} 
                                    variant="ghost" 
                                    size="sm"
                                  />
                                  <MenuList>
                                    <MenuItem icon={<FiEye />} onClick={() => handleViewDepartment(department)}>عرض</MenuItem>
                                    <MenuItem 
                                      icon={<FiEdit />} 
                                      onClick={() => handleEditDepartment(department)}
                                    >
                                      تعديل
                                    </MenuItem>
                                    <MenuDivider />
                                    <MenuItem 
                                      icon={<FiTrash2 />} 
                                      color="red.500" 
                                      onClick={() => handleDeleteDepartment(department.id)}
                                      isDisabled={department.status === 'inactive'}
                                      opacity={department.status === 'inactive' ? 0.5 : 1}
                                    >
                                      حذف
                                    </MenuItem>
                                  </MenuList>
                                </Menu>
                              </Td>
                            );
                          default:
                            return null;
                        }
                      })}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
            </Box>
          ) : (
            <Box p="0" flex="1" minH="0" display="flex" flexDirection="column">
              <HStack justify="space-between" mb="4" px={{ base: 3, md: 4, lg: 6 }} pt={{ base: 3, md: 4 }} pb="2" flexShrink={0} flexWrap="wrap" gap={2}>
                <Heading size="md" className="stake-heading-3">قائمة مراكز التكلفة</Heading>
                <HStack spacing="2" flexWrap="wrap">
                  <Button
                    leftIcon={<FiPlus />}
                    className="stake-btn"
                    size="sm"
                    onClick={handleAddCostCenter}
                    h="40px"
                    fontWeight="600"
                  >
                    إضافة مركز تكلفة
                  </Button>
              <Menu>
                <MenuButton as={Button} size="sm" rightIcon={<FiMoreVertical />} className="stake-btn-secondary" borderRadius="lg" borderColor="var(--stake-border-primary)" _hover={{ bg: 'var(--stake-bg-hover)' }}>تنظيم الأعمدة</MenuButton>
                <Portal>
                  <MenuList
                    zIndex={2000}
                    minW="260px"
                    className="stake-card"
                    bg="var(--stake-bg-primary)"
                    borderColor="var(--stake-border-primary)"
                  >
                    {costColumns.map((col) => (
                      <Box key={col.id} px="3" py="2">
                        <HStack justify="space-between">
                          <HStack>
                            <Switch isChecked={col.visible} onChange={() => toggleCostColumn(col.id)} />
                            <Text fontSize="sm">{col.label}</Text>
                          </HStack>
                          <HStack spacing="1">
                            <IconButton aria-label="up" icon={<FiChevronUp />} size="xs" variant="ghost" onClick={() => moveCostColumn(col.id, 'up')} />
                            <IconButton aria-label="down" icon={<FiChevronDown />} size="xs" variant="ghost" onClick={() => moveCostColumn(col.id, 'down')} />
                          </HStack>
                        </HStack>
                      </Box>
                    ))}
                  </MenuList>
                </Portal>
              </Menu>
                </HStack>
            </HStack>
            <TableContainer
              flex="1"
              minH="0"
              overflowY="auto"
              overflowX="auto"
              w="100%"
              maxW="100%"
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
                    {costColumns.filter(c => c.visible).map(col => (
                      <Th key={col.id}>
                        <EnglishKeyTooltip englishKey={col.id}>
                          {col.label}
                        </EnglishKeyTooltip>
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredCostCenters.map((costCenter) => (
                    <Tr 
                      key={costCenter.id}
                      cursor="pointer"
                      _hover={{ bg: 'var(--stake-bg-hover)' }}
                      transition="all 0.2s"
                      onDoubleClick={() => handleViewCostCenter(costCenter)}
                    >
                      {costColumns.filter(c => c.visible).map(col => {
                        switch (col.id) {
                          case 'name':
                            return (
                              <Td key={col.id}>
                                <VStack align="flex-start" spacing="1">
                                  <Text fontSize="sm" fontWeight="medium">{costCenter.name}</Text>
                                  <Text fontSize="xs" color={mutedTextColor}>ID: {costCenter.id}</Text>
                                </VStack>
                              </Td>
                            );
                          case 'description':
                            return (
                              <Td key={col.id}><Text fontSize="sm" noOfLines={2}>{costCenter.description || '-'}</Text></Td>
                            );
                          case 'color':
                            const colorValue = costCenter.color || costCenter.colour || 'gray';
                            const colorScheme = getColorScheme(colorValue);
                            return (
                              <Td key={col.id}>
                                <Badge 
                                  colorScheme={colorScheme}
                                  variant="solid"
                                  px="3"
                                  py="1"
                                  borderRadius="md"
                                  fontSize="xs"
                                  textTransform="capitalize"
                                >
                                  {colorValue || 'غير محدد'}
                                </Badge>
                              </Td>
                            );
                          case 'department_name':
                            return (<Td key={col.id}><Text fontSize="sm">{costCenter.department_name || '-'}</Text></Td>);
                          case 'created_at':
                            return (<Td key={col.id}><Text fontSize="sm">{costCenter.created_at ? new Date(costCenter.created_at).toLocaleDateString('ar-EG') : '-'}</Text></Td>);
                          case 'actions':
                            return (
                              <Td key={col.id}>
                                <Menu>
                                  <MenuButton as={IconButton} icon={<FiMoreVertical />} variant="ghost" size="sm" />
                                  <MenuList>
                                    <MenuItem icon={<FiEye />} onClick={() => handleViewCostCenter(costCenter)}>عرض</MenuItem>
                                    <MenuItem icon={<FiEdit />} onClick={() => handleEditCostCenter(costCenter)}>تعديل</MenuItem>
                                    <MenuDivider />
                                    <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => handleDeleteCostCenter(costCenter.id)}>حذف</MenuItem>
                                  </MenuList>
                                </Menu>
                              </Td>
                            );
                          default:
                            return null;
                        }
                      })}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
            </Box>
          )}
          </Box>
        </Box>
      </Box>
    </Box>

      {/* Add Department Modal */}
      <Modal isOpen={isAddDeptOpen} onClose={onAddDeptClose} size="4xl" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden">
          <form onSubmit={handleDeptSubmit(onDepartmentSubmit)}>
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
                  إضافة قسم جديد
                </Text>
                
                <HStack spacing="6" align="center" flex="1" justify="center">
                  <HStack spacing="2">
                    <Icon as={FiBriefcase} color="blue.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">
                      قسم جديد
                    </Text>
              </HStack>
                  <HStack spacing="2">
                    <Icon as={FiUsers} color="green.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">سيتم ربط الموظفين</Text>
                  </HStack>
                  <HStack spacing="2">
                    <Icon as={FiDollarSign} color="purple.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">
                      إدارة الميزانية
                    </Text>
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
              <VStack spacing="6" align="stretch">
                {/* المعلومات الأساسية */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    المعلومات الأساسية
                  </Text>
                  <Grid templateColumns={{ base: "1fr", md: "2fr 2fr 1fr" }} gap="4">
                    <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <FormControl isRequired>
                          <FormLabel className="stake-label">اسم القسم</FormLabel>
                    <Input
                      {...deptRegister('name', { required: 'اسم القسم مطلوب' })}
                      placeholder="اسم القسم"
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
                            {deptErrors.name && deptErrors.name.message}
                          </FormErrorMessage>
                  </FormControl>
                      </Box>
                </GridItem>
                <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <FormControl>
                          <FormLabel className="stake-label">مدير القسم</FormLabel>
                    <Input
                      {...deptRegister('manager')}
                      placeholder="اسم مدير القسم"
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
                      </Box>
                </GridItem>
                <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <FormControl>
                          <FormLabel className="stake-label">الحالة</FormLabel>
                          <Select 
                            {...deptRegister('status')} 
                            defaultValue="active"
                            className="stake-select"
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
                            _active={{
                              bg: "#111827"
                            }}
                            sx={{
                              option: {
                                bg: "#111827",
                                color: "white"
                              }
                            }}
                          >
                            <option value="active">نشط</option>
                            <option value="inactive">غير نشط</option>
                            <option value="suspended">معلق</option>
                          </Select>
                        </FormControl>
                      </Box>
                    </GridItem>
                  </Grid>
                </Box>

                {/* التفاصيل الإضافية */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    التفاصيل الإضافية
                  </Text>
                  <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
                    <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl>
                          <FormLabel className="stake-label">موقع القسم</FormLabel>
                          <Select 
                            {...deptRegister('location')} 
                            placeholder="اختر الموقع"
                            className="stake-select"
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
                            _active={{
                              bg: "#111827"
                            }}
                            sx={{
                              option: {
                                bg: "#111827",
                                color: "white"
                              }
                            }}
                          >
                      <option value="برج العرب">برج العرب</option>
                      <option value="محرم بك">محرم بك</option>
                    </Select>
                  </FormControl>
                      </Box>
                </GridItem>
                <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <FormControl>
                          <FormLabel className="stake-label">الميزانية</FormLabel>
                    <Input
                      {...deptRegister('budget')}
                      type="number"
                      placeholder="الميزانية"
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
                      </Box>
                </GridItem>
                  </Grid>
                </Box>

                {/* الوصف */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    الوصف
                  </Text>
                  <Box
                    bg="var(--stake-bg-secondary)"
                    p="4"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="var(--stake-border-primary)"
                  >
                  <FormControl>
                      <FormLabel className="stake-label">وصف القسم</FormLabel>
                      <Textarea
                        {...deptRegister('description')}
                        placeholder="وصف القسم"
                        rows={3}
                        className="stake-textarea"
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
                  </Box>
                </Box>
              </VStack>
            </ModalBody>
            <ModalFooter 
              bg="var(--stake-bg-secondary)" 
              borderTop="1px solid" 
              borderColor="var(--stake-border-primary)"
              p="6"
            >
              <HStack spacing="4" w="full" justify="flex-end">
                <Button 
                  variant="outline" 
                  onClick={onAddDeptClose} 
                  borderRadius="xl"
                  borderColor="var(--stake-border-primary)"
                  color="var(--stake-text-secondary)"
                  _hover={{
                    bg: "var(--stake-bg-hover)",
                    borderColor: "var(--stake-border-hover)"
                  }}
                >
                إلغاء
              </Button>
              <Button
                type="submit"
                borderRadius="xl"
                color="white"
                bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  _hover={{ 
                    bg: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                    transform: "translateY(-1px)",
                    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)"
                  }}
                  _active={{
                    transform: "translateY(0px)"
                  }}
                  px="8"
                  py="3"
                  fontWeight="600"
                >
                  إضافة القسم
              </Button>
              </HStack>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Edit Department Modal */}
      <Modal isOpen={isEditDeptOpen} onClose={onEditDeptClose} size="4xl" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden">
          <form onSubmit={handleDeptSubmit(onDepartmentSubmit)}>
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
                  تعديل القسم
                </Text>
                
                <HStack spacing="6" align="center" flex="1" justify="center">
                  <HStack spacing="2">
                    <Icon as={FiEdit} color="blue.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">
                      تعديل القسم
                    </Text>
                  </HStack>
                  <HStack spacing="2">
                    <Icon as={FiUsers} color="green.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">الموظفين المرتبطين</Text>
                  </HStack>
                  <HStack spacing="2">
                    <Icon as={FiDollarSign} color="purple.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">
                      تحديث الميزانية
                    </Text>
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
              <VStack spacing="6" align="stretch">
                {/* المعلومات الأساسية */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    المعلومات الأساسية
                  </Text>
                  <Grid templateColumns={{ base: "1fr", md: "2fr 2fr 1fr" }} gap="4">
                    <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <FormControl isRequired>
                          <FormLabel className="stake-label">اسم القسم</FormLabel>
                    <Input
                      {...deptRegister('name', { required: 'اسم القسم مطلوب' })}
                      placeholder="اسم القسم"
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
                            {deptErrors.name && deptErrors.name.message}
                          </FormErrorMessage>
                  </FormControl>
                      </Box>
                </GridItem>
                <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <FormControl>
                          <FormLabel className="stake-label">مدير القسم</FormLabel>
                    <Input
                      {...deptRegister('manager')}
                      placeholder="اسم مدير القسم"
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
                      </Box>
                </GridItem>
                <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <FormControl>
                          <FormLabel className="stake-label">الحالة</FormLabel>
                          <Controller
                            name="status"
                            control={deptControl}
                            render={({ field }) => {
                              console.log('Controller field value:', field.value);
                              console.log('Selected department status:', selectedDepartment?.status);
                              return (
                                <Select 
                                  {...field}
                                  value={field.value || selectedDepartment?.status || 'active'}
                                  onChange={(e) => {
                                    console.log('Status changed to:', e.target.value);
                                    field.onChange(e.target.value);
                                  }}
                                  className="stake-select"
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
                                  _active={{
                                    bg: "#111827"
                                  }}
                                  sx={{
                                    option: {
                                      bg: "#111827",
                                      color: "white"
                                    }
                                  }}
                                >
                                  <option value="active">نشط</option>
                                  <option value="inactive">غير نشط</option>
                                  <option value="suspended">معلق</option>
                                </Select>
                              );
                            }}
                    />
                  </FormControl>
                      </Box>
                </GridItem>
                  </Grid>
                </Box>

                {/* التفاصيل الإضافية */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    التفاصيل الإضافية
                  </Text>
                  <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
                <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <FormControl>
                          <FormLabel className="stake-label">موقع القسم</FormLabel>
                          <Select 
                            {...deptRegister('location')} 
                            placeholder="اختر الموقع"
                            className="stake-select"
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
                            _active={{
                              bg: "#111827"
                            }}
                            sx={{
                              option: {
                                bg: "#111827",
                                color: "white"
                              }
                            }}
                          >
                      <option value="برج العرب">برج العرب</option>
                      <option value="محرم بك">محرم بك</option>
                    </Select>
                  </FormControl>
                      </Box>
                </GridItem>
                <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <FormControl>
                          <FormLabel className="stake-label">الميزانية</FormLabel>
                    <Input
                      {...deptRegister('budget')}
                      type="number"
                      placeholder="الميزانية"
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
                      </Box>
                </GridItem>
                  </Grid>
                </Box>

                {/* الوصف */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    الوصف
                  </Text>
                  <Box
                    bg="var(--stake-bg-secondary)"
                    p="4"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="var(--stake-border-primary)"
                  >
                  <FormControl>
                      <FormLabel className="stake-label">وصف القسم</FormLabel>
                      <Textarea
                        {...deptRegister('description')}
                        placeholder="وصف القسم"
                        rows={3}
                        className="stake-textarea"
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
                  </Box>
                </Box>
              </VStack>
            </ModalBody>
            <ModalFooter 
              bg="var(--stake-bg-secondary)" 
              borderTop="1px solid" 
              borderColor="var(--stake-border-primary)"
              p="6"
            >
              <HStack spacing="4" w="full" justify="flex-end">
                <Button 
                  variant="outline" 
                  onClick={onEditDeptClose} 
                  borderRadius="xl"
                  borderColor="var(--stake-border-primary)"
                  color="var(--stake-text-secondary)"
                  _hover={{
                    bg: "var(--stake-bg-hover)",
                    borderColor: "var(--stake-border-hover)"
                  }}
                >
                إلغاء
              </Button>
              <Button
                type="submit"
                borderRadius="xl"
                color="white"
                bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  _hover={{ 
                    bg: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                    transform: "translateY(-1px)",
                    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)"
                  }}
                  _active={{
                    transform: "translateY(0px)"
                  }}
                  px="8"
                  py="3"
                  fontWeight="600"
              >
                حفظ التغييرات
              </Button>
              </HStack>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* View Department Modal */}
      <Modal isOpen={isViewDeptOpen} onClose={onViewDeptClose} size="4xl" isCentered>
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
                تفاصيل القسم
              </Text>
              
              <HStack spacing="6" align="center" flex="1" justify="center">
                <HStack spacing="2">
                  <Icon as={FiEye} color="blue.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">
                    عرض التفاصيل
                  </Text>
                </HStack>
                <HStack spacing="2">
                  <Icon as={FiUsers} color="green.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">الموظفين المرتبطين</Text>
                </HStack>
                <HStack spacing="2">
                  <Icon as={FiBriefcase} color="purple.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">
                    معلومات القسم
                  </Text>
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
            {selectedDepartment && (
              <VStack spacing="6" align="stretch">
                {/* المعلومات الأساسية */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    المعلومات الأساسية
                  </Text>
                  <Grid templateColumns={{ base: "1fr", md: "2fr 2fr 1fr" }} gap="4">
                <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <VStack align="flex-start" spacing="2">
                          <Text fontSize="sm" fontWeight="bold" color="var(--stake-text-secondary)">
                            اسم القسم
                          </Text>
                          <Text fontSize="md" color="var(--stake-text-primary)" fontWeight="600">
                            {selectedDepartment.name}
                          </Text>
                  </VStack>
                      </Box>
                </GridItem>
                <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <VStack align="flex-start" spacing="2">
                          <Text fontSize="sm" fontWeight="bold" color="var(--stake-text-secondary)">
                            مدير القسم
                          </Text>
                          <Text fontSize="md" color="var(--stake-text-primary)" fontWeight="600">
                            {selectedDepartment.manager || 'غير محدد'}
                          </Text>
                  </VStack>
                      </Box>
                </GridItem>
                    <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <VStack align="flex-start" spacing="2">
                          <Text fontSize="sm" fontWeight="bold" color="var(--stake-text-secondary)">
                            الحالة
                          </Text>
                          <Badge 
                            colorScheme={getStatusColor(selectedDepartment.status)}
                            fontSize="sm"
                            px="3"
                            py="1"
                            borderRadius="full"
                          >
                            {getStatusText(selectedDepartment.status)}
                          </Badge>
                  </VStack>
                      </Box>
                </GridItem>
                  </Grid>
                </Box>

                {/* التفاصيل الإضافية */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    التفاصيل الإضافية
                  </Text>
                  <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap="4">
                <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <VStack align="flex-start" spacing="2">
                          <Text fontSize="sm" fontWeight="bold" color="var(--stake-text-secondary)">
                            موقع القسم
                          </Text>
                          <Text fontSize="md" color="var(--stake-text-primary)" fontWeight="600">
                            {selectedDepartment.location || 'غير محدد'}
                          </Text>
                  </VStack>
                      </Box>
                </GridItem>
                <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <VStack align="flex-start" spacing="2">
                          <Text fontSize="sm" fontWeight="bold" color="var(--stake-text-secondary)">
                            الميزانية
                          </Text>
                          <Text fontSize="md" color="var(--stake-text-primary)" fontWeight="600">
                            {selectedDepartment.budget ? `${selectedDepartment.budget} جنيه` : 'غير محدد'}
                          </Text>
                  </VStack>
                      </Box>
                </GridItem>
                <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <VStack align="flex-start" spacing="2">
                          <Text fontSize="sm" fontWeight="bold" color="var(--stake-text-secondary)">
                            عدد الموظفين
                          </Text>
                          <HStack spacing="2">
                            <Icon as={FiUsers} color="blue.400" boxSize="4" />
                            <Text fontSize="md" color="var(--stake-text-primary)" fontWeight="600">
                              {selectedDepartment.employee_count || 0}
                            </Text>
                          </HStack>
                  </VStack>
                      </Box>
                </GridItem>
              </Grid>
                </Box>

                {/* الوصف */}
                {selectedDepartment.description && (
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                      الوصف
                    </Text>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <Text fontSize="md" color="var(--stake-text-primary)" lineHeight="1.6">
                        {selectedDepartment.description}
                      </Text>
                    </Box>
                  </Box>
                )}
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
                _hover={{ bg: "#2563eb" }}
                onClick={() => {
                  onViewDeptClose();
                  handleEditDepartment(selectedDepartment);
                }}
              >
                تعديل القسم
            </Button>
              <Button
                leftIcon={<FiTrash2 />}
                h="48px"
                px="8"
                fontWeight="600"
                borderRadius="xl"
                bg="#ef4444"
                color="white"
                _hover={{ bg: "#dc2626" }}
                onClick={() => {
                  onViewDeptClose();
                  handleDeleteDepartment(selectedDepartment.id);
                }}
              >
                حذف القسم
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Cost Center Modal */}
      <Modal isOpen={isAddCostOpen} onClose={onAddCostClose} size="4xl" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden">
          <form onSubmit={handleCostSubmit(onCostCenterSubmit)}>
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
                  إضافة مركز تكلفة جديد
                </Text>
                
                <HStack spacing="6" align="center" flex="1" justify="center">
                  <HStack spacing="2">
                    <Icon as={FiDollarSign} color="blue.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">
                      مركز تكلفة جديد
                    </Text>
                  </HStack>
                  <HStack spacing="2">
                    <Icon as={FiBriefcase} color="green.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">ربط بالقسم</Text>
                  </HStack>
                  <HStack spacing="2">
                    <Icon as={FiTarget} color="purple.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">
                      تتبع التكلفة
                    </Text>
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
              <VStack spacing="6" align="stretch">
                {/* المعلومات الأساسية */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    المعلومات الأساسية
                  </Text>
                  <Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap="4">
                    <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                <FormControl isRequired>
                          <FormLabel className="stake-label">اسم التكلفة</FormLabel>
                  <Input
                    {...costRegister('name', { required: 'اسم التكلفة مطلوب' })}
                    placeholder="اسم التكلفة"
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
                            {deptErrors.name && deptErrors.name.message}
                          </FormErrorMessage>
                </FormControl>
                      </Box>
                    </GridItem>
                    <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                <FormControl>
                          <FormLabel className="stake-label">اللون</FormLabel>
                          <Select 
                            {...costRegister('color')} 
                            defaultValue="blue"
                            className="stake-select"
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
                            _active={{
                              bg: "#111827"
                            }}
                            sx={{
                              option: {
                                bg: "#111827",
                                color: "white"
                              }
                            }}
                          >
                    <option value="red">أحمر</option>
                    <option value="blue">أزرق</option>
                    <option value="green">أخضر</option>
                    <option value="yellow">أصفر</option>
                    <option value="purple">بنفسجي</option>
                    <option value="pink">وردي</option>
                    <option value="orange">برتقالي</option>
                  </Select>
                </FormControl>
                      </Box>
                    </GridItem>
                  </Grid>
                </Box>

                {/* التفاصيل الإضافية */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    التفاصيل الإضافية
                  </Text>
                  <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
                    <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                <FormControl>
                          <FormLabel className="stake-label">القسم</FormLabel>
                          <Select 
                            {...costRegister('department_id')}
                            className="stake-select"
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
                            _active={{
                              bg: "#111827"
                            }}
                            sx={{
                              option: {
                                bg: "#111827",
                                color: "white"
                              }
                            }}
                          >
                    <option value="">اختر القسم</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                      </Box>
                    </GridItem>
                    <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl>
                          <FormLabel className="stake-label">اللون المحدد</FormLabel>
                          <HStack spacing="3">
                            <Box
                              w="40px"
                              h="40px"
                              borderRadius="xl"
                              border="2px solid"
                              sx={{
                                bg: (() => {
                                  const currentColor = costWatch('color') || selectedCostCenter?.color || 'blue';
                                  const colorScheme = getColorScheme(currentColor);
                                  const colorMap = {
                                    red: '#ef4444',
                                    blue: '#3b82f6',
                                    green: '#10b981',
                                    yellow: '#f59e0b',
                                    purple: '#a855f7',
                                    pink: '#ec4899',
                                    orange: '#f97316',
                                    gray: '#6b7280'
                                  };
                                  return colorMap[colorScheme] || colorMap.blue;
                                })(),
                                borderColor: (() => {
                                  const currentColor = costWatch('color') || selectedCostCenter?.color || 'blue';
                                  const colorScheme = getColorScheme(currentColor);
                                  const colorMap = {
                                    red: '#fca5a5',
                                    blue: '#93c5fd',
                                    green: '#6ee7b7',
                                    yellow: '#fbbf24',
                                    purple: '#c084fc',
                                    pink: '#f9a8d4',
                                    orange: '#fb923c',
                                    gray: '#9ca3af'
                                  };
                                  return colorMap[colorScheme] || colorMap.blue;
                                })()
                              }}
                            />
                            <Text fontSize="sm" color="var(--stake-text-secondary)">
                              سيتم عرض هذا اللون في الواجهة
                            </Text>
                          </HStack>
                        </FormControl>
                      </Box>
                    </GridItem>
                  </Grid>
                </Box>

                {/* الوصف */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    الوصف
                  </Text>
                  <Box
                    bg="var(--stake-bg-secondary)"
                    p="4"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="var(--stake-border-primary)"
                  >
                    <FormControl>
                      <FormLabel className="stake-label">وصف التكلفة</FormLabel>
                      <Textarea
                        {...costRegister('description')}
                        placeholder="وصف التكلفة"
                        rows={3}
                        className="stake-textarea"
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
                  </Box>
                </Box>
              </VStack>
            </ModalBody>
            <ModalFooter 
              bg="var(--stake-bg-secondary)" 
              borderTop="1px solid" 
              borderColor="var(--stake-border-primary)"
              p="6"
            >
              <HStack spacing="4" w="full" justify="flex-end">
                <Button 
                  variant="outline" 
                  onClick={onAddCostClose} 
                  borderRadius="xl"
                  borderColor="var(--stake-border-primary)"
                  color="var(--stake-text-secondary)"
                  _hover={{
                    bg: "var(--stake-bg-hover)",
                    borderColor: "var(--stake-border-hover)"
                  }}
                >
                إلغاء
              </Button>
              <Button
                type="submit"
                borderRadius="xl"
                color="white"
                bg="linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)"
                  _hover={{ 
                    bg: 'linear-gradient(135deg, #3db8b0 0%, #3a8a7a 100%)',
                    transform: "translateY(-1px)",
                    boxShadow: "0 4px 12px rgba(78, 205, 196, 0.4)"
                  }}
                  _active={{
                    transform: "translateY(0px)"
                  }}
                  px="8"
                  py="3"
                  fontWeight="600"
                >
                  إضافة التكلفة
              </Button>
              </HStack>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Edit Cost Center Modal */}
      <Modal isOpen={isEditCostOpen} onClose={onEditCostClose} size="4xl" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden">
          <form onSubmit={handleCostSubmit(onCostCenterSubmit)}>
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
                  تعديل التكلفة
                </Text>
                
                <HStack spacing="6" align="center" flex="1" justify="center">
                  <HStack spacing="2">
                    <Icon as={FiEdit} color="blue.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">
                      تعديل التكلفة
                    </Text>
                  </HStack>
                  <HStack spacing="2">
                    <Icon as={FiBriefcase} color="green.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">تحديث القسم</Text>
                  </HStack>
                  <HStack spacing="2">
                    <Icon as={FiTarget} color="purple.300" boxSize="4" />
                    <Text fontSize="sm" className="stake-text-secondary">
                      تحديث التكلفة
                    </Text>
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
              <VStack spacing="6" align="stretch">
                {/* المعلومات الأساسية */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    المعلومات الأساسية
                  </Text>
                  <Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap="4">
                    <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                <FormControl isRequired>
                          <FormLabel className="stake-label">اسم التكلفة</FormLabel>
                  <Input
                    {...costRegister('name', { required: 'اسم التكلفة مطلوب' })}
                    placeholder="اسم التكلفة"
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
                            {deptErrors.name && deptErrors.name.message}
                          </FormErrorMessage>
                </FormControl>
                      </Box>
                    </GridItem>
                    <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                <FormControl>
                          <FormLabel className="stake-label">اللون</FormLabel>
                          <Controller
                            name="color"
                            control={costControl}
                            defaultValue={selectedCostCenter?.color || 'blue'}
                            key={selectedCostCenter?.id || 'new'}
                            render={({ field }) => {
                              const colorOptions = [
                                { value: 'red', label: 'أحمر', color: '#ef4444' },
                                { value: 'blue', label: 'أزرق', color: '#3b82f6' },
                                { value: 'green', label: 'أخضر', color: '#10b981' },
                                { value: 'yellow', label: 'أصفر', color: '#f59e0b' },
                                { value: 'purple', label: 'بنفسجي', color: '#a855f7' },
                                { value: 'pink', label: 'وردي', color: '#ec4899' },
                                { value: 'orange', label: 'برتقالي', color: '#f97316' }
                              ];
                              const selectedOption = colorOptions.find(opt => opt.value === (field.value || selectedCostCenter?.color || 'blue'));
                              
                              return (
                                <Menu>
                                  <MenuButton
                                    as={Button}
                                    w="100%"
                                    bg="var(--stake-bg-secondary, #111827)"
                                    color="white"
                                    border="1px solid"
                                    borderColor="var(--stake-border-primary, #2f4553)"
                                    _hover={{
                                      bg: "#1a2d3a",
                                      borderColor: "#4a5568"
                                    }}
                                    _active={{
                                      bg: "#111827"
                                    }}
                                    _focus={{
                                      borderColor: "#3b82f6",
                                      boxShadow: "0 0 0 1px #3b82f6"
                                    }}
                                    rightIcon={<Icon as={FiChevronDown} />}
                                  >
                                    <HStack spacing="2" justify="flex-start" w="100%">
                                      {selectedOption && (
                                        <Box
                                          w="16px"
                                          h="16px"
                                          borderRadius="full"
                                          bg={selectedOption.color}
                                          border="1px solid"
                                          borderColor="rgba(255, 255, 255, 0.2)"
                                        />
                                      )}
                                      <Text>{selectedOption?.label || 'اختر اللون'}</Text>
                                    </HStack>
                                  </MenuButton>
                                  <MenuList bg="var(--stake-bg-secondary, #111827)" borderColor="var(--stake-border-primary, #2f4553)">
                                    {colorOptions.map((option) => (
                                      <MenuItem
                                        key={option.value}
                                        onClick={() => field.onChange(option.value)}
                                        bg={field.value === option.value ? "#1a2d3a" : "transparent"}
                                        _hover={{ bg: "#1a2d3a" }}
                                        color="white"
                                      >
                                        <HStack spacing="2" w="100%">
                                          <Box
                                            w="16px"
                                            h="16px"
                                            borderRadius="full"
                                            bg={option.color}
                                            border="1px solid"
                                            borderColor="rgba(255, 255, 255, 0.2)"
                                          />
                                          <Text>{option.label}</Text>
                                          {field.value === option.value && (
                                            <Icon as={FiCheck} ml="auto" />
                                          )}
                                        </HStack>
                                      </MenuItem>
                                    ))}
                                  </MenuList>
                                </Menu>
                              );
                            }}
                          />
                </FormControl>
                      </Box>
                    </GridItem>
                  </Grid>
                </Box>

                {/* التفاصيل الإضافية */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    التفاصيل الإضافية
                  </Text>
                  <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
                    <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                <FormControl>
                          <FormLabel className="stake-label">القسم</FormLabel>
                          <Select 
                            {...costRegister('department_id')}
                            className="stake-select"
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
                            _active={{
                              bg: "#111827"
                            }}
                            sx={{
                              option: {
                                bg: "#111827",
                                color: "white"
                              }
                            }}
                          >
                    <option value="">اختر القسم</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                      </Box>
                    </GridItem>
                    <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                        <FormControl>
                          <FormLabel className="stake-label">اللون المحدد</FormLabel>
                          <HStack spacing="3">
                            <Box
                              w="40px"
                              h="40px"
                              borderRadius="xl"
                              border="2px solid"
                              sx={{
                                bg: (() => {
                                  const currentColor = costWatch('color') || selectedCostCenter?.color || 'blue';
                                  const colorScheme = getColorScheme(currentColor);
                                  const colorMap = {
                                    red: '#ef4444',
                                    blue: '#3b82f6',
                                    green: '#10b981',
                                    yellow: '#f59e0b',
                                    purple: '#a855f7',
                                    pink: '#ec4899',
                                    orange: '#f97316',
                                    gray: '#6b7280'
                                  };
                                  return colorMap[colorScheme] || colorMap.blue;
                                })(),
                                borderColor: (() => {
                                  const currentColor = costWatch('color') || selectedCostCenter?.color || 'blue';
                                  const colorScheme = getColorScheme(currentColor);
                                  const colorMap = {
                                    red: '#fca5a5',
                                    blue: '#93c5fd',
                                    green: '#6ee7b7',
                                    yellow: '#fbbf24',
                                    purple: '#c084fc',
                                    pink: '#f9a8d4',
                                    orange: '#fb923c',
                                    gray: '#9ca3af'
                                  };
                                  return colorMap[colorScheme] || colorMap.blue;
                                })()
                              }}
                            />
                            <Text fontSize="sm" color="var(--stake-text-secondary)">
                              سيتم عرض هذا اللون في الواجهة
                            </Text>
                          </HStack>
                        </FormControl>
                      </Box>
                    </GridItem>
                  </Grid>
                </Box>

                {/* الوصف */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    الوصف
                  </Text>
                  <Box
                    bg="var(--stake-bg-secondary)"
                    p="4"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="var(--stake-border-primary)"
                  >
                    <FormControl>
                      <FormLabel className="stake-label">وصف التكلفة</FormLabel>
                      <Textarea
                        {...costRegister('description')}
                        placeholder="وصف التكلفة"
                        rows={3}
                        className="stake-textarea"
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
                  </Box>
                </Box>
              </VStack>
            </ModalBody>
            <ModalFooter 
              bg="var(--stake-bg-secondary)" 
              borderTop="1px solid" 
              borderColor="var(--stake-border-primary)"
              p="6"
            >
              <HStack spacing="4" w="full" justify="flex-end">
                <Button 
                  variant="outline" 
                  onClick={onEditCostClose} 
                  borderRadius="xl"
                  borderColor="var(--stake-border-primary)"
                  color="var(--stake-text-secondary)"
                  _hover={{
                    bg: "var(--stake-bg-hover)",
                    borderColor: "var(--stake-border-hover)"
                  }}
                >
                إلغاء
              </Button>
              <Button
                type="submit"
                borderRadius="xl"
                color="white"
                bg="linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)"
                  _hover={{ 
                    bg: 'linear-gradient(135deg, #3db8b0 0%, #3a8a7a 100%)',
                    transform: "translateY(-1px)",
                    boxShadow: "0 4px 12px rgba(78, 205, 196, 0.4)"
                  }}
                  _active={{
                    transform: "translateY(0px)"
                  }}
                  px="8"
                  py="3"
                  fontWeight="600"
              >
                حفظ التغييرات
              </Button>
              </HStack>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* View Cost Center Modal */}
      <Modal isOpen={isViewCostOpen} onClose={onViewCostClose} size="4xl" isCentered>
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
                تفاصيل التكلفة
              </Text>
              
              <HStack spacing="6" align="center" flex="1" justify="center">
                <HStack spacing="2">
                  <Icon as={FiEye} color="blue.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">
                    عرض التفاصيل
                  </Text>
                </HStack>
                <HStack spacing="2">
                  <Icon as={FiDollarSign} color="green.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">معلومات التكلفة</Text>
                </HStack>
                <HStack spacing="2">
                  <Icon as={FiTarget} color="purple.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">
                    تتبع التكلفة
                  </Text>
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
            {selectedCostCenter && (
              <VStack spacing="6" align="stretch">
                {/* المعلومات الأساسية */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    المعلومات الأساسية
                  </Text>
                  <Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap="4">
                <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <VStack align="flex-start" spacing="2">
                          <Text fontSize="sm" fontWeight="bold" color="var(--stake-text-secondary)">
                            اسم التكلفة
                          </Text>
                          <Text fontSize="md" color="var(--stake-text-primary)" fontWeight="600">
                            {selectedCostCenter.name}
                          </Text>
                  </VStack>
                      </Box>
                </GridItem>
                <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <VStack align="flex-start" spacing="2">
                          <Text fontSize="sm" fontWeight="bold" color="var(--stake-text-secondary)">
                            اللون
                          </Text>
                          <HStack spacing="3">
                            <Box
                              w="40px"
                              h="40px"
                              borderRadius="xl"
                              border="2px solid"
                              sx={{
                                bg: (() => {
                                  const colorScheme = getColorScheme(selectedCostCenter?.color || 'blue');
                                  const colorMap = {
                                    red: '#ef4444',
                                    blue: '#3b82f6',
                                    green: '#10b981',
                                    yellow: '#f59e0b',
                                    purple: '#a855f7',
                                    pink: '#ec4899',
                                    orange: '#f97316',
                                    gray: '#6b7280'
                                  };
                                  return colorMap[colorScheme] || colorMap.blue;
                                })(),
                                borderColor: (() => {
                                  const colorScheme = getColorScheme(selectedCostCenter?.color || 'blue');
                                  const colorMap = {
                                    red: '#fca5a5',
                                    blue: '#93c5fd',
                                    green: '#6ee7b7',
                                    yellow: '#fbbf24',
                                    purple: '#c084fc',
                                    pink: '#f9a8d4',
                                    orange: '#fb923c',
                                    gray: '#9ca3af'
                                  };
                                  return colorMap[colorScheme] || colorMap.blue;
                                })()
                              }}
                            />
                            <Text fontSize="md" color="var(--stake-text-primary)" fontWeight="600" textTransform="capitalize">
                              {selectedCostCenter?.color || 'غير محدد'}
                            </Text>
                    </HStack>
                  </VStack>
                      </Box>
                </GridItem>
                  </Grid>
                </Box>

                {/* التفاصيل الإضافية */}
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                    التفاصيل الإضافية
                  </Text>
                  <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
                <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <VStack align="flex-start" spacing="2">
                          <Text fontSize="sm" fontWeight="bold" color="var(--stake-text-secondary)">
                            القسم المرتبط
                          </Text>
                          <Text fontSize="md" color="var(--stake-text-primary)" fontWeight="600">
                            {selectedCostCenter.department_name || 'غير مرتبط'}
                          </Text>
                  </VStack>
                      </Box>
                </GridItem>
                <GridItem>
                      <Box
                        bg="var(--stake-bg-secondary)"
                        p="4"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="var(--stake-border-primary)"
                      >
                  <VStack align="flex-start" spacing="2">
                          <Text fontSize="sm" fontWeight="bold" color="var(--stake-text-secondary)">
                            تاريخ الإنشاء
                          </Text>
                          <HStack spacing="2">
                            <Icon as={FiCalendar} color="blue.400" boxSize="4" />
                            <Text fontSize="md" color="var(--stake-text-primary)" fontWeight="600">
                              {selectedCostCenter.created_at ? new Date(selectedCostCenter.created_at).toLocaleDateString('ar-EG') : 'غير محدد'}
                            </Text>
                          </HStack>
                  </VStack>
                      </Box>
                </GridItem>
              </Grid>
                </Box>

                {/* الوصف */}
                {selectedCostCenter.description && (
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">
                      الوصف
                    </Text>
                    <Box
                      bg="var(--stake-bg-secondary)"
                      p="4"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                    >
                      <Text fontSize="md" color="var(--stake-text-primary)" lineHeight="1.6">
                        {selectedCostCenter.description}
                      </Text>
                    </Box>
                  </Box>
                )}
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
                _hover={{ bg: "#2563eb" }}
                onClick={() => {
                  onViewCostClose();
                  handleEditCostCenter(selectedCostCenter);
                }}
              >
                تعديل التكلفة
            </Button>
              <Button
                leftIcon={<FiTrash2 />}
                h="48px"
                px="8"
                fontWeight="600"
                borderRadius="xl"
                bg="#ef4444"
                color="white"
                _hover={{ bg: "#dc2626" }}
                onClick={() => {
                  onViewCostClose();
                  handleDeleteCostCenter(selectedCostCenter.id);
                }}
              >
                حذف التكلفة
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Alert */}
      <AlertDialog
        isOpen={isDeleteAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteAlertClose}
        isCentered
      >
        <AlertDialogOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)">
          <AlertDialogContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)">
            <AlertDialogHeader 
              fontSize="lg" 
              fontWeight="bold"
              bg="var(--stake-bg-primary, #0f212e)"
              color="white"
              borderRadius="24px 24px 0 0"
              p="6"
            >
              تأكيد الحذف
            </AlertDialogHeader>

            <AlertDialogBody p="6" color="var(--stake-text-primary)">
              هل أنت متأكد من حذف {deleteTarget?.type === 'department' ? 'هذا القسم' : 'التكلفة هذا'}؟ 
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogBody>

            <AlertDialogFooter 
              bg="var(--stake-bg-secondary)" 
              borderTop="1px solid" 
              borderColor="var(--stake-border-primary)"
              p="6"
              borderRadius="0 0 24px 24px"
            >
              <HStack spacing="3">
                <Button 
                  ref={cancelRef} 
                  onClick={onDeleteAlertClose}
                  borderRadius="xl"
                  px="6"
                  h="44px"
                  bg="var(--stake-bg-tertiary)"
                  color="var(--stake-text-primary)"
                  _hover={{
                    bg: "var(--stake-bg-hover)"
                  }}
                >
                  لا
                </Button>
                <Button 
                  colorScheme="red" 
                  onClick={confirmDelete}
                  borderRadius="xl"
                  px="6"
                  h="44px"
                  bg="#ef4444"
                  color="white"
                  _hover={{
                    bg: "#dc2626"
                  }}
                >
                  نعم، احذف
                </Button>
              </HStack>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default ChakraDepartments;

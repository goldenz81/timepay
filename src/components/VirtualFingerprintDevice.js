import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  HStack,
  VStack,
  SimpleGrid,
  Button,
  Icon,
  useToast,
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Center,
  Divider,
  Flex,
  Spacer,
  IconButton,
  Tooltip,
  Spinner,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Avatar,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
} from '@chakra-ui/react';
import { 
  FiMonitor, 
  FiLogIn, 
  FiLogOut,
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiActivity,
  FiDatabase,
  FiWifi,
  FiWifiOff,
  FiPower,
  FiSettings,
  FiChevronDown,
  FiUserCheck,
  FiX
} from 'react-icons/fi';
import { getApiUrl } from '../utils/apiUrlHelper';

const VirtualFingerprintDevice = () => {
  const toast = useToast();
  const [isConnected, setIsConnected] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState([]);

  // دالة مساعدة لتحليل JSON بشكل آمن
  const safeJsonParse = async (response) => {
    // قراءة النص أولاً (يمكن قراءته مرة واحدة فقط)
    const text = await response.text();
    
    // إذا كان النص يبدأ بـ HTML tags، فهو ليس JSON
    const trimmedText = text.trim();
    if (trimmedText.startsWith('<') || trimmedText.startsWith('<!')) {
      console.error('Server returned HTML instead of JSON:', trimmedText.substring(0, 200));
      throw new Error('الخادم أرجَع HTML بدلاً من JSON. قد يكون هناك خطأ في PHP.');
    }
    
    // محاولة تحليل النص كـ JSON
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON:', text.substring(0, 200));
      throw new Error(`فشل في تحليل الاستجابة كـ JSON: ${e.message}`);
    }
  };
  const [deviceStatus, setDeviceStatus] = useState('online');
  const [customCheckInTime, setCustomCheckInTime] = useState('');
  const [customCheckOutTime, setCustomCheckOutTime] = useState('');
  const [customDate, setCustomDate] = useState('');

  useEffect(() => {
    loadEmployees();
    loadAttendanceLogs();
    
    // تحديث حالة الجهاز بناءً على إعدادات البصمة
    const updateDeviceStatus = async () => {
      try {
        const settings = await checkFingerprintSettings();
        setDeviceStatus(settings.fingerprint_enabled ? 'online' : 'offline');
      } catch (error) {
        console.error('Error updating device status:', error);
        setDeviceStatus('offline');
      }
    };
    
    updateDeviceStatus();
    
    // تحديث حالة الجهاز كل 5 ثوانٍ
    const interval = setInterval(updateDeviceStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/api/unified_employees_api.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'get_employees' })
      });
      
      const data = await safeJsonParse(response);
      console.log('Employees API Response:', data); // للتشخيص
      
      if (data.success) {
        const employeesList = data.employees || data.data || [];
        console.log('Loaded employees:', employeesList); // للتشخيص
        setEmployees(employeesList);
        
        if (employeesList.length === 0) {
          toast({
            title: 'لا يوجد موظفين',
            description: 'لم يتم العثور على أي موظفين في قاعدة البيانات',
            status: 'warning',
            duration: 3000,
          });
        }
      } else {
        toast({
          title: 'خطأ في تحميل الموظفين',
          description: data.message || 'فشل في تحميل قائمة الموظفين',
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      toast({
        title: 'خطأ في تحميل الموظفين',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceLogs = async () => {
    try {
      setLoading(true);
      // استخدام API للحصول على سجلات البصمة الحقيقية
      const response = await fetch(getApiUrl('/api/virtual_device_api.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'get_recent_logs', limit: 10 })
      });

      if (response.ok) {
        const data = await safeJsonParse(response);
        if (data.success && data.logs) {
          // تحويل بيانات البصمة إلى تنسيق مناسب للعرض
          const formattedLogs = data.logs.map(log => ({
            id: log.id,
            employee_name: log.Name || log.employee_name,
            type: log['Clock In'] ? 'check_in' : 'check_out',
            time: log['Clock In'] || log['Clock Out'],
            date: log.Date || log.attendance_date,
            device_name: log.device_name || 'جهاز البصمة'
          }));
          setAttendanceLogs(formattedLogs);
        } else {
          setAttendanceLogs([]);
        }
      } else {
        console.error('Failed to load attendance logs:', response.status);
        setAttendanceLogs([]);
      }
    } catch (error) {
      console.error('Error loading attendance logs:', error);
      setAttendanceLogs([]);
      toast({
        title: 'خطأ في تحميل سجلات الحضور',
        description: 'تعذر تحميل سجلات الحضور من قاعدة البيانات',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // دالة لتحديث آخر مزامنة
  const updateLastSyncTime = () => {
    try {
      const now = new Date().toISOString();
      localStorage.setItem('virtualDeviceLastSync', now);
    } catch (error) {
      console.error('Error updating last sync:', error);
    }
  };

  // دالة للتحقق من إعدادات البصمة والمزامنة
  const checkFingerprintSettings = async () => {
    try {
      const response = await fetch(getApiUrl('/api/fingerprint_settings_api.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'get_settings' })
      });

      if (response.ok) {
        const data = await safeJsonParse(response);
        if (data.success && data.settings) {
          return {
            fingerprint_enabled: data.settings.fingerprint_enabled?.value || false,
            auto_sync_enabled: data.settings.auto_sync_enabled?.value || false
          };
        }
      }
      return { fingerprint_enabled: false, auto_sync_enabled: false };
    } catch (error) {
      console.error('Error checking fingerprint settings:', error);
      return { fingerprint_enabled: false, auto_sync_enabled: false };
    }
  };

  // دالة للتحقق من حالة الجهاز الافتراضي
  const checkVirtualDeviceStatus = async () => {
    try {
      const settings = await checkFingerprintSettings();
      return settings.fingerprint_enabled;
    } catch (error) {
      console.error('Error checking virtual device status:', error);
      return false;
    }
  };

  // دالة للتحقق والمزامنة إذا كانت الإعدادات تسمح
  const checkAndSyncIfEnabled = async () => {
    try {
      const settings = await checkFingerprintSettings();
      
      if (!settings.fingerprint_enabled) {
        toast({
          title: 'البصمة معطلة',
          description: 'تم تسجيل البيانات ولكن البصمة معطلة',
          status: 'warning',
          duration: 3000,
        });
        return;
      }

      if (!settings.auto_sync_enabled) {
        toast({
          title: 'المزامنة التلقائية معطلة',
          description: 'تم تسجيل البيانات ولكن المزامنة التلقائية معطلة',
          status: 'info',
          duration: 3000,
        });
        return;
      }

      // إذا كانت الإعدادات تسمح، قم بالمزامنة
      await handleSyncToAttendanceLogs();
      updateLastSyncTime();
    } catch (error) {
      console.error('Error in checkAndSyncIfEnabled:', error);
    }
  };

  const handleSyncToAttendanceLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/api/virtual_device_api.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'sync_to_attendance_logs', 
          date: new Date().toISOString().split('T')[0],
          limit: 100
        })
      });

      if (response.ok) {
        const data = await safeJsonParse(response);
        if (data.success) {
          toast({
            title: 'تمت المزامنة بنجاح',
            description: `تم مزامنة ${data.synced_count} سجل جديد وتحديث ${data.updated_count} سجل موجود`,
            status: 'success',
            duration: 5000,
          });
          loadAttendanceLogs(); // إعادة تحميل السجلات
          updateLastSyncTime(); // تحديث آخر مزامنة
        } else {
          toast({
            title: 'فشل في المزامنة',
            description: data.message || 'حدث خطأ غير متوقع',
            status: 'error',
            duration: 3000,
          });
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      toast({
        title: 'خطأ في المزامنة',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (employee) => {
    try {
      // التحقق من حالة الجهاز الافتراضي
      const isDeviceEnabled = await checkVirtualDeviceStatus();
      if (!isDeviceEnabled) {
        toast({
          title: 'الجهاز غير متصل',
          description: 'البصمة معطلة - لا يمكن تسجيل الدخول',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      setLoading(true);
      const currentTime = customCheckInTime || new Date().toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      const attendanceDate = customDate || new Date().toISOString().split('T')[0];
      
       // استخدام API لتسجيل الدخول في قاعدة البيانات
       const response = await fetch(getApiUrl('/api/virtual_device_api.php'), {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           action: 'check_in',
           'AC-No.': employee.employee_id || employee.id,
           Name: employee.name,
           Date: attendanceDate, // YYYY-MM-DD
           'Clock In': currentTime,
           'Clock Out': null,
           Late: 0,
           Early: 0,
           Absent: 0,
           'OT Time': 0,
           'Work Time': 0,
           Department: employee.department || '',
           week: new Date().getDay(),
           device_id: 'VIRTUAL_001',
           device_name: 'الجهاز الافتراضي'
         })
       });
       
       if (response.ok) {
         const responseText = await response.text();
         console.log('Check-in response:', responseText); // للتشخيص
         
         try {
           const data = JSON.parse(responseText);
           if (data.success) {
             toast({
               title: 'تم تسجيل الدخول',
               description: `تم تسجيل دخول ${employee.name} في ${currentTime}${customCheckInTime ? ' (وقت مخصص)' : ' (وقت النظام)'} بتاريخ ${attendanceDate}${customDate ? ' (تاريخ مخصص)' : ' (تاريخ اليوم)'}`,
               status: 'success',
               duration: 3000,
             });
             setSelectedEmployee(null);
             loadAttendanceLogs(); // إعادة تحميل السجلات الحقيقية
             // مزامنة تلقائية مع attendance_logs
             setTimeout(() => {
               checkAndSyncIfEnabled();
             }, 1000);
           } else {
             toast({
               title: 'فشل في تسجيل الدخول',
               description: data.message || 'حدث خطأ غير متوقع',
               status: 'error',
               duration: 3000,
             });
           }
         } catch (parseError) {
           console.error('JSON Parse Error:', parseError);
           console.error('Response text:', responseText);
           toast({
             title: 'خطأ في استجابة الخادم',
             description: 'استجابة غير صحيحة من الخادم',
             status: 'error',
             duration: 3000,
           });
         }
       } else {
         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
       }
      
    } catch (error) {
      toast({
        title: 'خطأ في تسجيل الدخول',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (employee) => {
    try {
      // التحقق من حالة الجهاز الافتراضي
      const isDeviceEnabled = await checkVirtualDeviceStatus();
      if (!isDeviceEnabled) {
        toast({
          title: 'الجهاز غير متصل',
          description: 'البصمة معطلة - لا يمكن تسجيل الخروج',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      setLoading(true);
      const currentTime = customCheckOutTime || new Date().toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      const attendanceDate = customDate || new Date().toISOString().split('T')[0];
      
       // استخدام API لتسجيل الخروج في قاعدة البيانات
       const response = await fetch(getApiUrl('/api/virtual_device_api.php') , {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           action: 'check_out',
           'AC-No.': employee.employee_id || employee.id,
           Name: employee.name,
           Date: attendanceDate, // YYYY-MM-DD
           'Clock In': null, // سيتم البحث عن سجل الدخول الموجود
           'Clock Out': currentTime,
           Late: 0,
           Early: 0,
           Absent: 0,
           'OT Time': 0,
           'Work Time': 0,
           Department: employee.department || '',
           week: new Date().getDay(),
           device_id: 'VIRTUAL_001',
           device_name: 'الجهاز الافتراضي'
         })
       });
       
       if (response.ok) {
         const responseText = await response.text();
         console.log('Check-out response:', responseText); // للتشخيص
         
         try {
           const data = JSON.parse(responseText);
           if (data.success) {
             toast({
               title: 'تم تسجيل الخروج',
               description: `تم تسجيل خروج ${employee.name} في ${currentTime}${customCheckOutTime ? ' (وقت مخصص)' : ' (وقت النظام)'} بتاريخ ${attendanceDate}${customDate ? ' (تاريخ مخصص)' : ' (تاريخ اليوم)'}`,
               status: 'success',
               duration: 3000,
             });
             setSelectedEmployee(null);
             loadAttendanceLogs(); // إعادة تحميل السجلات الحقيقية
             // مزامنة تلقائية مع attendance_logs
             setTimeout(() => {
               checkAndSyncIfEnabled();
             }, 1000);
           } else {
             toast({
               title: 'فشل في تسجيل الخروج',
               description: data.message || 'حدث خطأ غير متوقع',
               status: 'error',
               duration: 3000,
             });
           }
         } catch (parseError) {
           console.error('JSON Parse Error:', parseError);
           console.error('Response text:', responseText);
           toast({
             title: 'خطأ في استجابة الخادم',
             description: 'استجابة غير صحيحة من الخادم',
             status: 'error',
             duration: 3000,
           });
         }
       } else {
         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
       }
      
    } catch (error) {
      toast({
        title: 'خطأ في تسجيل الخروج',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_id?.toString().includes(searchTerm)
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'green';
      case 'offline': return 'red';
      case 'warning': return 'orange';
      default: return 'gray';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online': return 'متصل';
      case 'offline': return 'غير متصل';
      case 'warning': return 'تحذير';
      default: return 'غير معروف';
    }
  };

  return (
    <>
        <HStack spacing="3" mb="4" flexWrap="wrap" justify="flex-end" rowGap={2}>
              <Button
                leftIcon={<FiRefreshCw />}
                className="stake-btn"
                size="md"
                borderRadius="xl"
                onClick={() => {
                  loadEmployees();
                  loadAttendanceLogs();
                }}
                isLoading={loading}
              >
                تحديث البيانات
              </Button>
        </HStack>

        {/* Device Status Overview */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing="6" mb="8">
          <Card bg="var(--stake-bg-primary, #0f212e)" borderRadius="xl" boxShadow="0 10px 40px rgba(0, 0, 0, 0.3)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)">
            <CardBody p="6">
              <VStack align="flex-start" spacing="3">
                <HStack spacing="3">
                  <Icon as={isConnected ? FiWifi : FiWifiOff} boxSize="5" color={isConnected ? 'green.400' : 'red.400'} />
                  <Text className="stake-text-secondary" fontSize="sm" fontWeight="500">حالة الجهاز</Text>
                </HStack>
                <Text color="white" fontSize="xl" fontWeight="bold">
                  {getStatusText(deviceStatus)}
                </Text>
                <Badge 
                  colorScheme={getStatusColor(deviceStatus)} 
                  variant="subtle"
                  borderRadius="full"
                  px="3"
                  py="1"
                >
                  {isConnected ? 'نشط' : 'غير نشط'}
                </Badge>
              </VStack>
            </CardBody>
          </Card>

          <Card bg="var(--stake-bg-primary, #0f212e)" borderRadius="xl" boxShadow="0 10px 40px rgba(0, 0, 0, 0.3)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)">
            <CardBody p="6">
              <VStack align="flex-start" spacing="3">
                <HStack spacing="3">
                  <Icon as={FiUsers} boxSize="5" color="blue.400" />
                  <Text className="stake-text-secondary" fontSize="sm" fontWeight="500">إجمالي الموظفين</Text>
                </HStack>
                <Text color="white" fontSize="2xl" fontWeight="bold">
                  {employees.length}
                </Text>
                <Text className="stake-text-secondary" fontSize="xs">موظف مسجل</Text>
              </VStack>
            </CardBody>
          </Card>

          <Card bg="var(--stake-bg-primary, #0f212e)" borderRadius="xl" boxShadow="0 10px 40px rgba(0, 0, 0, 0.3)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)">
            <CardBody p="6">
              <VStack align="flex-start" spacing="3">
                <HStack spacing="3">
                  <Icon as={FiLogIn} boxSize="5" color="green.400" />
                  <Text className="stake-text-secondary" fontSize="sm" fontWeight="500">تسجيلات اليوم</Text>
                </HStack>
                <Text color="white" fontSize="2xl" fontWeight="bold">
                  {attendanceLogs.length}
                </Text>
                <Text className="stake-text-secondary" fontSize="xs">سجل حضور</Text>
              </VStack>
            </CardBody>
          </Card>

          <Card bg="var(--stake-bg-primary, #0f212e)" borderRadius="xl" boxShadow="0 10px 40px rgba(0, 0, 0, 0.3)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)">
            <CardBody p="6">
              <VStack align="flex-start" spacing="3">
                <HStack spacing="3">
                  <Icon as={FiClock} boxSize="5" color="orange.400" />
                  <Text className="stake-text-secondary" fontSize="sm" fontWeight="500">الوقت الحالي</Text>
                </HStack>
                <Text color="white" fontSize="lg" fontWeight="600">
                  {new Date().toLocaleTimeString('en-US', { 
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
                <Text className="stake-text-secondary" fontSize="xs">توقيت النظام</Text>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Virtual Device Interface */}
        <Card bg="var(--stake-bg-primary, #0f212e)" borderRadius="xl" boxShadow="0 10px 40px rgba(0, 0, 0, 0.3)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)" mb="8">
          <CardHeader>
            <HStack spacing="4" justify="space-between" w="full">
              <HStack spacing="4">
                <Icon as={FiMonitor} boxSize="6" color="blue.400" />
                <VStack align="flex-start" spacing="1">
                  <Heading size="md" color="white">واجهة الجهاز الافتراضي</Heading>
                  <Text className="stake-text-secondary" fontSize="sm">
                    محاكاة جهاز البصمة الحقيقي مع إمكانية تسجيل الدخول والخروج
                  </Text>
                </VStack>
              </HStack>
              
              {/* Employee Selection Menu */}
              <HStack spacing="3">
                <Menu>
                  <MenuButton
                    as={Button}
                    rightIcon={<FiChevronDown />}
                    leftIcon={<FiUsers />}
                    className="stake-btn-secondary"
                    size="md"
                    borderRadius="xl"
                    minW="200px"
                    isDisabled={loading}
                  >
                    {loading ? 'جاري التحميل...' : `اختر الموظف (${employees.length})`}
                  </MenuButton>
                <MenuList 
                  bg="var(--stake-bg-primary, #0f212e)" 
                  border="1px solid" 
                  borderColor="var(--stake-border-primary, #3e5665)"
                  borderRadius="xl"
                  boxShadow="0 10px 40px rgba(0, 0, 0, 0.3)"
                  maxH="400px"
                  overflowY="auto"
                >
                  {/* Search Input */}
                  <Box p="3" borderBottom="1px solid" borderColor="var(--stake-border-primary, #3e5665)">
                    <InputGroup size="sm">
                      <InputLeftElement pointerEvents="none">
                        <Icon as={FiUserCheck} className="stake-text-secondary" />
                      </InputLeftElement>
                      <Input
                        placeholder="ابحث عن الموظف..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        bg="white"
                        color="black"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="var(--stake-border-primary, #3e5665)"
                        _focus={{
                          borderColor: "blue.400",
                          boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)"
                        }}
                      />
                    </InputGroup>
                  </Box>
                  
                  {/* Employee List */}
                  {loading ? (
                    <MenuItem isDisabled>
                      <HStack spacing="3" w="full" justify="center">
                        <Spinner size="sm" color="blue.400" />
                        <Text className="stake-text-secondary" fontSize="sm">جاري التحميل...</Text>
                      </HStack>
                    </MenuItem>
                  ) : employees.length === 0 ? (
                    <MenuItem isDisabled>
                      <Text className="stake-text-secondary" fontSize="sm">لا يوجد موظفين في النظام</Text>
                    </MenuItem>
                  ) : filteredEmployees.length === 0 ? (
                    <MenuItem isDisabled>
                      <Text className="stake-text-secondary" fontSize="sm">لا توجد نتائج للبحث</Text>
                    </MenuItem>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <MenuItem
                        key={employee.id}
                        bg="transparent"
                        _hover={{ bg: "rgba(255, 255, 255, 0.1)" }}
                        _focus={{ bg: "rgba(255, 255, 255, 0.1)" }}
                        onClick={() => {
                          console.log('Selected employee:', employee); // للتشخيص
                          setSelectedEmployee(employee);
                          setSearchTerm(''); // مسح البحث بعد الاختيار
                        }}
                      >
                        <HStack spacing="3" w="full">
                          <Avatar size="sm" name={employee.name} bg="blue.500" />
                          <VStack align="flex-start" spacing="0" flex="1">
                            <Text color="white" fontSize="sm" fontWeight="500">
                              {employee.name || 'غير محدد'}
                            </Text>
                            <Text className="stake-text-secondary" fontSize="xs">
                              رقم: {employee.employee_id || employee.id || 'غير محدد'}
                            </Text>
                            {employee.department && (
                              <Text className="stake-text-secondary" fontSize="xs">
                                القسم: {employee.department}
                              </Text>
                            )}
                          </VStack>
                        </HStack>
                      </MenuItem>
                    ))
                  )}
                </MenuList>
                </Menu>
                
                <IconButton
                  aria-label="إعادة تحميل الموظفين"
                  icon={<FiRefreshCw />}
                  size="md"
                  variant="ghost"
                  color="blue.400"
                  onClick={loadEmployees}
                  isLoading={loading}
                  _hover={{ bg: "rgba(255, 255, 255, 0.1)" }}
                />
              </HStack>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing="8">
              {/* Device Screen Simulation */}
              <Box 
                w="full" 
                h="200px" 
                bg="linear-gradient(135deg, #1a202c 0%, #2d3748 100%)" 
                borderRadius="xl" 
                border="2px solid" 
                borderColor="var(--stake-border-primary, #4a5568)"
                position="relative"
                overflow="hidden"
              >
                <Center h="full">
                  <VStack spacing="4">
                    <Icon as={FiMonitor} boxSize="12" color="blue.400" />
                    <Text color="white" fontSize="lg" fontWeight="600">الجهاز الافتراضي</Text>
                    <Text className="stake-text-secondary" fontSize="sm">جهاز البصمة - متصل</Text>
                    <HStack spacing="2">
                      <Box w="2" h="2" bg="green.400" borderRadius="full" />
                      <Text color="green.400" fontSize="xs">ONLINE</Text>
                    </HStack>
                  </VStack>
                </Center>
                
                {/* Decorative Elements */}
                <Box position="absolute" top="4" right="4" w="3" h="3" bg="green.400" borderRadius="full" />
                <Box position="absolute" bottom="4" left="4" w="2" h="2" bg="blue.400" borderRadius="full" />
              </Box>

              {/* Selected Employee Display */}
              {selectedEmployee && (
                <Box 
                  w="full" 
                  p="4" 
                  bg="var(--stake-bg-secondary, #111827)" 
                  borderRadius="xl" 
                  border="2px solid" 
                  borderColor="var(--stake-border-primary, #3e5665)"
                >
                  <HStack spacing="4" justify="center">
                    <Avatar size="lg" name={selectedEmployee.name} bg="blue.500" />
                    <VStack align="flex-start" spacing="1">
                      <Text color="white" fontSize="lg" fontWeight="600">
                        {selectedEmployee.name}
                      </Text>
                      <Text className="stake-text-secondary" fontSize="sm">
                        رقم الموظف: {selectedEmployee.employee_id}
                      </Text>
                      {selectedEmployee.department && (
                        <Text className="stake-text-secondary" fontSize="xs">
                          القسم: {selectedEmployee.department}
                        </Text>
                      )}
                    </VStack>
                    <IconButton
                      aria-label="إلغاء الاختيار"
                      icon={<FiX />}
                      size="sm"
                      variant="ghost"
                      className="stake-text-secondary"
                      onClick={() => setSelectedEmployee(null)}
                      _hover={{ color: "white", bg: "rgba(255, 255, 255, 0.1)" }}
                    />
                  </HStack>
                </Box>
              )}

              {/* Custom Date Input */}
              <VStack spacing="3" w="full">
                <Text color="white" fontSize="md" fontWeight="semibold">
                  إدخال التاريخ يدوياً (اختياري)
                </Text>
                
                <HStack spacing="2" w="full" justify="center">
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    bg="var(--stake-bg-secondary, #111827)"
                    borderColor="var(--stake-border-primary, #2f4553)"
                    color="white"
                    size="md"
                    flex="1"
                    maxW="200px"
                    _focus={{ borderColor: "#3b82f6", boxShadow: "0 0 0 1px #3b82f6" }}
                    _hover={{ borderColor: "#4a5568" }}
                  />
                </HStack>
              </VStack>

              {/* Time Input and Action Buttons in One Row */}
              <VStack spacing="3" w="full">
                <Text color="white" fontSize="md" fontWeight="semibold">
                  إدخال الوقت يدوياً (اختياري)
                </Text>
                
                <SimpleGrid columns={2} spacing="6" w="full">
                  {/* Check In Group */}
                  <VStack spacing="2" align="stretch">
                    <Text className="stake-text-secondary" fontSize="sm" textAlign="center" fontWeight="medium">
                      تسجيل الدخول
                    </Text>
                    <HStack spacing="2">
                      <Input
                        type="time"
                        value={customCheckInTime}
                        onChange={(e) => setCustomCheckInTime(e.target.value)}
                        placeholder="HH:MM"
                        bg="var(--stake-bg-secondary, #111827)"
                        borderColor="var(--stake-border-primary, #2f4553)"
                        color="white"
                        size="sm"
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
                        leftIcon={<FiLogIn />}
                        className="stake-btn-success"
                        size="sm"
                        borderRadius="xl"
                        onClick={() => {
                          if (selectedEmployee) {
                            handleCheckIn(selectedEmployee);
                          } else {
                            toast({
                              title: 'يرجى اختيار موظف',
                              description: 'يجب اختيار موظف من القائمة أولاً',
                              status: 'warning',
                              duration: 3000,
                            });
                          }
                        }}
                        h="40px"
                        fontSize="sm"
                        isDisabled={!selectedEmployee}
                        opacity={selectedEmployee ? 1 : 0.5}
                        minW="80px"
                      >
                        دخول
                      </Button>
                    </HStack>
                  </VStack>
                  
                  {/* Check Out Group */}
                  <VStack spacing="2" align="stretch">
                    <Text className="stake-text-secondary" fontSize="sm" textAlign="center" fontWeight="medium">
                      تسجيل الخروج
                    </Text>
                    <HStack spacing="2">
                      <Input
                        type="time"
                        value={customCheckOutTime}
                        onChange={(e) => setCustomCheckOutTime(e.target.value)}
                        placeholder="HH:MM"
                        bg="var(--stake-bg-secondary, #111827)"
                        borderColor="var(--stake-border-primary, #2f4553)"
                        color="white"
                        size="sm"
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
                        leftIcon={<FiLogOut />}
                        className="stake-btn-error"
                        size="sm"
                        borderRadius="xl"
                        onClick={() => {
                          if (selectedEmployee) {
                            handleCheckOut(selectedEmployee);
                          } else {
                            toast({
                              title: 'يرجى اختيار موظف',
                              description: 'يجب اختيار موظف من القائمة أولاً',
                              status: 'warning',
                              duration: 3000,
                            });
                          }
                        }}
                        h="40px"
                        fontSize="sm"
                        isDisabled={!selectedEmployee}
                        opacity={selectedEmployee ? 1 : 0.5}
                        minW="80px"
                      >
                        خروج
                      </Button>
                    </HStack>
                  </VStack>
                </SimpleGrid>
                
                {/* Clear Times Button */}
                <Button
                  size="xs"
                  variant="ghost"
                  className="stake-text-secondary"
                  onClick={() => {
                    setCustomCheckInTime('');
                    setCustomCheckOutTime('');
                    setCustomDate('');
                  }}
                >
                  مسح الأوقات والتاريخ المخصص
                </Button>
              </VStack>
              
              {/* Sync Button */}
              <Button
                leftIcon={<FiRefreshCw />}
                colorScheme="purple"
                variant="outline"
                size="lg"
                w="full"
                h="50px"
                fontSize="md"
                onClick={checkAndSyncIfEnabled}
                isLoading={loading}
                _hover={{ 
                  bg: "purple.500", 
                  color: "white",
                  borderColor: "purple.500"
                }}
              >
                مزامنة مع سجلات الحضور
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {/* Recent Attendance Logs */}
        <Card bg="var(--stake-bg-primary, #0f212e)" borderRadius="xl" boxShadow="0 10px 40px rgba(0, 0, 0, 0.3)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)">
          <CardHeader>
            <HStack spacing="4">
              <Icon as={FiActivity} boxSize="6" color="purple.400" />
              <VStack align="flex-start" spacing="1">
                <Heading size="md" color="white">سجلات الحضور الحديثة</Heading>
                <Text className="stake-text-secondary" fontSize="sm">
                  آخر 10 سجلات حضور و انصراف من الجهاز الافتراضي
                </Text>
              </VStack>
            </HStack>
          </CardHeader>
          <CardBody>
            <TableContainer
              maxH="400px"
              overflowY="auto"
              overflowX="auto"
              borderRadius="lg"
              border="1px solid"
              borderColor="var(--stake-border-primary)"
              sx={{
                '&::-webkit-scrollbar': { width: '8px', height: '8px' },
                '&::-webkit-scrollbar-track': { background: 'var(--stake-bg-secondary)' },
                '&::-webkit-scrollbar-thumb': { background: 'var(--stake-border-primary)', borderRadius: '4px' },
              }}
            >
              <Table variant="simple" size="xs" className="stake-table main-content compact-data-table">
                <Thead
                  sx={{
                    '& th': {
                      color: 'var(--stake-table-header-text, var(--stake-text-primary)) !important',
                    },
                  }}
                >
                  <Tr>
                    <Th>اسم الموظف</Th>
                    <Th>نوع العملية</Th>
                    <Th>الوقت</Th>
                    <Th>التاريخ</Th>
                    <Th>الجهاز</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {attendanceLogs.length === 0 ? (
                    <Tr>
                      <Td colSpan={5}>
                        <Center py="8">
                          <VStack spacing="4">
                            <Icon as={FiActivity} boxSize="12" className="stake-text-secondary" />
                            <Text className="stake-text-secondary" fontSize="lg">لا توجد سجلات حضور</Text>
                            <Text className="stake-text-secondary" fontSize="sm">ابدأ بتسجيل الدخول أو الخروج للموظفين</Text>
                          </VStack>
                        </Center>
                      </Td>
                    </Tr>
                  ) : (
                    attendanceLogs.map((log, index) => (
                      <Tr key={index} _hover={{ bg: 'var(--stake-bg-hover)' }} transition="background 0.15s ease">
                        <Td>
                          <HStack spacing="3">
                            <Avatar size="sm" name={log.employee_name} bg="blue.500" />
                            <Text color="var(--stake-text-primary)" fontWeight="500">{log.employee_name}</Text>
                          </HStack>
                        </Td>
                        <Td>
                          <Badge 
                            colorScheme={log.type === 'check_in' ? 'green' : 'red'} 
                            variant="subtle"
                            borderRadius="full"
                            px="3"
                            py="1"
                          >
                            {log.type === 'check_in' ? 'دخول' : 'خروج'}
                          </Badge>
                        </Td>
                        <Td>
                          <Text color="var(--stake-text-secondary)" fontSize="sm">
                            {log.time || 'غير محدد'}
                          </Text>
                        </Td>
                        <Td>
                          <Text color="var(--stake-text-secondary)" fontSize="sm">
                            {log.date || 'غير محدد'}
                          </Text>
                        </Td>
                        <Td>
                          <HStack spacing="2">
                            <Icon as={FiMonitor} boxSize="4" color="blue.400" />
                            <Text color="var(--stake-text-secondary)" fontSize="sm">
                              {log.device_name || 'الجهاز الافتراضي'}
                            </Text>
                          </HStack>
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>

    </>
  );
};

export default VirtualFingerprintDevice;

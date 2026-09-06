import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Card,
  CardBody,
  CardHeader,
  Icon,
  Flex,
  Badge,
  Progress,
  useColorModeValue,
  Image,
  Container,
  SimpleGrid,
  Avatar,
  Divider,
  IconButton,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  List,
  ListItem,
  ListIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useToast,
  Circle
} from '@chakra-ui/react';

// Error Boundary for MobileApp
class MobileAppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.log('MobileApp Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box 
          w="100vw" 
          h="100vh" 
          bg="linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexDirection="column"
          color="white"
          p="4"
        >
          <Text fontSize="xl" mb="4">حدث خطأ في التطبيق</Text>
          <Text fontSize="md" textAlign="center" mb="4">
            يرجى إعادة تحميل الصفحة
          </Text>
          <Button 
            onClick={() => window.location.reload()}
            bg="rgba(255, 255, 255, 0.2)"
            color="white"
            _hover={{ bg: 'rgba(255, 255, 255, 0.3)' }}
          >
            إعادة التحميل
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
import { keyframes } from '@emotion/react';
import {
  FiHome,
  FiUsers,
  FiCalendar,
  FiDollarSign,
  FiSettings,
  FiMenu,
  FiUser,
  FiTrendingUp,
  FiActivity,
  FiTarget,
  FiAward,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiStar,
  FiHeart,
  FiZap,
  FiMaximize,
  FiMinimize,
  FiBriefcase,
  FiUserCheck,
  FiUserX,
  FiDatabase,
  FiWifi,
  FiShield
} from 'react-icons/fi';

// Mobile-specific animations
const slideUp = keyframes`
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const MobileApp = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  
  // Stats state (same as PremiumDashboard)
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalDepartments: 0,
    todayAttendance: 0,
    monthlySalary: 0,
    attendanceRate: 0,
    lateArrivals: 0,
    presentToday: 0,
    absentToday: 0,
    totalWorkingHours: 0,
    expectedWorkHours: 0,
    averageHours: 0,
    pendingLeaveRequests: 0,
    overtimeHours: 0,
    employeesWithoutCheckIn: 0,
    employeesWithoutCheckOut: 0
  });

  const [systemStatus, setSystemStatus] = useState({
    database: { status: 'loading', message: 'جاري التحقق...' },
    fingerprint: { status: 'loading', message: 'جاري التحقق...' },
    backup: { status: 'loading', message: 'جاري التحقق...' }
  });

  const [latestBackupDate, setLatestBackupDate] = useState(null);
  const [systemName, setSystemName] = useState('نظام إدارة الحضور والمرتبات');
  const [companyLogo, setCompanyLogo] = useState(null);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        toast({
          title: 'تم تفعيل وضع الشاشة الكاملة',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        toast({
          title: 'تم إلغاء وضع الشاشة الكاملة',
          status: 'info',
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.log('Fullscreen not supported or failed:', error);
      // Fallback: scroll to hide address bar
      window.scrollTo(0, 1);
      toast({
        title: 'تم إخفاء شريط العنوان',
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
    }
  };

  // Load dashboard data (same as PremiumDashboard)
  const loadDashboardData = async () => {
    try {
      console.log('MobileApp: Loading dashboard data...');
      setLoading(true);
      
      // استخدام نفس الـ origin للـ API calls (يعمل من localhost أو IP address)
      const API_BASE_URL = window.location.origin;
      
      // تحميل البيانات الحقيقية من قاعدة البيانات مع معالجة الأخطاء
      let employees = { data: [] };
      let attendance = { data: [] };
      let departments = { data: [] };
      let alertsData = { data: { alerts: [], pendingLeaveRequests: 0 } };
      let activitiesData = { data: { activities: [] } };

      try {
        const employeesRes = await fetch(`${API_BASE_URL}/api/unified_employees_api.php?action=get_employees`);
        if (employeesRes.ok) {
          employees = await employeesRes.json();
          console.log('MobileApp: Employees loaded:', employees);
        } else {
          console.log('MobileApp: Employees response not ok:', employeesRes.status);
        }
      } catch (error) {
        console.error('MobileApp: Error loading employees:', error);
      }

      try {
        const attendanceRes = await fetch(`${API_BASE_URL}/api/attendance_logs.php`);
        if (attendanceRes.ok) {
          attendance = await attendanceRes.json();
          console.log('MobileApp: Attendance loaded:', attendance);
        } else {
          console.log('MobileApp: Attendance response not ok:', attendanceRes.status);
        }
      } catch (error) {
        console.error('MobileApp: Error loading attendance:', error);
      }

      try {
        const departmentsRes = await fetch(`${API_BASE_URL}/api/departments.php`);
        if (departmentsRes.ok) {
          departments = await departmentsRes.json();
        }
      } catch (error) {
        console.log('Error loading departments:', error);
      }

      try {
        const alertsRes = await fetch(`${API_BASE_URL}/api/get_alerts.php`);
        if (alertsRes.ok) {
          alertsData = await alertsRes.json();
        }
      } catch (error) {
        console.log('Error loading alerts:', error);
      }

      try {
        const activitiesRes = await fetch(`${API_BASE_URL}/api/get_recent_activities.php`);
        if (activitiesRes.ok) {
          activitiesData = await activitiesRes.json();
        }
      } catch (error) {
        console.log('Error loading activities:', error);
      }

      // جلب متغيرات النظام (خاصة official_start_time و system_name)
      let systemVariables = {};
      try {
        const varsRes = await fetch(`${API_BASE_URL}/api/system_variables_api.php?action=get_variables`);
        if (varsRes.ok) {
          const varsData = await varsRes.json();
          if (varsData.success && varsData.data) {
            varsData.data.forEach(v => {
              systemVariables[v.variable_key] = v.variable_value;
            });
            // تحديث اسم النظام من متغيرات النظام
            if (systemVariables['system_name']) {
              setSystemName(systemVariables['system_name']);
            }
            // تحديث شعار الشركة من متغيرات النظام
            if (systemVariables['company_logo']) {
              setCompanyLogo(systemVariables['company_logo']);
            }
          }
        }
      } catch (error) {
        console.log('Error loading system variables:', error);
      }

      // تحميل حالة النظام
      try {
        const dbStatusRes = await fetch(`${API_BASE_URL}/api/get_database_status.php`);
        if (dbStatusRes.ok) {
          const dbStatus = await dbStatusRes.json();
          setSystemStatus(prev => ({
            ...prev,
            database: {
              status: dbStatus.success ? dbStatus.data.status : 'error',
              message: dbStatus.success ? dbStatus.data.message : 'خطأ في الاتصال'
            }
          }));
        }
      } catch (error) {
        console.log('Error loading database status:', error);
        setSystemStatus(prev => ({
          ...prev,
          database: { status: 'error', message: 'خطأ في الاتصال' }
        }));
      }

      try {
        const fpStatusRes = await fetch(`${API_BASE_URL}/api/get_fingerprint_status.php`);
        if (fpStatusRes.ok) {
          const fpStatus = await fpStatusRes.json();
          setSystemStatus(prev => ({
            ...prev,
            fingerprint: {
              status: fpStatus.success ? fpStatus.data.status : 'error',
              message: fpStatus.success ? fpStatus.data.message : 'خطأ في الاتصال'
            }
          }));
        }
      } catch (error) {
        console.log('Error loading fingerprint status:', error);
        setSystemStatus(prev => ({
          ...prev,
          fingerprint: { status: 'error', message: 'خطأ في الاتصال' }
        }));
      }

      // تحميل آخر تاريخ نسخة احتياطية
      try {
        const backupRes = await fetch(`${API_BASE_URL}/api/simple_backup.php?action=list&t=${Date.now()}`);
        if (backupRes.ok) {
          const backupData = await backupRes.json();
          if (backupData.success && backupData.backups && backupData.backups.length > 0) {
            // آخر نسخة احتياطية هي الأولى في القائمة (مرتبة حسب التاريخ)
            const latestBackup = backupData.backups[0];
            setLatestBackupDate(latestBackup.date);
            setSystemStatus(prev => ({
              ...prev,
              backup: {
                status: 'online',
                message: latestBackup.date
              }
            }));
          } else {
            setLatestBackupDate(null);
            setSystemStatus(prev => ({
              ...prev,
              backup: {
                status: 'warning',
                message: 'لا توجد نسخ احتياطية'
              }
            }));
          }
        }
      } catch (error) {
        console.log('Error loading backup status:', error);
        setLatestBackupDate(null);
        setSystemStatus(prev => ({
          ...prev,
          backup: { status: 'error', message: 'خطأ في الاتصال' }
        }));
      }

      // حساب الإحصائيات الحقيقية
      const today = new Date().toISOString().split('T')[0];
      console.log('MobileApp: Today date:', today);
      console.log('MobileApp: Attendance data structure:', attendance);
      console.log('MobileApp: Attendance.data:', attendance.data);
      console.log('MobileApp: Employees data structure:', employees);
      console.log('MobileApp: Employees.data:', employees.data);
      const todayAttendance = attendance.data?.filter(record => {
        // التحقق من تنسيقات التاريخ المختلفة
        const recordDate = record.attendance_date || record.date || record.attendanceDate;
        if (!recordDate) return false;
        
        // تحويل التاريخ إلى تنسيق YYYY-MM-DD للمقارنة
        const dateStr = typeof recordDate === 'string' 
          ? recordDate.split('T')[0] 
          : recordDate;
        
        return dateStr === today;
      }) || [];

      // حساب عدد الموظفين المختلفين الذين حضروا اليوم (وليس عدد السجلات)
      const presentEmployeeIds = new Set();
      const absentEmployeeIds = new Set();
      
      todayAttendance.forEach(record => {
        // استخدام employee_id أو employee_code أو AC-No. لتحديد الموظف
        const empId = record.employee_id || record.employeeId || record.employee_code || record['AC-No.'] || record.id;
        if (!empId) return;
        
        const empIdStr = String(empId);
        const checkIn = record.check_in_time || record.check_in || record.checkInTime;
        const recordStatus = record.status || '';
        
        // إذا كانت الحالة "absent" أو check_in = 00:00 أو فارغ، فالموظف غائب
        if (recordStatus === 'absent' || 
            !checkIn || 
            checkIn === 'NULL' || 
            checkIn === null || 
            checkIn === '' ||
            checkIn === '00:00' ||
            checkIn === '00:00:00' ||
            checkIn.startsWith('00:00')) {
          absentEmployeeIds.add(empIdStr);
        } else if (checkIn && checkIn !== 'NULL' && checkIn !== null && checkIn !== '') {
          // إذا كان check_in موجود وصالح، فالموظف حاضر
          presentEmployeeIds.add(empIdStr);
        }
      });
      
      const presentToday = presentEmployeeIds.size;
      const absentFromRecords = absentEmployeeIds.size;

      console.log('MobileApp: Today attendance count:', todayAttendance.length);
      console.log('MobileApp: Present employee IDs:', Array.from(presentEmployeeIds));
      console.log('MobileApp: Absent employee IDs:', Array.from(absentEmployeeIds));

      // حساب الموظفين النشطين فقط
      const activeEmployees = employees.data?.filter(emp => emp.status === 'active') || [];
      console.log('MobileApp: Active employees count:', activeEmployees.length);
      console.log('MobileApp: Active employees:', activeEmployees);
      
      // حساب الموظفين النشطين الذين لديهم سجلات حضور (حاضرين أو غائبين)
      const employeesWithRecords = new Set([...presentEmployeeIds, ...absentEmployeeIds]);
      
      // حساب الغائبين = الموظفين النشطين الذين لديهم سجلات بحالة absent + الموظفين النشطين الذين لا يوجد لهم سجلات
      const absentToday = absentFromRecords + Math.max(0, activeEmployees.length - employeesWithRecords.size);
      
      // حساب المتأخرين في الحضور فقط (وليس في الانصراف)
      // استخدام official_start_time من متغيرات النظام بدلاً من وقت ثابت
      let officialStartTime = systemVariables['official_start_time'] || '09:00:00';
      // التأكد من أن الوقت في تنسيق HH:MM:SS
      if (officialStartTime && !officialStartTime.includes(':')) {
        officialStartTime = '09:00:00';
      } else if (officialStartTime) {
        const parts = officialStartTime.split(':');
        if (parts.length === 2) {
          officialStartTime = `${parts[0]}:${parts[1]}:00`;
        } else if (parts.length === 1) {
          officialStartTime = '09:00:00';
        }
      }
      
      const lateArrivals = todayAttendance.filter(record => {
        const checkIn = record.check_in_time || record.check_in || record.checkInTime;
        if (!checkIn || checkIn === 'NULL' || checkIn === null || checkIn === '') return false;
        
        // تحويل الوقت إلى تنسيق قابل للمقارنة
        let timeStr = checkIn.includes('T') ? checkIn.split('T')[1] : checkIn;
        // التأكد من أن الوقت في تنسيق صحيح (HH:MM:SS)
        const timeParts = timeStr.split(':');
        if (timeParts.length < 2) return false;
        // إضافة الثواني إذا لم تكن موجودة
        if (timeParts.length === 2) {
          timeStr = `${timeStr}:00`;
        }
        
        try {
          const clockInTime = new Date(`2000-01-01T${timeStr}`);
          const expectedTime = new Date(`2000-01-01T${officialStartTime}`);
          // فقط التأخير في الحضور (check_in_time > official_start_time)
          return clockInTime > expectedTime;
        } catch (e) {
          console.error('Error comparing times:', e, { timeStr, officialStartTime });
          return false;
        }
      }).length;

      const attendanceRate = activeEmployees.length > 0 
        ? Math.round((presentToday / activeEmployees.length) * 100) 
        : 0;

      // حساب ساعات العمل الفعلية
      const totalWorkHours = todayAttendance.reduce((total, record) => {
        const checkIn = record.check_in_time || record.check_in || record.checkInTime;
        const checkOut = record.check_out_time || record.check_out || record.checkOutTime;
        
        if (checkIn && checkOut && 
            checkIn !== 'NULL' && checkOut !== 'NULL' &&
            checkIn !== null && checkOut !== null &&
            checkIn !== '' && checkOut !== '') {
          // استخدام work_hours إذا كان متاحاً
          if (record.work_hours || record.total_hours || record.workHours) {
            const hours = parseFloat(record.work_hours || record.total_hours || record.workHours || 0);
            return total + Math.max(0, hours);
          }
          
          // حساب الساعات من check_in و check_out
          const timeIn = checkIn.includes('T') ? checkIn.split('T')[1] : checkIn;
          const timeOut = checkOut.includes('T') ? checkOut.split('T')[1] : checkOut;
          const clockIn = new Date(`2000-01-01T${timeIn}`);
          const clockOut = new Date(`2000-01-01T${timeOut}`);
          const hours = (clockOut - clockIn) / (1000 * 60 * 60);
          return total + Math.max(0, hours);
        }
        return total;
      }, 0);

      // حساب الساعات المتوقعة
      // الساعات المتوقعة = عدد الموظفين النشطين × ساعات العمل اليومية
      let dailyWorkHours = null;
      
      // محاولة جلب daily_work_hours من متغيرات النظام
      if (systemVariables['daily_work_hours']) {
        dailyWorkHours = parseFloat(systemVariables['daily_work_hours']);
      }
      
      // إذا لم يكن daily_work_hours موجوداً، احسبه من official_start_time و official_end_time
      if (!dailyWorkHours || isNaN(dailyWorkHours)) {
        const officialStartTime = systemVariables['official_start_time'] || '08:30:00';
        const officialEndTime = systemVariables['official_end_time'] || '18:30:00';
        
        try {
          // تنظيف الأوقات
          let startTime = officialStartTime;
          let endTime = officialEndTime;
          
          // التأكد من التنسيق الصحيح
          if (startTime && !startTime.includes(':')) {
            startTime = '08:30:00';
          } else if (startTime) {
            const parts = startTime.split(':');
            if (parts.length === 2) {
              startTime = `${parts[0]}:${parts[1]}:00`;
            }
          }
          
          if (endTime && !endTime.includes(':')) {
            endTime = '18:30:00';
          } else if (endTime) {
            const parts = endTime.split(':');
            if (parts.length === 2) {
              endTime = `${parts[0]}:${parts[1]}:00`;
            }
          }
          
          const start = new Date(`2000-01-01T${startTime}`);
          const end = new Date(`2000-01-01T${endTime}`);
          const diff = (end - start) / (1000 * 60 * 60); // الفرق بالساعات
          dailyWorkHours = Math.max(0, diff);
        } catch (e) {
          console.error('Error calculating daily work hours:', e);
          dailyWorkHours = 10; // قيمة افتراضية
        }
      }
      
      // إذا لم يتم الحصول على dailyWorkHours، استخدم قيمة افتراضية
      if (!dailyWorkHours || isNaN(dailyWorkHours)) {
        dailyWorkHours = 10;
      }
      
      // حساب الساعات المتوقعة
      const expectedWorkHours = activeEmployees.length * dailyWorkHours;

      const averageHours = presentToday > 0 ? Math.round((totalWorkHours / presentToday) * 10) / 10 : 0;

      // حساب إجمالي الإضافي لليوم
      const totalOvertimeHours = todayAttendance.reduce((total, record) => {
        // استخدام overtime_hours من السجل إذا كان متاحاً
        const overtime = parseFloat(record.overtime_hours || record.total_overtime_hours || 0);
        return total + Math.max(0, overtime);
      }, 0);

      // حساب الموظفين الذين لم يسجلوا دخول/خروج (فقط الموظفين النشطين)
      const employeesWithoutCheckIn = activeEmployees.filter(emp => {
        const hasCheckIn = todayAttendance.some(record => {
          const recordEmpId = record.employee_id || record.employeeId || record.employee_code;
          const empId = emp.id || emp.employee_id || emp.employee_code;
          const checkIn = record.check_in_time || record.check_in || record.checkInTime;
          return (recordEmpId == empId || recordEmpId === empId) && 
                 checkIn && checkIn !== 'NULL' && checkIn !== null && checkIn !== '';
        });
        return !hasCheckIn;
      }).length;

      const employeesWithoutCheckOut = todayAttendance.filter(record => {
        const checkIn = record.check_in_time || record.check_in || record.checkInTime;
        const checkOut = record.check_out_time || record.check_out || record.checkOutTime;
        return checkIn && checkIn !== 'NULL' && checkIn !== null && checkIn !== '' &&
               (!checkOut || checkOut === 'NULL' || checkOut === null || checkOut === '');
      }).length;

      console.log('MobileApp: Setting stats with:', {
        totalEmployees: activeEmployees.length,
        presentToday,
        absentToday,
        lateArrivals,
        attendanceRate,
        totalWorkingHours: Math.round(totalWorkHours * 10) / 10,
        expectedWorkHours: Math.round(expectedWorkHours * 10) / 10,
        overtimeHours: Math.round(totalOvertimeHours * 10) / 10
      });
      setStats({
        totalEmployees: activeEmployees.length,
        totalDepartments: departments.data?.length || 0,
        todayAttendance: presentToday,
        monthlySalary: 0, // سيتم حسابه من API منفصل
        attendanceRate,
        lateArrivals,
        presentToday,
        absentToday,
        totalWorkingHours: Math.round(expectedWorkHours * 10) / 10,
        expectedWorkHours: Math.round(totalWorkHours * 10) / 10,
        averageHours,
        pendingLeaveRequests: alertsData.data?.pendingLeaveRequests || 0,
        overtimeHours: Math.round(totalOvertimeHours * 10) / 10, // إجمالي الإضافي لليوم
        employeesWithoutCheckIn,
        employeesWithoutCheckOut
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: 'خطأ في تحميل البيانات',
        description: 'تعذر تحميل بيانات الصفحة الرئيسية',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // جلب بيانات الموظفين الحقيقية (deprecated - keeping for compatibility)
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/unified_employees_api.php', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setEmployees(data.employees || []);
        setDepartments(data.departments || []);
      } else {
        console.log('API Response:', data);
        console.error('Error fetching employees:', data.message || 'Unknown error');
        
        // Show user-friendly error message
        toast({
          title: 'تحذير',
          description: 'لا يمكن تحميل البيانات من الخادم - سيتم استخدام بيانات تجريبية',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
        // Use fallback data if API fails
        setEmployees([
          { 
            id: 1, 
            name: 'أحمد محمد', 
            code: 'EMP001', 
            department: 'Accounting Dep', 
            salary: '5,000.00 ج.م', 
            status: 'active',
            avatar: 'AM'
          },
          { 
            id: 2, 
            name: 'سارة أحمد', 
            code: 'EMP002', 
            department: 'Production Dep', 
            salary: '1,200.00 ج.م', 
            status: 'active',
            avatar: 'SA'
          },
          { 
            id: 3, 
            name: 'محمد علي', 
            code: 'EMP003', 
            department: 'IT Dep', 
            salary: '3,500.00 ج.م', 
            status: 'active',
            avatar: 'MA'
          },
          { 
            id: 4, 
            name: 'فاطمة حسن', 
            code: 'EMP004', 
            department: 'HR Dep', 
            salary: '2,800.00 ج.م', 
            status: 'inactive',
            avatar: 'FH'
          },
          { 
            id: 5, 
            name: 'علي محمود', 
            code: 'EMP005', 
            department: 'Sales Dep', 
            salary: '4,200.00 ج.م', 
            status: 'active',
            avatar: 'AM'
          }
        ]);
        setDepartments([
          { name: 'Accounting Dep', count: 8, color: 'blue.500' },
          { name: 'Production Dep', count: 12, color: 'green.500' },
          { name: 'IT Dep', count: 5, color: 'purple.500' },
          { name: 'HR Dep', count: 3, color: 'orange.500' },
          { name: 'Sales Dep', count: 7, color: 'red.500' }
        ]);
        
      }
    } catch (error) {
      console.log('Fetch Error:', error);
      console.error('Error fetching employees:', error.message || error);
      
      // Show user-friendly error message
      toast({
        title: 'خطأ في الاتصال',
        description: 'لا يمكن الاتصال بالخادم - سيتم استخدام بيانات تجريبية',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      
      // Use fallback data if API completely fails
      setEmployees([
        { 
          id: 1, 
          name: 'أحمد محمد', 
          code: 'EMP001', 
          department: 'Accounting Dep', 
          salary: '5,000.00 ج.م', 
          status: 'active',
          avatar: 'AM'
        },
        { 
          id: 2, 
          name: 'سارة أحمد', 
          code: 'EMP002', 
          department: 'Production Dep', 
          salary: '1,200.00 ج.م', 
          status: 'active',
          avatar: 'SA'
        },
        { 
          id: 3, 
          name: 'محمد علي', 
          code: 'EMP003', 
          department: 'IT Dep', 
          salary: '3,500.00 ج.م', 
          status: 'active',
          avatar: 'MA'
        },
        { 
          id: 4, 
          name: 'فاطمة حسن', 
          code: 'EMP004', 
          department: 'HR Dep', 
          salary: '2,800.00 ج.م', 
          status: 'inactive',
          avatar: 'FH'
        },
        { 
          id: 5, 
          name: 'علي محمود', 
          code: 'EMP005', 
          department: 'Sales Dep', 
          salary: '4,200.00 ج.م', 
          status: 'active',
          avatar: 'AM'
        }
      ]);
      setDepartments([
        { name: 'Accounting Dep', count: 8, color: 'blue.500' },
        { name: 'Production Dep', count: 12, color: 'green.500' },
        { name: 'IT Dep', count: 5, color: 'purple.500' },
        { name: 'HR Dep', count: 3, color: 'orange.500' },
        { name: 'Sales Dep', count: 7, color: 'red.500' }
      ]);
      
    } finally {
      setLoading(false);
    }
  };

  // فتح مودال الموظف
  const openEmployeeModal = (employee) => {
    setSelectedEmployee(employee);
    onModalOpen();
  };

  // فتح مودال التعديل
  const openEditModal = (employee) => {
    setSelectedEmployee(employee);
    toast({
      title: 'تعديل الموظف',
      description: `سيتم فتح نموذج تعديل ${employee.name}`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
    // هنا يمكن إضافة مودال التعديل
  };

  // Swipe handling functions
  const handleTouchStart = (e, employee) => {
    const touch = e.touches[0];
    setSwipeStartX(touch.clientX);
    setSwipeStartY(touch.clientY);
    setSwipeDirection(null);
    setSwipedEmployee(employee);
  };

  const handleTouchMove = (e) => {
    if (swipeStartX === null || swipeStartY === null) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStartX;
    const deltaY = touch.clientY - swipeStartY;
    
    // Check if it's a horizontal swipe (more horizontal than vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
      e.preventDefault(); // Prevent scrolling
      
      if (deltaX > 0) {
        setSwipeDirection('right');
        // Limit right swipe to half screen
        const maxSwipe = Math.min(deltaX, window.innerWidth * 0.5);
        setSwipePosition(maxSwipe);
      } else {
        setSwipeDirection('left');
        // Limit left swipe to half screen
        const maxSwipe = Math.max(deltaX, -window.innerWidth * 0.5);
        setSwipePosition(maxSwipe);
      }
    }
  };

  const handleTouchEnd = (e, employee) => {
    if (swipeStartX === null) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - swipeStartX;
    const deltaY = touch.clientY - swipeStartY;
    
    // Check if it's a valid swipe (minimum distance and more horizontal than vertical)
    if (Math.abs(deltaX) > 80 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        // Swipe left - show view button
        setSwipePosition(-window.innerWidth * 0.5);
        setSwipeDirection('left');
      } else {
        // Swipe right - show edit button
        setSwipePosition(window.innerWidth * 0.5);
        setSwipeDirection('right');
      }
    } else {
      // Reset if not enough swipe
      setSwipePosition(0);
      setSwipeDirection(null);
    }
    
    // Reset swipe start positions
    setSwipeStartX(null);
    setSwipeStartY(null);
  };

  // Handle click outside (removed swipe functionality)
  const handleMainContentClick = () => {
    // No swipe functionality needed for dashboard
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    setTimeout(() => setIsLoaded(true), 300);
    
    // جلب بيانات الصفحة الرئيسية
    loadDashboardData();
    
    // Fullscreen suggestion removed to prevent console spam

    // Remove any default margins/padding for mobile
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.documentElement.style.overflow = 'hidden';
    
    // Add CSS to remove any potential white spaces - Mobile App Only
    const style = document.createElement('style');
    style.setAttribute('data-mobile-app', 'true');
    style.textContent = `
      /* CSS مخصوص للموبايل فقط - لا يؤثر على الديسكتوب */
      .mobile-app-wrapper {

        box-sizing: border-box !important;
      }
      
      /* إعادة تعيين الـ padding والـ margin للعناصر الأساسية فقط */
      .mobile-app-wrapper .mobile-header,
      .mobile-app-wrapper .mobile-content,
      .mobile-app-wrapper .mobile-footer {
        margin: 0 !important;
        padding: 20px !important;
        box-sizing: border-box !important;
      }
      
      /* السماح للـ padding والـ margin في العناصر الداخلية */
      .mobile-app-wrapper .mobile-header > *,
      .mobile-app-wrapper .mobile-content > *,
      .mobile-app-wrapper .mobile-footer > * {
        box-sizing: border-box !important;
      }
    `;
    document.head.appendChild(style);

    // Hide address bar on mobile
    const hideAddressBar = () => {
      // Method 1: Scroll to hide address bar
      window.scrollTo(0, 1);
      
      // Method 2: Set viewport height
      const setViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      setViewportHeight();
      window.addEventListener('resize', setViewportHeight);
      
      // Simple address bar hiding
      window.scrollTo(0, 1);
    };

    hideAddressBar();

    // Auto fullscreen removed to prevent console errors
    // User can manually trigger fullscreen using the button in header

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      clearInterval(timer);
      
      // Remove event listeners
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      
      // Reset styles when component unmounts
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.overflow = '';
      document.documentElement.style.margin = '';
      document.documentElement.style.padding = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.removeProperty('--vh');
      
      // Remove the added CSS
      const addedStyle = document.querySelector('style[data-mobile-app]');
      if (addedStyle) {
        addedStyle.remove();
      }

    };
  }, []);

  // No need for quickStats - we'll use stats from loadDashboardData

  console.log('MobileApp: Rendering component, stats:', stats, 'loading:', loading, 'isLoaded:', isLoaded);

  return (
    <Box
      className="mobile-app-wrapper"
      bg="var(--stake-bg-primary, #0f212e)"
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      overflow="visible"
      w="100vw"
      h="100vh"
      m="0"
      p="0"
      minW="100vw"
      minH="100vh"
      maxW="100vw"
      maxH="100vh"
      zIndex="9999"
    >

      {/* Mobile Header */}
      <Box
        className="mobile-header"
        bg="linear-gradient(358deg, rgb(7 23 37) 0%, #000000 100%)"
        p="4"
        borderBottom="1px solid #2f4553"
        w="100%"
        minH="70px"
        position="relative"
        px="8"
        zIndex="5"
      >
        <HStack justify="space-between" align="center" h="full">
          <HStack spacing="3">
            <Box
              w="40px"
              h="40px"
              bg={companyLogo ? "transparent" : "rgba(34, 197, 94, 0.2)"}
              borderRadius="12px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              overflow="hidden"
              position="relative"
            >
              {companyLogo ? (
                <img 
                  src={companyLogo} 
                  alt="شعار الشركة" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain',
                    borderRadius: '12px'
                  }} 
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const iconElement = e.target.parentElement.querySelector('svg');
                    if (iconElement) {
                      iconElement.style.display = 'block';
                    }
                  }}
                />
              ) : null}
              <Icon 
                as={FiUsers} 
                color="#22c55e" 
                boxSize={5} 
                style={{ display: companyLogo ? 'none' : 'block' }}
              />
            </Box>
            <VStack align="start" spacing="0">
              <Text color="white" fontSize="md" fontWeight="bold">
                {systemName}
              </Text>
              <Text color="#a0aec0" fontSize="xs">
                إدارة شاملة ومبسطة للموظفين والحضور والرواتب
              </Text>
            </VStack>
          </HStack>
          <HStack spacing="2">
            <IconButton
              icon={isFullscreen ? <FiMinimize /> : <FiMaximize />}
              size="sm"
              variant="ghost"
              color="white"
              onClick={toggleFullscreen}
              aria-label="الشاشة الكاملة"
              _hover={{ bg: 'rgba(255, 255, 255, 0.1)' }}
            />
          </HStack>
        </HStack>
      </Box>

      {/* Main Content */}
      <Box 
        className="mobile-content"
        p="6" 
        pb="400px"
        w="100%"
        overflowY="auto"
        h="calc(100vh - 60px)"
        px="8"
        position="relative"
        zIndex="1"
      >
        {/* Hero Section */}
        <VStack spacing="6" align="center" textAlign="center" mb="8" mt="4">
          {/* Quick Stats Row */}
          <Box textAlign="center" p="4" bg="rgba(255, 255, 255, 0.05)" borderRadius="lg" border="1px solid" borderColor="rgba(255, 255, 255, 0.1)" w="full" maxW="md" mx="auto">
            <Text fontSize="2xl" fontWeight="bold" color="white">{loading ? '...' : stats.totalEmployees}</Text>
            <Text fontSize="md" color="#a0aec0">إجمالي الموظفين</Text>
          </Box>
        </VStack>

        {/* Today's Statistics */}
        <VStack spacing="4" mb="8" w="full">
          <Heading size="sm" color="white" w="full" textAlign="right">
            إحصائيات اليوم
          </Heading>
          <SimpleGrid columns={2} spacing="3" w="full">
            <Card bg="var(--stake-bg-secondary, #111827)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)" borderRadius="xl" p="4">
              <VStack spacing="3">
                <Circle size="10" bg="rgba(34, 197, 94, 0.2)" color="#22c55e">
                  <Icon as={FiUserCheck} boxSize="5" />
                </Circle>
                <VStack spacing="1" textAlign="center">
                  <Text fontSize="xl" fontWeight="bold" color="white">
                    {loading ? '...' : stats.presentToday}
              </Text>
                  <Text fontSize="xs" color="#a0aec0">حاضر اليوم</Text>
                        </VStack>
              </VStack>
            </Card>
            
            <Card bg="var(--stake-bg-secondary, #111827)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)" borderRadius="xl" p="4">
              <VStack spacing="3">
                <Circle size="10" bg="rgba(239, 68, 68, 0.2)" color="#ef4444">
                  <Icon as={FiUserX} boxSize="5" />
                </Circle>
                <VStack spacing="1" textAlign="center">
                  <Text fontSize="xl" fontWeight="bold" color="white">
                    {loading ? '...' : stats.absentToday}
                            </Text>
                  <Text fontSize="xs" color="#a0aec0">غائب اليوم</Text>
                          </VStack>
              </VStack>
            </Card>
            
            <Card bg="var(--stake-bg-secondary, #111827)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)" borderRadius="xl" p="4">
              <VStack spacing="3">
                <Circle size="10" bg="rgba(245, 158, 11, 0.2)" color="#f59e0b">
                  <Icon as={FiClock} boxSize="5" />
                </Circle>
                <VStack spacing="1" textAlign="center">
                  <Text fontSize="xl" fontWeight="bold" color="white">
                    {stats.lateArrivals}
                        </Text>
                  <Text fontSize="xs" color="#a0aec0">متأخر اليوم</Text>
                      </VStack>
              </VStack>
            </Card>
            
            <Card bg="var(--stake-bg-secondary, #111827)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)" borderRadius="xl" p="4">
              <VStack spacing="3">
                <Circle size="10" bg="rgba(59, 130, 246, 0.2)" color="#3b82f6">
                  <Icon as={FiTrendingUp} boxSize="5" />
                </Circle>
                <VStack spacing="1" textAlign="center">
                  <Text fontSize="xl" fontWeight="bold" color="white">
                    {loading ? '...' : stats.attendanceRate}%
                      </Text>
                  <Text fontSize="xs" color="#a0aec0">معدل الحضور</Text>
            </VStack>
          </VStack>
            </Card>

            <Card bg="var(--stake-bg-secondary, #111827)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)" borderRadius="xl" p="4">
              <VStack spacing="3">
                <Circle size="10" bg="rgba(168, 85, 247, 0.2)" color="#a855f7">
                  <Icon as={FiClock} boxSize="5" />
                </Circle>
                <VStack spacing="1" textAlign="center">
                  <Text fontSize="xl" fontWeight="bold" color="white">
                    {loading ? '...' : `${Math.round(stats.totalWorkingHours)}/${Math.round(stats.expectedWorkHours)}`}
            </Text>
                  <Text fontSize="xs" color="#a0aec0">ساعات العمل</Text>
                      </VStack>
              </VStack>
            </Card>

            <Card bg="var(--stake-bg-secondary, #111827)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)" borderRadius="xl" p="4">
              <VStack spacing="3">
                <Circle size="10" bg="rgba(168, 85, 247, 0.2)" color="#a855f7">
                  <Icon as={FiTrendingUp} boxSize="5" />
                </Circle>
                <VStack spacing="1" textAlign="center">
                  <Text fontSize="xl" fontWeight="bold" color="white">
                    {loading ? '...' : stats.overtimeHours}
                      </Text>
                  <Text fontSize="xs" color="#a0aec0">إجمالي الإضافي</Text>
            </VStack>
          </VStack>
            </Card>
          </SimpleGrid>
        </VStack>

        {/* System Status */}
        <VStack spacing="4" mb="8" w="full">
          <Heading size="sm" color="white" w="full" textAlign="right">
            حالة النظام
          </Heading>
          <SimpleGrid columns={1} spacing="3" w="full">
            <Card bg="var(--stake-bg-secondary, #111827)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)" borderRadius="xl" p="4">
              <HStack spacing="3">
                <Circle size="10" bg={
                  systemStatus.database.status === 'online' ? "rgba(34, 197, 94, 0.2)" :
                  systemStatus.database.status === 'warning' ? "rgba(245, 158, 11, 0.2)" :
                  "rgba(239, 68, 68, 0.2)"
                } color={
                  systemStatus.database.status === 'online' ? "#22c55e" :
                  systemStatus.database.status === 'warning' ? "#f59e0b" :
                  "#ef4444"
                }>
                  <Icon as={FiDatabase} boxSize="5" />
                </Circle>
                <VStack spacing="0" align="start" flex="1">
                  <Text fontSize="sm" fontWeight="500" color="white">قاعدة البيانات</Text>
                  <Text fontSize="xs" color="#a0aec0">{systemStatus.database.message}</Text>
        </VStack>
              </HStack>
            </Card>
            
            <Card bg="var(--stake-bg-secondary, #111827)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)" borderRadius="xl" p="4">
              <HStack spacing="3">
                <Circle size="10" bg={
                  systemStatus.fingerprint.status === 'online' ? "rgba(34, 197, 94, 0.2)" :
                  systemStatus.fingerprint.status === 'warning' ? "rgba(245, 158, 11, 0.2)" :
                  "rgba(239, 68, 68, 0.2)"
                } color={
                  systemStatus.fingerprint.status === 'online' ? "#22c55e" :
                  systemStatus.fingerprint.status === 'warning' ? "#f59e0b" :
                  "#ef4444"
                }>
                  <Icon as={FiWifi} boxSize="5" />
                </Circle>
                <VStack spacing="0" align="start" flex="1">
                  <Text fontSize="sm" fontWeight="500" color="white">أجهزة البصمة</Text>
                  <Text fontSize="xs" color="#a0aec0">{systemStatus.fingerprint.message}</Text>
                </VStack>
              </HStack>
            </Card>
            
            <Card bg="var(--stake-bg-secondary, #111827)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)" borderRadius="xl" p="4">
              <HStack spacing="3">
                <Circle size="10" bg={
                  systemStatus.backup.status === 'online' ? "rgba(34, 197, 94, 0.2)" :
                  systemStatus.backup.status === 'warning' ? "rgba(245, 158, 11, 0.2)" :
                  "rgba(239, 68, 68, 0.2)"
                } color={
                  systemStatus.backup.status === 'online' ? "#22c55e" :
                  systemStatus.backup.status === 'warning' ? "#f59e0b" :
                  "#ef4444"
                }>
                  <Icon as={FiShield} boxSize="5" />
                </Circle>
                <VStack spacing="0" align="start" flex="1">
                  <Text fontSize="sm" fontWeight="500" color="white">النسخ الاحتياطي</Text>
                  <Text fontSize="xs" color="#a0aec0">
                    {latestBackupDate 
                      ? new Date(latestBackupDate).toLocaleDateString('ar-EG', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : systemStatus.backup.message}
          </Text>
        </VStack>
              </HStack>
            </Card>
          </SimpleGrid>
        </VStack>


      {/* Spacer to prevent content from being hidden behind footer */}
      <Box h="200px" />
      </Box>

      {/* Mobile Bottom Navigation */}
      <Box
        className="mobile-footer"
        position="fixed"
        bottom="0"
        left="0"
        w="100vw"
        bg="rgba(255, 255, 255, 0.1)"
        backdropFilter="blur(25px)"
        borderTop="1px solid rgba(255, 255, 255, 0.2)"
        p="4"
        minH="90px"
        animation={`${slideUp} 0.5s ease`}
        boxShadow="0 -4px 20px rgba(0,0,0,0.3)"
        px="8"
        zIndex="10"
      >
        <HStack justify="space-between" align="center" h="full" px="6">
          <VStack spacing="1" align="center" flex="1">
            <Box
              w="32px"
              h="32px"
              bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              borderRadius="10px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              boxShadow="0 2px 8px rgba(102, 126, 234, 0.3)"
            >
              <Icon as={FiHome} color="white" boxSize={4} />
            </Box>
            <Text color="white" fontSize="xs" fontWeight="bold">الرئيسية</Text>
          </VStack>
          <VStack spacing="1" align="center" flex="1">
            <Box
              w="32px"
              h="32px"
              bg="rgba(255, 255, 255, 0.1)"
              borderRadius="10px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={FiUsers} color="rgba(255, 255, 255, 0.6)" boxSize={4} />
            </Box>
            <Text color="rgba(255, 255, 255, 0.6)" fontSize="xs" fontWeight="medium">الموظفين</Text>
          </VStack>
          <VStack spacing="1" align="center" flex="1">
            <Box
              w="32px"
              h="32px"
              bg="rgba(255, 255, 255, 0.1)"
              borderRadius="10px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={FiCalendar} color="rgba(255, 255, 255, 0.6)" boxSize={4} />
            </Box>
            <Text color="rgba(255, 255, 255, 0.6)" fontSize="xs" fontWeight="medium">الحضور</Text>
          </VStack>
          <VStack spacing="1" align="center" flex="1">
            <Box
              w="32px"
              h="32px"
              bg="rgba(255, 255, 255, 0.1)"
              borderRadius="10px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={FiDollarSign} color="rgba(255, 255, 255, 0.6)" boxSize={4} />
            </Box>
            <Text color="rgba(255, 255, 255, 0.6)" fontSize="xs" fontWeight="medium">الرواتب</Text>
          </VStack>
          <VStack spacing="1" align="center" flex="1">
            <Box
              w="32px"
              h="32px"
              bg="rgba(255, 255, 255, 0.1)"
              borderRadius="10px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={FiSettings} color="rgba(255, 255, 255, 0.6)" boxSize={4} />
            </Box>
            <Text color="rgba(255, 255, 255, 0.6)" fontSize="xs" fontWeight="medium">الإعدادات</Text>
          </VStack>
        </HStack>
      </Box>
    </Box>
  );
};

// Wrap MobileApp with Error Boundary
const MobileAppWithErrorBoundary = () => (
  <MobileAppErrorBoundary>
    <MobileApp />
  </MobileAppErrorBoundary>
);

export default MobileAppWithErrorBoundary;

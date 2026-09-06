import React, { useState, useEffect, useRef } from 'react';
import { getApiUrl } from '../utils/apiUrlHelper';
import {
  Box,
  Container,
  Grid,
  GridItem,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Card,
  CardBody,
  CardHeader,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  Badge,
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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from '@chakra-ui/react';
import {
  FiUsers,
  FiDollarSign,
  FiClock,
  FiTrendingUp,
  FiTrendingDown,
  FiUserCheck,
  FiUserX,
  FiCalendar,
  FiAlertTriangle,
  FiCheckCircle,
  FiPlus,
  FiFileText,
  FiSettings,
  FiBarChart,
  FiPieChart,
  FiActivity,
  FiTarget,
  FiShield,
  FiStar,
  FiBriefcase,
  FiPercent,
  FiDatabase,
  FiEye,
  FiEdit,
  FiDownload,
  FiArrowUpRight,
  FiArrowDownRight,
  FiMoreHorizontal,
  FiLogIn,
  FiLogOut,
  FiUser,
  FiCalendar as FiCalendarIcon,
  FiCheck,
  FiWifi,
} from 'react-icons/fi';

/** حركة العد من 0 إلى القيمة المستهدفة */
function useAnimatedNumber(target, options = {}) {
  const { duration = 1200, decimals = 0, enabled = true } = options;
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const startValRef = useRef(0);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!enabled || (typeof target !== 'number' && isNaN(Number(target)))) return;
    const targetNum = Number(target);
    startValRef.current = display;
    startTimeRef.current = null;
    const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

    const tick = (now) => {
      if (startTimeRef.current == null) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(t);
      const current = startValRef.current + (targetNum - startValRef.current) * eased;
      const rounded = decimals > 0 ? Math.round(current * Math.pow(10, decimals)) / Math.pow(10, decimals) : Math.round(current);
      setDisplay(rounded);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, enabled, duration, decimals]);

  return display;
}

const systemStatusTone = (status) => {
  if (status === 'online') return 'online';
  if (status === 'warning') return 'warning';
  if (status === 'loading') return 'loading';
  return 'danger';
};

const DashboardStatCard = ({ accent, icon, value, label, wide = false, valueSm = false }) => (
  <Box className={`tp-dashboard-stat-card tp-dashboard-stat-card--${accent}${wide ? ' tp-dashboard-stat-card--wide' : ''}`}>
    <Flex className="tp-dashboard-stat-card__icon" aria-hidden>
      <Icon as={icon} />
    </Flex>
    {wide ? (
      <Box className="tp-dashboard-stat-card__body">
        <Text className="tp-dashboard-stat-card__label">{label}</Text>
        <Text className={`tp-dashboard-stat-card__value${valueSm ? ' tp-dashboard-stat-card__value--sm' : ''}`}>{value}</Text>
      </Box>
    ) : (
      <>
        <Text className={`tp-dashboard-stat-card__value${valueSm ? ' tp-dashboard-stat-card__value--sm' : ''}`}>{value}</Text>
        <Text className="tp-dashboard-stat-card__label">{label}</Text>
      </>
    )}
  </Box>
);

const DashboardSystemCard = ({ icon, title, detail, status }) => (
  <Box className={`tp-dashboard-system-card tp-dashboard-system-card--${systemStatusTone(status)}`}>
    <Flex className="tp-dashboard-system-card__icon" aria-hidden>
      <Icon as={icon} />
    </Flex>
    <Box minW={0} flex="1">
      <Text className="tp-dashboard-system-card__title">{title}</Text>
      <Text className="tp-dashboard-system-card__detail">{detail}</Text>
    </Box>
  </Box>
);

const PremiumDashboard = () => {
  const toast = useToast();
  const { isOpen: isQuickAddOpen, onOpen: onQuickAddOpen, onClose: onQuickAddClose } = useDisclosure();
  
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

  const [alerts, setAlerts] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [attendanceChart, setAttendanceChart] = useState([]);
  const [loading, setLoading] = useState(true);

  const animatedPresent = useAnimatedNumber(stats.presentToday, { duration: 1800, enabled: !loading });
  const animatedAbsent = useAnimatedNumber(stats.absentToday, { duration: 1800, enabled: !loading });
  const animatedLate = useAnimatedNumber(stats.lateArrivals, { duration: 1800, enabled: !loading });
  const animatedRate = useAnimatedNumber(stats.attendanceRate, { duration: 1800, enabled: !loading });
  const animatedWorkHours = useAnimatedNumber(stats.totalWorkingHours, { duration: 1800, decimals: 1, enabled: !loading });
  const animatedExpectedHours = useAnimatedNumber(stats.expectedWorkHours, { duration: 1800, decimals: 1, enabled: !loading });
  const animatedNoCheckOut = useAnimatedNumber(stats.employeesWithoutCheckOut, { duration: 1800, enabled: !loading });
  const animatedOvertime = useAnimatedNumber(stats.overtimeHours, { duration: 1800, decimals: 1, enabled: !loading });
  const animatedTotalEmp = useAnimatedNumber(stats.totalEmployees, { duration: 1800, enabled: !loading });
  const [systemStatus, setSystemStatus] = useState({
    database: { status: 'loading', message: 'جاري التحقق...' },
    fingerprint: { status: 'loading', message: 'جاري التحقق...' },
    backup: { status: 'loading', message: 'جاري التحقق...' }
  });
  const [latestBackupDate, setLatestBackupDate] = useState(null);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // تحميل البيانات الحقيقية من قاعدة البيانات مع معالجة الأخطاء
      let employees = { data: [] };
      let attendance = { data: [] };
      let departments = { data: [] };
      let alertsData = { data: { alerts: [], pendingLeaveRequests: 0 } };
      let activitiesData = { data: { activities: [] } };

      try {
        const employeesRes = await fetch(getApiUrl('/api/unified_employees_api.php?action=get_employees'));
        if (employeesRes.ok) {
          employees = await employeesRes.json();
        }
      } catch (error) {
        console.log('Error loading employees:', error);
      }

      try {
        const attendanceRes = await fetch(getApiUrl('/api/attendance_logs.php'));
        if (attendanceRes.ok) {
          attendance = await attendanceRes.json();
        }
      } catch (error) {
        console.log('Error loading attendance:', error);
      }

      try {
        const departmentsRes = await fetch(getApiUrl('/api/departments.php'));
        if (departmentsRes.ok) {
          departments = await departmentsRes.json();
        }
      } catch (error) {
        console.log('Error loading departments:', error);
      }

      try {
        const alertsRes = await fetch(getApiUrl('/api/get_alerts.php'));
        if (alertsRes.ok) {
          alertsData = await alertsRes.json();
        }
      } catch (error) {
        console.log('Error loading alerts:', error);
      }

      try {
        const activitiesRes = await fetch(getApiUrl('/api/get_recent_activities.php'));
        if (activitiesRes.ok) {
          activitiesData = await activitiesRes.json();
        }
      } catch (error) {
        console.log('Error loading activities:', error);
      }

      // جلب متغيرات النظام (خاصة official_start_time)
      let systemVariables = {};
      try {
        const varsRes = await fetch(getApiUrl('/api/system_variables_api.php?action=get_variables'));
        if (varsRes.ok) {
          const varsData = await varsRes.json();
          if (varsData.success && varsData.data) {
            varsData.data.forEach(v => {
              systemVariables[v.variable_key] = v.variable_value;
            });
          }
        }
      } catch (error) {
        console.log('Error loading system variables:', error);
      }

      // تحميل حالة النظام
      try {
        const dbStatusRes = await fetch(getApiUrl('/api/get_database_status.php'));
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
        const fpStatusRes = await fetch(getApiUrl('/api/get_fingerprint_status.php'));
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
        const backupRes = await fetch(getApiUrl(`/api/simple_backup.php?action=list&t=${Date.now()}`));
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

      // حساب الموظفين النشطين فقط
      const activeEmployees = employees.data?.filter(emp => emp.status === 'active') || [];
      
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

      setStats({
        totalEmployees: activeEmployees.length,
        totalDepartments: departments.data?.length || 0,
        todayAttendance: presentToday,
        monthlySalary: 0, // سيتم حسابه من API منفصل
        attendanceRate,
        lateArrivals,
        presentToday,
        absentToday,
        totalWorkingHours: Math.round(totalWorkHours * 10) / 10,
        expectedWorkHours: Math.round(expectedWorkHours * 10) / 10,
        averageHours,
        pendingLeaveRequests: alertsData.data?.pendingLeaveRequests || 0,
        overtimeHours: Math.round(totalOvertimeHours * 10) / 10,
        employeesWithoutCheckIn,
        employeesWithoutCheckOut
      });

      setAlerts(alertsData.data?.alerts || []);
      setRecentActivities(activitiesData.data?.activities || []);
      setAttendanceChart([]);

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

  const todayLabel = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const overtimeLabel = (() => {
    if (loading) return '...';
    const h = animatedOvertime;
    const word = h === 0 ? 'ساعات' : h >= 1 && h < 2 ? 'ساعة' : (h >= 2 && h < 3 && Number(h) === 2) ? 'ساعتان' : h >= 2 && h < 3 ? 'ساعات' : h >= 3 && h <= 10 ? 'ساعات' : 'ساعة';
    return `${h} ${word}`;
  })();

  const backupDetail = latestBackupDate
    ? new Date(latestBackupDate).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : systemStatus.backup.message;

  return (
    <Box className="tp-dashboard-page PremiumDashboard" dir="rtl" lang="ar">
      <Box className="tp-dashboard-hero">
        <Flex className="tp-dashboard-hero__inner">
          <HStack spacing={3} align="center" minW={0} flex="1">
            <Flex className="tp-dashboard-hero__icon" aria-hidden>
              <Icon as={FiActivity} boxSize={6} />
            </Flex>
            <Box minW={0}>
              <Heading className="tp-dashboard-hero__title">لوحة التحكم</Heading>
              <Text className="tp-dashboard-hero__subtitle">
                نظام إدارة الحضور والمرتبات — إدارة شاملة للموظفين والحضور والرواتب
              </Text>
            </Box>
          </HStack>
          <Text as="span" className="tp-dashboard-hero__date">{todayLabel}</Text>
        </Flex>
      </Box>

      <Box className="tp-dashboard-section">
        <Box className="tp-dashboard-section__head">
          <Heading className="tp-dashboard-section__title">إحصائيات اليوم</Heading>
          <Text className="tp-dashboard-section__hint">
            ملخص الحضور والانصراف لليوم — بناءً على الموظفين النشطين
          </Text>
        </Box>
        <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing="4">
          <DashboardStatCard accent="present" icon={FiUserCheck} value={loading ? '...' : animatedPresent} label="حاضر" />
          <DashboardStatCard accent="absent" icon={FiUserX} value={loading ? '...' : animatedAbsent} label="غائب" />
          <DashboardStatCard accent="late" icon={FiClock} value={loading ? '...' : animatedLate} label="متأخر" />
          <DashboardStatCard accent="rate" icon={FiPercent} value={loading ? '...' : `${animatedRate}%`} label="معدل الحضور" />
          <DashboardStatCard
            accent="hours"
            icon={FiClock}
            value={loading ? '...' : `${animatedWorkHours} / ${animatedExpectedHours}`}
            label="ساعات (فعلي / متوقع)"
            valueSm
          />
          <DashboardStatCard
            accent={stats.employeesWithoutCheckOut > 0 ? 'checkout' : 'present'}
            icon={FiLogOut}
            value={loading ? '...' : animatedNoCheckOut}
            label="لم يسجلوا خروج"
          />
        </SimpleGrid>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4" mt="4">
          <DashboardStatCard accent="overtime" icon={FiTrendingUp} value={overtimeLabel} label="إجمالي ساعات الإضافي اليوم" wide />
          <DashboardStatCard accent="employees" icon={FiUsers} value={loading ? '...' : animatedTotalEmp} label="إجمالي الموظفين" wide />
        </SimpleGrid>
      </Box>

      <Box className="tp-dashboard-section">
        <Box className="tp-dashboard-section__head">
          <Heading className="tp-dashboard-section__title">حالة النظام</Heading>
          <Text className="tp-dashboard-section__hint">متابعة سريعة لخدمات النظام الأساسية</Text>
        </Box>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing="4">
          <DashboardSystemCard
            icon={FiDatabase}
            title="قاعدة البيانات"
            detail={systemStatus.database.message}
            status={systemStatus.database.status}
          />
          <DashboardSystemCard
            icon={FiWifi}
            title="أجهزة البصمة"
            detail={systemStatus.fingerprint.message}
            status={systemStatus.fingerprint.status}
          />
          <DashboardSystemCard
            icon={FiShield}
            title="النسخ الاحتياطي"
            detail={backupDetail}
            status={systemStatus.backup.status}
          />
        </SimpleGrid>
      </Box>

      {/* Quick Add Modal */}
      <Modal isOpen={isQuickAddOpen} onClose={onQuickAddClose} size="md">
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden">
          <ModalHeader
            bg="var(--stake-bg-primary)"
            className="stake-text-primary"
            borderRadius="24px 24px 0 0"
            p="4"
            position="relative"
            boxShadow="0 4px 20px rgba(0, 0, 0, 0.4)"
          >
            <HStack justify="space-between" align="center" w="100%">
              <HStack spacing="3" align="center">
                <Icon as={FiUser} boxSize="4" />
                <Text fontSize="md" fontWeight="bold">إضافة موظف جديد</Text>
              </HStack>
              <ModalCloseButton className="stake-text-primary" position="relative" top="0" right="0" />
            </HStack>
          </ModalHeader>
          <ModalBody py="6" bg="var(--stake-bg-secondary)">
            <VStack spacing="4">
              <FormControl>
                <FormLabel className="stake-text-primary" fontSize="sm">الاسم الكامل</FormLabel>
                <Input 
                  placeholder="أدخل الاسم الكامل" 
                  bg="var(--stake-bg-primary)" 
                  borderColor="var(--stake-border-primary)" 
                  className="stake-text-primary"
                  _placeholder={{ color: 'var(--stake-text-secondary)' }}
                  _focus={{ borderColor: 'var(--stake-primary)' }}
                  borderRadius="xl"
                />
              </FormControl>
              <FormControl>
                <FormLabel className="stake-text-primary" fontSize="sm">كود الموظف</FormLabel>
                <Input 
                  placeholder="أدخل كود الموظف" 
                  bg="var(--stake-bg-primary)" 
                  borderColor="var(--stake-border-primary)" 
                  className="stake-text-primary"
                  _placeholder={{ color: 'var(--stake-text-secondary)' }}
                  _focus={{ borderColor: 'var(--stake-primary)' }}
                  borderRadius="xl"
                />
              </FormControl>
              <FormControl>
                <FormLabel className="stake-text-primary" fontSize="sm">القسم</FormLabel>
                <Select 
                  placeholder="اختر القسم"
                  bg="var(--stake-bg-primary)" 
                  borderColor="var(--stake-border-primary)" 
                  className="stake-text-primary"
                  _focus={{ borderColor: 'var(--stake-primary)' }}
                  borderRadius="xl"
                >
                  <option value="sales">المبيعات</option>
                  <option value="hr">الموارد البشرية</option>
                  <option value="it">التقنية</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter 
            display="flex" 
            justifyContent="flex-end" 
            gap="3"
            bg="var(--stake-bg-primary)"
            borderRadius="0 0 24px 24px"
            p="4"
            borderTop="1px solid"
            borderColor="var(--stake-border-primary)"
          >
            <Button 
              variant="ghost" 
              onClick={onQuickAddClose}
              className="stake-text-primary"
              _hover={{ bg: "rgba(255, 255, 255, 0.1)" }}
              borderRadius="xl"
            >
              إلغاء
            </Button>
            <Button
              bg="var(--stake-primary)"
              className="stake-text-primary"
              _hover={{ bg: "#3e5665" }}
              onClick={() => {
                toast({
                  title: 'تم إضافة الموظف بنجاح',
                  status: 'success',
                  duration: 3000,
                  isClosable: true,
                });
                onQuickAddClose();
              }}
              borderRadius="xl"
            >
              إضافة
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default PremiumDashboard;
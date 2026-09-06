import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getApiUrl } from '../utils/apiUrlHelper';
import dayjs from 'dayjs';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  IconButton,
  Avatar,
  Tooltip,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useColorModeValue,
  useToast,
  Image,
  Divider,
  Circle,
  Icon,
  Container,
  Spacer,
  Show,
  Hide,
  Stack,
  useBreakpointValue,
  Card,
  CardBody,
  SimpleGrid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
} from '@chakra-ui/react';
import {
  FiMenu,
  FiBell,
  FiUser,
  FiLogOut,
  FiSettings,
  FiChevronDown,
  FiChevronUp,
  FiChevronLeft,
  FiChevronRight,
  FiHome,
  FiUsers,
  FiBriefcase,
  FiCalendar,
  FiDollarSign,
  FiZap,
  FiShield,
  FiHeadphones,
  FiBarChart,
  FiPieChart,
  FiActivity,
  FiTarget,
  FiStar,
  FiGift,
  FiFileText,
  FiMessageCircle,
  FiHexagon,
  FiGlobe,
  FiHeart,
  FiUserPlus,
  FiPlus,
  FiSearch,
  FiFilter,
  FiMoreVertical,
  FiSun,
  FiMoon,
  FiTrendingUp,
  FiTrendingDown,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiXCircle,
  FiPause,
  FiDatabase,
  FiCode,
  FiTool,
  FiLock,
  FiEye,
  FiEyeOff,
  FiMaximize,
  FiMinimize,
} from 'react-icons/fi';
import { useSettings } from '../contexts/SettingsContext';
import { loadEmployees } from '../utils/apiHelper';
import LayoutBreadcrumbs from './LayoutBreadcrumbs';
import {
  readAllPageBackgroundsFromSettings,
  resolveBackgroundImageUrl,
  buildBackgroundLayerStyle,
} from '../utils/pageBackgroundHelper';
import {
  MENU_GROUPS,
  flatMenuItems,
  getRouteMeta,
  isFullWidthPath,
  isSettingsPath,
  isActiveMenuRoute,
  normalizePath,
  SIDEBAR_COLLAPSED_LS,
  SIDEBAR_COLLAPSED_WIDTH,
} from '../config/layoutRoutes';

const MENU_ICONS = {
  '/': FiHome,
  '/unified-employees': FiUsers,
  '/unified-attendance': FiCalendar,
  '/departments': FiBriefcase,
  '/weekly-salary': FiTrendingUp,
  '/monthly-salary': FiPieChart,
  '/advances': FiDollarSign,
  '/dynamic-system-manager': FiZap,
  '/fingerprint-management': FiShield,
  '/system-settings': FiSettings,
};

const getMenuIcon = (key) => MENU_ICONS[key] || FiHexagon;

const formatHeaderTime = (date = new Date()) =>
  date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const formatHeaderDate = (date = new Date()) =>
  date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const ZoneBackgroundLayer = ({ layer, className }) => {
  if (!layer) return null;
  return (
    <Box
      className={`tp-zone-bg-layer${className ? ` ${className}` : ''}`}
      aria-hidden
      style={{
        ...layer.style,
        opacity: layer.opacity,
      }}
    />
  );
};

const PremiumLayoutWrapper = ({ children, user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const toast = useToast();
  const isEmployeesPage = location.pathname === '/unified-employees';
  const isAttendancePage = location.pathname === '/unified-attendance';
  const isAdvancesPage = location.pathname === '/advances';
  const isSalaryColumnsPage = location.pathname === '/dynamic-system-manager';
  const isDepartmentsPage = location.pathname === '/departments';
  const isFingerprintPage = location.pathname === '/fingerprint-management';
  const isWeeklySalaryPage = location.pathname === '/weekly-salary';
  const isMonthlySalaryPage = location.pathname === '/monthly-salary';
  const isSalaryFullscreenPage = isWeeklySalaryPage || isMonthlySalaryPage;
  
  const [headerClock, setHeaderClock] = useState(() => ({
    time: formatHeaderTime(),
    date: formatHeaderDate(),
  }));
  const contentScrollRef = useRef(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [pageBackgrounds, setPageBackgrounds] = useState({
    login: { image: '', mode: 'cover', opacity: 100 },
    dashboard: { image: '', mode: 'cover', opacity: 100 },
    header: { image: '', mode: 'cover', opacity: 100 },
    sidebar: { image: '', mode: 'cover', opacity: 100 },
  });

  const loadPageBackgrounds = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/load_system_settings.php'));
      const data = await response.json();
      if (data.success && data.settings) {
        setPageBackgrounds(readAllPageBackgroundsFromSettings(data.settings));
      }
    } catch (error) {
      console.error('Error loading page backgrounds:', error);
    }
  }, []);

  useEffect(() => {
    loadPageBackgrounds();
    const onBackgroundUpdated = (event) => {
      if (event?.detail?.backgrounds) {
        setPageBackgrounds(event.detail.backgrounds);
        return;
      }
      loadPageBackgrounds();
    };
    window.addEventListener('pageBackgroundUpdated', onBackgroundUpdated);
    return () => window.removeEventListener('pageBackgroundUpdated', onBackgroundUpdated);
  }, [loadPageBackgrounds]);

  const dashboardBg = pageBackgrounds.dashboard;
  const headerBg = pageBackgrounds.header;
  const sidebarBg = pageBackgrounds.sidebar;
  const headerBgLayer = useMemo(
    () => buildBackgroundLayerStyle(headerBg, { clipToZone: true }),
    [headerBg.image, headerBg.mode, headerBg.opacity]
  );
  const hasHeaderZoneBg = !!headerBgLayer?.url;
  const dashboardBgLayer = useMemo(
    () => buildBackgroundLayerStyle(dashboardBg),
    [dashboardBg.image, dashboardBg.mode, dashboardBg.opacity]
  );
  const dashboardBgUrl = dashboardBgLayer?.url || '';
  const sidebarBgLayer = useMemo(
    () => buildBackgroundLayerStyle(sidebarBg, { clipToZone: true }),
    [sidebarBg.image, sidebarBg.mode, sidebarBg.opacity]
  );
  const hasSidebarZoneBg = !!sidebarBgLayer?.url;

  useEffect(() => {
    const root = document.documentElement;
    const syncLayoutBgZones = () => {
      if (dashboardBgUrl) {
        root.setAttribute('data-layout-bg', 'dashboard');
      } else {
        root.removeAttribute('data-layout-bg');
      }
      if (hasHeaderZoneBg) {
        root.setAttribute('data-header-has-bg', 'true');
      } else {
        root.removeAttribute('data-header-has-bg');
      }
      if (hasSidebarZoneBg) {
        root.setAttribute('data-sidebar-has-bg', 'true');
      } else {
        root.removeAttribute('data-sidebar-has-bg');
      }
      document.querySelectorAll('.stake-sidebar:not(.tp-sidebar-shell)').forEach((el) => {
        if (dashboardBgUrl || hasSidebarZoneBg) {
          el.style.background = 'transparent';
          el.style.backgroundImage = 'none';
        } else {
          el.style.removeProperty('background');
          el.style.removeProperty('background-image');
        }
      });
      document.querySelectorAll('.stake-header.tp-zone-has-custom-bg').forEach((el) => {
        el.style.removeProperty('background');
        el.style.removeProperty('background-image');
        el.style.removeProperty('background-color');
      });
      if (!dashboardBgUrl && !hasSidebarZoneBg) {
        window.dispatchEvent(new CustomEvent('themeChanged'));
      }
    };
    syncLayoutBgZones();
    window.addEventListener('themeChanged', syncLayoutBgZones);
    return () => {
      window.removeEventListener('themeChanged', syncLayoutBgZones);
    };
  }, [dashboardBgUrl, hasHeaderZoneBg, hasSidebarZoneBg]);

  useEffect(() => {
    if (!hasHeaderZoneBg) return undefined;
    const frameId = requestAnimationFrame(() => {
      document.querySelectorAll('.stake-header.tp-zone-has-custom-bg').forEach((el) => {
        el.style.removeProperty('background');
        el.style.removeProperty('background-image');
        el.style.removeProperty('background-color');
      });
    });
    return () => cancelAnimationFrame(frameId);
  }, [hasHeaderZoneBg]);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsBrowserFullscreen(
        !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement)
      );
    };

    syncFullscreenState();
    document.addEventListener('fullscreenchange', syncFullscreenState);
    document.addEventListener('webkitfullscreenchange', syncFullscreenState);
    document.addEventListener('mozfullscreenchange', syncFullscreenState);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState);
      document.removeEventListener('mozfullscreenchange', syncFullscreenState);
    };
  }, []);

  const toggleBrowserFullscreen = useCallback(async () => {
    const docEl = document.documentElement;
    const requestFs =
      docEl.requestFullscreen ||
      docEl.webkitRequestFullscreen ||
      docEl.mozRequestFullScreen ||
      docEl.msRequestFullscreen;
    const exitFs =
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.mozCancelFullScreen ||
      document.msExitFullscreen;
    const isFs = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement
    );

    try {
      if (!isFs) {
        if (requestFs) {
          await requestFs.call(docEl);
        }
      } else if (exitFs) {
        await exitFs.call(document);
      }
    } catch {
      /* المتصفح قد يرفض fullscreen بدون تفاعل مباشر */
    }
  }, []);

  const handleContentScroll = useCallback(() => {
    const el = contentScrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setHeaderScrolled(scrollTop > 8);
    const maxScroll = scrollHeight - clientHeight;
    setScrollProgress(maxScroll > 0 ? Math.min(100, (scrollTop / maxScroll) * 100) : 0);
  }, []);

  useEffect(() => {
    setHeaderScrolled(false);
    setScrollProgress(0);
    const el = contentScrollRef.current;
    if (!el) return undefined;
    el.scrollTop = 0;
    handleContentScroll();
    el.addEventListener('scroll', handleContentScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleContentScroll);
  }, [location.pathname, handleContentScroll]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setHeaderClock({
        time: formatHeaderTime(now),
        date: formatHeaderDate(now),
      });
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  // Employees quick stat
  const [employeesCount, setEmployeesCount] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalEmployees: 0,
    todayAttendance: 0,
    monthlySalary: 0,
    workHours: 0
  });
  const [weeklyHeaderStats, setWeeklyHeaderStats] = useState({ totalWorkers: 0, totalSalary: 0, bonus: 0 });
  const [monthlyHeaderStats, setMonthlyHeaderStats] = useState({ totalEmployees: 0, totalSalary: 0, bonus: 0 });
  const [systemVersion, setSystemVersion] = useState(null);
  
  // Password change modal
  const { isOpen: isPasswordModalOpen, onOpen: onPasswordModalOpen, onClose: onPasswordModalClose } = useDisclosure();
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  useEffect(() => {
    const fetchEmployeesCount = async () => {
      try {
        const result = await loadEmployees();
        if (result && result.success && Array.isArray(result.data)) {
          setEmployeesCount(result.data.length);
        } else if (Array.isArray(result)) {
          // In case apiHelper returns array directly in some scenarios
          setEmployeesCount(result.length);
        } else {
          setEmployeesCount(null);
        }
      } catch (e) {
        setEmployeesCount(null);
      }
    };
    fetchEmployeesCount();
  }, []);

  // Fetch system version
  useEffect(() => {
    const fetchSystemVersion = async () => {
      try {
        const response = await fetch(getApiUrl('/api/update_system.php?action=check'));
        const data = await response.json();
        if (data.success && data.currentVersion) {
          setSystemVersion(data.currentVersion);
        }
      } catch (e) {
        console.log('Could not fetch system version');
      }
    };
    fetchSystemVersion();
  }, []);

  // Load dashboard stats
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // Fetch employees count
        const employeesResult = await loadEmployees();
        const totalEmployees = employeesResult?.success ? employeesResult.data.length : 
                              Array.isArray(employeesResult) ? employeesResult.length : 0;

        // Fetch today's attendance
        const today = new Date().toISOString().split('T')[0];
        const attendanceResponse = await fetch(getApiUrl('/api/simple_attendance_api.php'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_attendance_records',
            start_date: today,
            end_date: today
          })
        });
        const attendanceData = await attendanceResponse.json();
        const todayAttendance = attendanceData?.success ? attendanceData.data.length : 0;

        // Calculate monthly salary (simplified)
        const monthlySalary = totalEmployees * 5000; // Average salary

        // Calculate work hours (simplified)
        const workHours = todayAttendance * 8; // 8 hours per employee

        setDashboardStats({
          totalEmployees,
          todayAttendance,
          monthlySalary,
          workHours
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    if (location.pathname === '/') {
      fetchDashboardStats();
    }
  }, [location.pathname]);

  // Header stats for weekly/monthly salary pages
  useEffect(() => {
    const fetchWeekly = async () => {
      try {
        const start = dayjs().startOf('week').format('YYYY-MM-DD');
        const end = dayjs().endOf('week').format('YYYY-MM-DD');
        const resp = await fetch('/api/unified_salary_api_v2.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_weekly_salary_data', start_date: start, end_date: end, salary_type: 'Weekly' })
        });
        const text = await resp.text();
        let json; try { json = JSON.parse(text); } catch { json = { success: false, data: [] }; }
        if (json.success && Array.isArray(json.data)) {
          const totalWorkers = json.data.length;
          const totalSalary = json.data.reduce((s, r) => s + (parseFloat(r.net_weekly_amount) || 0), 0);
          const bonus = json.data.reduce((s, r) => s + (parseFloat(r.attendance_bonus) || 0), 0);
          setWeeklyHeaderStats({ totalWorkers, totalSalary, bonus });
        } else {
          setWeeklyHeaderStats({ totalWorkers: 0, totalSalary: 0, bonus: 0 });
        }
      } catch {
        setWeeklyHeaderStats({ totalWorkers: 0, totalSalary: 0, bonus: 0 });
      }
    };
    const fetchMonthly = async () => {
      try {
        const start = dayjs().startOf('month').format('YYYY-MM-DD');
        const end = dayjs().endOf('month').format('YYYY-MM-DD');
        const resp = await fetch('/api/unified_salary_api_v2.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_monthly_salary_data', start_date: start, end_date: end, salary_type: 'Monthly' })
        });
        const text = await resp.text();
        let json; try { json = JSON.parse(text); } catch { json = { success: false, data: [] }; }
        if (json.success && Array.isArray(json.data)) {
          const totalEmployees = json.data.length;
          const totalSalary = json.data.reduce((s, r) => s + (parseFloat(r.net_monthly_amount) || 0), 0);
          const bonus = json.data.reduce((s, r) => s + (parseFloat(r.special_bonus) || 0), 0);
          setMonthlyHeaderStats({ totalEmployees, totalSalary, bonus });
        } else {
          setMonthlyHeaderStats({ totalEmployees: 0, totalSalary: 0, bonus: 0 });
        }
      } catch {
        setMonthlyHeaderStats({ totalEmployees: 0, totalSalary: 0, bonus: 0 });
      }
    };

    if (location.pathname === '/weekly-salary') fetchWeekly();
    if (location.pathname === '/monthly-salary') fetchMonthly();
  }, [location.pathname]);
  
  const isSettingsPage = isSettingsPath(location.pathname);
  const pathKey = normalizePath(location.pathname);
  const isSystemSettingsOnlyPage = pathKey === '/settings' || pathKey === '/system-settings';
  const routeMeta = getRouteMeta(location.pathname);
  const companyDisplayName = settings.companyName || 'TimePay';
  const isFluidPage = isFullWidthPath(location.pathname);
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_LS) === '1';
    } catch {
      return false;
    }
  });
  const [notifications, setNotifications] = useState([]);
  const { isOpen: isMobileMenuOpen, onOpen: onMobileMenuOpen, onClose: onMobileMenuClose } = useDisclosure();
  const { isOpen: isUserMenuOpen, onOpen: onUserMenuOpen, onClose: onUserMenuClose } = useDisclosure();
  
  // عند القوالب الفاتحة (الضوء الناعم / مادة بسيطة) نجعل خلفية المحتوى شفافة لتناسق الخلفية مع body
  const isLightAppearanceTheme = (themeId) => themeId === 'minimal-bright';
  const [isSoftLightTheme, setIsSoftLightTheme] = useState(() => {
    const tid = document.body.getAttribute('data-color-theme');
    if (isLightAppearanceTheme(tid)) return true;
    return document.body.getAttribute('data-theme') === 'light';
  });
  useEffect(() => {
    const handler = (e) => {
      const id =
        e?.detail?.themeId || document.body.getAttribute('data-color-theme') || '';
      setIsSoftLightTheme(
        isLightAppearanceTheme(id) || document.body.getAttribute('data-theme') === 'light'
      );
    };
    window.addEventListener('themeChanged', handler);
    const tid = document.body.getAttribute('data-color-theme');
    setIsSoftLightTheme(isLightAppearanceTheme(tid) || document.body.getAttribute('data-theme') === 'light');
    return () => window.removeEventListener('themeChanged', handler);
  }, []);
  
  // نعتمد دائماً على متغيرات الثيم — لا نستخدم احتياطيات داكنة ثابتة (تُفسد القوالب الفاتحة إذا تأخر تحميل الثيم)
  const mainContentBg = 'var(--stake-main-bg, var(--stake-bg-primary))';
  
  // Responsive values
  const sidebarWidth = useBreakpointValue({
    base: '280px',
    md: isSidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : '280px',
  });
  const isMobile = useBreakpointValue({ base: true, lg: false });

  const renderSidebarNavItem = (item, { collapsed = false } = {}) => {
    const IconComp = getMenuIcon(item.key);
    const isActive = isActiveMenuRoute(item.key, location.pathname);
    const navClass = `tp-sidebar-nav-item${isActive ? ' tp-sidebar-nav-item--active' : ''}${collapsed ? ' tp-sidebar-nav-item--collapsed' : ''}`;

    if (collapsed) {
      return (
        <Tooltip
          key={item.key}
          label={item.label}
          placement="right"
          hasArrow
          bg="var(--stake-bg-card)"
          color="var(--stake-text-primary)"
          border="1px solid"
          borderColor="var(--stake-border-primary)"
        >
          <IconButton
            className={navClass}
            icon={<IconComp size="24" />}
            variant="ghost"
            size="lg"
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            onClick={() => handleMenuClick(item.key)}
          />
        </Tooltip>
      );
    }

    return (
      <Button
        key={item.key}
        className={navClass}
        leftIcon={<IconComp size="20" />}
        variant="ghost"
        size="lg"
        justifyContent="flex-start"
        w="full"
        minW="full"
        aria-current={isActive ? 'page' : undefined}
        onClick={() => handleMenuClick(item.key)}
      >
        {item.label}
      </Button>
    );
  };
  useEffect(() => {
    // Load notifications
    setNotifications([
      { id: 1, title: 'طلب إجازة جديد', time: 'منذ 5 دقائق', unread: true, type: 'leave' },
      { id: 2, title: 'تأخير في الحضور', time: 'منذ 15 دقيقة', unread: true, type: 'attendance' },
      { id: 3, title: 'تم إضافة موظف جديد', time: 'منذ ساعة', unread: false, type: 'employee' },
    ]);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_LS, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleMenuClick = (path) => {
    navigate(path);
    onMobileMenuClose();
  };

  const handleLogout = () => {
    onLogout();
    toast({
      title: 'تم تسجيل الخروج بنجاح',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور الجديدة غير متطابقة',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!user?.id && !user?.username) {
      toast({
        title: 'خطأ',
        description: 'لم يتم التعرف على المستخدم',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await fetch(getApiUrl('/api/change_password.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          username: user.username,
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
        }),
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'تم بنجاح',
          description: result.message || 'تم تغيير كلمة المرور بنجاح',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        onPasswordModalClose();
      } else {
        toast({
          title: 'خطأ',
          description: result.message || 'حدث خطأ أثناء تغيير كلمة المرور',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Change password error:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'leave': return FiClock;
      case 'attendance': return FiAlertCircle;
      case 'employee': return FiCheckCircle;
      default: return FiBell;
    }
  };

  const brandLogoUrl = isSoftLightTheme
    ? (settings.companyLogoSoftLight || settings.companyLogo)
    : settings.companyLogo;

  const renderBrandMark = () => {
    const markClass = `tp-brand-mark${brandLogoUrl ? ' tp-brand-mark--logo' : ''}`;
    return (
      <Flex className={markClass} aria-hidden={!brandLogoUrl} title={settings.systemName || 'TimePay'}>
        {brandLogoUrl ? (
          <Image src={brandLogoUrl} alt="" w="100%" h="100%" objectFit="contain" />
        ) : (
          <Text as="span" className="tp-brand-mark__letter">
            {(settings.systemName || 'TimePay').trim().charAt(0) || 'T'}
          </Text>
        )}
      </Flex>
    );
  };

  const SidebarContent = ({ isMobile = false }) => {
    const collapsed = isSidebarCollapsed && !isMobile;
    return (
    <VStack
      spacing="0"
      h="100vh"
      className={`stake-sidebar tp-sidebar-shell${collapsed ? ' tp-sidebar-shell--collapsed' : ''}${sidebarBgLayer ? ' tp-zone-has-custom-bg' : ''}`}
      borderRight={isMobile ? 'none' : '1px solid'}
      borderColor="var(--stake-border-primary)"
      position="relative"
      overflow="hidden"
    >
      <ZoneBackgroundLayer layer={sidebarBgLayer} className="tp-sidebar-bg-layer" />
      <Box
        className={`tp-sidebar-brand${collapsed ? ' tp-sidebar-brand--collapsed' : ''}`}
        p={collapsed ? '3' : '4'}
        w="full"
        position="relative"
        zIndex="1"
      >
        {collapsed ? (
          <VStack spacing="2" align="center" w="full">
            {systemVersion && (
              <Text className="tp-sidebar-brand__version tp-sidebar-brand__version--collapsed">
                v{systemVersion}
              </Text>
            )}
          </VStack>
        ) : (
          <VStack align="flex-start" spacing={2} minW={0} w="full">
            <Text className="tp-sidebar-brand__title" title={settings.systemName || 'TimePay'}>
              {settings.systemName || 'TimePay'}
            </Text>
            {systemVersion && (
              <Text className="tp-sidebar-brand__version">v{systemVersion}</Text>
            )}
          </VStack>
        )}
      </Box>

      <Box
        flex="1"
        overflowY="auto"
        className="tp-sidebar-nav-scroll"
        p={collapsed ? 3 : 4}
      >
        {collapsed ? (
          <VStack spacing="2" align="center">
            {flatMenuItems().map((item) => renderSidebarNavItem(item, { collapsed: true }))}
          </VStack>
        ) : (
          <Box w="full">
            <VStack spacing="0" align="stretch">
              {MENU_GROUPS.map((group) => (
                <Box key={group.id} className="tp-sidebar-group" w="full">
                  <Text className="tp-sidebar-group-label">{group.label}</Text>
                  {group.items.map((item) => renderSidebarNavItem(item))}
                </Box>
              ))}
            </VStack>
          </Box>
        )}
      </Box>

    </VStack>
    );
  };

  return (
    <Box
      h="100vh"
      minH="100vh"
      className={`stake-main-content${dashboardBgUrl ? ' stake-main-content--has-layout-bg' : ''}`}
      bg={dashboardBgUrl ? 'transparent' : mainContentBg}
      color="var(--stake-text-primary, #d5dceb)"
      overflow="hidden"
      maxW="100vw"
      position="relative"
    >
      {dashboardBgLayer && typeof document !== 'undefined'
        ? createPortal(
            <Box
              className="tp-layout-page-bg tp-layout-page-bg--portal"
              aria-hidden
              style={{
                ...dashboardBgLayer.style,
                opacity: dashboardBgLayer.opacity,
              }}
            />,
            document.body
          )
        : null}
      {/* في RTL المحتوى يجب أن يبقى يساراً: justifyContent flex-end يلصق المحتوى باليسار (نهاية المحور) */}
      <Flex
        minW="0"
        w="100%"
        h="100%"
        direction="row"
        justifyContent="flex-end"
        alignItems="stretch"
        position="relative"
        zIndex={1}
        bg={dashboardBgUrl ? 'transparent' : mainContentBg}
      >
        {/* Desktop Sidebar - fixed يميناً ولا يشارك في تدفق Flex */}
        <Hide below="lg">
            <Box
            w={sidebarWidth}
            h="100vh"
            position="fixed"
            right="0"
            top="0"
            zIndex="100"
            transition="width 0.3s ease"
            overflow="hidden"
            className="stake-sidebar tp-sidebar-fixed-shell"
            borderLeft="1px solid var(--stake-border-primary)"
          >
            <SidebarContent />
          </Box>
        </Hide>

        {/* Main Content Area - يبقى في مكانه يساراً، عرضه لا يتجاوز (100vw - عرض الشريط)، التمرير داخل منطقة المحتوى فقط */}
        <Box
          flex="1"
          minW="0"
          minH="0"
          w="100%"
          maxW="100%"
          transition="width 0.3s ease"
          overflowX="auto"
          overflowY="visible"
          position="relative"
          zIndex="1"
          pr={{ base: 0, lg: sidebarWidth }}
          display="flex"
          flexDirection="column"
          className={dashboardBgUrl ? 'tp-main-column--has-layout-bg' : undefined}
          bg={dashboardBgUrl ? 'transparent' : mainContentBg}
        >
          {/* Header + Breadcrumbs — شريط علوي ديناميكي */}
          <Box
            className={`tp-main-header-shell${headerScrolled ? ' tp-main-header-shell--scrolled' : ''}${dashboardBgUrl && !hasHeaderZoneBg ? ' tp-main-header-shell--blocks-layout-bg' : ''}`}
            position="sticky"
            top="0"
            zIndex="100"
          >
            <Box
              className="tp-main-header__progress"
              style={{ width: `${scrollProgress}%` }}
              aria-hidden
            />
            <Box
              className={`stake-header tp-main-header${headerBgLayer ? ' tp-zone-has-custom-bg' : ''}`}
              px={{ base: 3, md: 3, lg: 4 }}
              py={{ base: 2, md: 1.5, lg: headerScrolled ? 1.5 : 2 }}
              overflow={headerBgLayer ? 'hidden' : 'visible'}
              position="relative"
              transition="padding 0.2s ease"
            >
            <ZoneBackgroundLayer
              key={`header-bg-${headerBg.opacity}-${headerBg.image}`}
              layer={headerBgLayer}
              className="tp-header-bg-layer"
            />
            <Flex
              className="tp-main-header__row"
              align="center"
              justify="space-between"
              gap={2}
              minH={{ base: '56px', md: '60px' }}
              position="relative"
              flexWrap="nowrap"
              overflow="visible"
            >
              <Box className="tp-main-header__zone tp-main-header__zone--start" flex="1" minW={0}>
                <HStack
                  className="tp-main-header__tools"
                  spacing={{ base: 2, md: 2 }}
                  align="center"
                  minW={0}
                  w="100%"
                  justify="flex-start"
                >
                  <Hide below="lg">
                    <IconButton
                      icon={<Icon as={FiMenu} boxSize={6} />}
                      variant="ghost"
                      size="md"
                      className="tp-header-tool-btn tp-header-sidebar-toggle"
                      aria-label={isSidebarCollapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'}
                      aria-expanded={!isSidebarCollapsed}
                      onClick={toggleSidebar}
                      flexShrink={0}
                    />
                  </Hide>
                  <Show below="lg">
                    <IconButton
                      icon={<Icon as={FiMenu} boxSize={6} />}
                      variant="ghost"
                      onClick={onMobileMenuOpen}
                      aria-label="فتح القائمة"
                      size="md"
                      className="tp-header-tool-btn"
                      flexShrink={0}
                    />
                  </Show>
                  <Box className="tp-main-header__crumbs" flex="1" minW={0} overflow="hidden">
                    <LayoutBreadcrumbs items={routeMeta.crumbs} />
                  </Box>
                </HStack>
              </Box>

              <HStack
                className="tp-main-header__brand-center"
                spacing={2.5}
                align="center"
                justify="center"
              >
                {renderBrandMark()}
                <Text
                  className="tp-main-header__company-name"
                  title={companyDisplayName}
                >
                  {companyDisplayName}
                </Text>
              </HStack>

              <HStack
                className="tp-main-header__zone tp-main-header__zone--end tp-main-header__actions"
                flex="1"
                minW={0}
                spacing={2}
                justify="flex-end"
              >
                <HStack className="tp-main-header__datetime-wrap" display="flex" spacing={0}>
                  <Text as="span" className="tp-main-header__datetime-time">
                    {headerClock.time}
                  </Text>
                  <Text as="span" className="tp-main-header__datetime-date">
                    {headerClock.date}
                  </Text>
                </HStack>
                <IconButton
                  icon={isBrowserFullscreen ? <FiMinimize /> : <FiMaximize />}
                  variant="ghost"
                  size="md"
                  className="tp-main-header__menu-btn"
                  aria-label={isBrowserFullscreen ? 'إنهاء الشاشة الكاملة' : 'الشاشة الكاملة'}
                  onClick={toggleBrowserFullscreen}
                />
                <IconButton
                  icon={<FiSettings />}
                  variant="ghost"
                  size="md"
                  className="tp-main-header__menu-btn"
                  aria-label="قائمة الحساب والإعدادات"
                  onClick={onUserMenuOpen}
                />
                <Modal isOpen={isUserMenuOpen} onClose={onUserMenuClose} isCentered size="xs">
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
                          <Icon as={FiUser} boxSize="5" />
                          <Text fontSize="md" fontWeight="bold">{user?.name || 'مدير النظام'}</Text>
                        </HStack>
                        <ModalCloseButton
                          color="white"
                          bg="rgba(255, 255, 255, 0.1)"
                          borderRadius="full"
                          size="md"
                          _hover={{ bg: 'rgba(255, 255, 255, 0.2)', transform: 'scale(1.1)' }}
                          _active={{ transform: 'scale(0.95)' }}
                        />
                      </HStack>
                    </ModalHeader>
                    <ModalBody p="4">
                      <VStack spacing="0" align="stretch">
                        <Button
                          variant="ghost"
                          size="sm"
                          justifyContent="flex-start"
                          leftIcon={<Icon as={FiUser} />}
                          onClick={() => { onUserMenuClose(); onPasswordModalOpen(); }}
                          color="var(--stake-text-primary)"
                          borderRadius="lg"
                          w="100%"
                          _hover={{ bg: 'var(--stake-bg-hover)' }}
                        >
                          الملف الشخصي
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          justifyContent="flex-start"
                          leftIcon={<Icon as={FiSettings} />}
                          onClick={() => { onUserMenuClose(); navigate('/system-settings'); }}
                          color="var(--stake-text-primary)"
                          borderRadius="lg"
                          w="100%"
                          _hover={{ bg: 'var(--stake-bg-hover)' }}
                        >
                          الإعدادات
                        </Button>
                        <Box h="1px" bg="var(--stake-border-primary)" my="1" />
                        <Button
                          variant="ghost"
                          size="sm"
                          justifyContent="flex-start"
                          leftIcon={<Icon as={FiLogOut} />}
                          onClick={() => { onUserMenuClose(); handleLogout(); }}
                          color="var(--stake-error, #e9113c)"
                          borderRadius="lg"
                          w="100%"
                          _hover={{ bg: 'rgba(233, 17, 60, 0.15)' }}
                        >
                          تسجيل الخروج
                        </Button>
                      </VStack>
                    </ModalBody>
                  </ModalContent>
                </Modal>
              </HStack>
            </Flex>
            </Box>
          </Box>

          {/* Page Content - التمرير هنا فقط لتفادي scroll في صفحة البداية */}
          <Box
            ref={contentScrollRef}
            p={isSettingsPage ? { base: 2, md: 3, lg: 4 } : { base: 3, md: 5, lg: 6, xl: 8 }}
            className={`stake-main-content tp-page${dashboardBgUrl ? ' tp-page--has-dashboard-bg' : ''}${isAttendancePage ? ' tp-page--attendance-no-outer-scroll' : ''}${isAdvancesPage ? ' tp-page--advances-no-outer-scroll' : ''}${isSalaryFullscreenPage ? ' tp-page--salary-fullscreen' : ''}${isSettingsPage ? ' tp-page--settings' : ''}${isFluidPage ? ' tp-page--table-shell' : ''}`}
            bg={dashboardBgUrl ? 'transparent' : mainContentBg}
            color="var(--stake-text-primary)"
            flex="1"
            minH="0"
            overflowY="auto"
            display="flex"
            flexDirection="column"
            alignItems="stretch"
            position="relative"
          >
            <Box
              className={`tp-page-inner${isFluidPage ? ' tp-page-inner--fluid' : ''}`}
              flex="1"
              minW="0"
              display="flex"
              flexDirection="column"
              alignItems="stretch"
              position="relative"
              zIndex={1}
            >
              {children}
            </Box>
          </Box>
        </Box>
      </Flex>

      {/* Mobile Drawer */}
      <Drawer isOpen={isMobileMenuOpen} onClose={onMobileMenuClose} placement="right">
        <DrawerOverlay />
        <DrawerContent maxW="280px" className="stake-sidebar" borderLeft="1px solid var(--stake-border-primary)">
          <DrawerCloseButton color="var(--stake-text-primary)" bg="var(--stake-bg-secondary)" _hover={{ bg: 'var(--stake-bg-hover)', color: 'var(--stake-text-primary)' }} />
          <DrawerHeader borderBottomWidth="1px" bg="transparent" color="var(--stake-text-primary)" borderColor="var(--stake-border-primary)">
            <Text color="var(--stake-text-primary)">القائمة</Text>
          </DrawerHeader>
          <DrawerBody p="0" className="stake-sidebar" bg="transparent" color="var(--stake-text-primary)">
            <SidebarContent isMobile />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Password Change Modal — نفس شكل صفحة تسجيل الدخول */}
      <Modal isOpen={isPasswordModalOpen} onClose={onPasswordModalClose} size="lg">
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <ModalContent
          bg="var(--stake-bg-card, #1a2234)"
          borderRadius="2xl"
          boxShadow="var(--stake-shadow-xl, 0 20px 40px rgba(0,0,0,0.4))"
          border="1px solid var(--stake-border-primary, #2d3a4d)"
          mx="4"
        >
          <Box h="4px" w="100%" bg="var(--stake-primary, #3b82f6)" opacity={0.9} borderRadius="2xl 2xl 0 0" />
          <ModalHeader pt="6" pb="2" px="8">
            <VStack align="flex-start" spacing="1">
              <Text fontSize="xl" fontWeight="800" color="var(--stake-text-primary, #f1f5f9)">
                تغيير كلمة المرور
              </Text>
              <Text fontSize="sm" color="var(--stake-text-secondary, #94a3b8)" fontWeight="500">
                قم بتحديث كلمة المرور الخاصة بك
              </Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton color="var(--stake-text-secondary)" _hover={{ color: 'var(--stake-text-primary)', bg: 'var(--stake-bg-hover)' }} />
          <ModalBody py="4" px="8" pb="6">
            <VStack spacing="4" align="stretch">
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color="var(--stake-text-secondary)" mb={1} textAlign="right">
                  كلمة المرور الحالية
                </FormLabel>
                <InputGroup size="lg" dir="rtl">
                  <InputLeftElement h="48px" w="48px" pointerEvents="none" dir="rtl">
                    <Icon as={FiLock} color="var(--stake-primary, #3b82f6)" boxSize="5" />
                  </InputLeftElement>
                  <Input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="أدخل كلمة المرور الحالية"
                    h="48px"
                    fontSize="md"
                    fontWeight="500"
                    bg="var(--stake-bg-secondary, #111827)"
                    border="1px solid var(--stake-border-primary, #2d3a4d)"
                    borderRadius="xl"
                    pr="52px"
                    pl="4"
                    color="var(--stake-text-primary)"
                    fontFamily="inherit"
                    textAlign="right"
                    dir="rtl"
                    _hover={{ borderColor: 'var(--stake-border-accent)', bg: 'var(--stake-bg-hover)' }}
                    _focus={{ borderColor: 'var(--stake-primary)', boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.25)' }}
                    _placeholder={{ color: 'var(--stake-text-muted)' }}
                  />
                </InputGroup>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color="var(--stake-text-secondary)" mb={1} textAlign="right">
                  كلمة المرور الجديدة
                </FormLabel>
                <InputGroup size="lg" dir="rtl">
                  <InputLeftElement h="48px" w="48px" pointerEvents="none" dir="rtl">
                    <Icon as={FiLock} color="var(--stake-primary, #3b82f6)" boxSize="5" />
                  </InputLeftElement>
                  <InputRightElement h="48px" w="44px" dir="rtl">
                    <IconButton
                      aria-label={showNewPassword ? 'إخفاء' : 'إظهار'}
                      icon={showNewPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      variant="ghost"
                      size="sm"
                      color="var(--stake-text-muted)"
                      _hover={{ bg: 'var(--stake-bg-hover)', color: 'var(--stake-primary)' }}
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    />
                  </InputRightElement>
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="أدخل كلمة المرور الجديدة"
                    h="48px"
                    fontSize="md"
                    fontWeight="500"
                    bg="var(--stake-bg-secondary, #111827)"
                    border="1px solid var(--stake-border-primary, #2d3a4d)"
                    borderRadius="xl"
                    pr="52px"
                    pl="44px"
                    color="var(--stake-text-primary)"
                    fontFamily="inherit"
                    textAlign="right"
                    dir="rtl"
                    _hover={{ borderColor: 'var(--stake-border-accent)', bg: 'var(--stake-bg-hover)' }}
                    _focus={{ borderColor: 'var(--stake-primary)', boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.25)' }}
                    _placeholder={{ color: 'var(--stake-text-muted)' }}
                  />
                </InputGroup>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color="var(--stake-text-secondary)" mb={1} textAlign="right">
                  تأكيد كلمة المرور الجديدة
                </FormLabel>
                <InputGroup size="lg" dir="rtl">
                  <InputLeftElement h="48px" w="48px" pointerEvents="none" dir="rtl">
                    <Icon as={FiLock} color="var(--stake-primary, #3b82f6)" boxSize="5" />
                  </InputLeftElement>
                  <InputRightElement h="48px" w="44px" dir="rtl">
                    <IconButton
                      aria-label={showConfirmPassword ? 'إخفاء' : 'إظهار'}
                      icon={showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      variant="ghost"
                      size="sm"
                      color="var(--stake-text-muted)"
                      _hover={{ bg: 'var(--stake-bg-hover)', color: 'var(--stake-primary)' }}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  </InputRightElement>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                    h="48px"
                    fontSize="md"
                    fontWeight="500"
                    bg="var(--stake-bg-secondary, #111827)"
                    border="1px solid var(--stake-border-primary, #2d3a4d)"
                    borderRadius="xl"
                    pr="52px"
                    pl="44px"
                    color="var(--stake-text-primary)"
                    fontFamily="inherit"
                    textAlign="right"
                    dir="rtl"
                    _hover={{ borderColor: 'var(--stake-border-accent)', bg: 'var(--stake-bg-hover)' }}
                    _focus={{ borderColor: 'var(--stake-primary)', boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.25)' }}
                    _placeholder={{ color: 'var(--stake-text-muted)' }}
                  />
                </InputGroup>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter
            borderTop="1px solid var(--stake-border-primary)"
            py="4"
            px="8"
            bg="var(--stake-bg-secondary)"
            borderRadius="0 0 2xl 2xl"
          >
            <HStack spacing="3" w="full" justify="flex-end">
              <Button
                variant="ghost"
                onClick={onPasswordModalClose}
                color="var(--stake-text-secondary)"
                _hover={{ bg: 'var(--stake-bg-hover)', color: 'var(--stake-text-primary)' }}
                borderRadius="xl"
                px="6"
                h="48px"
                fontSize="md"
                fontWeight="600"
              >
                إلغاء
              </Button>
              <Button
                onClick={handlePasswordChange}
                bg="var(--stake-primary, #3b82f6)"
                color="white"
                _hover={{ opacity: 0.9, transform: 'translateY(-1px)' }}
                _active={{ transform: 'translateY(0)' }}
                borderRadius="xl"
                px="8"
                h="48px"
                fontSize="md"
                fontWeight="700"
              >
                تغيير كلمة المرور
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default PremiumLayoutWrapper;

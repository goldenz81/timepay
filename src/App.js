import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Users, Calendar, FileText, Settings, LogIn, UserPlus, Upload, BarChart3, Building2, Rocket, Receipt, Calculator, Fingerprint, Cpu } from 'lucide-react';
import { getApiUrl } from './utils/apiUrlHelper';
import { resolveFontFamilyCss, applySystemFont, applyTableFont } from './utils/fontFamilyHelper';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { EmployeesToolbarProvider } from './contexts/EmployeesToolbarContext';
import { AttendanceToolbarProvider } from './contexts/AttendanceToolbarContext';
import { AdvancesToolbarProvider } from './contexts/AdvancesToolbarContext';
import { SalaryToolbarProvider } from './contexts/SalaryToolbarContext';
import { SalaryColumnsToolbarProvider } from './contexts/SalaryColumnsToolbarContext';
import { DepartmentsToolbarProvider } from './contexts/DepartmentsToolbarContext';
import { FingerprintToolbarProvider } from './contexts/FingerprintToolbarContext';
import { SettingsToolbarProvider } from './contexts/SettingsToolbarContext';
import ChakraProvider from './components/ChakraProvider';
import './styles/global-theme.css';
import './styles/padding-fixes.css';
import './styles/layout-optimization.css';
import './styles/stake-theme.css';
import './styles/financial-ui-semantics.css';
import './styles/tp-page-shell.css';

// Components
import PremiumLayoutWrapper from './components/PremiumLayoutWrapper';
import FontApplier from './components/FontApplier';
import DynamicTitle from './components/DynamicTitle';
import PremiumDashboard from './pages/PremiumDashboard';
import ChakraDepartments from './pages/ChakraDepartments';
import Login from './pages/Login';
import RegisterUser from './pages/RegisterUser';
import SettingsPage from './pages/Settings';

import PremiumEmployees from './pages/PremiumEmployees';
import ChakraAttendance from './pages/ChakraAttendance';
import PremiumWeeklySalary from './pages/PremiumWeeklySalary';
import PremiumMonthlySalary from './pages/PremiumMonthlySalary';
import PremiumAdvances from './pages/PremiumAdvances';
import SimplifiedDynamicManager from './pages/SimplifiedDynamicManager';
import FingerprintManagement from './pages/FingerprintManagement';
import MobileApp from './pages/MobileApp';
import ResponsiveDashboard from './components/ResponsiveDashboard';

function App() {
  console.log('App.js: Component rendering...');
  
  const [isCheckingAutoLogin, setIsCheckingAutoLogin] = useState(true);
  
  // Initialize authentication state - check localStorage only
  const initializeAuth = () => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        return {
          isAuthenticated: true,
          user: JSON.parse(userData)
        };
      } catch (e) {
        console.error('App.js: Error parsing userData:', e);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
    }
    
    // No auto-login - user must login manually
    return {
      isAuthenticated: false,
      user: null
    };
  };
  
  const initialAuth = initializeAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth.isAuthenticated);
  const [user, setUser] = useState(initialAuth.user);
  const [requireLogin, setRequireLogin] = useState(true);
  
  console.log('App.js: Initial state - isAuthenticated:', isAuthenticated);
  // const [sidebarOpen, setSidebarOpen] = useState(false); // تم إزالته لأننا نستخدم Hamburger Menu منفصل
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [companyName, setCompanyName] = useState('نظام الرواتب والحضور');

  // فحص إعداد تسجيل الدخول التلقائي عند بدء التطبيق
  useEffect(() => {
    const checkAutoLoginSetting = async () => {
      try {
        console.log('App.js: Checking auto login setting...');
        const response = await fetch(getApiUrl('/api/load_system_settings.php'));
        const data = await response.json();
        
        if (data.success && data.settings) {
          const requireLoginSetting = data.settings.require_login;
          const shouldRequireLogin = requireLoginSetting !== 'false' && requireLoginSetting !== false;
          console.log('App.js: require_login setting:', requireLoginSetting, '-> shouldRequireLogin:', shouldRequireLogin);
          
          setRequireLogin(shouldRequireLogin);
          
          // إذا كان الدخول التلقائي مفعّل ولم يكن المستخدم مسجل الدخول
          if (!shouldRequireLogin && !isAuthenticated) {
            console.log('App.js: Auto login enabled, setting authenticated to true');
            // تعيين مستخدم افتراضي للدخول التلقائي
            const autoUser = {
              id: 0,
              username: 'auto_user',
              full_name: 'مستخدم تلقائي',
              role: 'admin',
              is_auto_login: true
            };
            setIsAuthenticated(true);
            setUser(autoUser);
            localStorage.setItem('authToken', 'auto_login_token');
            localStorage.setItem('userData', JSON.stringify(autoUser));
          }
        }
      } catch (error) {
        console.error('App.js: Error checking auto login setting:', error);
      } finally {
        setIsCheckingAutoLogin(false);
      }
    };
    
    checkAutoLoginSetting();
  }, []);

  // تحميل إعدادات المظهر عند بدء تشغيل التطبيق
  useEffect(() => {
    loadThemeSettings();
    loadColorTheme(); // تحميل قالب الألوان
    
    // إضافة event listener لتحديث الخلفية عند تغيير الإعدادات
    const handleThemeUpdate = (event) => {
      if (event.detail && event.detail.backgroundType) {
        applyThemeSettings(event.detail);
      }
    };
    
    // إضافة event listener لتطبيق الإعدادات عند تغيير الصفحة
    const handleRouteChange = () => {
      console.log('App.js: Route changed, reloading theme settings...');
      loadThemeSettings();
    };
    
    // إضافة event listener لتغيير قالب الألوان
    const handleThemeChanged = async (event) => {
      console.log('App.js: Theme changed:', event.detail);
      const { themeId, colors } = event.detail || {};
      if (themeId) {
        if (colors) {
          // الألوان موجودة = الحدث أُرسل من applyColorTheme بعد التطبيق — لا نستدعيه مرة أخرى (تجنب حلقة لا نهائية)
          return;
        }
        // طلب تغيير القالب بدون ألوان — نحمّل القالب من الـ API
        await loadColorTheme();
      }
    };
    
    window.addEventListener('themeUpdated', handleThemeUpdate);
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('themeChanged', handleThemeChanged);
    
    // إضافة event listener لتطبيق الإعدادات عند كل تغيير في location
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      setTimeout(handleRouteChange, 100);
    };
    
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      setTimeout(handleRouteChange, 100);
    };
    
    return () => {
      window.removeEventListener('themeUpdated', handleThemeUpdate);
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('themeChanged', handleThemeChanged);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  /** نسخة احتياطية للقالب عندما لا يُرجع الخادم color_theme (مثلاً بعد مسح جزئي للتخزين) */
  const TIMEPAY_COLOR_THEME_LS = 'timepay_color_theme_v1';

  const ALLOWED_COLOR_THEME_IDS_APP = ['dark-ocean', 'minimal-bright'];
  const normalizeAppColorThemeId = (raw) => {
    if (raw == null || String(raw).trim() === '') return 'dark-ocean';
    const id = String(raw).split('?')[0].trim();
    if (ALLOWED_COLOR_THEME_IDS_APP.includes(id)) return id;
    if (id === 'soft-light') return 'minimal-bright';
    return 'dark-ocean';
  };

  /** قالبان ثابتان فقط (المعرّفات كما في قاعدة البيانات للتوافق) */
  const colorThemes = {
    'dark-ocean': {
      bgPrimary: '#0b1324',
      bgSecondary: '#111827',
      bgCard: '#1a2234',
      bgHover: '#243b5c',
      borderPrimary: '#2d3a4d',
      textPrimary: '#f1f5f9',
      textSecondary: '#94a3b8',
      accent: '#3b82f6',
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      sidebarBgStart: '#131a24',
      sidebarBgEnd: '#111827',
      activeButtonBg: '#243b5c',
      activeButtonText: '#ffffff',
      activeButtonIcon: '#ffffff'
    },
    'minimal-bright': {
      bgPrimary: '#f3f4f9',
      bgSecondary: '#e8eaf6',
      bgCard: '#ffffff',
      bgHover: '#e4e7f5',
      borderPrimary: '#d5dae8',
      borderSecondary: '#c9cfe0',
      textPrimary: '#1e293b',
      textSecondary: '#526077',
      accent: '#5c62d8',
      success: '#2e7d32',
      error: '#c62828',
      warning: '#ef6c00',
      sidebarBgStart: '#ffffff',
      sidebarBgEnd: '#eef0fa',
      activeButtonBg: '#e2e6fb',
      activeButtonText: '#3f45b8',
      activeButtonIcon: '#3f45b8',
      tableHeaderStart: '#e6e9f4',
      tableHeaderEnd: '#eceff8',
      gradientData: {
        bgPrimary: { color1: '#f3f4f9', color2: '#eaedf7', direction: '180deg' },
        sidebarBg: { color1: '#ffffff', color2: '#eef0fa', direction: '180deg' },
        headerBg: { color1: '#ffffff', color2: '#f1f3fb', direction: '180deg' }
      }
    }
  };

  // دالة تحميل قالب الألوان
  const loadColorTheme = async () => {
    try {
      const response = await fetch(getApiUrl('/api/comprehensive_settings_api.php?action=get_settings_by_category&category=appearance'));
      const data = await response.json();
      
      if (data.success && data.settings) {
        const settings = {};
        data.settings.forEach(s => { settings[s.setting_key] = s.setting_value; });
        
        let rawThemeId = settings.color_theme;
        if (rawThemeId == null || String(rawThemeId).trim() === '') {
          try {
            const ls = localStorage.getItem(TIMEPAY_COLOR_THEME_LS);
            if (ls && String(ls).trim() !== '') rawThemeId = String(ls).trim();
          } catch (e) { /* ignore */ }
        }
        rawThemeId = rawThemeId || 'dark-ocean';
        const themeId = normalizeAppColorThemeId(rawThemeId);

        const colors = colorThemes[themeId];
        if (colors) {
          applyColorTheme(themeId, colors);
          try {
            localStorage.setItem(TIMEPAY_COLOR_THEME_LS, themeId);
          } catch (e) { /* ignore */ }
          console.log('App.js: Color theme loaded:', themeId);
        } else {
          const fallbackId = 'dark-ocean';
          applyColorTheme(fallbackId, colorThemes[fallbackId]);
          try {
            localStorage.setItem(TIMEPAY_COLOR_THEME_LS, fallbackId);
          } catch (e) { /* ignore */ }
          console.warn('App.js: Unknown color_theme, using dark-ocean:', themeId);
        }
      }
    } catch (error) {
      console.log('App.js: Error loading color theme:', error);
    }
  };

  // دالة تطبيق قالب الألوان (ألوان ثابتة من التعريف البرمجي فقط)
  const applyColorTheme = (incomingThemeId, _ignoredColors) => {
    const themeId = normalizeAppColorThemeId(incomingThemeId);
    const colors = { ...(colorThemes[themeId] || colorThemes['dark-ocean']) };
    const root = document.documentElement;

    const isLightTheme = themeId === 'minimal-bright';
    document.body.setAttribute('data-color-theme', themeId);

    // إضافة/إزالة class للقالب الفاتح
    if (isLightTheme) {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
      document.body.setAttribute('data-theme', 'light');
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      document.body.setAttribute('data-theme', 'dark');
    }
    
    // تطبيق CSS variables
    root.style.setProperty('--stake-bg-primary', colors.bgPrimary);
    root.style.setProperty('--stake-bg-secondary', colors.bgSecondary);
    root.style.setProperty('--stake-bg-card', colors.bgCard);
    root.style.setProperty('--stake-bg-hover', colors.bgHover || colors.bgCard);
    root.style.setProperty('--stake-border-primary', colors.borderPrimary);
    root.style.setProperty('--stake-border-secondary', colors.borderSecondary || colors.borderPrimary);
    root.style.setProperty('--stake-text-primary', colors.textPrimary);
    root.style.setProperty('--stake-text-secondary', colors.textSecondary);
    root.style.setProperty('--stake-primary', colors.accent);
    root.style.setProperty('--stake-success', colors.success);
    root.style.setProperty('--stake-error', colors.error);
    root.style.setProperty('--stake-warning', colors.warning);
    if (colors.activeButtonBg) root.style.setProperty('--stake-active-button-bg', colors.activeButtonBg);
    if (colors.activeButtonText) root.style.setProperty('--stake-active-button-text', colors.activeButtonText);
    if (colors.activeButtonIcon) root.style.setProperty('--stake-active-button-icon', colors.activeButtonIcon);
    root.style.setProperty('--stake-table-bg', colors.tableBg || colors.bgCard);
    const tableHdrBg =
      colors.tableHeaderBg || colors.tableHeaderStart || colors.bgSecondary;
    const tableHdrText = colors.tableHeaderText || colors.textPrimary;
    root.style.setProperty('--stake-table-header-bg', tableHdrBg);
    root.style.setProperty('--stake-table-header-text', tableHdrText);
    
    // ألوان خاصة بالـ sidebar (تُحدّث بعد حساب الشفافية أدناه)
    
    // متغيرات إضافية
    root.style.setProperty('--color-grey-700', colors.bgPrimary);
    root.style.setProperty('--color-grey-600', colors.bgSecondary);
    root.style.setProperty('--color-grey-500', colors.bgCard);
    root.style.setProperty('--color-grey-400', colors.borderPrimary);
    root.style.setProperty('--color-grey-200', colors.textSecondary);
    root.style.setProperty('--color-grey-100', colors.textPrimary);
    root.style.setProperty('--color-white', colors.textPrimary);
    root.style.setProperty('--color-blue-500', colors.accent);
    
    // تطبيق على body (عند صورة خلفية نعتمد على الـ style tag لاحقاً)
    const hasCustomBg = colors.backgroundImage && String(colors.backgroundImage).trim() !== '';
    if (!hasCustomBg) {
      document.body.style.background = colors.bgPrimary;
      document.body.style.backgroundColor = colors.bgPrimary;
    }
    document.body.style.color = colors.textPrimary;
    
    const rootEl = document.getElementById('root');
    if (rootEl && !hasCustomBg) {
      rootEl.style.background = colors.bgPrimary;
      rootEl.style.backgroundColor = colors.bgPrimary;
    }
    
    // اتجاه التدرج المحفوظ للشريط والرأس (من gradientData إن وُجد)
    const sidebarGradientDir = colors.gradientData?.sidebarBg?.direction || '90deg';
    const headerGradientDir = colors.gradientData?.headerBg?.direction || '358deg';
    // شفافية الشريط الجانبي والأفقي
    const sidebarStart = colors.sidebarBgStart || colors.bgPrimary;
    const sidebarEnd = colors.sidebarBgEnd || colors.bgSecondary;
    const hexToRgba = (hex, alpha) => {
      if (!hex || typeof hex !== 'string') return hex;
      const s = hex.trim();
      const hexM = s.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i) || s.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i);
      if (hexM) {
        const r = parseInt(hexM[1].length === 2 ? hexM[1] : hexM[1] + hexM[1], 16);
        const g = parseInt(hexM[2].length === 2 ? hexM[2] : hexM[2] + hexM[2], 16);
        const b = parseInt(hexM[3].length === 2 ? hexM[3] : hexM[3] + hexM[3], 16);
        return `rgba(${r},${g},${b},${alpha})`;
      }
      const rgbaM = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/i);
      if (rgbaM) return `rgba(${rgbaM[1]},${rgbaM[2]},${rgbaM[3]},${alpha})`;
      return hex;
    };
    const sidebarOpacity = colors.sidebarOpacity != null ? Number(colors.sidebarOpacity) : 1;
    const headerOpacity = colors.headerOpacity != null ? Number(colors.headerOpacity) : 1;
    const sidebarStartFinal = sidebarOpacity < 1 ? hexToRgba(sidebarStart, sidebarOpacity) : sidebarStart;
    const sidebarEndFinal = sidebarOpacity < 1 ? hexToRgba(sidebarEnd, sidebarOpacity) : sidebarEnd;
    const headerBgStart = (colors.gradientData?.headerBg?.color1 != null && colors.gradientData?.headerBg?.color2 != null)
      ? colors.gradientData.headerBg.color1
      : (colors.headerBg != null && colors.headerBg !== '')
        ? colors.headerBg
        : colors.bgPrimary;
    const headerBgEnd = (colors.gradientData?.headerBg?.color1 != null && colors.gradientData?.headerBg?.color2 != null)
      ? colors.gradientData.headerBg.color2
      : (colors.headerBg != null && colors.headerBg !== '')
        ? colors.headerBg
        : colors.bgSecondary;
    const headerStartFinal = headerOpacity < 1 ? hexToRgba(headerBgStart, headerOpacity) : headerBgStart;
    const headerEndFinal = headerOpacity < 1 ? hexToRgba(headerBgEnd, headerOpacity) : headerBgEnd;
    
    root.style.setProperty('--stake-sidebar-bg-start', sidebarStartFinal);
    root.style.setProperty('--stake-sidebar-bg-end', sidebarEndFinal);
    root.style.setProperty('--stake-sidebar-hover', colors.bgHover || colors.bgCard);
    const headerBgValue = `linear-gradient(${headerGradientDir}, ${headerStartFinal} 0%, ${headerEndFinal} 100%)`;
    root.style.setProperty('--stake-header-bg', headerBgValue);
    
    // تطبيق الألوان على Sidebar — الخلفية عبر CSS؛ عند وجود صورة خلفية للنظام يُترك الغلاف الخارجي شفافاً
    const sidebars = document.querySelectorAll('.stake-sidebar');
    const isLayoutBg = document.documentElement.getAttribute('data-layout-bg') === 'dashboard';
    const isSidebarZoneBg = document.documentElement.getAttribute('data-sidebar-has-bg') === 'true';
    sidebars.forEach(sidebar => {
      if (sidebar.classList.contains('tp-zone-has-custom-bg')) return;
      if ((isLayoutBg || isSidebarZoneBg) && !sidebar.classList.contains('tp-sidebar-shell')) {
        sidebar.style.background = 'transparent';
        sidebar.style.backgroundImage = 'none';
      } else if (!sidebar.classList.contains('tp-sidebar-shell')) {
        sidebar.style.background = `linear-gradient(${sidebarGradientDir}, ${sidebarStartFinal} 0%, ${sidebarEndFinal} 100%)`;
      }
      sidebar.style.borderColor = colors.borderPrimary;
    });
    
    // تطبيق الألوان على Header (المتغير --stake-header-bg يتحكم بالخلفية؛ العنصر يستخدم var(--stake-header-bg))
    const headers = document.querySelectorAll('.stake-header');
    headers.forEach(header => {
      if (header.classList.contains('tp-zone-has-custom-bg')) {
        header.style.removeProperty('background');
        header.style.removeProperty('background-image');
        header.style.removeProperty('background-color');
        return;
      }
      header.style.setProperty('background', headerBgValue, 'important');
      header.style.setProperty('background-image', headerBgValue, 'important');
      header.style.borderColor = colors.borderPrimary;
    });
    
    // تطبيق الألوان على البطاقات مباشرة
    const cards = document.querySelectorAll('.chakra-card, .stake-card');
    cards.forEach(card => {
      if (typeof colors.bgCard === 'string' && colors.bgCard.includes('linear-gradient')) {
        card.style.background = colors.bgCard;
        card.style.backgroundImage = colors.bgCard;
      } else {
        card.style.background = colors.bgCard;
      }
      card.style.borderColor = colors.borderPrimary;
    });
    
    // CSS ديناميكي
    // إزالة style tag القديم إذا كان موجوداً
    let oldStyleEl = document.getElementById('app-theme-styles');
    if (oldStyleEl) {
      oldStyleEl.remove();
    }
    
    let styleEl = document.createElement('style');
    styleEl.id = 'app-theme-styles';
    // إضافة في نهاية head لضمان أولوية أعلى
    document.head.appendChild(styleEl);
    
    // خلفية الصفحة: صورة مخصصة أو تدرج (مع شفافية الصورة إن وُجدت)
    const hasBgImage = colors.backgroundImage && String(colors.backgroundImage).trim() !== '';
    const pageGradient = colors.gradientData?.bgPrimary
      ? `linear-gradient(${colors.gradientData.bgPrimary.direction || '180deg'}, ${colors.gradientData.bgPrimary.color1} 0%, ${colors.gradientData.bgPrimary.color2} 100%)`
      : colors.bgPrimary;
    const bgSizeValue = colors.backgroundSize === 'full' ? '100% 100%' : (colors.backgroundSize || 'cover');
    const bgRepeatValue = colors.backgroundRepeat || 'no-repeat';
    const bgImageOpacity = colors.backgroundImageOpacity != null ? Number(colors.backgroundImageOpacity) : 1;
    const bgAttachment = colors.backgroundAttachment === 'fixed' ? 'fixed' : 'scroll';
    let pageBackground = colors.bgPrimary;
    let pageBgSize = 'auto';
    let pageBgRepeat = 'repeat';
    let pageBgAttachment = 'scroll';
    let makeContentTransparent = false;
    if (hasBgImage) {
      const imgUrl = String(colors.backgroundImage).trim().replace(/"/g, '\\"');
      if (bgImageOpacity < 1) {
        const overlayRgba = hexToRgba(colors.bgPrimary || '#f0f4f8', 1 - bgImageOpacity);
        pageBackground = `linear-gradient(${overlayRgba}, ${overlayRgba}), url("${imgUrl}"), ${pageGradient}`;
        pageBgSize = `100% 100%, ${bgSizeValue}, auto`;
        pageBgRepeat = `no-repeat, ${bgRepeatValue}, repeat`;
        pageBgAttachment = `scroll, ${bgAttachment}, scroll`;
      } else {
        pageBackground = `url("${imgUrl}"), ${pageGradient}`;
        pageBgSize = `${bgSizeValue}, auto`;
        pageBgRepeat = `${bgRepeatValue}, repeat`;
        pageBgAttachment = `${bgAttachment}, scroll`;
      }
      makeContentTransparent = true;
    }
    
    if (makeContentTransparent) {
      document.body.style.removeProperty('background');
      document.body.style.removeProperty('background-color');
      const re = document.getElementById('root');
      if (re) { re.style.removeProperty('background'); re.style.removeProperty('background-color'); }
    }

    const minimalBrightCssApp =
      themeId === 'minimal-bright'
        ? `
      body[data-color-theme="minimal-bright"] .chakra-card {
        border-radius: 16px !important;
        box-shadow: 0 2px 14px rgba(30, 41, 59, 0.06) !important;
      }
      body[data-color-theme="minimal-bright"] .chakra-modal__content {
        border-radius: 20px !important;
        overflow: hidden !important;
        box-shadow: 0 14px 44px rgba(30, 41, 59, 0.12) !important;
      }
      body[data-color-theme="minimal-bright"] .stake-table,
      body[data-color-theme="minimal-bright"] table.chakra-table {
        border-radius: 14px !important;
      }
      body[data-color-theme="minimal-bright"] .stake-table th,
      body[data-color-theme="minimal-bright"] table.chakra-table thead th {
        padding: 11px 16px !important;
        font-weight: 600 !important;
        background: var(--stake-table-header-bg, #e6e9f4) !important;
        color: var(--stake-table-header-text, #394867) !important;
        border-bottom: 1px solid var(--stake-border-primary) !important;
      }
      body[data-color-theme="minimal-bright"] .stake-table td,
      body[data-color-theme="minimal-bright"] table.chakra-table tbody td {
        padding: 11px 16px !important;
      }
      body[data-color-theme="minimal-bright"] .stake-sidebar .chakra-button[aria-current="page"],
      body[data-color-theme="minimal-bright"] .stake-sidebar .chakra-iconbutton[aria-current="page"] {
        background: rgba(92, 98, 216, 0.14) !important;
        color: var(--stake-primary) !important;
        border-radius: 10px !important;
      }
      body[data-color-theme="minimal-bright"] .stake-sidebar .chakra-button:hover,
      body[data-color-theme="minimal-bright"] .stake-sidebar .chakra-iconbutton:hover {
        background: rgba(92, 98, 216, 0.08) !important;
        color: var(--stake-text-primary) !important;
      }
      body[data-color-theme="minimal-bright"] .stake-header .chakra-button:hover,
      body[data-color-theme="minimal-bright"] .stake-header .chakra-iconbutton:hover {
        background: rgba(92, 98, 216, 0.1) !important;
        color: var(--stake-primary) !important;
      }
      body[data-color-theme="minimal-bright"] .chakra-button[class*="stake-btn-primary"] {
        background: var(--stake-primary) !important;
        color: #ffffff !important;
      }
      body[data-color-theme="minimal-bright"] .chakra-button[class*="stake-btn-primary"]:hover,
      body[data-color-theme="minimal-bright"] .chakra-button[class*="stake-btn-primary"][data-hover] {
        background: #4a4dc4 !important;
        color: #ffffff !important;
      }
      body[data-color-theme="minimal-bright"] .chakra-button[variant="outline"] {
        border-color: var(--stake-border-primary) !important;
        color: var(--stake-text-primary) !important;
        background: var(--stake-bg-card) !important;
      }
      body[data-color-theme="minimal-bright"] .chakra-button[variant="outline"]:hover {
        border-color: var(--stake-primary) !important;
        color: var(--stake-primary) !important;
        background: rgba(92, 98, 216, 0.06) !important;
      }
      /* صفحة الراتب الأسبوعي — صف مع التفاف (لا عمود افتراضي تحت 1024px) */
      body[data-color-theme="minimal-bright"] .tp-page {
        max-width: 100%;
      }
      body[data-color-theme="minimal-bright"] .weekly-salary-header-shell {
        margin-bottom: 0.5rem !important;
      }
      body[data-color-theme="minimal-bright"] .weekly-salary-header-row {
        flex-direction: row !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 0.45rem 0.75rem !important;
      }
      body[data-color-theme="minimal-bright"] .fp-toolbar-zone--filters {
        flex-direction: row !important;
        flex-wrap: wrap !important;
        row-gap: 0.35rem !important;
        column-gap: 0.5rem !important;
        flex: 1 1 auto !important;
        min-width: 0 !important;
        width: auto !important;
        max-width: 100% !important;
        align-items: center !important;
      }
      body[data-color-theme="minimal-bright"] .fp-toolbar-filter-inner {
        flex-wrap: wrap !important;
        justify-content: flex-start !important;
        flex: 1 1 auto !important;
        min-width: 0 !important;
        gap: 0.35rem !important;
      }
      body[data-color-theme="minimal-bright"] .fp-toolbar-zone--dates {
        flex-wrap: wrap !important;
        gap: 0.35rem !important;
        width: auto !important;
        max-width: 100% !important;
        justify-content: flex-end !important;
        align-items: center !important;
        margin-inline-start: auto !important;
      }
      @media (max-width: 640px) {
        body[data-color-theme="minimal-bright"] .fp-toolbar-zone--dates {
          justify-content: flex-start !important;
          margin-inline-start: 0 !important;
          width: 100% !important;
        }
      }
      body[data-color-theme="minimal-bright"] .fp-toolbar-zone--dates .weekly-salary-range-picker.ant-picker-range {
        flex: 0 1 auto !important;
        min-width: 0 !important;
        max-width: min(100%, 280px) !important;
      }
      body[data-color-theme="minimal-bright"] .weekly-salary-range-picker .ant-picker-input > input {
        color: var(--stake-text-primary) !important;
      }
      body[data-color-theme="minimal-bright"] .weekly-salary-range-picker .ant-picker-separator,
      body[data-color-theme="minimal-bright"] .weekly-salary-range-picker .ant-picker-suffix {
        color: var(--stake-text-secondary) !important;
      }
      body[data-color-theme="minimal-bright"] .weekly-salary-main-card .chakra-table__container {
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 0.25rem !important;
      }
      body[data-color-theme="minimal-bright"] .fp-list-toolbar {
        flex-wrap: wrap !important;
        gap: 0.5rem !important;
        row-gap: 0.5rem !important;
        align-items: center !important;
      }
      body[data-color-theme="minimal-bright"] .fp-list-toolbar .stake-heading-3 {
        flex: 1 1 100% !important;
        width: 100% !important;
      }
      @media (min-width: 768px) {
        body[data-color-theme="minimal-bright"] .fp-list-toolbar .stake-heading-3 {
          flex: 1 1 auto !important;
          width: auto !important;
        }
      }
    `
        : '';
    
    styleEl.textContent = `
      /* App Theme Styles - Highest Priority */
      body, html, #root { background: ${pageBackground} !important; background-size: ${pageBgSize} !important; background-repeat: ${pageBgRepeat} !important; background-attachment: ${pageBgAttachment} !important; background-color: ${colors.bgPrimary} !important; }
      ${makeContentTransparent ? `
      .stake-main-content, .stake-main-content > div, body.light-theme .stake-main-content, [class*="PremiumLayoutWrapper"] .stake-main-content, [class*="PremiumDashboard"] > div, .dashboard-page { background: transparent !important; }
      ` : ''}
      html:not([data-layout-bg='dashboard']) .stake-sidebar,
      html:not([data-layout-bg='dashboard']) body.light-theme .stake-sidebar,
      html:not([data-layout-bg='dashboard']) body[data-theme="light"] .stake-sidebar { background: linear-gradient(${sidebarGradientDir}, ${sidebarStartFinal} 0%, ${sidebarEndFinal} 100%) !important; background-image: linear-gradient(${sidebarGradientDir}, ${sidebarStartFinal} 0%, ${sidebarEndFinal} 100%) !important; background-color: transparent !important; border-color: ${colors.borderPrimary} !important; border-right-color: ${colors.borderPrimary} !important; }
      .stake-sidebar .chakra-button, .stake-sidebar .chakra-iconbutton { color: ${colors.textSecondary} !important; }
      .stake-sidebar .chakra-button:hover, .stake-sidebar .chakra-iconbutton:hover { background: ${colors.bgCard} !important; color: ${colors.textPrimary} !important; }
      .stake-sidebar .chakra-button[aria-current="page"], .stake-sidebar .chakra-iconbutton[aria-current="page"] { background: ${colors.bgCard} !important; color: ${colors.textPrimary} !important; }
      :root { --stake-header-bg: linear-gradient(${headerGradientDir}, ${headerStartFinal} 0%, ${headerEndFinal} 100%); }
      .stake-header:not(.tp-zone-has-custom-bg) { background: var(--stake-header-bg) !important; background-image: none !important; background-color: transparent !important; border-color: ${colors.borderPrimary} !important; border-bottom-color: ${colors.borderPrimary} !important; }
      .stake-header .chakra-button, .stake-header .chakra-iconbutton { color: ${colors.textPrimary} !important; }
      .stake-header .chakra-button:hover, .stake-header .chakra-iconbutton:hover { background: ${colors.bgCard} !important; color: ${colors.accent} !important; }
      .chakra-card { background: ${typeof colors.bgCard === 'string' && colors.bgCard.includes('linear-gradient') ? colors.bgCard : colors.bgCard} !important; border-color: ${colors.borderPrimary} !important; }
      .chakra-modal__content { background: ${colors.bgCard} !important; }
      .chakra-modal__header { background: ${colors.bgSecondary} !important; color: ${colors.textPrimary} !important; }
      .stake-table th, table.chakra-table.stake-table thead th { background: var(--stake-table-header-bg, var(--stake-bg-secondary)) !important; color: var(--stake-table-header-text, var(--stake-text-primary)) !important; }
      .stake-table td { background: var(--stake-table-bg, var(--stake-bg-card)) !important; color: var(--stake-text-secondary) !important; }
      html[data-layout-bg='dashboard'] .stake-main-content,
      html[data-layout-bg='dashboard'] .stake-main-content > div,
      html[data-layout-bg='dashboard'] .stake-main-content .tp-page,
      html[data-layout-bg='dashboard'] .stake-main-content--has-layout-bg .tp-page,
      html[data-layout-bg='dashboard'] .stake-main-content.tp-page--has-dashboard-bg {
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
      }
      html[data-layout-bg='dashboard'] .tp-layout-page-bg--portal {
        background-color: transparent !important;
      }
      html[data-layout-bg='dashboard'] body,
      html[data-layout-bg='dashboard'] #root {
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
      }
      html[data-layout-bg='dashboard'] .stake-sidebar:not(.tp-sidebar-shell) {
        background: transparent !important;
        background-image: none !important;
      }
      html[data-sidebar-has-bg='true'] .stake-sidebar:not(.tp-sidebar-shell) {
        background: transparent !important;
        background-image: none !important;
      }
      .stake-header.tp-main-header.tp-zone-has-custom-bg {
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
      }
      .tp-sidebar-shell.tp-zone-has-custom-bg {
        background: linear-gradient(180deg, color-mix(in srgb, var(--stake-sidebar-bg-start, #131a24) 72%, transparent) 0%, color-mix(in srgb, var(--stake-sidebar-bg-end, #111820) 78%, transparent) 100%) !important;
        backdrop-filter: blur(8px) saturate(1.04);
        -webkit-backdrop-filter: blur(8px) saturate(1.04);
      }
      ${minimalBrightCssApp}
    `;
    try {
      localStorage.setItem(TIMEPAY_COLOR_THEME_LS, themeId);
    } catch (e) { /* خاصية خاصة / مسح التخزين */ }

    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { themeId, colors } }));
  };

  // دالة تحميل إعدادات المظهر
  const loadThemeSettings = async () => {
    try {
      console.log('App.js: Loading theme settings...');
      const apiUrl = getApiUrl('/api/comprehensive_settings_api.php?action=get_settings_by_category&category=appearance');
      console.log('App.js: API URL:', apiUrl);
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      console.log('App.js: Theme settings loaded:', data);
      
      if (data.success && data.settings) {
        const settings = {};
        data.settings.forEach(setting => {
          settings[setting.setting_key] = setting.setting_value;
        });
        console.log('App.js: Applying theme settings:', settings);
        applyThemeSettings(settings);
      }
    } catch (error) {
      console.log('خطأ في تحميل إعدادات المظهر:', error);
      // Apply default theme settings when API fails
      const defaultSettings = {
        gradient_background: 'linear-gradient(135deg, rgb(245, 247, 250) 0%, rgb(195, 207, 226) 100%)',
        table_font_family: 'Tajawal',
        table_font_size: '13',
        table_font_weight: '600',
        show_english_keys: '0'
      };
      console.log('App.js: Applying default theme settings:', defaultSettings);
      applyThemeSettings(defaultSettings);
    }
  };

  // دالة تطبيق إعدادات المظهر
  const applyThemeSettings = (settings) => {
    const root = document.documentElement;
    
    console.log('App.js: Applying theme settings:', settings);
    
    // تطبيق إعدادات الخلفية (لا نكتب على body عند الوضع الفاتح حتى تتحكم applyColorTheme بالخلفية)
    const isSoftLight = normalizeAppColorThemeId(settings.color_theme || '') === 'minimal-bright';
    if (!isSoftLight && settings.background_type === 'gradient' && settings.background_gradient) {
      console.log('App.js: Applying gradient background:', settings.background_gradient);
      root.style.setProperty('--app-background', settings.background_gradient);
      document.body.style.background = settings.background_gradient;
      const rootElement = document.getElementById('root');
      if (rootElement) rootElement.style.background = settings.background_gradient;
    } else if (!isSoftLight && settings.background_type === 'solid' && settings.background_color) {
      console.log('App.js: Applying solid background:', settings.background_color);
      root.style.setProperty('--app-background', settings.background_color);
      document.body.style.background = settings.background_color;
      const rootElement = document.getElementById('root');
      if (rootElement) rootElement.style.background = settings.background_color;
    }
    
    // تطبيق إعدادات الخطوط
    if (settings.font_family) {
      const fontFamilyValue = resolveFontFamilyCss(settings.font_family) || 'Cairo';
      applySystemFont(settings.font_family);
      console.log('App.js: Applied system font:', fontFamilyValue);
    }
    
    // تطبيق إعدادات الجداول
    if (settings.table_font_family) {
      const tableFontFamilyValue = applyTableFont(settings.table_font_family, settings.font_family);
      console.log('App.js: Applying table font family:', tableFontFamilyValue);
    }
    if (settings.table_font_size) {
      console.log('App.js: Applying table font size:', settings.table_font_size);
      root.style.setProperty('--table-font-size', `${settings.table_font_size}px`);
    }
    if (settings.table_font_weight) {
      console.log('App.js: Applying table font weight:', settings.table_font_weight);
      root.style.setProperty('--table-font-weight', settings.table_font_weight);
    }
    if (settings.show_english_keys !== undefined) {
      const showKeys = settings.show_english_keys === 'true' || settings.show_english_keys === true ? '1' : '0';
      console.log('App.js: Applying show english keys:', showKeys);
      root.style.setProperty('--show-english-keys', showKeys);
    }
  };

  // Authentication is already initialized in useState above - no need for useEffect

  // Redirect to dashboard if authenticated and on login page
  useEffect(() => {
    if (isAuthenticated && window.location.pathname === '/login') {
      window.location.href = '/';
    }
  }, [isAuthenticated]);

  // Load company name from database on mount
  useEffect(() => {
    const loadCompanyName = async () => {
      try {
        const response = await fetch(getApiUrl('/api/settings_new.php'));
        const result = await response.json();

        if (result.success && result.data && result.data['general.companyName']) {
          setCompanyName(result.data['general.companyName']);
        }
      } catch (error) {
        console.error('Error loading company name:', error);
      }
    };

    if (isAuthenticated) {
      loadCompanyName();
    }
  }, [isAuthenticated]);

  const handleLogin = (userData, token) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(userData));

    // Redirect to dashboard after successful login
    window.location.href = '/';
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');

    // إذا كان الدخول التلقائي مفعلاً، نعيد التحميل بدلاً من الانتقال لصفحة تسجيل الدخول
    if (!requireLogin) {
      window.location.reload();
    } else {
      // Redirect to login after logout
      window.location.href = '/login';
    }
  };

  const handleCompanyNameChange = (newCompanyName) => {
    setCompanyName(newCompanyName);
  };

  console.log('App.js: Render - isAuthenticated:', isAuthenticated, 'user:', user, 'requireLogin:', requireLogin, 'isCheckingAutoLogin:', isCheckingAutoLogin);

  // Show loading while checking auto login setting
  if (isCheckingAutoLogin) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontFamily: 'Cairo, sans-serif',
        fontSize: '18px'
      }}>
        جاري تحميل النظام...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <ChakraProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </ChakraProvider>
    );
  }

  // تم نقل navigation إلى ProLayoutWrapper

  return (
    <SettingsProvider>
      <ChakraProvider>
        <FontApplier />
        <DynamicTitle />
        <Router>
          <EmployeesToolbarProvider>
          <AttendanceToolbarProvider>
          <AdvancesToolbarProvider>
          <SalaryToolbarProvider>
          <SalaryColumnsToolbarProvider>
          <DepartmentsToolbarProvider>
          <FingerprintToolbarProvider>
          <SettingsToolbarProvider>
          <PremiumLayoutWrapper user={user} onLogout={handleLogout}>
            <Routes>
                <Route path="/" element={<ResponsiveDashboard />} />
                <Route path="/dashboard" element={<Navigate to="/" replace />} />
                <Route path="/unified-employees" element={<PremiumEmployees />} />
              <Route path="/departments" element={<ChakraDepartments />} />
              <Route path="/unified-attendance" element={<ChakraAttendance />} />
              <Route path="/weekly-salary" element={<PremiumWeeklySalary />} />
              <Route path="/monthly-salary" element={<PremiumMonthlySalary />} />
              <Route path="/advances" element={<PremiumAdvances />} />
              <Route path="/dynamic-system-manager" element={<SimplifiedDynamicManager />} />
              <Route path="/settings" element={<SettingsPage onCompanyNameChange={handleCompanyNameChange} />} />
              <Route path="/system-settings" element={<SettingsPage onCompanyNameChange={handleCompanyNameChange} />} />
              <Route path="/fingerprint-management" element={<FingerprintManagement />} />
              <Route path="/register-user" element={<RegisterUser />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PremiumLayoutWrapper>
          </SettingsToolbarProvider>
          </FingerprintToolbarProvider>
          </DepartmentsToolbarProvider>
          </SalaryColumnsToolbarProvider>
          </SalaryToolbarProvider>
          </AdvancesToolbarProvider>
          </AttendanceToolbarProvider>
          </EmployeesToolbarProvider>
        </Router>
      </ChakraProvider>
    </SettingsProvider>
  );
}

export default App;
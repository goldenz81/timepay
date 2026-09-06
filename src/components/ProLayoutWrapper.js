import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Typography, Drawer, Modal, List, Tabs, Space, Tag, Divider, Tooltip, message } from 'antd';
import { IdcardOutlined } from '@ant-design/icons';
import { useSettings } from '../contexts/SettingsContext';
import { getApiUrl } from '../utils/apiUrlHelper';
import './SidebarDragDrop.css';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  BarChart3, 
  Users, 
  Building2, 
  Calendar, 
  Receipt, 
  Fingerprint, 
  Calculator, 
  Upload, 
  Settings,
  LogOut,
  User,
  Bell,
  Menu as MenuIcon,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  MoreHorizontal,
  Zap,
  Plus,
  DollarSign,
  FileText,
  Shield,
  Database,
  Link,
  Activity,
  UserCheck,
  Clock,
  CreditCard,
  TestTube,
  Cog,
  UserPlus,
  Save,
  GripVertical,
  Cpu,
  BarChart,
  RefreshCw
} from 'lucide-react';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

// Sortable Menu Item Component
const SortableMenuItem = ({ item, isActive, onClick, isDragMode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-menu-item ${isActive ? 'ant-menu-item-selected' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={onClick}
    >
      {isDragMode && (
        <div
          {...attributes}
          {...listeners}
          className="drag-handle"
        >
          <GripVertical size={14} />
        </div>
      )}
      <span className="menu-item-icon">{item.icon}</span>
      <span className="menu-item-content">{item.label}</span>
    </div>
  );
};

const ProLayoutWrapper = ({ children, user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  // تطبيق إعدادات المظهر عند تغيير الصفحة
  useEffect(() => {
    const loadThemeSettings = async () => {
      try {
        console.log('ProLayoutWrapper: Loading theme settings for route:', location.pathname);
        const response = await fetch(getApiUrl('/api/comprehensive_settings_api.php?action=get_settings_by_category&category=appearance'));
        const data = await response.json();
        
        if (data.success && data.settings) {
          const settings = {};
          data.settings.forEach(setting => {
            settings[setting.setting_key] = setting.setting_value;
          });
          
          // تطبيق إعدادات الخلفية
          if (settings.background_type === 'gradient' && settings.background_gradient) {
            document.documentElement.style.setProperty('--app-background', settings.background_gradient);
            document.body.style.background = settings.background_gradient;
            // تطبيق الخلفية على العنصر الجذر فقط
            const rootElement = document.getElementById('root');
            if (rootElement) {
              rootElement.style.background = settings.background_gradient;
            }
          } else if (settings.background_type === 'solid' && settings.background_color) {
            document.documentElement.style.setProperty('--app-background', settings.background_color);
            document.body.style.background = settings.background_color;
            // تطبيق الخلفية على العنصر الجذر فقط
            const rootElement = document.getElementById('root');
            if (rootElement) {
              rootElement.style.background = settings.background_color;
            }
          }
          
          // تطبيق إعدادات الجداول
          if (settings.table_font_family) {
            document.documentElement.style.setProperty('--table-font-family', `'${settings.table_font_family}', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif`);
          }
          if (settings.table_font_size) {
            document.documentElement.style.setProperty('--table-font-size', `${settings.table_font_size}px`);
          }
          if (settings.table_font_weight) {
            document.documentElement.style.setProperty('--table-font-weight', settings.table_font_weight);
          }
          if (settings.show_english_keys !== undefined) {
            const showKeys = settings.show_english_keys === 'true' || settings.show_english_keys === true ? '1' : '0';
            document.documentElement.style.setProperty('--show-english-keys', showKeys);
          }
        }
      } catch (error) {
        console.log('ProLayoutWrapper: Error loading theme settings:', error);
      }
    };

    loadThemeSettings();
  }, [location.pathname]);
  const [longPressProgress, setLongPressProgress] = useState(0);
  const [progressInterval, setProgressInterval] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load company logo from settings
  useEffect(() => {
    if (settings && settings.companyLogo) {
      setCompanyLogo(settings.companyLogo);
    }
  }, [settings]);

  const [companyLogo, setCompanyLogo] = useState('');
  const [floatingActionsOpen, setFloatingActionsOpen] = useState(false);

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'success',
      title: 'تم تسجيل الحضور بنجاح',
      message: 'تم تسجيل حضور الموظف أحمد محمد في الساعة 8:30 صباحاً',
      time: 'منذ 5 دقائق',
      read: false
    },
    {
      id: 2,
      type: 'warning',
      title: 'تأخير في الحضور',
      message: 'الموظف فاطمة أحمد تأخرت عن العمل بـ 15 دقيقة',
      time: 'منذ ساعة',
      read: false
    },
    {
      id: 3,
      type: 'info',
      title: 'طلب سلفة جديد',
      message: 'تم تقديم طلب سلفة بقيمة 500 ريال من الموظف سعد العلي',
      time: 'منذ ساعتين',
      read: true
    }
  ]);

  // قائمة التنقل الرئيسية - منظمة ومبسطة
  const defaultMenuItems = [
    // الرئيسية
    {
      key: '/',
      icon: <BarChart3 size={16} />,
      label: 'الرئيسية',
    },
    
    // إدارة الموظفين
    {
      key: '/unified-employees',
      icon: <Users size={16} />,
      label: 'الموظفين',
    },
    {
      key: '/departments',
      icon: <Building2 size={16} />,
      label: 'الأقسام',
    },
    
    // الحضور والانصراف
    {
      key: '/unified-attendance',
      icon: <Calendar size={16} />,
      label: 'الحضور والانصراف',
    },
    
    // الرواتب والحسابات
    {
      key: '/dynamic-system-manager',
      icon: <Cpu size={16} />,
      label: 'أعمدة الرواتب',
    },
    
    // إدارة البصمة
    {
      key: '/fingerprint-management',
      icon: <IdcardOutlined size={16} />,
      label: 'إدارة البصمة',
    },
    // تم دمج إعدادات النظام في صفحة واحدة
    {
      key: '/system-settings',
      icon: <Cog size={16} />,
      label: 'الإعدادات',
    },
    
    // تم نقل الأدوات المتقدمة إلى القائمة السريعة
  ];

  // Load menu order from API
  useEffect(() => {
    const loadMenuOrder = async () => {
      try {
        const response = await fetch('/api/menu_order_api.php?action=get_menu_order');
        const result = await response.json();
        
        if (result.success && result.menuOrder) {
          // Reorder menu items based on saved order
          const orderedItems = result.menuOrder.map(key => 
            defaultMenuItems.find(item => item.key === key)
          ).filter(Boolean);
          
          // Add any new items that weren't in the saved order
          const savedKeys = result.menuOrder;
          const newItems = defaultMenuItems.filter(item => !savedKeys.includes(item.key));
          
          setMenuItems([...orderedItems, ...newItems]);
        } else {
          setMenuItems(defaultMenuItems);
        }
      } catch (error) {
        console.error('Error loading menu order:', error);
        setMenuItems(defaultMenuItems);
      }
    };

    loadMenuOrder();
  }, []);

  // Save menu order to API
  const saveMenuOrder = async () => {
    try {
      const menuOrder = menuItems.map(item => item.key);
      const response = await fetch('/api/menu_order_api.php?action=save_menu_order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ menuOrder }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        message.success('تم حفظ ترتيب القائمة بنجاح');
        setHasUnsavedChanges(false);
        setIsDragMode(false);
      } else {
        message.error('فشل في حفظ ترتيب القائمة');
      }
    } catch (error) {
      console.error('Error saving menu order:', error);
      message.error('حدث خطأ أثناء حفظ ترتيب القائمة');
    }
  };

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setMenuItems((items) => {
        const oldIndex = items.findIndex(item => item.key === active.id);
        const newIndex = items.findIndex(item => item.key === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        setHasUnsavedChanges(true);
        return newItems;
      });
    }
  };

  // Quick Actions data - إجراءات سريعة مباشرة
  const quickActions = [
    {
      key: 'add-employee',
      icon: <Plus size={20} />,
      label: 'إضافة موظف',
      color: '#1890ff',
      onClick: () => navigate('/unified-employees')
    },
    {
      key: 'mark-attendance',
      icon: <CheckCircle size={20} />,
      label: 'تسجيل حضور',
      color: '#52c41a',
      onClick: () => navigate('/unified-attendance')
    },
    {
      key: 'calculate-salary',
      icon: <Calculator size={20} />,
      label: 'حاسبة الرواتب',
      color: '#52c41a',
      onClick: () => navigate('/unified-salary-calculator')
    },
    {
      key: 'generate-report',
      icon: <FileText size={20} />,
      label: 'تقرير سريع',
      color: '#722ed1',
      onClick: () => navigate('/reports')
    },
    {
      key: 'backup-data',
      icon: <Shield size={20} />,
      label: 'نسخ احتياطي',
      color: '#f5222d',
      onClick: () => navigate('/backup')
    },
    {
      key: 'quick-settings',
      icon: <Settings size={20} />,
      label: 'إعدادات سريعة',
      color: '#13c2c2',
      onClick: () => navigate('/settings')
    }
  ];

  // قائمة المستخدم
  const userMenuItems = [
    {
      key: 'profile',
      icon: <User size={16} />,
      label: 'الملف الشخصي',
    },
    {
      key: 'settings',
      icon: <Settings size={16} />,
      label: 'الإعدادات',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogOut size={16} />,
      label: 'تسجيل الخروج',
      onClick: onLogout,
    },
  ];



  // Long press handlers
  const startLongPress = () => {
    if (isDragMode) return; // Don't start long press if already in drag mode
    
    setIsLongPressing(true);
    setLongPressProgress(0);
    
    // Progress animation
    const interval = setInterval(() => {
      setLongPressProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2; // Update every 20ms for smooth animation
      });
    }, 20);
    setProgressInterval(interval);
    
    const timer = setTimeout(() => {
      setIsDragMode(true);
      setIsLongPressing(false);
      setLongPressProgress(0);
      if (progressInterval) {
        clearInterval(progressInterval);
        setProgressInterval(null);
      }
      message.info('تم تفعيل وضع التعديل - يمكنك الآن سحب العناصر لإعادة ترتيبها');
    }, 1000); // 1 second long press
    
    setLongPressTimer(timer);
  };

  const cancelLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    if (progressInterval) {
      clearInterval(progressInterval);
      setProgressInterval(null);
    }
    setIsLongPressing(false);
    setLongPressProgress(0);
  };

  // Mouse events
  const handleMouseDown = (e) => {
    startLongPress();
  };

  const handleMouseUp = () => {
    cancelLongPress();
  };

  const handleMouseLeave = () => {
    cancelLongPress();
  };

  // Touch events for mobile
  const handleTouchStart = (e) => {
    e.preventDefault();
    startLongPress();
  };

  const handleTouchEnd = () => {
    cancelLongPress();
  };

  const handleTouchCancel = () => {
    cancelLongPress();
  };

  // Cleanup timer and intervals on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [longPressTimer, progressInterval]);

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // دالة للحصول على عنوان الصفحة
  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/':
        return 'الرئيسية';
      case '/employees':
        return 'الموظفين';
      case '/departments':
        return 'الأقسام';
      case '/unified-attendance':
        return 'الحضور والانصراف';
      case '/weekly-salary':
        return 'الراتب الأسبوعي';
      case '/monthly-salary':
        return 'الراتب الشهري';
      case '/dynamic-system-manager':
        return 'أعمدة الرواتب';
      case '/fingerprint-management':
        return 'إدارة البصمة';
      case '/system-settings':
        return 'الإعدادات';
      case '/unified-employees':
        return 'الموظفين';
      case '/unified-salary-calculator':
        return 'حاسبة الرواتب الموحدة';
      case '/system-test':
        return 'اختبار النظام';
      case '/register-user':
        return 'تسجيل مستخدم جديد';
      default:
        return 'الرئيسية';
    }
  };

  // دالة للحصول على أيقونة الصفحة
  const getPageIcon = (pathname) => {
    switch (pathname) {
      case '/':
        return <BarChart3 size={16} />;
      case '/employees':
      case '/unified-employees':
        return <Users size={16} />;
      case '/departments':
        return <Building2 size={16} />;
      case '/unified-attendance':
        return <Calendar size={16} />;
      case '/weekly-salary':
        return <Calendar size={16} />;
      case '/monthly-salary':
        return <Calendar size={16} />;
      case '/dynamic-system-manager':
        return <Cpu size={16} />;
      case '/fingerprint-management':
        return <IdcardOutlined size={16} />;
      case '/system-settings':
        return <Cog size={16} />;
      default:
        return <BarChart3 size={16} />;
    }
  };

  // دالة للحصول على العنوان الفرعي
  const getPageSubtitle = (pathname) => {
    switch (pathname) {
      case '/':
        return 'نظرة عامة شاملة على إدارة الموظفين والرواتب';
      case '/employees':
        return 'إدارة شاملة لبيانات الموظفين والرواتب';
      case '/departments':
        return 'إدارة أقسام الشركة وتنظيمها';
      case '/unified-attendance':
        return 'تسجيل وإدارة حضور الموظفين';
      case '/unified-salary-management':
        return 'حساب وإدارة الرواتب الموحدة';
      case '/fingerprint-management':
        return 'إدارة بيانات البصمة للموظفين';
      case '/calculation-settings':
        return 'إعدادات حساب الرواتب والمكافآت';
      case '/settings':
        return 'إدارة وتخصيص جميع إعدادات النظام';
      case '/salary-formulas-manager':
        return 'عرض وتعديل معادلات حساب الرواتب والإعدادات';
      case '/table-formula-mapping':
        return 'ربط أعمدة الجداول بمعادلات الحساب المخصصة';
      case '/system-diagnostics':
        return 'تشخيص وفحص أداء النظام';
      case '/unified-employees':
        return 'إدارة موحدة لبيانات الموظفين';
      case '/unified-attendance':
        return 'إدارة موحدة لسجلات الحضور والانصراف';
      case '/unified-salary-calculator':
        return 'حاسبة متقدمة لحساب الرواتب والمكافآت';
      case '/system-test':
        return 'اختبار وظائف النظام والتأكد من الأداء';
      case '/system-settings':
        return 'إعدادات النظام العامة والمتقدم';
      case '/register-user':
        return 'إضافة مستخدمين جدد للنظام';
      default:
        return 'نظرة عامة شاملة على إدارة الموظفين والرواتب';
    }
  };


  // دوال الإشعارات
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} color="#52c41a" />;
      case 'warning':
        return <AlertCircle size={16} color="#faad14" />;
      case 'error':
        return <X size={16} color="#ff4d4f" />;
      default:
        return <Info size={16} color="#1890ff" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success':
        return '#52c41a';
      case 'warning':
        return '#faad14';
      case 'error':
        return '#ff4d4f';
      default:
        return '#1890ff';
    }
  };

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  // Toggle drag mode
  const toggleDragMode = () => {
    setIsDragMode(!isDragMode);
    if (isDragMode) {
      setHasUnsavedChanges(false);
    }
  };

  // Handle menu click
  const handleMenuClick = (key) => {
    if (!isDragMode) {
      navigate(key);
    }
  };

  const mobileMenuContent = (
    <div style={{ 
      padding: '20px 16px', 
      textAlign: 'center', 
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      marginBottom: '16px',
      background: 'rgba(255,255,255,0.1)',
      backdropFilter: 'blur(10px)'
    }}>
      <Title level={3} style={{ 
        color: 'white', 
        margin: 0,
        fontWeight: 'bold',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
      }}>
        {settings.systemName}
      </Title>
      <div style={{ 
        color: 'rgba(255,255,255,0.8)', 
        fontSize: '12px',
        marginTop: '4px',
        letterSpacing: '0.5px'
      }}>
        {settings.companyName}
      </div>
    </div>
  );

  const unreadCount = notifications.filter(notif => !notif.read).length;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider
          className="enhanced-sidebar"
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={240}
        >
          <div className="sidebar-header" style={{ 
            padding: '20px 16px', 
            textAlign: 'center', 
            marginBottom: '16px'
          }}>
            {collapsed ? (
              // Collapsed view - show logo only
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {companyLogo ? (
                  <img
                    src={companyLogo}
                    alt="Company Logo"
                    style={{
                      width: '40px',
                      height: '40px'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}>
                      {settings.companyName?.charAt(0) || 'C'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              // Expanded view - show text
              <>
                <Title level={3} className="sidebar-title" style={{ 
                  margin: 0,
                  fontSize: '21px'
                }}>
                  {settings.systemName}
                </Title>
                <div className="sidebar-subtitle" style={{ 
                  fontSize: '12px',
                  marginTop: '4px',
                  letterSpacing: '0.5px'
                }}>
                  {settings.companyName}
                </div>
              </>
            )}
          </div>
          {isDragMode ? (
            <div style={{ padding: '8px 0' }}>
              <div className="drag-mode-indicator">
                <span>وضع التعديل</span>
                <div className="drag-controls">
                  <Button
                    type="primary"
                    size="small"
                    icon={<Save size={12} />}
                    onClick={saveMenuOrder}
                    disabled={!hasUnsavedChanges}
                  >
                    حفظ
                  </Button>
                  <Button
                    size="small"
                    onClick={toggleDragMode}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={menuItems.map(item => item.key)}
                  strategy={verticalListSortingStrategy}
                >
                  <div style={{ 
                    background: 'transparent',
                    border: 'none'
                  }}>
                    {menuItems.map((item) => (
                      <SortableMenuItem
                        key={item.key}
                        item={item}
                        isActive={location.pathname === item.key}
                        onClick={() => handleMenuClick(item.key)}
                        isDragMode={isDragMode}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ) : (
            <div 
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
              style={{ 
                position: 'relative',
                cursor: 'pointer',
                opacity: isLongPressing ? 0.7 : 1,
                transform: isLongPressing ? 'scale(0.98)' : 'scale(1)',
                transition: 'all 0.2s ease'
              }}
              title="اضغط مع الاستمرار لمدة ثانية واحدة لتفعيل وضع التعديل"
            >
              {isLongPressing && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, #1890ff 0%, #52c41a 100%)',
                  transform: `scaleX(${longPressProgress / 100})`,
                  transformOrigin: 'left',
                  transition: 'transform 0.1s ease',
                  zIndex: 1000,
                  borderRadius: '0 0 3px 3px'
                }} />
              )}
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
                onClick={({ key }) => handleMenuClick(key)}
            style={{
              background: 'transparent',
              border: 'none'
            }}
          />
            </div>
          )}
        </Sider>
      )}
      <Layout>
        <Header 
          className="enhanced-header"
          style={{
            minHeight: '5rem',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {isMobile ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Button
                  type="text"
                  icon={<MenuIcon size={18} />}
                  onClick={handleMobileMenuToggle}
                  style={{ 
                    color: '#1e40af',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease'
                  }}
                />
                <div style={{ 
                  color: '#1e40af',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  letterSpacing: '0.5px'
                }}>
                  {settings.systemName}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <Badge count={unreadCount} size="small">
                  <Tooltip title="الإشعارات">
                    <Button
                      type="text"
                      icon={<Bell size={16} />}
                      onClick={() => setNotificationsVisible(true)}
                      style={{ 
                        color: '#1e40af',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease'
                      }}
                    />
                </Tooltip>
                </Badge>
                  <Dropdown
                    menu={{ items: userMenuItems }}
                    placement="bottomRight"
                    arrow
                  >
                  <Tooltip title={user?.full_name || 'المستخدم'}>
                    <Button
                      type="text"
                      icon={<User size={18} />}
                      style={{ 
                        color: 'white',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        transition: 'all 0.3s ease',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255,255,255,0.2)';
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255,255,255,0.1)';
                        e.target.style.transform = 'scale(1)';
                      }}
                    />
                </Tooltip>
                </Dropdown>
              </div>
            </>
          ) : (
            <>
              {/* Left side - Menu toggle button */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  type="text"
                  icon={<MenuIcon size={20} />}
                  onClick={() => setCollapsed(!collapsed)}
                  style={{ 
                    color: 'white',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    transition: 'all 0.3s ease',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.2)';
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.1)';
                    e.target.style.transform = 'scale(1)';
                  }}
                />
              </div>

              {/* Center - Page title and subtitle */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                flex: 1,
                textAlign: 'center',
                gap: '12px'
              }}>
                <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {getPageIcon(location.pathname)}
                    {getPageTitle(location.pathname)}
                  </div>
                <div className="page-subtitle" style={{ fontSize: '14px', opacity: 0.9 }}>
                    {getPageSubtitle(location.pathname)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <Badge count={unreadCount} size="small">
                  <Tooltip title="الإشعارات">
                    <Button
                      type="text"
                      icon={<Bell size={16} />}
                      onClick={() => setNotificationsVisible(true)}
                      style={{ 
                        color: '#1e40af',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease'
                      }}
                    />
                </Tooltip>
                </Badge>
                  <Dropdown
                    menu={{ items: userMenuItems }}
                    placement="bottomRight"
                    arrow
                  >
                  <Tooltip title={user?.full_name || 'المستخدم'}>
                    <Button
                      type="text"
                      icon={<User size={18} />}
                      style={{ 
                        color: 'white',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        transition: 'all 0.3s ease',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255,255,255,0.2)';
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255,255,255,0.1)';
                        e.target.style.transform = 'scale(1)';
                      }}
                    />
                </Tooltip>
                </Dropdown>
              </div>
            </>
          )}
        </Header>
        <Content style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          padding: '0',
          minHeight: 'calc(100vh - 64px)'
        }}>
          {children}
        </Content>
      </Layout>
      {isMobile && (
        <Drawer
          title={null}
          placement="right"
          closable={false}
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          width={280}
          styles={{ body: { padding: 0 } }}
          style={{ zIndex: 1001 }}
        >
          {mobileMenuContent}
          {isDragMode ? (
            <div style={{ padding: '8px 0' }}>
              <div className="drag-mode-indicator">
                <span>وضع التعديل</span>
                <div className="drag-controls">
                  <Button
                    type="primary"
                    size="small"
                    icon={<Save size={12} />}
                    onClick={saveMenuOrder}
                    disabled={!hasUnsavedChanges}
                  >
                    حفظ
                  </Button>
                  <Button
                    size="small"
                    onClick={toggleDragMode}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={menuItems.map(item => item.key)}
                  strategy={verticalListSortingStrategy}
                >
                  <div style={{ 
                    background: 'transparent',
                    border: 'none'
                  }}>
                    {menuItems.map((item) => (
                      <SortableMenuItem
                        key={item.key}
                        item={item}
                        isActive={location.pathname === item.key}
                        onClick={() => handleMenuClick(item.key)}
                        isDragMode={isDragMode}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ) : (
            <div 
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
              style={{ 
                position: 'relative',
                cursor: 'pointer',
                opacity: isLongPressing ? 0.7 : 1,
                transform: isLongPressing ? 'scale(0.98)' : 'scale(1)',
                transition: 'all 0.2s ease'
              }}
              title="اضغط مع الاستمرار لمدة ثانية واحدة لتفعيل وضع التعديل"
            >
              {isLongPressing && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, #1890ff 0%, #52c41a 100%)',
                  transform: `scaleX(${longPressProgress / 100})`,
                  transformOrigin: 'left',
                  transition: 'transform 0.1s ease',
                  zIndex: 1000,
                  borderRadius: '0 0 3px 3px'
                }} />
              )}
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
                onClick={({ key }) => handleMenuClick(key)}
            style={{
              background: 'transparent',
              border: 'none'
            }}
          />
            </div>
          )}
        </Drawer>
      )}

      {/* مودال الإشعارات */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space>
              <Bell size={20} />
              الإشعارات
            </Space>
            {unreadCount > 0 && (
              <Button 
                type="link" 
                size="small"
                onClick={markAllAsRead}
              >
                تعيين الكل كمقروء
              </Button>
            )}
          </div>
        }
        open={notificationsVisible}
        onCancel={() => setNotificationsVisible(false)}
        footer={null}
        width={500}
        style={{ top: 20 }}
      >
        <Tabs
          defaultActiveKey="all"
          items={[
            {
              key: 'all',
              label: `الكل (${notifications.length})`,
              children: (
                <List
                  dataSource={notifications}
                  renderItem={(notification) => (
                    <List.Item
                      style={{ 
                        padding: '12px 0',
                        borderBottom: '1px solid #f0f0f0',
                        backgroundColor: notification.read ? 'transparent' : '#f6ffed',
                        borderRadius: '6px',
                        marginBottom: '4px',
                        padding: '12px',
                        cursor: 'pointer'
                      }}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <List.Item.Meta
                        avatar={
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '50%',
                            backgroundColor: getNotificationColor(notification.type) + '20',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {getNotificationIcon(notification.type)}
                          </div>
                        }
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ 
                              fontWeight: notification.read ? 'normal' : 'bold',
                              color: notification.read ? '#666' : '#000'
                            }}>
                              {notification.title}
                            </span>
                            {!notification.read && (
                              <div style={{ 
                                width: '6px', 
                                height: '6px', 
                                borderRadius: '50%',
                                backgroundColor: getNotificationColor(notification.type)
                              }} />
                            )}
                          </div>
                        }
                        description={
                          <div>
                            <div style={{ color: '#666', fontSize: '13px', marginBottom: '4px' }}>
                              {notification.message}
                            </div>
                            <Tag color={getNotificationColor(notification.type)} size="small">
                              {notification.time}
                            </Tag>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )
            },
            {
              key: 'unread',
              label: `غير مقروء (${unreadCount})`,
              children: (
                <List
                  dataSource={notifications.filter(n => !n.read)}
                  renderItem={(notification) => (
                    <List.Item
                      style={{ 
                        padding: '12px 0',
                        borderBottom: '1px solid #f0f0f0',
                        backgroundColor: '#f6ffed',
                        borderRadius: '6px',
                        marginBottom: '4px',
                        padding: '12px',
                        cursor: 'pointer'
                      }}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <List.Item.Meta
                        avatar={
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '50%',
                            backgroundColor: getNotificationColor(notification.type) + '20',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {getNotificationIcon(notification.type)}
                          </div>
                        }
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 'bold', color: '#000' }}>
                              {notification.title}
                            </span>
                            <div style={{ 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%',
                              backgroundColor: getNotificationColor(notification.type)
                            }} />
                          </div>
                        }
                        description={
                          <div>
                            <div style={{ color: '#666', fontSize: '13px', marginBottom: '4px' }}>
                              {notification.message}
                            </div>
                            <Tag color={getNotificationColor(notification.type)} size="small">
                              {notification.time}
                            </Tag>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )
            }
          ]}
        />
      </Modal>

      {/* Floating Action Button for Quick Actions */}
      <div className="floating-action-container">
        <Button
          type="primary"
          shape="circle"
          size="large"
          className="floating-action-button"
          icon={<Zap size={20} />}
          onClick={() => setFloatingActionsOpen(!floatingActionsOpen)}
        />
        
        {floatingActionsOpen && (
          <div className="floating-actions-panel">
            {quickActions.map((action, index) => (
              <div
                key={action.key}
                className="floating-action-item"
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  '--action-color': action.color
                }}
                onClick={action.onClick}
              >
                <div className="floating-action-icon">
                  {action.icon}
                </div>
                <span className="floating-action-label">{action.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProLayoutWrapper;

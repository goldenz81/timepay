import React, { useEffect, useMemo, useState } from 'react';
import { 
  Box,
  Heading,
  Text,
  HStack,
  VStack,
  SimpleGrid,
  Grid,
  GridItem,
  Divider,
  Switch as CSwitch,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
  Icon,
  useToast,
  useColorModeValue,
  Card, 
  CardHeader,
  CardBody,
  Input, 
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tag,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Select as CSelect,
  Badge,
  Tooltip,
  Stack,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  TableContainer,
  Center,
} from '@chakra-ui/react';
import { FiSave, FiRefreshCw, FiPlus, FiEdit2, FiDelete, FiWifi, FiCpu, FiUpload, FiMonitor } from 'react-icons/fi';
import { getApiUrl } from '../utils/apiUrlHelper';

const NewFingerprintSettings = () => {
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const headerText = useColorModeValue('gray.800', 'gray.100');
  const subText = useColorModeValue('gray.600', 'gray.400');
  const tableHeaderBg = useColorModeValue('gray.50', 'gray.700');

  const [isSaving, setIsSaving] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);

  const [settings, setSettings] = useState({
    fingerprint_enabled: false,
    fingerprint_auto_sync: true,
    fingerprint_sync_interval: 5,
    fingerprint_timeout: 30,
    fingerprint_retry_attempts: 3,
    fingerprint_backup_enabled: true,
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [devices, setDevices] = useState([]);
  const [syncStatusById, setSyncStatusById] = useState({});

  const [deviceForm, setDeviceForm] = useState({
    name: '',
    type: '',
    model: '',
    ipAddress: '',
    port: 4370,
    password: '',
  });

  const predefinedDevices = useMemo(() => ([
    { name: 'ZKTeco LX50', type: 'ZKTeco', model: 'LX50', defaultPort: 4370, description: 'مناسب للمكاتب الصغيرة' },
    { name: 'ZKTeco K14 Pro', type: 'ZKTeco', model: 'K14 Pro', defaultPort: 4370, description: 'متقدم مع شاشة لمس' },
    { name: 'Convoy CP500', type: 'Convoy', model: 'CP500', defaultPort: 4370, description: 'اقتصادي وموثوق' },
    { name: 'ZK X628TC', type: 'ZK', model: 'X628TC', defaultPort: 4370, description: 'عالي الأداء' },
    { name: 'ZKTeco F22', type: 'ZKTeco', model: 'F22', defaultPort: 4370, description: 'مدمج ومتقدم' },
  ]), []);

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

  // تم إزالة loadSettings لتجنب التضارب مع loadFingerprintSettings

  const loadDevices = async () => {
    try {
      console.log('Loading devices...');
      
      // تحديث حالة الأجهزة بناءً على إعدادات البصمة أولاً
      try {
        await fetch(getApiUrl('/api/fingerprint_sync.php'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'update_device_status' })
        });
      } catch (error) {
        console.log('Could not update device status:', error);
      }
      
      const response = await fetch(getApiUrl('/api/fingerprint_sync.php?action=devices'));
      const data = await safeJsonParse(response);
      let formatted = [];
      
      if (data.success && Array.isArray(data.data)) {
        // تصفية الأجهزة التجريبية وإبقاء الأجهزة الحقيقية فقط
        formatted = data.data
          .filter(d => !d.device_name.includes('Test') && !d.device_name.includes('اختبار'))
          .map(d => ({
            id: d.id,
            name: d.device_name,
            type: d.device_type,
            model: d.device_model || 'غير محدد',
            ipAddress: d.device_ip,
            port: d.device_port,
            status: d.status === 'active' ? 'online' : 'offline',
            lastSync: d.last_sync || 'لم يتم المزامنة',
          }));
      }
      
      // إضافة الجهاز الافتراضي مع التحقق من إعدادات البصمة
      const lastSync = await getLastVirtualDeviceSync();
      const currentSettings = await loadFingerprintSettings();
      console.log('Last sync for virtual device:', lastSync);
      console.log('Fingerprint enabled:', currentSettings?.fingerprint_enabled);
      console.log('Current settings object:', currentSettings);
      
      const virtualDevice = {
        id: 'VIRTUAL_001',
        name: 'الجهاز الافتراضي',
        type: 'Virtual',
        model: 'Virtual Device v1.0',
        ipAddress: '127.0.0.1',
        port: 8080,
        status: (currentSettings?.fingerprint_enabled === true) ? 'online' : 'offline',
        lastSync: lastSync || 'لم يتم المزامنة',
        isVirtual: true
      };
      
      setDevices([virtualDevice, ...formatted]);
      console.log('Devices loaded successfully:', [virtualDevice, ...formatted]);
    } catch (error) {
      console.error('Error loading devices:', error);
      // في حالة الخطأ، أضف الجهاز الافتراضي فقط
      const lastSync = await getLastVirtualDeviceSync();
      const currentSettings = await loadFingerprintSettings();
      console.log('Last sync for virtual device (error case):', lastSync);
      console.log('Fingerprint enabled (error case):', currentSettings?.fingerprint_enabled);
      
      const virtualDevice = {
        id: 'VIRTUAL_001',
        name: 'الجهاز الافتراضي',
        type: 'Virtual',
        model: 'Virtual Device v1.0',
        ipAddress: '127.0.0.1',
        port: 8080,
        status: (currentSettings?.fingerprint_enabled === true) ? 'online' : 'offline',
        lastSync: lastSync || 'لم يتم المزامنة',
        isVirtual: true
      };
      
      setDevices([virtualDevice]);
      
      toast({
        title: 'تحذير',
        description: 'تعذر تحميل قائمة الأجهزة من قاعدة البيانات',
        status: 'warning',
        duration: 3000,
      });
    }
  };

  // دالة للحصول على آخر مزامنة للجهاز الافتراضي
  const getLastVirtualDeviceSync = async () => {
    try {
      // محاولة الحصول على آخر مزامنة من قاعدة البيانات
      const response = await fetch(getApiUrl('/api/virtual_device_api.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'get_last_sync' })
      });
      
      if (response.ok) {
        const data = await safeJsonParse(response);
        if (data.success && data.last_sync) {
          const date = new Date(data.last_sync);
          if (!isNaN(date.getTime())) {
            const formatted = date.toLocaleString('ar-EG', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            console.log('Last sync from database:', formatted);
            return formatted;
          }
        }
      }
      
      // إذا فشل الحصول من قاعدة البيانات، جرب localStorage
      const lastSync = localStorage.getItem('virtualDeviceLastSync');
      console.log('Last sync from localStorage:', lastSync);
      
      if (lastSync && lastSync !== 'null' && lastSync !== 'undefined') {
        const date = new Date(lastSync);
        console.log('Parsed date:', date);
        
        if (!isNaN(date.getTime()) && date.getTime() > 0) {
          const formatted = date.toLocaleString('ar-EG', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          console.log('Formatted date:', formatted);
          return formatted;
        }
      }
      
      // إذا لم توجد مزامنة سابقة، إرجاع "لم يتم المزامنة"
      console.log('No valid last sync found, returning default');
      return 'لم يتم المزامنة';
    } catch (error) {
      console.error('Error getting last sync:', error);
      return 'لم يتم المزامنة';
    }
  };

  // دالة لتحديث آخر مزامنة للجهاز الافتراضي
  const updateVirtualDeviceLastSync = () => {
    try {
      const now = new Date().toISOString();
      localStorage.setItem('virtualDeviceLastSync', now);
      console.log('Last sync updated:', now);
    } catch (error) {
      console.error('Error updating last sync:', error);
    }
  };

  // دالة لاختبار الاتصال بالجهاز الافتراضي
  const testVirtualDeviceConnection = async () => {
    try {
      // التحقق من إعدادات البصمة أولاً
      const currentSettings = await loadFingerprintSettings();
      
      if (!currentSettings.fingerprint_enabled) {
        toast({
          title: 'البصمة معطلة',
          description: 'يجب تفعيل البصمة أولاً لاختبار الجهاز الافتراضي',
          status: 'warning',
          duration: 3000,
        });
        return;
      }

      const response = await fetch(getApiUrl('/api/virtual_device_api.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'get_recent_logs', limit: 1 })
      });
      
      const data = await safeJsonParse(response);
      
      if (data.success) {
        // تحديث آخر مزامنة
        updateVirtualDeviceLastSync();
        // إعادة تحميل الأجهزة لعرض آخر مزامنة محدثة
        await loadDevices();
        
        toast({
          title: 'نجح الاتصال',
          description: 'تم الاتصال بالجهاز الافتراضي بنجاح',
          status: 'success',
          duration: 2000,
        });
      } else {
        toast({
          title: 'فشل الاتصال',
          description: data.message || 'فشل في الاتصال بالجهاز الافتراضي',
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ في الاتصال',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  // دالة لإعادة تعيين آخر مزامنة
  const resetLastSync = () => {
    try {
      localStorage.removeItem('virtualDeviceLastSync');
      updateVirtualDeviceLastSync();
    loadDevices();
      
      toast({
        title: 'تم إعادة تعيين آخر مزامنة',
        description: 'تم إنشاء آخر مزامنة جديدة',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'خطأ في إعادة التعيين',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const loadFingerprintSettings = async () => {
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
          const loadedSettings = {
            fingerprint_enabled: data.settings.fingerprint_enabled?.value || false,
            fingerprint_auto_sync: data.settings.auto_sync_enabled?.value || false,
            fingerprint_sync_interval: data.settings.sync_interval?.value || 5,
            fingerprint_timeout: data.settings.connection_timeout?.value || 30,
            fingerprint_retry_attempts: data.settings.retry_attempts?.value || 3,
            fingerprint_backup_enabled: data.settings.backup_enabled?.value || false,
          };
          setSettings(loadedSettings);
          setSettingsLoaded(true);
          return loadedSettings; // إرجاع الإعدادات المحملة
        }
      }
      // محاولة تحميل الإعدادات من localStorage في حالة الفشل
      const saved = localStorage.getItem('fingerprintSettings');
      if (saved) {
        try {
          const parsedSettings = JSON.parse(saved);
          setSettings(parsedSettings);
          return parsedSettings;
        } catch (e) {
          console.error('Error parsing saved settings:', e);
        }
      }
      
      // إرجاع الإعدادات الافتراضية في حالة الفشل
      return {
        fingerprint_enabled: false,
        fingerprint_auto_sync: false,
        fingerprint_sync_interval: 5,
        fingerprint_timeout: 30,
        fingerprint_retry_attempts: 3,
        fingerprint_backup_enabled: false,
      };
    } catch (error) {
      console.error('Error loading fingerprint settings:', error);
      setSettingsLoaded(true); // حتى لو فشل التحميل، نعرض الإعدادات الافتراضية
      
      // محاولة تحميل الإعدادات من localStorage في حالة الخطأ
      const saved = localStorage.getItem('fingerprintSettings');
      if (saved) {
        try {
          const parsedSettings = JSON.parse(saved);
          setSettings(parsedSettings);
          return parsedSettings;
        } catch (e) {
          console.error('Error parsing saved settings:', e);
        }
      }
      
      // إرجاع الإعدادات الافتراضية في حالة الخطأ
      return {
        fingerprint_enabled: false,
        fingerprint_auto_sync: false,
        fingerprint_sync_interval: 5,
        fingerprint_timeout: 30,
        fingerprint_retry_attempts: 3,
        fingerprint_backup_enabled: false,
      };
    }
  };

  const saveFingerprintSettings = async (newSettings) => {
    try {
      setIsSaving(true);
      const response = await fetch(getApiUrl('/api/fingerprint_settings_api.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save_settings',
          settings: {
            fingerprint_enabled: newSettings.fingerprint_enabled,
            auto_sync_enabled: newSettings.fingerprint_auto_sync,
            sync_interval: newSettings.fingerprint_sync_interval,
            connection_timeout: newSettings.fingerprint_timeout,
            retry_attempts: newSettings.fingerprint_retry_attempts,
            backup_enabled: newSettings.fingerprint_backup_enabled,
          }
        })
      });

      if (response.ok) {
        const data = await safeJsonParse(response);
      if (data.success) {
          // تحديث حالة الجهاز الافتراضي فوراً
          setDevices(prevDevices => 
            prevDevices.map(device => 
              device.isVirtual 
                ? { ...device, status: newSettings.fingerprint_enabled ? 'online' : 'offline' }
                : device
            )
          );
          
          // إعادة تحميل الأجهزة لتحديث حالة الاتصال
          await loadDevices();
          
          toast({
            title: 'تم حفظ الإعدادات',
            description: `تم حفظ إعدادات البصمة بنجاح - الجهاز الافتراضي ${newSettings.fingerprint_enabled ? 'متصل' : 'غير متصل'}`,
            status: 'success',
            duration: 3000,
          });
      } else {
        throw new Error(data.message || 'فشل في حفظ الإعدادات');
      }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      toast({
        title: 'خطأ في حفظ الإعدادات',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    loadDevices();
    loadFingerprintSettings();
    
    // إنشاء آخر مزامنة افتراضية إذا لم توجد
    const lastSync = localStorage.getItem('virtualDeviceLastSync');
    if (!lastSync || lastSync === 'null' || lastSync === 'undefined') {
      console.log('Creating default last sync...');
      updateVirtualDeviceLastSync();
    }
  }, []);

  const handleSave = async () => {
    await saveFingerprintSettings(settings);
  };

  const resetSettings = () => {
    setSettings({
      fingerprint_enabled: false,
      fingerprint_auto_sync: true,
      fingerprint_sync_interval: 5,
      fingerprint_timeout: 30,
      fingerprint_retry_attempts: 3,
      fingerprint_backup_enabled: true,
    });
    toast({ title: 'إعادة تعيين', description: 'تمت إعادة تعيين الإعدادات', status: 'info' });
    };
    
  const testConnection = async (deviceId) => {
    setSyncStatusById(prev => ({ ...prev, [deviceId]: 'testing' }));
    try {
      // التحقق من نوع الجهاز
      const device = devices.find(d => d.id === deviceId);
      
      if (device && device.isVirtual) {
        // اختبار الجهاز الافتراضي
        const response = await fetch(getApiUrl('/api/virtual_device_api.php'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'get_recent_logs', limit: 1 })
        });
        
      const data = await safeJsonParse(response);
      
      if (data.success) {
          // تحديث آخر مزامنة
          updateVirtualDeviceLastSync();
          // إعادة تحميل الأجهزة لعرض آخر مزامنة محدثة
          await loadDevices();
          
          setSyncStatusById(prev => ({ ...prev, [deviceId]: 'success' }));
          toast({ title: 'نجح الاختبار', description: 'تم الاتصال بالجهاز الافتراضي بنجاح', status: 'success', duration: 2000 });
      } else {
          setSyncStatusById(prev => ({ ...prev, [deviceId]: 'error' }));
          toast({ title: 'فشل الاختبار', description: data.message || 'فشل في الاتصال بالجهاز الافتراضي', status: 'error', duration: 3000 });
        }
      } else {
        // اختبار الأجهزة الحقيقية
        const response = await fetch(getApiUrl('/api/fingerprint_sync.php?action=test&device_id=' + deviceId));
        const data = await safeJsonParse(response);
        if (data.success) {
          setSyncStatusById(prev => ({ ...prev, [deviceId]: 'success' }));
          toast({ title: 'نجح الاختبار', status: 'success', duration: 2000 });
        } else {
          setSyncStatusById(prev => ({ ...prev, [deviceId]: 'error' }));
          toast({ title: 'فشل الاختبار', description: data.message || 'فشل في الاتصال بالجهاز', status: 'error', duration: 3000 });
        }
      }
    } catch (error) {
      setSyncStatusById(prev => ({ ...prev, [deviceId]: 'error' }));
      toast({ title: 'خطأ في الاختبار', description: error.message, status: 'error', duration: 3000 });
    }
    setTimeout(() => setSyncStatusById(prev => ({ ...prev, [deviceId]: null })), 2500);
  };

  const syncData = async (deviceId) => {
    setSyncStatusById(prev => ({ ...prev, [deviceId]: 'syncing' }));
    try {
      const response = await fetch(getApiUrl('/api/fingerprint_sync.php?action=sync&device_id=' + deviceId));
      const data = await safeJsonParse(response);
      if (data.success) {
        setSyncStatusById(prev => ({ ...prev, [deviceId]: 'success' }));
        toast({ title: 'تمت المزامنة', status: 'success', duration: 2000 });
      } else {
        setSyncStatusById(prev => ({ ...prev, [deviceId]: 'error' }));
        toast({ title: 'فشل المزامنة', status: 'error', duration: 2000 });
      }
    } catch {
      setSyncStatusById(prev => ({ ...prev, [deviceId]: 'error' }));
      toast({ title: 'خطأ في المزامنة', status: 'error', duration: 2000 });
    }
    setTimeout(() => setSyncStatusById(prev => ({ ...prev, [deviceId]: null })), 2500);
  };

  const testDirectConnection = async (device) => {
    try {
      const response = await fetch(getApiUrl('/api/fingerprint_device_connection.php'), {
          method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          action: 'test_connection',
          device_ip: device.ipAddress,
          device_port: device.port,
          device_password: device.password,
        }),
      });
      const result = await safeJsonParse(response);
      if (result.success) {
        toast({ title: 'تم الاتصال المباشر', status: 'success' });
        } else {
        toast({ title: 'فشل الاتصال المباشر', description: result.message, status: 'error' });
      }
    } catch (e) {
      toast({ title: 'خطأ في الاتصال المباشر', description: e.message, status: 'error' });
    }
  };

  const handleOpenAdd = () => {
    setEditingDevice(null);
    setDeviceForm({ name: '', type: '', model: '', ipAddress: '', port: 4370, password: '' });
    setShowDeviceModal(true);
  };

  const handleDeleteDevice = async (deviceId) => {
    try {
      // منع حذف الجهاز الافتراضي
      if (deviceId === 'VIRTUAL_001') {
        toast({
          title: 'لا يمكن حذف الجهاز الافتراضي',
          description: 'الجهاز الافتراضي لا يمكن حذفه',
          status: 'warning',
          duration: 3000,
        });
        return;
      }

      const response = await fetch(getApiUrl('/api/fingerprint_sync.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'delete_device', 
          device_id: deviceId 
        })
      });

      const data = await safeJsonParse(response);
      
      if (data.success) {
        toast({
          title: 'تم حذف الجهاز',
          description: 'تم حذف الجهاز بنجاح',
          status: 'success',
          duration: 3000,
        });
        await loadDevices(); // إعادة تحميل قائمة الأجهزة
      } else {
        toast({
          title: 'فشل في حذف الجهاز',
          description: data.message || 'حدث خطأ غير متوقع',
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ في حذف الجهاز',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleEditDevice = (device) => {
    setEditingDevice(device);
    setDeviceForm({
      name: device.name,
      type: device.type,
      model: device.model,
      ipAddress: device.ipAddress,
      port: device.port,
      password: device.password || '',
    });
    setShowDeviceModal(true);
  };

  const handleSaveDevice = async () => {
    try {
      const payload = {
        device_name: deviceForm.name,
        device_ip: deviceForm.ipAddress,
        device_port: deviceForm.port,
        device_type: deviceForm.type,
        device_model: deviceForm.model,
        location: 'المكتب الرئيسي',
        status: 'active',
      };
      if (editingDevice) {
        setDevices(prev => prev.map(d => (d.id === editingDevice.id ? { ...d, ...deviceForm } : d)));
        toast({ title: 'تم تحديث الجهاز', status: 'success' });
      } else {
        const resp = await fetch(getApiUrl('/api/fingerprint_sync.php'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_device', device_data: payload }),
        });
        const data = await safeJsonParse(resp);
        if (data.success) {
          await loadDevices();
          toast({ title: 'تمت إضافة الجهاز', status: 'success' });
        } else {
          throw new Error(data.message || 'فشل إضافة الجهاز');
        }
      }
      setShowDeviceModal(false);
    } catch (e) {
      toast({ title: 'خطأ في حفظ الجهاز', description: e.message, status: 'error' });
    }
  };

  const applyPredefined = (d) => {
    setDeviceForm(prev => ({ ...prev, name: d.name, type: d.type, model: d.model, port: d.defaultPort, password: '0' }));
  };

  return (
    <>
        <HStack spacing="3" mb="4" flexWrap="wrap" justify="flex-end" rowGap={2}>
              
          <Button 
                leftIcon={<FiPlus />}
                className="stake-btn-success"
                size="md"
                borderRadius="xl"
                onClick={handleOpenAdd}
              >
                إضافة جهاز
          </Button>
              
          <Button 
                leftIcon={<FiRefreshCw />}
                className="stake-btn"
                size="md"
                borderRadius="xl"
                onClick={loadDevices}
              >
                تحديث
          </Button>
          
          <Button 
                leftIcon={<FiWifi />}
                className="stake-btn"
                size="md"
                borderRadius="xl"
                onClick={testVirtualDeviceConnection}
                colorScheme="green"
              >
                اختبار الجهاز الافتراضي
          </Button>
          
          <Button 
                leftIcon={<FiRefreshCw />}
                className="stake-btn"
                size="md"
                borderRadius="xl"
                onClick={resetLastSync}
                colorScheme="orange"
              >
                إعادة تعيين آخر مزامنة
          </Button>
              
          <Button 
                leftIcon={<FiSave />}
                className="stake-btn"
                size="md"
                borderRadius="xl"
                onClick={handleSave}
                isLoading={isSaving}
              >
                حفظ الإعدادات
          </Button>
        </HStack>

      {/* Settings Cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing="6" mb="8">
        <Card bg="var(--stake-bg-primary, #0f212e)" borderRadius="xl" boxShadow="0 10px 40px rgba(0, 0, 0, 0.3)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)">
          <CardBody p="6">
            <VStack align="stretch" spacing="4">
              <HStack justify="space-between">
                <Text fontSize="lg" fontWeight="600" color="white">تفعيل البصمة</Text>
                <CSwitch 
                  isChecked={settings.fingerprint_enabled} 
                  onChange={(e) => {
                    const newSettings = { ...settings, fingerprint_enabled: e.target.checked };
                    setSettings(newSettings);
                    
                    // تحديث حالة الجهاز الافتراضي فوراً
                    setDevices(prevDevices => 
                      prevDevices.map(device => 
                        device.isVirtual 
                          ? { ...device, status: e.target.checked ? 'online' : 'offline' }
                          : device
                      )
                    );
                    
                    if (settingsLoaded) {
                      saveFingerprintSettings(newSettings);
                    }
                  }}
                  colorScheme="green"
                />
              </HStack>
              <Text fontSize="sm" className="stake-text-secondary">
                عند الإيقاف، لن تتم أي مزامنة أو قراءة بيانات من أجهزة البصمة
              </Text>
            </VStack>
          </CardBody>
            </Card>

        <Card bg="var(--stake-bg-primary, #0f212e)" borderRadius="xl" boxShadow="0 10px 40px rgba(0, 0, 0, 0.3)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)">
          <CardBody p="6">
            <VStack align="stretch" spacing="4">
              <HStack justify="space-between">
                <Text fontSize="lg" fontWeight="600" color="white">المزامنة التلقائية</Text>
                <CSwitch 
                  isChecked={settings.fingerprint_auto_sync} 
                  onChange={(e) => {
                    const newSettings = { ...settings, fingerprint_auto_sync: e.target.checked };
                    setSettings(newSettings);
                    if (settingsLoaded) {
                      saveFingerprintSettings(newSettings);
                    }
                  }}
                  colorScheme="blue"
                />
              </HStack>
              <Text fontSize="sm" className="stake-text-secondary">
                تفعيل مزامنة مجدولة في الخلفية وفق فترة المزامنة
              </Text>
            </VStack>
          </CardBody>
            </Card>

        <Card bg="var(--stake-bg-primary, #0f212e)" borderRadius="xl" boxShadow="0 10px 40px rgba(0, 0, 0, 0.3)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)">
          <CardBody p="6">
            <VStack align="stretch" spacing="4">
              <Text fontSize="lg" fontWeight="600" color="white">فترة المزامنة</Text>
              <HStack>
                <NumberInput 
                        min={1} 
                        max={60} 
                  value={settings.fingerprint_sync_interval} 
                  onChange={(_, val) => {
                    const newSettings = { ...settings, fingerprint_sync_interval: val || 1 };
                    setSettings(newSettings);
                    if (settingsLoaded) {
                      saveFingerprintSettings(newSettings);
                    }
                  }}
                  bg="white"
                  color="black"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Badge colorScheme="blue">دقيقة</Badge>
              </HStack>
              <Text fontSize="sm" className="stake-text-secondary">
                عدد الدقائق بين كل مزامنة تلقائية (1 - 60 دقيقة)
              </Text>
            </VStack>
          </CardBody>
              </Card>

        <Card bg="var(--stake-bg-primary, #0f212e)" borderRadius="xl" boxShadow="0 10px 40px rgba(0, 0, 0, 0.3)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)">
          <CardBody p="6">
            <VStack align="stretch" spacing="4">
              <Text fontSize="lg" fontWeight="600" color="white">مهلة الاتصال</Text>
              <HStack>
                <NumberInput 
                        min={5} 
                        max={120} 
                  value={settings.fingerprint_timeout} 
                  onChange={(_, val) => {
                    const newSettings = { ...settings, fingerprint_timeout: val || 5 };
                    setSettings(newSettings);
                    if (settingsLoaded) {
                      saveFingerprintSettings(newSettings);
                    }
                  }}
                  bg="white"
                  color="black"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Badge colorScheme="orange">ثانية</Badge>
              </HStack>
              <Text fontSize="sm" className="stake-text-secondary">
                عدد الثواني قبل اعتبار الاتصال فاشلاً (5 - 120 ثانية)
              </Text>
            </VStack>
          </CardBody>
              </Card>

        <Card bg="var(--stake-bg-primary, #0f212e)" borderRadius="xl" boxShadow="0 10px 40px rgba(0, 0, 0, 0.3)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)">
          <CardBody p="6">
            <VStack align="stretch" spacing="4">
              <Text fontSize="lg" fontWeight="600" color="white">محاولات إعادة المحاولة</Text>
              <HStack>
                <NumberInput 
                    min={1} 
                    max={10} 
                  value={settings.fingerprint_retry_attempts} 
                  onChange={(_, val) => {
                    const newSettings = { ...settings, fingerprint_retry_attempts: val || 1 };
                    setSettings(newSettings);
                    if (settingsLoaded) {
                      saveFingerprintSettings(newSettings);
                    }
                  }}
                  bg="white"
                  color="black"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Badge colorScheme="purple">محاولة</Badge>
              </HStack>
              <Text fontSize="sm" className="stake-text-secondary">
                كم مرة سيحاول النظام إعادة الاتصال عند فشل المحاولة الأولى (1 - 10)
              </Text>
            </VStack>
          </CardBody>
              </Card>

        <Card bg="var(--stake-bg-primary, #0f212e)" borderRadius="xl" boxShadow="0 10px 40px rgba(0, 0, 0, 0.3)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)">
          <CardBody p="6">
            <VStack align="stretch" spacing="4">
              <HStack justify="space-between">
                <Text fontSize="lg" fontWeight="600" color="white">النسخ الاحتياطي</Text>
                <CSwitch 
                  isChecked={settings.fingerprint_backup_enabled} 
                  onChange={(e) => {
                    const newSettings = { ...settings, fingerprint_backup_enabled: e.target.checked };
                    setSettings(newSettings);
                    if (settingsLoaded) {
                      saveFingerprintSettings(newSettings);
                    }
                  }}
                  colorScheme="green"
                />
              </HStack>
              <Text fontSize="sm" className="stake-text-secondary">
                عند التفعيل، سيتم حفظ نسخة احتياطية من السجلات المُستلمة بشكل دوري
              </Text>
            </VStack>
          </CardBody>
              </Card>
      </SimpleGrid>

      <Box
        mt="4"
        borderRadius="xl"
        border="1px solid"
        borderColor="var(--stake-border-primary, #3e5665)"
        bg="var(--stake-content-surface-raised, var(--stake-bg-card))"
        overflow="hidden"
      >
        <HStack justify="space-between" px={{ base: 3, md: 4 }} pt={4} pb={2} flexWrap="wrap" gap={2}>
          <Heading size="md" className="stake-heading-3">قائمة الأجهزة</Heading>
          <Text fontSize="sm" color="var(--stake-text-secondary)">{devices.length} جهاز</Text>
        </HStack>
        <TableContainer
          maxH="70vh"
          overflowY="auto"
          overflowX="auto"
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
                <Th>اسم الجهاز</Th>
                <Th>نوع الجهاز</Th>
                <Th>الموديل</Th>
                <Th>عنوان IP</Th>
                <Th>المنفذ</Th>
                <Th>الحالة</Th>
                <Th>آخر مزامنة</Th>
                <Th textAlign="center">الإجراءات</Th>
              </Tr>
            </Thead>
            <Tbody>
              {devices.length === 0 ? (
                <Tr>
                  <Td colSpan={8}>
                    <Center py="8">
                      <VStack spacing="4">
                        <Icon as={FiCpu} boxSize="12" className="stake-text-secondary" />
                        <Text className="stake-text-secondary" fontSize="lg">لا توجد أجهزة متصلة</Text>
                        <Text className="stake-text-secondary" fontSize="sm">اضغط على "إضافة جهاز" لإضافة جهاز بصمة جديد</Text>
                      </VStack>
                    </Center>
                  </Td>
                </Tr>
              ) : (
                devices.map((d) => (
                  <Tr key={d.id} _hover={{ bg: "rgba(255, 255, 255, 0.05)" }}>
                    <Td>
                      <HStack spacing="2">
                        {d.isVirtual ? (
                          <Icon as={FiMonitor} boxSize="4" color="blue.400" />
                        ) : (
                          <Icon as={FiCpu} boxSize="4" className="stake-text-secondary" />
                        )}
                        <Text color="var(--stake-text-primary)" fontWeight="500">{d.name}</Text>
                      </HStack>
                    </Td>
                    <Td>
                      <Text color="var(--stake-text-secondary)">{d.type || '-'}</Text>
                    </Td>
                    <Td>
                      <Text color="var(--stake-text-secondary)">{d.model || '-'}</Text>
                    </Td>
                    <Td>
                      <Text color="var(--stake-text-secondary)" fontFamily="mono" fontSize="sm">{d.ipAddress || '-'}</Text>
                    </Td>
                    <Td>
                      <Text color="var(--stake-text-secondary)">{d.port || '-'}</Text>
                    </Td>
                    <Td>
                      <Badge 
                        colorScheme={d.status === 'online' ? 'green' : 'red'} 
                        borderRadius="full" 
                        px="3" 
                        py="1"
                        fontSize="xs"
                      >
                        {d.status === 'online' ? 'متصل' : 'غير متصل'}
                      </Badge>
                    </Td>
                    <Td>
                      <Text color="var(--stake-text-secondary)" fontSize="sm">
                        {d.lastSync ? new Date(d.lastSync).toLocaleString('ar-EG') : '-'}
                      </Text>
                    </Td>
                    <Td>
                      <HStack spacing="2">
                        {d.isVirtual ? (
                          // أزرار خاصة بالجهاز الافتراضي
                          <>
                            <Tooltip 
                              label="فتح الجهاز الافتراضي"
                              bg="var(--stake-bg-primary, #0f212e)"
                              color="white"
                              fontSize="sm"
                              borderRadius="md"
                              px="3"
                              py="2"
                              border="1px solid"
                              borderColor="var(--stake-border-primary, #3e5665)"
                            >
                              <IconButton 
                                aria-label="open-virtual" 
                                size="sm" 
                                icon={<FiMonitor />} 
                                variant="ghost" 
                                color="blue.400"
                                _hover={{ bg: "blue.50", color: "blue.600" }}
                                onClick={() => {
                                  // يمكن إضافة منطق للانتقال إلى تبويب الجهاز الافتراضي
                                  toast({
                                    title: 'الجهاز الافتراضي',
                                    description: 'انتقل إلى تبويب الجهاز الافتراضي لاستخدامه',
                                    status: 'info',
                                    duration: 3000,
                                  });
                                }} 
                              />
                            </Tooltip>
                            <Tooltip 
                              label="إعدادات الجهاز الافتراضي"
                              bg="var(--stake-bg-primary, #0f212e)"
                              color="white"
                              fontSize="sm"
                              borderRadius="md"
                              px="3"
                              py="2"
                              border="1px solid"
                              borderColor="var(--stake-border-primary, #3e5665)"
                            >
                              <IconButton 
                                aria-label="settings" 
                                size="sm" 
                                icon={<FiEdit2 />} 
                                variant="ghost" 
                                color="green.400"
                                _hover={{ bg: "green.50", color: "green.600" }}
                                onClick={() => {
                                  toast({
                                    title: 'إعدادات الجهاز الافتراضي',
                                    description: 'الجهاز الافتراضي يستخدم نفس إعدادات النظام العامة',
                                    status: 'info',
                                    duration: 3000,
                                  });
                                }} 
                              />
                            </Tooltip>
                          </>
                        ) : (
                          // أزرار الأجهزة العادية
                          <>
                            <Tooltip 
                              label="تعديل"
                              bg="var(--stake-bg-primary, #0f212e)"
                              color="white"
                              fontSize="sm"
                              borderRadius="md"
                              px="3"
                              py="2"
                              border="1px solid"
                              borderColor="var(--stake-border-primary, #3e5665)"
                            >
                              <IconButton 
                                aria-label="edit" 
                                size="sm" 
                                icon={<FiEdit2 />} 
                                variant="ghost" 
                                color="blue.400"
                                _hover={{ bg: "blue.50", color: "blue.600" }}
                                onClick={() => handleEditDevice(d)} 
                              />
                            </Tooltip>
                            <Tooltip 
                              label="اختبار"
                              bg="var(--stake-bg-primary, #0f212e)"
                              color="white"
                              fontSize="sm"
                              borderRadius="md"
                              px="3"
                              py="2"
                              border="1px solid"
                              borderColor="var(--stake-border-primary, #3e5665)"
                            >
                              <IconButton 
                                aria-label="test" 
                                size="sm" 
                                icon={<FiCpu />} 
                                variant="ghost" 
                                color="green.400"
                                _hover={{ bg: "green.50", color: "green.600" }}
                                isLoading={syncStatusById[d.id] === 'testing'} 
                                onClick={() => testConnection(d.id)} 
                              />
                            </Tooltip>
                            <Tooltip 
                              label="مزامنة"
                              bg="var(--stake-bg-primary, #0f212e)"
                              color="white"
                              fontSize="sm"
                              borderRadius="md"
                              px="3"
                              py="2"
                              border="1px solid"
                              borderColor="var(--stake-border-primary, #3e5665)"
                            >
                              <IconButton 
                                aria-label="sync" 
                                size="sm" 
                                icon={<FiRefreshCw />} 
                                variant="ghost" 
                                color="purple.400"
                                _hover={{ bg: "purple.50", color: "purple.600" }}
                                isLoading={syncStatusById[d.id] === 'syncing'} 
                                onClick={() => syncData(d.id)} 
                              />
                            </Tooltip>
                            <Tooltip 
                              label="اتصال مباشر"
                              bg="var(--stake-bg-primary, #0f212e)"
                              color="white"
                              fontSize="sm"
                              borderRadius="md"
                              px="3"
                              py="2"
                              border="1px solid"
                              borderColor="var(--stake-border-primary, #3e5665)"
                            >
                              <IconButton 
                                aria-label="direct" 
                                size="sm" 
                                icon={<FiWifi />} 
                                variant="ghost" 
                                color="orange.400"
                                _hover={{ bg: "orange.50", color: "orange.600" }}
                                onClick={() => testDirectConnection(d)} 
                              />
                            </Tooltip>
                            <Tooltip 
                              label="حذف"
                              bg="var(--stake-bg-primary, #0f212e)"
                              color="white"
                              fontSize="sm"
                              borderRadius="md"
                              px="3"
                              py="2"
                              border="1px solid"
                              borderColor="var(--stake-border-primary, #3e5665)"
                            >
                              <IconButton 
                                aria-label="delete" 
                                size="sm" 
                                icon={<FiDelete />} 
                                variant="ghost" 
                                color="red.400"
                                _hover={{ bg: "red.50", color: "red.600" }}
                                onClick={() => handleDeleteDevice(d.id)} 
                              />
                            </Tooltip>
                          </>
                        )}
                      </HStack>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>

      <Modal isOpen={showDeviceModal} onClose={() => setShowDeviceModal(false)} size="xl">
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
            color="white"
            borderRadius="24px 24px 0 0" 
            p="4" 
            position="relative" 
            boxShadow="0 4px 20px rgba(0, 0, 0, 0.4)"
          >
            <HStack justify="space-between" align="center" w="100%">
              <HStack spacing="3">
                <Icon as={FiCpu} boxSize="5" />
                <Text fontSize="md" fontWeight="bold">
                  {editingDevice ? 'تعديل جهاز البصمة' : 'إضافة جهاز بصمة جديد'}
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
            <VStack align="stretch" spacing={4}>
              <Card bg="var(--stake-bg-primary, #0f212e)" border="1px solid" borderColor="var(--stake-border-primary, #3e5665)" borderRadius="xl" boxShadow="0 10px 40px rgba(0, 0, 0, 0.3)">
                <CardHeader pb={2}>
                  <Heading size="sm" color="white">الأجهزة الجاهزة</Heading>
                </CardHeader>
                <CardBody pt={2}>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                    {predefinedDevices.map((pd, idx) => (
                    <Button
                        key={idx} 
                        variant="outline" 
                        justifyContent="flex-start" 
                        onClick={() => applyPredefined(pd)}
                        bg="transparent"
                        borderColor="var(--stake-border-primary, #3e5665)"
                        color="white"
                        _hover={{ 
                          bg: "rgba(255, 255, 255, 0.1)", 
                          borderColor: "#667eea",
                          transform: "translateY(-1px)"
                        }}
                        _active={{ transform: "translateY(0)" }}
                        transition="all 0.2s ease"
                      >
                        <VStack align="flex-start" spacing={0}>
                          <Text fontWeight="bold" color="white">{pd.name}</Text>
                          <Text fontSize="xs" className="stake-text-secondary">{pd.description}</Text>
                        </VStack>
                    </Button>
                ))}
                  </SimpleGrid>
                </CardBody>
            </Card>

              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontWeight="semibold" mb="2">اسم الجهاز</Text>
                  <Input 
                    value={deviceForm.name} 
                    onChange={(e) => setDeviceForm(f => ({ ...f, name: e.target.value }))} 
                    placeholder="مثال: جهاز البصمة الرئيسي"
                    className="stake-input"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="var(--stake-border-primary)"
                    _focus={{
                      borderColor: "var(--stake-border-accent)",
                      boxShadow: "0 0 0 2px rgba(20, 117, 225, 0.2)"
                    }}
                    _hover={{
                      borderColor: "var(--stake-border-accent)"
                    }}
                  />
                </GridItem>
                <GridItem>
                  <Text fontWeight="semibold" mb="2">نوع الجهاز</Text>
                  <Input 
                    value={deviceForm.type} 
                    onChange={(e) => setDeviceForm(f => ({ ...f, type: e.target.value }))} 
                    placeholder="مثال: ZKTeco"
                    className="stake-input"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="var(--stake-border-primary)"
                    _focus={{
                      borderColor: "var(--stake-border-accent)",
                      boxShadow: "0 0 0 2px rgba(20, 117, 225, 0.2)"
                    }}
                    _hover={{
                      borderColor: "var(--stake-border-accent)"
                    }}
                  />
                </GridItem>
                <GridItem>
                  <Text fontWeight="semibold" mb="2">الموديل</Text>
                  <Input 
                    value={deviceForm.model} 
                    onChange={(e) => setDeviceForm(f => ({ ...f, model: e.target.value }))} 
                    placeholder="مثال: LX50"
                    className="stake-input"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="var(--stake-border-primary)"
                    _focus={{
                      borderColor: "var(--stake-border-accent)",
                      boxShadow: "0 0 0 2px rgba(20, 117, 225, 0.2)"
                    }}
                    _hover={{
                      borderColor: "var(--stake-border-accent)"
                    }}
                  />
                </GridItem>
                <GridItem>
                  <Text fontWeight="semibold" mb="2">عنوان IP</Text>
                  <Input 
                    value={deviceForm.ipAddress} 
                    onChange={(e) => setDeviceForm(f => ({ ...f, ipAddress: e.target.value }))} 
                    placeholder="192.168.1.100"
                    className="stake-input"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="var(--stake-border-primary)"
                    _focus={{
                      borderColor: "var(--stake-border-accent)",
                      boxShadow: "0 0 0 2px rgba(20, 117, 225, 0.2)"
                    }}
                    _hover={{
                      borderColor: "var(--stake-border-accent)"
                    }}
                  />
                </GridItem>
                <GridItem>
                  <Text fontWeight="semibold" mb="2">المنفذ</Text>
                  <NumberInput 
                    min={1} 
                    max={65535} 
                    value={deviceForm.port} 
                    onChange={(_, val) => setDeviceForm(f => ({ ...f, port: val || 4370 }))}
                  >
                    <NumberInputField 
                      className="stake-input"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="var(--stake-border-primary)"
                      _focus={{
                        borderColor: "var(--stake-border-accent)",
                        boxShadow: "0 0 0 2px rgba(20, 117, 225, 0.2)"
                      }}
                      _hover={{
                        borderColor: "var(--stake-border-accent)"
                      }}
                    />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </GridItem>
                <GridItem>
                  <Text fontWeight="semibold" mb="2">كلمة المرور</Text>
                  <Input 
                    value={deviceForm.password} 
                    onChange={(e) => setDeviceForm(f => ({ ...f, password: e.target.value }))} 
                    placeholder="كلمة مرور الجهاز" 
                    type="password"
                    className="stake-input"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="var(--stake-border-primary)"
                    _focus={{
                      borderColor: "var(--stake-border-accent)",
                      boxShadow: "0 0 0 2px rgba(20, 117, 225, 0.2)"
                    }}
                    _hover={{
                      borderColor: "var(--stake-border-accent)"
                    }}
                  />
                </GridItem>
              </Grid>
            </VStack>
          </ModalBody>
          <ModalFooter 
            bg="var(--stake-bg-primary, #0f212e)"
            borderRadius="0 0 24px 24px"
            p="4"
            boxShadow="0 -4px 20px rgba(0, 0, 0, 0.4)"
          >
            <HStack spacing="4" w="full" justify="flex-end">
              <Button 
                variant="ghost" 
                onClick={() => setShowDeviceModal(false)}
                color="white"
                _hover={{ bg: "rgba(255, 255, 255, 0.1)" }}
                borderRadius="xl"
              >
                  إلغاء
                </Button>
                <Button 
                leftIcon={<FiSave />}
                className="stake-btn"
                onClick={handleSaveDevice}
                borderRadius="xl"
                >
                  {editingDevice ? 'تحديث الجهاز' : 'إضافة الجهاز'}
                </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
        </Modal>
    </>
  );
};

export default NewFingerprintSettings;

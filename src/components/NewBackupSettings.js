import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiUrl } from '../utils/apiUrlHelper';
import {
  Box,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select as CSelect,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  Progress,
  Icon,
  Flex,
} from '@chakra-ui/react';
import { FiDatabase, FiDownload, FiUpload, FiRefreshCcw, FiPlayCircle, FiSettings, FiSave, FiTrash2 } from 'react-icons/fi';
import {
  SettingsActionsBar,
  SectionCard,
  SettingToggleRow,
  inputFieldProps,
  selectFieldProps,
} from './settings/SettingsTabUi';

const pad2 = (n) => String(n).padStart(2, '0');
const normalizeTimeHHmm = (value) => {
  if (!value) return '03:00';
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) return value;
  if (typeof value === 'string' && /^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/.test(value)) {
    const [, h, m] = value.match(/(\d{1,2}):(\d{1,2})/);
    const hh = Math.min(23, Math.max(0, parseInt(h, 10)));
    const mm = Math.min(59, Math.max(0, parseInt(m, 10)));
    return `${pad2(hh)}:${pad2(mm)}`;
  }
  return '03:00';
};

const computeNextRunLabel = (frequency, hhmm) => {
  try {
    const [hStr, mStr] = (hhmm || '03:00').split(':');
    const now = new Date();
    const next = new Date(now);
    next.setHours(parseInt(hStr || '3', 10), parseInt(mStr || '0', 10), 0, 0);
    if (next <= now) {
      if (frequency === 'daily') next.setDate(next.getDate() + 1);
      else if (frequency === 'weekly') next.setDate(next.getDate() + 7);
      else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
      else next.setDate(next.getDate() + 1);
    }
    const dateStr = next.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = `${pad2(next.getHours())}:${pad2(next.getMinutes())}`;
    return `${dateStr} - ${timeStr}`;
  } catch {
    return '';
  }
};

const NewBackupSettings = () => {
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupList, setBackupList] = useState([]);

  const [settings, setSettings] = useState({
    autoBackup: false,
    backupFrequency: 'daily',
    backupTime: '03:00',
    backupRetention: 30,
    backupEncryption: true
  });

  const nextRun = useMemo(() => computeNextRunLabel(settings.backupFrequency, normalizeTimeHHmm(settings.backupTime)), [settings.backupFrequency, settings.backupTime]);

  const loadBackupList = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl(`/api/simple_backup.php?action=list&t=${Date.now()}`));
      const data = await response.json();
      if (data.success) setBackupList(data.backups || []);
    } catch (e) {
      console.error('Error loading backup list:', e);
    }
  }, []);

  useEffect(() => { loadBackupList(); }, [loadBackupList]);

  const handleManualBackup = async () => {
    setIsCreatingBackup(true);
    setBackupProgress(0);
    try {
      const interval = setInterval(() => setBackupProgress(prev => (prev >= 100 ? 100 : prev + 10)), 200);
      const res = await fetch(getApiUrl(`/api/simple_backup.php?action=create&t=${Date.now()}`), { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      clearInterval(interval);
      setBackupProgress(100);
      if (data.success) {
        toast({ title: 'تم إنشاء النسخة الاحتياطية بنجاح', status: 'success' });
        loadBackupList();
      } else {
        toast({ title: data.message || 'حدث خطأ أثناء إنشاء النسخة الاحتياطية', status: 'error' });
      }
    } catch (e) {
      toast({ title: 'حدث خطأ أثناء إنشاء النسخة الاحتياطية', status: 'error' });
    } finally {
      setIsCreatingBackup(false);
      setTimeout(() => setBackupProgress(0), 500);
    }
  };

  const handleDeleteBackup = async (backupName) => {
    try {
      const res = await fetch(getApiUrl(`/api/simple_backup.php?action=delete&backup_name=${encodeURIComponent(backupName)}&t=${Date.now()}`), { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'تم حذف النسخة الاحتياطية', status: 'success' });
        loadBackupList();
      } else {
        toast({ title: data.message || 'فشل حذف النسخة', status: 'error' });
      }
    } catch (e) {
      toast({ title: 'فشل حذف النسخة الاحتياطية', status: 'error' });
    }
  };

  const handleRestoreBackup = async (backupName) => {
    if (!window.confirm(`هل أنت متأكد من استرجاع النسخة الاحتياطية "${backupName}"؟ سيتم استبدال جميع البيانات الحالية.`)) return;
    setIsRestoring(true);
    try {
      const res = await fetch(getApiUrl(`/api/simple_backup.php?action=restore&backup_name=${encodeURIComponent(backupName)}&t=${Date.now()}`), { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'تم استرجاع النسخة الاحتياطية', status: 'success' });
        loadBackupList();
      } else {
        toast({ title: data.message || 'فشل استرجاع النسخة', status: 'error' });
      }
    } catch (e) {
      toast({ title: 'فشل استرجاع النسخة الاحتياطية', status: 'error' });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDownloadBackup = (backupFile) => {
    const url = `/api/simple_backup.php?action=download&backup_name=${encodeURIComponent(backupFile)}&t=${Date.now()}`;
    window.open(url, '_blank');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const normalizedTime = normalizeTimeHHmm(settings.backupTime);
      const payload = { ...settings, backupTime: normalizedTime };
      localStorage.setItem('backupSettings', JSON.stringify(payload));
      const res = await fetch(getApiUrl('/api/backup_settings_api.php'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_settings', settings: payload })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'تم حفظ إعدادات النسخ الاحتياطية', status: 'success' });
        if (payload.autoBackup) {
          await fetch(getApiUrl('/api/backup_scheduler.php'), {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'schedule_backup', frequency: payload.backupFrequency, time: payload.backupTime })
          });
        }
      } else {
        toast({ title: data.message || 'حدث خطأ أثناء حفظ الإعدادات', status: 'error' });
      }
    } catch (e) {
      toast({ title: 'حدث خطأ أثناء حفظ الإعدادات', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const resetSettings = () => {
    const defaults = { autoBackup: false, backupFrequency: 'daily', backupTime: '03:00', backupRetention: 30, backupEncryption: true };
    setSettings(defaults);
    toast({ title: 'تم إعادة تعيين الإعدادات', status: 'info' });
  };

  const loadSettings = async () => {
    try {
      const res = await fetch(getApiUrl('/api/backup_settings_api.php?action=get_settings'));
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        s.backupTime = normalizeTimeHHmm(s.backupTime);
        setSettings(prev => ({ ...prev, ...s }));
      } else {
        const saved = localStorage.getItem('backupSettings');
        if (saved) {
          const s = JSON.parse(saved);
          s.backupTime = normalizeTimeHHmm(s.backupTime);
          setSettings(prev => ({ ...prev, ...s }));
        }
      }
    } catch (e) {
      const saved = localStorage.getItem('backupSettings');
      if (saved) {
        const s = JSON.parse(saved);
        s.backupTime = normalizeTimeHHmm(s.backupTime);
        setSettings(prev => ({ ...prev, ...s }));
      }
    }
  };

  useEffect(() => { loadSettings(); }, []);

  return (
    <Box className="tp-settings-tab" dir="rtl" lang="ar">
      <SettingsActionsBar
        hint={(
          <Text as="span">
            أنشئ نسخة يدوية أو فعّل <strong>الجدولة التلقائية</strong> ثم احفظ الإعدادات.
          </Text>
        )}
      >
        <HStack spacing={2} w={{ base: '100%', md: 'auto' }} justify={{ base: 'stretch', md: 'flex-end' }}>
          <Button
            leftIcon={<Icon as={FiRefreshCcw} />}
            onClick={resetSettings}
            className="stake-btn-secondary"
            w={{ base: '100%', md: 'auto' }}
          >
            إعادة تعيين
          </Button>
          <Button
            leftIcon={<Icon as={FiSave} />}
            onClick={handleSave}
            isLoading={loading}
            className="stake-btn-primary tp-settings-save-btn"
            w={{ base: '100%', md: 'auto' }}
          >
            حفظ إعدادات النسخ
          </Button>
        </HStack>
      </SettingsActionsBar>

      <VStack align="stretch" spacing={6}>
        <SectionCard
          accent="backup-history"
          icon={FiDatabase}
          title="تاريخ النسخ الاحتياطية"
          subtitle="إنشاء، تحميل، استرجاع، أو حذف النسخ المحفوظة"
        >
          <Flex justify="flex-end" gap={2} flexWrap="wrap" mb={4}>
            <Button
              leftIcon={<Icon as={FiPlayCircle} />}
              onClick={handleManualBackup}
              isLoading={isCreatingBackup}
              className="stake-btn-primary"
              size="sm"
            >
              إنشاء نسخة احتياطية
            </Button>
            <Button
              leftIcon={<Icon as={FiRefreshCcw} />}
              onClick={loadBackupList}
              className="stake-btn-secondary"
              size="sm"
            >
              تحديث
            </Button>
          </Flex>
          {isCreatingBackup && (
            <Box mb={4}>
              <Text color="var(--stake-text-primary)" mb={2} fontSize="sm">
                جاري إنشاء النسخة الاحتياطية...
              </Text>
              <Progress value={backupProgress} colorScheme="cyan" borderRadius="full" />
            </Box>
          )}
          <Box className="tp-settings-table-wrap">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>اسم النسخة</Th>
                  <Th>التاريخ</Th>
                  <Th>الحجم</Th>
                  <Th>الإجراءات</Th>
                </Tr>
              </Thead>
              <Tbody>
                {backupList.length === 0 ? (
                  <Tr>
                    <Td colSpan={4} textAlign="center" color="var(--stake-text-secondary)">
                      لا توجد نسخ احتياطية
                    </Td>
                  </Tr>
                ) : (
                  backupList.map((b) => (
                    <Tr key={b.name}>
                      <Td>{b.name}</Td>
                      <Td>{b.date}</Td>
                      <Td>{b.size}</Td>
                      <Td>
                        <HStack spacing={2} flexWrap="wrap">
                          <Button size="xs" leftIcon={<Icon as={FiDownload} />} onClick={() => handleDownloadBackup(b.name)} className="stake-btn-secondary">
                            تحميل
                          </Button>
                          <Button size="xs" leftIcon={<Icon as={FiUpload} />} onClick={() => handleRestoreBackup(b.name)} isLoading={isRestoring} className="stake-btn-primary">
                            استرجاع
                          </Button>
                          <Button size="xs" leftIcon={<Icon as={FiTrash2} />} onClick={() => handleDeleteBackup(b.name)} colorScheme="red">
                            حذف
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>
        </SectionCard>

        <SectionCard
          accent="backup-config"
          icon={FiSettings}
          title="إعدادات النسخ الاحتياطية"
          subtitle={`التنفيذ التالي: ${nextRun || 'غير متاح'}`}
        >
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} mb={4}>
            <FormControl className="tp-settings-field-group">
              <FormLabel>تكرار النسخ الاحتياطية</FormLabel>
              <CSelect value={settings.backupFrequency} onChange={(e) => setSettings(s => ({ ...s, backupFrequency: e.target.value }))} {...selectFieldProps}>
                <option value="daily">يومي</option>
                <option value="weekly">أسبوعي</option>
                <option value="monthly">شهري</option>
              </CSelect>
            </FormControl>
            <FormControl className="tp-settings-field-group">
              <FormLabel>وقت النسخ الاحتياطية</FormLabel>
              <Input type="time" value={normalizeTimeHHmm(settings.backupTime)} onChange={(e) => setSettings(s => ({ ...s, backupTime: normalizeTimeHHmm(e.target.value) }))} {...inputFieldProps} />
            </FormControl>
            <FormControl className="tp-settings-field-group">
              <FormLabel>فترة الاحتفاظ (يوم)</FormLabel>
              <NumberInput min={1} max={365} value={settings.backupRetention} onChange={(v) => setSettings(s => ({ ...s, backupRetention: Number(v) || 1 }))}>
                <NumberInputField {...inputFieldProps} />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
          </SimpleGrid>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <SettingToggleRow
              label="النسخ التلقائي"
              description="تشغيل النسخ الاحتياطي تلقائياً حسب التكرار المحدد"
              isChecked={settings.autoBackup}
              onChange={(e) => setSettings(s => ({ ...s, autoBackup: e.target.checked }))}
              colorScheme="orange"
            />
            <SettingToggleRow
              label="تشفير النسخ"
              description="تشفير ملفات النسخ الاحتياطي عند الحفظ"
              isChecked={settings.backupEncryption}
              onChange={(e) => setSettings(s => ({ ...s, backupEncryption: e.target.checked }))}
              colorScheme="orange"
            />
          </SimpleGrid>
        </SectionCard>
      </VStack>
    </Box>
  );
};

export default NewBackupSettings;

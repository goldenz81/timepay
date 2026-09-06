import React, { useMemo, useState } from 'react';
import {
  Box,
  Heading,
  HStack,
  VStack,
  Button,
  Flex,
  Text,
  Divider,
  Icon,
} from '@chakra-ui/react';
import { FiHome, FiType, FiCloud, FiDownload, FiSettings } from 'react-icons/fi';
import NewGeneralSettings from '../components/NewGeneralSettings';
import NewAppearanceSettings from '../components/NewAppearanceSettings';
import NewBackupSettings from '../components/NewBackupSettings';
import NewUpdateSettings from '../components/NewUpdateSettings';
import { useSettings } from '../contexts/SettingsContext';
import { useSettingsToolbar } from '../contexts/SettingsToolbarContext';
import PagePanelToggle from '../components/PagePanelToggle';

const APP_VERSION = '1.0.83';

const SETTINGS_TABS = [
  {
    id: 0,
    key: 'general',
    name: 'الإعدادات العامة',
    icon: FiHome,
    subtitle: 'اسم الشركة، العملة، أوقات الدوام، والشعار',
    hint: 'حدّث بيانات الشركة وإعدادات العمل اليومية ثم احفظ التغييرات',
  },
  {
    id: 1,
    key: 'appearance',
    name: 'المظهر والخطوط',
    icon: FiType,
    subtitle: 'الثيم، الخط، وتنسيق الجداول والواجهة',
    hint: 'اختر الثيم والخط المناسب — التغييرات تُطبَّق فوراً على النظام',
  },
  {
    id: 2,
    key: 'backup',
    name: 'النسخ الاحتياطية',
    icon: FiCloud,
    subtitle: 'نسخ احتياطي يدوي أو مجدول واستعادة البيانات',
    hint: 'فعّل النسخ التلقائي أو نفّذ نسخاً يدوياً قبل التحديثات الكبيرة',
  },
  {
    id: 3,
    key: 'updates',
    name: 'التحديثات',
    icon: FiDownload,
    subtitle: 'رفع حزمة تحديث النظام ومتابعة الإصدار الحالي',
    hint: 'ارفع ملف deploy_vX.zip من مجلد updates للترقية',
  },
];

const truncateLabel = (text, max = 16) => {
  const s = (text || '').trim();
  if (!s) return '—';
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

const Settings = () => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const { settings, isLoading } = useSettings();
  const { filtersCollapsed, toggleFiltersCollapsed } = useSettingsToolbar();

  const activeTab = SETTINGS_TABS[activeTabIndex] || SETTINGS_TABS[0];

  const settingsHeaderStatChips = useMemo(() => {
    const chip = (key, value, label, variant = 'total') => ({ key, value, label, variant });

    if (isLoading) {
      return [chip('loading', '…', 'جاري التحميل', 'total')];
    }

    switch (activeTab.key) {
      case 'general':
        return [
          chip('company', truncateLabel(settings.companyName, 18), 'الشركة', 'active'),
          chip('currency', settings.currency || 'EGP', 'العملة', 'filtered'),
          chip(
            'work',
            `${settings.workStartTime || '—'}–${settings.workEndTime || '—'}`,
            'الدوام',
            'weekly'
          ),
          chip(
            'login',
            settings.requireLogin ? 'مفعّل' : 'معطّل',
            'تسجيل الدخول',
            settings.requireLogin ? 'active' : 'inactive'
          ),
        ];
      case 'appearance':
        return [
          chip('font', truncateLabel(settings.fontFamily, 14), 'الخط', 'filtered'),
          chip('timefmt', settings.timeFormat === '12' ? '12 ساعة' : '24 ساعة', 'الوقت', 'total'),
          chip('tz', truncateLabel(settings.timezone?.split('/').pop(), 12), 'المنطقة', 'weekly'),
          chip(
            'keys',
            settings.show_english_keys ? 'ظاهر' : 'مخفي',
            'المفاتيح EN',
            settings.show_english_keys ? 'active' : 'inactive'
          ),
        ];
      case 'backup':
        return [
          chip(
            'auto',
            settings.autoBackup ? 'مفعّل' : 'يدوي',
            'تلقائي',
            settings.autoBackup ? 'active' : 'inactive'
          ),
          chip(
            'freq',
            settings.backupFrequency === 'weekly' ? 'أسبوعي' : 'يومي',
            'التكرار',
            'filtered'
          ),
          chip('time', settings.backupTime || '—', 'الموعد', 'weekly'),
          chip('last', truncateLabel(settings.lastBackup, 14), 'آخر نسخة', 'total'),
        ];
      case 'updates':
        return [
          chip('ver', `v${APP_VERSION}`, 'الإصدار', 'active'),
          chip('tab', '4', 'أقسام', 'total'),
          chip('sys', truncateLabel(settings.systemName, 14), 'النظام', 'filtered'),
        ];
      default:
        return [chip('tab', activeTab.name, 'التبويب', 'filtered')];
    }
  }, [activeTab, isLoading, settings]);

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

  return (
    <Box className="tp-settings-page-layout" w="100%" flex="1" minH="0" display="flex" flexDirection="column">
      {!filtersCollapsed && (
      <Box
        className="tp-settings-page-header weekly-salary-header-shell tp-system-settings-page-header"
        flexShrink={0}
        w="100%"
        maxW="100%"
      >
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
                  className="weekly-salary-header-icon-wrap tp-system-settings-header-icon-wrap"
                  aria-hidden
                >
                  <Icon as={FiSettings} boxSize={{ base: 5, md: 6 }} />
                </Flex>
                <VStack align="flex-start" spacing={0.5} minW={0}>
                  <Heading
                    className="stake-heading-3 weekly-salary-page-title tp-page-header-title"
                    size="md"
                    lineHeight="short"
                    mb={0}
                  >
                    إعدادات النظام
                  </Heading>
                  <Text className="tp-page-header-subtitle" noOfLines={2}>
                    {activeTab.subtitle}
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
                {settingsHeaderStatChips.map((statChip) => (
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
              {activeTab.hint}
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
          {SETTINGS_TABS.map((tab) => (
            <Button key={tab.key} leftIcon={<tab.icon size="16" />} {...tabBtnProps(tab.id)}>
              {tab.name}
            </Button>
          ))}
        </HStack>

        <Box
          className="tp-settings-tab-panel"
          flex="1"
          minH="0"
          minW="0"
          display="flex"
          flexDirection="column"
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
            px={{ base: 3, md: 4, lg: 6 }}
            py={{ base: 3, md: 4, lg: 6 }}
          >
            {activeTab.key === 'general' && <NewGeneralSettings />}
            {activeTab.key === 'appearance' && <NewAppearanceSettings />}
            {activeTab.key === 'backup' && <NewBackupSettings />}
            {activeTab.key === 'updates' && <NewUpdateSettings />}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Settings;

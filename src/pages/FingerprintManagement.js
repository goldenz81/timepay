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
import {
  FiUpload,
  FiDatabase,
  FiLink,
  FiMonitor,
  FiShield,
  FiRefreshCw,
} from 'react-icons/fi';

import NewFingerprintSettings from '../components/NewFingerprintSettings';
import FingerprintImportTab from '../components/FingerprintImportTab';
import FingerprintIntegrationTab from '../components/FingerprintIntegrationTab';
import VirtualFingerprintDevice from '../components/VirtualFingerprintDevice';
import { useFingerprintToolbar } from '../contexts/FingerprintToolbarContext';
import PagePanelToggle from '../components/PagePanelToggle';

const FINGERPRINT_TABS = [
  {
    id: 0,
    key: 'import',
    name: 'الاستيراد',
    icon: FiUpload,
    subtitle: 'استيراد سجلات الحضور من ملفات Excel أو CSV',
    hint: 'التبويب النشط: الاستيراد — رفع ومعاينة بيانات الحضور',
  },
  {
    id: 1,
    key: 'integration',
    name: 'التكامل',
    icon: FiLink,
    subtitle: 'مزامنة البصمة مع نظام الموظفين والحضور',
    hint: 'التبويب النشط: التكامل — حالة الاتصال وعمليات المزامنة',
  },
  {
    id: 2,
    key: 'devices',
    name: 'الأجهزة',
    icon: FiDatabase,
    subtitle: 'إعداد وربط أجهزة البصمة وتفعيل النظام',
    hint: 'التبويب النشط: الأجهزة — إدارة الاتصال والمزامنة',
  },
  {
    id: 3,
    key: 'virtual',
    name: 'الجهاز الافتراضي',
    icon: FiMonitor,
    subtitle: 'محاكاة جهاز بصمة لتسجيل الحضور والانصراف',
    hint: 'التبويب النشط: الجهاز الافتراضي — تسجيل تجريبي للحضور',
  },
];

const FingerprintManagement = () => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const {
    filtersCollapsed,
    toggleFiltersCollapsed,
    integrationStats,
    integrationLoading,
    refreshIntegration,
    importStats,
  } = useFingerprintToolbar();

  const activeTab = FINGERPRINT_TABS[activeTabIndex] || FINGERPRINT_TABS[0];

  const fingerprintHeaderStatChips = useMemo(() => {
    const chip = (key, value, label, variant = 'total') => ({ key, value, label, variant });

    if (activeTab.key === 'integration') {
      if (integrationLoading && !integrationStats) {
        return [chip('loading', '…', 'جاري الفحص', 'total')];
      }

      if (!integrationStats) {
        return [
          chip('status', '—', 'الاتصال', 'inactive'),
          chip('emp', '—', 'موظفين', 'total'),
          chip('att', '—', 'حضور اليوم', 'filtered'),
          chip('sync', '—', 'آخر مزامنة', 'weekly'),
        ];
      }

      const connected = integrationStats.connection_status === 'connected';
      const chips = [
        chip('status', connected ? 'متصل' : 'غير متصل', 'الاتصال', connected ? 'active' : 'inactive'),
        chip(
          'emp',
          `${integrationStats.synced_employees || 0}/${integrationStats.total_employees || 0}`,
          'موظفين',
          'total'
        ),
        chip('att', String(integrationStats.attendance_records || 0), 'حضور اليوم', 'filtered'),
      ];

      const lastSync = integrationStats.last_sync;
      if (lastSync) {
        const compactSync = lastSync.includes(' ')
          ? lastSync.split(' ')[1]?.slice(0, 5) || lastSync.slice(0, 10)
          : lastSync.slice(0, 10);
        chips.push(chip('sync', compactSync, 'آخر مزامنة', 'weekly'));
      } else {
        chips.push(chip('sync', '—', 'آخر مزامنة', 'weekly'));
      }

      if (integrationStats.pending_sync_days > 0) {
        chips.push(
          chip(
            'pending',
            String(integrationStats.pending_sync_days),
            'بانتظار المزامنة',
            'inactive'
          )
        );
      }

      return chips;
    }

    if (activeTab.key === 'import') {
      const phase = importStats?.phase || 'idle';
      const statusMap = {
        idle: { value: 'في الانتظار', variant: 'inactive' },
        ready: { value: 'جاهز', variant: 'active' },
        importing: { value: `${importStats?.progress ?? 0}%`, variant: 'weekly' },
        done: { value: 'مكتمل', variant: 'active' },
      };
      const status = statusMap[phase] || statusMap.idle;
      const chips = [
        chip('records', String(importStats?.recordCount ?? 0), 'سجل للمعاينة', 'total'),
        chip(
          'file',
          importStats?.fileName
            ? importStats.fileName.length > 14
              ? `${importStats.fileName.slice(0, 11)}…`
              : importStats.fileName
            : '—',
          importStats?.fileSizeKb ? `${importStats.fileSizeKb} KB` : 'الملف',
          'filtered'
        ),
        chip('status', status.value, 'الحالة', status.variant),
      ];

      if (phase === 'done' && importStats?.importedCount != null) {
        chips.push(chip('imported', String(importStats.importedCount), 'مستورد', 'active'));
      }

      return chips;
    }

    return [
      chip('tab', activeTab.name, 'التبويب', 'filtered'),
      chip('index', `${activeTabIndex + 1}/${FINGERPRINT_TABS.length}`, 'من الأقسام', 'total'),
      chip('module', 'بصمة', 'النظام', 'active'),
    ];
  }, [activeTab, activeTabIndex, integrationStats, integrationLoading, importStats]);

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
    <Box className="tp-settings-page-layout tp-fingerprint-page-layout" w="100%" flex="1" minH="0" display="flex" flexDirection="column">
      {!filtersCollapsed && (
        <Box className="tp-settings-page-header weekly-salary-header-shell tp-fingerprint-page-header" flexShrink={0} w="100%" maxW="100%">
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
                    className="weekly-salary-header-icon-wrap tp-fingerprint-header-icon-wrap"
                    aria-hidden
                  >
                    <Icon as={FiShield} boxSize={{ base: 5, md: 6 }} />
                  </Flex>
                  <VStack align="flex-start" spacing={0.5} minW={0}>
                    <Heading className="stake-heading-3 weekly-salary-page-title tp-page-header-title" size="md" lineHeight="short" mb={0}>
                      إدارة البصمة
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
                  {activeTab.key === 'integration' && (
                    <Button
                      leftIcon={<FiRefreshCw />}
                      className="stake-btn"
                      size="sm"
                      borderRadius="lg"
                      onClick={refreshIntegration}
                      isLoading={integrationLoading}
                      flexShrink={0}
                    >
                      تحديث الحالة
                    </Button>
                  )}
                  {fingerprintHeaderStatChips.map((statChip) => (
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
                {activeTab.key === 'integration'
                  ? 'الحالة في الأعلى — نفّذ عمليات المزامنة مباشرة من التبويب أدناه'
                  : activeTab.key === 'import'
                    ? 'ارفع الملف، راجع المعاينة، ثم استورد — يدعم Excel و CSV'
                    : activeTab.hint}
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
          {FINGERPRINT_TABS.map((tab) => (
            <Button key={tab.id} leftIcon={<tab.icon size="16" />} {...tabBtnProps(tab.id)}>
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
            px={{ base: 3, md: 4, lg: 6 }}
            py={{ base: 3, md: 4, lg: 6 }}
          >
            {activeTab.key === 'import' && <FingerprintImportTab />}
            {activeTab.key === 'integration' && <FingerprintIntegrationTab />}
            {activeTab.key === 'devices' && <NewFingerprintSettings />}
            {activeTab.key === 'virtual' && <VirtualFingerprintDevice />}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default FingerprintManagement;

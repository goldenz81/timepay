import React, { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../utils/apiUrlHelper';
import { useFingerprintToolbar } from '../contexts/FingerprintToolbarContext';
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
  Badge,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Center,
  Divider,
  Flex,
  Spinner,
} from '@chakra-ui/react';
import {
  FiAlertCircle,
  FiRefreshCw,
  FiUsers,
  FiDatabase,
  FiServer,
  FiTrendingUp,
  FiZap,
  FiCheckCircle,
  FiLink,
} from 'react-icons/fi';

const INTEGRATION_STEPS = [
  { key: 'check', label: 'فحص الحالة' },
  { key: 'sync', label: 'تنفيذ المزامنة' },
  { key: 'done', label: 'النتيجة' },
];

const formatRecomputeNote = (data) => {
  const r = data?.recompute;
  if (!r?.applied) return '';
  return ` | إعادة احتساب شامل: ${r.updated_records ?? 0} سجل (${r.start_date} → ${r.end_date})`;
};

const SyncActionCard = ({
  icon,
  iconColor = 'blue.400',
  title,
  description,
  hint,
  hintColorScheme = 'blue',
  buttonLabel,
  buttonIcon,
  buttonClassName,
  buttonVariant,
  buttonColorScheme,
  buttonBorderColor,
  onClick,
  isLoading,
  loadingText = 'جاري المزامنة...',
  isAdvanced = false,
  isRecommended = false,
}) => (
  <Card
    className={`tp-fingerprint-sync-card${isAdvanced ? ' tp-fingerprint-sync-card--advanced' : ''}${isRecommended ? ' tp-fingerprint-sync-card--recommended' : ''}`}
    bg="var(--stake-bg-secondary, #111827)"
    borderRadius="xl"
    border="1px solid"
    borderColor={isAdvanced ? 'orange.400' : 'var(--stake-border-primary, #3e5665)'}
    h="100%"
    display="flex"
    flexDirection="column"
  >
    <CardBody display="flex" flexDirection="column" flex="1" p={{ base: 4, md: 5 }} gap={4}>
      <HStack spacing={3} align="flex-start">
        <Flex
          align="center"
          justify="center"
          boxSize="10"
          borderRadius="lg"
          bg={isAdvanced ? 'rgba(251, 146, 60, 0.12)' : 'rgba(59, 130, 246, 0.12)'}
          flexShrink={0}
        >
          <Icon as={icon} boxSize={5} color={iconColor} />
        </Flex>
        <VStack align="flex-start" spacing={1} flex="1" minW={0}>
          <HStack spacing={2} flexWrap="wrap">
            <Heading size="sm" color="var(--stake-text-primary, white)" lineHeight="1.4">
              {title}
            </Heading>
            {isRecommended && (
              <Badge colorScheme="yellow" borderRadius="full" fontSize="xs">
                موصى به
              </Badge>
            )}
          </HStack>
          {hint && (
            <Badge colorScheme={hintColorScheme} borderRadius="full" fontSize="xs" px={2}>
              {hint}
            </Badge>
          )}
        </VStack>
      </HStack>

      <Text className="stake-text-secondary" fontSize="sm" lineHeight="1.65" flex="1">
        {description}
      </Text>

      <Button
        leftIcon={<Icon as={buttonIcon} />}
        className={buttonClassName}
        variant={buttonVariant}
        colorScheme={buttonColorScheme}
        size="md"
        borderRadius="xl"
        onClick={onClick}
        isLoading={isLoading}
        loadingText={loadingText}
        w="full"
        mt="auto"
        borderColor={buttonBorderColor}
        _hover={buttonBorderColor ? { bg: 'rgba(251, 146, 60, 0.12)' } : undefined}
      >
        {buttonLabel}
      </Button>
    </CardBody>
  </Card>
);

const DetailRow = ({ label, value, valueColor }) => (
  <HStack justify="space-between" py={2} className="tp-fingerprint-integration-detail-row">
    <Text className="stake-text-secondary" fontSize="sm">
      {label}
    </Text>
    <Text color={valueColor || 'var(--stake-text-primary, white)'} fontSize="sm" fontWeight="500" textAlign="left">
      {value}
    </Text>
  </HStack>
);

const FingerprintIntegrationTab = () => {
  const toast = useToast();
  const {
    setIntegrationStats,
    setIntegrationLoading,
    setRefreshIntegration,
    clearIntegrationHeader,
  } = useFingerprintToolbar();
  const [loading, setLoading] = useState(false);
  const [integrationData, setIntegrationData] = useState(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncResult, setSyncResult] = useState(null);
  const [activeSyncAction, setActiveSyncAction] = useState(null);

  const currentStepIndex = syncResult ? 2 : integrationData ? 1 : 0;

  const checkIntegration = useCallback(async (showToast = false) => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/api/fingerprint_system_integration.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_integration' }),
      });

      const data = await response.json();
      if (data.success) {
        setIntegrationData(data.results);
        if (showToast) {
          toast({
            title: 'تم تحديث الحالة',
            description: 'تم فحص حالة التكامل بنجاح',
            status: 'success',
            duration: 3000,
          });
        }
      } else if (showToast) {
        toast({
          title: 'فشل في فحص التكامل',
          description: data.message,
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      if (showToast) {
        toast({
          title: 'خطأ في فحص التكامل',
          description: error.message,
          status: 'error',
          duration: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    setIntegrationStats(integrationData);
    setIntegrationLoading(loading);
  }, [integrationData, loading, setIntegrationStats, setIntegrationLoading]);

  useEffect(() => {
    setRefreshIntegration(() => () => checkIntegration(true));
    checkIntegration(false);
    return () => clearIntegrationHeader();
  }, [checkIntegration, setRefreshIntegration, clearIntegrationHeader]);

  const runWithProgress = async (actionKey, requestBody, onSuccess) => {
    try {
      setLoading(true);
      setActiveSyncAction(actionKey);
      setSyncProgress(0);
      setSyncResult(null);

      const step = actionKey === 'full_resync_attendance' ? 12 : actionKey === 'full_sync' ? 15 : 20;
      const progressInterval = setInterval(() => {
        setSyncProgress((prev) => (prev >= 90 ? 90 : prev + step));
      }, actionKey === 'full_resync_attendance' ? 400 : 300);

      const response = await fetch(getApiUrl('/api/fingerprint_system_integration.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      clearInterval(progressInterval);
      setSyncProgress(100);

      if (data.success) {
        setSyncResult(data);
        onSuccess?.(data);
        checkIntegration(false);
      } else {
        toast({
          title: 'فشلت العملية',
          description: data.message,
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      setSyncProgress(0);
      toast({
        title: 'خطأ في المزامنة',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
      setActiveSyncAction(null);
    }
  };

  const syncEmployees = () =>
    runWithProgress('sync_employees', { action: 'sync_employees' }, () => {
      toast({
        title: 'تم مزامنة الموظفين',
        description: 'تم ربط أرقام البصمة بسجلات الموظفين',
        status: 'success',
        duration: 5000,
      });
    });

  const syncAttendanceChanges = () =>
    runWithProgress('sync_attendance_changes', { action: 'sync_attendance_changes' }, (data) => {
      const noChanges = (data.total_processed ?? 0) === 0;
      toast({
        title: noChanges ? 'لا توجد تغييرات' : 'تمت مزامنة التغييرات',
        description:
          (noChanges
            ? 'كل سجلات البصمة محدّثة مسبقاً في الحضور'
            : `جديد: ${data.synced_count ?? 0}، محدّث: ${data.updated_count ?? 0}`) + formatRecomputeNote(data),
        status: noChanges ? 'info' : 'success',
        duration: 6000,
      });
    });

  const fullResyncAttendance = () => {
    if (
      !window.confirm(
        'إعادة مزامنة كاملة: ستُعاد معالجة كل سجلات البصمة، ويُحذف من الحضور ما كان «مزامَناً من البصمة» فقط، ثم تُعاد المزامنة وإعادة الاحتساب الشامل.\n\nهل تريد المتابعة؟'
      )
    ) {
      return;
    }
    runWithProgress('full_resync_attendance', { action: 'full_resync_attendance' }, (data) => {
      toast({
        title: 'تمت إعادة المزامنة الكاملة',
        description: (data.message || '') + formatRecomputeNote(data),
        status: 'success',
        duration: 8000,
      });
    });
  };

  const fullSync = () =>
    runWithProgress('full_sync', { action: 'full_sync' }, (data) => {
      const recomputeNote = formatRecomputeNote(data.attendance);
      toast({
        title: 'تمت المزامنة الكاملة',
        description:
          `موظفين جدد: ${data.employees?.synced_count || 0} | حضور: جديد ${data.attendance?.synced_count || 0}، محدّث ${data.attendance?.updated_count || 0}` +
          recomputeNote,
        status: 'success',
        duration: 6000,
      });
    });

  const isSyncing = loading && activeSyncAction;
  const connected = integrationData?.connection_status === 'connected';
  const hasPending = (integrationData?.pending_sync_days ?? 0) > 0;

  return (
    <Box className="tp-fingerprint-integration-tab" flexShrink={0} w="100%">
        {/* خطوات المزامنة */}
        <HStack
          className="tp-fingerprint-import-steps"
          spacing={{ base: 2, md: 4 }}
          mb={6}
          flexWrap="wrap"
          justify="center"
        >
          {INTEGRATION_STEPS.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isDone = index < currentStepIndex;
            return (
              <HStack
                key={step.key}
                className={`tp-fingerprint-import-step${isActive ? ' tp-fingerprint-import-step--active' : ''}${isDone ? ' tp-fingerprint-import-step--done' : ''}`}
                spacing={2}
                px={3}
                py={2}
                borderRadius="xl"
              >
                <Flex
                  align="center"
                  justify="center"
                  boxSize="7"
                  borderRadius="full"
                  fontSize="sm"
                  fontWeight="bold"
                  className="tp-fingerprint-import-step__num"
                >
                  {isDone ? <Icon as={FiCheckCircle} boxSize={4} /> : index + 1}
                </Flex>
                <Text fontSize="sm" fontWeight={isActive ? '600' : '500'}>
                  {step.label}
                </Text>
              </HStack>
            );
          })}
        </HStack>

        {/* تحميل أولي */}
        {loading && !integrationData && (
          <Card
            bg="var(--stake-bg-primary, #0f212e)"
            borderRadius="xl"
            border="1px solid"
            borderColor="var(--stake-border-primary, #3e5665)"
            mb={6}
          >
            <CardBody py={12}>
              <Center>
                <VStack spacing={4}>
                  <Spinner size="lg" color="blue.400" thickness="3px" />
                  <Text color="white" fontWeight="600">
                    جاري فحص حالة التكامل...
                  </Text>
                  <Text className="stake-text-secondary" fontSize="sm">
                    يتم التحقق من الاتصال وسجلات المزامنة
                  </Text>
                </VStack>
              </Center>
            </CardBody>
          </Card>
        )}

        {/* لا توجد بيانات */}
        {!loading && !integrationData && (
          <Card
            bg="var(--stake-bg-primary, #0f212e)"
            borderRadius="xl"
            border="1px solid"
            borderColor="var(--stake-border-primary, #3e5665)"
            mb={6}
          >
            <CardBody py={12}>
              <Center>
                <VStack spacing={4}>
                  <Icon as={FiAlertCircle} boxSize={12} className="stake-text-secondary" />
                  <Text color="white" fontWeight="600">
                    لم يتم العثور على بيانات التكامل
                  </Text>
                  <Button
                    leftIcon={<FiRefreshCw />}
                    className="stake-btn"
                    onClick={() => checkIntegration(true)}
                    borderRadius="xl"
                  >
                    إعادة المحاولة
                  </Button>
                </VStack>
              </Center>
            </CardBody>
          </Card>
        )}

        {integrationData && (
          <>
            {/* إجراء سريع يومي */}
            <Box
              className={`tp-fingerprint-integration-quick-bar${hasPending ? ' tp-fingerprint-integration-quick-bar--pending' : ''}`}
              mb={6}
              p={{ base: 4, md: 5 }}
              borderRadius="xl"
            >
              <Flex
                direction={{ base: 'column', md: 'row' }}
                align={{ base: 'stretch', md: 'center' }}
                justify="space-between"
                gap={4}
              >
                <VStack align="flex-start" spacing={1} flex="1">
                  <HStack spacing={2} flexWrap="wrap">
                    <Icon as={FiZap} color="yellow.400" />
                    <Heading size="sm" color="white">
                      المزامنة اليومية
                    </Heading>
                    {hasPending && (
                      <Badge colorScheme="orange" borderRadius="full">
                        {integrationData.pending_sync_days} بانتظار المزامنة
                      </Badge>
                    )}
                  </HStack>
                  <Text className="stake-text-secondary" fontSize="sm">
                    انقل سجلات الحضور الجديدة من البصمة إلى النظام — الاستخدام الأكثر شيوعاً
                  </Text>
                </VStack>
                <HStack spacing={2} flexShrink={0} flexWrap="wrap">
                  <Button
                    leftIcon={<FiZap />}
                    className="stake-btn-success"
                    size="md"
                    borderRadius="xl"
                    onClick={syncAttendanceChanges}
                    isLoading={loading && activeSyncAction === 'sync_attendance_changes'}
                    loadingText="جاري المزامنة..."
                  >
                    مزامنة التغييرات
                  </Button>
                  <Button
                    leftIcon={<FiDatabase />}
                    className="stake-btn-secondary"
                    size="md"
                    borderRadius="xl"
                    onClick={fullSync}
                    isLoading={loading && activeSyncAction === 'full_sync'}
                    loadingText="جاري المزامنة..."
                  >
                    مزامنة كاملة
                  </Button>
                </HStack>
              </Flex>
            </Box>

            {/* عمليات المزامنة التفصيلية */}
            <Card
              bg="var(--stake-bg-primary, #0f212e)"
              borderRadius="xl"
              border="1px solid"
              borderColor="var(--stake-border-primary, #3e5665)"
              mb={6}
            >
              <CardHeader pb={2}>
                <HStack spacing={3}>
                  <Icon as={FiLink} boxSize={6} color="blue.400" />
                  <VStack align="flex-start" spacing={0}>
                    <Heading size="md" color="white">
                      عمليات المزامنة
                    </Heading>
                    <Text className="stake-text-secondary" fontSize="sm">
                      كل بطاقة توضّح ماذا تفعل — اختر العملية المناسبة لحالتك
                    </Text>
                  </VStack>
                </HStack>
              </CardHeader>
              <CardBody pt={2}>
                <Text
                  fontSize="xs"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  className="stake-text-secondary"
                  mb={3}
                >
                  الاستخدام اليومي
                </Text>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={6}>
                  <SyncActionCard
                    icon={FiZap}
                    iconColor="yellow.400"
                    title="مزامنة التغييرات"
                    hint="الاستخدام اليومي"
                    hintColorScheme="yellow"
                    isRecommended
                    description="ينقل فقط سجلات الحضور الجديدة أو المعدّلة من جدول البصمة إلى سجل الحضور. آمن وسريع — لا يمسح بيانات قديمة."
                    buttonLabel="مزامنة التغييرات"
                    buttonIcon={FiZap}
                    buttonClassName="stake-btn"
                    onClick={syncAttendanceChanges}
                    isLoading={loading && activeSyncAction === 'sync_attendance_changes'}
                  />
                  <SyncActionCard
                    icon={FiDatabase}
                    iconColor="blue.400"
                    title="مزامنة كاملة"
                    hint="اختصار"
                    hintColorScheme="blue"
                    description="ينفّذ مزامنة الموظفين ثم مزامنة التغييرات في خطوة واحدة. مناسب عند نهاية اليوم أو بعد استيراد ملف بصمة."
                    buttonLabel="مزامنة كاملة"
                    buttonIcon={FiDatabase}
                    buttonClassName="stake-btn-secondary"
                    onClick={fullSync}
                    isLoading={loading && activeSyncAction === 'full_sync'}
                  />
                </SimpleGrid>

                <Text
                  fontSize="xs"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  className="stake-text-secondary"
                  mb={3}
                >
                  إعداد وصيانة
                </Text>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <SyncActionCard
                    icon={FiUsers}
                    iconColor="green.400"
                    title="مزامنة الموظفين"
                    hint="عند إضافة موظفين"
                    hintColorScheme="green"
                    description="يربط أرقام البصمة (AC-No) بسجلات الموظفين في النظام. استخدمه بعد تسجيل موظف جديد على جهاز البصمة."
                    buttonLabel="مزامنة الموظفين"
                    buttonIcon={FiUsers}
                    buttonClassName="stake-btn-success"
                    onClick={syncEmployees}
                    isLoading={loading && activeSyncAction === 'sync_employees'}
                  />
                  <SyncActionCard
                    icon={FiRefreshCw}
                    iconColor="orange.400"
                    title="إعادة مزامنة كاملة"
                    hint="إصلاح فقط"
                    hintColorScheme="orange"
                    description="يحذف من الحضور ما كان «مزامَناً من البصمة» فقط، ثم يعيد معالجة كل السجلات. للتعارضات — وليس للاستخدام اليومي."
                    buttonLabel="إعادة مزامنة كاملة"
                    buttonIcon={FiRefreshCw}
                    buttonVariant="outline"
                    buttonColorScheme="orange"
                    buttonBorderColor="orange.400"
                    onClick={fullResyncAttendance}
                    isLoading={loading && activeSyncAction === 'full_resync_attendance'}
                    loadingText="جاري إعادة المزامنة..."
                    isAdvanced
                  />
                </SimpleGrid>
              </CardBody>
            </Card>

            {/* شريط التقدم */}
            {isSyncing && (
              <Card
                bg="var(--stake-bg-primary, #0f212e)"
                borderRadius="xl"
                border="1px solid"
                borderColor="var(--stake-border-primary, #3e5665)"
                mb={6}
              >
                <CardBody p={5}>
                  <VStack spacing={3} align="stretch">
                    <HStack spacing={3}>
                      <Spinner size="sm" color="blue.400" />
                      <Text color="white" fontWeight="600">
                        جاري تنفيذ المزامنة...
                      </Text>
                    </HStack>
                    <Progress value={syncProgress} size="lg" colorScheme="blue" borderRadius="full" />
                    <Text className="stake-text-secondary" fontSize="sm">
                      {syncProgress}% مكتمل
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            )}

            {/* نتيجة المزامنة */}
            {syncResult && !isSyncing && (
              <Alert
                status="success"
                borderRadius="xl"
                mb={6}
                flexDirection="column"
                alignItems="stretch"
                className="tp-fingerprint-import-result"
              >
                <HStack spacing={3} mb={syncResult.details ? 3 : 0}>
                  <AlertIcon />
                  <Box flex="1">
                    <AlertTitle>تمت المزامنة بنجاح</AlertTitle>
                    <AlertDescription>
                      تم تحديث البيانات — راجع الإحصائيات في الهيدر أو التفاصيل أدناه
                    </AlertDescription>
                  </Box>
                </HStack>
                {syncResult.details && (
                  <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={3} w="full">
                    {Object.entries(syncResult.details).map(([key, value]) => (
                      <Box key={key} className="tp-fingerprint-import-result__stat">
                        <Text className="tp-fingerprint-import-result__value" color="green.400" fontSize="md">
                          {value}
                        </Text>
                        <Text fontSize="sm" className="stake-text-secondary">
                          {key}
                        </Text>
                      </Box>
                    ))}
                  </SimpleGrid>
                )}
              </Alert>
            )}

            {/* تفاصيل الاتصال والإحصائيات */}
            <Box
              className="tp-fingerprint-integration-details"
              borderRadius="xl"
              border="1px solid"
              borderColor="var(--stake-border-primary, #3e5665)"
              overflow="hidden"
            >
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={0}>
                <Box p={{ base: 4, md: 5 }} borderRightWidth={{ lg: '1px' }} borderColor="var(--stake-border-primary)">
                  <HStack spacing={2} mb={4}>
                    <Icon as={FiServer} color="blue.400" />
                    <Heading size="sm" className="stake-heading-3">
                      معلومات الاتصال
                    </Heading>
                    <Badge colorScheme={connected ? 'green' : 'red'} borderRadius="full">
                      {connected ? 'متصل' : 'غير متصل'}
                    </Badge>
                  </HStack>
                  <DetailRow label="الخادم" value={integrationData.server_info?.host || 'غير محدد'} />
                  <Divider borderColor="var(--stake-border-primary)" opacity={0.5} />
                  <DetailRow label="المنفذ" value={integrationData.server_info?.port || 'غير محدد'} />
                  <Divider borderColor="var(--stake-border-primary)" opacity={0.5} />
                  <DetailRow label="آخر مزامنة" value={integrationData.last_sync || 'لم يتم'} />
                </Box>

                <Box p={{ base: 4, md: 5 }}>
                  <HStack spacing={2} mb={4}>
                    <Icon as={FiTrendingUp} color="green.400" />
                    <Heading size="sm" className="stake-heading-3">
                      إحصائيات المزامنة
                    </Heading>
                  </HStack>
                  <DetailRow
                    label="الموظفين المزامنين"
                    value={`${integrationData.synced_employees || 0} / ${integrationData.total_employees || 0}`}
                  />
                  <Divider borderColor="var(--stake-border-primary)" opacity={0.5} />
                  <DetailRow
                    label="سجلات حضور اليوم"
                    value={String(integrationData.attendance_records || 0)}
                    valueColor="blue.300"
                  />
                  <Divider borderColor="var(--stake-border-primary)" opacity={0.5} />
                  <DetailRow
                    label="موظفين جدد"
                    value={String(integrationData.new_employees || 0)}
                    valueColor="green.300"
                  />
                  <Divider borderColor="var(--stake-border-primary)" opacity={0.5} />
                  <DetailRow
                    label="حضور جديد"
                    value={String(integrationData.new_attendance || 0)}
                    valueColor="blue.300"
                  />
                </Box>
              </SimpleGrid>
            </Box>
          </>
        )}
    </Box>
  );
};

export default FingerprintIntegrationTab;

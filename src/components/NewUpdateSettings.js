import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Progress,
  Badge,
  Icon,
  useToast,
  SimpleGrid,
  Flex,
  Collapse,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import {
  FiUploadCloud,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiPackage,
  FiFile,
  FiDownload,
  FiInfo,
  FiZap,
} from 'react-icons/fi';
import { getApiUrl } from '../utils/apiUrlHelper';
import {
  SettingsActionsBar,
  SectionCard,
  SettingsTabLoading,
} from './settings/SettingsTabUi';

const THEME = {
  cardBg: 'var(--stake-bg-card, #0f212e)',
  cardBorder: 'var(--stake-border-primary, #3e5665)',
  headerBg: 'var(--stake-bg-secondary, #102a3a)',
  headerText: 'var(--stake-text-primary, #ffffff)',
  subText: 'var(--stake-text-secondary, #a0aec0)',
  bodyBg: 'var(--stake-bg-secondary, #1b2b38)',
  panelBg: 'var(--stake-bg-card, #0b1a24)',
};

const StatusPill = ({ tone = 'neutral', label, detail, detailNode }) => {
  const tones = {
    success: { className: 'tp-settings-status-pill tp-settings-status-pill--success', color: 'green.300', icon: FiCheckCircle },
    info: { className: 'tp-settings-status-pill tp-settings-status-pill--info', color: 'blue.300', icon: FiDownload },
    warning: { className: 'tp-settings-status-pill tp-settings-status-pill--warning', color: 'orange.300', icon: FiAlertCircle },
    neutral: { className: 'tp-settings-status-pill', color: 'gray.300', icon: FiInfo },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <Flex className={t.className} align="flex-start" gap={3}>
      <Icon as={t.icon} color={t.color} mt={0.5} flexShrink={0} />
      <Box flex={1}>
        <Text fontWeight="bold" color={THEME.headerText} fontSize="sm">
          {label}
        </Text>
        {detailNode}
        {!detailNode && detail && (
          <Text fontSize="xs" color={THEME.subText} mt={1} lineHeight="1.6">
            {detail}
          </Text>
        )}
      </Box>
    </Flex>
  );
};

const NewUpdateSettings = () => {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const progressIntervalRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({
    hasUpdate: false,
    hasPendingPackage: false,
    updateStatus: 'no_package',
    statusMessage: '',
    currentVersion: '1.0.0',
    newVersion: null,
    fileSize: null,
    lastCheck: null,
  });
  const [progress, setProgress] = useState({
    status: 'idle',
    progress: 0,
    currentFile: '',
    totalFiles: 0,
    processedFiles: 0,
    updatedFiles: [],
    skippedFiles: [],
    errors: [],
  });
  const [deletingPackage, setDeletingPackage] = useState(false);

  const checkForUpdates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/api/update_system.php?action=check'));
      const data = await response.json();

      if (data.success) {
        setUpdateInfo(data);
        return Promise.resolve(data);
      }
      throw new Error(data.message);
    } catch (error) {
      console.error('Error checking updates:', error);
      toast({
        title: 'خطأ في التحقق من التحديثات',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
      return Promise.reject(error);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleDeletePendingPackage = async () => {
    if (deletingPackage || updating || uploading) return;
    try {
      setDeletingPackage(true);
      const response = await fetch(getApiUrl('/api/update_system.php?action=delete_package'), {
        method: 'POST',
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'فشل حذف الملف');
      }
      toast({
        title: 'تم الحذف',
        description: data.message || 'تم حذف deploy.zip',
        status: 'success',
        duration: 4000,
      });
      await checkForUpdates();
    } catch (error) {
      toast({
        title: 'فشل الحذف',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setDeletingPackage(false);
    }
  };

  const startUpdate = async () => {
    if (!updateInfo.hasUpdate) {
      try {
        const response = await fetch(getApiUrl('/api/update_system.php?action=check'));
        const data = await response.json();
        if (data.success && data.hasUpdate) {
          setUpdateInfo(data);
        } else {
          toast({
            title: 'لا يوجد تحديث متاح',
            description: 'لم يتم العثور على ملف تحديث للتثبيت',
            status: 'warning',
            duration: 3000,
          });
          return;
        }
      } catch (error) {
        toast({
          title: 'خطأ في التحقق من التحديث',
          description: error.message,
          status: 'error',
          duration: 5000,
        });
        return;
      }
    }

    setUpdating(true);
    setProgress({
      status: 'starting',
      progress: 0,
      currentFile: '',
      totalFiles: 0,
      processedFiles: 0,
      updatedFiles: [],
      skippedFiles: [],
      errors: [],
    });

    progressIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(getApiUrl('/api/update_system.php?action=progress'));
        const data = await response.json();

        if (data.success && data.progress) {
          setProgress(data.progress);

          if (data.progress.status === 'completed' || data.progress.status === 'error') {
            clearInterval(progressIntervalRef.current);
            setUpdating(false);

            if (data.progress.status === 'completed') {
              toast({
                title: 'تم التحديث بنجاح',
                description: `تم تحديث ${data.progress.updatedFiles.length} ملف`,
                status: 'success',
                duration: 5000,
              });
              checkForUpdates();
            }
          }
        }
      } catch (error) {
        console.error('Error getting progress:', error);
      }
    }, 500);

    try {
      const response = await fetch(getApiUrl('/api/update_system.php?action=start'));
      const data = await response.json();

      if (!data.success) {
        clearInterval(progressIntervalRef.current);
        setUpdating(false);
        throw new Error(data.message);
      }
    } catch (error) {
      clearInterval(progressIntervalRef.current);
      setUpdating(false);
      toast({
        title: 'فشل في بدء التحديث',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast({
        title: 'خطأ',
        description: 'يجب أن يكون الملف بصيغة ZIP',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadedBytes(0);
    setTotalBytes(file.size);

    const formData = new FormData();
    formData.append('updateFile', file);
    formData.append('action', 'upload');

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
          setUploadedBytes(e.loaded);
          setTotalBytes(e.total);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success) {
              setUploadProgress(100);
              toast({
                title: 'تم رفع الملف بنجاح',
                description: 'جاري تثبيت التحديث تلقائياً...',
                status: 'success',
                duration: 3000,
              });

              checkForUpdates()
                .then((updateData) => {
                  if (updateData?.hasUpdate) {
                    setTimeout(() => startUpdate(), 1500);
                  } else if (updateData?.updateStatus === 'same_version') {
                    toast({
                      title: 'نفس الإصدار',
                      description: updateData.statusMessage || 'الحزمة مطابقة للإصدار المثبت — لم يُبدأ التثبيت.',
                      status: 'info',
                      duration: 6000,
                    });
                  } else {
                    toast({
                      title: 'تحذير',
                      description: updateData?.statusMessage || 'تم رفع الملف لكن لا يوجد تحديث جديد للتثبيت',
                      status: 'warning',
                      duration: 5000,
                    });
                  }
                })
                .catch(() => setTimeout(() => startUpdate(), 2000));
            } else {
              throw new Error(data.message);
            }
          } catch {
            throw new Error('خطأ في معالجة الاستجابة');
          }
        } else {
          throw new Error(`خطأ في الرفع: ${xhr.status}`);
        }
      });

      xhr.addEventListener('error', () => {
        toast({
          title: 'فشل في رفع الملف',
          description: 'حدث خطأ أثناء رفع الملف',
          status: 'error',
          duration: 5000,
        });
        setUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
      });

      xhr.open('POST', getApiUrl('/api/update_system.php'));
      xhr.send(formData);

      xhr.addEventListener('loadend', () => {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => {
          setUploadProgress(0);
          setUploadedBytes(0);
          setTotalBytes(0);
        }, 1000);
      });
    } catch (error) {
      toast({
        title: 'فشل في رفع الملف',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  const getStatusMessage = () => {
    switch (progress.status) {
      case 'starting':
        return 'جاري بدء التحديث...';
      case 'extracting':
        return 'جاري فك الضغط...';
      case 'updating':
        return 'جاري تحديث الملفات...';
      case 'completed':
        return 'اكتمل التحديث بنجاح';
      case 'error':
        return 'حدث خطأ أثناء التحديث';
      default:
        return '';
    }
  };

  const getProgressColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'green';
      case 'error':
        return 'red';
      default:
        return 'blue';
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
  };

  const busy = updating || uploading;
  const activeProgress = uploading ? uploadProgress : progress.progress;
  const showProgressPanel = busy;

  const statusTone = (() => {
    switch (updateInfo.updateStatus) {
      case 'update_available':
        return 'info';
      case 'same_version':
      case 'downgrade':
        return 'warning';
      case 'unknown_version':
        return 'neutral';
      default:
        return 'success';
    }
  })();

  const statusLabel = (() => {
    switch (updateInfo.updateStatus) {
      case 'update_available':
        return 'يوجد تحديث جاهز للتثبيت';
      case 'same_version':
        return 'الحزمة بنفس الإصدار المثبت';
      case 'downgrade':
        return 'الحزمة أقدم من المثبت';
      case 'unknown_version':
        return 'حزمة بانتظار المراجعة';
      default:
        return 'النظام محدّث';
    }
  })();

  const statusDetail =
    updateInfo.statusMessage ||
    (updateInfo.hasUpdate
      ? [
          updateInfo.fileSize && `حجم الحزمة: ${updateInfo.fileSize}`,
          updateInfo.newVersion && `الإصدار الجديد: v${updateInfo.newVersion}`,
        ]
          .filter(Boolean)
          .join(' • ')
      : 'لا توجد حزمة تحديث بانتظار التثبيت على الخادم');

  const canDeletePendingPackage = updateInfo.hasPendingPackage && !updateInfo.hasUpdate;

  const renderDeletePackageDetail = () => {
    const ver = updateInfo.currentVersion;
    const pkgVer = updateInfo.newVersion;
    let intro = 'يوجد ملف deploy.zip على الخادم —';
    if (updateInfo.updateStatus === 'same_version') {
      intro = `ملف deploy.zip موجود لكنه بنفس الإصدار المثبت (v${ver}). لا حاجة للتثبيت — ارفع حزمة بإصدار أعلى أو`;
    } else if (updateInfo.updateStatus === 'downgrade' && pkgVer) {
      intro = `الحزمة (v${pkgVer}) أقدم من المثبت (v${ver}) —`;
    }
    return (
      <Text fontSize="xs" color={THEME.subText} mt={1} lineHeight="1.6">
        {intro}{' '}
        <Button
          variant="link"
          color="orange.300"
          fontSize="xs"
          fontWeight="bold"
          textDecoration="underline"
          _hover={{ color: 'orange.200', textDecoration: 'underline' }}
          onClick={handleDeletePendingPackage}
          isLoading={deletingPackage}
          loadingText="جاري الحذف..."
          isDisabled={busy}
          h="auto"
          minH="auto"
          p={0}
          verticalAlign="baseline"
          display="inline"
        >
          احذف
        </Button>
        {' '}
        الملف من مجلد updates.
      </Text>
    );
  };

  if (loading) {
    return <SettingsTabLoading message="جاري التحقق من التحديثات..." />;
  }

  return (
    <Box className="tp-settings-tab tp-update-settings" w="100%" minW={0}>
      <VStack align="stretch" spacing={{ base: 3, md: 4 }}>
        <SettingsActionsBar
          hint={(
            <Box>
              <Text as="span" display="block" mb={1}>
                الإصدار المثبت: <strong>v{updateInfo.currentVersion}</strong>
                {updateInfo.hasUpdate && updateInfo.newVersion ? (
                  <> — متاح: <strong>v{updateInfo.newVersion}</strong></>
                ) : null}
              </Text>
              {updateInfo.lastCheck && (
                <Text as="span" fontSize="xs" color="var(--stake-text-secondary)">
                  آخر فحص: {updateInfo.lastCheck}
                </Text>
              )}
            </Box>
          )}
        >
          <HStack spacing={2} w={{ base: '100%', md: 'auto' }} flexDir={{ base: 'column', sm: 'row' }}>
            <Button
              leftIcon={<FiRefreshCw />}
              variant="outline"
              className="stake-btn-secondary"
              size="sm"
              w={{ base: '100%', sm: 'auto' }}
              onClick={checkForUpdates}
              isDisabled={busy}
            >
              إعادة الفحص
            </Button>
            {updateInfo.hasUpdate && (
              <Button
                leftIcon={<FiZap />}
                colorScheme="green"
                size="sm"
                w={{ base: '100%', sm: 'auto' }}
                onClick={startUpdate}
                isLoading={updating}
                loadingText="جاري التثبيت..."
                isDisabled={uploading}
              >
                تثبيت التحديث
              </Button>
            )}
          </HStack>
        </SettingsActionsBar>

        <Grid
          templateColumns={{ base: '1fr', md: '1fr 1fr' }}
          gap={{ base: 3, md: 4 }}
          alignItems="stretch"
          w="100%"
          minW={0}
        >
          <GridItem minW={0} overflow="visible">
            <SectionCard accent="update-status" icon={FiPackage} title="حالة التحديث" subtitle="مقارنة الإصدار المثبت بالحزمة على الخادم">
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3} mb={4}>
                <Box className="tp-settings-stat-chip">
                  <Text className="tp-settings-stat-chip__label">المثبت</Text>
                  <Text className="tp-settings-stat-chip__value" color="blue.300">
                    v{updateInfo.currentVersion}
                  </Text>
                </Box>
                <Box className="tp-settings-stat-chip">
                  <Text className="tp-settings-stat-chip__label">الحزمة</Text>
                  <Text className="tp-settings-stat-chip__value" color={updateInfo.hasUpdate ? 'green.300' : undefined}>
                    {updateInfo.newVersion ? `v${updateInfo.newVersion}` : '—'}
                  </Text>
                  {updateInfo.fileSize && (
                    <Text fontSize="xs" color={THEME.subText} mt={0.5}>
                      {updateInfo.fileSize}
                    </Text>
                  )}
                </Box>
              </SimpleGrid>
              <StatusPill
                tone={statusTone}
                label={statusLabel}
                detail={canDeletePendingPackage ? undefined : statusDetail}
                detailNode={canDeletePendingPackage ? renderDeletePackageDetail() : undefined}
              />
            </SectionCard>
          </GridItem>

          <GridItem minW={0} overflow="visible">
            <SectionCard accent="update-upload" icon={FiUploadCloud} title="رفع deploy.zip" subtitle="يُثبَّت تلقائياً إذا كان الإصدار أعلى من المثبت">
              <Flex
                className={`tp-settings-upload-drop${busy ? ' tp-settings-upload-drop--disabled' : ''}`}
                direction={{ base: 'column', md: 'row' }}
                align="center"
                gap={3}
                minH={{ base: 'auto', md: '120px' }}
                justify="center"
                w="100%"
                minW={0}
                onClick={() => !busy && fileInputRef.current?.click()}
              >
                <Icon as={FiUploadCloud} color="purple.300" boxSize={7} flexShrink={0} />
                <Box flex={1} textAlign={{ base: 'center', md: 'start' }} minW={0}>
                  <Text color={THEME.headerText} fontWeight="semibold" fontSize="sm">
                    اختر ملف ZIP
                  </Text>
                  <Text color={THEME.subText} fontSize="xs" mt={0.5}>
                    يُثبَّت تلقائياً إذا كان الإصدار أعلى
                  </Text>
                </Box>
                <Button
                  colorScheme="purple"
                  size="sm"
                  flexShrink={0}
                  w={{ base: '100%', md: 'auto' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  isLoading={uploading}
                  loadingText="رفع..."
                  isDisabled={busy}
                >
                  اختيار ملف
                </Button>
              </Flex>
              <input
                type="file"
                ref={fileInputRef}
                accept=".zip"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </SectionCard>
          </GridItem>
        </Grid>

        <Box w="100%" minW={0} overflow="visible">
          <Collapse in={showProgressPanel} animateOpacity unmountOnExit style={{ overflow: 'visible' }}>
            <SectionCard accent="update-progress" icon={updating ? FiRefreshCw : FiUploadCloud} title={uploading ? 'جاري الرفع' : 'جاري التثبيت'}>
              <HStack justify="flex-end" mb={3}>
                <Badge colorScheme={uploading ? 'purple' : getProgressColor()}>{activeProgress}%</Badge>
              </HStack>
              <VStack align="stretch" spacing={3}>
                <Progress
                  value={activeProgress}
                  colorScheme={uploading ? 'purple' : getProgressColor()}
                  size="md"
                  borderRadius="full"
                  hasStripe
                  isAnimated
                />
                <Flex justify="space-between" flexWrap="wrap" gap={2} fontSize="xs" color={THEME.subText}>
                  <Text>
                    {uploading
                      ? totalBytes > 0
                        ? `${formatBytes(uploadedBytes)} / ${formatBytes(totalBytes)}`
                        : 'جاري الرفع...'
                      : getStatusMessage()}
                  </Text>
                  {updating && (
                    <HStack spacing={3}>
                      <Text>
                        {progress.processedFiles}/{progress.totalFiles} ملف
                      </Text>
                      <Text color="green.300">محدّث: {progress.updatedFiles.length}</Text>
                    </HStack>
                  )}
                </Flex>
                {updating && progress.currentFile && (
                  <Text fontSize="xs" color={THEME.subText} isTruncated noOfLines={1}>
                    <Icon as={FiFile} mr={1} />
                    {progress.currentFile}
                  </Text>
                )}
                {progress.errors.length > 0 && (
                  <Text fontSize="xs" color="orange.300">
                    {progress.errors.join(' — ')}
                  </Text>
                )}
              </VStack>
            </SectionCard>
          </Collapse>
        </Box>
      </VStack>
    </Box>
  );
};

export default NewUpdateSettings;

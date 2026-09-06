import React, { useState, useEffect, useMemo } from 'react';
import { getApiUrl } from '../utils/apiUrlHelper';
import useCurrency from '../hooks/useCurrency';
import { useSettings } from '../contexts/SettingsContext';
import {
  PAGE_BACKGROUND_TARGETS,
  BG_MODE_LABELS,
  resolveBackgroundImageUrl,
  readAllPageBackgroundsFromSettings,
  parseBackgroundOpacity,
} from '../utils/pageBackgroundHelper';
import { parseSystemBooleanFlag } from '../utils/systemFeatureFlags';
import { 
  Box,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Grid,
  GridItem,
  FormControl,
  FormLabel,
  Input, 
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Button, 
  Image as CImage,
  useToast,
  Flex,
  Divider,
  Badge
} from '@chakra-ui/react';
import { HomeOutlined, UploadOutlined, DeleteOutlined, SaveOutlined, DollarOutlined, LockOutlined, UnlockOutlined, PictureOutlined, GiftOutlined } from '@ant-design/icons';
import {
  SettingsActionsBar,
  SectionCard,
  SettingToggleRow,
  SettingsTabLoading,
  inputFieldProps,
  selectFieldProps,
} from './settings/SettingsTabUi';

const LogoUploadZone = ({ label, hint, preview, uploading, onSelect, onClear, inputId }) => (
  <Box className="tp-settings-logo-zone">
    <Text className="tp-settings-logo-zone__title">{label}</Text>
    {hint && <Text className="tp-settings-logo-zone__hint">{hint}</Text>}
    <Flex direction={{ base: 'column', sm: 'row' }} align="center" gap={4}>
      <Box
        className={`tp-settings-logo-zone__preview${preview ? ' tp-settings-logo-zone__preview--filled' : ''}`}
      >
        {preview ? (
          <>
            <CImage src={preview} alt={label} w="100%" h="100%" objectFit="contain" p={2} />
            <Button
              colorScheme="red"
              size="xs"
              position="absolute"
              top={1}
              left={1}
              borderRadius="full"
              minW="auto"
              w={6}
              h={6}
              p={0}
              onClick={onClear}
            >
              <Box as={DeleteOutlined} fontSize="xs" />
            </Button>
          </>
        ) : (
          <Box as={UploadOutlined} className="tp-settings-logo-zone__preview-icon" />
        )}
      </Box>
      <VStack align="stretch" spacing={2} flex={1} w="100%">
        <Text fontSize="xs" color="var(--stake-text-secondary)">PNG أو JPG — يُفضّل خلفية شفافة</Text>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelect(file);
            e.target.value = '';
          }}
        />
        <Button
          size="sm"
          isLoading={uploading}
          leftIcon={<Box as={UploadOutlined} />}
          className="stake-btn-primary tp-settings-save-btn"
          onClick={() => document.getElementById(inputId)?.click()}
        >
          {preview ? 'استبدال الشعار' : 'رفع الشعار'}
        </Button>
      </VStack>
    </Flex>
  </Box>
);

const NewGeneralSettings = () => {
  const toast = useToast();
  const { settings, reloadSettings, updateSettings } = useSettings();
  const currencyHook = useCurrency();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingLogoSoftLight, setIsUploadingLogoSoftLight] = useState(false);
  const [isUploadingPageBg, setIsUploadingPageBg] = useState(false);
  const [pageBgTarget, setPageBgTarget] = useState('login');
  const [pageBackgrounds, setPageBackgrounds] = useState({
    login: { image: '', mode: 'cover', opacity: 100 },
    dashboard: { image: '', mode: 'cover', opacity: 100 },
    header: { image: '', mode: 'cover', opacity: 100 },
    sidebar: { image: '', mode: 'cover', opacity: 100 },
  });

  // Identity state
  const [identityValues, setIdentityValues] = useState({
    systemName: '',
    companyName: ''
  });
  const [logoPreview, setLogoPreview] = useState('');
  const [logoSoftLightPreview, setLogoSoftLightPreview] = useState('');

  // Currency state
  const [currencyValues, setCurrencyValues] = useState({
    currency_symbol: 'ج.م',
    currency_name: 'جنيه مصري',
    currency_code: 'EGP',
    currency_position: 'after',
    currency_decimals: '0',
    currency_thousands_separator: ',',
    currency_decimal_separator: '.',
    currency_show_symbol: true,
    currency_show_name: true
  });

  // Login settings state
  const [loginSettings, setLoginSettings] = useState({
    require_login: true,
  });

  // بدلات ومكافآت أسبوعية (قابلة للتوسع لاحقاً: مواصلات، تأمين...)
  const [weeklyBenefits, setWeeklyBenefits] = useState({
    meal_allowance_enabled: true,
  });

  const getCurrencyPreview = () => {
    const cv = currencyValues;
    const sample = 12500.5;
    const decimals = parseInt(cv.currency_decimals, 10) || 0;
    const fixed = sample.toFixed(decimals);
    const parts = fixed.split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, cv.currency_thousands_separator);
    const formatted = parts[1] != null ? `${intPart}${cv.currency_decimal_separator}${parts[1]}` : intPart;
    let result = formatted;
    if (cv.currency_show_symbol) {
      result = cv.currency_position === 'before' ? `${cv.currency_symbol} ${formatted}` : `${formatted} ${cv.currency_symbol}`;
    }
    if (cv.currency_show_name) {
      result = cv.currency_position === 'before' ? `${cv.currency_name} ${result}` : `${result} ${cv.currency_name}`;
    }
    return result;
  };

  const activePageBg = pageBackgrounds[pageBgTarget] || pageBackgrounds.login;
  const activePageBgTargetMeta = PAGE_BACKGROUND_TARGETS[pageBgTarget];
  const activePageBgUrl = resolveBackgroundImageUrl(activePageBg.image);
  const pageBgFileInputId = useMemo(
    () => `page-bg-file-${pageBgTarget}`,
    [pageBgTarget]
  );

  const updateActivePageBg = (patch) => {
    const normalizedPatch = { ...patch };
    if (Object.prototype.hasOwnProperty.call(normalizedPatch, 'opacity')) {
      normalizedPatch.opacity = parseBackgroundOpacity(normalizedPatch.opacity, 100);
    }
    setPageBackgrounds((prev) => {
      const next = {
        ...prev,
        [pageBgTarget]: { ...prev[pageBgTarget], ...normalizedPatch },
      };
      window.dispatchEvent(new CustomEvent('pageBackgroundUpdated', { detail: { backgrounds: next } }));
      return next;
    });
  };

  const loadSystemSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/load_system_settings.php'));
      const data = await response.json();
      if (data.success && data.settings) {
        const s = data.settings;
        setIdentityValues({
          systemName: s['system_name'] || settings.systemName || '',
          companyName: s['company_name'] || settings.companyName || ''
        });
        const logoValue = s['company_logo'] || settings.companyLogo || '';
        setLogoPreview(logoValue);
        const logoSoftLightValue = s['company_logo_soft_light'] || settings.companyLogoSoftLight || '';
        setLogoSoftLightPreview(logoSoftLightValue);
        
        setLoginSettings({
          require_login: s['require_login'] !== 'false' && s['require_login'] !== false,
        });
        setWeeklyBenefits({
          meal_allowance_enabled: parseSystemBooleanFlag(s['meal_allowance_enabled'], true),
        });
        setPageBackgrounds(readAllPageBackgroundsFromSettings(s));
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
      toast({ title: 'خطأ في تحميل الإعدادات', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadCurrency = async () => {
    try {
      // Prefill from hook immediately
      if (currencyHook?.settings) {
        const s = currencyHook.settings;
        setCurrencyValues({
          currency_symbol: s['currency.symbol'] ?? 'ج.م',
          currency_name: s['currency.name'] ?? 'جنيه مصري',
          currency_code: s['currency.code'] ?? 'EGP',
          currency_position: s['currency.position'] ?? 'after',
          currency_decimals: s['currency.decimals'] ?? '0',
          currency_thousands_separator: s['currency.thousands_separator'] ?? ',',
          currency_decimal_separator: s['currency.decimal_separator'] ?? '.',
          currency_show_symbol: (s['currency.show_symbol'] ?? 'true') === 'true',
          currency_show_name: (s['currency.show_name'] ?? 'true') === 'true'
        });
      }
      const res = await fetch(getApiUrl('/api/load_system_settings.php'));
      const data = await res.json();
      if (data.success) {
        const s = data.settings;
        setCurrencyValues({
          currency_symbol: s['currency.symbol'] ?? 'ج.م',
          currency_name: s['currency.name'] ?? 'جنيه مصري',
          currency_code: s['currency.code'] ?? 'EGP',
          currency_position: s['currency.position'] ?? 'after',
          currency_decimals: s['currency.decimals'] ?? '0',
          currency_thousands_separator: s['currency.thousands_separator'] ?? ',',
          currency_decimal_separator: s['currency.decimal_separator'] ?? '.',
          currency_show_symbol: (s['currency.show_symbol'] ?? 'true') === 'true',
          currency_show_name: (s['currency.show_name'] ?? 'true') === 'true'
        });
      }
    } catch (e) {
      // ignore, we already set from hook
    }
  };

  useEffect(() => {
    loadSystemSettings();
    loadCurrency();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsToUpdate = [
        { key: 'system_name', value: identityValues.systemName },
        { key: 'company_name', value: identityValues.companyName },
        { key: 'require_login', value: loginSettings.require_login ? 'true' : 'false' },
        { key: 'meal_allowance_enabled', value: weeklyBenefits.meal_allowance_enabled ? '1' : '0' },
        { key: 'login_background_mode', value: pageBackgrounds.login.mode || 'cover' },
        { key: 'login_background_opacity', value: String(pageBackgrounds.login.opacity ?? 100) },
        { key: 'dashboard_background_mode', value: pageBackgrounds.dashboard.mode || 'cover' },
        { key: 'dashboard_background_opacity', value: String(pageBackgrounds.dashboard.opacity ?? 100) },
        { key: 'header_background_mode', value: pageBackgrounds.header.mode || 'cover' },
        { key: 'header_background_opacity', value: String(pageBackgrounds.header.opacity ?? 100) },
        { key: 'sidebar_background_mode', value: pageBackgrounds.sidebar.mode || 'cover' },
        { key: 'sidebar_background_opacity', value: String(pageBackgrounds.sidebar.opacity ?? 100) },
      ];

      const response = await fetch(getApiUrl('/api/update_system_settings.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_multiple_settings', settings: settingsToUpdate })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'save failed');

      const cv = currencyValues;
      const currencyPayload = {
        'currency.symbol': cv.currency_symbol,
        'currency.name': cv.currency_name,
        'currency.code': cv.currency_code,
        'currency.position': cv.currency_position,
        'currency.decimals': String(cv.currency_decimals ?? '0'),
        'currency.thousands_separator': cv.currency_thousands_separator,
        'currency.decimal_separator': cv.currency_decimal_separator,
        'currency.show_symbol': cv.currency_show_symbol ? 'true' : 'false',
        'currency.show_name': cv.currency_show_name ? 'true' : 'false'
      };
      const resCur = await fetch(getApiUrl('/api/update_system_settings.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_multiple_settings',
          settings: Object.entries(currencyPayload).map(([key, value]) => ({ key, value }))
        })
      });
      const dataCur = await resCur.json();
      if (!dataCur.success) throw new Error(dataCur.message || 'currency save failed');

      toast({ title: 'تم حفظ الإعدادات بنجاح', status: 'success' });
      await loadSystemSettings();
      await reloadSettings();
      updateSettings({
        mealAllowanceEnabled: weeklyBenefits.meal_allowance_enabled,
      });
      window.dispatchEvent(new CustomEvent('currencyUpdated'));
      window.dispatchEvent(new CustomEvent('pageBackgroundUpdated'));
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ title: 'خطأ في حفظ الإعدادات', status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const uploadPageBackground = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast({ title: 'اختر ملف صورة', status: 'warning' });
      return;
    }
    setIsUploadingPageBg(true);
    try {
      const formData = new FormData();
      formData.append('background', file);
      formData.append('target', pageBgTarget);
      const response = await fetch(getApiUrl('/api/upload_page_background.php'), { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success) {
        setPageBackgrounds((prev) => {
          const next = {
            ...prev,
            [pageBgTarget]: { ...prev[pageBgTarget], image: data.imageUrl },
          };
          window.dispatchEvent(new CustomEvent('pageBackgroundUpdated', { detail: { backgrounds: next } }));
          return next;
        });
        toast({ title: 'تم رفع صورة الخلفية بنجاح', status: 'success' });
      } else {
        toast({ title: data.message || 'فشل رفع الصورة', status: 'error' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'خطأ في رفع الصورة', status: 'error' });
    } finally {
      setIsUploadingPageBg(false);
    }
  };

  const removePageBackground = async () => {
    const imageKey = PAGE_BACKGROUND_TARGETS[pageBgTarget]?.keys?.image;
    if (!imageKey) return;
    try {
      const res = await fetch(getApiUrl('/api/delete_page_background.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: pageBgTarget }),
      });
      const data = await res.json();
      if (data.success) {
        setPageBackgrounds((prev) => {
          const next = {
            ...prev,
            [pageBgTarget]: { ...prev[pageBgTarget], image: '' },
          };
          window.dispatchEvent(new CustomEvent('pageBackgroundUpdated', { detail: { backgrounds: next } }));
          return next;
        });
        toast({ title: 'تم حذف صورة الخلفية', status: 'success' });
      } else {
        toast({ title: data.message || 'فشل حذف الصورة', status: 'error' });
      }
    } catch (e) {
      toast({ title: 'خطأ في حذف الصورة', status: 'error' });
    }
  };

  const saveLogo = async (file) => {
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const response = await fetch(getApiUrl('/api/upload_logo.php'), { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success) {
        setLogoPreview(data.logoUrl);
        await fetch(getApiUrl('/api/update_system_settings.php'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_multiple_settings', settings: [{ key: 'company_logo', value: data.logoUrl }] })
        });
        toast({ title: 'تم رفع الشعار بنجاح', status: 'success' });
      } else {
        toast({ title: 'خطأ في رفع الشعار', status: 'error' });
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({ title: 'خطأ في رفع الشعار', status: 'error' });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const saveLogoSoftLight = async (file) => {
    setIsUploadingLogoSoftLight(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('variable_key', 'company_logo_soft_light');
      const response = await fetch(getApiUrl('/api/upload_logo.php'), { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success) {
        setLogoSoftLightPreview(data.logoUrl);
        updateSettings({ companyLogoSoftLight: data.logoUrl });
        toast({ title: 'تم رفع شعار قالب الضوء الناعم بنجاح', status: 'success' });
      } else {
        toast({ title: 'خطأ في رفع الشعار', status: 'error' });
      }
    } catch (error) {
      console.error('Error uploading soft light logo:', error);
      toast({ title: 'خطأ في رفع الشعار', status: 'error' });
    } finally {
      setIsUploadingLogoSoftLight(false);
    }
  };

  const clearLogoSoftLight = () => {
    setLogoSoftLightPreview('');
    updateSettings({ companyLogoSoftLight: '' });
    fetch(getApiUrl('/api/update_system_settings.php'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_multiple_settings', settings: [{ key: 'company_logo_soft_light', value: '' }] })
    }).catch(() => {});
    toast({ title: 'تم إزالة شعار قالب الضوء الناعم', status: 'info' });
  };

  if (loading) {
    return <SettingsTabLoading message="جاري تحميل الإعدادات..." />;
  }

  const SaveButton = ({ size = 'md', w }) => (
    <Button
      onClick={handleSave}
      isLoading={saving}
      size={size}
      w={w}
      leftIcon={<Box as={SaveOutlined} />}
      className="stake-btn-primary tp-settings-save-btn"
      px={6}
    >
      {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
    </Button>
  );

  return (
    <Box className="tp-settings-tab" dir="rtl" lang="ar">
      <SettingsActionsBar
        hint={(
          <Text as="span">
            عدّل <strong>هوية الشركة</strong>، <strong>خلفيات الصفحات</strong>، أو <strong>العملة</strong> ثم احفظ التغييرات.
          </Text>
        )}
      >
        <SaveButton w={{ base: '100%', md: 'auto' }} />
      </SettingsActionsBar>

      <VStack align="stretch" spacing={6}>
        <Grid templateColumns={{ base: '1fr', xl: '1.1fr 0.9fr' }} gap={6} alignItems="stretch">
          {/* هوية الشركة */}
          <GridItem>
            <SectionCard
              accent="identity"
              icon={HomeOutlined}
              title="هوية الشركة"
              subtitle="اسم النظام والشركة والشعارات وإعدادات تسجيل الدخول"
              h="100%"
            >
              <VStack align="stretch" spacing={5}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <FormControl className="tp-settings-field-group">
                    <FormLabel>اسم النظام</FormLabel>
                    <Input
                      value={identityValues.systemName}
                      onChange={(e) => setIdentityValues(v => ({ ...v, systemName: e.target.value }))}
                      placeholder="مثال: TimePay"
                      {...inputFieldProps}
                    />
                  </FormControl>
                  <FormControl className="tp-settings-field-group">
                    <FormLabel>اسم الشركة</FormLabel>
                    <Input
                      value={identityValues.companyName}
                      onChange={(e) => setIdentityValues(v => ({ ...v, companyName: e.target.value }))}
                      placeholder="اسم الشركة الرسمي"
                      {...inputFieldProps}
                    />
                  </FormControl>
                </SimpleGrid>
                <Divider className="tp-settings-divider" />
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <LogoUploadZone
                    label="شعار الشركة"
                    hint="يُستخدم في القالب الداكن والشريط الجانبي."
                    preview={logoPreview}
                    uploading={isUploadingLogo}
                    onSelect={saveLogo}
                    onClear={() => setLogoPreview('')}
                    inputId="company-logo-upload"
                  />
                  <LogoUploadZone
                    label="شعار القالب الفاتح"
                    hint="للقالب الفاتح — ألوان مناسبة للخلفية البيضاء."
                    preview={logoSoftLightPreview}
                    uploading={isUploadingLogoSoftLight}
                    onSelect={saveLogoSoftLight}
                    onClear={clearLogoSoftLight}
                    inputId="company-logo-soft-upload"
                  />
                </SimpleGrid>

                <Divider className="tp-settings-divider" />

                <Box>
                  <HStack spacing={2} mb={3}>
                    <Box as={loginSettings.require_login ? LockOutlined : UnlockOutlined} color="var(--stake-text-secondary)" />
                    <Text fontWeight="semibold" fontSize="sm" color="var(--stake-text-primary)">
                      تسجيل الدخول
                    </Text>
                  </HStack>
                  <VStack align="stretch" spacing={4}>
                    <SettingToggleRow
                      label={loginSettings.require_login ? 'تسجيل الدخول مطلوب' : 'الدخول التلقائي مفعّل'}
                      description={
                        loginSettings.require_login
                          ? 'يجب إدخال اسم المستخدم وكلمة المرور للوصول للنظام'
                          : 'الدخول مباشرة بدون شاشة تسجيل الدخول'
                      }
                      isChecked={loginSettings.require_login}
                      onChange={(e) => setLoginSettings(v => ({ ...v, require_login: e.target.checked }))}
                      colorScheme="cyan"
                    />

                    {!loginSettings.require_login && (
                      <Box className="tp-settings-warning">
                        <Text className="tp-settings-warning__text">
                          تحذير: تعطيل تسجيل الدخول يسمح بالوصول بدون مصادقة. استخدمه فقط في بيئة آمنة ومغلقة.
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </Box>
              </VStack>
            </SectionCard>
          </GridItem>

          {/* خلفيات الصفحات */}
          <GridItem>
            <SectionCard
              accent="login"
              icon={PictureOutlined}
              title="خلفيات الصفحات"
              subtitle="خلفية الدخول، صفحات النظام، الهيدر، والشريط الجانبي — كل قسم بإعداداته المستقلة"
              h="100%"
            >
              <VStack align="stretch" spacing={5}>
                <FormControl className="tp-settings-field-group" maxW={{ base: '100%', md: '420px' }}>
                  <FormLabel fontWeight="semibold">الصفحة المراد تعديلها</FormLabel>
                  <Select
                    value={pageBgTarget}
                    onChange={(e) => setPageBgTarget(e.target.value)}
                    {...selectFieldProps}
                  >
                    {Object.entries(PAGE_BACKGROUND_TARGETS).map(([value, meta]) => (
                      <option key={value} value={value}>{meta.label}</option>
                    ))}
                  </Select>
                </FormControl>

                <Divider className="tp-settings-divider" />

                <FormControl className="tp-settings-field-group">
                  <FormLabel fontWeight="semibold">{activePageBgTargetMeta?.label}</FormLabel>
                  <Text fontSize="xs" color="var(--stake-text-secondary)" mb={3}>
                    JPG, PNG, GIF, WebP — حتى 5 ميجابايت
                  </Text>
                  {activePageBgUrl ? (
                    <VStack align="stretch" spacing={3}>
                  <Box className="tp-settings-login-preview">
                    <CImage
                      src={activePageBgUrl}
                      alt={activePageBgTargetMeta?.label}
                      w="100%"
                      h="140px"
                      objectFit="cover"
                      opacity={(activePageBg.opacity ?? 100) / 100}
                    />
                  </Box>
                      <HStack flexWrap="wrap">
                        <Button
                          isLoading={isUploadingPageBg}
                          size="sm"
                          leftIcon={<Box as={UploadOutlined} />}
                          className="stake-btn-primary"
                          borderRadius="lg"
                          onClick={() => document.getElementById(pageBgFileInputId)?.click()}
                        >
                          استبدال الصورة
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          borderColor="var(--stake-border-primary)"
                          color="var(--stake-text-primary)"
                          leftIcon={<Box as={DeleteOutlined} />}
                          borderRadius="lg"
                          onClick={removePageBackground}
                        >
                          حذف الصورة
                        </Button>
                      </HStack>
                    </VStack>
                  ) : (
                    <Button
                      isLoading={isUploadingPageBg}
                      size="sm"
                      w="fit-content"
                      leftIcon={<Box as={UploadOutlined} />}
                      className="stake-btn-primary"
                      borderRadius="lg"
                      onClick={() => document.getElementById(pageBgFileInputId)?.click()}
                    >
                      رفع صورة خلفية
                    </Button>
                  )}
                  <input
                    id={pageBgFileInputId}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadPageBackground(f);
                      e.target.value = '';
                    }}
                  />
                </FormControl>

                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                  <FormControl className="tp-settings-field-group">
                    <FormLabel>نمط عرض الخلفية</FormLabel>
                    <Select
                      value={activePageBg.mode || 'cover'}
                      onChange={(e) => updateActivePageBg({ mode: e.target.value })}
                      {...selectFieldProps}
                    >
                      {Object.entries(BG_MODE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl className="tp-settings-field-group">
                    <FormLabel>
                      الشفافية — {(activePageBg.opacity ?? 100)}%
                    </FormLabel>
                    <Slider
                      aria-label="شفافية الخلفية"
                      value={Number(activePageBg.opacity ?? 100)}
                      min={0}
                      max={100}
                      step={5}
                      onChange={(v) => updateActivePageBg({ opacity: v })}
                      colorScheme="cyan"
                      mt={2}
                    >
                      <SliderTrack bg="var(--stake-border-primary)">
                        <SliderFilledTrack bg="#0ea5e9" />
                      </SliderTrack>
                      <SliderThumb boxSize={4} />
                    </Slider>
                  </FormControl>
                </SimpleGrid>
                <Text fontSize="xs" color="var(--stake-text-secondary)">
                  التغييرات على النمط والشفافية تظهر مباشرة في المعاينة — اضغط «حفظ الإعدادات» لحفظها نهائياً.
                </Text>
              </VStack>
            </SectionCard>
          </GridItem>
        </Grid>

        {/* العملة */}
        <SectionCard
          accent="currency"
          icon={DollarOutlined}
          title="إعدادات العملة"
          subtitle="تنسيق المبالغ والرموز في الجداول والتقارير"
        >
          <Grid templateColumns={{ base: '1fr', lg: '1fr 280px' }} gap={6} alignItems="start">
            <GridItem>
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4} mb={4}>
                <FormControl className="tp-settings-field-group">
                  <FormLabel>رمز العملة</FormLabel>
                  <Input value={currencyValues.currency_symbol} onChange={(e) => setCurrencyValues(v => ({ ...v, currency_symbol: e.target.value }))} {...inputFieldProps} />
                </FormControl>
                <FormControl className="tp-settings-field-group">
                  <FormLabel>اسم العملة</FormLabel>
                  <Input value={currencyValues.currency_name} onChange={(e) => setCurrencyValues(v => ({ ...v, currency_name: e.target.value }))} {...inputFieldProps} />
                </FormControl>
                <FormControl className="tp-settings-field-group">
                  <FormLabel>كود العملة</FormLabel>
                  <Input value={currencyValues.currency_code} onChange={(e) => setCurrencyValues(v => ({ ...v, currency_code: e.target.value }))} {...inputFieldProps} />
                </FormControl>
                <FormControl className="tp-settings-field-group">
                  <FormLabel>عدد الكسور العشرية</FormLabel>
                  <Select value={currencyValues.currency_decimals} onChange={(e) => setCurrencyValues(v => ({ ...v, currency_decimals: e.target.value }))} {...selectFieldProps}>
                    <option value="0">0</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </Select>
                </FormControl>
                <FormControl className="tp-settings-field-group">
                  <FormLabel>موضع العرض</FormLabel>
                  <Select value={currencyValues.currency_position} onChange={(e) => setCurrencyValues(v => ({ ...v, currency_position: e.target.value }))} {...selectFieldProps}>
                    <option value="before">قبل الرقم</option>
                    <option value="after">بعد الرقم</option>
                  </Select>
                </FormControl>
                <FormControl className="tp-settings-field-group">
                  <FormLabel>فاصل الآلاف</FormLabel>
                  <Select value={currencyValues.currency_thousands_separator} onChange={(e) => setCurrencyValues(v => ({ ...v, currency_thousands_separator: e.target.value }))} {...selectFieldProps}>
                    <option value=",">، (فاصلة)</option>
                    <option value=" ">مسافة</option>
                    <option value=".">نقطة</option>
                  </Select>
                </FormControl>
                <FormControl className="tp-settings-field-group">
                  <FormLabel>الفاصل العشري</FormLabel>
                  <Select value={currencyValues.currency_decimal_separator} onChange={(e) => setCurrencyValues(v => ({ ...v, currency_decimal_separator: e.target.value }))} {...selectFieldProps}>
                    <option value=".">نقطة</option>
                    <option value=",">فاصلة</option>
                  </Select>
                </FormControl>
              </SimpleGrid>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <SettingToggleRow
                  label="عرض رمز العملة"
                  description="إظهار الرمز (مثل ج.م) بجانب المبالغ"
                  isChecked={currencyValues.currency_show_symbol}
                  onChange={(e) => setCurrencyValues(v => ({ ...v, currency_show_symbol: e.target.checked }))}
                  colorScheme="green"
                />
                <SettingToggleRow
                  label="عرض اسم العملة"
                  description="إظهار الاسم الكامل للعملة في بعض الشاشات"
                  isChecked={currencyValues.currency_show_name}
                  onChange={(e) => setCurrencyValues(v => ({ ...v, currency_show_name: e.target.checked }))}
                  colorScheme="green"
                />
              </SimpleGrid>
            </GridItem>

            <GridItem>
              <Box className="tp-settings-currency-preview">
                <Text className="tp-settings-currency-preview__label">معاينة مباشرة</Text>
                <Text className="tp-settings-currency-preview__value" dir="ltr">
                  {getCurrencyPreview()}
                </Text>
                <Divider className="tp-settings-divider" mb={3} />
                <VStack align="stretch" spacing={2} className="tp-settings-currency-preview__meta">
                  <Flex justify="space-between"><Text>مثال خام</Text><Text dir="ltr">12,500.50</Text></Flex>
                  <Flex justify="space-between"><Text>الكود</Text><Badge colorScheme="green" variant="subtle">{currencyValues.currency_code}</Badge></Flex>
                </VStack>
              </Box>
            </GridItem>
          </Grid>
        </SectionCard>

        {/* بدلات ومكافآت أسبوعية */}
        <SectionCard
          accent="benefits"
          icon={GiftOutlined}
          title="بدلات ومكافآت أسبوعية"
          subtitle="تفعيل أو تعطيل مكوّنات الأجر الأسبوعي على مستوى النظام — يمكن إضافة المزيد لاحقاً"
        >
          <VStack align="stretch" spacing={4}>
            <SettingToggleRow
              label={weeklyBenefits.meal_allowance_enabled ? 'بدل الوجبة والانتظام مفعّل' : 'بدل الوجبة والانتظام معطّل'}
              description={
                weeklyBenefits.meal_allowance_enabled
                  ? 'يُحسب أجر الانتظام ويظهر عمود الوجبة في الحضور والراتب الأسبوعي وورقة الصرف'
                  : 'لن يُحسب أجر الانتظام ولن يظهر عمود الوجبة في الحضور أو الراتب الأسبوعي أو الطباعة'
              }
              isChecked={weeklyBenefits.meal_allowance_enabled}
              onChange={(e) => setWeeklyBenefits((v) => ({ ...v, meal_allowance_enabled: e.target.checked }))}
              colorScheme="cyan"
            />
            <Text fontSize="xs" color="var(--stake-text-secondary)">
              قيمة بدل الوجبة اليومية تُضبط من «متغيرات النظام». يمكن لاحقاً إضافة خيارات مثل المواصلات أو التأمين في هذا القسم.
            </Text>
          </VStack>
        </SectionCard>
      </VStack>
    </Box>
  );
};

export default NewGeneralSettings;
import React, { useEffect, useRef, useState } from 'react';
import { getApiUrl } from '../utils/apiUrlHelper';
import { applySystemFont, applyTableFont, resolveFontFamilyCss } from '../utils/fontFamilyHelper';
import {
  Box,
  Text,
  VStack,
  HStack,
  Grid,
  GridItem,
  SimpleGrid,
  FormControl,
  FormLabel,
  Input,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Switch as CSwitch,
  Button,
  useToast,
  Divider,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Tooltip,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Flex,
  Badge,
} from '@chakra-ui/react';
import { SaveOutlined, FontSizeOutlined, BgColorsOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useSettings } from '../contexts/SettingsContext';
import { FiCheck, FiPlay } from 'react-icons/fi';
import {
  SettingsActionsBar,
  SectionCard,
  SettingToggleRow,
  SettingsTabLoading,
} from './settings/SettingsTabUi';

/** معرّفات القالب المدعومة فقط (وضع داكن / وضع فاتح) */
const ALLOWED_THEME_IDS = ['dark-ocean', 'minimal-bright'];

/** تحويل قيم قديمة من قاعدة البيانات إلى أحد القالبين */
function normalizeColorThemeId(raw) {
  if (raw == null || String(raw).trim() === '') return 'dark-ocean';
  const id = String(raw).split('?')[0].trim();
  if (ALLOWED_THEME_IDS.includes(id)) return id;
  if (id === 'soft-light') return 'minimal-bright';
  return 'dark-ocean';
}

const THEME = {
  cardBg: 'var(--stake-bg-card, #0f212e)',
  cardBorder: 'var(--stake-border-primary, #3e5665)',
  headerBg: 'var(--stake-bg-secondary, #102a3a)',
  headerText: 'var(--stake-text-primary, #ffffff)',
  subText: 'var(--stake-text-secondary, #a0aec0)',
  inputBg: 'var(--stake-bg-card, #0f212e)',
  inputText: 'var(--stake-text-primary, #e2e8f0)',
  inputBorder: 'var(--stake-border-primary, #3e5665)',
  bodyBg: 'var(--stake-bg-secondary, #1b2b38)',
  panelBg: 'var(--stake-bg-card, #0b1a24)',
};

const ThemeModeCard = ({ theme, isSelected, onSelect, onApply }) => {
  const c = theme.colors;
  const isLight = theme.id === 'minimal-bright';

  const statCards = [
    { label: 'حاضر', value: '24', tone: c.success },
    { label: 'غائب', value: '3', tone: c.error },
    { label: 'تأخير', value: '2', tone: c.warning },
  ];

  return (
    <Box
      role="button"
      tabIndex={0}
      position="relative"
      borderRadius="2xl"
      overflow="hidden"
      border="2px solid"
      borderColor={isSelected ? c.accent : THEME.cardBorder}
      bg={THEME.panelBg}
      cursor="pointer"
      transition="all 0.28s ease"
      boxShadow={
        isSelected
          ? `0 0 0 1px ${c.accent}, 0 12px 32px ${isLight ? 'rgba(15,23,42,0.12)' : 'rgba(0,0,0,0.35)'}`
          : 'none'
      }
      _hover={{
        transform: 'translateY(-4px)',
        borderColor: c.accent,
        boxShadow: `0 8px 28px ${isLight ? 'rgba(15,23,42,0.1)' : 'rgba(0,0,0,0.3)'}`,
      }}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {isSelected && (
        <Box
          position="absolute"
          top={3}
          left={3}
          zIndex={2}
          bg={c.accent}
          color="white"
          fontSize="10px"
          fontWeight="bold"
          px={2.5}
          py={0.5}
          borderRadius="full"
          display="flex"
          alignItems="center"
          gap={1}
          boxShadow="0 2px 8px rgba(0,0,0,0.2)"
        >
          <Icon as={FiCheck} boxSize={3} />
          مُفعّل
        </Box>
      )}

      <Flex
        align="center"
        justify="space-between"
        px={3}
        py={2}
        bg={c.bgSecondary}
        borderBottom="1px solid"
        borderColor={c.borderPrimary}
      >
        <HStack spacing={1.5}>
          <Box w="8px" h="8px" borderRadius="full" bg={c.error} opacity={0.85} />
          <Box w="8px" h="8px" borderRadius="full" bg={c.warning} opacity={0.85} />
          <Box w="8px" h="8px" borderRadius="full" bg={c.success} opacity={0.85} />
        </HStack>
        <Text fontSize="9px" color={c.textSecondary} fontWeight="medium">
          TimePay — معاينة
        </Text>
        <Box w="14px" h="14px" borderRadius="md" bg={c.accent} opacity={0.9} />
      </Flex>

      <Flex minH="200px" bg={c.bgPrimary}>
        <VStack
          w="52px"
          py={3}
          spacing={2}
          bg={c.bgSecondary}
          borderLeft="1px solid"
          borderColor={c.borderPrimary}
          flexShrink={0}
        >
          <Box w="28px" h="28px" borderRadius="lg" bg={c.accent} opacity={0.95} />
          {[1, 2, 3, 4].map((i) => (
            <Box
              key={i}
              w="28px"
              h="6px"
              borderRadius="full"
              bg={i === 1 ? `${c.accent}55` : c.borderPrimary}
            />
          ))}
        </VStack>

        <Box flex={1} p={3}>
          <Flex justify="space-between" align="center" mb={2.5}>
            <VStack align="start" spacing={0}>
              <Text fontSize="11px" fontWeight="bold" color={c.textPrimary}>
                لوحة التحكم
              </Text>
              <Text fontSize="8px" color={c.textSecondary}>
                {theme.description}
              </Text>
            </VStack>
            <HStack spacing={1}>
              <Box px={2} py={0.5} borderRadius="md" bg={c.accent}>
                <Text fontSize="7px" color="white" fontWeight="bold">
                  حفظ
                </Text>
              </Box>
              <Box px={2} py={0.5} borderRadius="md" border="1px solid" borderColor={c.borderPrimary}>
                <Text fontSize="7px" color={c.textSecondary}>
                  تصدير
                </Text>
              </Box>
            </HStack>
          </Flex>

          <SimpleGrid columns={3} spacing={1.5} mb={2.5}>
            {statCards.map((s) => (
              <Box
                key={s.label}
                bg={c.bgCard}
                borderRadius="lg"
                p={2}
                border="1px solid"
                borderColor={c.borderPrimary}
                boxShadow={isLight ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'}
              >
                <Text fontSize="7px" color={c.textSecondary} mb={0.5}>
                  {s.label}
                </Text>
                <Text fontSize="13px" fontWeight="bold" color={c.textPrimary} lineHeight="1">
                  {s.value}
                </Text>
                <Box mt={1} h="2px" borderRadius="full" bg={`${s.tone}80`} w="70%" />
              </Box>
            ))}
          </SimpleGrid>

          <Box
            bg={c.bgCard}
            borderRadius="lg"
            border="1px solid"
            borderColor={c.borderPrimary}
            overflow="hidden"
            boxShadow={isLight ? '0 1px 4px rgba(0,0,0,0.05)' : 'none'}
          >
            <Flex
              px={2}
              py={1}
              bg={isLight ? c.bgSecondary : `${c.bgSecondary}cc`}
              borderBottom="1px solid"
              borderColor={c.borderPrimary}
            >
              {['الموظف', 'الحالة', 'المبلغ'].map((col) => (
                <Text key={col} flex={1} fontSize="7px" fontWeight="bold" color={c.textSecondary} textAlign="center">
                  {col}
                </Text>
              ))}
            </Flex>
            {[0, 1, 2].map((row) => (
              <Flex
                key={row}
                px={2}
                py={1.5}
                borderBottom={row < 2 ? '1px solid' : 'none'}
                borderColor={c.borderPrimary}
                bg={row % 2 === 1 && isLight ? `${c.bgSecondary}80` : 'transparent'}
              >
                <Box flex={1} h="4px" borderRadius="full" bg={c.borderPrimary} mx={1} mt={1} />
                <Flex flex={1} justify="center">
                  <Box
                    w="20px"
                    h="10px"
                    borderRadius="full"
                    bg={row === 0 ? `${c.success}40` : row === 1 ? `${c.warning}40` : `${c.error}40`}
                  />
                </Flex>
                <Box flex={1} h="4px" borderRadius="full" bg={`${c.accent}50`} mx={1} mt={1} />
              </Flex>
            ))}
          </Box>
        </Box>
      </Flex>

      <Box p={4} borderTop="1px solid" borderColor={THEME.cardBorder} bg={THEME.bodyBg}>
        <Flex justify="space-between" align="flex-start" gap={3} mb={3}>
          <HStack align="start" spacing={3}>
            <Flex
              w="44px"
              h="44px"
              borderRadius="xl"
              align="center"
              justify="center"
              fontSize="xl"
              bg={`${c.accent}22`}
              border="1px solid"
              borderColor={`${c.accent}44`}
              flexShrink={0}
            >
              {theme.icon}
            </Flex>
            <VStack align="start" spacing={0.5}>
              <Text color={THEME.inputText} fontWeight="bold" fontSize="md">
                {theme.nameAr}
              </Text>
              <Text color={THEME.subText} fontSize="xs">
                {theme.name}
              </Text>
            </VStack>
          </HStack>
          {isSelected && (
            <Box
              w="22px"
              h="22px"
              borderRadius="full"
              bg={c.accent}
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
            >
              <Icon as={FiCheck} color="white" boxSize={3.5} />
            </Box>
          )}
        </Flex>

        <HStack spacing={2} mb={3} flexWrap="wrap">
          {[
            { key: 'accent', label: 'أساسي' },
            { key: 'bgPrimary', label: 'خلفية' },
            { key: 'success', label: 'نجاح' },
            { key: 'textPrimary', label: 'نص' },
          ].map(({ key, label }) => (
            <HStack
              key={key}
              spacing={1}
              px={2}
              py={1}
              borderRadius="full"
              border="1px solid"
              borderColor={THEME.cardBorder}
              bg={THEME.panelBg}
            >
              <Box w="12px" h="12px" borderRadius="full" bg={c[key]} border="1px solid" borderColor={c.borderPrimary} />
              <Text fontSize="10px" color={THEME.subText}>
                {label}
              </Text>
            </HStack>
          ))}
        </HStack>

        <Button
          size="sm"
          w="100%"
          leftIcon={<Icon as={FiPlay} />}
          bg={isSelected ? c.accent : THEME.inputBg}
          color={isSelected ? 'white' : THEME.inputText}
          border="1px solid"
          borderColor={isSelected ? c.accent : THEME.inputBorder}
          _hover={{ bg: c.accent, color: 'white', borderColor: c.accent }}
          onClick={(e) => {
            e.stopPropagation();
            onApply();
          }}
        >
          {isSelected ? 'تطبيق الوضع الحالي' : 'تطبيق هذا الوضع'}
        </Button>
      </Box>
    </Box>
  );
};

const FontPickerField = ({ label, hint, value, onClick, previewStyle, previewLines }) => (
  <Box p={4} borderRadius="xl" border="1px solid" borderColor={THEME.cardBorder} bg={THEME.panelBg} h="100%">
    <Text fontWeight="semibold" color={THEME.inputText} fontSize="sm" mb={1}>{label}</Text>
    {hint && <Text fontSize="xs" color={THEME.subText} mb={3}>{hint}</Text>}
    <Button
      w="100%"
      onClick={onClick}
      bg={THEME.inputBg}
      color={THEME.inputText}
      border="1px solid"
      borderColor={THEME.inputBorder}
      borderRadius="lg"
      _hover={{ bg: 'var(--stake-bg-hover)' }}
      mb={3}
    >
      <HStack w="100%" justify="space-between">
        <Text>{value}</Text>
        <Text fontSize="xs" color={THEME.subText}>تغيير</Text>
      </HStack>
    </Button>
    <Box
      p={4}
      borderRadius="xl"
      border="1px solid"
      borderColor={THEME.cardBorder}
      bg={THEME.cardBg}
      textAlign="center"
      style={previewStyle}
    >
      {previewLines.map((line, i) => (
        <Text key={i} color={i === 0 ? THEME.inputText : THEME.subText} fontSize={i === 0 ? 'md' : 'sm'}>
          {line}
        </Text>
      ))}
    </Box>
  </Box>
);

const pickSettingValue = (map, key) => {
  const v = map?.[key];
  if (v == null) return null;
  const trimmed = String(v).trim();
  return trimmed === '' ? null : trimmed;
};

const NewAppearanceSettings = () => {
  const toast = useToast();
  const { updateSettings, reloadSettings, settings: globalSettings } = useSettings();
  const persistedFontRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [tempSettings, setTempSettings] = useState({});
  const cardBg = THEME.cardBg;
  const cardBorder = THEME.cardBorder;
  const headerBg = THEME.headerBg;
  const headerText = THEME.headerText;
  const subText = THEME.subText;
  const inputBg = THEME.inputBg;
  const inputText = THEME.inputText;
  const inputBorder = THEME.inputBorder;

  const [isSystemFontModalOpen, setIsSystemFontModalOpen] = useState(false);
  const [isTableFontModalOpen, setIsTableFontModalOpen] = useState(false);

  const arabicFonts = [
    { value: 'Cairo', label: 'Cairo', preview: 'نظام إدارة الرواتب' },
    { value: 'Tajawal', label: 'Tajawal', preview: 'نظام إدارة الرواتب' },
    { value: 'Amiri', label: 'Amiri', preview: 'نظام إدارة الرواتب' },
    { value: 'Noto Sans Arabic', label: 'Noto Sans Arabic', preview: 'نظام إدارة الرواتب' },
    { value: 'Changa', label: 'Changa', preview: 'نظام إدارة الرواتب' },
    { value: 'Lateef', label: 'Lateef', preview: 'نظام إدارة الرواتب' },
    { value: 'Scheherazade New', label: 'Scheherazade New', preview: 'نظام إدارة الرواتب' },
    { value: 'Markazi Text', label: 'Markazi Text', preview: 'نظام إدارة الرواتب' },
    { value: 'Harmattan', label: 'Harmattan', preview: 'نظام إدارة الرواتب' },
    { value: 'Lalezar', label: 'Lalezar', preview: 'نظام إدارة الرواتب' },
    { value: 'Mada', label: 'Mada', preview: 'نظام إدارة الرواتب' },
    { value: 'Mirza', label: 'Mirza', preview: 'نظام إدارة الرواتب' },
    { value: 'Rasa', label: 'Rasa', preview: 'نظام إدارة الرواتب' },
    { value: 'Aref Ruqaa', label: 'Aref Ruqaa', preview: 'نظام إدارة الرواتب' },
    { value: 'Kufam', label: 'Kufam' },
    { value: 'Lemonada', label: 'Lemonada' },
    { value: 'Baloo Bhaijaan 2', label: 'Baloo Bhaijaan 2' },
    { value: 'Readex Pro', label: 'Readex Pro' },
    { value: 'IBM Plex Sans Arabic', label: 'IBM Plex Sans Arabic' }
  ];

  // وضعا العرض فقط: داكن (محيط داكن) / فاتح (مادة بسيطة)
  const colorThemes = [
    {
      id: 'dark-ocean',
      name: 'Dark Mode',
      nameAr: 'الوضع الداكن',
      icon: '🌙',
      description: 'واجهة داكنة بألوان زرقاء هادئة',
      colors: {
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
        tableHeaderBg: '#111827',
        tableHeaderText: '#f1f5f9'
      }
    },
    {
      id: 'minimal-bright',
      name: 'Light Mode',
      nameAr: 'الوضع الفاتح',
      icon: '☀️',
      description: 'واجهة فاتحة وبسيطة مع تباين واضح',
      colors: {
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
        modalHeaderStart: '#ffffff',
        modalHeaderEnd: '#f1f3fb',
        cardGradientStart: '#ffffff',
        cardGradientEnd: '#f6f7fc',
        gradientData: {
          sidebarBg: { color1: '#ffffff', color2: '#eef0fa', direction: '180deg' },
          headerBg: { color1: '#ffffff', color2: '#f1f3fb', direction: '180deg' },
          bgPrimary: { color1: '#f3f4f9', color2: '#eaedf7', direction: '180deg' }
        }
      }
    }
  ];

  const [selectedTheme, setSelectedTheme] = useState('dark-ocean');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [allThemes, setAllThemes] = useState([]); // جميع القوالب من قاعدة البيانات

  /** قائمة العرض ثابتة: قالبان مدمجان فقط (بدون قوالب مخصصة من قاعدة البيانات) */
  const loadAllThemes = async () => {
    setAllThemes(colorThemes);
    return colorThemes;
  };

  const fetchGlobalFontSettings = async () => {
    try {
      const response = await fetch(getApiUrl('/api/load_system_settings.php'));
      const data = await response.json();
      if (!data.success || !data.settings) return {};
      return {
        fontFamily: pickSettingValue(data.settings, 'font_family'),
        tableFontFamily: pickSettingValue(data.settings, 'table_font_family'),
      };
    } catch {
      return {};
    }
  };

  const buildLoadedAppearanceState = (appearanceMap, globalFallback) => {
    const fontFamily =
      pickSettingValue(appearanceMap, 'font_family') ||
      globalFallback.fontFamily ||
      globalSettings?.fontFamily ||
      'Cairo';
    const tableFontFamily =
      pickSettingValue(appearanceMap, 'table_font_family') ||
      globalFallback.tableFontFamily ||
      fontFamily;
    return {
      fontFamily,
      tableFontFamily,
      tableFontSize: parseInt(appearanceMap.table_font_size, 10) || 14,
      tableFontWeight: parseInt(appearanceMap.table_font_weight, 10) || 600,
      showEnglishKeys:
        appearanceMap.show_english_keys === 'true' || appearanceMap.show_english_keys === '1',
    };
  };

  const applyAppearanceFonts = (loaded) => {
    if (!loaded?.fontFamily) return;
    persistedFontRef.current = loaded.fontFamily;
    applyFont(loaded.fontFamily);
    applyTableSettings(loaded);
  };

  const loadAppearanceSettings = async () => {
    let globalFontFallback = {};
    try {
      setLoading(true);
      
      // تحميل جميع القوالب من قاعدة البيانات أولاً
      await loadAllThemes();
      
      globalFontFallback = await fetchGlobalFontSettings();
      const response = await fetch(getApiUrl('/api/comprehensive_settings_api.php?action=get_settings_by_category&category=appearance'));
      const data = await response.json();
      if (data.success) {
        const s = {};
        data.settings.forEach(setting => { s[setting.setting_key] = setting.setting_value; });
        const loaded = buildLoadedAppearanceState(s, globalFontFallback);
        setTempSettings(loaded);
        applyAppearanceFonts(loaded);
        
        // تحميل القالب المحفوظ وتطبيقه مباشرة (مع توحيد المعرفات القديمة)
        const rawSavedTheme = s.color_theme;
        if (rawSavedTheme != null && String(rawSavedTheme).trim() !== '') {
          const themeToApply = normalizeColorThemeId(rawSavedTheme);
          setSelectedTheme(themeToApply);
          const cacheBuster = `?t=${Date.now()}`;
          await applyColorTheme(themeToApply + cacheBuster);
          await new Promise(resolve => setTimeout(resolve, 100));
          await applyColorTheme(themeToApply);
          try {
            localStorage.setItem('timepay_color_theme_v1', themeToApply);
          } catch (e) { /* ignore */ }
          if (themeToApply !== String(rawSavedTheme).split('?')[0].trim()) {
            persistColorThemeToDatabase(themeToApply).catch(() => {});
          }
        } else {
          let fallback = 'dark-ocean';
          try {
            const ls = localStorage.getItem('timepay_color_theme_v1');
            if (ls && String(ls).trim() !== '') fallback = normalizeColorThemeId(ls);
          } catch (e) { /* ignore */ }
          setSelectedTheme(fallback);
          await applyColorTheme(fallback);
        }
        applyAppearanceFonts(loaded);
        setIsInitialLoad(false);
      } else {
        const loaded = buildLoadedAppearanceState({}, globalFontFallback);
        setTempSettings(loaded);
        applyAppearanceFonts(loaded);
        const defaultTheme = 'dark-ocean';
        setSelectedTheme(defaultTheme);
        await applyColorTheme(defaultTheme);
        applyAppearanceFonts(loaded);
        setIsInitialLoad(false);
      }
    } catch (e) {
      console.error(e);
      const loaded = buildLoadedAppearanceState({}, {
        fontFamily: globalFontFallback.fontFamily || globalSettings?.fontFamily,
        tableFontFamily: globalFontFallback.tableFontFamily,
      });
      if (loaded.fontFamily) {
        setTempSettings(loaded);
        applyAppearanceFonts(loaded);
      }
      setIsInitialLoad(false);
    } finally {
      setLoading(false);
    }
  };

  // تطبيق قالب الألوان
  const applyColorTheme = async (themeId) => {
    const cleanThemeId = normalizeColorThemeId(themeId.split('?')[0]);
    document.body.setAttribute('data-color-theme', cleanThemeId);

    const defaultTheme = colorThemes.find(t => t.id === cleanThemeId);
    if (!defaultTheme) return;
    const colors = { ...(defaultTheme.colors || {}) };

    const root = document.documentElement;

    const isLightTheme = cleanThemeId === 'minimal-bright';
    
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

    // تطبيق الألوان على متغيرات CSS الأساسية
    root.style.setProperty('--stake-bg-primary', colors.bgPrimary);
    root.style.setProperty('--stake-bg-secondary', colors.bgSecondary);
    root.style.setProperty('--stake-bg-card', colors.bgCard);
    root.style.setProperty('--stake-bg-tertiary', colors.bgSecondary);
    root.style.setProperty('--stake-bg-hover', colors.bgHover || colors.bgCard);
    root.style.setProperty('--stake-border-primary', colors.borderPrimary);
    root.style.setProperty('--stake-border-secondary', colors.borderSecondary || colors.borderPrimary);
    root.style.setProperty('--stake-text-primary', colors.textPrimary);
    root.style.setProperty('--stake-text-secondary', colors.textSecondary);
    root.style.setProperty('--stake-text-muted', colors.textSecondary);
    root.style.setProperty('--stake-primary', colors.accent);
    root.style.setProperty('--stake-success', colors.success);
    root.style.setProperty('--stake-error', colors.error);
    root.style.setProperty('--stake-warning', colors.warning);

    root.style.setProperty('--stake-table-bg', colors.tableBg || colors.bgCard);
    const tableHdrBgSync =
      colors.tableHeaderBg || colors.tableHeaderStart || colors.bgSecondary;
    const tableHdrTextSync = colors.tableHeaderText || colors.textPrimary;
    root.style.setProperty('--stake-table-header-bg', tableHdrBgSync);
    root.style.setProperty('--stake-table-header-text', tableHdrTextSync);
    
    // تطبيق لون النص على body
    document.body.style.color = colors.textPrimary;
    
    // متغيرات إضافية للتوافق
    root.style.setProperty('--color-grey-700', colors.bgPrimary);
    root.style.setProperty('--color-grey-600', colors.bgSecondary);
    root.style.setProperty('--color-grey-500', colors.bgCard);
    root.style.setProperty('--color-grey-400', colors.borderPrimary);
    root.style.setProperty('--color-grey-300', colors.borderPrimary);
    root.style.setProperty('--color-grey-200', colors.textSecondary);
    root.style.setProperty('--color-grey-100', colors.textPrimary);
    root.style.setProperty('--color-white', colors.textPrimary);
    root.style.setProperty('--color-blue-500', colors.accent);

    // تطبيق الخلفية على body و html
    document.body.style.background = colors.bgPrimary;
    document.body.style.backgroundColor = colors.bgPrimary;
    root.style.background = colors.bgPrimary;
    
    // تطبيق الألوان على الـ root element
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.style.background = colors.bgPrimary;
    }

    // اتجاه التدرج المحفوظ للشريط والرأس (من gradientData إن وُجد)
    const sidebarGradientDir = colors.gradientData?.sidebarBg?.direction || '90deg';
    const headerGradientDir = colors.gradientData?.headerBg?.direction || '358deg';
    // شفافية الشريط الجانبي والأفقي — نحسبها قبل أي استخدام
    const sidebarStart = colors.sidebarBgStart || colors.bgPrimary;
    const sidebarEnd = colors.sidebarBgEnd || colors.bgSecondary;
    const hexToRgba = (hex, alpha) => {
      if (!hex || typeof hex !== 'string') return hex;
      const s = String(hex).trim();
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
      : colors.bgPrimary;
    const headerBgEnd = (colors.gradientData?.headerBg?.color1 != null && colors.gradientData?.headerBg?.color2 != null)
      ? colors.gradientData.headerBg.color2
      : colors.bgSecondary;
    const headerStartFinal = headerOpacity < 1 ? hexToRgba(headerBgStart, headerOpacity) : headerBgStart;
    const headerEndFinal = headerOpacity < 1 ? hexToRgba(headerBgEnd, headerOpacity) : headerBgEnd;

    // تطبيق الألوان على Sidebar (مع اتجاه التدرج المحفوظ)
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

    // تطبيق الألوان على Header (مع اتجاه التدرج المحفوظ)
    const headers = document.querySelectorAll('.stake-header');
    headers.forEach(header => {
      if (header.classList.contains('tp-zone-has-custom-bg')) {
        header.style.removeProperty('background');
        header.style.removeProperty('background-image');
        header.style.removeProperty('background-color');
        return;
      }
      header.style.background = `linear-gradient(${headerGradientDir}, ${headerStartFinal} 0%, ${headerEndFinal} 100%)`;
      header.style.borderColor = colors.borderPrimary;
    });

    // تطبيق الألوان على البطاقات
    const cards = document.querySelectorAll('.chakra-card, .stake-card');
    cards.forEach(card => {
      // إذا كان bgCard هو gradient string، استخدمه مباشرة
      if (typeof colors.bgCard === 'string' && colors.bgCard.includes('linear-gradient')) {
        card.style.background = colors.bgCard;
        card.style.backgroundImage = colors.bgCard;
      } else {
        card.style.background = colors.bgCard;
      }
      card.style.borderColor = colors.borderPrimary;
    });

    // تطبيق على الصفحة الرئيسية
    const mainContent = document.querySelectorAll('.stake-main-content, [class*="chakra-box"]');
    mainContent.forEach(el => {
      if (el.style && el.style.minHeight === '85vh') {
        el.style.background = colors.bgPrimary;
      }
    });

    // إضافة CSS ديناميكي للتأكد من تطبيق الألوان
    // إزالة style tag القديم إذا كان موجوداً
    let oldStyleEl = document.getElementById('dynamic-theme-styles');
    if (oldStyleEl) {
      oldStyleEl.remove();
    }
    
    let styleEl = document.createElement('style');
    styleEl.id = 'dynamic-theme-styles';
    // إضافة في نهاية head لضمان أولوية أعلى
    document.head.appendChild(styleEl);
    
    const modalHeadStart = colors.modalHeaderStart || colors.bgSecondary;
    const modalHeadEnd = colors.modalHeaderEnd || colors.bgSecondary;
    const pageGradient = colors.gradientData?.bgPrimary
      ? `linear-gradient(${colors.gradientData.bgPrimary.direction || '180deg'}, ${colors.gradientData.bgPrimary.color1} 0%, ${colors.gradientData.bgPrimary.color2} 100%)`
      : colors.bgPrimary;
    const cardGradient = colors.cardGradientStart && colors.cardGradientEnd
      ? `linear-gradient(180deg, ${colors.cardGradientStart} 0%, ${colors.cardGradientEnd} 100%)`
      : colors.bgCard;

    // خلفية الصفحة: صورة مخصصة أو تدرج (مع شفافية الصورة إن وُجدت)
    const hasBgImage = colors.backgroundImage && String(colors.backgroundImage).trim() !== '';
    const bgSizeValue = colors.backgroundSize === 'full' ? '100% 100%' : (colors.backgroundSize || 'cover');
    const bgRepeatValue = colors.backgroundRepeat || 'no-repeat';
    const bgImageOpacity = colors.backgroundImageOpacity != null ? Number(colors.backgroundImageOpacity) : 1;
    const bgAttachment = colors.backgroundAttachment === 'fixed' ? 'fixed' : 'scroll';
    let pageBackground = pageGradient;
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

    const minimalBrightCss =
      cleanThemeId === 'minimal-bright'
        ? `
      body[data-color-theme="minimal-bright"] .chakra-card,
      body[data-color-theme="minimal-bright"] .stake-card {
        border-radius: 16px !important;
        box-shadow: 0 2px 14px rgba(30, 41, 59, 0.06) !important;
      }
      body[data-color-theme="minimal-bright"] .chakra-modal__content {
        border-radius: 20px !important;
        overflow: hidden !important;
        box-shadow: 0 14px 44px rgba(30, 41, 59, 0.12) !important;
      }
      body[data-color-theme="minimal-bright"] .chakra-modal__header {
        border-radius: 20px 20px 0 0 !important;
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
      body[data-color-theme="minimal-bright"] .chakra-input,
      body[data-color-theme="minimal-bright"] .chakra-select,
      body[data-color-theme="minimal-bright"] .chakra-textarea {
        border-radius: 12px !important;
      }
      body[data-color-theme="minimal-bright"] .chakra-menu__menu-list {
        border-radius: 14px !important;
      }
    `
        : '';
    
    styleEl.textContent = `
      /* Dynamic Theme Styles - Highest Priority */
      body, html, #root {
        background: ${pageBackground} !important;
        background-color: ${colors.bgPrimary} !important;
        background-size: ${pageBgSize} !important;
        background-repeat: ${pageBgRepeat} !important;
        background-attachment: ${pageBgAttachment} !important;
      }
      ${makeContentTransparent ? `
      .stake-main-content,
      .stake-main-content > div,
      [class*="PremiumLayoutWrapper"] .stake-main-content,
      [class*="PremiumDashboard"] > div,
      .dashboard-page {
        background: transparent !important;
      }
      ` : ''}
      
      .stake-sidebar,
      body.light-theme .stake-sidebar,
      body[data-theme="light"] .stake-sidebar {
        background: linear-gradient(${sidebarGradientDir}, ${sidebarStartFinal} 0%, ${sidebarEndFinal} 100%) !important;
        background-image: linear-gradient(${sidebarGradientDir}, ${sidebarStartFinal} 0%, ${sidebarEndFinal} 100%) !important;
        background-color: transparent !important;
        border-right: 1px solid ${colors.borderSecondary || colors.borderPrimary} !important;
      }
      
      .stake-sidebar .chakra-button,
      .stake-sidebar .chakra-iconbutton {
        color: ${colors.textSecondary} !important;
      }
      
      .stake-sidebar .chakra-button:hover,
      .stake-sidebar .chakra-iconbutton:hover {
        background: ${colors.bgHover} !important;
        color: ${colors.textPrimary} !important;
      }
      
      .stake-sidebar .chakra-button[aria-current="page"],
      .stake-sidebar .chakra-iconbutton[aria-current="page"] {
        background: ${colors.bgSecondary} !important;
        color: ${colors.textPrimary} !important;
      }
      
      .stake-header {
        background: linear-gradient(${headerGradientDir}, ${headerStartFinal} 0%, ${headerEndFinal} 100%) !important;
        background-image: linear-gradient(${headerGradientDir}, ${headerStartFinal} 0%, ${headerEndFinal} 100%) !important;
        background-color: ${headerEndFinal} !important;
        border-bottom: 2px solid ${colors.borderSecondary || colors.borderPrimary} !important;
      }
      
      .stake-header .chakra-button,
      .stake-header .chakra-iconbutton {
        color: ${colors.textPrimary} !important;
      }
      
      .stake-header .chakra-button:hover,
      .stake-header .chakra-iconbutton:hover {
        background: ${colors.bgHover} !important;
        color: ${colors.accent} !important;
      }
      
      .chakra-card, .stake-card {
        background: ${cardGradient} !important;
        background-image: ${typeof cardGradient === 'string' && cardGradient.startsWith('linear-gradient') ? cardGradient : 'none'} !important;
        border: 1px solid ${colors.borderPrimary} !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
      }
      
      .chakra-modal__content {
        background: ${cardGradient} !important;
        background-image: ${typeof cardGradient === 'string' && cardGradient.startsWith('linear-gradient') ? cardGradient : 'none'} !important;
        border-color: ${colors.borderPrimary} !important;
      }
      
      .chakra-modal__header {
        background: linear-gradient(180deg, ${modalHeadStart} 0%, ${modalHeadEnd} 100%) !important;
        color: ${colors.textPrimary} !important;
        border-bottom: 1px solid ${colors.borderPrimary} !important;
      }
      
      .chakra-modal__body {
        background: ${colors.bgCard} !important;
        color: ${colors.textPrimary} !important;
      }
      
      .chakra-modal__footer {
        background: linear-gradient(0deg, ${colors.bgSecondary} 0%, ${colors.bgHover} 100%) !important;
        border-top: 1px solid ${colors.borderPrimary} !important;
      }
      
      .chakra-menu__menu-list {
        background: ${colors.bgCard} !important;
        border: 1px solid ${colors.borderPrimary} !important;
      }
      
      .chakra-menu__menuitem {
        color: ${colors.textPrimary} !important;
      }
      
      .chakra-menu__menuitem:hover {
        background: ${colors.bgHover} !important;
      }
      
      .stake-table th, table.chakra-table.stake-table thead th {
        background: var(--stake-table-header-bg, var(--stake-bg-secondary)) !important;
        color: var(--stake-table-header-text, var(--stake-text-primary)) !important;
        border-color: var(--stake-border-primary) !important;
      }
      
      .stake-table tbody tr:nth-child(even) td {
        background: ${colors.bgCard} !important;
      }
      
      .stake-table tbody tr:nth-child(odd) td {
        background: ${colors.bgPrimary} !important;
      }
      
      .stake-table td {
        color: ${colors.textPrimary} !important;
        border-color: ${colors.borderPrimary} !important;
      }
      
      .stake-table tr:hover td {
        background: ${colors.bgHover} !important;
      }
      
      .stake-heading-3 {
        color: ${colors.textPrimary} !important;
      }
      
      .chakra-button[class*="stake-btn"],
      .chakra-button[class*="stake-btn"]:hover,
      .chakra-button[class*="stake-btn"]:focus {
        border-color: ${colors.borderPrimary} !important;
      }
      
      .chakra-button[class*="stake-btn"] {
        background: ${colors.bgSecondary} !important;
        color: ${colors.textPrimary} !important;
      }
      
      .chakra-button[class*="stake-btn"]:hover,
      .chakra-button[class*="stake-btn"][data-hover],
      .chakra-button[class*="stake-btn"]:focus {
        background: ${colors.bgHover} !important;
        color: ${colors.textPrimary} !important;
      }
      
      .chakra-button[class*="stake-btn-primary"] {
        background: ${colors.accent} !important;
        color: #ffffff !important;
        border-color: ${colors.accent} !important;
      }
      
      .chakra-button[class*="stake-btn-primary"]:hover,
      .chakra-button[class*="stake-btn-primary"][data-hover] {
        background: ${colors.accent} !important;
        color: #ffffff !important;
        opacity: 0.9;
      }
      
      .chakra-button[class*="stake-btn-success"] {
        background: ${colors.success} !important;
        color: #ffffff !important;
        border-color: ${colors.success} !important;
      }
      
      .chakra-button[class*="stake-btn-success"]:hover,
      .chakra-button[class*="stake-btn-success"][data-hover] {
        background: ${colors.success} !important;
        color: #ffffff !important;
        opacity: 0.9;
      }
      
      .chakra-button[class*="stake-btn-warning"] {
        background: ${colors.warning} !important;
        color: #ffffff !important;
        border-color: ${colors.warning} !important;
      }
      
      .chakra-button[class*="stake-btn-danger"] {
        background: ${colors.error} !important;
        color: #ffffff !important;
        border-color: ${colors.error} !important;
      }
      
      [class*="css-sllut"] {
        background: ${colors.bgSecondary} !important;
        color: ${colors.textPrimary} !important;
        border-color: ${colors.borderPrimary} !important;
      }
      
      [class*="css-sllut"]:hover,
      [class*="css-sllut"][data-hover] {
        background: ${colors.bgHover} !important;
        color: ${colors.textPrimary} !important;
      }
      
      .stake-btn, .chakra-button:not([colorScheme]) {
        border-color: ${colors.borderPrimary} !important;
      }
      
      .stake-btn-secondary, .chakra-button[variant="outline"] {
        background: ${colors.bgSecondary} !important;
        color: ${colors.textPrimary} !important;
        border-color: ${colors.borderPrimary} !important;
      }
      
      .stake-btn-secondary:hover, .chakra-button[variant="outline"]:hover {
        background: ${colors.bgHover} !important;
      }
      
      [class*="chakra-icon"] {
        color: inherit;
      }
      
      .chakra-input, .chakra-select, .chakra-textarea {
        background: ${colors.bgPrimary} !important;
        border-color: ${colors.borderPrimary} !important;
        color: ${colors.textPrimary} !important;
      }
      
      .chakra-input:focus, .chakra-select:focus, .chakra-textarea:focus {
        border-color: ${colors.accent} !important;
      }
      
      /* Dashboard specific */
      [class*="PremiumDashboard"] > div,
      .dashboard-page {
        background: ${colors.bgPrimary} !important;
      }
      ${minimalBrightCss}
    `;
    
    // تحديث app-theme-styles في App.js أيضاً
    // إزالة style tag القديم إذا كان موجوداً
    let oldAppStyleEl = document.getElementById('app-theme-styles');
    if (oldAppStyleEl) {
      oldAppStyleEl.remove();
    }
    
    let appStyleEl = document.createElement('style');
    appStyleEl.id = 'app-theme-styles';
    // إضافة في نهاية head لضمان أولوية أعلى
    document.head.appendChild(appStyleEl);
    appStyleEl.textContent = `
        body, html, #root { background: ${pageBackground} !important; background-size: ${pageBgSize} !important; background-repeat: ${pageBgRepeat} !important; background-attachment: ${pageBgAttachment} !important; background-color: ${colors.bgPrimary} !important; }
        ${makeContentTransparent ? `.stake-main-content, .stake-main-content > div, body.light-theme .stake-main-content, [class*="PremiumLayoutWrapper"] .stake-main-content, [class*="PremiumDashboard"] > div, .dashboard-page { background: transparent !important; }` : ''}
        html:not([data-layout-bg='dashboard']) .stake-sidebar,
        html:not([data-layout-bg='dashboard']) body.light-theme .stake-sidebar,
        html:not([data-layout-bg='dashboard']) body[data-theme="light"] .stake-sidebar { background: linear-gradient(${sidebarGradientDir}, ${sidebarStartFinal} 0%, ${sidebarEndFinal} 100%) !important; background-image: linear-gradient(${sidebarGradientDir}, ${sidebarStartFinal} 0%, ${sidebarEndFinal} 100%) !important; background-color: transparent !important; border-color: ${colors.borderPrimary} !important; border-right-color: ${colors.borderPrimary} !important; }
        .stake-sidebar .chakra-button, .stake-sidebar .chakra-iconbutton { color: ${colors.textSecondary} !important; }
        .stake-sidebar .chakra-button:hover, .stake-sidebar .chakra-iconbutton:hover { background: ${colors.bgCard} !important; color: ${colors.textPrimary} !important; }
        .stake-sidebar .chakra-button[aria-current="page"], .stake-sidebar .chakra-iconbutton[aria-current="page"] { background: ${colors.bgCard} !important; color: ${colors.textPrimary} !important; }
        .stake-header:not(.tp-zone-has-custom-bg) { background: linear-gradient(${headerGradientDir}, ${headerStartFinal} 0%, ${headerEndFinal} 100%) !important; background-image: linear-gradient(${headerGradientDir}, ${headerStartFinal} 0%, ${headerEndFinal} 100%) !important; background-color: transparent !important; border-color: ${colors.borderPrimary} !important; border-bottom-color: ${colors.borderPrimary} !important; }
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
        ${minimalBrightCss}
      `;
    
    setSelectedTheme(cleanThemeId);
    setTempSettings(s => ({ ...s, colorTheme: cleanThemeId }));
    
    // إرسال حدث لتحديث المكونات الأخرى
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { themeId: cleanThemeId, colors } }));

    // إعادة تطبيق الخط بعد تحديث القالب (applyColorTheme لا يغيّر الخط عمداً)
    if (persistedFontRef.current) {
      applyFont(persistedFontRef.current);
    }
  };

  /** حفظ معرّف القالب في system_variables (نفس مسار «حفظ إعدادات المظهر») */
  const persistColorThemeToDatabase = async (themeId) => {
    const id = normalizeColorThemeId(themeId);
    try {
      const response = await fetch(getApiUrl('/api/comprehensive_settings_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_multiple_settings',
          category: 'appearance',
          settings: [{ key: 'color_theme', value: id, category: 'appearance' }],
        }),
      });
      const data = await response.json().catch(() => ({}));
      return !!(data && data.success);
    } catch (e) {
      console.error('persistColorThemeToDatabase:', e);
      return false;
    }
  };

  // حفظ القالب مع الإعدادات الأخرى
  const handleThemeSelect = async (themeId) => {
    const id = normalizeColorThemeId(themeId);
    await applyColorTheme(id);
    setSelectedTheme(id);
    const themeList = allThemes && allThemes.length > 0 ? allThemes : colorThemes;
    const nameAr = themeList.find(t => t.id === id)?.nameAr || id;
    const saved = await persistColorThemeToDatabase(id);
    try {
      localStorage.setItem('timepay_color_theme_v1', id);
    } catch (e) { /* ignore */ }
    if (saved) {
      toast({
        title: `تم اختيار وحفظ قالب «${nameAr}»`,
        description: 'يمكنك الضغط على «حفظ إعدادات المظهر» لحفظ الخط وباقي الخيارات.',
        status: 'success',
        duration: 3500,
      });
    } else {
      toast({
        title: `تم تطبيق قالب «${nameAr}» محلياً`,
        description: 'تعذّر الحفظ في الخادم. استخدم «حفظ إعدادات المظهر» أو تحقق من الاتصال.',
        status: 'warning',
        duration: 5000,
      });
    }
  };

  // تطبيق القالب مباشرة
  const handleApplyTheme = async (themeId) => {
    const id = normalizeColorThemeId(themeId);
    await applyColorTheme(id);
    setSelectedTheme(id);

    const saved = await persistColorThemeToDatabase(id);
    try {
      localStorage.setItem('timepay_color_theme_v1', id);
    } catch (e) { /* ignore */ }
    if (saved) {
      toast({
        title: 'تم تطبيق القالب وحفظه في النظام',
        status: 'success',
        duration: 2000,
      });
    } else {
      toast({
        title: 'تم التطبيق محلياً فقط',
        description: 'لم يُحفظ في قاعدة البيانات. جرّب «حفظ إعدادات المظهر».',
        status: 'warning',
        duration: 4000,
      });
    }
  };



  useEffect(() => { 
    loadAppearanceSettings();
  }, []);

  // تطبيق القالب عند تغييره يدوياً (وليس عند التحميل الأولي)
  useEffect(() => {
    if (!isInitialLoad && selectedTheme) {
      applyColorTheme(selectedTheme)
        .then(() => {
          if (persistedFontRef.current) {
            applyFont(persistedFontRef.current);
          }
        })
        .catch(console.error);
    }
  }, [selectedTheme, isInitialLoad]);

  const applyFont = (fontFamily) => {
    applySystemFont(fontFamily);
  };

  const applyTableSettings = (s) => {
    if (s.tableFontFamily) applyTableFont(s.tableFontFamily, s.fontFamily);
    if (s.tableFontSize) document.documentElement.style.setProperty('--table-font-size', `${s.tableFontSize}px`);
    if (s.tableFontWeight) document.documentElement.style.setProperty('--table-font-weight', s.tableFontWeight);
    if (s.showEnglishKeys !== undefined) window.dispatchEvent(new CustomEvent('englishKeysToggled', { detail: { showEnglishKeys: s.showEnglishKeys } }));
  };

  const saveSettings = async () => {
    // السماح بالحفظ إذا كان هناك قالب محدد حتى لو لم تكن هناك تغييرات أخرى
    if ((!tempSettings || Object.keys(tempSettings).length === 0) && !selectedTheme) {
      toast({ title: 'لا توجد تغييرات للحفظ', status: 'info' });
      return;
    }
    setLoading(true);
    try {
      if (tempSettings.fontFamily) {
        persistedFontRef.current = tempSettings.fontFamily;
        applyFont(tempSettings.fontFamily);
      }
      applyTableSettings(tempSettings);
      if (selectedTheme) await applyColorTheme(selectedTheme);

      const settingsToUpdate = Object.entries({ ...tempSettings, colorTheme: selectedTheme }).map(([key, value]) => {
        let dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (key === 'showEnglishKeys') dbKey = 'show_english_keys';
        if (key === 'colorTheme') dbKey = 'color_theme';
        return { key: dbKey, value: value, category: 'appearance' };
      });

      const response = await fetch(getApiUrl('/api/comprehensive_settings_api.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_multiple_settings', settings: settingsToUpdate, category: 'appearance' })
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'تم حفظ إعدادات المظهر', status: 'success' });
        updateSettings({ fontFamily: tempSettings.fontFamily });
        window.dispatchEvent(new CustomEvent('themeUpdated', { detail: tempSettings }));
        if (selectedTheme) {
          try {
            localStorage.setItem('timepay_color_theme_v1', selectedTheme);
          } catch (e) { /* ignore */ }
        }
        await reloadSettings();
      } else {
        throw new Error(data.message || 'فشل الحفظ');
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'فشل في حفظ الإعدادات', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const currentFontLabel = (val) => arabicFonts.find(f => f.value === val)?.label || 'Cairo';

  const SaveButton = ({ w }) => (
    <Button
      onClick={saveSettings}
      isLoading={loading}
      w={w}
      leftIcon={<Icon as={SaveOutlined} />}
      className="stake-btn-primary tp-settings-save-btn"
      px={6}
    >
      {loading ? 'جاري الحفظ...' : 'حفظ إعدادات المظهر'}
    </Button>
  );

  if (isInitialLoad) {
    return <SettingsTabLoading message="جاري تحميل إعدادات المظهر..." />;
  }

  return (
    <Box className="tp-settings-tab" dir="rtl" lang="ar">
      <SettingsActionsBar
        hint={(
          <Text as="span">
            اختر <strong>وضع العرض</strong> و<strong>الخطوط</strong> ثم احفظ لتطبيقها على النظام.
          </Text>
        )}
      >
        <SaveButton w={{ base: '100%', md: 'auto' }} />
      </SettingsActionsBar>

      <VStack align="stretch" spacing={6}>
        <SectionCard
          accent="appearance"
          icon={BgColorsOutlined}
          title="وضع العرض"
          subtitle="اختر الوضع الداكن أو الفاتح — انقر على البطاقة للاختيار، ثم «تطبيق» أو احفظ من أعلى الصفحة"
        >
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5}>
            {(allThemes.length > 0 ? allThemes : colorThemes).map((theme) => (
              <ThemeModeCard
                key={theme.id}
                theme={theme}
                isSelected={selectedTheme === theme.id}
                onSelect={() => handleThemeSelect(theme.id)}
                onApply={() => handleApplyTheme(theme.id)}
              />
            ))}
          </SimpleGrid>

          {selectedTheme && (() => {
            const activeTheme = (allThemes.length > 0 ? allThemes : colorThemes).find((t) => t.id === selectedTheme);
            if (!activeTheme) return null;
            const colorLabels = {
              bgPrimary: 'الخلفية الرئيسية',
              bgSecondary: 'الخلفية الثانوية',
              bgCard: 'بطاقات',
              borderPrimary: 'حدود',
              textPrimary: 'نص أساسي',
              textSecondary: 'نص ثانوي',
              accent: 'لون أساسي',
              success: 'نجاح',
              error: 'خطأ',
              warning: 'تحذير',
            };
            const swatches = Object.entries(activeTheme.colors).filter(
              ([, v]) => typeof v === 'string' && (v.startsWith('#') || v.startsWith('rgb'))
            );
            return (
              <Box
                mt={6}
                p={{ base: 4, md: 5 }}
                bg={THEME.panelBg}
                borderRadius="2xl"
                border="1px solid"
                borderColor={THEME.cardBorder}
              >
                <Flex align="center" justify="space-between" mb={4} flexWrap="wrap" gap={2}>
                  <VStack align="start" spacing={0}>
                    <Text color={THEME.inputText} fontWeight="bold" fontSize="sm">
                      لوحة ألوان — {activeTheme.nameAr}
                    </Text>
                    <Text fontSize="xs" color={THEME.subText}>
                      انقر على أي لون لنسخه إلى الحافظة
                    </Text>
                  </VStack>
                  <Badge
                    colorScheme={activeTheme.id === 'minimal-bright' ? 'yellow' : 'blue'}
                    variant="subtle"
                    px={3}
                    py={1}
                    borderRadius="full"
                  >
                    {activeTheme.icon} {activeTheme.nameAr}
                  </Badge>
                </Flex>
                <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing={3}>
                  {swatches.map(([key, color]) => (
                    <Tooltip key={key} label={`${colorLabels[key] || key}: ${color}`} placement="top">
                      <Box
                        p={2}
                        borderRadius="xl"
                        border="1px solid"
                        borderColor={THEME.cardBorder}
                        bg={THEME.bodyBg}
                        cursor="pointer"
                        transition="all 0.2s"
                        _hover={{ transform: 'translateY(-2px)', borderColor: activeTheme.colors.accent }}
                        onClick={() => {
                          navigator.clipboard.writeText(color);
                          toast({ title: `تم نسخ: ${color}`, status: 'success', duration: 1500 });
                        }}
                      >
                        <Box
                          w="100%"
                          h="36px"
                          bg={color}
                          borderRadius="lg"
                          border="1px solid"
                          borderColor="rgba(128,128,128,0.25)"
                          mb={2}
                        />
                        <Text fontSize="10px" color={THEME.subText} noOfLines={1}>
                          {colorLabels[key] || key}
                        </Text>
                        <Text fontSize="9px" color={THEME.subText} opacity={0.8} dir="ltr" textAlign="left">
                          {color}
                        </Text>
                      </Box>
                    </Tooltip>
                  ))}
                </SimpleGrid>
              </Box>
            );
          })()}
        </SectionCard>

        <Grid templateColumns={{ base: '1fr', xl: '1fr 1.15fr' }} gap={6} alignItems="stretch">
          <GridItem>
            <SectionCard
              accent="fonts"
              icon={FontSizeOutlined}
              title="خط النظام العام"
              subtitle="الخط المستخدم في القوائم والنصوص والعناوين"
            >
              <FontPickerField
                label="الخط الحالي"
                hint="يُطبَّق على الواجهة بالكامل ما عدا الجداول إن خُصّصت."
                value={currentFontLabel(tempSettings.fontFamily || 'Cairo')}
                onClick={() => setIsSystemFontModalOpen(true)}
                previewStyle={{ fontFamily: `'${resolveFontFamilyCss(tempSettings.fontFamily || 'Cairo')}', sans-serif` }}
                previewLines={['مرحباً بك في نظام إدارة الرواتب والأجور', 'Welcome to TimePay Management System']}
              />
            </SectionCard>
          </GridItem>

          <GridItem>
            <SectionCard
              accent="tables"
              icon="📊"
              title="إعدادات الجداول"
              subtitle="خط وحجم ووزن عناوين وخلايا الجداول المالية"
            >
              <VStack align="stretch" spacing={4}>
                <FontPickerField
                  label="خط الجداول"
                  value={tempSettings.tableFontFamily === 'system' ? 'نفس خط النظام' : currentFontLabel(tempSettings.tableFontFamily || 'Cairo')}
                  onClick={() => setIsTableFontModalOpen(true)}
                  previewStyle={{
                    fontFamily: tempSettings.tableFontFamily === 'system'
                      ? `'${tempSettings.fontFamily || 'Cairo'}', sans-serif`
                      : `'${tempSettings.tableFontFamily || 'Cairo'}', sans-serif`,
                    fontSize: `${tempSettings.tableFontSize || 14}px`,
                    fontWeight: tempSettings.tableFontWeight || 600,
                  }}
                  previewLines={['اسم الموظف — الراتب — القسم', 'معاينة مباشرة للجدول']}
                />

                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                  <Box className="tp-settings-inset-panel">
                    <FormLabel color="var(--stake-text-secondary)" fontSize="sm" mb={2}>مقاس الخط — {tempSettings.tableFontSize || 14}px</FormLabel>
                    <Slider
                      min={10}
                      max={50}
                      value={tempSettings.tableFontSize || 14}
                      onChange={(v) => setTempSettings(s => ({ ...s, tableFontSize: v }))}
                      colorScheme="teal"
                    >
                      <SliderTrack bg="var(--stake-border-primary)"><SliderFilledTrack bg="#14b8a6" /></SliderTrack>
                      <SliderThumb boxSize={4} />
                    </Slider>
                  </Box>
                  <Box className="tp-settings-inset-panel">
                    <FormLabel color="var(--stake-text-secondary)" fontSize="sm" mb={2}>وزن الخط — {tempSettings.tableFontWeight || 600}</FormLabel>
                    <Slider
                      min={100}
                      max={900}
                      step={100}
                      value={tempSettings.tableFontWeight || 600}
                      onChange={(v) => setTempSettings(s => ({ ...s, tableFontWeight: v }))}
                      colorScheme="teal"
                    >
                      <SliderTrack bg="var(--stake-border-primary)"><SliderFilledTrack bg="#14b8a6" /></SliderTrack>
                      <SliderThumb boxSize={4} />
                    </Slider>
                  </Box>
                </SimpleGrid>

                <SettingToggleRow
                  label="إظهار المفاتيح الإنجليزية"
                  description="عرض أسماء الحقول التقنية بجانب العناوين العربية في الجداول"
                  isChecked={tempSettings.showEnglishKeys !== undefined ? tempSettings.showEnglishKeys : true}
                  onChange={(e) => setTempSettings(s => ({ ...s, showEnglishKeys: e.target.checked }))}
                  colorScheme="teal"
                />

                <Divider className="tp-settings-divider" />

                <Text color={THEME.inputText} fontWeight="semibold" fontSize="sm">معاينة الجدول</Text>
                <Box borderRadius="xl" overflow="hidden" border="1px solid" borderColor={THEME.cardBorder}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#102a3a' }}>
                        {['اسم الموظف', 'الراتب الأساسي', 'القسم'].map((h, idx) => (
                          <th key={idx} style={{ padding: '12px 8px', color: '#e2e8f0', textAlign: 'right', borderBottom: `1px solid ${THEME.cardBorder}`, fontFamily: tempSettings.tableFontFamily === 'system' ? `'${tempSettings.fontFamily || 'Cairo'}'` : `'${tempSettings.tableFontFamily || 'Cairo'}'`, fontSize: `${tempSettings.tableFontSize || 14}px`, fontWeight: tempSettings.tableFontWeight || 600 }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['أحمد محمد علي', '5,000 ج.م.', 'المحاسبة'],
                        ['فاطمة أحمد حسن', '4,500 ج.م.', 'الموارد البشرية'],
                      ].map((row, i) => (
                        <tr key={i} style={{ backgroundColor: i % 2 ? '#0f212e' : '#0b1a24' }}>
                          {row.map((cell, j) => (
                            <td key={j} style={{ padding: '10px 8px', color: '#e2e8f0', borderBottom: `1px solid ${THEME.cardBorder}`, fontFamily: tempSettings.tableFontFamily === 'system' ? `'${tempSettings.fontFamily || 'Cairo'}'` : `'${tempSettings.tableFontFamily || 'Cairo'}'`, fontSize: `${tempSettings.tableFontSize || 14}px`, fontWeight: 400 }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              </VStack>
            </SectionCard>
          </GridItem>
        </Grid>
      </VStack>

      {/* System Font Modal */}
      <Modal isOpen={isSystemFontModalOpen} onClose={() => setIsSystemFontModalOpen(false)} size="4xl" isCentered>
        <ModalOverlay bg="rgba(0,0,0,0.75)" backdropFilter="blur(4px)" />
        <ModalContent bg={THEME.cardBg} borderRadius="2xl" dir="rtl" lang="ar" mx={4}>
          <ModalHeader color={THEME.headerText} borderBottom="1px solid" borderColor={THEME.cardBorder}>
            اختر خط النظام العام
          </ModalHeader>
          <ModalCloseButton color={THEME.headerText} />
          <ModalBody py={4}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} maxH="70vh" overflowY="auto" pr={1}>
              {arabicFonts.map(f => (
                <Box
                  key={f.value}
                  p={4}
                  bg={tempSettings.fontFamily === f.value ? 'rgba(49,130,206,0.15)' : THEME.panelBg}
                  border="2px solid"
                  borderColor={tempSettings.fontFamily === f.value ? 'blue.400' : THEME.cardBorder}
                  borderRadius="xl"
                  cursor="pointer"
                  _hover={{ borderColor: 'blue.400', transform: 'translateY(-1px)' }}
                  transition="all 0.2s"
                  onClick={() => {
                    setTempSettings(s => ({ ...s, fontFamily: f.value }));
                    persistedFontRef.current = f.value;
                    applyFont(f.value);
                    setIsSystemFontModalOpen(false);
                  }}
                >
                  <HStack justify="space-between" align="center" spacing={3}>
                    <Badge colorScheme={tempSettings.fontFamily === f.value ? 'blue' : 'gray'} variant="subtle">{f.label}</Badge>
                    <Text fontFamily={f.value} color={THEME.inputText} fontSize="lg" flex={1} textAlign="right">
                      {f.preview || 'نظام إدارة الرواتب'}
                    </Text>
                  </HStack>
                </Box>
              ))}
            </SimpleGrid>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal isOpen={isTableFontModalOpen} onClose={() => setIsTableFontModalOpen(false)} size="4xl" isCentered>
        <ModalOverlay bg="rgba(0,0,0,0.75)" backdropFilter="blur(4px)" />
        <ModalContent bg={THEME.cardBg} borderRadius="2xl" dir="rtl" lang="ar" mx={4}>
          <ModalHeader color={THEME.headerText} borderBottom="1px solid" borderColor={THEME.cardBorder}>
            اختر خط الجداول
          </ModalHeader>
          <ModalCloseButton color={THEME.headerText} />
          <ModalBody py={4}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} maxH="70vh" overflowY="auto" pr={1}>
              <Box
                p={4}
                bg={tempSettings.tableFontFamily === 'system' ? 'rgba(49,130,206,0.15)' : THEME.panelBg}
                border="2px solid"
                borderColor={tempSettings.tableFontFamily === 'system' ? 'blue.400' : THEME.cardBorder}
                borderRadius="xl"
                cursor="pointer"
                _hover={{ borderColor: 'blue.400' }}
                onClick={() => { setTempSettings(s => ({ ...s, tableFontFamily: 'system' })); setIsTableFontModalOpen(false); }}
              >
                <Text fontWeight="bold" color={THEME.headerText} mb={1}>نفس خط النظام</Text>
                <Text color={THEME.subText} fontSize="sm">يتبع {currentFontLabel(tempSettings.fontFamily || 'Cairo')}</Text>
              </Box>
              {arabicFonts.map(f => (
                <Box
                  key={f.value}
                  p={4}
                  bg={tempSettings.tableFontFamily === f.value ? 'rgba(49,130,206,0.15)' : THEME.panelBg}
                  border="2px solid"
                  borderColor={tempSettings.tableFontFamily === f.value ? 'blue.400' : THEME.cardBorder}
                  borderRadius="xl"
                  cursor="pointer"
                  _hover={{ borderColor: 'blue.400' }}
                  onClick={() => { setTempSettings(s => ({ ...s, tableFontFamily: f.value })); setIsTableFontModalOpen(false); }}
                >
                  <HStack justify="space-between" spacing={3}>
                    <Badge colorScheme={tempSettings.tableFontFamily === f.value ? 'blue' : 'gray'} variant="subtle">{f.label}</Badge>
                    <Text fontFamily={f.value} color={THEME.inputText} fontSize="lg" flex={1} textAlign="right">
                      {f.preview || 'نظام إدارة الرواتب'}
                    </Text>
                  </HStack>
                </Box>
              ))}
            </SimpleGrid>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default NewAppearanceSettings;

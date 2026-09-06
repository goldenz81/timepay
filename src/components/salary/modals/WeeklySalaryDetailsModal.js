import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Button,
  Badge,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  SimpleGrid,
  FormControl,
  FormLabel,
  Switch,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import {
  FiPrinter,
  FiEdit,
  FiUser,
  FiCalendar,
  FiList,
  FiActivity,
  FiAlertTriangle,
  FiClock,
  FiChevronUp,
  FiChevronDown,
  FiSettings,
  FiTarget,
  FiHash,
  FiBriefcase,
  FiTrendingUp,
  FiTrendingDown,
  FiX,
} from 'react-icons/fi';
import EnglishKeyTooltip from '../../EnglishKeyTooltip';
import ChakraEnglishKeyTooltip from '../../ChakraEnglishKeyTooltip';
import { normalizeDetailsModalBadgeScheme } from '../../../utils/salary/salaryBadgeHelpers';
import { debugLog } from '../../../utils/debugLog';
import {
  formatBayatDaysLabel,
  formatOvertimeHoursPairLabel,
  buildWorkweekAttendanceWideTablesHtml,
  getPreferredEmployeeName,
} from '../../../utils/salary/weeklySalaryHelpers';
import {
  buildWeeklyDetailSlipPrintDocument,
  openWeeklySlipsPrintWindow,
} from '../../../print/weeklySlipTemplate';
import { getFinancialTableColumnClass } from '../../../utils/financialColumnClasses';
import {
  isMealAllowanceEnabled,
  isMealAllowanceColumn,
} from '../../../utils/systemFeatureFlags';
import WeeklySalaryDetailsAttendancePanel from './WeeklySalaryDetailsAttendancePanel';
import '../../../styles/weekly-salary-details-modal.css';

const FINANCIAL_TABLE_HEAD = (
  <Thead>
    <Tr>
      <Th
        color="var(--stake-text-muted)"
        fontSize="xs"
        fontWeight="semibold"
        borderColor="var(--stake-border-primary)"
        py={2}
      >
        البند
      </Th>
      <Th
        isNumeric
        color="var(--stake-text-muted)"
        fontSize="xs"
        fontWeight="semibold"
        borderColor="var(--stake-border-primary)"
        py={2}
        w="38%"
      >
        القيمة
      </Th>
    </Tr>
  </Thead>
);

const WeeklySalaryDetailsModal = ({
  isOpen,
  onClose,
  selectedEmployee,
  selectedDateRange,
  detailsModalDateRange,
  detailsRangePickerValue,
  onDetailsRangeChange,
  incompleteRecords,
  settings,
  visibleColumns,
  entitlementsColumns,
  deductionsColumns,
  visibleDeductionColumns,
  columnVisibility,
  fmtCurrency,
  resolveDataKey,
  moveColumnUp,
  moveColumnDown,
  moveDeductionColumnUp,
  moveDeductionColumnDown,
  onOpenEmployeeDetails,
  onOpenAttendanceHistory,
  onOpenFixIncomplete,
  onOpenEdit,
  nestedModalOpen = false,
  attendanceHistoryLoading,
  detailsWorkweekAttendanceRows,
  detailsWorkweekWideBlocks,
  toggleColumnVisibility,
  toggleDeductionColumnVisibility,
  savePreferences,
}) => {
  const mealAllowanceEnabled = isMealAllowanceEnabled(settings);

  return (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    size="6xl"
    isCentered
    scrollBehavior="inside"
    closeOnOverlayClick={!nestedModalOpen}
    closeOnEsc={!nestedModalOpen}
  >
    <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
    <ModalContent
      className="weekly-salary-details-modal"
      bg="var(--stake-bg-primary)"
      border="none"
      borderRadius="3xl"
      boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
      overflow="hidden"
      maxW="min(96vw, 1400px)"
      w="100%"
    >
      <ModalHeader
        className="weekly-salary-details-modal__header"
        bg="var(--stake-bg-secondary)"
        color="var(--stake-text-primary)"
        borderRadius="0"
        p="0"
        position="relative"
        borderBottom="1px solid"
        borderColor="var(--stake-border-primary)"
      >
        <Box className="weekly-salary-details-modal__header-top">
          <Box className="weekly-salary-details-modal__header-grid">
            <Text
              className="weekly-salary-details-modal__header-title"
              fontWeight="bold"
              color="var(--stake-text-primary)"
              whiteSpace="nowrap"
            >
              عرض تفاصيل الأجر الأسبوعي
            </Text>

            <HStack
              className="weekly-salary-details-modal__header-center"
              spacing={{ base: 2, md: 3, lg: 4 }}
              align="center"
              justify="center"
              flexWrap="wrap"
              rowGap={2}
            >
              {detailsRangePickerValue?.[0] && detailsRangePickerValue?.[1] && (
                <HStack spacing={1.5} className="weekly-salary-details-modal__meta-item" flexShrink={0}>
                  <Icon as={FiCalendar} className="weekly-salary-details-modal__meta-icon" color="var(--stake-primary)" aria-hidden />
                  <Text className="weekly-salary-details-modal__meta-text weekly-salary-details-modal__date-text" color="var(--stake-text-secondary)">
                    {detailsRangePickerValue[0].format('DD/MM/YYYY')}
                    <Text as="span" mx={1.5} color="var(--stake-text-muted)" aria-hidden>
                      –
                    </Text>
                    {detailsRangePickerValue[1].format('DD/MM/YYYY')}
                  </Text>
                </HStack>
              )}

              <Box className="weekly-salary-details-modal__header-divider" aria-hidden />

              <HStack
                className="weekly-salary-details-modal__header-employee"
                spacing={{ base: 2, md: 3, lg: 4 }}
                align="center"
                justify="center"
                flexWrap="wrap"
              >
                <HStack spacing={1.5} className="weekly-salary-details-modal__meta-item">
                  <Icon as={FiUser} className="weekly-salary-details-modal__meta-icon" color="var(--stake-primary)" />
                  <Text
                    as="button"
                    type="button"
                    className="weekly-salary-details-modal__meta-text weekly-salary-details-modal__meta-text--name"
                    fontWeight="semibold"
                    color="var(--stake-text-primary)"
                    bg="transparent"
                    border="none"
                    cursor="pointer"
                    p={0}
                    _hover={{ color: 'var(--stake-primary)' }}
                    onClick={onOpenEmployeeDetails}
                    title="عرض تفاصيل الموظف"
                  >
                    {getPreferredEmployeeName(selectedEmployee)}
                  </Text>
                </HStack>
                <HStack spacing={1.5} className="weekly-salary-details-modal__meta-item">
                  <Icon as={FiHash} className="weekly-salary-details-modal__meta-icon" color="var(--stake-text-muted)" />
                  <Text className="weekly-salary-details-modal__meta-text" color="var(--stake-text-secondary)">
                    {selectedEmployee?.employee_code}
                  </Text>
                </HStack>
                <HStack spacing={1.5} className="weekly-salary-details-modal__meta-item">
                  <Icon as={FiBriefcase} className="weekly-salary-details-modal__meta-icon" color="var(--stake-text-muted)" />
                  <Text className="weekly-salary-details-modal__meta-text" color="var(--stake-text-secondary)">
                    {selectedEmployee?.department_description || selectedEmployee?.department || '-'}
                  </Text>
                </HStack>
                <HStack spacing={1.5} className="weekly-salary-details-modal__meta-item">
                  <Icon as={FiTarget} className="weekly-salary-details-modal__meta-icon" color="var(--stake-text-muted)" />
                  <Text className="weekly-salary-details-modal__meta-text" color="var(--stake-text-secondary)">
                    {selectedEmployee?.cost_center || '-'}
                  </Text>
                </HStack>
                <Badge
                  className="weekly-salary-details-modal__meta-badge"
                  colorScheme="blue"
                  variant="subtle"
                  px={{ base: 2, md: 2.5 }}
                  py={{ base: 0.5, md: 1 }}
                  borderRadius="full"
                  fontWeight="semibold"
                >
                  {(selectedEmployee?.salary_type || 'Weekly') === 'Weekly' ? 'أسبوعي' : 'شهري'}
                </Badge>
              </HStack>
            </HStack>

            <HStack spacing={1} className="weekly-salary-details-modal__header-actions">
              <Tooltip label={incompleteRecords.length > 0 ? 'يجب إصلاح الحقول الناقصة أولاً' : 'طباعة'} hasArrow>
                <IconButton
                  aria-label="طباعة"
                  icon={<FiPrinter />}
                  size={{ base: 'sm', md: 'md' }}
                  variant="ghost"
                  color="var(--stake-text-secondary)"
                  _hover={{ bg: 'var(--stake-bg-hover)', color: 'var(--stake-primary)' }}
                  isDisabled={incompleteRecords.length > 0}
                  onClick={() => {
                    if (!selectedEmployee || incompleteRecords.length > 0) return;
                    const printPeriod =
                      detailsModalDateRange?.[0] && detailsModalDateRange?.[1]
                        ? detailsModalDateRange
                        : selectedDateRange;
                    const attendanceHtml = buildWorkweekAttendanceWideTablesHtml(
                      detailsWorkweekAttendanceRows || []
                    );
                    const html = buildWeeklyDetailSlipPrintDocument(selectedEmployee, {
                      selectedDateRange: printPeriod,
                      displayVisibleColumns: visibleColumns,
                      entitlementsColumns,
                      deductionsColumns,
                      fmtCurrency,
                      resolveDataKey,
                      settings,
                      mealAllowanceEnabled,
                      attendanceHtml,
                      formatEmployeeName: getPreferredEmployeeName,
                    });
                    openWeeklySlipsPrintWindow(html);
                  }}
                />
              </Tooltip>
              <Tooltip label="سجل الحضور للفترة" hasArrow>
                <IconButton
                  aria-label="سجل الحضور للفترة"
                  icon={<FiList />}
                  size={{ base: 'sm', md: 'md' }}
                  variant="ghost"
                  color="var(--stake-text-secondary)"
                  _hover={{ bg: 'var(--stake-bg-hover)', color: 'var(--stake-primary)' }}
                  isDisabled={!selectedEmployee}
                  onClick={onOpenAttendanceHistory}
                />
              </Tooltip>
              <Tooltip label="تعديل الأجر" hasArrow>
                <IconButton
                  aria-label="تعديل"
                  icon={<FiEdit />}
                  size={{ base: 'sm', md: 'md' }}
                  variant="ghost"
                  color="var(--stake-text-secondary)"
                  _hover={{ bg: 'var(--stake-bg-hover)', color: 'var(--stake-primary)' }}
                  onClick={onOpenEdit}
                />
              </Tooltip>
              <ModalCloseButton
                position="static"
                color="var(--stake-text-primary)"
                bg="transparent"
                borderRadius="full"
                size={{ base: 'sm', md: 'md' }}
                _hover={{ bg: 'var(--stake-bg-hover)', transform: 'scale(1.05)' }}
                _active={{ transform: 'scale(0.95)' }}
              />
            </HStack>
          </Box>
        </Box>
      </ModalHeader>
      <ModalBody p={{ base: 4, md: 6 }} overflowX="hidden">
        {incompleteRecords.length > 0 && (
          <Alert status="warning" className="tp-incomplete-alert" mb="4" borderRadius="xl" alignItems="center" flexWrap="wrap" gap={2}>
            <AlertIcon />
            <VStack align="start" spacing="0" flex="1">
              <AlertTitle>يوجد سجلات ناقصة</AlertTitle>
              <AlertDescription>
                لا يمكن الطباعة قبل استكمال الحقول الناقصة ({incompleteRecords.length} سجل).
              </AlertDescription>
            </VStack>
            <Button size="sm" variant="outline" className="tp-incomplete-alert__action" onClick={onOpenFixIncomplete}>
              إصلاح الحقول الناقصة
            </Button>
          </Alert>
        )}
        {selectedEmployee && (() => {
          // 7?7?7?7?7?7?8& 7?87?8y7?8 7?7? 8&8  API 8~87? - 87? 7?7?7?7?7?7? 8&7?88y7?
          const basicSalaryWeekly = parseFloat(selectedEmployee.base_salary) || 0;
          const overtimeHoursWork = parseFloat(selectedEmployee.overtime_hours_work) || 0;
          const overtimeHoursHolidays = parseFloat(selectedEmployee.overtime_hours_holidays) || 0;
          const totalOvertimeHours = parseFloat(selectedEmployee.total_overtime_hours) || 0;
          const attendanceDays = parseFloat(selectedEmployee.attendance_days) || 0;
          const weeklyWage = parseFloat(selectedEmployee.weekly_wage) || 0;
          const dailyWage = parseFloat(selectedEmployee.daily_wage) || 0;
          const hourlyWage = parseFloat(selectedEmployee.hourly_wage) || 0;
          const overtimeValue = parseFloat(selectedEmployee.overtime_value) || 0;
          const attendanceBonusValue = parseFloat(selectedEmployee.attendance_bonus_value) || 0;
          const transportAllowance = parseFloat(selectedEmployee.transport_allowance) || 0;
          const specialBonusWeekly = parseFloat(selectedEmployee.special_bonus_weekly) || 0;
          const advanceAmount = parseFloat(selectedEmployee.advance_amount) || 0;
          const totalEntitlements = parseFloat(selectedEmployee.total_entitlements) || 0;
          const absentDaysCount = parseFloat(selectedEmployee.absent_days_count) || 0;
          const absentPenaltyValue = parseFloat(selectedEmployee.absent_penalty_value) || 0;
          const lateHoursCount = parseFloat(selectedEmployee.late_hours_count) || 0;
          const latePenaltyValue = parseFloat(selectedEmployee.late_penalty_value) || 0;
          const insuranceValue = parseFloat(selectedEmployee.insurance_value) || 0;
          const advanceInstallment = parseFloat(selectedEmployee.advance_installment) || 0;
          const totalDeductions = parseFloat(selectedEmployee.total_deductions) || 0;
          const netSalary = parseFloat(selectedEmployee.net_salary) || 0;

          // بيانات إضافية للعرض
          const overtimeDaysNormal = parseFloat(selectedEmployee.overtime_days_normal) || 0;
          const regularOvertimeHours = parseFloat(selectedEmployee.regular_overtime_hours) || 0;
          const holidayOvertimeHours = parseFloat(selectedEmployee.holiday_overtime_hours) || 0;
          const absentDays = parseFloat(selectedEmployee.absent_days) || 0;
          const lateDays = parseFloat(selectedEmployee.late_days) || 0;
          const avgLateMinutes = parseFloat(selectedEmployee.avg_late_minutes) || 0;

          const fmt = (n) => (n || 0).toLocaleString();
  
  // 7?7?87? 7?8 7?8y8 7?888y8& 887?7?7?7?7?7?
  const formatValueForBadge = (value, column) => {
    // 7?7?7?7?7?7?8& is_currency 8&8  87?7?7?7? 7?87?8y7?8 7?7? 7?8?87?89 - 8!7?7? 8!8? 7?88&7?8y7?7? 7?88?7?8y7?
    if (column.is_currency) {
  return fmtCurrency ? fmtCurrency(value) : fmt(value);
    }

    // 7?7?7?7?7? 7?87?7?7?8y7?: 7?7?7? 8&7?7?7?7? 7?8&8 7?87? 7?7?7?8y7? 8?7?7?7?7? 7?7?8?8  7?87?8y7? (truncate)
    const colKey = (column.column_key || column.column_name || column.name || '').toString().toLowerCase();
    if (colKey === 'late_hours') {
  const numericValue = parseFloat(value);
  if (Number.isFinite(numericValue)) {
    const truncated = numericValue >= 0
      ? Math.floor(numericValue * 10) / 10
      : Math.ceil(numericValue * 10) / 10;
    return truncated.toFixed(1);
  }
  return '0.0';
    }
    
    // إذا لم يكن is_currency = true، اعرض كرقم عادي
    if (value === null || value === undefined || value === '') {
  return '-';
    } else {
  return String(value);
    }
  };
  
  // 7?7?87? 7?7?7? 7?888y8&7? (7?7?7?7? 7?8? 8 7? 7?7?7?8y)
  const renderValue = (value, column) => {
    const formattedValue = formatValueForBadge(value, column);
    
    // 7?7?7? 8?7?8  7?888?8  "none"7R 7?7?7?7? 7?88 7? 7?87?7?7?8y
    if (column.badge_color === 'none') {
  return (
    <Text fontSize="sm" color="var(--stake-text-primary)">
      {formattedValue}
    </Text>
  );
    }
    
    // 8?7?87? 7?7?7?7? 7?87?7?7?7? (colorScheme 8~87? ? 8y7?7?7? tokens 7?887?87? 7?87?7?8y7?)
    const rawScheme = column.badge_color || (column.is_calculated ? 'green' : column.is_required ? 'red' : 'blue');
    const badgeScheme = normalizeDetailsModalBadgeScheme(rawScheme, 'blue');
    const badgeVariant = column.badge_variant || 'solid';
    
    return (
  <Badge
    colorScheme={badgeScheme}
    variant={badgeVariant}
    fontSize="sm"
    px="2"
    py="1"
    color={badgeVariant === 'outline' ? undefined : 'white'}
  >
    {formattedValue}
  </Badge>
    );
  };

          return (
            <VStack spacing="6" align="stretch" className="weekly-salary-details-body-stack">
              <SimpleGrid
                columns={{ base: 1, lg: 2 }}
                spacing={{ base: 4, lg: 5 }}
                templateColumns={{ lg: 'minmax(0, 1fr) minmax(0, 1fr)' }}
                className="weekly-salary-details-financial-grid"
              >
                <Box className="weekly-salary-details-section weekly-salary-details-section--entitlements">
                  <Box className="weekly-salary-details-section__head">
                  <HStack spacing="3" justify="space-between">
                    <HStack spacing="3">
                      <Icon as={FiTrendingUp} color="var(--stake-success)" boxSize="6" />
                      <Text as="span" fontWeight="bold" color="var(--stake-text-primary)" fontSize="lg">
                        <ChakraEnglishKeyTooltip englishKey="entitlements">المستحقات</ChakraEnglishKeyTooltip>
                      </Text>
                    </HStack>
                    <Menu>
                      <MenuButton as={Button} size="sm" leftIcon={<FiSettings />} colorScheme="green" variant="outline" rightIcon={<FiChevronDown />}>
                        تنظيم الأعمدة
                      </MenuButton>
                      <MenuList minW="280px" className="stake-card" bg="var(--stake-bg-primary)" borderColor="var(--stake-border-primary)">
                        {(entitlementsColumns || []).filter((col) => !isMealAllowanceColumn(col, mealAllowanceEnabled)).map((col) => {
                          const isVisible = columnVisibility[col.id] !== undefined ? columnVisibility[col.id] : (col.is_visible !== 0);
                          const visibleIndex = visibleColumns.indexOf(col.id);
                          return (
                            <Box key={col.id} px="3" py="2">
                              <HStack justify="space-between">
                                <HStack>
                                  <Switch isChecked={isVisible} onChange={() => { toggleColumnVisibility(col.id); setTimeout(() => savePreferences(), 100); }} />
                                  <Text fontSize="sm">{col.display_name_ar || col.column_name_ar || col.column_name || col.id}</Text>
                                </HStack>
                                <HStack spacing="1">
                                  <IconButton aria-label="أعلى" icon={<FiChevronUp />} size="xs" variant="ghost" onClick={() => moveColumnUp(col.id)} isDisabled={!isVisible || visibleIndex <= 0} />
                                  <IconButton aria-label="أسفل" icon={<FiChevronDown />} size="xs" variant="ghost" onClick={() => moveColumnDown(col.id)} isDisabled={!isVisible || visibleIndex < 0 || visibleIndex >= visibleColumns.length - 1} />
                                </HStack>
                              </HStack>
                            </Box>
                          );
                        })}
                      </MenuList>
                    </Menu>
                  </HStack>
                  </Box>
                  <Box className="weekly-salary-details-section__body">
                  {(() => {
                          const orderedColumns = (() => {
                          // 7?7?7?7?7?7?8& 8 8~7? 8&8 7?8 7?88&7?7?87?7?7?7? - 7?7?7?7? 8?7?8?7?7? 8~7?7?88y7?
                          // 7?7?7?87? 7?87?8?7?7?7? 8&8  7?7?8&7?7? 7?88&7?7?7?87?7?
                          const seenKeys = new Set();
                          const seenNames = new Set();
                          const seenIds = new Set();
                          const uniqueColumns = [];
                          
                          // تسجيل جميع entitlementsColumns للتشخيص
                          debugLog('🔍 All entitlementsColumns before filtering:', entitlementsColumns.map(col => ({
                            id: col.id,
                            name: col.display_name_ar || col.column_name_ar,
                            column_key: col.column_key || col.column_name || col.name,
                            type: col.type,
                            is_visible: col.is_visible
                          })));
                          
                          // 7?87?7?7? 7?8  "7?7?8&7?88y 7?88&7?7?7?87?7?" 8~8y entitlementsColumns
                          const totalEntitlementsInEntitlementsColumns = entitlementsColumns.find(col => {
                            if (!col) return false;
                            const key = col.column_key || col.column_name || col.name;
                            const name = col.display_name_ar || col.column_name_ar || '';
                            return key === 'total_entitlements' || name === 'إجمالي المستحقات';
                          });
                          debugLog('🔍 total_entitlements in entitlementsColumns?', totalEntitlementsInEntitlementsColumns ? {
                            id: totalEntitlementsInEntitlementsColumns.id,
                            name: totalEntitlementsInEntitlementsColumns.display_name_ar,
                            column_key: totalEntitlementsInEntitlementsColumns.column_key,
                            type: totalEntitlementsInEntitlementsColumns.type,
                            is_visible: totalEntitlementsInEntitlementsColumns.is_visible
                          } : 'NOT FOUND');
                          
                          // 7?8?87?89: 7?7?7?8~7? 7?87?7?8&7?7? 7?88&7?7?8y7? 8&8  entitlementsColumns
                          for (const col of entitlementsColumns) {
                            if (!col) continue;
                            if (isMealAllowanceColumn(col, mealAllowanceEnabled)) continue;
                            
                            const key = col.column_key || col.column_name || col.name;
                            const name = col.display_name_ar || col.column_name_ar || '';
                            const id = col.id;
                            const isReference = col.type === 'reference';
                            const isTotalEntitlements = (key === 'total_entitlements' || name === 'إجمالي المستحقات');
                            
                            // لا نزيل أي أعمدة بناءً على قائمة ثابتة
                            // 8 7?7?8&7? 8~87? 7?880 is_visible 8&8  87?7?7?7? 7?87?8y7?8 7?7? 8? visibleColumns
                            // 7?88&7?7?7?7?8& 8y7?7?8?8& 8~8y 7?87?7?8y7? 8&8  7?87?8 toggle "8&7?7?8y" 8~8y 7?8 7?8y8& 7?87?7?8&7?7?
                            
                            // 888&7?7?7?7? 8?"7?7?8&7?88y 7?88&7?7?7?87?7?"7R 8 7?7?7?8!7? 7?7?7?8&7?89 7?7?80 88? 8?7?8 7? is_visible = 0
                            if (isReference || isTotalEntitlements) {
                              debugLog('🔍 Found reference/total_entitlements in loop:', { id, key, name, type: col.type, is_visible: col.is_visible });
                              
                              // 7?87?7?88 8&8  8?7?8?7? 7?8&8?7? 7?7?7?8y 7?8 8~7? column_key - 7?7?7? 8?7?8  8&8?7?8?7?7?897R 8 7?7?8~8! 8?8 7?7?8~7? 7?7?88&7?7?7? 8~87?
                              const existingNormalColIndex = uniqueColumns.findIndex(uc => {
                                const ucKey = uc.column_key || uc.column_name || uc.name;
                                return ucKey === key && uc.type !== 'reference';
                              });
                              
                              if (existingNormalColIndex >= 0) {
                                debugLog('🔄 Removing normal column in favor of reference:', { id, key, name });
                                const removedCol = uniqueColumns.splice(existingNormalColIndex, 1)[0];
                                seenKeys.delete(key);
                                seenNames.delete(removedCol.display_name_ar || removedCol.column_name_ar || '');
                                seenIds.delete(removedCol.id);
                              }
                              
                              // 7?87?7?88 8&8  7?7?8& 7?87?8?7?7?7? 7?8 7?789 7?880 column_key 888&7?7?7?7?
                              if (key && seenKeys.has(key)) {
                                // إذا كان هناك مرجع آخر بنفس column_key، نحتفظ بأحدهم فقط
                                const existingRefIndex = uniqueColumns.findIndex(uc => {
                                  const ucKey = uc.column_key || uc.column_name || uc.name;
                                  return ucKey === key && uc.type === 'reference';
                                });
                                
                                if (existingRefIndex >= 0) {
                                  debugWarn('⚠️ Skipping duplicate reference (column_key):', { id, key, name });
                                  continue; // 7?7?7?8y 7?88&7?7?7? 7?88&8?7?7?
                                }
                              }
                              
                              // 7?87?7?88 8&8  id 7?8y7?7?89
                              if (id && seenIds.has(id)) {
                                debugWarn('⚠️ Skipping duplicate reference/total_entitlements (id):', { id, key, name });
                                continue; // تخطي إذا كان id مكرراً
                              }
                              
                              if (key) seenKeys.add(key);
                              if (name) seenNames.add(name);
                              if (id) seenIds.add(id);
                              uniqueColumns.push(col);
                              debugLog('✅ Added reference/total_entitlements to uniqueColumns:', { id, key, name });
                              continue;
                            }
                            
                            // 887?7?8&7?7? 7?87?7?7?8y7?7R 8 7?7?7?8!7? 7?7?7? 8?7?8 7?:
                            // 1. مرئية (is_visible !== 0) أو
                            // 2. موجودة في visibleColumns (حتى لو كانت is_visible = 0)
                            // 87?8  7?88&7?7?7?7?8& 87? 8y8?8?8  7?7?7?8~8!7? 8y7?8?8y7?89 8&8  7?8 7?8y8& 7?87?7?8&7?7?
                            if (col.is_visible === 0 && !visibleColumns.includes(id)) {
                              // 7?7?7?8y 7?87?7?8&7?7? 7?88&7?8~8y7? 7?7?7?7?7?89 8?7?87?8y 88y7?7? 8~8y visibleColumns
                              continue;
                            }
                            
                            // 7?87?7?88 8&8  8?7?8?7? 8&7?7?7? 7?8 8~7? column_key - 7?7?7? 8?7?8  8&8?7?8?7?7?897R 8 7?7?7?8!8 7?87?8&8?7? 7?87?7?7?8y
                            if (key && seenKeys.has(key)) {
                              const existingRef = uniqueColumns.find(uc => {
                                const ucKey = uc.column_key || uc.column_name || uc.name;
                                return ucKey === key && uc.type === 'reference';
                              });
                              
                              if (existingRef) {
                                debugLog('🚫 Skipping normal column - reference exists:', { id, key, name });
                                continue; // 7?7?7?8y 7?87?8&8?7? 7?87?7?7?8y 7?7?7? 8?7?8  8!8 7?8? 8&7?7?7?
                              }
                            }
                            
                            // 7?87?7?88 8&8  7?7?8& 7?87?8?7?7?7? 7?8 7?789 7?880 column_key 7?8?87?89
                            if (key && seenKeys.has(key)) {
                              debugWarn('تم تجاهل عمود مكرر (column_key) في المستحقات:', { id, key, name }); 
                              continue; // 7?7?7?8y 7?87?8&8?7? 7?88&8?7?7?
                            }
                            
                            // 7?87?7?88 8&8  display_name_ar 7?8y7?7?89 (887?7?8?7? 8&8  7?7?8& 7?8?7?7?7? 7?87?7?8&7?7? 7?8 8~7? 7?87?7?8&)
                            if (name && seenNames.has(name)) {
                              debugWarn('تم تجاهل عمود مكرر (display_name_ar) في المستحقات:', { id, key, name });
                              continue; // 7?7?7?8y 7?87?8&8?7? 7?88&8?7?7?
                            }
                            
                            // 7?87?7?88 8&8  id 7?8y7?7?89
                            if (id && seenIds.has(id)) {
                              debugWarn('تم تجاهل عمود مكرر (id) في المستحقات:', { id, key, name });
                              continue; // 7?7?7?8y 7?87?8&8?7? 7?88&8?7?7?
                            }
                            
                            // 7?7?7?8~7? 7?87?8&8?7? 7?7?7? 88& 8y8?8  8&8?7?7?7?89
                            if (key) seenKeys.add(key);
                            if (name) seenNames.add(name);
                            if (id) seenIds.add(id);
                            uniqueColumns.push(col);
                          }
                          
                          // 7?7?7?8y7? 7?87?7?8&7?7? 7?7?7? visibleColumns 7?7?7? 8?7?8  8&8?7?8?7?7?89
                          const orderedColumns = uniqueColumns.sort((a, b) => {
                            const indexA = visibleColumns.indexOf(a.id);
                            const indexB = visibleColumns.indexOf(b.id);
                            if (indexA >= 0 && indexB >= 0) return indexA - indexB;
                            if (indexA >= 0) return -1; // 7?87?7?8&7?7? 8~8y visibleColumns 7?7?7?8y 7?8?87?89
                            if (indexB >= 0) return 1;
                            // 888&7?7?7?7? 8?"7?7?8&7?88y 7?88&7?7?7?87?7?"7R 8 7?7?8!7? 8~8y 7?88 8!7?8y7?
                            const aIsTotal = (a.column_key === 'total_entitlements' || a.display_name_ar === 'إجمالي المستحقات');
                            const bIsTotal = (b.column_key === 'total_entitlements' || b.display_name_ar === 'إجمالي المستحقات');
                            if (aIsTotal && !bIsTotal) return 1; // a 8~8y 7?88 8!7?8y7?
                            if (!aIsTotal && bIsTotal) return -1; // b 8~8y 7?88 8!7?8y7?
                            return (a.display_order || 999) - (b.display_order || 999);
                          });
                          
                          // 8 88 "7?7?8&7?88y 7?88&7?7?7?87?7?" 7?880 7?88 8!7?8y7?
                          const totalEntitlementsIndex = orderedColumns.findIndex(col => {
                            const key = col.column_key || col.column_name || col.name;
                            const name = col.display_name_ar || col.column_name_ar || '';
                            return key === 'total_entitlements' || name === 'إجمالي المستحقات';
                          });
                          
                          if (totalEntitlementsIndex >= 0 && totalEntitlementsIndex < orderedColumns.length - 1) {
                            const totalEntitlementsCol = orderedColumns.splice(totalEntitlementsIndex, 1)[0];
                            orderedColumns.push(totalEntitlementsCol);
                            debugLog('✅ Moved total_entitlements to end:', totalEntitlementsCol);
                          }
                          
                          // 7?87?7?88 8&8  8?7?8?7? "7?7?8&7?88y 7?88&7?7?7?87?7?" 8~8y orderedColumns
                          const hasTotalEntitlementsInDisplay = orderedColumns.some(col => {
                            const key = col.column_key || col.column_name || col.name;
                            const name = col.display_name_ar || col.column_name_ar || '';
                            return key === 'total_entitlements' || name === 'إجمالي المستحقات';
                          });
                          
                          if (!hasTotalEntitlementsInDisplay) {
                            debugWarn('⚠️ إجمالي المستحقات غير موجود في orderedColumns!');
                            debugLog('entitlementsColumns:', entitlementsColumns.map(col => ({
                              id: col.id,
                              name: col.display_name_ar,
                              column_key: col.column_key,
                              type: col.type,
                              is_visible: col.is_visible
                            })));
                            debugLog('orderedColumns:', orderedColumns.map(col => ({
                              id: col.id,
                              name: col.display_name_ar,
                              column_key: col.column_key,
                              type: col.type
                            })));
                          } else {
                            debugLog('✅ total_entitlements found in orderedColumns at index:', totalEntitlementsIndex >= 0 ? totalEntitlementsIndex : orderedColumns.length - 1);
                          }
                          
                          return orderedColumns;
                        })();

                          const entitlementColKey = (c) =>
                            (c && (c.column_key || c.column_name || c.name || '')) || '';
                          const entitlementNameAr = (c) =>
                            (c && (c.display_name_ar || c.column_name_ar || '')) || '';

                          let gridColumns = [...orderedColumns];
                          const idxOvertimePay = gridColumns.findIndex(
                            (c) =>
                              entitlementColKey(c) === 'overtime_pay' ||
                              entitlementNameAr(c) === 'أجر الإضافي' ||
                              c?.column_name === 'overtime_pay'
                          );
                          const idxOvertimeHours = gridColumns.findIndex(
                            (c) =>
                              entitlementColKey(c) === 'overtime_hours' ||
                              entitlementNameAr(c) === 'ساعات الإضافي' ||
                              c?.column_name === 'overtime_hours'
                          );
                          if (idxOvertimePay >= 0 && idxOvertimeHours >= 0) {
                            const [payCol] = gridColumns.splice(idxOvertimePay, 1);
                            const newHoursIdx = gridColumns.findIndex(
                              (c) =>
                                entitlementColKey(c) === 'overtime_hours' ||
                                entitlementNameAr(c) === 'ساعات الإضافي' ||
                                c?.column_name === 'overtime_hours'
                            );
                            if (newHoursIdx >= 0) {
                              gridColumns.splice(newHoursIdx + 1, 0, payCol);
                            } else {
                              gridColumns.splice(Math.min(idxOvertimePay, gridColumns.length), 0, payCol);
                            }
                          }

                          let totalEntitlementsColumn = null;
                          const idxTotalEnt = gridColumns.findIndex(
                            (c) =>
                              entitlementColKey(c) === 'total_entitlements' ||
                              entitlementNameAr(c) === 'إجمالي المستحقات'
                          );
                          if (idxTotalEnt >= 0) {
                            totalEntitlementsColumn = gridColumns[idxTotalEnt];
                            gridColumns = gridColumns.filter((_, i) => i !== idxTotalEnt);
                          }

                          const half = Math.ceil(gridColumns.length / 2) || 1;
                          const entitlementColChunks = [
                            gridColumns.slice(0, half),
                            gridColumns.slice(half),
                          ];

                          const renderEntitlementRows = (chunk) =>
                            chunk.flatMap((column, index) => {
                          
                            // 7?7?7?7?7?7?8& resolveDataKey 7?8?87?89 887?7?8?8 7?880 7?88&8~7?7?7? 7?87?7?8y7?
                            let key = resolveDataKey(column, selectedEmployee);
                            
                            // 7?7?7?8~7? 7?8~ "7?7?7?7?7? 7?87?8&8" 87?8 "7?8y7?8& 7?87?8 7?7?7?8&"
                            const isOnTimeDays = column.display_name_ar === 'أيام الانتظام' || 
                                                 column.column_name === 'on_time_days' ||
                                                 column.column_key === 'on_time_days';
                            
                            const workHours = parseFloat(selectedEmployee?.work_hours) || 0;
                            const rows = [];
                            
                            // 7?7?7? 8?7?8  8!7?7? 7?87?8&8?7? 8!8? "7?8y7?8& 7?87?8 7?7?7?8&"7R 7?7?8~ 7?8~ "7?7?7?7?7? 7?87?8&8" 87?88!
                            if (isOnTimeDays && workHours > 0) {
                              rows.push(
                                <Tr key="entitlement-work_hours" _hover={{ bg: 'var(--stake-bg-hover)' }} transition="all 0.2s">
                                  <Td color="white" verticalAlign="top">
                                    <HStack spacing="2" align="center">
                                      <ChakraEnglishKeyTooltip englishKey="work_hours">
                                        ساعات العمل
                                      </ChakraEnglishKeyTooltip>
                                    </HStack>
                                  </Td>
                                  <Td isNumeric fontFamily="mono" verticalAlign="top">
                                    {workHours.toFixed(2)} س
                                  </Td>
                                </Tr>
                              );
                            }
                            
                            // إذا لم يعطِ resolveDataKey نتيجة، استخدم column_key
                            if (!key) {
                              key = column.column_key || column.column_name || column.name;
                            }
                            
                            // 7?87?7?88 7?7?7? 8?7?8  7?87?8&8?7? 8!8? "7?87?8&8y8y7? 8?7?87?8?7?8~7?"
                            const isDiscriminationIncentive = column.display_name_ar === 'التمييز والحوافز' || 
                                                              column.column_key === 'discrimination_incentive_allowance' ||
                                                              column.column_name === 'discrimination_incentive_allowance';
                            
                            // 7?87?7?88 8&8  8?87? 7?88&8~7?7?7?8y8  7?88&7?7?8&88y8  888&8?7?8~7?7? 7?87?7?7?7?
                            // 7?87?7?88 7?7?7? 8?7?8  7?87?8&8?7? 8!8? "7?7?8&7?88y 7?88&7?7?7?87?7?"
                            const isTotalEntitlements = column.display_name_ar === 'إجمالي المستحقات' || 
                                                       column.column_key === 'total_entitlements' ||
                                                       column.column_name === 'total_entitlements';
                            
                            // 7?87?7?88 7?7?7? 8?7?8  7?87?8&8?7? 8!8? "7?8y7?8& 7?87?8 7?7?7?8&"
                            const isRegularityDays = column.display_name_ar === 'أيام الانتظام' || 
                                                    column.column_key === 'regularity_days' ||
                                                    column.column_name === 'regularity_days';
                            
                            // 7?87?7?88 7?7?7? 8?7?8  7?87?8&8?7? 8!8? "7?7?7? 7?87?8 7?7?7?8&"
                            const isRegularityPay = column.display_name_ar === 'أجر الانتظام' || 
                                                   column.column_key === 'regularity_pay' ||
                                                   column.column_name === 'regularity_pay';
                            
                            let value = 0;
                            if (isDiscriminationIncentive) {
                              // 7?7?7? 8?7?8  7?87?8&8?7? 8!8? "7?87?8&8y8y7? 8?7?87?8?7?8~7?"7R 7?7?7?7?7?8& 7?888y8&7? 8&8  selectedEmployee
                              value = parseFloat(selectedEmployee?.discrimination_incentive_allowance) || 0;
                            } else if (isTotalEntitlements) {
                              // 7?7?7? 8?7?8  7?87?8&8?7? 8!8? "7?7?8&7?88y 7?88&7?7?7?87?7?"7R 7?7?7?7?7?8& 7?888y8&7? 8&8  selectedEmployee
                              value = parseFloat(selectedEmployee?.total_entitlements) || 0;
                            } else if (isRegularityDays) {
                              // 7?7?7? 8?7?8  7?87?8&8?7? 8!8? "7?8y7?8& 7?87?8 7?7?7?8&"7R 7?7?7?7?7?8& 7?888y8&7? 8&8  selectedEmployee
                              value = parseFloat(selectedEmployee?.regularity_days) || parseFloat(selectedEmployee?.on_time_days) || 0;
                              // تسجيل للتصحيح
                              debugLog('Regularity days calculation:', {
                                column_name: column.display_name_ar,
                                column_key: column.column_key,
                                regularity_days: selectedEmployee?.regularity_days,
                                on_time_days: selectedEmployee?.on_time_days,
                                final_value: value
                              });
                            } else if (isRegularityPay) {
                              // 7?7?7? 8?7?8  7?87?8&8?7? 8!8? "7?7?7? 7?87?8 7?7?7?8&"7R 7?7?7?7?7?8& 7?888y8&7? 8&8  selectedEmployee
                              value = parseFloat(selectedEmployee?.regularity_pay) || 0;
                              // تسجيل للتصحيح
                              debugLog('Regularity pay calculation:', {
                                column_name: column.display_name_ar,
                                column_key: column.column_key,
                                regularity_pay: selectedEmployee?.regularity_pay,
                                final_value: value
                              });
                            } else if (key === 'special_bonus') {
                              // 7?7?7? 8?7?8  7?88&8~7?7?7? special_bonus7R 7?7?7? special_bonus_weekly 7?8?87?89
                              value = selectedEmployee?.special_bonus_weekly ?? selectedEmployee?.special_bonus ?? 0;
                            } else {
                              value = key ? (selectedEmployee?.[key] ?? 0) : 0;
                            }
                            
                          // 7?7?7?8y8 7?8y7?8 7?7? 7?87?8&8?7? 887?7?8?7? 8&8  8?7?8?7? 7?88?7?8  7?87?7?7?7?
                          debugLog('Rendering column in details modal:', {
                            id: column.id,
                            name: column.display_name_ar,
                            column_name: column.column_name,
                            badge_color: column.badge_color,
                            badge_variant: column.badge_variant,
                            data_type: column.data_type,
                            is_currency: column.is_currency,
                            is_visible: column.is_visible,
                            value: value,
                            formatted_value: formatValueForBadge(value, column),
                            selectedEmployee_keys: Object.keys(selectedEmployee || {}),
                            selectedEmployee_on_time_days: selectedEmployee?.on_time_days,
                            resolved_key: key
                          });
                            const isCalculated = column.is_calculated;
                            const isRequired = column.is_required;
                            
                            // 7?87?7?88 7?7?7? 8?7?8  7?87?8&8?7? 8!8? "7?7?7?7?7? 7?87?7?7?8~8y" 87?7?7? 7?87?8~7?7?8y8
                            const isOvertimeHours = column.display_name_ar === 'ساعات الإضافي' || 
                                                   column.column_name === 'overtime_hours' ||
                                                   column.column_key === 'overtime_hours';
                            
                            // 7?87?7?8?8 7?880 88y8& 7?7?7?7?7? 7?87?7?7?8~8y 8&8  7?87?8y7?8 7?7?
                            const regularOvertime = parseFloat(selectedEmployee?.regular_overtime_hours) || 0;
                            const holidayOvertime = parseFloat(selectedEmployee?.holiday_overtime_hours) || 0;
                            const bayatDays = parseFloat(selectedEmployee?.bayat_days) || 0;
                            const bayatPay = parseFloat(selectedEmployee?.bayat_pay) || 0;

                            if (isOvertimeHours && bayatDays > 0) {
                              const bayatLabel = `البيات (${formatBayatDaysLabel(bayatDays)})`;
                              rows.push(
                                <Tr key="entitlement-bayat" _hover={{ bg: 'var(--stake-bg-hover)' }} transition="all 0.2s">
                                  <Td color="white" verticalAlign="top">
                                    <HStack spacing="2" align="center">
                                      <ChakraEnglishKeyTooltip englishKey="bayat_pay">
                                        <Text lineHeight="1.4" whiteSpace="normal">
                                          {bayatLabel}
                                        </Text>
                                      </ChakraEnglishKeyTooltip>
                                    </HStack>
                                  </Td>
                                  <Td isNumeric fontFamily="mono" verticalAlign="top">
                                    {fmtCurrency ? fmtCurrency(bayatPay) : `${(bayatPay || 0).toLocaleString()} ج.م`}
                                  </Td>
                                </Tr>
                              );
                            }
                            
                            // 7?7?7?8~7? 7?8~ 7?87?8&8?7? 7?87?7?88y
                            rows.push(
                              <Tr
                                key={`entitlement-${column.id || column.column_key || column.column_name || column.name || index}`}
                                _hover={{ bg: 'var(--stake-bg-hover)' }}
                                transition="all 0.2s"
                              >
                                <Td color="white" verticalAlign="top">
                                  <HStack spacing="2" align="center">
                                    <ChakraEnglishKeyTooltip englishKey={column.name}>
                                      {isOvertimeHours ? (
                                        <Text lineHeight="1.4" whiteSpace="normal">
                                          {column.display_name_ar}{' '}
                                          <Text as="span" fontSize="xs" color="var(--stake-text-secondary)">
                                            {formatOvertimeHoursPairLabel(
                                              regularOvertime,
                                              holidayOvertime,
                                              selectedEmployee?.total_overtime_hours
                                            )}
                                          </Text>
                                        </Text>
                                      ) : (
                                        column.display_name_ar
                                      )}
                                    </ChakraEnglishKeyTooltip>
                                    {column.is_custom && (
                                      <IconButton
                                        icon={<FiX />}
                                        size="xs"
                                        colorScheme="red"
                                        variant="ghost"
                                        onClick={() => removeCustomColumn(column.id)}
                                      />
                                    )}
                                  </HStack>
                                </Td>
                                <Td isNumeric fontFamily="mono" verticalAlign="top">
                                  {renderValue(value, column)}
                                </Td>
                              </Tr>
                            );
                            
                            return rows;
                          });

                          return (
                            <>
                              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} w="100%" sx={{ '& > *': { minW: 0 } }}>
                                {entitlementColChunks.map((chunk, ci) => (
                                  <TableContainer key={`entitlement-col-${ci}`} borderRadius="lg" overflow="hidden">
                                    <Table
                                      size="sm"
                                      variant="simple"
                                      bg="var(--stake-bg-secondary, #111827)"
                                      className="weekly-salary-details-financial-table"
                                    >
                                      {FINANCIAL_TABLE_HEAD}
                                      <Tbody>{renderEntitlementRows(chunk)}</Tbody>
                                    </Table>
                                  </TableContainer>
                                ))}
                              </SimpleGrid>
                              {totalEntitlementsColumn ? (
                                <TableContainer mt={3} w="100%" borderRadius="lg" overflow="hidden">
                                  <Table
                                    size="sm"
                                    variant="simple"
                                    bg="var(--stake-bg-secondary, #111827)"
                                    className="weekly-salary-details-financial-table"
                                  >
                                    {FINANCIAL_TABLE_HEAD}
                                    <Tbody>{renderEntitlementRows([totalEntitlementsColumn])}</Tbody>
                                  </Table>
                                </TableContainer>
                              ) : null}
                            </>
                          );
                        })()}
                  </Box>
                </Box>
                <Box className="weekly-salary-details-section weekly-salary-details-section--deductions">
                  <Box className="weekly-salary-details-section__head">
                  <HStack spacing="3" justify="space-between">
                    <HStack spacing="3">
                      <Icon as={FiTrendingDown} color="var(--stake-error)" boxSize="6" />
                      <Text as="span" fontWeight="bold" color="var(--stake-text-primary)" fontSize="lg">
                        <ChakraEnglishKeyTooltip englishKey="deductions">المستقطعات</ChakraEnglishKeyTooltip>
                      </Text>
                    </HStack>
                    <Menu>
                      <MenuButton as={Button} size="sm" leftIcon={<FiSettings />} colorScheme="red" variant="outline" rightIcon={<FiChevronDown />}>
                        تنظيم الأعمدة
                      </MenuButton>
                      <MenuList minW="280px" className="stake-card" bg="var(--stake-bg-primary)" borderColor="var(--stake-border-primary)">
                        {(deductionsColumns || []).map((col) => {
                          const isVisible = visibleDeductionColumns.includes(col.id);
                          const visibleIndex = visibleDeductionColumns.indexOf(col.id);
                          return (
                            <Box key={col.id} px="3" py="2">
                              <HStack justify="space-between">
                                <HStack>
                                  <Switch isChecked={isVisible} onChange={() => { toggleDeductionColumnVisibility(col.id); setTimeout(() => savePreferences(), 100); }} />
                                  <Text fontSize="sm">{col.display_name_ar || col.column_name_ar || col.column_name || col.id}</Text>
                                </HStack>
                                <HStack spacing="1">
                                  <IconButton aria-label="أعلى" icon={<FiChevronUp />} size="xs" variant="ghost" onClick={() => moveDeductionColumnUp(col.id)} isDisabled={!isVisible || visibleIndex <= 0} />
                                  <IconButton aria-label="أسفل" icon={<FiChevronDown />} size="xs" variant="ghost" onClick={() => moveDeductionColumnDown(col.id)} isDisabled={!isVisible || visibleIndex < 0 || visibleIndex >= visibleDeductionColumns.length - 1} />
                                </HStack>
                              </HStack>
                            </Box>
                          );
                        })}
                      </MenuList>
                    </Menu>
                  </HStack>
                  </Box>
                  <Box className="weekly-salary-details-section__body">
                  <TableContainer borderRadius="lg" overflow="hidden">
                    <Table
                      size="sm"
                      variant="simple"
                      bg="var(--stake-bg-secondary, #111827)"
                      className="weekly-salary-details-financial-table"
                    >
                      {FINANCIAL_TABLE_HEAD}
                      <Tbody>
                        {/* 7?7?7? 7?87?7?8&7?7? 7?88&7?7?8y7? 888&7?7?87?7?7?7? 8&8  7?88 7?7?8& 7?88&7?7?7? */}
                        {(() => {
                          // ترتيب وفلترة حسب visibleDeductionColumns إن وُجدت، وإلا حسب is_visible
                          let colsToShow = [];
                          if (visibleDeductionColumns.length > 0) {
                            colsToShow = visibleDeductionColumns
                              .map(id => deductionsColumns.find(c => c && c.id === id))
                              .filter(Boolean);
                          } else {
                            colsToShow = (deductionsColumns || []).filter(c => c && c.is_visible !== 0);
                          }
                          // 7?7?7?87? 7?87?8?7?7?7? 8&8  7?7?8&7?7? 7?88&7?7?87?7?7?7?
                          const seenKeys = new Set();
                          const seenNames = new Set();
                          const seenIds = new Set();
                          const uniqueDeductions = [];
                          for (const col of colsToShow) {
                            const key = col.column_key || col.column_name || col.name;
                            const name = col.display_name_ar || col.column_name_ar || '';
                            const id = col.id;
                            if (key && seenKeys.has(key)) continue;
                            if (name && (name === 'سلفة' || name === 'خصم السلفة') && seenNames.has(name)) continue;
                            if (id && seenIds.has(id)) continue;
                            if (key) seenKeys.add(key);
                            if (name && (name === 'سلفة' || name === 'خصم السلفة')) seenNames.add(name);
                            if (id) seenIds.add(id);
                            uniqueDeductions.push(col);
                          }
                          return uniqueDeductions;
                        })()
                          .map((column, index) => {
                          
                            const key = column.column_key || column.column_name || column.name || resolveDataKey(column, selectedEmployee);
                            const value = key ? (selectedEmployee?.[key] ?? 0) : 0;
                            
                          // 7?7?7?8y8 7?8y7?8 7?7? 7?87?8&8?7? 887?7?8?7? 8&8  8?7?8?7? 7?88?7?8  7?87?7?7?7?
                          debugLog('Rendering deduction column in details modal:', {
                            id: column.id,
                            name: column.display_name_ar,
                            column_name: column.column_name,
                            badge_color: column.badge_color,
                            badge_variant: column.badge_variant,
                            data_type: column.data_type,
                            is_currency: column.is_currency,
                            value: value,
                            formatted_value: formatValueForBadge(value, column)
                          });
                            const isCalculated = column.is_calculated;
                            const isRequired = column.is_required;
                            
                            // 7?87?7?88 7?7?7? 8?7?8  7?87?8&8?7? 8!8? "7?7?8& 7?87?88~7?" 87?7?7? 7?88& 7?887?7?
                            const isAdvanceInstallment = column.display_name_ar === 'خصم السلفة' || 
                                                       column.column_name === 'advance_installment' ||
                                                       column.column_key === 'advance_installment';
                            const installmentNumber = selectedEmployee?.advance_installment_number || 0;
                            const totalInstallments = selectedEmployee?.total_installments || 0;
                            const advanceInstallmentIsPaid = selectedEmployee?.advance_installment_is_paid ?? 0;
                            const isDeferred = advanceInstallmentIsPaid === 2;
                            
                            return (
                              <React.Fragment key={`deduction-${column.id || column.column_key || column.column_name || column.name || index}`}>
                                <Tr _hover={{ bg: 'var(--stake-bg-hover)' }} transition="all 0.2s">
                                  <Td color="white">
                                    <ChakraEnglishKeyTooltip englishKey={column.name}>
                                      {isAdvanceInstallment && isDeferred ? (
                                        <Text>قسط مرحل للفترة التالية</Text>
                                      ) : isAdvanceInstallment && installmentNumber > 0 && totalInstallments > 0 ? (
                                        <HStack spacing="2" align="center">
                                          <Text>{column.display_name_ar}</Text>
                                          <Text fontSize="xs" color="var(--stake-text-secondary)">
                                            (قسط {installmentNumber} من أصل {totalInstallments})
                                          </Text>
                                        </HStack>
                                      ) : (
                                        column.display_name_ar
                                      )}
                                    </ChakraEnglishKeyTooltip>
                                  </Td>
                                  <Td isNumeric fontFamily="mono">
                                    <Badge
                                      colorScheme={normalizeDetailsModalBadgeScheme(
                                        column.badge_color || (isCalculated ? 'red' : isRequired ? 'red' : 'orange'),
                                        'orange'
                                      )}
                                      variant={column.badge_variant || 'solid'}
                                      fontSize="sm"
                                      px="2"
                                      py="1"
                                      color={(column.badge_variant || 'solid') === 'outline' ? undefined : 'white'}
                                    >
                                      {isAdvanceInstallment && isDeferred ? '0.00' : formatValueForBadge(value, column)}
                                    </Badge>
                                  </Td>
                                </Tr>
                              </React.Fragment>
                            );
                          })}
                      </Tbody>
                    </Table>
                  </TableContainer>
                  </Box>
                </Box>
              </SimpleGrid>

              <Box className="weekly-salary-details-section weekly-salary-details-section--attendance" w="100%">
                <Box className="weekly-salary-details-section__head">
                <HStack spacing={2}>
                  <Icon as={FiClock} color="var(--stake-primary)" boxSize={5} />
                  <Text fontWeight="bold" fontSize="md" color="var(--stake-text-primary)">
                    سجل الحضور والانصراف (جمعة – خميس)
                  </Text>
                </HStack>
                </Box>
                <Box className="weekly-salary-details-section__body" p={0}>
                <WeeklySalaryDetailsAttendancePanel
                  attendanceHistoryLoading={attendanceHistoryLoading}
                  detailsWorkweekAttendanceRows={detailsWorkweekAttendanceRows}
                  detailsWorkweekWideBlocks={detailsWorkweekWideBlocks}
                />
                </Box>
              </Box>
            </VStack>
          );
        })()}
      </ModalBody>
      <ModalFooter 
        display="flex" 
        justifyContent="center" 
        alignItems="center"
        bg="var(--stake-bg-secondary)"
        borderRadius="0"
        p="4"
        borderTop="2px solid"
        borderColor="var(--stake-border-primary)"
      >
        <HStack spacing="2" align="center" flexWrap="wrap" justifyContent="center" w="100%">
          <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium" whiteSpace="nowrap">
            صافي المرتب:
          </Text>
          <Text fontSize="xl" fontWeight="bold" color="var(--stake-primary)" whiteSpace="nowrap">
            {(() => {
              const netRaw = parseFloat(selectedEmployee?.net_salary) || 0;
              const roundedNet = Math.round(netRaw / 5) * 5;
              return fmtCurrency ? fmtCurrency(roundedNet) : roundedNet.toLocaleString() + ' ج.م';
            })()}
          </Text>
          <Text as="span" className="rounding-diff-no-print" fontSize="sm" color="var(--stake-text-muted)" whiteSpace="nowrap">
            {(() => {
              const netRaw = parseFloat(selectedEmployee?.net_salary) || 0;
              const roundedNet = Math.round(netRaw / 5) * 5;
              const diff = roundedNet - netRaw;
              const sign = diff >= 0 ? '+' : '';
              return ` (فروقات تقريب ${sign}${diff.toFixed(2)})`;
            })()}
          </Text>
        </HStack>
      </ModalFooter>
    </ModalContent>
  </Modal>
  );
};

export default WeeklySalaryDetailsModal;

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  Icon,
  Tooltip,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Center,
  Switch,
  Menu,
  MenuButton,
  MenuList,
  Portal,
  IconButton,
} from '@chakra-ui/react';
import {
  FiUsers,
  FiSettings,
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
  FiPrinter,
} from 'react-icons/fi';
import EnglishKeyTooltip from '../EnglishKeyTooltip';
import PagePanelToggle from '../PagePanelToggle';
import { getFinancialTableColumnClass } from '../../utils/financialColumnClasses';
import { getPreferredEmployeeName } from '../../utils/salary/weeklySalaryHelpers';
import { WEEKLY_MAIN_TABLE_ALLOWED } from '../../utils/salary/weeklySalaryConstants';

export default function WeeklySalaryTablePanel({
  loading,
  isNoWeeklyDataToShow,
  filteredData,
  mainTableColumns,
  weeklyTotals,
  fmtCurrency,
  onSort,
  onViewDetails,
  weeklyPeriodIncompleteCount,
  selectedDateRange,
  weeklySalaryHeaderCollapsed,
  onToggleHeaderCollapsed,
  dateRangeLabel,
  weeklyMainColumns,
  onToggleWeeklyMainColumn,
  onMoveWeeklyMainColumn,
  onRefresh,
  onPrintReport,
  onPrintAll,
  onScrollToDatePicker,
}) {
  return (
    <Box
      className="stake-card weekly-salary-main-card"
      overflow="hidden"
      w="100%"
      maxW="100%"
      flex="1"
      minH="0"
      display="flex"
      flexDirection="column"
      border="1px solid var(--stake-border-primary, #2d3a4d)"
      borderRadius="2xl"
      boxShadow="var(--stake-shadow-lg, 0 10px 25px rgba(0,0,0,0.35))"
    >
      <Box p="0" className="weekly-salary-main-card-body" flex="1" minH="0" display="flex" flexDirection="column">
        {weeklyPeriodIncompleteCount > 0 && (
          <Box px={{ base: 4, md: 5 }} pt="4">
            <Alert
              status="warning"
              className="tp-incomplete-alert"
              borderRadius="xl"
              alignItems="center"
              flexWrap="wrap"
              gap={2}
            >
              <AlertIcon />
              <VStack align="start" spacing="1" flex="1">
                <AlertTitle>يوجد سجلات ناقصة</AlertTitle>
                <AlertDescription>
                  لا يمكن طباعة التقرير أو طباعة الكل قبل استكمال حقول الحضور والانصراف (
                  {weeklyPeriodIncompleteCount} سجل). يُرجى الإصلاح من إدارة الحضور أو من تفاصيل الموظف.
                </AlertDescription>
              </VStack>
              <Button
                as={Link}
                to="/unified-attendance"
                state={{
                  fromWeeklySalary: true,
                  dateRange: [
                    selectedDateRange[0]?.format('YYYY-MM-DD'),
                    selectedDateRange[1]?.format('YYYY-MM-DD'),
                  ],
                  statusFilter: 'incomplete',
                }}
                size="sm"
                variant="outline"
                className="tp-incomplete-alert__action"
              >
                إدارة الحضور والانصراف
              </Button>
            </Alert>
          </Box>
        )}
        <HStack
          justify="space-between"
          align="center"
          mb="2"
          px={{ base: 3, md: 4 }}
          pt="2"
          pb="1"
          className="fp-list-toolbar weekly-salary-list-toolbar"
          flexWrap={{ base: 'wrap', lg: 'nowrap' }}
          rowGap={2}
          columnGap={3}
        >
          <HStack spacing={2} align="center" flexShrink={0} minW={0} className="tp-list-toolbar__title-group">
            <PagePanelToggle
              collapsed={weeklySalaryHeaderCollapsed}
              onToggle={onToggleHeaderCollapsed}
              variant="table"
            />
            <Heading size="md" className="stake-heading-3 weekly-salary-list-heading" flexShrink={0}>
              قائمة الأجور الاسبوعية
            </Heading>
            {weeklySalaryHeaderCollapsed && dateRangeLabel ? (
              <Text
                className="stake-text-secondary weekly-salary-list-period"
                fontSize="sm"
                fontWeight="500"
                whiteSpace="nowrap"
                flexShrink={0}
                title={`فترة الأجور: ${dateRangeLabel}`}
              >
                — {dateRangeLabel}
              </Text>
            ) : null}
          </HStack>

          <HStack
            spacing="3"
            flexWrap="wrap"
            rowGap="2"
            align="center"
            justify="flex-end"
            flex={{ base: '1 1 100%', lg: '0 1 auto' }}
            minW={0}
          >
            <Menu>
              <MenuButton
                as={Button}
                size="sm"
                h="44px"
                minH="44px"
                leftIcon={<FiSettings />}
                rightIcon={<FiChevronDown />}
                className="stake-btn-secondary"
                borderRadius="lg"
                borderColor="var(--stake-border-primary)"
                _hover={{ bg: 'var(--stake-bg-hover)' }}
              >
                تنظيم الأعمدة
              </MenuButton>
              <Portal>
                <MenuList
                  zIndex={2000}
                  minW="260px"
                  className="stake-card"
                  bg="var(--stake-content-surface-raised, var(--stake-bg-card))"
                  borderColor="var(--stake-border-primary)"
                >
                  {weeklyMainColumns.map((col) => (
                    <Box key={col.id} px="3" py="2">
                      <HStack justify="space-between">
                        <HStack>
                          <Switch isChecked={col.visible} onChange={() => onToggleWeeklyMainColumn(col.id)} />
                          <Text fontSize="sm">{col.label}</Text>
                        </HStack>
                        <HStack spacing="1">
                          <IconButton
                            aria-label="أعلى"
                            icon={<FiChevronUp />}
                            size="xs"
                            variant="ghost"
                            onClick={() => onMoveWeeklyMainColumn(col.id, 'up')}
                            isDisabled={weeklyMainColumns.findIndex((c) => c.id === col.id) <= 0}
                          />
                          <IconButton
                            aria-label="أسفل"
                            icon={<FiChevronDown />}
                            size="xs"
                            variant="ghost"
                            onClick={() => onMoveWeeklyMainColumn(col.id, 'down')}
                            isDisabled={
                              weeklyMainColumns.findIndex((c) => c.id === col.id) >= weeklyMainColumns.length - 1
                            }
                          />
                        </HStack>
                      </HStack>
                    </Box>
                  ))}
                </MenuList>
              </Portal>
            </Menu>
            <Box position="relative" display="inline-block">
              <Tooltip label="تحديث القائمة من الخادم" placement="top" hasArrow openDelay={400}>
                <Box as="span" display="inline-block">
                  <Button
                    leftIcon={<FiRefreshCw />}
                    className="stake-btn-secondary expandable-btn"
                    size="md"
                    onClick={onRefresh}
                    isLoading={loading}
                    h="44px"
                    w="44px"
                    minW="44px"
                    px="0"
                    fontWeight="600"
                    transition="all 0.3s ease"
                    overflow="hidden"
                    justifyContent="center"
                    _hover={{ w: '120px', minW: '120px', px: '6', justifyContent: 'flex-start' }}
                  >
                    <Text
                      position="absolute"
                      left="50px"
                      top="50%"
                      transform="translateY(-50%)"
                      opacity="0"
                      transition="opacity 0.3s ease 0.1s"
                      whiteSpace="nowrap"
                      fontSize="14px"
                      fontWeight="600"
                      color="inherit"
                      className="expandable-text"
                    >
                      تحديث
                    </Text>
                  </Button>
                </Box>
              </Tooltip>
            </Box>
            <Box position="relative" display="inline-block">
              <Tooltip
                label={
                  isNoWeeklyDataToShow
                    ? 'لا توجد بيانات للعرض'
                    : weeklyPeriodIncompleteCount > 0
                      ? 'أكمل الحقول الناقصة أولاً'
                      : 'طباعة تقرير مجمّع للفترة'
                }
                placement="top"
                hasArrow
                openDelay={400}
                shouldWrapChildren
              >
                <Box as="span" display="inline-block">
                  <Button
                    leftIcon={<FiPrinter />}
                    className="stake-btn-success expandable-btn"
                    size="md"
                    h="44px"
                    w="44px"
                    minW="44px"
                    px="0"
                    fontWeight="600"
                    transition="all 0.3s ease"
                    overflow="hidden"
                    justifyContent="center"
                    onClick={onPrintReport}
                    isDisabled={
                      !selectedDateRange?.[0] ||
                      !selectedDateRange?.[1] ||
                      weeklyPeriodIncompleteCount > 0 ||
                      isNoWeeklyDataToShow
                    }
                    _hover={{ w: '140px', minW: '140px', px: '6', justifyContent: 'flex-start' }}
                  >
                    <Text
                      position="absolute"
                      left="50px"
                      top="50%"
                      transform="translateY(-50%)"
                      opacity="0"
                      transition="opacity 0.3s ease 0.1s"
                      whiteSpace="nowrap"
                      fontSize="14px"
                      fontWeight="600"
                      color="inherit"
                      className="expandable-text"
                    >
                      طباعة تقرير
                    </Text>
                  </Button>
                </Box>
              </Tooltip>
            </Box>
            <Box position="relative" display="inline-block">
              <Tooltip
                label={
                  isNoWeeklyDataToShow
                    ? 'لا توجد بيانات للعرض'
                    : weeklyPeriodIncompleteCount > 0
                      ? 'أكمل الحقول الناقصة أولاً'
                      : 'طباعة أوراق صرف لجميع الموظفين'
                }
                placement="top"
                hasArrow
                openDelay={400}
                shouldWrapChildren
              >
                <Box as="span" display="inline-block">
                  <Button
                    leftIcon={<FiPrinter />}
                    className="stake-btn-primary expandable-btn weekly-salary-print-all-btn"
                    size="md"
                    h="44px"
                    w="44px"
                    minW="44px"
                    px="0"
                    fontWeight="600"
                    transition="all 0.3s ease"
                    overflow="hidden"
                    justifyContent="center"
                    color="white"
                    bg="var(--stake-primary, #3b82f6)"
                    onClick={onPrintAll}
                    isDisabled={isNoWeeklyDataToShow || weeklyPeriodIncompleteCount > 0}
                    _hover={{
                      w: '120px',
                      minW: '120px',
                      px: '6',
                      justifyContent: 'flex-start',
                      bg: 'var(--stake-primary, #2563eb)',
                    }}
                  >
                    <Text
                      position="absolute"
                      left="50px"
                      top="50%"
                      transform="translateY(-50%)"
                      opacity="0"
                      transition="opacity 0.3s ease 0.1s"
                      whiteSpace="nowrap"
                      fontSize="14px"
                      fontWeight="600"
                      color="inherit"
                      className="expandable-text"
                    >
                      طباعة الكل
                    </Text>
                  </Button>
                </Box>
              </Tooltip>
            </Box>
          </HStack>
        </HStack>
        {loading ? (
          <Center className="weekly-salary-loading-state">
            <VStack spacing="3">
              <Spinner size="lg" color="green.500" />
              <Text color="gray.600" fontSize="sm">
                جاري تحميل البيانات...
              </Text>
            </VStack>
          </Center>
        ) : isNoWeeklyDataToShow ? (
          <Box className="weekly-salary-empty-state" px={{ base: 3, md: 4 }}>
            <VStack spacing="4" maxW="md" mx="auto">
              <Icon as={FiUsers} boxSize="10" className="stake-text-secondary" opacity={0.85} />
              <Text color="gray.600" fontSize="md" textAlign="center" fontWeight="600">
                لا توجد بيانات للعرض في هذه الفترة
              </Text>
              <Text fontSize="sm" className="stake-text-secondary" textAlign="center" lineHeight="tall">
                جرّب تغيير نطاق التواريخ أعلاه أو التحقق من أن الموظفين لديهم أجر أسبوعي ضمن الفترة.
              </Text>
              <Button size="sm" className="stake-btn-secondary" borderRadius="lg" onClick={onScrollToDatePicker}>
                الانتقال إلى اختيار الفترة
              </Button>
            </VStack>
          </Box>
        ) : (
          <TableContainer
            overflowY="auto"
            overflowX="auto"
            w="100%"
            maxW="100%"
            className="weekly-salary-main-table-scroll weekly-salary-table-scroll"
          >
            <Table
              variant="simple"
              size="xs"
              w="100%"
              layout="fixed"
              className="stake-table main-content compact-data-table"
              style={{ fontFamily: 'var(--table-font-family)' }}
              sx={{
                'th, td': {
                  fontFamily: 'var(--table-font-family)',
                  fontSize: 'var(--table-font-size)',
                  fontWeight: 'var(--table-font-weight)',
                },
                maxWidth: '100%',
              }}
            >
              <colgroup>
                {(() => {
                  const cols = mainTableColumns;
                  const codeW = 'var(--fp-col-code-width)';
                  const hasCode = cols.some((c) => {
                    const k = String(c.column_key || c.column_name || c.name || '').toLowerCase();
                    return k === 'employee_code';
                  });
                  const rest = hasCode ? Math.max(cols.length - 1, 1) : cols.length;
                  return cols.map((col) => {
                    const sk = String(col.column_key || col.column_name || col.name || '').toLowerCase();
                    const isCode = sk === 'employee_code';
                    return (
                      <col
                        key={col.id}
                        style={
                          isCode && hasCode
                            ? { width: codeW, minWidth: codeW, maxWidth: codeW }
                            : hasCode
                              ? { width: `calc((100% - ${codeW}) / ${rest})` }
                              : { width: `calc(100% / ${cols.length})` }
                        }
                      />
                    );
                  });
                })()}
              </colgroup>
              <Thead
                sx={{
                  '& th': {
                    color: 'var(--stake-table-header-text, var(--stake-text-primary)) !important',
                  },
                }}
              >
                <Tr>
                  {mainTableColumns.map((column) => {
                    const sortKey = column.column_key || column.column_name || column.name;
                    const headerLabel =
                      WEEKLY_MAIN_TABLE_ALLOWED.find(
                        (a) => a.key === sortKey || a.label === (column.display_name_ar || column.column_name_ar)
                      )?.label || column.display_name_ar;
                    const isTotalEntCol = sortKey === 'total_entitlements';
                    const isTotalDedCol = sortKey === 'total_deductions';
                    const isNetCol = sortKey === 'net_salary';
                    let aggregateValue = null;
                    if (isTotalEntCol) aggregateValue = weeklyTotals.totalEntitlements;
                    if (isTotalDedCol) aggregateValue = weeklyTotals.totalDeductions;
                    if (isNetCol) aggregateValue = weeklyTotals.netSalary;
                    return (
                      <Th
                        key={column.id}
                        cursor="pointer"
                        textAlign="center"
                        onClick={() => onSort(sortKey)}
                        className={getFinancialTableColumnClass(column)}
                      >
                        <EnglishKeyTooltip englishKey={sortKey}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <span>{headerLabel}</span>
                            {aggregateValue !== null && (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  color: isTotalEntCol
                                    ? 'var(--fp-ent-hdr-text)'
                                    : isTotalDedCol
                                      ? 'var(--fp-ded-hdr-text)'
                                      : 'var(--fp-net-hdr-text)',
                                }}
                              >
                                {fmtCurrency
                                  ? fmtCurrency(aggregateValue || 0)
                                  : `${aggregateValue || 0}`.toLocaleString() + ' ج.م'}
                              </span>
                            )}
                          </div>
                        </EnglishKeyTooltip>
                      </Th>
                    );
                  })}
                </Tr>
              </Thead>
              <Tbody>
                {filteredData.map((row, index) => (
                  <Tr
                    key={row.id || index}
                    onDoubleClick={() => onViewDetails(row)}
                    cursor="pointer"
                    title="اضغط مرتين لعرض التفاصيل"
                    _hover={{ bg: 'var(--stake-bg-hover)' }}
                  >
                    {mainTableColumns.map((column) => {
                      const key = column.column_key || column.column_name || column.name;
                      const value = row[key] ?? row[column.display_name_ar];
                      const isCurrency = column.is_currency === 1;
                      const colClass = getFinancialTableColumnClass(column);
                      const preferredName = getPreferredEmployeeName(row);
                      return (
                        <Td key={column.id} className={colClass}>
                          {key === 'name' ||
                          key === 'employee_name' ||
                          column.display_name_ar === 'الاسم' ||
                          column.display_name_ar === 'الموظف' ? (
                            <Text
                              fontWeight="medium"
                              fontSize="sm"
                              className="fp-cell-text"
                              whiteSpace="normal"
                              wordBreak="break-word"
                              overflowWrap="anywhere"
                              lineHeight="short"
                            >
                              {preferredName !== '-' ? preferredName : value || 'غير محدد'}
                            </Text>
                          ) : key === 'cost_center' ||
                            column.display_name_ar === 'التكلفة' ||
                            column.display_name_ar === 'مركز التكلفة' ? (
                            value ? (
                              <Badge
                                colorScheme={(() => {
                                  const color = row.cost_center_color || 'blue';
                                  const c = String(color).toLowerCase().trim();
                                  const map = {
                                    red: 'red',
                                    blue: 'blue',
                                    green: 'green',
                                    yellow: 'yellow',
                                    purple: 'purple',
                                    pink: 'pink',
                                    orange: 'orange',
                                  };
                                  return map[c] || 'gray';
                                })()}
                                variant="solid"
                                px="2"
                                py="1"
                                borderRadius="md"
                                fontSize="xs"
                              >
                                {value}
                              </Badge>
                            ) : (
                              <Text fontSize="sm" color="gray.600">
                                -
                              </Text>
                            )
                          ) : (
                            <Text
                              className={`fp-cell-text${isCurrency ? ' fp-money' : ''}`}
                              fontWeight={
                                key === 'total_entitlements' || key === 'total_deductions' || key === 'net_salary'
                                  ? 'bold'
                                  : 'medium'
                              }
                              fontSize={key === 'net_salary' ? 'md' : 'sm'}
                            >
                              {isCurrency && fmtCurrency ? fmtCurrency(value || 0) : (value ?? '-')}
                            </Text>
                          )}
                        </Td>
                      );
                    })}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
}

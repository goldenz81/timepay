import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Flex,
  Icon,
  Divider,
} from '@chakra-ui/react';
import { FiCalendar } from 'react-icons/fi';
import WeeklySalaryFiltersToolbar from './WeeklySalaryFiltersToolbar';

export default function WeeklySalaryPageHeader({
  weeklyHeaderSubtitle,
  weeklyHeaderStatChips,
  searchTerm,
  onSearchTermChange,
  onSearchFocus,
  onSearchBlur,
  departmentFilter,
  onDepartmentFilterChange,
  departments,
  onClearFilters,
  weeklyDateToolbarRef,
  isAutomaticMode,
  onAutomaticModeChange,
  rangePickerValue,
  onRangePickerChange,
  onSetCurrentWeek,
  onSetPreviousWeek,
}) {
  return (
    <Box
      mb={{ base: 1.5, md: 2 }}
      className="weekly-salary-header-shell tp-weekly-salary-page-header"
      flexShrink={0}
      w="100%"
      maxW="100%"
    >
      <Box
        className="weekly-salary-toolbar-card tp-page-header-toolbar"
        w="100%"
        maxW="100%"
        px={{ base: 3, md: 5 }}
        py={{ base: 3, md: 4 }}
      >
        <VStack align="stretch" spacing={{ base: 2.5, md: 3 }} w="100%">
          <Flex
            align={{ base: 'stretch', md: 'center' }}
            gap={{ base: 3, md: 4 }}
            flexWrap="wrap"
            justify="space-between"
            className="tp-page-header-top"
          >
            <HStack spacing={3} align="center" minW={0} flex="1 1 220px" className="tp-page-header-brand">
              <Flex
                align="center"
                justify="center"
                w={{ base: '42px', md: '48px' }}
                h={{ base: '42px', md: '48px' }}
                borderRadius="xl"
                flexShrink={0}
                className="weekly-salary-header-icon-wrap tp-weekly-salary-header-icon-wrap"
                aria-hidden
              >
                <Icon as={FiCalendar} boxSize={{ base: 5, md: 6 }} />
              </Flex>
              <VStack align="flex-start" spacing={0.5} minW={0}>
                <Heading
                  className="stake-heading-3 weekly-salary-page-title tp-page-header-title"
                  size="md"
                  lineHeight="short"
                  mb={0}
                >
                  إدارة الراتب الأسبوعي
                </Heading>
                <Text className="tp-page-header-subtitle" noOfLines={2}>
                  {weeklyHeaderSubtitle}
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
              {weeklyHeaderStatChips.map((statChip) => (
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

          <WeeklySalaryFiltersToolbar
            searchTerm={searchTerm}
            onSearchTermChange={onSearchTermChange}
            onSearchFocus={onSearchFocus}
            onSearchBlur={onSearchBlur}
            departmentFilter={departmentFilter}
            onDepartmentFilterChange={onDepartmentFilterChange}
            departments={departments}
            onClearFilters={onClearFilters}
            weeklyDateToolbarRef={weeklyDateToolbarRef}
            isAutomaticMode={isAutomaticMode}
            onAutomaticModeChange={onAutomaticModeChange}
            rangePickerValue={rangePickerValue}
            onRangePickerChange={onRangePickerChange}
            onSetCurrentWeek={onSetCurrentWeek}
            onSetPreviousWeek={onSetPreviousWeek}
          />
        </VStack>
      </Box>
    </Box>
  );
}

import React from 'react';
import {
  Box,
  Flex,
  HStack,
  Text,
  Button,
  Input,
  InputGroup,
  InputRightElement,
  Select,
  IconButton,
  Switch,
  Icon,
} from '@chakra-ui/react';
import { DatePicker } from 'antd';
import { FiSearch, FiX } from 'react-icons/fi';

export default function WeeklySalaryFiltersToolbar({
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
    <Flex
      w="100%"
      flexWrap={{ base: 'wrap', sm: 'nowrap' }}
      align="stretch"
      justify="space-between"
      gap={3}
      rowGap={3}
      className="weekly-salary-header-row weekly-salary-header-tools weekly-salary-toolbar-split"
    >
      <Flex
        flexWrap="nowrap"
        align="center"
        alignContent="center"
        gap={2}
        minW={0}
        flex={{ base: '1 1 100%', sm: '0 1 auto' }}
        className="fp-toolbar-zone--filters"
      >
        <HStack
          spacing={2}
          align="center"
          flexShrink={1}
          minW={0}
          className="fp-toolbar-filter-inner"
          flexWrap="nowrap"
          rowGap={2}
          w="auto"
        >
          <Box flex="1 1 0" minW={{ base: '80px', md: '120px' }} maxW={{ base: '140px', md: '200px' }} flexShrink={1}>
            <InputGroup size="sm">
              <Input
                placeholder="البحث بالاسم أو الكود..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                onFocus={onSearchFocus}
                onBlur={onSearchBlur}
                borderRadius="md"
                className="stake-input"
                bg="var(--stake-bg-secondary)"
                border="1px solid"
                borderColor="var(--stake-border-primary)"
                color="var(--stake-text-primary)"
                pr="10"
                fontSize="sm"
                _focus={{
                  borderColor: 'var(--stake-border-accent)',
                  boxShadow: '0 0 0 1px var(--stake-border-accent)',
                  bg: 'var(--stake-bg-hover)',
                }}
                _hover={{ borderColor: 'var(--stake-border-accent)', bg: 'var(--stake-bg-hover)' }}
                _placeholder={{ color: 'var(--stake-text-secondary)', fontWeight: '500' }}
              />
              <InputRightElement>
                <Icon as={FiSearch} color="var(--stake-text-secondary)" boxSize="4" />
              </InputRightElement>
            </InputGroup>
          </Box>
          <Select
            placeholder="جميع الأقسام"
            value={departmentFilter}
            onChange={(e) => onDepartmentFilterChange(e.target.value)}
            size="sm"
            flex="0 1 auto"
            w={{ base: '96px', md: '140px' }}
            maxW="160px"
            flexShrink={1}
            minW="72px"
            borderRadius="md"
            className="stake-input"
            bg="var(--stake-bg-secondary)"
            border="1px solid"
            borderColor="var(--stake-border-primary)"
            color="var(--stake-text-primary)"
            fontSize="sm"
            _focus={{ borderColor: 'var(--stake-border-accent)' }}
            _hover={{ borderColor: 'var(--stake-border-accent)' }}
          >
            {departments.map((dept) => (
              <option key={dept.id} value={dept.name}>
                {dept.description || dept.name}
              </option>
            ))}
          </Select>
          <IconButton
            icon={<FiX />}
            variant="ghost"
            size="sm"
            aria-label="مسح الفلاتر"
            className="weekly-salary-clear-filters-btn"
            onClick={onClearFilters}
            color="var(--stake-text-primary)"
            fontSize="sm"
            fontWeight="medium"
            border="none"
            bg="transparent"
            h="36px"
            minW="36px"
            flexShrink={0}
            _hover={{ bg: 'transparent', opacity: 0.85 }}
            _active={{ bg: 'transparent' }}
            _focus={{ boxShadow: 'none' }}
          />
        </HStack>
      </Flex>
      <Box
        ref={weeklyDateToolbarRef}
        className="weekly-salary-date-toolbar-anchor fp-toolbar-zone--dates"
        flex={{ base: '1 1 100%', sm: '1 1 0' }}
        minW={0}
        display="flex"
        alignItems="center"
      >
        <HStack
          spacing={2}
          align="center"
          flexWrap="nowrap"
          justify={{ base: 'flex-start', md: 'flex-end' }}
          w="100%"
          rowGap={2}
          minW={0}
          className="weekly-salary-dates-inner"
        >
          <HStack spacing="2" align="center" flexShrink={0} className="weekly-salary-mode-toggle">
            <Text fontSize="sm" className="stake-text-secondary" whiteSpace="nowrap">
              يدوي
            </Text>
            <Switch
              isChecked={isAutomaticMode}
              onChange={(e) => onAutomaticModeChange(e.target.checked)}
              colorScheme="blue"
              size="sm"
            />
            <Text fontSize="sm" className="stake-text-secondary" whiteSpace="nowrap">
              تلقائي
            </Text>
          </HStack>
          <DatePicker.RangePicker
            className="weekly-salary-range-picker"
            value={rangePickerValue}
            onChange={onRangePickerChange}
            size="middle"
            placeholder={['من', 'إلى']}
            format="DD/MM/YYYY"
            picker="date"
            style={{
              borderRadius: '10px',
              height: '36px',
              border: '1px solid var(--stake-border-primary, #2f4553)',
              backgroundColor: 'var(--stake-bg-card, #111827)',
              color: 'var(--stake-text-primary, #fff)',
            }}
          />
          {isAutomaticMode && (
            <HStack spacing="2" flexWrap="nowrap" flexShrink={0} className="weekly-salary-week-btns">
              <Button size="xs" className="stake-btn-secondary" onClick={onSetCurrentWeek}>
                الأسبوع الحالي
              </Button>
              <Button size="xs" className="stake-btn-secondary" onClick={onSetPreviousWeek}>
                الأسبوع السابق
              </Button>
            </HStack>
          )}
        </HStack>
      </Box>
    </Flex>
  );
}

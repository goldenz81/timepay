import React, { useState } from 'react';
import {
  Box,
  Flex,
  Input,
  InputGroup,
  InputRightElement,
  Icon as ChakraIcon,
  Button,
  Text,
} from '@chakra-ui/react';
import { FiSearch, FiX, FiChevronDown, FiCheck } from 'react-icons/fi';

function DropSelect({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <Box position="relative">
      <Button
        type="button"
        onClick={() => setOpen(!open)}
        h="44px"
        px={3}
        borderRadius="12px"
        bg="#0F172A"
        border="1px solid #1F2A44"
        color="#fff"
        fontSize="12px"
        fontWeight="normal"
        minW="120px"
        justifyContent="space-between"
        rightIcon={<ChakraIcon as={FiChevronDown} boxSize={3.5} color="rgba(255,255,255,0.3)" />}
        _hover={{ bg: '#111C33' }}
        _active={{ bg: '#111C33' }}
      >
        <Box as="span" display="flex" alignItems="center" gap={2} overflow="hidden">
          <Text as="span" fontSize="11px" color="rgba(255,255,255,0.4)" whiteSpace="nowrap">
            {label}:
          </Text>
          <Text as="span" fontWeight="500" isTruncated maxW="90px">
            {value}
          </Text>
        </Box>
      </Button>
      {open && (
        <>
          <Box position="fixed" inset="0" zIndex="20" onClick={() => setOpen(false)} />
          <Box
            position="absolute"
            top="48px"
            right="0"
            zIndex="30"
            w="200px"
            borderRadius="12px"
            bg="#0F172A"
            border="1px solid #1F2A44"
            boxShadow="0 12px 24px rgba(0,0,0,0.35)"
            py={1}
            maxH="280px"
            overflowY="auto"
          >
            {options.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant="ghost"
                w="100%"
                justifyContent="space-between"
                borderRadius="0"
                px={3.5}
                py={2.5}
                h="auto"
                fontSize="12px"
                fontWeight="normal"
                color={value === opt.label ? '#93c5fd' : 'rgba(255,255,255,0.7)'}
                bg={value === opt.label ? 'rgba(255,255,255,0.04)' : 'transparent'}
                _hover={{ bg: 'rgba(255,255,255,0.06)' }}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                rightIcon={value === opt.label ? <ChakraIcon as={FiCheck} boxSize={3.5} /> : undefined}
              >
                {opt.label}
              </Button>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

export function FilterBar({
  search,
  setSearch,
  salaryTypeFilter,
  setSalaryTypeFilter,
  departmentFilter,
  setDepartmentFilter,
  costCenterFilter,
  setCostCenterFilter,
  statusFilter,
  setStatusFilter,
  departments = [],
  costCenters = [],
  hasFilters,
  onClear,
}) {
  const salaryLabel =
    salaryTypeFilter === 'Monthly' ? 'شهري' : salaryTypeFilter === 'Weekly' ? 'أسبوعي' : 'الكل';
  const statusLabel =
    statusFilter === 'active' ? 'نشط' : statusFilter === 'inactive' ? 'غير نشط' : 'الكل';

  const salaryOptions = [
    { value: '', label: 'الكل' },
    { value: 'Weekly', label: 'أسبوعي' },
    { value: 'Monthly', label: 'شهري' },
  ];
  const deptOptions = [
    { value: '', label: 'الكل' },
    ...departments.map((d) => ({ value: d.name, label: d.description || d.name })),
  ];
  const costOptions = [
    { value: '', label: 'الكل' },
    ...costCenters.map((c) => ({ value: c.name, label: c.name })),
  ];
  const statusOptions = [
    { value: 'all', label: 'الكل' },
    { value: 'active', label: 'نشط' },
    { value: 'inactive', label: 'غير نشط' },
  ];

  return (
    <Box borderRadius="16px" bg="#151E32" border="1px solid #1F2A44" p={3} w="100%">
      <Flex gap={3} align="center" justify="space-between" wrap="wrap">
        <Flex gap={2} align="center" wrap="wrap" flex="1" minW="0">
          <Box position="relative" flex="1" maxW="340px" minW="200px">
            <InputGroup>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="البحث بالاسم أو الكود..."
                h="44px"
                pr={10}
                borderRadius="12px"
                bg="#0F172A"
                border="1px solid #1F2A44"
                color="#fff"
                fontSize="13px"
                _placeholder={{ color: 'rgba(255,255,255,0.3)' }}
                _focus={{ borderColor: 'rgba(59,130,246,0.4)', boxShadow: 'none' }}
                _hover={{ borderColor: '#2A3D64' }}
              />
              <InputRightElement h="44px" pointerEvents="none">
                <ChakraIcon as={FiSearch} boxSize={4} color="rgba(255,255,255,0.3)" />
              </InputRightElement>
            </InputGroup>
          </Box>
          <DropSelect label="نوع المرتب" value={salaryLabel} options={salaryOptions} onChange={setSalaryTypeFilter} />
          <DropSelect
            label="القسم"
            value={
              departmentFilter
                ? departments.find((d) => d.name === departmentFilter)?.description || departmentFilter
                : 'الكل'
            }
            options={deptOptions}
            onChange={setDepartmentFilter}
          />
          <DropSelect
            label="التكلفة"
            value={costCenterFilter || 'الكل'}
            options={costOptions}
            onChange={setCostCenterFilter}
          />
          <DropSelect label="الحالة" value={statusLabel} options={statusOptions} onChange={setStatusFilter} />
        </Flex>
        {hasFilters && (
          <Button
            type="button"
            onClick={onClear}
            h="44px"
            px={4}
            borderRadius="12px"
            bg="rgba(255,255,255,0.06)"
            border="1px solid rgba(255,255,255,0.1)"
            color="#fff"
            fontSize="12px"
            fontWeight="normal"
            leftIcon={<ChakraIcon as={FiX} boxSize={4} />}
            _hover={{ bg: 'rgba(255,255,255,0.08)' }}
            flexShrink={0}
          >
            مسح الفلاتر
          </Button>
        )}
      </Flex>
    </Box>
  );
}

export default FilterBar;

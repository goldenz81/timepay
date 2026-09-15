import React from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  Text,
  Checkbox,
  HStack,
  Circle,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
} from '@chakra-ui/react';
import {
  FiCheckCircle,
  FiXCircle,
  FiMoreVertical,
  FiEye,
  FiEdit,
  FiDollarSign,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
} from 'react-icons/fi';

function getInitials(name) {
  if (!name) return '؟';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] || '') + (parts[1][0] || '');
}

function insured(v) {
  return v === 1 || v === true || v === '1' || v === 'true';
}

const SORTABLE = new Set([
  'employee_code',
  'AC-No.',
  'fingerprint_code',
  'name',
  'base_salary',
  'discrimination_incentive_allowance',
  'salary_type',
  'status',
  'is_insured',
  'department',
  'cost_center',
  'position',
  'location',
]);

const sortKeyOf = (colId) => (colId === 'fingerprint_code' ? 'AC-No.' : colId);

export function EmployeeTable({
  data = [],
  visibleCols = [],
  selectedRowKeys = [],
  onToggleAll,
  onToggleOne,
  sortConfig,
  onSort,
  onRowDoubleClick,
  onView,
  onEdit,
  onSalary,
  onDelete,
  formatCurrency,
}) {
  const fmt = formatCurrency || ((v) => `${Number(v || 0).toLocaleString('en-US')} ج.م`);
  const allChecked = data.length > 0 && selectedRowKeys.length === data.length;
  const someChecked = selectedRowKeys.length > 0 && selectedRowKeys.length < data.length;

  const renderCell = (emp, colId) => {
    switch (colId) {
      case 'employee_code':
        return (
          <Badge variant="subtle" borderRadius="full" px="2.5" py="1" fontFamily="mono" fontSize="12px">
            #{emp.employee_code}
          </Badge>
        );
      case 'fingerprint_code':
        return (
          <Text fontSize="12px" color="gray.400" fontFamily="mono">
            {emp['AC-No.'] || '-'}
          </Text>
        );
      case 'name':
        return (
          <HStack spacing={3}>
            <Circle size="32px" bg="#1E2D4A" border="1px solid #2A3D64" color="#fff" fontSize="11px" fontWeight="bold" flexShrink={0}>
              {getInitials(emp.name_ar || emp.name)}
            </Circle>
            <Box minW="0">
              <Text fontWeight="medium" fontSize="sm" color="#fff" noOfLines={1}>
                {emp.name_ar || emp.name}
              </Text>
              {emp.position ? (
                <Text fontSize="11px" color="gray.500" noOfLines={1}>
                  {emp.position}
                </Text>
              ) : null}
            </Box>
          </HStack>
        );
      case 'base_salary':
        return (
          <Text fontWeight="semibold" color="#fff">
            {fmt(emp.base_salary || 0)}
          </Text>
        );
      case 'discrimination_incentive_allowance':
        return (
          <Text color="green.300">
            {emp.discrimination_incentive_allowance ? fmt(emp.discrimination_incentive_allowance) : '0 ج.م'}
          </Text>
        );
      case 'salary_type':
        return (
          <Badge
            colorScheme={emp.salary_type === 'Monthly' ? 'blue' : 'orange'}
            variant="subtle"
            borderRadius="full"
            px="2.5"
            py="1"
            fontSize="11px"
          >
            {emp.salary_type === 'Monthly' ? 'شهري' : 'أسبوعي'}
          </Badge>
        );
      case 'status':
        return (
          <Badge
            colorScheme={emp.status === 'active' ? 'green' : 'red'}
            variant="subtle"
            borderRadius="full"
            px="2.5"
            py="1"
            fontSize="11px"
          >
            {emp.status === 'active' ? 'نشط' : 'غير نشط'}
          </Badge>
        );
      case 'is_insured':
        return (
          <Icon
            as={insured(emp.is_insured) ? FiCheckCircle : FiXCircle}
            boxSize="18px"
            color={insured(emp.is_insured) ? 'green.400' : 'red.400'}
          />
        );
      case 'department':
        return (
          <Badge variant="subtle" borderRadius="full" px="2.5" py="1" fontSize="11px" colorScheme="purple">
            {emp.department_description || emp.department || '-'}
          </Badge>
        );
      case 'cost_center':
        return (
          <Text fontSize="12px" color="gray.400">
            {emp.salary_type === 'Weekly' ? emp.cost_center || '-' : '-'}
          </Text>
        );
      case 'position':
        return (
          <Text fontSize="12px" color="gray.400">
            {emp.position || '-'}
          </Text>
        );
      case 'location':
        return (
          <Badge variant="subtle" borderRadius="full" px="2.5" py="1" fontSize="11px">
            {emp.location || '-'}
          </Badge>
        );
      default:
        return <Text color="gray.500">-</Text>;
    }
  };

  return (
    <Box
      borderRadius="16px"
      border="1px solid #1F2A44"
      bg="#101A2E"
      overflow="hidden"
      w="100%"
    >
      <TableContainer maxH="62vh" minH="300px" overflowY="auto" overflowX="auto">
        <Table variant="simple" size="sm" w="100%">
          <Thead position="sticky" top="0" zIndex="10" bg="#121C33">
            <Tr h="44px">
              <Th w="40px" textAlign="center" borderBottom="1px solid #1F2A44">
                <Checkbox
                  isChecked={allChecked}
                  isIndeterminate={someChecked}
                  onChange={(e) => onToggleAll && onToggleAll(e.target.checked)}
                />
              </Th>
              {visibleCols.map((col) => {
                const sk = sortKeyOf(col.id);
                const canSort = SORTABLE.has(sk);
                const active = sortConfig && sortConfig.key === sk;
                return (
                  <Th
                    key={col.id}
                    fontSize="11px"
                    color="rgba(255,255,255,0.4)"
                    fontWeight="500"
                    borderBottom="1px solid #1F2A44"
                    whiteSpace="nowrap"
                    cursor={canSort ? 'pointer' : undefined}
                    onClick={canSort && onSort ? () => onSort(sk) : undefined}
                    _hover={canSort ? { color: 'rgba(255,255,255,0.8)' } : undefined}
                  >
                    {col.label}
                    {canSort && active ? (
                      <Icon
                        as={sortConfig.direction === 'asc' ? FiChevronUp : FiChevronDown}
                        boxSize={3}
                        display="inline"
                        ml={1}
                        verticalAlign="middle"
                      />
                    ) : null}
                  </Th>
                );
              })}
              <Th w="48px" borderBottom="1px solid #1F2A44" />
            </Tr>
          </Thead>
          <Tbody>
            {data.length === 0 ? (
              <Tr>
                <Td colSpan={visibleCols.length + 2} textAlign="center" py={10} color="gray.500">
                  لا توجد بيانات مطابقة
                </Td>
              </Tr>
            ) : (
              data.map((emp) => (
                <Tr
                  key={emp.id}
                  h="56px"
                  onDoubleClick={() => onRowDoubleClick && onRowDoubleClick(emp)}
                  cursor="pointer"
                  borderBottom="1px solid rgba(26,39,66,0.6)"
                  _hover={{ bg: 'rgba(255,255,255,0.03)' }}
                >
                  <Td textAlign="center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      isChecked={selectedRowKeys.includes(emp.id)}
                      onChange={(e) => onToggleOne && onToggleOne(emp, e.target.checked)}
                    />
                  </Td>
                  {visibleCols.map((col) => (
                    <Td key={col.id} fontSize="13px" color="rgba(255,255,255,0.8)" whiteSpace="nowrap">
                      {renderCell(emp, col.id)}
                    </Td>
                  ))}
                  <Td textAlign="center" onClick={(e) => e.stopPropagation()}>
                    <Menu placement="bottom-end">
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
                        color="gray.500"
                        _hover={{ color: '#fff', bg: 'rgba(255,255,255,0.06)' }}
                        aria-label="إجراءات"
                      />
                      <MenuList
                        bg="#0F172A"
                        borderColor="#1F2A44"
                        boxShadow="0 12px 24px rgba(0,0,0,0.35)"
                        borderRadius="12px"
                        fontSize="12px"
                      >
                        <MenuItem icon={<FiEye />} onClick={() => onView && onView(emp)}>
                          عرض
                        </MenuItem>
                        <MenuItem icon={<FiEdit />} onClick={() => onEdit && onEdit(emp)}>
                          تعديل
                        </MenuItem>
                        <MenuItem icon={<FiDollarSign />} onClick={() => onSalary && onSalary(emp)}>
                          احتساب راتب
                        </MenuItem>
                        <MenuItem icon={<FiTrash2 />} color="red.300" onClick={() => onDelete && onDelete(emp)}>
                          حذف
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default EmployeeTable;

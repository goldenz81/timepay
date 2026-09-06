import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  Box,
  Divider,
  Alert,
  AlertIcon,
  Icon,
  useColorModeValue
} from '@chakra-ui/react';
import {
  FiEye,
  FiCheck,
  FiX,
  FiInfo,
  FiAlertTriangle,
  FiSave,
  FiRefreshCw
} from 'react-icons/fi';

const ChangesPreviewModal = ({ isOpen, onClose, previewData, columns }) => {
  const successColor = useColorModeValue('green.100', 'green.900');
  const warningColor = useColorModeValue('orange.100', 'orange.900');
  const infoColor = useColorModeValue('blue.100', 'blue.900');

  // بيانات تجريبية للمعاينة
  const sampleData = [
    {
      id: 1,
      name: 'أحمد محمد',
      code: 'EMP001',
      basic_salary: 5000,
      daily_wage: 166.67,
      hourly_wage: 20.83,
      overtime_hours: 10,
      overtime_value: 312.5,
      regular_days: 25,
      regular_value: 4166.75,
      transport_allowance: 200,
      special_bonus: 500,
      loan: 1000,
      total_entitlements: 6000,
      absent_days: 2,
      absent_value: 333.34,
      late_hours: 5,
      late_value: 104.15,
      insurance: 250,
      loan_installment: 200,
      total_deductions: 887.49,
      net_salary: 5112.51
    },
    {
      id: 2,
      name: 'فاطمة أحمد',
      code: 'EMP002',
      basic_salary: 4500,
      daily_wage: 150,
      hourly_wage: 18.75,
      overtime_hours: 8,
      overtime_value: 225,
      regular_days: 28,
      regular_value: 4200,
      transport_allowance: 150,
      special_bonus: 300,
      loan: 0,
      total_entitlements: 4875,
      absent_days: 0,
      absent_value: 0,
      late_hours: 2,
      late_value: 37.5,
      insurance: 225,
      loan_installment: 0,
      total_deductions: 262.5,
      net_salary: 4612.5
    }
  ];

  const getColumnTypeColor = (type) => {
    const colors = {
      text: 'gray',
      number: 'blue',
      currency: 'green',
      date: 'purple',
      boolean: 'orange'
    };
    return colors[type] || 'gray';
  };

  const formatValue = (value, type) => {
    if (type === 'currency') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return value;
      return `${numValue.toFixed(2)} ج.م`;
    }
    if (type === 'number') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return value;
      return numValue.toString();
    }
    return value;
  };

  const getSampleValue = (columnName) => {
    const sample = sampleData[0];
    const mapping = {
      'الكود': sample.code,
      'كود الموظف': sample.code,
      'الاسم': sample.name,
      'الأساسي': sample.basic_salary,
      'القسم': 'المحاسبة',
      'التكلفة': 'المركز الرئيسي',
      'المستحقات': sample.total_entitlements,
      'المستقطعات': sample.total_deductions,
      'صافي المرتب': sample.net_salary,
      'الراتب الأساسي': sample.basic_salary,
      'الأجر الأسبوعي': sample.basic_salary / 4,
      'الأجر اليومي': sample.daily_wage,
      'أجر الساعة': sample.hourly_wage,
      'ساعات إضافي العمل': sample.overtime_hours,
      'ساعات إضافي العدلات': 5,
      'إجمالي ساعات الإضافي': sample.overtime_hours + 5,
      'قيمة الإضافي': sample.overtime_value,
      'أيام الانتظام': sample.regular_days,
      'قيمة الانتظام': sample.regular_value,
      'بدل مواصلات': sample.transport_allowance,
      'مكافأة خاصة': sample.special_bonus,
      'سلفة': sample.loan,
      'إجمالي المستحقات': sample.total_entitlements,
      'عدد أيام الغياب': sample.absent_days,
      'قيمة الغياب': sample.absent_value,
      'عدد ساعات التأخير': sample.late_hours,
      'قيمة أجمالي التأخير': sample.late_value,
      'قيمة التأمين': sample.insurance,
      'قسط السلفة': sample.loan_installment,
      'إجمالي المستقطعات': sample.total_deductions
    };
    return mapping[columnName] || '-';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader className="stake-heading-2">
          معاينة التغييرات
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto">
          <VStack spacing={6} align="stretch">
            {/* معلومات المعاينة */}
            <Alert status="info" bg={infoColor}>
              <AlertIcon as={FiInfo} />
              <VStack align="start" spacing={1}>
                <Text fontWeight="medium">معاينة التغييرات</Text>
                <Text fontSize="sm">
                  هذا عرض تجريبي لكيفية ظهور الأعمدة في صفحة الرواتب
                </Text>
              </VStack>
            </Alert>

            {/* إحصائيات الأعمدة */}
            <Box>
              <Text className="stake-heading-3" mb={3}>
                إحصائيات الأعمدة
              </Text>
              <HStack spacing={4} wrap="wrap">
                <Badge colorScheme="blue" variant="subtle" p={2}>
                  إجمالي الأعمدة: {columns.length}
                </Badge>
                <Badge colorScheme="green" variant="subtle" p={2}>
                  أعمدة مطلوبة: {columns.filter(col => col.required).length}
                </Badge>
                <Badge colorScheme="purple" variant="subtle" p={2}>
                  أعمدة محسوبة: {columns.filter(col => col.formula).length}
                </Badge>
                <Badge colorScheme="orange" variant="subtle" p={2}>
                  أعمدة نصية: {columns.filter(col => col.type === 'text').length}
                </Badge>
              </HStack>
            </Box>

            <Divider />

            {/* جدول المعاينة */}
            <Box>
              <Text className="stake-heading-3" mb={3}>
                معاينة الجدول
              </Text>
              <Box overflowX="auto">
                <Table className="stake-table" size="sm">
                  <Thead>
                    <Tr>
                      {columns.map((column, index) => (
                        <Th key={index} className="stake-th" minW="120px">
                          <VStack spacing={1}>
                            <Text fontSize="xs" fontWeight="bold">
                              {column.name}
                            </Text>
                            <Badge
                              colorScheme={getColumnTypeColor(column.type)}
                              variant="subtle"
                              fontSize="xs"
                            >
                              {column.type}
                            </Badge>
                            {column.required && (
                              <Badge colorScheme="red" variant="outline" fontSize="xs">
                                مطلوب
                              </Badge>
                            )}
                            {column.formula && (
                              <Badge colorScheme="blue" variant="outline" fontSize="xs">
                                معادلة
                              </Badge>
                            )}
                          </VStack>
                        </Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sampleData.map((employee, empIndex) => (
                      <Tr key={empIndex}>
                        {columns.map((column, colIndex) => (
                          <Td key={colIndex} className="stake-td">
                            <Text fontSize="xs">
                              {formatValue(
                                getSampleValue(column.name),
                                column.type
                              )}
                            </Text>
                          </Td>
                        ))}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Box>

            {/* الأعمدة المحسوبة */}
            {columns.filter(col => col.formula).length > 0 && (
              <Box>
                <Text className="stake-heading-3" mb={3}>
                  الأعمدة المحسوبة
                </Text>
                <VStack spacing={2} align="stretch">
                  {columns
                    .filter(col => col.formula)
                    .map((column, index) => (
                      <Box
                        key={index}
                        p={3}
                        borderWidth={1}
                        borderRadius="md"
                        bg={infoColor}
                      >
                        <HStack justify="space-between">
                          <Text className="stake-text" fontWeight="medium">
                            {column.name}
                          </Text>
                          <Badge colorScheme="blue" variant="outline">
                            {column.type}
                          </Badge>
                        </HStack>
                        <Text fontSize="sm" mt={1} fontFamily="mono">
                          {column.formula}
                        </Text>
                      </Box>
                    ))}
                </VStack>
              </Box>
            )}

            {/* تحذيرات */}
            <VStack spacing={3} align="stretch">
              {columns.filter(col => col.required && !col.formula).length === 0 && (
                <Alert status="warning" bg={warningColor}>
                  <AlertIcon as={FiAlertTriangle} />
                  <Text fontSize="sm">
                    لا توجد أعمدة مطلوبة بدون معادلات. تأكد من وجود أعمدة أساسية مثل "الاسم" و "كود الموظف"
                  </Text>
                </Alert>
              )}
              
              {columns.filter(col => col.formula).length > 5 && (
                <Alert status="info" bg={infoColor}>
                  <AlertIcon as={FiInfo} />
                  <Text fontSize="sm">
                    عدد كبير من الأعمدة المحسوبة قد يؤثر على الأداء
                  </Text>
                </Alert>
              )}
            </VStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={3}>
            <Button
              onClick={onClose}
              leftIcon={<FiX />}
              className="stake-button-secondary"
            >
              إغلاق
            </Button>
            <Button
              leftIcon={<FiSave />}
              className="stake-button-primary"
            >
              تطبيق التغييرات
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ChangesPreviewModal;

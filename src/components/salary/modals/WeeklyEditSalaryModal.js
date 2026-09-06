import React from 'react';
import { getApiUrl } from '../../../utils/apiUrlHelper';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  HStack,
  Text,
  Icon,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
} from '@chakra-ui/react';
import { FiEdit } from 'react-icons/fi';
import { getPreferredEmployeeName } from '../../../utils/salary/weeklySalaryHelpers';

export async function saveWeeklyEmployeeEdit({ selectedEmployee, rangePickerValue, toast, fetchData, onClose }) {
  const weekStart = rangePickerValue[0]?.format('YYYY-MM-DD');
  const weekEnd = rangePickerValue[1]?.format('YYYY-MM-DD');

  if (selectedEmployee.special_bonus_weekly !== undefined) {
    const response = await fetch(getApiUrl('/api/unified_salary_api_v2.php'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_employee_special_bonus',
        employee_id: selectedEmployee.employee_id,
        special_bonus_weekly: selectedEmployee.special_bonus_weekly,
        week_start: weekStart,
        week_end: weekEnd,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || result.error || 'فشل في حفظ المكافأة الخاصة');
    }
  }

  if (weekStart && weekEnd && selectedEmployee.employee_id != null) {
    const transportRes = await fetch(getApiUrl('/api/unified_salary_api_v2.php'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_employee_transport_allowance',
        employee_id: selectedEmployee.employee_id,
        transport_allowance: parseFloat(selectedEmployee.transport_allowance) || 0,
        week_start: weekStart,
        week_end: weekEnd,
      }),
    });
    const transportResult = await transportRes.json();
    if (!transportRes.ok || !transportResult.success) {
      throw new Error(transportResult.message || transportResult.error || 'فشل في حفظ بدل المواصلات');
    }
  }

  if (weekStart && weekEnd && selectedEmployee.employee_id != null) {
    const bayatRes = await fetch(getApiUrl('/api/unified_salary_api_v2.php'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_employee_bayat_days',
        employee_id: selectedEmployee.employee_id,
        bayat_days: parseFloat(selectedEmployee.bayat_days) || 0,
        week_start: weekStart,
        week_end: weekEnd,
      }),
    });
    const bayatResult = await bayatRes.json();
    if (!bayatRes.ok || !bayatResult.success) {
      throw new Error(bayatResult.message || bayatResult.error || 'فشل في حفظ أيام البيات');
    }
  }

  if (weekStart && weekEnd && selectedEmployee.employee_id != null) {
    const advRes = await fetch(getApiUrl('/api/advances_api.php'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set_advance_deducted',
        employee_id: selectedEmployee.employee_id,
        period_start: weekStart,
        period_end: weekEnd,
        amount: parseFloat(selectedEmployee.advance_installment) || 0,
      }),
    });
    const advResult = await advRes.json();
    if (!advRes.ok || !advResult.success) {
      throw new Error(advResult.message || 'فشل في حفظ المستقطع من السلف');
    }
  }

  toast({
    title: 'تم الحفظ',
    description: 'تم حفظ التغييرات بنجاح',
    status: 'success',
    duration: 3000,
    isClosable: true,
  });

  fetchData();
  onClose();
}

const WeeklyEditSalaryModal = ({
  isOpen,
  onClose,
  selectedEmployee,
  setSelectedEmployee,
  rangePickerValue,
  toast,
  fetchData,
}) => {
  const handleSave = async () => {
    try {
      await saveWeeklyEmployeeEdit({
        selectedEmployee,
        rangePickerValue,
        toast,
        fetchData,
        onClose,
      });
    } catch (error) {
      toast({
        title: 'خطأ في الحفظ',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
  <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered blockScrollOnMount={false}>
    <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
    <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden">
      <ModalHeader
        bg="var(--stake-bg-primary, #0f212e)"
        color="white"
        borderRadius="24px 24px 0 0"
        p="4"
        position="relative"
        boxShadow="0 4px 20px rgba(0, 0, 0, 0.4)"
      >
        <HStack justify="space-between" align="center" w="100%">
          <HStack spacing="3">
            <Icon as={FiEdit} boxSize="5" />
            <Text fontSize="md" fontWeight="bold">
              {(selectedEmployee?.salary_type || 'Weekly') === 'Weekly' ? 'تعديل بيانات الأجر' : 'تعديل بيانات الراتب'} - {getPreferredEmployeeName(selectedEmployee)}
            </Text>
          </HStack>
          <ModalCloseButton 
            color="white"
            bg="rgba(255, 255, 255, 0.1)"
            borderRadius="full"
            size="md"
            _hover={{
              bg: "rgba(255, 255, 255, 0.2)",
              transform: "scale(1.1)"
            }}
            _active={{
              transform: "scale(0.95)"
            }}
          />
        </HStack>
      </ModalHeader>
      <ModalBody
        p="8"
        sx={{
          '& input[type=number]': { MozAppearance: 'textfield' },
          '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 }
        }}
      >
        {selectedEmployee && (
          <VStack spacing="4" align="stretch">
            <FormControl>
              <FormLabel className="stake-label">مكافأة خاصة</FormLabel>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={selectedEmployee.special_bonus_weekly ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedEmployee(prev => ({ ...prev, special_bonus_weekly: v === '' ? 0 : parseFloat(v) || 0 }));
                }}
                className="stake-input"
                bg="var(--stake-bg-secondary, #111827)"
                borderColor="var(--stake-border-primary, #2f4553)"
                color="white"
                _focus={{ borderColor: '#3b82f6', boxShadow: '0 0 0 1px #3b82f6' }}
                _hover={{ borderColor: '#4a5568' }}
              />
            </FormControl>
            <FormControl>
              <FormLabel className="stake-label">أيام البيات</FormLabel>
              <Input
                type="number"
                step="1"
                min={0}
                value={selectedEmployee.bayat_days ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedEmployee(prev => ({ ...prev, bayat_days: v === '' ? 0 : Math.max(0, parseFloat(v) || 0) }));
                }}
                className="stake-input"
                bg="var(--stake-bg-secondary, #111827)"
                borderColor="var(--stake-border-primary, #2f4553)"
                color="white"
                _focus={{ borderColor: '#3b82f6', boxShadow: '0 0 0 1px #3b82f6' }}
                _hover={{ borderColor: '#4a5568' }}
              />
            </FormControl>
            <FormControl>
              <FormLabel className="stake-label">بدل المواصلات</FormLabel>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={selectedEmployee.transport_allowance ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedEmployee(prev => ({ ...prev, transport_allowance: v === '' ? 0 : parseFloat(v) || 0 }));
                }}
                className="stake-input"
                bg="var(--stake-bg-secondary, #111827)"
                borderColor="var(--stake-border-primary, #2f4553)"
                color="white"
                _focus={{ borderColor: '#3b82f6', boxShadow: '0 0 0 1px #3b82f6' }}
                _hover={{ borderColor: '#4a5568' }}
              />
            </FormControl>
            <FormControl>
              <FormLabel className="stake-label">المستقطع من السلف (لهذا الأسبوع)</FormLabel>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={selectedEmployee.advance_installment ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedEmployee(prev => ({ ...prev, advance_installment: v === '' ? 0 : parseFloat(v) || 0 }));
                }}
                className="stake-input"
                bg="var(--stake-bg-secondary, #111827)"
                borderColor="var(--stake-border-primary, #2f4553)"
                color="white"
                _focus={{ borderColor: '#3b82f6', boxShadow: '0 0 0 1px #3b82f6' }}
                _hover={{ borderColor: '#4a5568' }}
              />
            </FormControl>
          </VStack>
        )}
      </ModalBody>
      <ModalFooter 
        display="flex" 
        justifyContent="flex-end" 
        gap="3"
        bg="var(--stake-bg-primary, #0f212e)"
        borderRadius="0 0 24px 24px"
        p="4"
        borderTop="1px solid"
        borderColor="var(--stake-border-primary, #2f4553)"
      >
        <HStack spacing="3">
          <Button className="stake-btn-secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button 
            className="stake-btn-success"
            onClick={handleSave}
          >
            حفظ التغييرات
          </Button>
        </HStack>
      </ModalFooter>
    </ModalContent>
  </Modal>
  );
};

export default WeeklyEditSalaryModal;

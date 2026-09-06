import React from 'react';
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
  Badge,
  VStack,
  Box,
  SimpleGrid,
  Button,
} from '@chakra-ui/react';
import {
  FiUser,
  FiHash,
  FiKey,
  FiBriefcase,
  FiTarget,
  FiDollarSign,
  FiEdit,
  FiTrash2,
} from 'react-icons/fi';

const WeeklyEmployeeDetailsModal = ({
  isOpen,
  onClose,
  employeeDetailsData,
  formatCurrency,
  onEdit,
  onDelete,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered blockScrollOnMount={false}>
    <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
    <ModalContent bg="var(--stake-bg-primary)" border="none" borderRadius="3xl" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)" overflow="hidden">
      <ModalHeader bg="var(--stake-bg-primary, #0f212e)" color="white" borderRadius="24px 24px 0 0" p="4" position="relative">
        <HStack justify="space-between" align="center" w="full">
          <Text fontSize="lg" fontWeight="bold">تفاصيل الموظف</Text>
          {employeeDetailsData && (
            <HStack spacing="6" align="center" flex="1" justify="center">
              <HStack spacing="2">
                <Icon as={FiUser} color="blue.300" boxSize="4" />
                <Text fontSize="sm" className="stake-text-secondary">{employeeDetailsData.name_ar || employeeDetailsData.name || 'غير محدد'}</Text>
              </HStack>
              <HStack spacing="2">
                <Icon as={FiHash} color="green.300" boxSize="4" />
                <Text fontSize="sm" className="stake-text-secondary">{employeeDetailsData.employee_code || '-'}</Text>
              </HStack>
              <HStack spacing="2">
                <Icon as={FiKey} color="orange.300" boxSize="4" />
                <Text fontSize="sm" className="stake-text-secondary">{employeeDetailsData['AC-No.'] ?? '-'}</Text>
              </HStack>
              {employeeDetailsData.salary_type === 'Monthly' ? (
                <HStack spacing="2">
                  <Icon as={FiBriefcase} color="purple.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">{employeeDetailsData.department_description || employeeDetailsData.department || '-'}</Text>
                </HStack>
              ) : (
                <HStack spacing="2">
                  <Icon as={FiTarget} color="blue.300" boxSize="4" />
                  <Text fontSize="sm" className="stake-text-secondary">{employeeDetailsData.cost_center || '-'}</Text>
                </HStack>
              )}
              <HStack spacing="2">
                <Icon as={FiDollarSign} color="orange.300" boxSize="4" />
                <Badge colorScheme={employeeDetailsData.salary_type === 'Monthly' ? 'purple' : 'blue'} variant="solid" px="2" py="1" borderRadius="md" fontSize="xs">
                  {employeeDetailsData.salary_type === 'Monthly' ? 'شهري' : 'أسبوعي'}
                </Badge>
              </HStack>
            </HStack>
          )}
          <Box w="40px" />
          <ModalCloseButton color="white" bg="rgba(255, 255, 255, 0.1)" borderRadius="full" size="md" _hover={{ bg: 'rgba(255, 255, 255, 0.2)' }} _active={{ transform: 'scale(0.95)' }} />
        </HStack>
      </ModalHeader>
      <ModalBody p="8">
        {employeeDetailsData && (
          <VStack spacing="6" align="stretch">
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">معلومات الراتب</Text>
              <SimpleGrid columns={{ base: 1, md: 4 }} spacing="4">
                <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                  <VStack align="flex-start" spacing="2">
                    <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">الراتب الأساسي</Text>
                    <Text fontSize="md" fontWeight="bold" color="green.400">{formatCurrency(employeeDetailsData.base_salary || 0)}</Text>
                  </VStack>
                </Box>
                <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                  <VStack align="flex-start" spacing="2">
                    <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">التمييز والحوافز</Text>
                    <Text fontSize="md" fontWeight="bold" color="orange.400">{formatCurrency(employeeDetailsData.discrimination_incentive_allowance || 0)}</Text>
                  </VStack>
                </Box>
                <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                  <VStack align="flex-start" spacing="2">
                    <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">نوع الراتب</Text>
                    <Badge colorScheme={employeeDetailsData.salary_type === 'Monthly' ? 'purple' : 'blue'} variant="solid" px="3" py="1" borderRadius="md">{employeeDetailsData.salary_type === 'Monthly' ? 'شهري' : 'أسبوعي'}</Badge>
                  </VStack>
                </Box>
                <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                  <VStack align="flex-start" spacing="2">
                    <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">مؤمن عليه</Text>
                    <Badge colorScheme={employeeDetailsData.is_insured ? 'green' : 'red'} variant="solid" px="3" py="1" borderRadius="md">{employeeDetailsData.is_insured ? 'نعم' : 'لا'}</Badge>
                  </VStack>
                </Box>
              </SimpleGrid>
            </Box>
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">معلومات العمل</Text>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing="4">
                <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                  <VStack align="flex-start" spacing="2">
                    <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">القسم</Text>
                    <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">{employeeDetailsData.department_description || employeeDetailsData.department || '-'}</Text>
                  </VStack>
                </Box>
                <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                  <VStack align="flex-start" spacing="2">
                    <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">التكلفة</Text>
                    <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">{employeeDetailsData.cost_center || '-'}</Text>
                  </VStack>
                </Box>
                <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                  <VStack align="flex-start" spacing="2">
                    <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">المنصب</Text>
                    <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">{employeeDetailsData.position || '-'}</Text>
                  </VStack>
                </Box>
              </SimpleGrid>
            </Box>
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb="4" color="var(--stake-text-primary)">معلومات إضافية</Text>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing="4">
                <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                  <VStack align="flex-start" spacing="2">
                    <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">الموقع</Text>
                    <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">{employeeDetailsData.location || '-'}</Text>
                  </VStack>
                </Box>
                <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                  <VStack align="flex-start" spacing="2">
                    <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">تاريخ التعيين</Text>
                    <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary)">{employeeDetailsData.hire_date ? new Date(employeeDetailsData.hire_date).toLocaleDateString('ar-EG') : '-'}</Text>
                  </VStack>
                </Box>
                <Box bg="var(--stake-bg-secondary)" p="4" borderRadius="xl" border="1px solid" borderColor="var(--stake-border-primary)">
                  <VStack align="flex-start" spacing="2">
                    <Text fontSize="sm" color="var(--stake-text-secondary)" fontWeight="medium">الحالة</Text>
                    <Badge colorScheme={employeeDetailsData.status === 'active' ? 'green' : 'red'} variant="solid" px="3" py="1" borderRadius="md">{employeeDetailsData.status === 'active' ? 'نشط' : 'غير نشط'}</Badge>
                  </VStack>
                </Box>
              </SimpleGrid>
            </Box>
          </VStack>
        )}
      </ModalBody>
      <ModalFooter justifyContent="center" gap="4" bg="var(--stake-bg-primary, #0f212e)" borderTop="1px solid" borderColor="var(--stake-border-primary, #2f4553)" borderRadius="0 0 24px 24px" p="6">
        <HStack spacing="3">
          <Button leftIcon={<FiEdit />} h="48px" px="8" fontWeight="600" borderRadius="xl" bg="#3b82f6" color="white" _hover={{ bg: '#2563eb' }} onClick={onEdit}>
            تعديل البيانات
          </Button>
          <Button leftIcon={<FiTrash2 />} h="48px" px="8" fontWeight="600" borderRadius="xl" bg="#dc2626" color="white" _hover={{ bg: '#b91c1c' }} onClick={onDelete}>
            حذف الموظف
          </Button>
        </HStack>
      </ModalFooter>
    </ModalContent>
  </Modal>
);

export default WeeklyEmployeeDetailsModal;

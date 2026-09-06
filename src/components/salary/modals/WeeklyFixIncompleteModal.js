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
  Box,
  Text,
  Badge,
  SimpleGrid,
  FormControl,
  FormLabel,
  Input,
  HStack,
  Button,
  Tooltip,
} from '@chakra-ui/react';
import { getPreferredEmployeeName, getIncompleteModalDateParts } from '../../../utils/salary/weeklySalaryHelpers';

const WeeklyFixIncompleteModal = ({
  isOpen,
  onClose,
  incompleteRecords,
  savingIncompleteFix,
  onUpdateField,
  onSave,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered blockScrollOnMount={false}>
    <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
    <ModalContent
      bg="var(--stake-bg-primary)"
      border="none"
      borderRadius="3xl"
      boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
      overflow="hidden"
    >
      <ModalHeader
        bg="var(--stake-bg-primary, #0f212e)"
        color="white"
        borderRadius="0"
        p="4"
        position="relative"
        borderBottom="1px solid"
        borderColor="var(--stake-border-primary, #2f4553)"
        boxShadow="0 2px 12px rgba(0, 0, 0, 0.2)"
      >
        <Text fontSize="lg" fontWeight="bold" color="white">
          إصلاح الحقول الناقصة
        </Text>
        <ModalCloseButton
          color="white"
          bg="rgba(255, 255, 255, 0.1)"
          borderRadius="full"
          size="md"
          _hover={{ bg: 'rgba(255, 255, 255, 0.2)', transform: 'scale(1.05)' }}
          _active={{ transform: 'scale(0.95)' }}
        />
      </ModalHeader>
      <ModalBody bg="var(--stake-bg-primary, #0f212e)" p="6">
        <VStack spacing="3" align="stretch">
          {incompleteRecords.map((row) => {
            const dateParts = getIncompleteModalDateParts(row.attendance_date);
            return (
            <Box key={row.id} p="3" border="1px solid" borderColor="var(--stake-border-primary, #2f4553)" borderRadius="md">
              <VStack align="stretch" spacing="3">
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing="3">
                  <Box>
                    <Text fontSize="xs" color="gray.400">التاريخ</Text>
                    {dateParts ? (
                      <Tooltip label={dateParts.tooltip} placement="top" hasArrow openDelay={200}>
                        <Box as="span" display="inline-block" cursor="default">
                          <HStack
                            as="span"
                            spacing="1"
                            display="inline-flex"
                            dir="rtl"
                            alignItems="center"
                          >
                            <Text color="white" fontWeight="semibold" fontSize="sm">
                              {dateParts.day}
                            </Text>
                            <Text color="gray.400" fontSize="sm">/</Text>
                            <Text color="white" fontWeight="medium" fontSize="sm">
                              {dateParts.month}
                            </Text>
                            <Text color="gray.400" fontSize="sm">/</Text>
                            <Text color="white" fontWeight="medium" fontSize="sm">
                              {dateParts.year}
                            </Text>
                          </HStack>
                        </Box>
                      </Tooltip>
                    ) : (
                      <Text color="white" fontWeight="medium">-</Text>
                    )}
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.400">الموظف</Text>
                    <Text
                      color="white"
                      fontWeight="medium"
                      whiteSpace="normal"
                      wordBreak="break-word"
                      overflowWrap="anywhere"
                      lineHeight="short"
                    >
                      {getPreferredEmployeeName(row)}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.400">الحقل الناقص</Text>
                    <Badge colorScheme="orange">
                      {row.missing_field === 'check_in' ? 'الحضور' : row.missing_field === 'check_out' ? 'الانصراف' : 'الحضور والانصراف'}
                    </Badge>
                  </Box>
                </SimpleGrid>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing="3">
                  <FormControl>
                    <FormLabel className="stake-label" fontSize="xs">الحضور (الحالي)</FormLabel>
                    <Input
                      type="time"
                      value={row.check_in_time || ''}
                      isReadOnly
                      isDisabled
                      className="stake-input"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel className="stake-label" fontSize="xs">الانصراف (الحالي)</FormLabel>
                    <Input
                      type="time"
                      value={row.check_out_time || ''}
                      isReadOnly
                      isDisabled
                      className="stake-input"
                    />
                  </FormControl>
                </SimpleGrid>

                <SimpleGrid columns={{ base: 1, md: row.missing_field === 'both' ? 2 : 1 }} spacing="3">
                  {(row.missing_field === 'check_in' || row.missing_field === 'both') && (
                    <FormControl>
                      <FormLabel className="stake-label" fontSize="xs">ادخل الحضور</FormLabel>
                      <Input
                        type="time"
                        value={row.check_in_time || ''}
                        onChange={(e) => onUpdateField(row.id, 'check_in_time', e.target.value)}
                        className="stake-input"
                      />
                    </FormControl>
                  )}
                  {(row.missing_field === 'check_out' || row.missing_field === 'both') && (
                    <FormControl>
                      <FormLabel className="stake-label" fontSize="xs">ادخل الانصراف</FormLabel>
                      <Input
                        type="time"
                        value={row.check_out_time || ''}
                        onChange={(e) => updateIncompleteRecordField(row.id, 'check_out_time', e.target.value)}
                        className="stake-input"
                      />
                    </FormControl>
                  )}
                </SimpleGrid>
              </VStack>
            </Box>
            );
          })}
          {incompleteRecords.length === 0 && (
            <Text color="gray.300">لا توجد سجلات ناقصة في الفترة الحالية.</Text>
          )}
        </VStack>
      </ModalBody>
      <ModalFooter
        display="flex"
        justifyContent="flex-end"
        bg="var(--stake-bg-primary, #0f212e)"
        borderRadius="0"
        borderTop="2px solid"
        borderColor="var(--stake-border-primary, #2f4553)"
        py="4"
      >
        <HStack spacing="3">
          <Button variant="ghost" color="gray.300" _hover={{ bg: 'rgba(255,255,255,0.08)', color: 'white' }} onClick={onClose}>
            إغلاق
          </Button>
          <Button colorScheme="orange" onClick={onSave} isLoading={savingIncompleteFix}>
            حفظ وإعادة احتساب
          </Button>
        </HStack>
      </ModalFooter>
    </ModalContent>
  </Modal>
);

export default WeeklyFixIncompleteModal;

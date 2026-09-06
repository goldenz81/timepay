import React from 'react';
import dayjs from 'dayjs';
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
  Badge,
  VStack,
  Icon,
  Center,
  Spinner,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
} from '@chakra-ui/react';
import { FiCalendar } from 'react-icons/fi';
import EnglishKeyTooltip from '../../EnglishKeyTooltip';
import {
  getPreferredEmployeeName,
  formatAttendanceLogTime,
  formatHoursAndMinutesForLog,
  calculateAttendanceLogStatus,
  attendanceLogStatusColor,
  attendanceLogStatusIcon,
  attendanceLogStatusText,
} from '../../../utils/salary/weeklySalaryHelpers';

const WeeklyAttendanceHistoryModal = ({
  isOpen,
  onClose,
  selectedEmployee,
  detailsModalDateRange,
  attendanceHistoryLoading,
  attendanceHistoryRecords,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    size="6xl"
    isCentered
    scrollBehavior="inside"
    blockScrollOnMount={false}
  >
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
        <HStack justify="space-between" align="center" w="full" flexWrap="wrap" spacing="3">
          <HStack spacing="4" align="center" flexWrap="wrap">
            <Text fontSize="lg" fontWeight="bold" color="white">
              سجلات الحضور - {getPreferredEmployeeName(selectedEmployee)}
            </Text>
            <Badge
              colorScheme={(selectedEmployee?.salary_type || 'Weekly') === 'Monthly' ? 'blue' : 'purple'}
            >
              {(selectedEmployee?.salary_type || 'Weekly') === 'Monthly' ? 'شهري' : 'أسبوعي'}
            </Badge>
            {detailsModalDateRange?.[0] && detailsModalDateRange?.[1] && (
              <Text fontSize="sm" color="gray.300">
                الفترة المفلترة: {detailsModalDateRange[0].format('DD/MM/YYYY')} -{' '}
                {detailsModalDateRange[1].format('DD/MM/YYYY')}
              </Text>
            )}
          </HStack>
        </HStack>
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
        {attendanceHistoryLoading ? (
          <Center py="12">
            <Spinner size="lg" color="primary.500" />
          </Center>
        ) : attendanceHistoryRecords.length === 0 ? (
          <Center py="8">
            <VStack spacing="4">
              <Icon as={FiCalendar} boxSize="12" className="stake-text-secondary" />
              <Text className="stake-text-secondary">
                لا توجد سجلات حضور لهذا الموظف في الفترة المحددة
              </Text>
            </VStack>
          </Center>
        ) : (
          <VStack spacing="4" align="stretch">
            <HStack justify="space-between" w="full">
              <Text fontSize="md" fontWeight="medium" className="stake-text-secondary">
                سجلات الفترة المحددة:
              </Text>
              <Badge colorScheme="purple" fontSize="sm">
                {attendanceHistoryRecords.length} سجل
              </Badge>
            </HStack>
            <TableContainer
              maxH="60vh"
              overflowY="auto"
              sx={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#94a3b8 #f1f5f9',
                '&::-webkit-scrollbar': { width: '12px' },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f5f9',
                  borderRadius: '6px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#94a3b8',
                  borderRadius: '6px',
                  border: '2px solid #f1f5f9',
                  '&:hover': { background: '#64748b' },
                },
              }}
            >
              <Table
                variant="simple"
                size="sm"
                layout="fixed"
                className="stake-table"
                sx={{
                  'tr.holiday-row, tr.holiday-row td, tr.holiday-row > td': {
                    background: 'var(--stake-bg-secondary) !important',
                    backgroundColor: 'var(--stake-bg-secondary) !important',
                  },
                  'tr.holiday-row:hover, tr.holiday-row:hover td, tr.holiday-row:hover > td': {
                    background: 'var(--stake-bg-hover) !important',
                    backgroundColor: 'var(--stake-bg-hover) !important',
                  },
                }}
              >
                <Thead
                  sx={{
                    '& th': {
                      color: 'var(--stake-table-header-text, var(--stake-text-primary)) !important',
                    },
                  }}
                >
                  <Tr>
                    <Th>
                      <EnglishKeyTooltip englishKey="date">التاريخ</EnglishKeyTooltip>
                    </Th>
                    <Th>
                      <EnglishKeyTooltip englishKey="check_in">الحضور</EnglishKeyTooltip>
                    </Th>
                    <Th>
                      <EnglishKeyTooltip englishKey="check_out">الانصراف</EnglishKeyTooltip>
                    </Th>
                    <Th>
                      <EnglishKeyTooltip englishKey="work_hours">ساعات العمل</EnglishKeyTooltip>
                    </Th>
                    <Th>
                      <EnglishKeyTooltip englishKey="overtime_hours">الإضافي</EnglishKeyTooltip>
                    </Th>
                    <Th>
                      <EnglishKeyTooltip englishKey="late_penalty">التأخير</EnglishKeyTooltip>
                    </Th>
                    <Th>
                      <EnglishKeyTooltip englishKey="status">الحالة</EnglishKeyTooltip>
                    </Th>
                    <Th>
                      <EnglishKeyTooltip englishKey="source">المصدر</EnglishKeyTooltip>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {attendanceHistoryRecords
                    .filter((record) => record != null)
                    .map((record) => {
                      const isHoliday =
                        record.is_holiday === 1 ||
                        record.is_holiday === true ||
                        record.is_holiday === '1';
                      const workTotal = record.total_hours ?? record.work_hours;
                      const calculatedStatus = calculateAttendanceLogStatus(record);
                      const StatusIcon = attendanceLogStatusIcon(calculatedStatus);
                      return (
                        <Tr
                          key={record.id}
                          className={isHoliday ? 'holiday-row' : ''}
                          style={{
                            background: isHoliday
                              ? '#0F212E !important'
                              : record.is_excused === 1 ||
                                  record.is_excused === true ||
                                  record.is_excused === '1'
                                ? '#2F4553 !important'
                                : undefined,
                          }}
                          bg={isHoliday ? '#0F212E' : undefined}
                          _hover={{
                            bg: isHoliday ? '#1A2C38' : 'gray.50',
                          }}
                          sx={{
                            background: isHoliday ? '#0F212E !important' : undefined,
                            '&:hover': {
                              background: isHoliday ? '#1A2C38 !important' : undefined,
                            },
                          }}
                        >
                          <Td>
                            {record.attendance_date
                              ? dayjs(record.attendance_date).format('DD/MM')
                              : '-'}
                          </Td>
                          <Td>{formatAttendanceLogTime(record.check_in_time || record.check_in)}</Td>
                          <Td>{formatAttendanceLogTime(record.check_out_time || record.check_out)}</Td>
                          <Td>{formatHoursAndMinutesForLog(workTotal)}</Td>
                          <Td>
                            {record.overtime_hours && parseFloat(record.overtime_hours) > 0 ? (
                              <Text color="orange.300">
                                +{formatHoursAndMinutesForLog(record.overtime_hours)}
                              </Text>
                            ) : (
                              '-'
                            )}
                          </Td>
                          <Td>
                            {isHoliday ? (
                              '-'
                            ) : record.late_penalty_hours &&
                              parseFloat(record.late_penalty_hours) > 0 ? (
                              <Text color="red.300">
                                {formatHoursAndMinutesForLog(record.late_penalty_hours)}
                              </Text>
                            ) : (
                              '-'
                            )}
                          </Td>
                          <Td>
                            {calculatedStatus === 'holiday' ? (
                              <Badge colorScheme="orange">
                                <HStack spacing="1">
                                  <Icon as={FiCalendar} boxSize="3" />
                                  <Text>عطلة</Text>
                                </HStack>
                              </Badge>
                            ) : (
                              <Badge colorScheme={attendanceLogStatusColor(calculatedStatus)}>
                                <HStack spacing="1">
                                  <StatusIcon size="12" />
                                  <Text>{attendanceLogStatusText(calculatedStatus)}</Text>
                                </HStack>
                              </Badge>
                            )}
                          </Td>
                          <Td>
                            <Badge
                              colorScheme={record.source_type === 'manual' ? 'blue' : 'green'}
                            >
                              {record.source_type === 'manual' ? 'يدوي' : 'بصمة'}
                            </Badge>
                          </Td>
                        </Tr>
                      );
                    })}
                </Tbody>
              </Table>
            </TableContainer>
          </VStack>
        )}
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
        <Button
          className="stake-btn"
          onClick={onClose}
          h="40px"
          px="6"
          fontWeight="600"
          borderRadius="lg"
        >
          إغلاق
        </Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
);

export default WeeklyAttendanceHistoryModal;

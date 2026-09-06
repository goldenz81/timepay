import React from 'react';

import {

  Box,

  VStack,

  Text,

  Table,

  Thead,

  Tbody,

  Tr,

  Th,

  Td,

  TableContainer,

} from '@chakra-ui/react';

import { PAY_WEEK_COLUMN_LABELS } from '../../../utils/salary/weeklySalaryConstants';



export default function WeeklySalaryDetailsAttendancePanel({

  attendanceHistoryLoading,

  detailsWorkweekAttendanceRows,

  detailsWorkweekWideBlocks,

}) {

  return (

    <Box w="100%" className="weekly-salary-details-attendance-panel" px={{ base: 3, md: 5 }} py={{ base: 3, md: 4 }}>

      {attendanceHistoryLoading && detailsWorkweekAttendanceRows.length === 0 ? (

        <Text fontSize="sm" fontWeight="normal" color="var(--stake-text-muted)" textAlign="center">

          جاري تحميل أوقات الحضور…

        </Text>

      ) : (

        <>

          {detailsWorkweekWideBlocks.length > 0 ? (

            <VStack align="stretch" spacing={3}>

              {detailsWorkweekWideBlocks.map((block) => (

                <TableContainer

                  key={block.friKey}

                  borderRadius="md"

                  borderWidth="1px"

                  borderColor="var(--stake-border-primary)"

                  overflow="visible"

                  bg="var(--stake-bg-tertiary)"

                >

                  <Table

                    size="sm"

                    variant="simple"

                    dir="rtl"

                    sx={{

                      tableLayout: 'fixed',

                      fontSize: 'var(--ws-att-font, 13px)',

                      fontWeight: 'normal',

                    }}

                  >

                    <Thead>

                      <Tr>

                        <Th

                          w="3.25rem"

                          minW="3.25rem"

                          p={1.5}

                          borderColor="var(--stake-border-primary)"

                          bg="var(--stake-bg-secondary)"

                        />

                        {PAY_WEEK_COLUMN_LABELS.map((lb) => (

                          <Th

                            key={lb}

                            textAlign="center"

                            borderColor="var(--stake-border-primary)"

                            bg="var(--stake-bg-secondary)"

                            p="2px"

                            sx={{ verticalAlign: 'middle' }}

                          >

                            <Text

                              as="span"

                              display="block"

                              textAlign="center"

                              color="var(--stake-text-secondary)"

                              fontWeight="medium"

                              lineHeight="1.2"

                              className="ws-att-day-label"

                            >

                              {lb}

                            </Text>

                          </Th>

                        ))}

                      </Tr>

                    </Thead>

                    <Tbody>

                      <Tr _hover={{ bg: 'var(--stake-bg-hover)' }}>

                        <Th

                          scope="row"

                          p={1.5}

                          fontWeight="medium"

                          borderColor="var(--stake-border-primary)"

                          color="var(--stake-text-primary)"

                          bg="var(--stake-bg-card)"

                          fontSize="var(--ws-att-font, 13px)"

                        >

                          حضور

                        </Th>

                        {block.checkIns.map((v, i) => (

                          <Td

                            key={`in-${i}`}

                            dir="ltr"

                            fontFamily="mono"

                            color="var(--stake-text-primary)"

                            borderColor="var(--stake-border-primary)"

                            py={1}

                            px={1.5}

                            fontWeight="normal"

                            textAlign="center"

                            whiteSpace="nowrap"

                            fontSize="var(--ws-att-font, 13px)"

                          >

                            {v}

                          </Td>

                        ))}

                      </Tr>

                      <Tr _hover={{ bg: 'var(--stake-bg-hover)' }}>

                        <Th

                          scope="row"

                          p={1.5}

                          fontWeight="medium"

                          borderColor="var(--stake-border-primary)"

                          color="var(--stake-text-primary)"

                          bg="var(--stake-bg-card)"

                          fontSize="var(--ws-att-font, 13px)"

                        >

                          انصراف

                        </Th>

                        {block.checkOuts.map((v, i) => (

                          <Td

                            key={`out-${i}`}

                            dir="ltr"

                            fontFamily="mono"

                            color="var(--stake-text-primary)"

                            borderColor="var(--stake-border-primary)"

                            py={1}

                            px={1.5}

                            fontWeight="normal"

                            textAlign="center"

                            whiteSpace="nowrap"

                            fontSize="var(--ws-att-font, 13px)"

                          >

                            {v}

                          </Td>

                        ))}

                      </Tr>

                    </Tbody>

                  </Table>

                </TableContainer>

              ))}

            </VStack>

          ) : null}

          {!attendanceHistoryLoading && detailsWorkweekAttendanceRows.length === 0 && (

            <Text fontSize="sm" fontWeight="normal" color="var(--stake-text-muted)" textAlign="center" w="100%" py={4}>

              لا توجد أيام (جمعة–خميس) في الفترة أو لا توجد سجلات حضور.

            </Text>

          )}

        </>

      )}

    </Box>

  );

}


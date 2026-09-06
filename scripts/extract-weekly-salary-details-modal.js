/**
 * استخراج مودال تفاصيل الراتب الأسبوعي (الأكبر).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'src', 'pages', 'PremiumWeeklySalary.js');
const MODALS_DIR = path.join(ROOT, 'src', 'components', 'salary', 'modals');

let page = fs.readFileSync(PAGE, 'utf8');

const openPattern = '      <Modal isOpen={isDetailsModalOpen}';
const start = page.indexOf(openPattern);
if (start === -1) throw new Error('Details modal not found');
const afterStart = page.slice(start);
const closeIdx = afterStart.indexOf('\n      </Modal>');
const end = start + closeIdx + '\n      </Modal>'.length;
const block = page.slice(start, end);

let jsx = block
  .replace('isOpen={isDetailsModalOpen}', 'isOpen={isOpen}')
  .replace(/onClose=\{\(\) => setIsDetailsModalOpen\(false\)\}/g, 'onClose={onClose}');

const dedent = (s) => s.replace(/^      /gm, '  ');

const imports = `import React from 'react';
import dayjs from 'dayjs';
import { DatePicker } from 'antd';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Button,
  Badge,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  SimpleGrid,
  FormControl,
  FormLabel,
  Switch,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiPrinter,
  FiEdit,
  FiUser,
  FiCalendar,
  FiList,
  FiActivity,
  FiAlertTriangle,
  FiClock,
} from 'react-icons/fi';
import EnglishKeyTooltip from '../../EnglishKeyTooltip';
import ChakraEnglishKeyTooltip from '../../ChakraEnglishKeyTooltip';
import { normalizeDetailsModalBadgeScheme } from '../../../utils/salary/salaryBadgeHelpers';
import {
  formatBayatDaysLabel,
  formatOvertimeHoursPairLabel,
  getPreferredEmployeeName,
  buildWorkweekAttendanceWideTablesHtml,
} from '../../../utils/salary/weeklySalaryHelpers';
import { PAY_WEEK_COLUMN_LABELS } from '../../../utils/salary/weeklySalaryConstants';
import { getFinancialTableColumnClass } from '../../../utils/financialColumnClasses';`;

const replacement = `      <WeeklySalaryDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        selectedEmployee={selectedEmployee}
        selectedDateRange={selectedDateRange}
        detailsModalDateRange={detailsModalDateRange}
        detailsRangePickerValue={detailsRangePickerValue}
        onDetailsRangeChange={handleDetailsModalRangeChange}
        incompleteRecords={incompleteRecords}
        settings={settings}
        visibleColumns={visibleColumns}
        entitlementsColumns={entitlementsColumns}
        deductionsColumns={deductionsColumns}
        visibleDeductionColumns={visibleDeductionColumns}
        fmtCurrency={fmtCurrency}
        resolveDataKey={resolveDataKey}
        onOpenEmployeeDetails={handleOpenEmployeeDetailsFromSalary}
        onOpenAttendanceHistory={handleOpenAttendanceHistoryModal}
        onOpenFixIncomplete={handleOpenFixIncompleteModal}
        onOpenEdit={() => setIsEditModalOpen(true)}
        attendanceHistoryLoading={attendanceHistoryLoading}
        detailsWorkweekAttendanceRows={detailsWorkweekAttendanceRows}
        detailsWorkweekWideBlocks={detailsWorkweekWideBlocks}
        toggleColumnVisibility={toggleColumnVisibility}
        toggleDeductionColumnVisibility={toggleDeductionColumnVisibility}
        savePreferences={savePreferences}
      />`;

const propsList = replacement
  .match(/\n\s+(\w+)=\{/g)
  .map((s) => s.trim().replace('={', ''))
  .filter((p) => !['isOpen', 'onClose'].includes(p))
  .join(',\n  ');

const fileContent = `${imports}

const WeeklySalaryDetailsModal = ({
  isOpen,
  onClose,
  ${propsList},
}) => (
${dedent(jsx)}
);

export default WeeklySalaryDetailsModal;
`;

fs.writeFileSync(path.join(MODALS_DIR, 'WeeklySalaryDetailsModal.js'), fileContent, 'utf8');

page = page.slice(0, start) + replacement + page.slice(end);

const importLine = "import WeeklyMainTableColumnManagerModal from '../components/salary/modals/WeeklyMainTableColumnManagerModal';";
if (!page.includes('WeeklySalaryDetailsModal')) {
  page = page.replace(
    importLine,
    `${importLine}\nimport WeeklySalaryDetailsModal from '../components/salary/modals/WeeklySalaryDetailsModal';`
  );
}

fs.writeFileSync(PAGE, page, 'utf8');
console.log('Details modal extracted');

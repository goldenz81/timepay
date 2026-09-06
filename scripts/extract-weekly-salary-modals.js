/**
 * استخراج مودالات PremiumWeeklySalary (دفعة 1: الحضور + السجلات الناقصة).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'src', 'pages', 'PremiumWeeklySalary.js');
const MODALS_DIR = path.join(ROOT, 'src', 'components', 'salary', 'modals');

const lines = fs.readFileSync(PAGE, 'utf8').split(/\r?\n/);

function sliceLines(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

function indentJsx(block, spaces = 2) {
  const pad = ' '.repeat(spaces);
  return block.replace(/^      /gm, pad);
}

if (!fs.existsSync(MODALS_DIR)) {
  fs.mkdirSync(MODALS_DIR, { recursive: true });
}

// --- WeeklyAttendanceHistoryModal ---
let attendanceJsx = sliceLines(3918, 4181);
attendanceJsx = attendanceJsx
  .replace('isOpen={isAttendanceHistoryModalOpen}', 'isOpen={isOpen}')
  .replace('onClose={() => setIsAttendanceHistoryModalOpen(false)}', 'onClose={onClose}')
  .replace('onClick={() => setIsAttendanceHistoryModalOpen(false)}', 'onClick={onClose}');

const attendanceFile = `import React from 'react';
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
${indentJsx(attendanceJsx)}
);

export default WeeklyAttendanceHistoryModal;
`;

fs.writeFileSync(path.join(MODALS_DIR, 'WeeklyAttendanceHistoryModal.js'), attendanceFile, 'utf8');

// --- WeeklyFixIncompleteModal ---
let fixJsx = sliceLines(4184, 4349);
fixJsx = fixJsx
  .replace('isOpen={isFixIncompleteModalOpen}', 'isOpen={isOpen}')
  .replace(/onClose=\{\(\) => setIsFixIncompleteModalOpen\(false\)\}/g, 'onClose={onClose}')
  .replace('updateIncompleteRecordField', 'onUpdateField')
  .replace('handleSaveIncompleteRecords', 'onSave');

const fixFile = `import React from 'react';
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
${indentJsx(fixJsx)}
);

export default WeeklyFixIncompleteModal;
`;

fs.writeFileSync(path.join(MODALS_DIR, 'WeeklyFixIncompleteModal.js'), fixFile, 'utf8');

// --- Patch page ---
let pageLines = [...lines];

const attendanceReplacement = `      <WeeklyAttendanceHistoryModal
        isOpen={isAttendanceHistoryModalOpen}
        onClose={() => setIsAttendanceHistoryModalOpen(false)}
        selectedEmployee={selectedEmployee}
        detailsModalDateRange={detailsModalDateRange}
        attendanceHistoryLoading={attendanceHistoryLoading}
        attendanceHistoryRecords={attendanceHistoryRecords}
      />`;

pageLines.splice(3917, 4181 - 3917 + 1, attendanceReplacement);

// Line numbers shifted - fix incomplete was at 4184, now 4184 - (4181-3918+1) + 1 = 3921 approx
// Re-read and find fix modal
let pageContent = pageLines.join('\n');
const fixStart = pageContent.indexOf('<Modal isOpen={isFixIncompleteModalOpen}');
const fixEnd = pageContent.indexOf('</Modal>', fixStart) + '</Modal>'.length;
if (fixStart === -1) throw new Error('Fix incomplete modal not found');

const fixReplacement = `      <WeeklyFixIncompleteModal
        isOpen={isFixIncompleteModalOpen}
        onClose={() => setIsFixIncompleteModalOpen(false)}
        incompleteRecords={incompleteRecords}
        savingIncompleteFix={savingIncompleteFix}
        onUpdateField={updateIncompleteRecordField}
        onSave={handleSaveIncompleteRecords}
      />`;

pageContent =
  pageContent.slice(0, fixStart) + fixReplacement + pageContent.slice(fixEnd);

const importAnchor = "import ChakraEnglishKeyTooltip from '../components/ChakraEnglishKeyTooltip';";
const modalImports = `import WeeklyAttendanceHistoryModal from '../components/salary/modals/WeeklyAttendanceHistoryModal';
import WeeklyFixIncompleteModal from '../components/salary/modals/WeeklyFixIncompleteModal';`;

if (!pageContent.includes('WeeklyAttendanceHistoryModal')) {
  pageContent = pageContent.replace(importAnchor, `${importAnchor}\n${modalImports}`);
}

fs.writeFileSync(PAGE, pageContent, 'utf8');
console.log('Done: 2 modals extracted');

/**
 * استخراج مودالات PremiumWeeklySalary — دفعة 2.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'src', 'pages', 'PremiumWeeklySalary.js');
const MODALS_DIR = path.join(ROOT, 'src', 'components', 'salary', 'modals');

let page = fs.readFileSync(PAGE, 'utf8');

function extractBetween(content, startMarker, endMarker) {
  const start = content.indexOf(startMarker);
  if (start === -1) throw new Error(`Start not found: ${startMarker.slice(0, 60)}`);
  const end = content.indexOf(endMarker, start);
  if (end === -1) throw new Error(`End not found after: ${startMarker.slice(0, 60)}`);
  return {
    start,
    end: end + endMarker.length,
    block: content.slice(start, end + endMarker.length),
  };
}

function dedent(block, from = 6) {
  const re = new RegExp(`^ {${from}}`, 'gm');
  return block.replace(re, '  ');
}

function patchPage(oldBlock, newBlock) {
  if (!page.includes(oldBlock)) throw new Error('Block not found in page for patch');
  page = page.replace(oldBlock, newBlock);
}

function addImports(lines) {
  for (const line of lines) {
    if (!page.includes(line)) {
      page = page.replace(
        "import WeeklyFixIncompleteModal from '../components/salary/modals/WeeklyFixIncompleteModal';",
        `import WeeklyFixIncompleteModal from '../components/salary/modals/WeeklyFixIncompleteModal';\n${line}`
      );
    }
  }
}

// --- Edit modal ---
const editStart = '      <Modal isOpen={isEditModalOpen}';
const edit = extractBetween(page, editStart, '      </Modal>\n\n      {/*');

let editJsx = edit.block
  .replace('isOpen={isEditModalOpen}', 'isOpen={isOpen}')
  .replace(/onClose=\{\(\) => setIsEditModalOpen\(false\)\}/g, 'onClose={onClose}')
  .replace(/onClick=\{\(\) => setIsEditModalOpen\(false\)\}/g, 'onClick={onClose}');

// Replace inline save with onSave prop
const saveStart = editJsx.indexOf('onClick={async () => {');
const saveEnd = editJsx.indexOf('}}', saveStart) + 2;
editJsx = `${editJsx.slice(0, saveStart)}onClick={onSave}${editJsx.slice(saveEnd)}`;

const editFile = `import React from 'react';
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
${dedent(editJsx)}
  );
};

export default WeeklyEditSalaryModal;
`;

fs.writeFileSync(path.join(MODALS_DIR, 'WeeklyEditSalaryModal.js'), editFile, 'utf8');

patchPage(
  edit.block,
  `      <WeeklyEditSalaryModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        selectedEmployee={selectedEmployee}
        setSelectedEmployee={setSelectedEmployee}
        rangePickerValue={rangePickerValue}
        toast={toast}
        fetchData={fetchData}
      />`
);

// --- Employee details ---
const emp = extractBetween(
  page,
  '      <Modal isOpen={isEmployeeDetailsOpen}',
  '      </Modal>\n\n      {/* 8&8?7?7?8'
);

let empJsx = emp.block
  .replace(
    'onClose={() => { onEmployeeDetailsClose(); setEmployeeDetailsData(null); }}',
    'onClose={onClose}'
  )
  .replace(
    /onClick=\{\(\) => \{ if \(!employeeDetailsData\) return; onEmployeeDetailsClose\(\); setEmployeeDetailsData\(null\); navigate\('\/unified-employees', \{ state: \{ openEmployeeId: employeeDetailsData\.id, openMode: 'edit' \} \}\); \}\}/,
    'onClick={onEdit}'
  )
  .replace(
    /onClick=\{\(\) => \{ if \(!employeeDetailsData\) return; const name = employeeDetailsData\.name_ar \|\| employeeDetailsData\.name \|\| 'هذا الموظف'; if \(window\.confirm\(`⚠️ تحذير: حذف الموظف نهائياً\\n\\nالموظف: \$\{name\}\\nالكود: \$\{employeeDetailsData\.employee_code \|\| 'غير محدد'\}\\n\\nهل أنت متأكد؟`\)\) handleDeleteEmployeeFromDetailsModal\(employeeDetailsData\); \}\}/,
    'onClick={onDelete}'
  );

const empFile = `import React from 'react';
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
${dedent(empJsx)}
);

export default WeeklyEmployeeDetailsModal;
`;

fs.writeFileSync(path.join(MODALS_DIR, 'WeeklyEmployeeDetailsModal.js'), empFile, 'utf8');

patchPage(
  emp.block,
  `      <WeeklyEmployeeDetailsModal
        isOpen={isEmployeeDetailsOpen}
        onClose={() => { onEmployeeDetailsClose(); setEmployeeDetailsData(null); }}
        employeeDetailsData={employeeDetailsData}
        formatCurrency={fmtCurrency}
        onEdit={() => {
          if (!employeeDetailsData) return;
          onEmployeeDetailsClose();
          setEmployeeDetailsData(null);
          navigate('/unified-employees', { state: { openEmployeeId: employeeDetailsData.id, openMode: 'edit' } });
        }}
        onDelete={() => {
          if (!employeeDetailsData) return;
          const name = employeeDetailsData.name_ar || employeeDetailsData.name || 'هذا الموظف';
          if (window.confirm(\`⚠️ تحذير: حذف الموظف نهائياً\\n\\nالموظف: \${name}\\nالكود: \${employeeDetailsData.employee_code || 'غير محدد'}\\n\\nهل أنت متأكد؟\`)) {
            handleDeleteEmployeeFromDetailsModal(employeeDetailsData);
          }
        }}
      />`
);

// --- Import modal ---
const imp = extractBetween(
  page,
  '      <Modal isOpen={isImportColumnModalOpen}',
  '      </Modal>\n    </Box>'
);

let impJsx = imp.block
  .replace('isOpen={isImportColumnModalOpen}', 'isOpen={isOpen}')
  .replace(/onClose=\{\(\) => setIsImportColumnModalOpen\(false\)\}/g, 'onClose={onClose}')
  .replace(/onClick=\{\(\) => setIsImportColumnModalOpen\(false\)\}/g, 'onClick={onClose}');

const impFile = `import React from 'react';
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
  Box,
  FormLabel,
  Select,
  SimpleGrid,
  Card,
  CardBody,
  Button,
} from '@chakra-ui/react';
import { FiDownload, FiLink } from 'react-icons/fi';

const WeeklyImportColumnModal = ({
  isOpen,
  onClose,
  availableTables,
  selectedTable,
  setSelectedTable,
  fetchImportableColumns,
  importableColumns,
  isColumnManagerOpen,
  importColumn,
}) => (
${dedent(impJsx)}
);

export default WeeklyImportColumnModal;
`;

fs.writeFileSync(path.join(MODALS_DIR, 'WeeklyImportColumnModal.js'), impFile, 'utf8');

patchPage(
  imp.block,
  `      <WeeklyImportColumnModal
        isOpen={isImportColumnModalOpen}
        onClose={() => setIsImportColumnModalOpen(false)}
        availableTables={availableTables}
        selectedTable={selectedTable}
        setSelectedTable={setSelectedTable}
        fetchImportableColumns={fetchImportableColumns}
        importableColumns={importableColumns}
        isColumnManagerOpen={isColumnManagerOpen}
        importColumn={importColumn}
      />`
);

addImports([
  "import WeeklyEditSalaryModal from '../components/salary/modals/WeeklyEditSalaryModal';",
  "import WeeklyEmployeeDetailsModal from '../components/salary/modals/WeeklyEmployeeDetailsModal';",
  "import WeeklyImportColumnModal from '../components/salary/modals/WeeklyImportColumnModal';",
]);

// Fix FixIncomplete indentation
page = page.replace(
  `            <WeeklyFixIncompleteModal`,
  `      <WeeklyFixIncompleteModal`
);

fs.writeFileSync(PAGE, page, 'utf8');
console.log('Batch 2 done: Edit, EmployeeDetails, Import');

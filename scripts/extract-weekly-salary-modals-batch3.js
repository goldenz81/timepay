/**
 * استخراج مودالات الألوان ومديري الأعمدة — دفعة 3.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'src', 'pages', 'PremiumWeeklySalary.js');
const MODALS_DIR = path.join(ROOT, 'src', 'components', 'salary', 'modals');

let page = fs.readFileSync(PAGE, 'utf8');

function extractModalByOpen(isOpenPattern) {
  const start = page.indexOf(isOpenPattern);
  if (start === -1) throw new Error(`Modal not found: ${isOpenPattern}`);
  const afterStart = page.slice(start);
  const closeIdx = afterStart.indexOf('\n      </Modal>');
  if (closeIdx === -1) throw new Error(`Close not found for: ${isOpenPattern}`);
  const end = start + closeIdx + '\n      </Modal>'.length;
  return { start, end, block: page.slice(start, end) };
}

function replaceModal(isOpenPattern, replacement) {
  const { start, end, block } = extractModalByOpen(isOpenPattern);
  page = page.slice(0, start) + replacement + page.slice(end);
  return block;
}

function dedent(block) {
  return block.replace(/^      /gm, '  ');
}

function addImport(line) {
  if (!page.includes(line)) {
    page = page.replace(
      "import WeeklyImportColumnModal from '../components/salary/modals/WeeklyImportColumnModal';",
      `import WeeklyImportColumnModal from '../components/salary/modals/WeeklyImportColumnModal';\n${line}`
    );
  }
}

// Badge modals -> shared component
replaceModal(
  '      <Modal isOpen={isBadgeColorModalOpen}',
  `      <WeeklySalaryBadgeColorModal
        title="اختيار لون البادج"
        isOpen={isBadgeColorModalOpen}
        onClose={() => setIsBadgeColorModalOpen(false)}
        editingColumn={editingBadgeColumn}
        setEditingColumn={setEditingBadgeColumn}
        colorOptions={['none', 'blue', 'green', 'red', 'orange', 'purple', 'pink', 'yellow', 'cyan', 'teal', 'gray']}
        variantOptions={['solid', 'outline']}
        onSave={() => {
          if (editingBadgeColumn) {
            updateBadgeColor(
              editingBadgeColumn.id,
              editingBadgeColumn.badge_color || 'blue',
              editingBadgeColumn.badge_variant || 'solid',
              editingBadgeColumn.is_currency || false
            );
          }
        }}
      />`
);

replaceModal(
  '      <Modal isOpen={isMainTableBadgeColorModalOpen}',
  `      <WeeklySalaryBadgeColorModal
        title="اختيار لون البادج - الجدول الرئيسي"
        isOpen={isMainTableBadgeColorModalOpen}
        onClose={() => setIsMainTableBadgeColorModalOpen(false)}
        editingColumn={editingMainTableBadgeColumn}
        setEditingColumn={setEditingMainTableBadgeColumn}
        colorOptions={['none', 'blue', 'green', 'red', 'orange', 'purple', 'pink', 'yellow', 'cyan']}
        variantOptions={['solid', 'subtle', 'outline']}
        onSave={() => {
          if (editingMainTableBadgeColumn) {
            updateBadgeColor(
              editingMainTableBadgeColumn.id,
              editingMainTableBadgeColumn.badge_color || 'blue',
              editingMainTableBadgeColumn.badge_variant || 'solid',
              editingMainTableBadgeColumn.is_currency || false,
              true
            );
            setIsMainTableBadgeColorModalOpen(false);
          }
        }}
      />`
);

addImport("import WeeklySalaryBadgeColorModal from '../components/salary/modals/WeeklySalaryBadgeColorModal';");

// Column manager modals — extract JSX to files, pass props object style via spread in page
const columnModals = [
  {
    open: '      <Modal isOpen={isColumnManagerOpen}',
    file: 'WeeklyEntitlementsColumnManagerModal.js',
    export: 'WeeklyEntitlementsColumnManagerModal',
    replacement: `      <WeeklyEntitlementsColumnManagerModal
        isOpen={isColumnManagerOpen}
        onClose={() => setIsColumnManagerOpen(false)}
        entitlementsColumns={entitlementsColumns}
        visibleColumns={visibleColumns}
        columnVisibility={columnVisibility}
        customColumns={customColumns}
        setEditingBadgeColumn={setEditingBadgeColumn}
        setIsBadgeColorModalOpen={setIsBadgeColorModalOpen}
        setIsImportColumnModalOpen={setIsImportColumnModalOpen}
        fetchAvailableTables={fetchAvailableTables}
        moveColumnUp={moveColumnUp}
        moveColumnDown={moveColumnDown}
        handleToggleColumnVisibility={handleToggleColumnVisibility}
        handleDeleteColumn={handleDeleteColumn}
        addColumnFromSystem={addColumnFromSystem}
        removeColumnFromDisplay={removeColumnFromDisplay}
        addCustomColumn={addCustomColumn}
        removeCustomColumn={removeCustomColumn}
        toggleColumnVisibility={toggleColumnVisibility}
        savePreferences={savePreferences}
        resetPreferences={resetPreferences}
        debouncedSave={debouncedSave}
      />`,
  },
  {
    open: '      <Modal isOpen={isDeductionColumnManagerOpen}',
    file: 'WeeklyDeductionsColumnManagerModal.js',
    export: 'WeeklyDeductionsColumnManagerModal',
    replacement: `      <WeeklyDeductionsColumnManagerModal
        isOpen={isDeductionColumnManagerOpen}
        onClose={() => setIsDeductionColumnManagerOpen(false)}
        deductionsColumns={deductionsColumns}
        visibleDeductionColumns={visibleDeductionColumns}
        columnVisibility={columnVisibility}
        setIsImportColumnModalOpen={setIsImportColumnModalOpen}
        fetchAvailableTables={fetchAvailableTables}
        moveDeductionColumnUp={moveDeductionColumnUp}
        moveDeductionColumnDown={moveDeductionColumnDown}
        handleToggleColumnVisibility={handleToggleColumnVisibility}
        handleDeleteColumn={handleDeleteColumn}
        addDeductionColumnFromSystem={addDeductionColumnFromSystem}
        removeDeductionColumnFromDisplay={removeDeductionColumnFromDisplay}
        toggleDeductionColumnVisibility={toggleDeductionColumnVisibility}
        savePreferences={savePreferences}
        resetPreferences={resetPreferences}
        debouncedSave={debouncedSave}
      />`,
  },
  {
    open: '      <Modal isOpen={isMainTableColumnManagerOpen}',
    file: 'WeeklyMainTableColumnManagerModal.js',
    export: 'WeeklyMainTableColumnManagerModal',
    replacement: `      <WeeklyMainTableColumnManagerModal
        isOpen={isMainTableColumnManagerOpen}
        onClose={() => setIsMainTableColumnManagerOpen(false)}
        weeklyMainColumns={weeklyMainColumns}
        setEditingMainTableBadgeColumn={setEditingMainTableBadgeColumn}
        setIsMainTableBadgeColorModalOpen={setIsMainTableBadgeColorModalOpen}
        toggleWeeklyMainColumn={toggleWeeklyMainColumn}
        moveWeeklyMainColumn={moveWeeklyMainColumn}
        savePreferences={savePreferences}
        debouncedSave={debouncedSave}
      />`,
  },
];

const columnImports = [];

for (const cm of columnModals) {
  const { block } = extractModalByOpen(cm.open);
  let jsx = block
    .replace(/isOpen=\{isColumnManagerOpen\}/, 'isOpen={isOpen}')
    .replace(/isOpen=\{isDeductionColumnManagerOpen\}/, 'isOpen={isOpen}')
    .replace(/isOpen=\{isMainTableColumnManagerOpen\}/, 'isOpen={isOpen}')
    .replace(/onClose=\{\(\) => setIsColumnManagerOpen\(false\)\}/, 'onClose={onClose}')
    .replace(/onClose=\{\(\) => setIsDeductionColumnManagerOpen\(false\)\}/, 'onClose={onClose}')
    .replace(/onClose=\{\(\) => setIsMainTableColumnManagerOpen\(false\)\}/, 'onClose={onClose}');

  const imports = `import React from 'react';
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
  Card,
  CardBody,
  Badge,
  IconButton,
  SimpleGrid,
  FormControl,
  FormLabel,
  Input,
  Switch,
  Divider,
} from '@chakra-ui/react';
import {
  FiSettings,
  FiDownload,
  FiPlus,
  FiMinus,
  FiChevronUp,
  FiChevronDown,
  FiEye,
  FiEyeOff,
  FiTrash2,
  FiEdit,
  FiSave,
  FiRefreshCw,
  FiDroplet,
  FiMove,
} from 'react-icons/fi';
import ChakraEnglishKeyTooltip from '../../ChakraEnglishKeyTooltip';
import { debugLog } from '../../../utils/debugLog';
import { WEEKLY_MAIN_TABLE_ALLOWED } from '../../../utils/salary/weeklySalaryConstants';`;

  const propsList = cm.replacement
    .match(/\n\s+(\w+)=\{/g)
    .map((s) => s.trim().replace('={', ''))
    .filter((p) => !['isOpen', 'onClose'].includes(p))
    .join(',\n  ');

  const fileContent = `${imports}

const ${cm.export} = ({
  isOpen,
  onClose,
  ${propsList},
}) => (
${dedent(jsx)}
);

export default ${cm.export};
`;

  fs.writeFileSync(path.join(MODALS_DIR, cm.file), fileContent, 'utf8');
  replaceModal(cm.open, cm.replacement);
  columnImports.push(`import ${cm.export} from '../components/salary/modals/${cm.file.replace('.js', '')}';`);
  console.log('Wrote', cm.file);
}

for (const imp of columnImports) addImport(imp);

fs.writeFileSync(PAGE, page, 'utf8');
console.log('Batch 3 done');

/**
 * يربط PremiumWeeklySalary.js بالـ hooks الجديدة — يحافظ على UTF-8
 */
const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '../src/pages/PremiumWeeklySalary.js');
let lines = fs.readFileSync(pagePath, 'utf8').split(/\r?\n/);

// إضافة imports
const importHooks = `import useWeeklySalaryData from '../hooks/salary/useWeeklySalaryData';
import useWeeklySalaryColumns from '../hooks/salary/useWeeklySalaryColumns';`;

if (!lines.some((l) => l.includes('useWeeklySalaryData'))) {
  const useCurrencyIdx = lines.findIndex((l) => l.includes("import useCurrency from"));
  lines.splice(useCurrencyIdx + 1, 0, '', importHooks);
}

const statesIdx = lines.findIndex((l) => l.trim() === '// States');
const filterIdx = lines.findIndex((l) => l.includes('// Filter data + sorting'));

if (statesIdx < 0 || filterIdx < 0) {
  console.error('Could not find state block', { statesIdx, filterIdx });
  process.exit(1);
}

const hookBlock = `  const toast = useToast();
  const navigate = useNavigate();
  const { formatCurrency: fmtCurrency } = useCurrency();

  const {
    loading,
    tableData,
    setTableData,
    departments,
    selectedDateRange,
    setSelectedDateRange,
    rangePickerValue,
    setRangePickerValue,
    isAutomaticMode,
    setIsAutomaticMode,
    weeklyPeriodIncompleteCount,
    setWeeklyPeriodIncompleteCount,
    sortConfig,
    handleSort,
    formatDateRange,
    handleRangePickerChange,
    handleSetCurrentWeek,
    handleSetPreviousWeek,
    fetchData,
    fetchDepartments,
    fetchWeeklyPeriodIncompleteCount,
    recomputeAttendanceRangeForWeeklyPrint,
    getCurrentWeekRange,
    getWeekRangeForDate,
  } = useWeeklySalaryData({ toast });

  const {
    dynamicColumns,
    setDynamicColumns,
    entitlementsColumns,
    setEntitlementsColumns,
    deductionsColumns,
    setDeductionsColumns,
    customColumns,
    setCustomColumns,
    columnVisibility,
    setColumnVisibility,
    visibleColumns,
    setVisibleColumns,
    visibleDeductionColumns,
    setVisibleDeductionColumns,
    isColumnManagerOpen,
    setIsColumnManagerOpen,
    isDeductionColumnManagerOpen,
    setIsDeductionColumnManagerOpen,
    isMainTableColumnManagerOpen,
    setIsMainTableColumnManagerOpen,
    isBadgeColorModalOpen,
    setIsBadgeColorModalOpen,
    editingBadgeColumn,
    setEditingBadgeColumn,
    isMainTableBadgeColorModalOpen,
    setIsMainTableBadgeColorModalOpen,
    editingMainTableBadgeColumn,
    setEditingMainTableBadgeColumn,
    isImportColumnModalOpen,
    setIsImportColumnModalOpen,
    availableTables,
    selectedTable,
    setSelectedTable,
    importableColumns,
    importMode,
    weeklyMainColumns,
    toggleWeeklyMainColumn,
    moveWeeklyMainColumn,
    fetchDynamicColumns,
    fetchAllSalaryColumns,
    fetchEntitlementsColumns,
    fetchDeductionsColumns,
    fetchAvailableTables,
    fetchImportableColumns,
    importColumn,
    addCustomColumn,
    removeCustomColumn,
    toggleColumnVisibility,
    addColumnFromSystem,
    removeColumnFromDisplay,
    savePreferences,
    debouncedSave,
    loadPreferences,
    createDefaultPreferences,
    updateBadgeColor,
    resetPreferences,
    handleMoveColumn,
    handleToggleColumnVisibility,
    handleDeleteColumn,
    moveColumnUp,
    moveColumnDown,
    moveDeductionColumnUp,
    moveDeductionColumnDown,
    toggleDeductionColumnVisibility,
    addDeductionColumnFromSystem,
    removeDeductionColumnFromDisplay,
  } = useWeeklySalaryColumns({ toast, onRefreshData: fetchData });

  const [searchTerm, setSearchTerm] = useState('');
  const [salaryTypeFilter, setSalaryTypeFilter] = useState('Weekly');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [activeTable, setActiveTable] = useState('weekly_salary_entitlements');
  const [formatCurrency, setFormatCurrency] = useState(true);
  const [editingBonusRowId, setEditingBonusRowId] = useState(null);
  const [savingRowId, setSavingRowId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isFixIncompleteModalOpen, setIsFixIncompleteModalOpen] = useState(false);
  const [incompleteRecords, setIncompleteRecords] = useState([]);
  const [savingIncompleteFix, setSavingIncompleteFix] = useState(false);
  const [detailsModalDateRange, setDetailsModalDateRange] = useState(() => [
    dayjs().startOf('week'),
    dayjs().endOf('week'),
  ]);
  const [detailsRangePickerValue, setDetailsRangePickerValue] = useState(() => [
    dayjs().startOf('week'),
    dayjs().endOf('week'),
  ]);
  const [isAttendanceHistoryModalOpen, setIsAttendanceHistoryModalOpen] = useState(false);
  const [attendanceHistoryRecords, setAttendanceHistoryRecords] = useState([]);
  const [attendanceHistoryLoading, setAttendanceHistoryLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const weeklyDateToolbarRef = useRef(null);

  const { isOpen: isEmployeeDetailsOpen, onOpen: onEmployeeDetailsOpen, onClose: onEmployeeDetailsClose } = useDisclosure();
  const [employeeDetailsData, setEmployeeDetailsData] = useState(null);`;

lines = [...lines.slice(0, statesIdx), hookBlock, ...lines.slice(filterIdx)];

// إزالة كتل مكررة: date helpers + init effect + mount fetch effect
const content = lines.join('\n');
let patched = content;

// حذف getCurrentWeekRange المحلي إن وُجد
patched = patched.replace(
  /\n  \/\/ Get current week range[\s\S]*?\n  \/\/ Handle view details\n/,
  '\n  // Handle view details\n'
);

// حذف useEffect mount القديم للأعمدة والبيانات
patched = patched.replace(
  /\n  useEffect\(\(\) => \{\n    fetchData\(\);\n    fetchDepartments\(\);\n    fetchDynamicColumns\(\);[\s\S]*?\n  \}, \[fetchData, fetchDepartments, fetchDynamicColumns\]\);\n/,
  '\n'
);

// حذف useEffect focus لإعادة تحميل الأعمدة (موجود في hook)
patched = patched.replace(
  /\n  \/\/ [\s\S]*?SimplifiedDynamicManager[\s\S]*?useEffect\(\(\) => \{\n    const handleFocus[\s\S]*?\n  \}, \[fetchEntitlementsColumns\]\);\n/,
  '\n'
);

// حذف useEffects الأعمدة المكررة (filter is_visible, save on change, saveTimeout cleanup, dynamicColumns log, deduction/entitlements modal)
const effectPatterns = [
  /\n  \/\/ [\s\S]*?is_visible[\s\S]*?useEffect\(\(\) => \{\n    if \(dynamicColumns\.length[\s\S]*?\n  \}, \[dynamicColumns\]\); \/\/ [\s\S]*?\n/,
  /\n  \/\/ [\s\S]*?localStorage[\s\S]*?useEffect\(\(\) => \{\n    if \(visibleColumns\.length[\s\S]*?\n  \}, \[visibleColumns, visibleDeductionColumns, customColumns, savePreferences\]\);\n/,
  /\n  \/\/ [\s\S]*?timeout[\s\S]*?useEffect\(\(\) => \{\n    return \(\) => \{\n      if \(saveTimeout\)[\s\S]*?\n  \}, \[saveTimeout\]\);\n/,
  /\n  \/\/ [\s\S]*?dynamicColumns[\s\S]*?useEffect\(\(\) => \{\n    debugLog\('Dynamic columns updated:'[\s\S]*?\n  \}, \[dynamicColumns\]\);\n/,
  /\n  \/\/ [\s\S]*?deduction[\s\S]*?useEffect\(\(\) => \{\n    if \(isDeductionColumnManagerOpen\)[\s\S]*?\n  \}, \[isDeductionColumnManagerOpen, fetchDeductionsColumns\]\);\n/,
  /\n  \/\/ [\s\S]*?entitlements[\s\S]*?useEffect\(\(\) => \{\n    if \(isColumnManagerOpen\)[\s\S]*?\n  \}, \[isColumnManagerOpen, fetchEntitlementsColumns\]\);\n/,
  /\n  \/\/ [\s\S]*?entitlementsColumns[\s\S]*?useEffect\(\(\) => \{\n    \/\/ [\s\S]*?if \(entitlementsColumns\.length[\s\S]*?\n  \}, \[entitlementsColumns\.length\]\); \/\/ [\s\S]*?\n/,
];

for (const pat of effectPatterns) {
  patched = patched.replace(pat, '\n');
}

fs.writeFileSync(pagePath, patched, 'utf8');
console.log('Patched PremiumWeeklySalary.js');

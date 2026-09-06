import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getApiUrl } from '../utils/apiUrlHelper';
import { useFingerprintToolbar } from '../contexts/FingerprintToolbarContext';
import {
  Box,
  Heading,
  Text,
  HStack,
  VStack,
  SimpleGrid,
  Button,
  Icon,
  useToast,
  Card,
  CardBody,
  CardHeader,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Input,
  Flex,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Divider,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FiUpload,
  FiCheckCircle,
  FiRefreshCw,
  FiDownload,
  FiFile,
  FiAlertCircle,
  FiChevronDown,
} from 'react-icons/fi';
import * as XLSX from 'xlsx';

const ORDERED_KEYS = [
  'ac_no', 'name', 'date', 'clock_in', 'clock_out',
  'late', 'early', 'absent', 'ot_time', 'work_time', 'department', 'week',
];

const COLUMNS = [
  { key: 'ac_no', label: 'كود البصمة' },
  { key: 'name', label: 'اسم الموظف' },
  { key: 'date', label: 'التاريخ' },
  { key: 'clock_in', label: 'وقت الدخول' },
  { key: 'clock_out', label: 'وقت الخروج' },
  { key: 'late', label: 'التأخير' },
  { key: 'early', label: 'الانصراف المبكر' },
  { key: 'absent', label: 'الغياب' },
  { key: 'ot_time', label: 'الإضافي' },
  { key: 'work_time', label: 'ساعات العمل' },
  { key: 'department', label: 'القسم' },
  { key: 'week', label: 'اليوم' },
];

const IMPORT_STEPS = [
  { key: 'upload', label: 'رفع الملف' },
  { key: 'preview', label: 'معاينة البيانات' },
  { key: 'import', label: 'تنفيذ الاستيراد' },
];

const DEFAULT_EMPLOYEE_PREVIEW = {
  weekly: 0,
  monthly: 0,
  active: 0,
  inactive: 0,
  terminated: 0,
  not_in_system: 0,
  unique_in_file: 0,
};

const headerMap = {
  'AC-No.': 'ac_no',
  'AC-No': 'ac_no',
  'AC No': 'ac_no',
  ac_no: 'ac_no',
  Name: 'name',
  'Employee Name': 'name',
  employee_name: 'name',
  Date: 'date',
  'Clock In': 'clock_in',
  'Clock Out': 'clock_out',
  Late: 'late',
  Early: 'early',
  Absent: 'absent',
  'OT Time': 'ot_time',
  'Work Time': 'work_time',
  Department: 'department',
  week: 'week',
  Week: 'week',
};

const normalizeHeader = (h) => {
  const key = (h || '').toString().trim();
  return headerMap[key] || key.toLowerCase();
};

const toTsvFromRows = (rows, orderedKeys) => {
  const headerLine = orderedKeys.join('\t');
  const dataLines = rows.map((row) => orderedKeys.map((k) => row[k] ?? '').join('\t'));
  return [headerLine, ...dataLines].join('\n');
};

const PreviewStatBox = ({ label, value, color }) => (
  <Box
    bg="var(--stake-bg-secondary, #152636)"
    border="1px solid"
    borderColor="var(--stake-border-primary)"
    borderRadius="xl"
    p={3}
    textAlign="center"
  >
    <Text fontSize="xs" color="var(--stake-text-secondary, #d5dceb)" mb={1}>
      {label}
    </Text>
    <Text fontSize="2xl" fontWeight="bold" color={color} lineHeight="1.2">
      {value}
    </Text>
  </Box>
);

const FingerprintImportTab = () => {
  const toast = useToast();
  const { setImportStats, clearImportHeader } = useFingerprintToolbar();
  const { isOpen: isResultOpen, onOpen: onResultOpen, onClose: onResultClose } = useDisclosure();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [csvData, setCsvData] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [employeePreview, setEmployeePreview] = useState(DEFAULT_EMPLOYEE_PREVIEW);
  const [newAcNos, setNewAcNos] = useState(() => new Set());
  const [acNoSortNewFirst, setAcNoSortNewFirst] = useState(false);
  const [employeePreviewLoading, setEmployeePreviewLoading] = useState(false);

  const resetImport = useCallback(() => {
    setCsvData('');
    setPreviewData([]);
    setSelectedFile(null);
    setImportResult(null);
    setImportProgress(0);
    setEmployeePreview(DEFAULT_EMPLOYEE_PREVIEW);
    setNewAcNos(new Set());
    setAcNoSortNewFirst(false);
    onResultClose();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onResultClose]);

  const filePreviewStats = useMemo(() => {
    if (!previewData.length) return null;

    const acNos = new Set();
    const departments = new Set();
    const dates = [];
    let absentCount = 0;

    previewData.forEach((row) => {
      const ac = (row.ac_no || '').trim();
      if (ac) acNos.add(ac);
      const dept = (row.department || '').trim();
      if (dept) departments.add(dept);
      const date = (row.date || '').trim();
      if (date) dates.push(date);
      const absent = (row.absent || '').trim().toLowerCase();
      if (['true', '1', 'yes'].includes(absent)) absentCount += 1;
    });

    dates.sort();

    return {
      records: previewData.length,
      uniqueAcNos: acNos.size,
      departments: departments.size,
      dateFrom: dates[0] || '—',
      dateTo: dates[dates.length - 1] || '—',
      absentCount,
    };
  }, [previewData]);

  const duplicateAcNoWarnings = useMemo(() => {
    const byAc = {};
    previewData.forEach((row) => {
      const ac = (row.ac_no || '').trim();
      const name = (row.name || '').trim();
      if (!ac) return;
      if (!byAc[ac]) byAc[ac] = new Set();
      if (name) byAc[ac].add(name);
    });
    return Object.entries(byAc)
      .filter(([, names]) => names.size > 1)
      .map(([ac, names]) => ({ ac, names: [...names] }));
  }, [previewData]);

  const isNewAcNo = useCallback((acNo) => {
    const ac = (acNo || '').trim();
    return ac !== '' && newAcNos.has(ac);
  }, [newAcNos]);

  const newAcRecordCount = useMemo(
    () => previewData.filter((row) => isNewAcNo(row.ac_no)).length,
    [previewData, isNewAcNo]
  );

  const sortedPreviewData = useMemo(() => {
    if (!acNoSortNewFirst) return previewData;

    return [...previewData].sort((a, b) => {
      const aIsNew = isNewAcNo(a.ac_no);
      const bIsNew = isNewAcNo(b.ac_no);
      if (aIsNew !== bIsNew) {
        return aIsNew ? -1 : 1;
      }

      const aAc = (a.ac_no || '').trim();
      const bAc = (b.ac_no || '').trim();
      const acCompare = aAc.localeCompare(bAc, undefined, { numeric: true, sensitivity: 'base' });
      if (acCompare !== 0) return acCompare;

      const aDate = (a.date || '').trim();
      const bDate = (b.date || '').trim();
      return aDate.localeCompare(bDate, undefined, { numeric: true });
    });
  }, [previewData, acNoSortNewFirst, isNewAcNo]);

  const toggleAcNoSort = useCallback(() => {
    setAcNoSortNewFirst((prev) => !prev);
  }, []);

  const loadEmployeePreview = useCallback(async (rows) => {
    const acNos = [...new Set(rows.map((r) => (r.ac_no || '').trim()).filter(Boolean))];
    if (!acNos.length) {
      setEmployeePreview(DEFAULT_EMPLOYEE_PREVIEW);
      setNewAcNos(new Set());
      return;
    }

    setEmployeePreviewLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/import_fingerprint_data.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview_employee_stats', ac_nos: acNos }),
      });
      const data = await response.json();
      if (data.success && data.stats) {
        setEmployeePreview(data.stats);
        setNewAcNos(new Set((data.new_ac_nos || []).map((ac) => String(ac).trim()).filter(Boolean)));
      } else {
        setEmployeePreview({ ...DEFAULT_EMPLOYEE_PREVIEW, unique_in_file: acNos.length });
        setNewAcNos(new Set());
      }
    } catch {
      setEmployeePreview({ ...DEFAULT_EMPLOYEE_PREVIEW, unique_in_file: acNos.length });
      setNewAcNos(new Set());
    } finally {
      setEmployeePreviewLoading(false);
    }
  }, []);

  const currentStepIndex = loading
    ? 2
    : importResult
      ? 2
      : previewData.length > 0
        ? 1
        : 0;

  useEffect(() => {
    const phase = loading
      ? 'importing'
      : importResult
        ? 'done'
        : previewData.length > 0
          ? 'ready'
          : 'idle';

    setImportStats({
      recordCount: previewData.length,
      fileName: selectedFile?.name || null,
      fileSizeKb: selectedFile ? Number((selectedFile.size / 1024).toFixed(1)) : null,
      phase,
      progress: importProgress,
      importedCount: importResult?.imported_count ?? null,
      updatedCount: importResult?.updated_count ?? null,
      skippedCount: importResult?.skipped_lines ?? null,
    });
  }, [
    previewData.length,
    selectedFile,
    loading,
    importResult,
    importProgress,
    setImportStats,
  ]);

  useEffect(() => () => clearImportHeader(), [clearImportHeader]);

  const parseAndPreviewData = async (data) => {
    const lines = data.split('\n').filter((line) => line.trim());
    if (lines.length === 0) {
      setPreviewData([]);
      return [];
    }
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const rawHeaders = lines[0].split(delimiter).map((h) => h.trim());
    const headers = rawHeaders.map(normalizeHeader);

    const parsedData = lines.slice(1).map((line, index) => {
      const values = line.split(delimiter).map((v) => v.trim());
      const row = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      row.key = index;
      return row;
    });

    const formatted = parsedData.map((r) => {
      const o = {};
      ORDERED_KEYS.forEach((k) => {
        o[k] = r[k] ?? '';
      });
      return o;
    });
    setPreviewData(formatted);
    return formatted;
  };

  const processFile = async (file) => {
    if (!file) return;

    setSelectedFile(file);
    setImportResult(null);
    setImportProgress(0);
    setAcNoSortNewFirst(false);
    onResultClose();

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx')) {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

      if (!aoa || aoa.length === 0) {
        setPreviewData([]);
        setCsvData('');
        setEmployeePreview(DEFAULT_EMPLOYEE_PREVIEW);
        setNewAcNos(new Set());
        return;
      }

      const rawHeaders = aoa[0];
      const dataRows = aoa
        .slice(1)
        .filter((r) => r && r.some((c) => (c ?? '').toString().trim() !== ''));

      const normalizedRows = dataRows
        .map((row, index) => {
          if (!row || row.length < 3) return null;

          const obj = {};
          rawHeaders.forEach((h, i) => {
            const key = normalizeHeader(h);
            let value = '';
            if (row[i] !== null && row[i] !== undefined) {
              value = row[i].toString().trim();
            }
            obj[key] = value;
          });

          if (!obj.ac_no && !obj.name && !obj.date) return null;
          obj.key = index;
          return obj;
        })
        .filter(Boolean);

      const previewDataFormatted = normalizedRows.map((r) => {
        const o = {};
        ORDERED_KEYS.forEach((k) => {
          o[k] = r[k] ?? '';
        });
        return o;
      });

      setPreviewData(previewDataFormatted);
      setCsvData(toTsvFromRows(normalizedRows, ORDERED_KEYS));
      await loadEmployeePreview(previewDataFormatted);
    } else {
      const data = await file.text();
      setCsvData(data);
      const formatted = await parseAndPreviewData(data);
      await loadEmployeePreview(formatted);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await processFile(file);
      toast({
        title: 'تم رفع الملف',
        description: `جاهز للمعاينة — ${file.name}`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'خطأ في رفع الملف',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.csv') && !lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      toast({
        title: 'نوع ملف غير مدعوم',
        description: 'يرجى رفع ملف Excel أو CSV',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      await processFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast({
        title: 'تم رفع الملف',
        description: `جاهز للمعاينة — ${file.name}`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'خطأ في رفع الملف',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleImportResultClose = useCallback(() => {
    setImportResult(null);
    onResultClose();
  }, [onResultClose]);

  const handleImport = async () => {
    if (!csvData || previewData.length === 0) {
      toast({
        title: 'لا توجد بيانات',
        description: 'ارفع ملفاً يحتوي على سجلات أولاً',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      setLoading(true);
      setImportProgress(0);

      const progressInterval = setInterval(() => {
        setImportProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(getApiUrl('/api/import_fingerprint_data.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_csv_data',
          csv_data: csvData,
          file_name: selectedFile?.name || 'imported_data.csv',
        }),
      });

      const result = await response.json();
      clearInterval(progressInterval);
      setImportProgress(100);

      if (result.success) {
        setImportResult(result);
        onResultOpen();
      } else {
        toast({
          title: 'فشل في الاستيراد',
          description: result.message,
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      setImportProgress(0);
      toast({
        title: 'خطأ في استيراد البيانات',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ORDERED_KEYS,
      ['1001', 'أحمد محمد', '2024-01-01', '08:00', '17:00', '0', '0', '0', '0', '8', 'IT', 'الاثنين'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'fingerprint_template.xlsx');

    toast({
      title: 'تم تحميل القالب',
      description: 'استخدمه كمرجع لأعمدة الملف',
      status: 'success',
      duration: 3000,
    });
  };

  const renderFilePreviewPanel = (title) => (
    previewData.length > 0 && (
      <Box w="full" mt={4}>
        <HStack justify="space-between" mb={2} flexWrap="wrap" gap={2}>
          <Text fontSize="sm" fontWeight="600" color="var(--stake-text-primary, white)">
            {title}
          </Text>
          {employeePreviewLoading && <Spinner size="sm" color="blue.300" />}
        </HStack>

        <Text fontSize="xs" color="var(--stake-text-secondary, #d5dceb)" mb={2}>
          توزيع الموظفين المسجّلين في النظام حسب أكواد البصمة في الملف
        </Text>
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} w="full" mb={3}>
          <PreviewStatBox label="أسبوعي" value={employeePreview.weekly} color="blue.300" />
          <PreviewStatBox label="شهري" value={employeePreview.monthly} color="purple.300" />
          <PreviewStatBox label="نشط" value={employeePreview.active} color="green.400" />
          <PreviewStatBox label="غير نشط" value={employeePreview.inactive} color="orange.300" />
        </SimpleGrid>

        {filePreviewStats && (
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} w="full">
            <PreviewStatBox label="سجلات حضور" value={filePreviewStats.records} color="cyan.300" />
            <PreviewStatBox label="أكواد بصمة" value={filePreviewStats.uniqueAcNos} color="teal.300" />
            <PreviewStatBox label="أكواد جديدة" value={employeePreview.not_in_system} color="yellow.300" />
            <PreviewStatBox label="سجلات غياب" value={filePreviewStats.absentCount} color="red.300" />
          </SimpleGrid>
        )}

        {filePreviewStats && (
          <Text fontSize="xs" color="var(--stake-text-secondary, #d5dceb)" mt={2}>
            الفترة: {filePreviewStats.dateFrom} — {filePreviewStats.dateTo}
            {filePreviewStats.departments > 0 ? ` · ${filePreviewStats.departments} قسم` : ''}
            {employeePreview.terminated > 0 ? ` · منتهي: ${employeePreview.terminated}` : ''}
          </Text>
        )}
      </Box>
    )
  );

  return (
    <Box className="tp-fingerprint-import-tab" flexShrink={0} w="100%">
        <HStack
          className="tp-fingerprint-import-steps"
          spacing={{ base: 2, md: 4 }}
          mb={6}
          flexWrap="wrap"
          justify="center"
        >
          {IMPORT_STEPS.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isDone = index < currentStepIndex;
            return (
              <HStack
                key={step.key}
                className={`tp-fingerprint-import-step${isActive ? ' tp-fingerprint-import-step--active' : ''}${isDone ? ' tp-fingerprint-import-step--done' : ''}`}
                spacing={2}
                px={3}
                py={2}
                borderRadius="xl"
              >
                <Flex
                  align="center"
                  justify="center"
                  boxSize="7"
                  borderRadius="full"
                  fontSize="sm"
                  fontWeight="bold"
                  className="tp-fingerprint-import-step__num"
                >
                  {isDone ? <Icon as={FiCheckCircle} boxSize={4} /> : index + 1}
                </Flex>
                <Text fontSize="sm" fontWeight={isActive ? '600' : '500'}>
                  {step.label}
                </Text>
              </HStack>
            );
          })}
        </HStack>

        <Card
          bg="var(--stake-bg-primary, #0f212e)"
          borderRadius="xl"
          border="1px solid"
          borderColor="var(--stake-border-primary, #3e5665)"
          mb={6}
        >
          <CardHeader pb={2}>
            <HStack justify="space-between" flexWrap="wrap" gap={3}>
              <HStack spacing={3}>
                <Icon as={FiUpload} boxSize={6} color="blue.400" />
                <VStack align="flex-start" spacing={0}>
                  <Heading size="md" color="white">
                    رفع ملف البيانات
                  </Heading>
                  <Text className="stake-text-secondary" fontSize="sm">
                    Excel (.xlsx / .xls) أو CSV — اسحب الملف أو اختره
                  </Text>
                </VStack>
              </HStack>
              <HStack spacing={2} flexWrap="wrap">
                <Button
                  leftIcon={<FiDownload />}
                  className="stake-btn-secondary"
                  size="sm"
                  borderRadius="lg"
                  onClick={downloadTemplate}
                >
                  تحميل القالب
                </Button>
                <Button
                  leftIcon={<FiRefreshCw />}
                  className="stake-btn"
                  size="sm"
                  borderRadius="lg"
                  onClick={resetImport}
                  isDisabled={!selectedFile && !importResult}
                >
                  إعادة تعيين
                </Button>
              </HStack>
            </HStack>
          </CardHeader>
          <CardBody pt={2}>
            <Box
              className={`tp-fingerprint-import-dropzone${isDragOver ? ' tp-fingerprint-import-dropzone--active' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
              }}
            >
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                display="none"
              />
              <VStack spacing={3} py={8}>
                <Flex
                  align="center"
                  justify="center"
                  boxSize="14"
                  borderRadius="2xl"
                  className="tp-fingerprint-import-dropzone__icon"
                >
                  <Icon as={selectedFile ? FiFile : FiUpload} boxSize={7} />
                </Flex>
                {selectedFile ? (
                  <>
                    <Text color="white" fontWeight="600" fontSize="md" textAlign="center">
                      {selectedFile.name}
                    </Text>
                    <Text className="stake-text-secondary" fontSize="sm">
                      {(selectedFile.size / 1024).toFixed(1)} KB — انقر أو اسحب ملفاً آخر للاستبدال
                    </Text>
                  </>
                ) : (
                  <>
                    <Text color="white" fontWeight="600" fontSize="md">
                      اسحب الملف هنا أو انقر للاختيار
                    </Text>
                    <Text className="stake-text-secondary" fontSize="sm" textAlign="center">
                      الأعمدة المدعومة: كود البصمة، الاسم، التاريخ، الدخول، الخروج…
                    </Text>
                  </>
                )}
              </VStack>
            </Box>

            {duplicateAcNoWarnings.length > 0 && (
              <Alert status="warning" borderRadius="xl" mt={4}>
                <AlertIcon />
                <Box>
                  <AlertTitle>تنبيه: كود بصمة مكرر في الملف</AlertTitle>
                  <AlertDescription fontSize="sm">
                    {duplicateAcNoWarnings.map((w) => (
                      <Text key={w.ac} mt={1}>
                        الكود {w.ac} مرتبط بأسماء مختلفة: {w.names.join(' — ')}.
                      </Text>
                    ))}
                  </AlertDescription>
                </Box>
              </Alert>
            )}

            {renderFilePreviewPanel('معاينة الملف قبل الاستيراد')}

            {previewData.length > 0 && (
              <HStack mt={4} justify="flex-end" flexWrap="wrap" gap={2}>
                <Badge colorScheme="blue" borderRadius="full" px={3} py={1}>
                  {previewData.length} سجل جاهز
                </Badge>
                <Button
                  leftIcon={<FiUpload />}
                  className="stake-btn-success"
                  size="md"
                  borderRadius="xl"
                  onClick={handleImport}
                  isLoading={loading}
                  loadingText="جاري الاستيراد..."
                >
                  استيراد البيانات
                </Button>
              </HStack>
            )}
          </CardBody>
        </Card>

        {loading && (
          <Card
            bg="var(--stake-bg-primary, #0f212e)"
            borderRadius="xl"
            border="1px solid"
            borderColor="var(--stake-border-primary, #3e5665)"
            mb={6}
          >
            <CardBody p={5}>
              <VStack spacing={3} align="stretch">
                <HStack spacing={3}>
                  <Spinner size="sm" color="blue.400" />
                  <Text color="white" fontWeight="600">
                    جاري استيراد البيانات...
                  </Text>
                </HStack>
                <Progress value={importProgress} size="lg" colorScheme="blue" borderRadius="full" />
                <Text className="stake-text-secondary" fontSize="sm">
                  {importProgress}% مكتمل
                </Text>
              </VStack>
            </CardBody>
          </Card>
        )}

        {previewData.length > 0 && (
          <Box
            borderRadius="xl"
            border="1px solid"
            borderColor="var(--stake-border-primary, #3e5665)"
            bg="var(--stake-content-surface-raised, var(--stake-bg-card))"
            overflow="hidden"
          >
            <HStack
              justify="space-between"
              px={{ base: 3, md: 4 }}
              pt={4}
              pb={2}
              flexWrap="wrap"
              gap={2}
            >
              <Heading size="md" className="stake-heading-3">
                معاينة البيانات
              </Heading>
              <HStack spacing={2} flexWrap="wrap">
                {newAcNos.size > 0 && (
                  <Badge colorScheme="yellow" borderRadius="full" px={3} py={1} variant="subtle">
                    {newAcRecordCount} سجل بكود جديد · {newAcNos.size} موظف جديد
                  </Badge>
                )}
                <Text fontSize="sm" color="var(--stake-text-secondary)">
                  {previewData.length} سجل
                </Text>
              </HStack>
            </HStack>
            {newAcNos.size > 0 && (
              <HStack px={{ base: 3, md: 4 }} pb={2} spacing={2} align="center">
                <Box
                  w="14px"
                  h="14px"
                  borderRadius="sm"
                  bg="rgba(245, 158, 11, 0.22)"
                  border="1px solid"
                  borderColor="rgba(245, 158, 11, 0.55)"
                  flexShrink={0}
                />
                <Text fontSize="xs" color="var(--stake-text-secondary, #d5dceb)">
                  الصفوف المظلّلة: كود بصمة غير مسجّل في النظام — انقر عمود «كود البصمة» لإظهار الأكواد الجديدة أولاً
                </Text>
              </HStack>
            )}
            <TableContainer
              maxH="55vh"
              overflowY="auto"
              overflowX="auto"
              sx={{
                '&::-webkit-scrollbar': { width: '8px', height: '8px' },
                '&::-webkit-scrollbar-track': { background: 'var(--stake-bg-secondary)' },
                '&::-webkit-scrollbar-thumb': {
                  background: 'var(--stake-border-primary)',
                  borderRadius: '4px',
                },
              }}
            >
              <Table variant="simple" size="xs" className="stake-table main-content compact-data-table">
                <Thead
                  sx={{
                    '& th': {
                      color: 'var(--stake-table-header-text, var(--stake-text-primary)) !important',
                    },
                  }}
                >
                  <Tr>
                    {COLUMNS.map((col) => (
                      col.key === 'ac_no' ? (
                        <Th
                          key={col.key}
                          className="tp-fingerprint-preview-th--sortable"
                          cursor="pointer"
                          userSelect="none"
                          onClick={toggleAcNoSort}
                          title={acNoSortNewFirst ? 'إلغاء الترتيب — العودة لترتيب الملف' : 'ترتيب: الأكواد الجديدة أولاً'}
                          bg={acNoSortNewFirst ? 'rgba(245, 158, 11, 0.12)' : undefined}
                          _hover={{ bg: 'rgba(59, 130, 246, 0.12)' }}
                        >
                          <HStack spacing={1} justify="center">
                            <Text as="span">{col.label}</Text>
                            {acNoSortNewFirst && (
                              <Icon as={FiChevronDown} boxSize={3} color="yellow.300" aria-hidden />
                            )}
                          </HStack>
                        </Th>
                      ) : (
                        <Th key={col.key}>{col.label}</Th>
                      )
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {sortedPreviewData.map((row, index) => {
                    const isNewRow = isNewAcNo(row.ac_no);
                    return (
                      <Tr
                        key={index}
                        className={isNewRow ? 'tp-fingerprint-preview-row--new' : undefined}
                        bg={isNewRow ? 'rgba(245, 158, 11, 0.1)' : undefined}
                        _hover={{
                          bg: isNewRow ? 'rgba(245, 158, 11, 0.18)' : 'var(--stake-bg-hover)',
                        }}
                      >
                        {COLUMNS.map((col) => (
                          <Td key={col.key}>
                            {col.key === 'ac_no' && isNewRow ? (
                              <HStack spacing={1} maxW="full">
                                <Text color="yellow.300" fontSize="sm" fontWeight="600" noOfLines={1}>
                                  {row[col.key] || '—'}
                                </Text>
                                <Badge colorScheme="yellow" fontSize="2xs" borderRadius="md" flexShrink={0}>
                                  جديد
                                </Badge>
                              </HStack>
                            ) : (
                              <Text
                                color={isNewRow ? 'var(--stake-text-primary, #eef2f7)' : 'var(--stake-text-secondary)'}
                                fontSize="sm"
                                noOfLines={1}
                              >
                                {row[col.key] || '—'}
                              </Text>
                            )}
                          </Td>
                        ))}
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        )}

      {/* مودال نتيجة الاستيراد */}
      <Modal
        isOpen={isResultOpen && !!importResult}
        onClose={handleImportResultClose}
        isCentered
        size={{ base: 'md', lg: '4xl' }}
        scrollBehavior="inside"
      >
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(8px)" />
        <ModalContent
          bg="var(--stake-bg-primary)"
          border="none"
          borderRadius="2xl"
          boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          overflow="hidden"
          maxH="90vh"
        >
          <ModalHeader
            bg="var(--stake-bg-primary)"
            color="white"
            borderRadius="16px 16px 0 0"
            p="3"
            boxShadow="0 2px 10px rgba(0, 0, 0, 0.4)"
          >
            <HStack justify="space-between" align="center" w="full">
              <ModalCloseButton
                color="white"
                bg="rgba(255, 255, 255, 0.1)"
                borderRadius="full"
                size="sm"
                _hover={{ bg: 'rgba(255, 255, 255, 0.2)' }}
                position="relative"
                top="0"
                right="0"
                left="0"
              />
              <HStack spacing="3" align="center" flex="1" justify="center">
                <Box
                  bg={
                    Number(importResult?.pending_employee_sync || 0) > 0
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(34, 197, 94, 0.15)'
                  }
                  borderRadius="full"
                  p="2"
                >
                  <Icon
                    as={Number(importResult?.pending_employee_sync || 0) > 0 ? FiAlertCircle : FiCheckCircle}
                    color={Number(importResult?.pending_employee_sync || 0) > 0 ? '#f59e0b' : '#22c55e'}
                    boxSize="4"
                  />
                </Box>
                <Text fontSize="md" fontWeight="bold" color="var(--stake-text-primary, #ffffff)">
                  {Number(importResult?.pending_employee_sync || 0) > 0
                    ? 'تم الاستيراد — يتطلب مزامنة'
                    : 'تم الاستيراد بنجاح'}
                </Text>
              </HStack>
              <Box w="30px" />
            </HStack>
          </ModalHeader>

          <ModalBody p="5">
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5} w="full">
              <Box
                bg="var(--stake-bg-secondary, #152636)"
                border="1px solid"
                borderColor="var(--stake-border-primary)"
                borderRadius="xl"
                p={4}
              >
                <Text fontSize="sm" fontWeight="700" color="var(--stake-text-primary, white)" mb={3}>
                  ملخص الاستيراد
                </Text>
                <VStack align="stretch" spacing={0} divider={<Divider borderColor="var(--stake-border-primary)" />}>
                  {[
                    { label: 'سجلات مستوردة', value: importResult?.imported_count ?? 0, color: 'green.400' },
                    { label: 'سطور معالجة', value: importResult?.processed_lines ?? 0 },
                    { label: 'سطور متجاهلة', value: importResult?.skipped_lines ?? 0, color: 'orange.300' },
                    { label: 'أقسام جديدة', value: importResult?.created_departments ?? 0, color: 'purple.300' },
                    {
                      label: 'موظفون جدد بانتظار المزامنة',
                      value: importResult?.pending_employee_sync ?? 0,
                      color: Number(importResult?.pending_employee_sync || 0) > 0 ? 'yellow.300' : undefined,
                    },
                  ].map((row) => (
                    <HStack key={row.label} justify="space-between" py={2.5}>
                      <Text fontSize="sm" color="var(--stake-text-secondary, #d5dceb)">
                        {row.label}
                      </Text>
                      <Text fontSize="sm" fontWeight="700" color={row.color || 'var(--stake-text-primary, white)'}>
                        {row.value}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>

              <Box
                bg="var(--stake-bg-secondary, #152636)"
                border="1px solid"
                borderColor="var(--stake-border-primary)"
                borderRadius="xl"
                p={4}
              >
                <Text fontSize="sm" fontWeight="700" color="var(--stake-text-primary, white)" mb={3}>
                  معاينة الملف (قبل الاستيراد)
                </Text>
                <SimpleGrid columns={2} spacing={3} mb={3}>
                  <PreviewStatBox label="أسبوعي" value={employeePreview.weekly} color="blue.300" />
                  <PreviewStatBox label="شهري" value={employeePreview.monthly} color="purple.300" />
                  <PreviewStatBox label="نشط" value={employeePreview.active} color="green.400" />
                  <PreviewStatBox label="غير نشط" value={employeePreview.inactive} color="orange.300" />
                </SimpleGrid>

                <Text fontSize="sm" fontWeight="700" color="var(--stake-text-primary, white)" mb={2} mt={2}>
                  الخطوة التالية
                </Text>
                <Text fontSize="sm" color="var(--stake-text-secondary, #d5dceb)" lineHeight="1.7">
                  {Number(importResult?.pending_employee_sync || 0) > 0
                    ? `انتقل لتبويب «التكامل» واضغط «مزامنة الموظفين» لإضافة ${importResult.pending_employee_sync} موظف جديد، ثم «مزامنة التغييرات» لربط الحضور.`
                    : 'انتقل لتبويب «التكامل» واضغط «مزامنة التغييرات» لربط سجلات الحضور بالموظفين.'}
                  {' '}هذا المسار منفصل عن استيراد XML في صفحة الموظفين.
                </Text>

                {duplicateAcNoWarnings.length > 0 && (
                  <Box mt={3}>
                    <Text fontSize="xs" fontWeight="600" color="orange.300" mb={1}>
                      تحذير: أكواد بصمة مكررة في الملف
                    </Text>
                    {duplicateAcNoWarnings.map((w) => (
                      <Text key={w.ac} fontSize="xs" color="var(--stake-text-secondary, #d5dceb)" mt={1}>
                        الكود {w.ac}: {w.names.join(' — ')}
                      </Text>
                    ))}
                  </Box>
                )}

                {Array.isArray(importResult?.errors) && importResult.errors.length > 0 && (
                  <Box mt={3}>
                    <Text fontSize="xs" fontWeight="600" color="red.300" mb={1}>
                      أخطاء ({importResult.errors.length})
                    </Text>
                    <Text fontSize="xs" color="var(--stake-text-secondary, #d5dceb)" noOfLines={4}>
                      {importResult.errors.slice(0, 5).join(' · ')}
                    </Text>
                  </Box>
                )}
              </Box>
            </SimpleGrid>
          </ModalBody>

          <ModalFooter
            justifyContent="center"
            bg="var(--stake-bg-primary)"
            borderTop="1px solid"
            borderColor="var(--stake-border-primary)"
            borderRadius="0 0 12px 12px"
            p="3"
          >
            <Button
              onClick={handleImportResultClose}
              bg="#22c55e"
              color="white"
              _hover={{ bg: '#16a34a' }}
              _active={{ bg: '#15803d' }}
              h="36px"
              px="8"
              fontSize="sm"
              borderRadius="lg"
            >
              إغلاق
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default FingerprintImportTab;

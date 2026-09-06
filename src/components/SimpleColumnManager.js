import React, { useState } from 'react';
import {
  Box,
  Table,
  TableContainer,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  HStack,
  VStack,
  Text,
  Center,
  Button,
  IconButton,
  Input,
  Select,
  Switch,
  Badge,
  Tooltip,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Textarea,
  Alert,
  AlertIcon,
  useToast,
  Icon,
  SimpleGrid
} from '@chakra-ui/react';
import {
  FiEdit,
  FiTrash,
  FiArrowUp,
  FiArrowDown,
  FiSave,
  FiX,
  FiCode,
  FiEye,
  FiInfo,
  FiCheck,
  FiAlertTriangle,
  FiDroplet
} from 'react-icons/fi';
import FormulaPreviewSimple from './FormulaPreviewSimple';

const SimpleColumnManager = ({ columns, allColumns, onUpdateColumn, onDeleteColumn, onMoveColumn, onBadgeColorChange, selectedTable }) => {
  const [editingColumn, setEditingColumn] = useState(null);
  const [editData, setEditData] = useState({});
  const [badgeColorColumn, setBadgeColorColumn] = useState(null);
  const [formulaError, setFormulaError] = useState('');
  const [previewResult, setPreviewResult] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  // دالة تحويل أسماء الأعمدة الإنجليزية إلى العربية
  const translateColumnNames = (formula) => {
    if (!formula) return '';
    
    const columnMap = {
      'base_salary': 'الأساسي',
      'transport_allowance': 'بدل المواصلات',
      'special_bonus': 'مكافأة خاصة',
      'overtime_pay': 'أجر الإضافي',
      'punctuality_bonus': 'أجر الانتظام',
      'total_entitlements': 'إجمالي المستحقات',
      'total_deductions': 'إجمالي المستقطعات',
      'net_salary': 'صافي المرتب',
      'absent_deduction': 'خصم الغياب',
      'late_deduction': 'خصم التأخير',
      'insurance_deduction': 'خصم التأمين',
      'advance_deduction': 'خصم السلفة'
    };
    
    let arabicFormula = formula;
    Object.keys(columnMap).forEach(englishName => {
      const arabicName = columnMap[englishName];
      arabicFormula = arabicFormula.replace(new RegExp(englishName, 'g'), arabicName);
    });
    
    return arabicFormula;
  };

  // دالة البحث عن الاقتراحات
  const findSuggestions = (text, cursorPos) => {
    if (!text || !allColumns) return [];
    
    // استخراج الكلمة الحالية (دعم العربية والإنجليزية)
    const beforeCursor = text.substring(0, cursorPos);
    const afterCursor = text.substring(cursorPos);
    
    // البحث عن الكلمة الحالية (قبل المؤشر) - دعم العربية والإنجليزية
    const wordMatch = beforeCursor.match(/([a-zA-Z_\u0600-\u06FF][a-zA-Z0-9_\u0600-\u06FF]*)$/);
    if (!wordMatch) return [];
    
    const currentWord = wordMatch[1];
    if (currentWord.length < 2) return []; // تحتاج على الأقل حرفين
    
    // البحث في الأعمدة (دعم العربية والإنجليزية)
    const matches = allColumns.filter(column => {
      const key = column.column_key || column.name;
      const arabicName = column.column_name_ar || column.display_name_ar;
      
      // البحث في الاسم الإنجليزي
      const englishMatch = key.toLowerCase().includes(currentWord.toLowerCase());
      
      // البحث في الاسم العربي
      const arabicMatch = arabicName && arabicName.includes(currentWord);
      
      return englishMatch || arabicMatch;
    }).slice(0, 5); // أول 5 نتائج فقط
    
    return matches.map(column => ({
      key: column.column_key || column.name,
      arabic: column.column_name_ar || column.display_name_ar,
      english: column.column_key || column.name
    }));
  };

  // دالة تحديث المعادلة مع الاقتراح
  const insertSuggestion = (suggestion) => {
    const currentFormula = editData.formula || '';
    const beforeCursor = currentFormula.substring(0, cursorPosition);
    const afterCursor = currentFormula.substring(cursorPosition);
    
    // استبدال الكلمة الحالية بالاقتراح (دعم العربية والإنجليزية)
    const wordMatch = beforeCursor.match(/([a-zA-Z_\u0600-\u06FF][a-zA-Z0-9_\u0600-\u06FF]*)$/);
    if (wordMatch) {
      const beforeWord = beforeCursor.substring(0, beforeCursor.lastIndexOf(wordMatch[1]));
      const newFormula = beforeWord + suggestion.english + afterCursor;
      setEditData({ ...editData, formula: newFormula });
      setCursorPosition(beforeWord.length + suggestion.english.length);
    }
    
    setShowSuggestions(false);
    setSuggestions([]);
  };
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const columnTypes = [
    { value: 'text', label: 'نص' },
    { value: 'number', label: 'رقم' },
    { value: 'currency', label: 'عملة' },
    { value: 'date', label: 'تاريخ' },
    { value: 'boolean', label: 'نعم/لا' }
  ];

  const badgeColors = [
    'none', 'blue', 'green', 'red', 'orange', 'purple', 'pink', 'yellow', 'cyan', 'teal', 'gray'
  ];

  const openEditModal = (column, index) => {
    setEditingColumn(index);
    setEditData({ 
      ...column, 
      formula: column.formula || '' // تأكد من أن formula نص
    });
    setFormulaError('');
    setPreviewResult(null);
    onOpen();
  };

  const openBadgeColorModal = (column) => {
    setBadgeColorColumn({ ...column });
  };

  // دالة لحفظ حالة الرؤية في قاعدة البيانات
  const updateColumnVisibility = async (columnId, isVisible, tableName = 'net_weekly_wage') => {
    try {
      const response = await fetch('/api/dynamic_system/dynamic_system_api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggle_column_visibility',
          id: columnId,
          is_visible: isVisible,
          table_name: tableName
        })
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'تم التحديث',
          description: result.message,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } else {
        throw new Error(result.message || 'فشل في تحديث حالة العمود');
      }
    } catch (error) {
      console.error('Error updating column visibility:', error);
      toast({
        title: 'خطأ في التحديث',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const closeEditModal = () => {
    setEditingColumn(null);
    setEditData({});
    setFormulaError('');
    setPreviewResult(null);
    onClose();
  };

  const saveColumn = () => {
    if (!editData.name || editData.name.trim() === '') {
      toast({
        title: 'خطأ في البيانات',
        description: 'اسم العمود مطلوب',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // التحقق من عدم التكرار
    const duplicateIndex = columns.findIndex((col, index) => 
      index !== editingColumn && col.name.toLowerCase() === editData.name.toLowerCase()
    );
    
    if (duplicateIndex !== -1) {
      toast({
        title: 'عمود مكرر',
        description: 'يوجد عمود آخر بنفس الاسم',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    onUpdateColumn(editingColumn, editData);
    closeEditModal();
    
    toast({
      title: 'تم التحديث',
      description: 'تم تحديث العمود بنجاح',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const testFormula = () => {
    if (!editData.formula || typeof editData.formula !== 'string' || editData.formula.trim() === '') {
      setFormulaError('');
      setPreviewResult(null);
      return;
    }

    try {
      // محاكاة اختبار المعادلة
      const testData = {
        'الراتب الأساسي': 5000,
        'الأجر اليومي': 166.67,
        'أجر الساعة': 20.83,
        'ساعات إضافي العمل': 10,
        'المستحقات': 6000,
        'المستقطعات': 500
      };

      // تحويل المعادلة إلى JavaScript
      let formula = editData.formula;
      Object.keys(testData).forEach(key => {
        formula = formula.replace(new RegExp(key, 'g'), testData[key]);
      });
      
      // استبدال العمليات
      formula = formula.replace(/×/g, '*').replace(/÷/g, '/');
      
      const result = eval(formula);
      setPreviewResult(result);
      setFormulaError('');
    } catch (error) {
      setFormulaError('خطأ في المعادلة: ' + error.message);
      setPreviewResult(null);
    }
  };

  const getColumnTypeLabel = (type) => {
    const typeObj = columnTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  const getTypeChipClass = (type) => {
    const map = {
      text: 'salary-col-type-chip--text',
      number: 'salary-col-type-chip--number',
      currency: 'salary-col-type-chip--currency',
      date: 'salary-col-type-chip--date',
      boolean: 'salary-col-type-chip--boolean',
      reference: 'salary-col-type-chip--reference',
      formula: 'salary-col-type-chip--formula',
    };
    return map[type] || 'salary-col-type-chip--text';
  };

  const tooltipProps = {
    placement: 'top',
    hasArrow: true,
    openDelay: 300,
    bg: 'var(--stake-bg-secondary)',
    color: 'var(--stake-text-primary)',
    border: '1px solid',
    borderColor: 'var(--stake-border-primary)',
    borderRadius: 'md',
    fontSize: 'sm',
    px: 3,
    py: 2,
  };

  return (
    <Box
      className="salary-columns-manager"
      flex="1"
      minH="0"
      display="flex"
      flexDirection="column"
      px={{ base: 3, md: 4, lg: 6 }}
      pb={4}
    >
      {columns.length === 0 ? (
        <Center flex="1" minH="220px" className="salary-columns-empty-state" borderRadius="xl">
          <VStack spacing={2}>
            <Icon as={FiInfo} boxSize={8} color="var(--stake-text-secondary)" opacity={0.7} />
            <Text fontWeight="semibold" color="var(--stake-text-primary)">
              لا توجد أعمدة في هذا الجدول
            </Text>
            <Text fontSize="sm" color="var(--stake-text-secondary)" textAlign="center" maxW="320px">
              استخدم «استيراد عمود» لإضافة أعمدة أو أنشئ عموداً جديداً من الإعدادات.
            </Text>
          </VStack>
        </Center>
      ) : (
        <TableContainer
          className="salary-columns-table-wrap"
          flex="1"
          minH="0"
          overflowY="auto"
          overflowX="auto"
          w="100%"
          maxW="100%"
          borderRadius="xl"
          border="1px solid"
          borderColor="var(--stake-border-primary)"
          bg="var(--stake-content-surface-raised, var(--stake-bg-card))"
          sx={{
            '&::-webkit-scrollbar': { width: '8px', height: '8px' },
            '&::-webkit-scrollbar-track': { background: 'var(--stake-bg-secondary)' },
            '&::-webkit-scrollbar-thumb': {
              background: 'var(--stake-border-primary)',
              borderRadius: '4px',
            },
          }}
        >
          <Table
            variant="simple"
            size="xs"
            w="100%"
            layout="fixed"
            className="stake-table main-content compact-data-table salary-columns-table"
            style={{ fontFamily: 'var(--table-font-family)' }}
            sx={{
              'th, td': {
                fontFamily: 'var(--table-font-family)',
                fontSize: 'var(--table-font-size)',
                fontWeight: 'var(--table-font-weight)',
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
                <Th w="88px" textAlign="center">الترتيب</Th>
                <Th minW="180px">اسم العمود</Th>
                <Th w="140px">النوع</Th>
                <Th w="72px" textAlign="center">مطلوب</Th>
                <Th w="72px" textAlign="center">مرئي</Th>
                <Th w="110px">المعادلة</Th>
                <Th w="130px" textAlign="center">الإجراءات</Th>
              </Tr>
            </Thead>
            <Tbody>
              {columns.map((column, index) => {
                const isHidden = column.is_visible === 0;
                return (
                  <Tr
                    key={column.id || index}
                    opacity={isHidden ? 0.55 : 1}
                    transition="background 0.15s ease, opacity 0.15s ease"
                    _hover={{ bg: 'var(--stake-bg-hover)' }}
                    className={isHidden ? 'salary-columns-row--hidden' : undefined}
                  >
                    <Td textAlign="center" verticalAlign="middle">
                      <HStack spacing={1} justify="center">
                        <Box
                          className="salary-col-order-badge"
                          minW="1.5rem"
                          h="1.5rem"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          borderRadius="md"
                          fontSize="xs"
                          fontWeight="bold"
                        >
                          {index + 1}
                        </Box>
                        <VStack spacing={0}>
                          <IconButton
                            size="xs"
                            aria-label="أعلى"
                            icon={<FiArrowUp />}
                            onClick={() => onMoveColumn(index, 'up')}
                            isDisabled={index === 0}
                            variant="ghost"
                            color="var(--stake-text-secondary)"
                            _hover={{ bg: 'var(--stake-bg-hover)', color: 'var(--stake-text-primary)' }}
                          />
                          <IconButton
                            size="xs"
                            aria-label="أسفل"
                            icon={<FiArrowDown />}
                            onClick={() => onMoveColumn(index, 'down')}
                            isDisabled={index === columns.length - 1}
                            variant="ghost"
                            color="var(--stake-text-secondary)"
                            _hover={{ bg: 'var(--stake-bg-hover)', color: 'var(--stake-text-primary)' }}
                          />
                        </VStack>
                      </HStack>
                    </Td>
                    <Td verticalAlign="middle">
                      <Tooltip label={column.column_key || column.name} {...tooltipProps}>
                        <VStack align="flex-start" spacing={0.5} cursor="help" maxW="100%">
                          <Text
                            fontWeight="semibold"
                            fontSize="sm"
                            color="var(--stake-text-primary)"
                            noOfLines={1}
                          >
                            {column.column_name_ar || column.display_name_ar || column.name}
                          </Text>
                          <Text fontSize="xs" color="var(--stake-text-secondary)" noOfLines={1} dir="ltr" textAlign="right">
                            {column.column_key || column.name}
                          </Text>
                        </VStack>
                      </Tooltip>
                    </Td>
                    <Td verticalAlign="middle">
                      <VStack align="flex-start" spacing={1}>
                        <Box className={`salary-col-type-chip ${getTypeChipClass(column.type)}`}>
                          {getColumnTypeLabel(column.type)}
                        </Box>
                        {column.type === 'reference' && column.description && !(column.description.includes('net_weekly_wage') && (selectedTable?.table_name === 'net_monthly_salary' || selectedTable?.table_name?.includes('monthly'))) && (
                          <Text fontSize="xs" color="var(--stake-text-secondary)" noOfLines={1}>
                            {column.description.replace('مرجع من ', 'من ')}
                          </Text>
                        )}
                      </VStack>
                    </Td>
                    <Td textAlign="center" verticalAlign="middle">
                      <Switch
                        isChecked={column.required}
                        onChange={(e) => onUpdateColumn(index, { required: e.target.checked })}
                        size="sm"
                        colorScheme="blue"
                      />
                    </Td>
                    <Td textAlign="center" verticalAlign="middle">
                      <Switch
                        isChecked={column.is_visible !== 0}
                        onChange={async (e) => {
                          const newVisibility = e.target.checked ? 1 : 0;
                          onUpdateColumn(index, { is_visible: newVisibility });
                          await updateColumnVisibility(column.id, newVisibility);
                        }}
                        size="sm"
                        colorScheme="green"
                      />
                    </Td>
                    <Td verticalAlign="middle">
                      {column.formula ? (
                        <Tooltip label={translateColumnNames(column.formula)} {...tooltipProps}>
                          <Box className="salary-col-formula-chip" display="inline-flex">
                            <HStack spacing={1}>
                              <FiCode size={11} />
                              <Text fontSize="xs" fontWeight="semibold">معادلة</Text>
                            </HStack>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Text fontSize="xs" color="var(--stake-text-muted)">—</Text>
                      )}
                    </Td>
                    <Td verticalAlign="middle">
                      <HStack spacing={1} justify="center">
                        <Tooltip label="تعديل العمود" {...tooltipProps}>
                          <IconButton
                            size="sm"
                            aria-label="تعديل"
                            icon={<FiEdit />}
                            onClick={() => openEditModal(column, index)}
                            variant="ghost"
                            color="var(--stake-text-secondary)"
                            _hover={{ bg: 'var(--stake-bg-hover)', color: 'var(--stake-primary)' }}
                          />
                        </Tooltip>
                        <Tooltip label="تخصيص لون البادج" {...tooltipProps}>
                          <IconButton
                            size="sm"
                            aria-label="لون البادج"
                            icon={<FiDroplet />}
                            onClick={() => openBadgeColorModal(column)}
                            variant="ghost"
                            color="var(--stake-text-secondary)"
                            _hover={{ bg: 'var(--stake-bg-hover)', color: 'var(--stake-primary)' }}
                          />
                        </Tooltip>
                        <Tooltip label="حذف العمود" {...tooltipProps}>
                          <IconButton
                            size="sm"
                            aria-label="حذف"
                            icon={<FiTrash />}
                            onClick={() => onDeleteColumn(index)}
                            variant="ghost"
                            color="var(--stake-text-secondary)"
                            _hover={{ bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171' }}
                          />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      {/* مودال تعديل العمود */}
      <Modal isOpen={isOpen} onClose={closeEditModal} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader className="stake-heading-3">
            تعديل العمود
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* الصف الأول: اسم العمود، الاسم بالعربي، نوع العمود */}
              <HStack spacing={4} align="stretch">
                {/* اسم العمود */}
                <FormControl isRequired flex={1}>
                  <FormLabel className="stake-text">اسم العمود</FormLabel>
                  <Input
                    value={editData.name || ''}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="stake-input"
                    placeholder="أدخل اسم العمود"
                  />
                </FormControl>

                {/* الاسم بالعربي */}
                <FormControl flex={1}>
                  <FormLabel className="stake-text">الاسم بالعربي</FormLabel>
                  <Input
                    value={editData.column_name_ar || editData.display_name_ar || ''}
                    onChange={(e) => setEditData({ ...editData, column_name_ar: e.target.value })}
                    className="stake-input"
                    placeholder="أدخل الاسم بالعربي"
                  />
                </FormControl>

                {/* نوع العمود */}
                <FormControl flex={1}>
                  <FormLabel className="stake-text">نوع العمود</FormLabel>
                  <Select
                    value={editData.type || 'text'}
                    onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                    className="stake-input"
                  >
                    {columnTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </HStack>

              {/* مطلوب */}
              <FormControl>
                <HStack>
                  <Switch
                    isChecked={editData.required || false}
                    onChange={(e) => setEditData({ ...editData, required: e.target.checked })}
                  />
                  <FormLabel className="stake-text" mb={0}>
                    عمود مطلوب
                  </FormLabel>
                </HStack>
              </FormControl>

              {/* المعادلة */}
              <FormControl>
                <FormLabel className="stake-text">
                  المعادلة (اختياري)
                  <Tooltip 
                    label="استخدم أسماء الأعمدة الأخرى في المعادلة" 
                    placement="top"
                    bg="var(--stake-bg-card, #1a2c38)"
                    color="white"
                    border="1px solid"
                    borderColor="var(--stake-border-primary, #2f4553)"
                    borderRadius="md"
                    fontSize="sm"
                    fontWeight="medium"
                    px={3}
                    py={2}
                    boxShadow="lg"
                  >
                    <Box as="span" ml={2}>
                      <Icon as={FiInfo} />
                    </Box>
                  </Tooltip>
                </FormLabel>
                <Box position="relative">
                  <Textarea
                    value={editData.formula || ''}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      const cursorPos = e.target.selectionStart;
                      setEditData({ ...editData, formula: newValue });
                      setCursorPosition(cursorPos);
                      
                      // البحث عن الاقتراحات
                      const newSuggestions = findSuggestions(newValue, cursorPos);
                      setSuggestions(newSuggestions);
                      setShowSuggestions(newSuggestions.length > 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowSuggestions(false);
                        setSuggestions([]);
                      }
                    }}
                    className="stake-input"
                    placeholder="ابدأ بكتابة اسم العمود (مثل: bas أو أساسي) وسيظهر اقتراحات..."
                    rows={3}
                  />
                  
                  {/* قائمة الاقتراحات */}
                  {showSuggestions && suggestions.length > 0 && (
                    <Box
                      position="absolute"
                      top="100%"
                      left="0"
                      right="0"
                      bg="white"
                      border="1px solid"
                      borderColor="gray.300"
                      borderRadius="md"
                      boxShadow="lg"
                      zIndex={1000}
                      maxH="200px"
                      overflowY="auto"
                    >
                      {suggestions.map((suggestion, index) => (
                        <Box
                          key={index}
                          p={2}
                          cursor="pointer"
                          _hover={{ bg: "gray.100" }}
                          onClick={() => insertSuggestion(suggestion)}
                          borderBottom={index < suggestions.length - 1 ? "1px solid" : "none"}
                          borderColor="gray.200"
                        >
                          <Text fontSize="sm" fontWeight="medium" color="blue.600">
                            {suggestion.english}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            {suggestion.arabic}
                          </Text>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
                {editData.formula && (
                  <HStack mt={2}>
                    <Button
                      size="sm"
                      leftIcon={<FiEye />}
                      onClick={testFormula}
                      className="stake-button-secondary"
                    >
                      اختبار المعادلة
                    </Button>
                    {previewResult !== null && (
                      <Badge colorScheme="green" variant="subtle">
                        النتيجة: {previewResult}
                      </Badge>
                    )}
                  </HStack>
                )}
                {formulaError && (
                  <Alert status="error" mt={2} size="sm">
                    <AlertIcon as={FiAlertTriangle} />
                    {formulaError}
                  </Alert>
                )}
              </FormControl>

              {/* معاينة المعادلة */}
              {editData.formula && typeof editData.formula === 'string' && editData.formula.trim() !== '' && (
                <FormulaPreviewSimple
                  formula={editData.formula}
                  columns={allColumns || columns}
                  onResultChange={setPreviewResult}
                />
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={2}>
              <Button
                onClick={closeEditModal}
                leftIcon={<FiX />}
                className="stake-button-secondary"
              >
                إلغاء
              </Button>
              <Button
                onClick={saveColumn}
                leftIcon={<FiSave />}
                className="stake-button-primary"
              >
                حفظ
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* مودال تخصيص لون البادج */}
      {badgeColorColumn && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="rgba(0, 0, 0, 0.7)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex="1000"
        >
          <Box
            bg="var(--stake-bg-primary, #0f212e)"
            border="1px solid"
            borderColor="var(--stake-border-primary, #2f4553)"
            borderRadius="3xl"
            overflow="hidden"
            maxW="500px"
            w="90%"
          >
            {/* Header */}
            <Box
              bg="var(--stake-bg-primary, #0f212e)"
              borderRadius="24px 24px 0 0"
              p="4"
              borderBottom="1px solid"
              borderColor="var(--stake-border-primary, #2f4553)"
              position="relative"
            >
              <HStack spacing="3">
                <Icon as={FiDroplet} color="purple.300" boxSize="6" />
                <Text as="span" fontWeight="bold" color="purple.200" fontSize="lg">
                  اختيار لون البادج
                </Text>
              </HStack>
              <Button
                position="absolute"
                top="4"
                right="4"
                size="sm"
                variant="ghost"
                color="gray.400"
                _hover={{ color: "white", bg: "#2f4553" }}
                onClick={() => setBadgeColorColumn(null)}
              >
                <FiX />
              </Button>
            </Box>
            
            {/* Body */}
            <Box p="6">
              <VStack spacing="6" align="stretch">
                <Box>
                  <Text color="white" fontWeight="medium" mb="3">
                    العمود: {badgeColorColumn.display_name_ar || badgeColorColumn.name}
                  </Text>
                  
                  {/* اختيار اللون */}
                  <Text color="gray.300" fontSize="sm" mb="2">اللون:</Text>
                  <SimpleGrid columns={4} spacing="2" mb="4">
                    {badgeColors.map(color => (
                      <Button
                        key={color}
                        size="sm"
                        colorScheme={color === 'none' ? 'gray' : color}
                        variant={badgeColorColumn.badge_color === color ? "solid" : "outline"}
                        onClick={() => {
                          setBadgeColorColumn(prev => ({ ...prev, badge_color: color }));
                        }}
                      >
                        {color === 'none' ? 'بدون بادج' : color}
                      </Button>
                    ))}
                  </SimpleGrid>
                  
                  {/* اختيار النوع - يظهر فقط إذا لم يكن اللون "none" */}
                  {badgeColorColumn.badge_color !== 'none' && (
                    <>
                      <Text color="gray.300" fontSize="sm" mb="2">النوع:</Text>
                      <HStack spacing="2" mb="4">
                        {['solid', 'outline', 'subtle'].map(variant => (
                          <Button
                            key={variant}
                            size="sm"
                            colorScheme="blue"
                            variant={badgeColorColumn.badge_variant === variant ? "solid" : "outline"}
                            onClick={() => {
                              setBadgeColorColumn(prev => ({ ...prev, badge_variant: variant }));
                            }}
                          >
                            {variant}
                          </Button>
                        ))}
                      </HStack>
                    </>
                  )}

                  {/* خيار العملة */}
                  <HStack spacing="2" mb="4">
                    <input
                      type="checkbox"
                      id="is_currency"
                      checked={badgeColorColumn.is_currency}
                      onChange={(e) => setBadgeColorColumn(prev => ({ ...prev, is_currency: e.target.checked }))}
                    />
                    <Text color="gray.300" fontSize="sm">عرض كعملة</Text>
                  </HStack>

                  {/* معاينة */}
                  <Box p="3" bg="var(--stake-bg-card, #1a2c38)" borderRadius="md" border="1px solid" borderColor="var(--stake-border-primary, #2f4553)">
                    <Text color="gray.300" fontSize="sm" mb="2">معاينة:</Text>
                    {badgeColorColumn.badge_color === 'none' ? (
                      <Text color="gray.400" fontSize="sm">
                        بدون بادج
                      </Text>
                    ) : (
                      <Badge
                        colorScheme={badgeColorColumn.badge_color}
                        variant={badgeColorColumn.badge_variant}
                        fontSize="sm"
                        px="2"
                        py="1"
                      >
                        {badgeColorColumn.display_name_ar || badgeColorColumn.name}
                      </Badge>
                    )}
                  </Box>
                </Box>

                <HStack spacing="3" justify="flex-end">
                  <Button
                    variant="ghost"
                    color="white"
                    onClick={() => setBadgeColorColumn(null)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    bg="#2f4553"
                    color="white"
                    border="1px solid"
                    borderColor="#1a2c38"
                    _hover={{ bg: "#111827" }}
                    onClick={() => {
                      if (onBadgeColorChange) {
                        onBadgeColorChange(
                          badgeColorColumn.id,
                          badgeColorColumn.badge_color,
                          badgeColorColumn.badge_variant,
                          badgeColorColumn.is_currency
                        );
                      }
                      setBadgeColorColumn(null);
                    }}
                  >
                    حفظ
                  </Button>
                </HStack>
              </VStack>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SimpleColumnManager;

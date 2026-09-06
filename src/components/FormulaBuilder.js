import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  useToast,
  Grid,
  GridItem,
  FormHelperText,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
  Box,
  Icon,
  Tooltip,
  Code,
  CodeProps,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  NumberInput,
  NumberInputField,
  Switch,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon
} from '@chakra-ui/react';
import {
  FiSave,
  FiX,
  FiInfo,
  FiEdit,
  FiPlay,
  FiCode,
  FiHash,
  FiCheck,
  FiAlertCircle,
  FiPlus,
  FiMinus,
  FiDivide,
  FiEqual,
  FiCircle,
  FiPercent,
  FiDollarSign,
  FiClock,
  FiUser,
  FiDatabase,
  FiTool,
  FiSettings,
  FiEye,
  FiEyeOff
} from 'react-icons/fi';

const FormulaBuilder = ({ 
  isOpen, 
  onClose, 
  formula = null, 
  variables = [], 
  columns = [], 
  onSave 
}) => {
  const [formData, setFormData] = useState({
    formula_key: '',
    formula_name_ar: '',
    formula_name_en: '',
    formula_expression: '',
    formula_type: 'both',
    description: '',
    dependencies: [],
    is_active: true
  });
  
  const [testData, setTestData] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  
  // Color mode
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Initialize form data when formula changes
  useEffect(() => {
    if (formula) {
      setFormData({
        formula_key: formula.formula_key || '',
        formula_name_ar: formula.formula_name_ar || '',
        formula_name_en: formula.formula_name_en || '',
        formula_expression: formula.formula_expression || '',
        formula_type: formula.formula_type || 'both',
        description: formula.description || '',
        dependencies: formula.dependencies ? JSON.parse(formula.dependencies) : [],
        is_active: formula.is_active ?? true
      });
    } else {
      // Reset form for new formula
      setFormData({
        formula_key: '',
        formula_name_ar: '',
        formula_name_en: '',
        formula_expression: '',
        formula_type: 'both',
        description: '',
        dependencies: [],
        is_active: true
      });
    }
    setErrors({});
    setTestData({});
    setTestResult(null);
  }, [formula]);
  
  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };
  
  // Add dependency
  const addDependency = (dependency) => {
    if (!formData.dependencies.includes(dependency)) {
      setFormData(prev => ({
        ...prev,
        dependencies: [...prev.dependencies, dependency]
      }));
    }
  };
  
  // Remove dependency
  const removeDependency = (dependency) => {
    setFormData(prev => ({
      ...prev,
      dependencies: prev.dependencies.filter(dep => dep !== dependency)
    }));
  };
  
  // Insert into formula expression
  const insertIntoExpression = (text) => {
    const textarea = document.getElementById('formula_expression');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = formData.formula_expression.substring(0, start);
      const after = formData.formula_expression.substring(end);
      const newExpression = before + text + after;
      
      setFormData(prev => ({
        ...prev,
        formula_expression: newExpression
      }));
      
      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + text.length, start + text.length);
      }, 0);
    }
  };
  
  // Test formula
  const testFormula = async () => {
    if (!formData.formula_expression) {
      toast({
        title: 'خطأ في الاختبار',
        description: 'تعبير المعادلة فارغ',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/simplified_salary_manager.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test_formula',
          formula_expression: formData.formula_expression,
          test_data: testData
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setTestResult(result.data.result);
        toast({
          title: 'تم اختبار المعادلة',
          description: `النتيجة: ${result.data.result}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: 'خطأ في اختبار المعادلة',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.formula_key) {
      newErrors.formula_key = 'مفتاح المعادلة مطلوب';
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formData.formula_key)) {
      newErrors.formula_key = 'مفتاح المعادلة يجب أن يبدأ بحرف أو _ ويحتوي على أحرف وأرقام و _ فقط';
    }
    
    if (!formData.formula_name_ar) {
      newErrors.formula_name_ar = 'اسم المعادلة بالعربية مطلوب';
    }
    
    if (!formData.formula_name_en) {
      newErrors.formula_name_en = 'اسم المعادلة بالإنجليزية مطلوب';
    }
    
    if (!formData.formula_expression) {
      newErrors.formula_expression = 'تعبير المعادلة مطلوب';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const payload = {
        ...formData,
        dependencies: JSON.stringify(formData.dependencies)
      };
      
      if (formula) {
        payload.id = formula.id;
      }
      
      const response = await fetch('http://localhost:8000/api/simplified_salary_manager.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: formula ? 'update_formula' : 'create_formula',
          ...payload
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'تم الحفظ بنجاح',
          description: result.message,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        onSave(result.data);
        onClose();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: 'خطأ في الحفظ',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Get available variables and columns
  const availableItems = [
    ...variables.map(v => ({ ...v, type: 'variable' })),
    ...columns.map(c => ({ ...c, type: 'column' }))
  ];
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" isCentered>
      <ModalOverlay />
      <ModalContent bg={bgColor} maxH="90vh" overflowY="auto">
        <ModalHeader>
          <HStack spacing={3}>
            <Icon as={FiCode} color="purple.500" />
            <Text fontSize="lg" fontWeight="bold">
              {formula ? 'تعديل المعادلة' : 'إنشاء معادلة جديدة'}
            </Text>
          </HStack>
        </ModalHeader>
        
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Basic Information */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={4} color="blue.600">
                المعلومات الأساسية
              </Text>
              
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <GridItem>
                  <FormControl isRequired isInvalid={!!errors.formula_key}>
                    <FormLabel>مفتاح المعادلة</FormLabel>
                    <Input
                      value={formData.formula_key}
                      onChange={(e) => handleInputChange('formula_key', e.target.value)}
                      placeholder="daily_wage"
                      fontFamily="mono"
                    />
                    <FormHelperText>مفتاح فريد للمعادلة (بالإنجليزية)</FormHelperText>
                    {errors.formula_key && (
                      <Text color="red.500" fontSize="sm">{errors.formula_key}</Text>
                    )}
                  </FormControl>
                </GridItem>
                
                <GridItem>
                  <FormControl>
                    <FormLabel>نوع المعادلة</FormLabel>
                    <Select
                      value={formData.formula_type}
                      onChange={(e) => handleInputChange('formula_type', e.target.value)}
                    >
                      <option value="weekly">أسبوعي</option>
                      <option value="monthly">شهري</option>
                      <option value="both">كلاهما</option>
                    </Select>
                  </FormControl>
                </GridItem>
              </Grid>
              
              <Grid templateColumns="repeat(2, 1fr)" gap={4} mt={4}>
                <GridItem>
                  <FormControl isRequired isInvalid={!!errors.formula_name_ar}>
                    <FormLabel>اسم المعادلة (عربي)</FormLabel>
                    <Input
                      value={formData.formula_name_ar}
                      onChange={(e) => handleInputChange('formula_name_ar', e.target.value)}
                      placeholder="الأجر اليومي"
                    />
                    {errors.formula_name_ar && (
                      <Text color="red.500" fontSize="sm">{errors.formula_name_ar}</Text>
                    )}
                  </FormControl>
                </GridItem>
                
                <GridItem>
                  <FormControl isRequired isInvalid={!!errors.formula_name_en}>
                    <FormLabel>اسم المعادلة (إنجليزي)</FormLabel>
                    <Input
                      value={formData.formula_name_en}
                      onChange={(e) => handleInputChange('formula_name_en', e.target.value)}
                      placeholder="Daily Wage"
                    />
                    {errors.formula_name_en && (
                      <Text color="red.500" fontSize="sm">{errors.formula_name_en}</Text>
                    )}
                  </FormControl>
                </GridItem>
              </Grid>
            </Box>
            
            <Divider />
            
            {/* Formula Expression */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={4} color="green.600">
                تعبير المعادلة
              </Text>
              
              <VStack spacing={4} align="stretch">
                <FormControl isRequired isInvalid={!!errors.formula_expression}>
                  <FormLabel>تعبير المعادلة</FormLabel>
                  <Textarea
                    id="formula_expression"
                    value={formData.formula_expression}
                    onChange={(e) => handleInputChange('formula_expression', e.target.value)}
                    placeholder="base_salary / 30"
                    fontFamily="mono"
                    rows={4}
                    bg="gray.50"
                    borderColor="gray.300"
                  />
                  <FormHelperText>
                    استخدم المتغيرات والأعمدة المتاحة أدناه
                  </FormHelperText>
                  {errors.formula_expression && (
                    <Text color="red.500" fontSize="sm">{errors.formula_expression}</Text>
                  )}
                </FormControl>
                
                {/* Quick Insert Buttons */}
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>أدوات سريعة:</Text>
                  <Wrap spacing={2}>
                    <WrapItem>
                      <Button size="sm" variant="outline" onClick={() => insertIntoExpression(' + ')}>
                        <Icon as={FiPlus} mr={1} />
                        +
                      </Button>
                    </WrapItem>
                    <WrapItem>
                      <Button size="sm" variant="outline" onClick={() => insertIntoExpression(' - ')}>
                        <Icon as={FiMinus} mr={1} />
                        -
                      </Button>
                    </WrapItem>
                    <WrapItem>
                      <Button size="sm" variant="outline" onClick={() => insertIntoExpression(' * ')}>
                        <Icon as={FiX} mr={1} />
                        ×
                      </Button>
                    </WrapItem>
                    <WrapItem>
                      <Button size="sm" variant="outline" onClick={() => insertIntoExpression(' / ')}>
                        <Icon as={FiDivide} mr={1} />
                        ÷
                      </Button>
                    </WrapItem>
                    <WrapItem>
                      <Button size="sm" variant="outline" onClick={() => insertIntoExpression('( )')}>
                        <Icon as={FiCircle} mr={1} />
                        ()
                      </Button>
                    </WrapItem>
                  </Wrap>
                </Box>
              </VStack>
            </Box>
            
            <Divider />
            
            {/* Available Variables and Columns */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={4} color="purple.600">
                المتغيرات والأعمدة المتاحة
              </Text>
              
              <Accordion allowMultiple>
                <AccordionItem>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      <HStack>
                        <Icon as={FiHash} />
                        <Text>المتغيرات ({variables.length})</Text>
                      </HStack>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <Wrap spacing={2}>
                      {variables.map((variable) => (
                        <WrapItem key={variable.id}>
                          <Tag
                            colorScheme="blue"
                            cursor="pointer"
                            onClick={() => insertIntoExpression(variable.variable_key)}
                            _hover={{ bg: 'blue.100' }}
                          >
                            <TagLabel>{variable.variable_key}</TagLabel>
                          </Tag>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </AccordionPanel>
                </AccordionItem>
                
                <AccordionItem>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      <HStack>
                        <Icon as={FiDatabase} />
                        <Text>الأعمدة ({columns.length})</Text>
                      </HStack>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <Wrap spacing={2}>
                      {columns.map((column) => (
                        <WrapItem key={column.id}>
                          <Tag
                            colorScheme="green"
                            cursor="pointer"
                            onClick={() => insertIntoExpression(column.column_key)}
                            _hover={{ bg: 'green.100' }}
                          >
                            <TagLabel>{column.column_key}</TagLabel>
                          </Tag>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </Box>
            
            <Divider />
            
            {/* Dependencies */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={4} color="orange.600">
                المتغيرات المطلوبة
              </Text>
              
              <VStack spacing={4} align="stretch">
                <Text fontSize="sm" color="gray.600">
                  المتغيرات والأعمدة المطلوبة لحساب هذه المعادلة
                </Text>
                
                <Wrap spacing={2}>
                  {formData.dependencies.map((dep) => (
                    <WrapItem key={dep}>
                      <Tag colorScheme="orange">
                        <TagLabel>{dep}</TagLabel>
                        <TagCloseButton onClick={() => removeDependency(dep)} />
                      </Tag>
                    </WrapItem>
                  ))}
                </Wrap>
                
                <Select
                  placeholder="إضافة متغير مطلوب..."
                  onChange={(e) => {
                    if (e.target.value) {
                      addDependency(e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  {availableItems
                    .filter(item => !formData.dependencies.includes(item.variable_key || item.column_key))
                    .map((item, index) => (
                      <option key={`${item.id}-${index}`} value={item.variable_key || item.column_key}>
                        {item.variable_name_ar || item.column_name_ar} ({item.variable_key || item.column_key})
                      </option>
                    ))}
                </Select>
              </VStack>
            </Box>
            
            <Divider />
            
            {/* Test Panel */}
            <Box>
              <HStack justify="space-between" mb={4}>
                <Text fontSize="md" fontWeight="semibold" color="teal.600">
                  اختبار المعادلة
                </Text>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTestPanel(!showTestPanel)}
                  leftIcon={showTestPanel ? <FiEyeOff /> : <FiEye />}
                >
                  {showTestPanel ? 'إخفاء' : 'إظهار'} لوحة الاختبار
                </Button>
              </HStack>
              
              {showTestPanel && (
                <VStack spacing={4} align="stretch" p={4} bg="gray.50" borderRadius="md">
                  <Text fontSize="sm" fontWeight="medium">بيانات الاختبار:</Text>
                  
                  <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                    {formData.dependencies.map((dep) => (
                      <GridItem key={dep}>
                        <FormControl>
                          <FormLabel fontSize="sm">{dep}</FormLabel>
                          <NumberInput
                            value={testData[dep] || 0}
                            onChange={(value) => setTestData(prev => ({
                              ...prev,
                              [dep]: parseFloat(value) || 0
                            }))}
                          >
                            <NumberInputField />
                          </NumberInput>
                        </FormControl>
                      </GridItem>
                    ))}
                  </Grid>
                  
                  <HStack>
                    <Button
                      colorScheme="teal"
                      onClick={testFormula}
                      isLoading={loading}
                      leftIcon={<FiPlay />}
                    >
                      اختبار المعادلة
                    </Button>
                    
                    {testResult !== null && (
                      <Alert status="success" borderRadius="md">
                        <AlertIcon />
                        <AlertTitle>النتيجة:</AlertTitle>
                        <AlertDescription>{testResult}</AlertDescription>
                      </Alert>
                    )}
                  </HStack>
                </VStack>
              )}
            </Box>
            
            <Divider />
            
            {/* Description and Status */}
            <Box>
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <GridItem>
                  <FormControl>
                    <FormLabel>وصف المعادلة</FormLabel>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="وصف مختصر للمعادلة..."
                      rows={3}
                    />
                  </FormControl>
                </GridItem>
                
                <GridItem>
                  <VStack align="stretch" spacing={3}>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">نشط</FormLabel>
                      <Switch
                        isChecked={formData.is_active}
                        onChange={(e) => handleInputChange('is_active', e.target.checked)}
                      />
                    </FormControl>
                  </VStack>
                </GridItem>
              </Grid>
            </Box>
          </VStack>
        </ModalBody>
        
        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="outline" onClick={onClose} leftIcon={<FiX />}>
              إلغاء
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleSubmit}
              isLoading={loading}
              leftIcon={<FiSave />}
            >
              {formula ? 'تحديث' : 'إنشاء'}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default FormulaBuilder;

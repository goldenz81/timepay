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
  NumberInput,
  NumberInputField,
  Switch,
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
  Tooltip
} from '@chakra-ui/react';
import {
  FiSave,
  FiX,
  FiInfo,
  FiEdit,
  FiEye,
  FiEyeOff,
  FiDollarSign,
  FiPercent,
  FiClock,
  FiUser,
  FiDatabase,
  FiCode,
  FiTool,
  FiSettings,
  FiCheck,
  FiAlertCircle
} from 'react-icons/fi';

const ColumnEditor = ({ 
  isOpen, 
  onClose, 
  column = null, 
  tables = [], 
  formulas = [], 
  onSave 
}) => {
  const [formData, setFormData] = useState({
    table_id: '',
    column_key: '',
    column_name_ar: '',
    column_name_en: '',
    data_type: 'text',
    display_order: 0,
    is_visible: true,
    is_editable: true,
    is_calculated: false,
    formula_id: null,
    width: 150,
    alignment: 'left',
    is_currency: false,
    decimal_places: 2,
    description: '',
    badge_settings: {
      colors: {
        positive: '#10B981',
        negative: '#EF4444',
        neutral: '#6B7280'
      },
      conditions: []
    }
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  
  // Color mode
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Initialize form data when column changes
  useEffect(() => {
    if (column) {
      setFormData({
        table_id: column.table_id || '',
        column_key: column.column_key || '',
        column_name_ar: column.column_name_ar || '',
        column_name_en: column.column_name_en || '',
        data_type: column.data_type || 'text',
        display_order: column.display_order || 0,
        is_visible: column.is_visible ?? true,
        is_editable: column.is_editable ?? true,
        is_calculated: column.is_calculated ?? false,
        formula_id: column.formula_id || null,
        width: column.width || 150,
        alignment: column.alignment || 'left',
        is_currency: column.is_currency ?? false,
        decimal_places: column.decimal_places || 2,
        description: column.description || '',
        badge_settings: column.badge_settings || {
          colors: {
            positive: '#10B981',
            negative: '#EF4444',
            neutral: '#6B7280'
          },
          conditions: []
        }
      });
    } else {
      // Reset form for new column
      setFormData({
        table_id: '',
        column_key: '',
        column_name_ar: '',
        column_name_en: '',
        data_type: 'text',
        display_order: 0,
        is_visible: true,
        is_editable: true,
        is_calculated: false,
        formula_id: null,
        width: 150,
        alignment: 'left',
        is_currency: false,
        decimal_places: 2,
        description: '',
        badge_settings: {
          colors: {
            positive: '#10B981',
            negative: '#EF4444',
            neutral: '#6B7280'
          },
          conditions: []
        }
      });
    }
    setErrors({});
  }, [column]);
  
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
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.table_id) {
      newErrors.table_id = 'الجدول مطلوب';
    }
    
    if (!formData.column_key) {
      newErrors.column_key = 'مفتاح العمود مطلوب';
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formData.column_key)) {
      newErrors.column_key = 'مفتاح العمود يجب أن يبدأ بحرف أو _ ويحتوي على أحرف وأرقام و _ فقط';
    }
    
    if (!formData.column_name_ar) {
      newErrors.column_name_ar = 'اسم العمود بالعربية مطلوب';
    }
    
    if (!formData.column_name_en) {
      newErrors.column_name_en = 'اسم العمود بالإنجليزية مطلوب';
    }
    
    if (formData.is_calculated && !formData.formula_id) {
      newErrors.formula_id = 'المعادلة مطلوبة للأعمدة المحسوبة';
    }
    
    if (formData.width < 50 || formData.width > 500) {
      newErrors.width = 'عرض العمود يجب أن يكون بين 50 و 500 بكسل';
    }
    
    if (formData.decimal_places < 0 || formData.decimal_places > 10) {
      newErrors.decimal_places = 'عدد الخانات العشرية يجب أن يكون بين 0 و 10';
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
        badge_settings: JSON.stringify(formData.badge_settings)
      };
      
      if (column) {
        payload.id = column.id;
      }
      
      const response = await fetch('http://localhost:8000/api/simplified_salary_manager.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: column ? 'update_column' : 'create_column',
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
  
  // Get data type icon
  const getDataTypeIcon = (type) => {
    switch (type) {
      case 'currency':
        return FiDollarSign;
      case 'number':
        return FiPercent;
      case 'date':
        return FiClock;
      case 'text':
        return FiUser;
      case 'badge':
        return FiTool;
      default:
        return FiDatabase;
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
      <ModalOverlay />
      <ModalContent bg={bgColor} maxH="90vh" overflowY="auto">
        <ModalHeader>
          <HStack spacing={3}>
            <Icon as={FiEdit} color="blue.500" />
            <Text fontSize="lg" fontWeight="bold">
              {column ? 'تعديل العمود' : 'إضافة عمود جديد'}
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
                  <FormControl isRequired isInvalid={!!errors.table_id}>
                    <FormLabel>الجدول</FormLabel>
                    <Select
                      value={formData.table_id}
                      onChange={(e) => handleInputChange('table_id', e.target.value)}
                      placeholder="اختر الجدول"
                    >
                      {tables.map((table) => (
                        <option key={table.id} value={table.id}>
                          {table.table_name_ar}
                        </option>
                      ))}
                    </Select>
                    <FormHelperText>الجدول الذي ينتمي إليه العمود</FormHelperText>
                    {errors.table_id && (
                      <Text color="red.500" fontSize="sm">{errors.table_id}</Text>
                    )}
                  </FormControl>
                </GridItem>
                
                <GridItem>
                  <FormControl isRequired isInvalid={!!errors.column_key}>
                    <FormLabel>مفتاح العمود</FormLabel>
                    <Input
                      value={formData.column_key}
                      onChange={(e) => handleInputChange('column_key', e.target.value)}
                      placeholder="employee_code"
                      fontFamily="mono"
                    />
                    <FormHelperText>مفتاح فريد للعمود (بالإنجليزية)</FormHelperText>
                    {errors.column_key && (
                      <Text color="red.500" fontSize="sm">{errors.column_key}</Text>
                    )}
                  </FormControl>
                </GridItem>
              </Grid>
              
              <Grid templateColumns="repeat(2, 1fr)" gap={4} mt={4}>
                <GridItem>
                  <FormControl isRequired isInvalid={!!errors.column_name_ar}>
                    <FormLabel>اسم العمود (عربي)</FormLabel>
                    <Input
                      value={formData.column_name_ar}
                      onChange={(e) => handleInputChange('column_name_ar', e.target.value)}
                      placeholder="كود الموظف"
                    />
                    {errors.column_name_ar && (
                      <Text color="red.500" fontSize="sm">{errors.column_name_ar}</Text>
                    )}
                  </FormControl>
                </GridItem>
                
                <GridItem>
                  <FormControl isRequired isInvalid={!!errors.column_name_en}>
                    <FormLabel>اسم العمود (إنجليزي)</FormLabel>
                    <Input
                      value={formData.column_name_en}
                      onChange={(e) => handleInputChange('column_name_en', e.target.value)}
                      placeholder="Code"
                    />
                    {errors.column_name_en && (
                      <Text color="red.500" fontSize="sm">{errors.column_name_en}</Text>
                    )}
                  </FormControl>
                </GridItem>
              </Grid>
            </Box>
            
            <Divider />
            
            {/* Data Type and Settings */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={4} color="green.600">
                نوع البيانات والإعدادات
              </Text>
              
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <GridItem>
                  <FormControl>
                    <FormLabel>نوع البيانات</FormLabel>
                    <Select
                      value={formData.data_type}
                      onChange={(e) => handleInputChange('data_type', e.target.value)}
                    >
                      <option value="text">نص</option>
                      <option value="number">رقم</option>
                      <option value="currency">عملة</option>
                      <option value="date">تاريخ</option>
                      <option value="badge">بادج</option>
                      <option value="boolean">نعم/لا</option>
                    </Select>
                    <FormHelperText>
                      <HStack spacing={1}>
                        <Icon as={getDataTypeIcon(formData.data_type)} />
                        <Text>نوع البيانات المطلوب</Text>
                      </HStack>
                    </FormHelperText>
                  </FormControl>
                </GridItem>
                
                <GridItem>
                  <FormControl>
                    <FormLabel>محاذاة النص</FormLabel>
                    <Select
                      value={formData.alignment}
                      onChange={(e) => handleInputChange('alignment', e.target.value)}
                    >
                      <option value="left">يسار</option>
                      <option value="center">وسط</option>
                      <option value="right">يمين</option>
                    </Select>
                  </FormControl>
                </GridItem>
              </Grid>
              
              <Grid templateColumns="repeat(3, 1fr)" gap={4} mt={4}>
                <GridItem>
                  <FormControl isInvalid={!!errors.width}>
                    <FormLabel>عرض العمود (بكسل)</FormLabel>
                    <NumberInput
                      value={formData.width}
                      onChange={(value) => handleInputChange('width', parseInt(value) || 150)}
                      min={50}
                      max={500}
                    >
                      <NumberInputField />
                    </NumberInput>
                    {errors.width && (
                      <Text color="red.500" fontSize="sm">{errors.width}</Text>
                    )}
                  </FormControl>
                </GridItem>
                
                <GridItem>
                  <FormControl>
                    <FormLabel>ترتيب العرض</FormLabel>
                    <NumberInput
                      value={formData.display_order}
                      onChange={(value) => handleInputChange('display_order', parseInt(value) || 0)}
                      min={0}
                    >
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>
                </GridItem>
                
                <GridItem>
                  <FormControl isInvalid={!!errors.decimal_places}>
                    <FormLabel>الخانات العشرية</FormLabel>
                    <NumberInput
                      value={formData.decimal_places}
                      onChange={(value) => handleInputChange('decimal_places', parseInt(value) || 2)}
                      min={0}
                      max={10}
                    >
                      <NumberInputField />
                    </NumberInput>
                    {errors.decimal_places && (
                      <Text color="red.500" fontSize="sm">{errors.decimal_places}</Text>
                    )}
                  </FormControl>
                </GridItem>
              </Grid>
            </Box>
            
            <Divider />
            
            {/* Visibility and Behavior */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={4} color="purple.600">
                السلوك والظهور
              </Text>
              
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <GridItem>
                  <VStack align="stretch" spacing={3}>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">مرئي</FormLabel>
                      <Switch
                        isChecked={formData.is_visible}
                        onChange={(e) => handleInputChange('is_visible', e.target.checked)}
                      />
                    </FormControl>
                    
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">قابل للتعديل</FormLabel>
                      <Switch
                        isChecked={formData.is_editable}
                        onChange={(e) => handleInputChange('is_editable', e.target.checked)}
                      />
                    </FormControl>
                    
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">عمود عملة</FormLabel>
                      <Switch
                        isChecked={formData.is_currency}
                        onChange={(e) => handleInputChange('is_currency', e.target.checked)}
                      />
                    </FormControl>
                  </VStack>
                </GridItem>
                
                <GridItem>
                  <VStack align="stretch" spacing={3}>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">محسوب من معادلة</FormLabel>
                      <Switch
                        isChecked={formData.is_calculated}
                        onChange={(e) => handleInputChange('is_calculated', e.target.checked)}
                      />
                    </FormControl>
                    
                    {formData.is_calculated && (
                      <FormControl isInvalid={!!errors.formula_id}>
                        <FormLabel>المعادلة</FormLabel>
                        <Select
                          value={formData.formula_id || ''}
                          onChange={(e) => handleInputChange('formula_id', e.target.value || null)}
                          placeholder="اختر المعادلة"
                        >
                          {formulas.map((formula) => (
                            <option key={formula.id} value={formula.id}>
                              {formula.formula_name_ar}
                            </option>
                          ))}
                        </Select>
                        {errors.formula_id && (
                          <Text color="red.500" fontSize="sm">{errors.formula_id}</Text>
                        )}
                      </FormControl>
                    )}
                  </VStack>
                </GridItem>
              </Grid>
            </Box>
            
            <Divider />
            
            {/* Description */}
            <Box>
              <FormControl>
                <FormLabel>وصف العمود</FormLabel>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="وصف مختصر للعمود..."
                  rows={3}
                />
              </FormControl>
            </Box>
          </VStack>
        </ModalBody>
        
        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="outline" onClick={onClose} leftIcon={<FiX />}>
              إلغاء
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={loading}
              leftIcon={<FiSave />}
            >
              {column ? 'تحديث' : 'إنشاء'}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ColumnEditor;

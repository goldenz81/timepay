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
  NumberInput,
  NumberInputField,
  Switch,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  ColorPicker,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  TagCloseButton,
  Code,
  Card,
  CardBody,
  CardHeader
} from '@chakra-ui/react';
import {
  FiSave,
  FiX,
  FiInfo,
  FiEdit,
  FiLayers,
  FiEye,
  FiEyeOff,
  FiPlus,
  FiMinus,
  FiCheck,
  FiAlertCircle,
  FiSettings,
  FiDollarSign,
  FiPercent,
  FiClock,
  FiUser,
  FiDatabase,
  FiTool,
  FiTarget,
  FiTrendingUp,
  FiTrendingDown,
  FiEqual,
  FiGradient
} from 'react-icons/fi';

const BadgeConfigurator = ({ 
  isOpen, 
  onClose, 
  column = null, 
  onSave 
}) => {
  const [badgeSettings, setBadgeSettings] = useState({
    colors: {
      positive: '#10B981',
      negative: '#EF4444',
      neutral: '#6B7280',
      warning: '#F59E0B',
      info: '#3B82F6'
    },
    conditions: [
      {
        id: 1,
        name: 'قيمة موجبة',
        condition: 'value > 0',
        color: 'positive',
        variant: 'solid',
        enabled: true
      },
      {
        id: 2,
        name: 'قيمة سالبة',
        condition: 'value < 0',
        color: 'negative',
        variant: 'solid',
        enabled: true
      },
      {
        id: 3,
        name: 'قيمة صفر',
        condition: 'value == 0',
        color: 'neutral',
        variant: 'outline',
        enabled: true
      }
    ],
    defaultColor: 'neutral',
    defaultVariant: 'outline',
    showValue: true,
    showIcon: false,
    iconPosition: 'left',
    size: 'md',
    borderRadius: 'md',
    fontWeight: 'medium',
    fontSize: 'sm'
  });
  
  const [newCondition, setNewCondition] = useState({
    name: '',
    condition: '',
    color: 'positive',
    variant: 'solid',
    enabled: true
  });
  
  const [previewData, setPreviewData] = useState([
    { value: 100, label: 'قيمة موجبة' },
    { value: -50, label: 'قيمة سالبة' },
    { value: 0, label: 'قيمة صفر' },
    { value: 250, label: 'قيمة عالية' },
    { value: -100, label: 'قيمة منخفضة' }
  ]);
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  
  // Color mode
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Initialize badge settings when column changes
  useEffect(() => {
    if (column && column.badge_settings) {
      try {
        const settings = typeof column.badge_settings === 'string' 
          ? JSON.parse(column.badge_settings) 
          : column.badge_settings;
        setBadgeSettings(settings);
      } catch (error) {
        console.error('Error parsing badge settings:', error);
      }
    }
  }, [column]);
  
  // Handle badge settings changes
  const handleBadgeSettingsChange = (field, value) => {
    setBadgeSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle color changes
  const handleColorChange = (colorKey, colorValue) => {
    setBadgeSettings(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorKey]: colorValue
      }
    }));
  };
  
  // Add new condition
  const addCondition = () => {
    if (!newCondition.name || !newCondition.condition) {
      toast({
        title: 'خطأ في الإدخال',
        description: 'اسم الشرط وتعبير الشرط مطلوبان',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    const condition = {
      ...newCondition,
      id: Date.now()
    };
    
    setBadgeSettings(prev => ({
      ...prev,
      conditions: [...prev.conditions, condition]
    }));
    
    setNewCondition({
      name: '',
      condition: '',
      color: 'positive',
      variant: 'solid',
      enabled: true
    });
  };
  
  // Remove condition
  const removeCondition = (conditionId) => {
    setBadgeSettings(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== conditionId)
    }));
  };
  
  // Update condition
  const updateCondition = (conditionId, field, value) => {
    setBadgeSettings(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => 
        c.id === conditionId ? { ...c, [field]: value } : c
      )
    }));
  };
  
  // Get badge color for preview
  const getBadgeColor = (value) => {
    for (const condition of badgeSettings.conditions) {
      if (!condition.enabled) continue;
      
      try {
        // Simple condition evaluation (in production, use a proper expression evaluator)
        const expression = condition.condition.replace('value', value);
        if (eval(expression)) {
          return badgeSettings.colors[condition.color] || badgeSettings.colors.neutral;
        }
      } catch (error) {
        console.error('Error evaluating condition:', error);
      }
    }
    
    return badgeSettings.colors[badgeSettings.defaultColor] || badgeSettings.colors.neutral;
  };
  
  // Get badge variant for preview
  const getBadgeVariant = (value) => {
    for (const condition of badgeSettings.conditions) {
      if (!condition.enabled) continue;
      
      try {
        const expression = condition.condition.replace('value', value);
        if (eval(expression)) {
          return condition.variant;
        }
      } catch (error) {
        console.error('Error evaluating condition:', error);
      }
    }
    
    return badgeSettings.defaultVariant;
  };
  
  // Format value for display
  const formatValue = (value) => {
    if (badgeSettings.showValue) {
      return value.toString();
    }
    return '';
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const payload = {
        id: column.id,
        badge_settings: JSON.stringify(badgeSettings)
      };
      
      const response = await fetch('http://localhost:8000/api/simplified_salary_manager.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_column',
          ...payload
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'تم حفظ إعدادات البادج',
          description: 'تم تحديث إعدادات البادج بنجاح',
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
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered>
      <ModalOverlay />
      <ModalContent bg={bgColor} maxH="90vh" overflowY="auto">
        <ModalHeader>
          <HStack spacing={3}>
            <Icon as={FiLayers} color="pink.500" />
            <Text fontSize="lg" fontWeight="bold">
              إعدادات البادج - {column?.column_name_ar || 'العمود'}
            </Text>
          </HStack>
        </ModalHeader>
        
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Colors Configuration */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={4} color="blue.600">
                الألوان
              </Text>
              
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                {Object.entries(badgeSettings.colors).map(([key, color]) => (
                  <GridItem key={key}>
                    <FormControl>
                      <FormLabel textTransform="capitalize">
                        {key === 'positive' ? 'إيجابي' : 
                         key === 'negative' ? 'سلبي' : 
                         key === 'neutral' ? 'محايد' : 
                         key === 'warning' ? 'تحذير' : 'معلومات'}
                      </FormLabel>
                      <HStack>
                        <Input
                          type="color"
                          value={color}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          width="60px"
                          height="40px"
                          p={1}
                        />
                        <Input
                          value={color}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          fontFamily="mono"
                          fontSize="sm"
                        />
                      </HStack>
                    </FormControl>
                  </GridItem>
                ))}
              </Grid>
            </Box>
            
            <Divider />
            
            {/* Default Settings */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={4} color="green.600">
                الإعدادات الافتراضية
              </Text>
              
              <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                <GridItem>
                  <FormControl>
                    <FormLabel>اللون الافتراضي</FormLabel>
                    <Select
                      value={badgeSettings.defaultColor}
                      onChange={(e) => handleBadgeSettingsChange('defaultColor', e.target.value)}
                    >
                      <option value="positive">إيجابي</option>
                      <option value="negative">سلبي</option>
                      <option value="neutral">محايد</option>
                      <option value="warning">تحذير</option>
                      <option value="info">معلومات</option>
                    </Select>
                  </FormControl>
                </GridItem>
                
                <GridItem>
                  <FormControl>
                    <FormLabel>النمط الافتراضي</FormLabel>
                    <Select
                      value={badgeSettings.defaultVariant}
                      onChange={(e) => handleBadgeSettingsChange('defaultVariant', e.target.value)}
                    >
                      <option value="solid">ممتلئ</option>
                      <option value="outline">محدد</option>
                      <option value="subtle">خفيف</option>
                    </Select>
                  </FormControl>
                </GridItem>
                
                <GridItem>
                  <FormControl>
                    <FormLabel>الحجم</FormLabel>
                    <Select
                      value={badgeSettings.size}
                      onChange={(e) => handleBadgeSettingsChange('size', e.target.value)}
                    >
                      <option value="sm">صغير</option>
                      <option value="md">متوسط</option>
                      <option value="lg">كبير</option>
                    </Select>
                  </FormControl>
                </GridItem>
              </Grid>
            </Box>
            
            <Divider />
            
            {/* Conditions */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={4} color="purple.600">
                شروط الألوان
              </Text>
              
              <VStack spacing={4} align="stretch">
                {badgeSettings.conditions.map((condition) => (
                  <Card key={condition.id} variant="outline">
                    <CardBody>
                      <Grid templateColumns="repeat(5, 1fr)" gap={4} alignItems="end">
                        <GridItem>
                          <FormControl>
                            <FormLabel fontSize="sm">الاسم</FormLabel>
                            <Input
                              value={condition.name}
                              onChange={(e) => updateCondition(condition.id, 'name', e.target.value)}
                              size="sm"
                            />
                          </FormControl>
                        </GridItem>
                        
                        <GridItem>
                          <FormControl>
                            <FormLabel fontSize="sm">الشرط</FormLabel>
                            <Input
                              value={condition.condition}
                              onChange={(e) => updateCondition(condition.id, 'condition', e.target.value)}
                              placeholder="value > 0"
                              size="sm"
                              fontFamily="mono"
                            />
                          </FormControl>
                        </GridItem>
                        
                        <GridItem>
                          <FormControl>
                            <FormLabel fontSize="sm">اللون</FormLabel>
                            <Select
                              value={condition.color}
                              onChange={(e) => updateCondition(condition.id, 'color', e.target.value)}
                              size="sm"
                            >
                              <option value="positive">إيجابي</option>
                              <option value="negative">سلبي</option>
                              <option value="neutral">محايد</option>
                              <option value="warning">تحذير</option>
                              <option value="info">معلومات</option>
                            </Select>
                          </FormControl>
                        </GridItem>
                        
                        <GridItem>
                          <FormControl>
                            <FormLabel fontSize="sm">النمط</FormLabel>
                            <Select
                              value={condition.variant}
                              onChange={(e) => updateCondition(condition.id, 'variant', e.target.value)}
                              size="sm"
                            >
                              <option value="solid">ممتلئ</option>
                              <option value="outline">محدد</option>
                              <option value="subtle">خفيف</option>
                            </Select>
                          </FormControl>
                        </GridItem>
                        
                        <GridItem>
                          <HStack>
                            <Switch
                              isChecked={condition.enabled}
                              onChange={(e) => updateCondition(condition.id, 'enabled', e.target.checked)}
                              size="sm"
                            />
                            <Button
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => removeCondition(condition.id)}
                            >
                              <FiMinus />
                            </Button>
                          </HStack>
                        </GridItem>
                      </Grid>
                    </CardBody>
                  </Card>
                ))}
                
                {/* Add New Condition */}
                <Card variant="dashed" borderStyle="dashed">
                  <CardBody>
                    <Text fontSize="sm" fontWeight="medium" mb={3}>إضافة شرط جديد:</Text>
                    <Grid templateColumns="repeat(5, 1fr)" gap={4} alignItems="end">
                      <GridItem>
                        <FormControl>
                          <FormLabel fontSize="sm">الاسم</FormLabel>
                          <Input
                            value={newCondition.name}
                            onChange={(e) => setNewCondition(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="شرط جديد"
                            size="sm"
                          />
                        </FormControl>
                      </GridItem>
                      
                      <GridItem>
                        <FormControl>
                          <FormLabel fontSize="sm">الشرط</FormLabel>
                          <Input
                            value={newCondition.condition}
                            onChange={(e) => setNewCondition(prev => ({ ...prev, condition: e.target.value }))}
                            placeholder="value > 100"
                            size="sm"
                            fontFamily="mono"
                          />
                        </FormControl>
                      </GridItem>
                      
                      <GridItem>
                        <FormControl>
                          <FormLabel fontSize="sm">اللون</FormLabel>
                          <Select
                            value={newCondition.color}
                            onChange={(e) => setNewCondition(prev => ({ ...prev, color: e.target.value }))}
                            size="sm"
                          >
                            <option value="positive">إيجابي</option>
                            <option value="negative">سلبي</option>
                            <option value="neutral">محايد</option>
                            <option value="warning">تحذير</option>
                            <option value="info">معلومات</option>
                          </Select>
                        </FormControl>
                      </GridItem>
                      
                      <GridItem>
                        <FormControl>
                          <FormLabel fontSize="sm">النمط</FormLabel>
                          <Select
                            value={newCondition.variant}
                            onChange={(e) => setNewCondition(prev => ({ ...prev, variant: e.target.value }))}
                            size="sm"
                          >
                            <option value="solid">ممتلئ</option>
                            <option value="outline">محدد</option>
                            <option value="subtle">خفيف</option>
                          </Select>
                        </FormControl>
                      </GridItem>
                      
                      <GridItem>
                        <Button
                          colorScheme="green"
                          onClick={addCondition}
                          leftIcon={<FiPlus />}
                          size="sm"
                        >
                          إضافة
                        </Button>
                      </GridItem>
                    </Grid>
                  </CardBody>
                </Card>
              </VStack>
            </Box>
            
            <Divider />
            
            {/* Preview */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={4} color="teal.600">
                معاينة البادج
              </Text>
              
              <Card variant="outline">
                <CardHeader>
                  <Text fontSize="sm" fontWeight="medium">أمثلة على القيم:</Text>
                </CardHeader>
                <CardBody>
                  <Wrap spacing={3}>
                    {previewData.map((item, index) => (
                      <WrapItem key={index}>
                        <VStack spacing={1}>
                          <Text fontSize="xs" color="gray.600">{item.label}</Text>
                          <Badge
                            colorScheme={getBadgeVariant(item.value) === 'solid' ? 'green' : 'gray'}
                            variant={getBadgeVariant(item.value)}
                            size={badgeSettings.size}
                            bg={getBadgeVariant(item.value) === 'solid' ? getBadgeColor(item.value) : undefined}
                            color={getBadgeVariant(item.value) === 'solid' ? 'white' : getBadgeColor(item.value)}
                            borderColor={getBadgeColor(item.value)}
                          >
                            {formatValue(item.value)}
                          </Badge>
                        </VStack>
                      </WrapItem>
                    ))}
                  </Wrap>
                </CardBody>
              </Card>
            </Box>
          </VStack>
        </ModalBody>
        
        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="outline" onClick={onClose} leftIcon={<FiX />}>
              إلغاء
            </Button>
            <Button
              colorScheme="pink"
              onClick={handleSubmit}
              isLoading={loading}
              leftIcon={<FiSave />}
            >
              حفظ الإعدادات
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default BadgeConfigurator;

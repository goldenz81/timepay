import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/apiUrlHelper';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Alert,
  AlertIcon,
  Code,
  Divider,
  useColorModeValue,
  Collapse,
  Button,
  Icon,
  Tooltip,
  Select
} from '@chakra-ui/react';
import {
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiInfo,
  FiCode,
  FiPlay,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';

const FormulaPreviewSimple = ({ formula, columns, onResultChange }) => {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [usedColumns, setUsedColumns] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  
  const successColor = useColorModeValue('#1a2c38', '#1a2c38');
  const errorColor = useColorModeValue('#2f4553', '#2f4553');
  const infoColor = useColorModeValue('#111827', '#111827');

  // دالة للحصول على الاسم العربي من البيانات
  const getArabicName = (column) => {
    return column.column_name_ar || column.display_name_ar || column.name;
  };

  const [systemVariables, setSystemVariables] = useState({});
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // جلب المتغيرات من قاعدة البيانات
  useEffect(() => {
    const fetchSystemVariables = async () => {
      try {
        const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php?action=get_system_variables'));
        const data = await response.json();
        if (data.success) {
          const variables = {};
          data.data.forEach(variable => {
            variables[variable.variable_name] = parseFloat(variable.variable_value) || 0;
          });
          setSystemVariables(variables);
        }
      } catch (error) {
        console.error('خطأ في جلب المتغيرات:', error);
      }
    };
    
    fetchSystemVariables();
  }, []);

  // جلب قائمة الموظفين
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch(getApiUrl('/api/dynamic_system/dynamic_system_api.php?action=get_employees'));
        const data = await response.json();
        if (data.success) {
          setEmployees(data.data);
          // اختيار أول موظف افتراضياً
          if (data.data.length > 0) {
            setSelectedEmployee(data.data[0]);
          }
        }
      } catch (error) {
        console.error('خطأ في جلب الموظفين:', error);
      }
    };
    
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (!formula || typeof formula !== 'string' || formula.trim() === '') {
      setResult(null);
      setError('');
      setIsValid(false);
      setUsedColumns([]);
      return;
    }

    try {
      // استخراج الأعمدة المستخدمة في المعادلة
      const usedCols = columns.filter(col => {
        const key = col.column_key || col.name;
        return key && formula.includes(key);
      });
      setUsedColumns(usedCols);

      // تحويل المعادلة إلى JavaScript
      let jsFormula = formula;
      
      // إضافة الأعمدة من columns إلى المتغيرات
      const columnVariables = {};
      if (columns && Array.isArray(columns)) {
        columns.forEach(col => {
          const key = col.column_key || col.name;
          if (key) {
            // استخدام قيمة افتراضية بناءً على نوع العمود
            let defaultValue = 0;
            if (key === 'total_entitlements') {
              defaultValue = 2000; // قيمة افتراضية لإجمالي المستحقات
            } else if (key === 'total_deductions') {
              defaultValue = 100; // قيمة افتراضية لإجمالي المستقطعات
            } else if (key === 'base_salary') {
              defaultValue = 1500;
            } else if (key === 'daily_wage') {
              defaultValue = 50;
            } else if (key === 'hourly_wage') {
              defaultValue = 5;
            } else if (key === 'transport_allowance') {
              defaultValue = 0;
            } else if (key === 'special_bonus') {
              defaultValue = 0;
            } else if (key === 'overtime_pay') {
              defaultValue = 0;
            } else if (key === 'punctuality_bonus') {
              defaultValue = 0;
            } else if (key === 'absent_deduction') {
              defaultValue = 0;
            } else if (key === 'late_deduction') {
              defaultValue = 0;
            } else if (key === 'insurance_deduction') {
              defaultValue = 0;
            } else if (key === 'advance_deduction') {
              defaultValue = 0;
            }
            columnVariables[key] = defaultValue;
          }
        });
      }
      
      // إضافة total_entitlements و total_deductions إذا لم يكونا موجودين في columns
      // هذه الأعمدة موجودة في جدول net_weekly_wage كأعمدة محسوبة
      if (!columnVariables.total_entitlements) {
        columnVariables.total_entitlements = 2000; // قيمة افتراضية لإجمالي المستحقات
      }
      if (!columnVariables.total_deductions) {
        columnVariables.total_deductions = 100; // قيمة افتراضية لإجمالي المستقطعات
      }
      
      // دمج المتغيرات من النظام وبيانات الموظف والأعمدة
      const allVariables = {
        ...systemVariables,
        ...columnVariables,
        ...(selectedEmployee && {
          base_salary: parseFloat(selectedEmployee.base_salary) || columnVariables.base_salary || 0,
          employee_name: selectedEmployee.employee_name,
          department: selectedEmployee.department,
          position: selectedEmployee.position
        })
      };
      

      const sortedKeys = Object.keys(allVariables).sort((a, b) => b.length - a.length);
      sortedKeys.forEach(key => {
        jsFormula = jsFormula.replace(new RegExp(key, 'g'), allVariables[key]);
      });
      
      jsFormula = jsFormula
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/\+/g, '+')
        .replace(/-/g, '-')
        .replace(/\(/g, '(')
        .replace(/\)/g, ')');

      const undefinedVars = jsFormula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g);
      if (undefinedVars && undefinedVars.length > 0) {
        const uniqueUndefinedVars = [...new Set(undefinedVars)];
        throw new Error(`المتغيرات التالية غير معرفة: ${uniqueUndefinedVars.join(', ')}`);
      }

      const testResult = eval(jsFormula);
      
      if (isNaN(testResult) || !isFinite(testResult)) {
        throw new Error('النتيجة غير صحيحة');
      }

      setResult(testResult);
      setError('');
      setIsValid(true);
      
      if (onResultChange) {
        onResultChange(testResult);
      }
    } catch (err) {
      setError(err.message);
      setResult(null);
      setIsValid(false);
      
      if (onResultChange) {
        onResultChange(null);
      }
    }
  }, [formula, columns, systemVariables, selectedEmployee, onResultChange]);

  const formatResult = (value) => {
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return value;
  };

  const getStatusIcon = () => {
    if (isValid) {
      return <Icon as={FiCheck} color="green.500" />;
    } else if (error) {
      return <Icon as={FiX} color="red.500" />;
    } else {
      return <Icon as={FiInfo} color="blue.500" />;
    }
  };

  const getStatusColor = () => {
    if (isValid) return 'green';
    if (error) return 'red';
    return 'blue';
  };

  return (
    <Box>
      <VStack spacing={3} align="stretch">
        {/* حالة المعادلة */}
        <HStack justify="space-between">
          <HStack spacing={2}>
            {getStatusIcon()}
            <Text className="stake-text" fontWeight="medium">
              حالة المعادلة
            </Text>
          </HStack>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDetails(!showDetails)}
            leftIcon={<Icon as={showDetails ? FiChevronUp : FiChevronDown} />}
            className="stake-button-secondary"
          >
            {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          </Button>
        </HStack>

        {/* قائمة اختيار الموظف */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2} color="white">
            اختر موظف للاختبار
          </Text>
          <Select
            value={selectedEmployee?.id || ''}
            onChange={(e) => {
              const employeeId = e.target.value;
              const employee = employees.find(emp => emp.id == employeeId);
              setSelectedEmployee(employee);
            }}
            placeholder="اختر موظف..."
            bg="var(--stake-bg-card, #1a2c38)"
            color="white"
            borderColor="var(--stake-border-primary, #2f4553)"
            _hover={{ borderColor: "#1a2c38", bg: "#2f4553" }}
            _focus={{ borderColor: "#1a2c38", boxShadow: "0 0 0 1px #1a2c38", bg: "#1a2c38" }}
            _expanded={{ bg: "#1a2c38" }}
            sx={{
              '& option': {
                backgroundColor: '#1a2c38',
                color: 'white'
              }
            }}
          >
            {employees.map((employee) => (
              <option 
                key={employee.id} 
                value={employee.id}
                style={{
                  backgroundColor: '#1a2c38',
                  color: 'white'
                }}
              >
                {employee.employee_name} - {employee.base_salary} ج.م
              </option>
            ))}
          </Select>
        </Box>

        {/* النتيجة أو الخطأ */}
        {isValid && result !== null && (
          <Alert status="success" bg={successColor} border="1px solid" borderColor="var(--stake-border-primary, #2f4553)">
            <AlertIcon as={FiPlay} color="white" />
            <VStack align="start" spacing={1}>
              <Text fontWeight="medium" color="white">النتيجة: {formatResult(result)}</Text>
              <Text fontSize="sm" color="gray.300" opacity={0.9}>
                (بناءً على بيانات {selectedEmployee?.employee_name || 'الموظف المحدد'})
              </Text>
            </VStack>
          </Alert>
        )}

        {error && (
          <Alert status="error" bg={errorColor} border="1px solid" borderColor="var(--stake-border-primary, #1a2c38)">
            <AlertIcon as={FiAlertTriangle} color="white" />
            <VStack align="start" spacing={1}>
              <Text fontWeight="medium" color="white">خطأ في المعادلة</Text>
              <Text fontSize="sm" color="gray.300">{error}</Text>
            </VStack>
          </Alert>
        )}

        {/* التفاصيل */}
        <Collapse in={showDetails}>
          <VStack spacing={3} align="stretch">
            <Divider />
            
            {/* المعادلة المنسقة */}
            <Box>
              <Text className="stake-text" fontWeight="medium" mb={2}>
                المعادلة:
              </Text>
              <Code p={2} borderRadius="md" bg={infoColor} fontSize="sm">
                {formula}
              </Code>
            </Box>

            {/* الأعمدة المستخدمة */}
            {usedColumns.length > 0 && (
              <Box>
                <Text className="stake-text" fontWeight="medium" mb={2}>
                  الأعمدة المستخدمة:
                </Text>
                <HStack spacing={2} wrap="wrap">
                  {usedColumns.map((col, index) => (
                    <Tooltip
                      key={index}
                      label={col.name}
                      placement="top"
                      bg="var(--stake-bg-card, #1a2c38)"
                      color="white"
                      border="1px solid"
                      borderColor="var(--stake-border-primary, #2f4553)"
                    >
                      <Badge
                        variant="solid"
                        fontSize="xs"
                        bg="var(--stake-bg-card, #1a2c38)"
                        color="white"
                        border="1px solid"
                        borderColor="var(--stake-border-primary, #2f4553)"
                        _hover={{ bg: "#2f4553" }}
                        cursor="help"
                      >
                        {getArabicName(col)}
                      </Badge>
                    </Tooltip>
                  ))}
                </HStack>
              </Box>
            )}

            {/* الأعمدة المتاحة */}
            {(() => {
              // إضافة total_entitlements و total_deductions إلى قائمة الأعمدة المتاحة إذا لم يكونا موجودين
              const allAvailableColumns = [...(columns || [])];
              const hasTotalEntitlements = allAvailableColumns.some(col => (col.column_key || col.name) === 'total_entitlements');
              const hasTotalDeductions = allAvailableColumns.some(col => (col.column_key || col.name) === 'total_deductions');
              
              if (!hasTotalEntitlements) {
                allAvailableColumns.push({
                  column_key: 'total_entitlements',
                  name: 'total_entitlements',
                  column_name_ar: 'إجمالي المستحقات',
                  display_name_ar: 'إجمالي المستحقات'
                });
              }
              if (!hasTotalDeductions) {
                allAvailableColumns.push({
                  column_key: 'total_deductions',
                  name: 'total_deductions',
                  column_name_ar: 'إجمالي المستقطعات',
                  display_name_ar: 'إجمالي المستقطعات'
                });
              }
              
              const availableCols = allAvailableColumns.filter(col => {
                const key = col.column_key || col.name;
                return !usedColumns.some(used => (used.column_key || used.name) === key);
              });
              
              if (availableCols.length > 0) {
                return (
                  <Box>
                    <Text className="stake-text" fontWeight="medium" mb={2}>
                      الأعمدة المتاحة:
                    </Text>
                    <HStack spacing={2} wrap="wrap">
                      {availableCols.map((col, index) => {
                        const key = col.column_key || col.name;
                        return (
                          <Tooltip
                            key={index}
                            label={key}
                            placement="top"
                            bg="var(--stake-bg-card, #1a2c38)"
                            color="white"
                            border="1px solid"
                            borderColor="var(--stake-border-primary, #2f4553)"
                          >
                            <Badge
                              variant="solid"
                              fontSize="xs"
                              bg="#2f4553"
                              color="white"
                              border="1px solid"
                              borderColor="var(--stake-border-primary, #1a2c38)"
                              _hover={{ bg: "#1a2c38" }}
                              cursor="help"
                            >
                              {getArabicName(col)}
                            </Badge>
                          </Tooltip>
                        );
                      })}
                    </HStack>
                  </Box>
                );
              }
              return null;
            })()}

            {/* نصائح */}
            <Alert status="info" bg={infoColor} border="1px solid" borderColor="var(--stake-border-primary, #2f4553)">
              <AlertIcon as={FiInfo} color="white" />
              <VStack align="start" spacing={1}>
                <Text fontWeight="medium" color="white">نصائح:</Text>
                <Text fontSize="sm" color="gray.300">
                  • استخدم أسماء الأعمدة كما هي مكتوبة
                </Text>
                <Text fontSize="sm" color="gray.300">
                  • استخدم × للضرب و ÷ للقسمة
                </Text>
                <Text fontSize="sm" color="gray.300">
                  • استخدم الأقواس () لتجميع العمليات
                </Text>
              </VStack>
            </Alert>
          </VStack>
        </Collapse>
      </VStack>
    </Box>
  );
};

export default FormulaPreviewSimple;

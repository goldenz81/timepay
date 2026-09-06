import React from 'react';
import { Tooltip } from '@chakra-ui/react';
import { useSettings } from '../contexts/SettingsContext';
import { SALARY_COLUMN_EQUATIONS } from '../utils/salary/salaryColumnEquations';

const DYNAMIC_SYSTEM_EQUATIONS = {
  table_name: 'table_name: اسم الجدول في النظام',
  description: 'description: وصف الجدول أو العمود',
  status: 'status: حالة العنصر (نشط/غير نشط)',
  actions: 'actions: الإجراءات المتاحة',
  column_name: 'column_name: اسم العمود في قاعدة البيانات',
  display_name: 'display_name: اسم العرض للمستخدم',
  data_type: 'data_type: نوع البيانات (نص، رقم، تاريخ)',
  formula_name: 'formula_name: اسم المعادلة',
  formula: 'formula: نص المعادلة الرياضية',
  variable_name: 'variable_name: اسم المتغير',
  key: 'key: المفتاح الفريد للمتغير',
  value: 'value: قيمة المتغير',
  expression: 'expression: التعبير الرياضي',
  mapping_type: 'mapping_type: نوع الربط بين العمود والمعادلة',
  id: 'id: المعرف الفريد للعنصر',
  linked_formula: 'linked_formula: المعادلة المرتبطة بالعمود',
};

const TOOLTIP_EQUATIONS = { ...DYNAMIC_SYSTEM_EQUATIONS, ...SALARY_COLUMN_EQUATIONS };

const ChakraEnglishKeyTooltip = ({ children, englishKey, tooltipText, ...props }) => {
  const { settings } = useSettings();
  const showEnglishKeys =
    settings?.show_english_keys === 'true' ||
    settings?.show_english_keys === true ||
    settings?.show_english_keys === '1';

  if (!showEnglishKeys || !englishKey) {
    return children;
  }

  const label =
    tooltipText || TOOLTIP_EQUATIONS[englishKey] || englishKey;

  return (
    <Tooltip
      label={label}
      placement="top"
      hasArrow
      bg="black"
      color="white"
      fontSize="12px"
      fontFamily="monospace"
      px="3"
      py="2"
      maxW="300px"
      whiteSpace="pre-line"
      {...props}
    >
      <span style={{ cursor: 'help' }}>{children}</span>
    </Tooltip>
  );
};

export default ChakraEnglishKeyTooltip;

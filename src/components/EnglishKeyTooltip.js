import React from 'react';
import { Tooltip } from 'antd';
import { useSettings } from '../contexts/SettingsContext';

const EnglishKeyTooltip = ({ children, englishKey, title, tooltipText, ...props }) => {
  const { settings } = useSettings();
  const showEnglishKeys = settings?.show_english_keys === 'true' || settings?.show_english_keys === true || settings?.show_english_keys === '1';

  if (!showEnglishKeys || !englishKey) {
    return children;
  }

  // إنشاء نص الـ tooltip الديناميكي
  const getTooltipContent = () => {
    if (tooltipText) {
      return tooltipText;
    }
    
    // معادلات ديناميكية بناءً على المفتاح
    const equations = {
      'total_entitlements': 'المفتاح: total_entitlements\nالمعادلة: الراتب الأساسي + بدل السكن + بدل النقل + بدل الطعام + مكافأة خاصة + ساعات إضافية + بدلات أخرى',
      'total_deductions': 'المفتاح: total_deductions\nالمعادلة: التأمين الاجتماعي + ضريبة الدخل + قسط القرض + غرامة الغياب + التأخير + خصومات أخرى',
      'net_salary': 'المفتاح: net_salary\nالمعادلة: إجمالي المستحقات - إجمالي المستقطع',
      'basic_salary_weekly': 'المفتاح: basic_salary_weekly\nالمعادلة: الراتب الأساسي الأسبوعي',
      'basic_salary_monthly': 'المفتاح: basic_salary_monthly\nالمعادلة: الراتب الأساسي الشهري'
    };

    return equations[englishKey] || englishKey;
  };

  return (
    <Tooltip 
      title={getTooltipContent()} 
      placement="top"
      overlayStyle={{ 
        fontSize: '12px',
        fontFamily: 'monospace',
        backgroundColor: '#000',
        color: '#fff',
        padding: '8px 12px',
        margin: '0',
        whiteSpace: 'pre-line',
        maxWidth: '300px'
      }}
      {...props}
    >
      <span style={{ cursor: 'help' }}>
        {children}
      </span>
    </Tooltip>
  );
};

export default EnglishKeyTooltip;

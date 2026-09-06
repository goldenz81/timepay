import { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/apiUrlHelper';

/**
 * Hook لإدارة إعدادات العملة
 * @returns {Object} إعدادات العملة ودوال التنسيق
 */
const useCurrency = () => {
  const [settings, setSettings] = useState({
    'currency.enabled': 'true',
    'currency.symbol': 'ج.م',
    'currency.name': 'جنيه مصري',
    'currency.code': 'EGP',
    'currency.position': 'after',
    'currency.decimals': '0',
    'currency.thousands_separator': ',',
    'currency.decimal_separator': '.',
    'currency.format': '{amount} {symbol} {name}',
    'currency.show_symbol': 'true',
    'currency.show_name': 'true'
  });
  const [loading, setLoading] = useState(true);

  // تحميل إعدادات العملة
  const loadCurrencySettings = async () => {
    try {
      const response = await fetch(getApiUrl('/api/load_system_settings.php'));
      const data = await response.json();
      
      if (data.success && data.settings) {
        // تحويل إعدادات النظام الجديد إلى التنسيق المطلوب
        const currencySettings = {
          'currency.enabled': 'true',
          'currency.symbol': data.settings['currency.symbol'] || 'ج.م',
          'currency.name': data.settings['currency.name'] || 'جنيه مصري',
          'currency.code': data.settings['currency.code'] || 'EGP',
          'currency.position': data.settings['currency.position'] || 'after',
          'currency.decimals': data.settings['currency.decimals'] || '0',
          'currency.thousands_separator': data.settings['currency.thousands_separator'] || ',',
          'currency.decimal_separator': data.settings['currency.decimal_separator'] || '.',
          'currency.format': '{amount} {symbol} {name}',
          'currency.show_symbol': data.settings['currency.show_symbol'] || 'true',
          'currency.show_name': data.settings['currency.show_name'] || 'false'
        };
        setSettings(currencySettings);
      }
    } catch (error) {
      console.error('خطأ في تحميل إعدادات العملة:', error);
    } finally {
      setLoading(false);
    }
  };

  // تنسيق العملة
  const formatCurrency = (amount) => {
    if (settings['currency.enabled'] !== 'true') {
      return amount.toString();
    }

    const numAmount = parseFloat(amount) || 0;
    const decimals = parseInt(settings['currency.decimals'] || '0');
    const thousandsSep = settings['currency.thousands_separator'] || ',';
    const decimalSep = settings['currency.decimal_separator'] || '.';
    
    // تنسيق الرقم
    const formattedAmount = numAmount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).replace(/,/g, thousandsSep).replace(/\./g, decimalSep);
    
    // إضافة رمز العملة
    const symbol = settings['currency.show_symbol'] === 'true' ? settings['currency.symbol'] : '';
    const name = settings['currency.show_name'] === 'true' ? settings['currency.name'] : '';
    const position = settings['currency.position'] || 'after';
    
    // تطبيق التنسيق
    let format = settings['currency.format'] || '{amount} {symbol}';
    
    // إذا كان التنسيق يحتوي على {symbol} أو {name}، استخدم position لتحديد الترتيب
    if (format.includes('{symbol}') || format.includes('{name}')) {
      // بناء التنسيق بناءً على position
      if (position === 'before') {
        // قبل الرقم: {symbol} {name} {amount}
        format = format.replace('{amount}', '{amount}');
        format = format.replace('{symbol}', '{symbol}');
        format = format.replace('{name}', '{name}');
        
        // إعادة ترتيب العناصر
        const parts = [];
        if (symbol) parts.push('{symbol}');
        if (name) parts.push('{name}');
        parts.push('{amount}');
        format = parts.join(' ');
      } else {
        // بعد الرقم: {amount} {symbol} {name}
        format = format.replace('{amount}', '{amount}');
        format = format.replace('{symbol}', '{symbol}');
        format = format.replace('{name}', '{name}');
        
        // إعادة ترتيب العناصر
        const parts = ['{amount}'];
        if (symbol) parts.push('{symbol}');
        if (name) parts.push('{name}');
        format = parts.join(' ');
      }
    }
    
    format = format.replace('{amount}', formattedAmount);
    format = format.replace('{symbol}', symbol);
    format = format.replace('{name}', name);
    
    return format;
  };

  // تنسيق العملة بدون رمز
  const formatAmount = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    const decimals = parseInt(settings['currency.decimals'] || '0');
    const thousandsSep = settings['currency.thousands_separator'] || ',';
    const decimalSep = settings['currency.decimal_separator'] || '.';
    
    return numAmount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).replace(/,/g, thousandsSep).replace(/\./g, decimalSep);
  };

  // الحصول على رمز العملة
  const getCurrencySymbol = () => {
    return settings['currency.show_symbol'] === 'true' ? settings['currency.symbol'] : '';
  };

  // الحصول على اسم العملة
  const getCurrencyName = () => {
    return settings['currency.show_name'] === 'true' ? settings['currency.name'] : '';
  };

  // التحقق من تفعيل العملة
  const isCurrencyEnabled = () => {
    return settings['currency.enabled'] === 'true';
  };

  // تحديث الإعدادات
  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // إعادة تحميل الإعدادات
  const reloadSettings = () => {
    setLoading(true);
    loadCurrencySettings();
  };

  useEffect(() => {
    loadCurrencySettings();
  }, []);

  return {
    settings,
    loading,
    formatCurrency,
    formatAmount,
    getCurrencySymbol,
    getCurrencyName,
    isCurrencyEnabled,
    updateSettings,
    reloadSettings
  };
};

export default useCurrency;

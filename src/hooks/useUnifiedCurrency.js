import { useState, useEffect } from "react";
import { getApiUrl } from "../utils/apiUrlHelper";

/**
 * Hook لإدارة إعدادات العملة الموحدة
 * @returns {Object} إعدادات العملة ودوال التنسيق
 */
const useUnifiedCurrency = () => {
  const [config, setConfig] = useState({
    enabled: true,
    symbol: "ج.م",
    name: "جنيه مصري",
    code: "EGP",
    position: "after",
    decimals: 0,
    thousands_separator: ",",
    decimal_separator: ".",
    format: "{amount} {symbol}",
    show_symbol: true,
    show_name: false
  });
  const [loading, setLoading] = useState(true);

  // تحميل إعدادات العملة
  const loadCurrencyConfig = async () => {
    try {
      const response = await fetch(getApiUrl("/api/currency_settings_old.php?action=get_currency_settings"));
      const data = await response.json();
      
      if (data.success) {
        // تحويل إعدادات النظام القديم إلى تنسيق النظام الجديد
        const currencyConfig = {
          enabled: data.settings['currency.enabled'] === 'true',
          symbol: data.settings['currency.symbol'] || 'ج.م',
          name: data.settings['currency.name'] || 'جنيه مصري',
          code: data.settings['currency.code'] || 'EGP',
          position: data.settings['currency.position'] || 'after',
          decimals: parseInt(data.settings['currency.decimals'] || '0'),
          thousands_separator: data.settings['currency.thousands_separator'] || ',',
          decimal_separator: data.settings['currency.decimal_separator'] || '.',
          format: data.settings['currency.format'] || '{amount} {symbol}',
          show_symbol: data.settings['currency.show_symbol'] === 'true',
          show_name: data.settings['currency.show_name'] === 'true'
        };
        
        setConfig(currencyConfig);
      }
    } catch (error) {
      console.error("خطأ في تحميل إعدادات العملة:", error);
    } finally {
      setLoading(false);
    }
  };

  // تنسيق العملة
  const formatCurrency = (amount) => {
    if (!config.enabled) {
      return amount.toString();
    }

    const numAmount = parseFloat(amount) || 0;
    const decimals = parseInt(config.decimals || 0);
    const thousandsSep = config.thousands_separator || ",";
    const decimalSep = config.decimal_separator || ".";
    
    // تنسيق الرقم
    const formattedAmount = numAmount.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).replace(/,/g, thousandsSep).replace(/\./g, decimalSep);
    
    // إضافة رمز العملة
    const symbol = config.show_symbol ? config.symbol : "";
    const name = config.show_name ? config.name : "";
    
    // تطبيق التنسيق
    let format = config.format || "{amount} {symbol}";
    format = format.replace("{amount}", formattedAmount);
    format = format.replace("{symbol}", symbol);
    format = format.replace("{name}", name);
    
    return format;
  };

  // تنسيق العملة بدون رمز
  const formatAmount = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    const decimals = parseInt(config.decimals || 0);
    const thousandsSep = config.thousands_separator || ",";
    const decimalSep = config.decimal_separator || ".";
    
    return numAmount.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).replace(/,/g, thousandsSep).replace(/\./g, decimalSep);
  };

  // الحصول على رمز العملة
  const getCurrencySymbol = () => {
    return config.show_symbol ? config.symbol : "";
  };

  // الحصول على اسم العملة
  const getCurrencyName = () => {
    return config.show_name ? config.name : "";
  };

  // التحقق من تفعيل العملة
  const isCurrencyEnabled = () => {
    return config.enabled;
  };

  // تحديث الإعدادات
  const updateConfig = (newConfig) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  // إعادة تحميل الإعدادات
  const reloadConfig = () => {
    setLoading(true);
    loadCurrencyConfig();
  };

  useEffect(() => {
    loadCurrencyConfig();
  }, []);

  return {
    config,
    loading,
    formatCurrency,
    formatAmount,
    getCurrencySymbol,
    getCurrencyName,
    isCurrencyEnabled,
    updateConfig,
    reloadConfig
  };
};

export default useUnifiedCurrency;
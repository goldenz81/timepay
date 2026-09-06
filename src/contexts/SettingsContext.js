import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { API_ENDPOINTS, apiFetch } from '../config/api';
import { applySystemFont } from '../utils/fontFamilyHelper';
import { parseSystemBooleanFlag } from '../utils/systemFeatureFlags';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    systemName: 'نظام الحضور والمرتبات والأجور',
    companyName: 'شركة TimePay',
    currency: 'EGP',
    fontFamily: 'Cairo',
    timeFormat: '24',
    timezone: 'Africa/Cairo',
    city: 'Cairo',
    workStartTime: '08:00',
    workEndTime: '17:00',
    timeEditLock: false,
    autoBackup: false,
    backupFrequency: 'daily',
    backupTime: '02:00',
    lastBackup: 'لم يتم إنشاء نسخة احتياطية',
    requireLogin: true, // تسجيل الدخول مطلوب افتراضياً
    mealAllowanceEnabled: true // بدل الوجبة والانتظام مفعّل افتراضياً
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to apply font
  const applyFont = (fontFamily) => {
    const fontFamilyValue = applySystemFont(fontFamily);
    console.log('Setting CSS font-family to:', fontFamilyValue);
    console.log('Font applied to document root, body, html, and root element');
  };

  // تحميل الإعدادات من قاعدة البيانات
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await apiFetch(API_ENDPOINTS.LOAD_SETTINGS);
        const data = await response.json();
        
        if (data.success) {
          const dbSettings = data.settings;
          const newSettings = {
            systemName: dbSettings.system_name || 'نظام الحضور والمرتبات والأجور',
            companyName: dbSettings.company_name || 'شركة TimePay',
            companyLogo: dbSettings.company_logo || '',
            companyLogoSoftLight: dbSettings.company_logo_soft_light || '',
            currency: dbSettings.currency || 'EGP',
            fontFamily: dbSettings.font_family || 'Cairo',
            timeFormat: dbSettings.timeFormat || '24',
            timezone: dbSettings.timezone || 'Africa/Cairo',
            city: dbSettings.city || 'Cairo',
            workStartTime: dbSettings.work_start_time || '08:00',
            workEndTime: dbSettings.work_end_time || '17:00',
            timeEditLock: (() => {
              const value = dbSettings.timeEditLock;
              console.log('SettingsContext: timeEditLock raw value:', value, 'type:', typeof value);
              return value === 'true' || value === true || value === '1' || value === 1;
            })(),
            autoBackup: dbSettings.auto_backup === 'true' || dbSettings.auto_backup === true,
            backupFrequency: dbSettings.backup_frequency || 'daily',
            backupTime: dbSettings.backup_time || '02:00',
            lastBackup: dbSettings.last_backup || 'لم يتم إنشاء نسخة احتياطية',
            show_english_keys: dbSettings.show_english_keys === 'true' || dbSettings.show_english_keys === true || dbSettings.show_english_keys === '1',
            requireLogin: dbSettings.require_login !== 'false' && dbSettings.require_login !== false,
            mealAllowanceEnabled: parseSystemBooleanFlag(dbSettings.meal_allowance_enabled, true)
          };
          console.log('SettingsContext: Loaded settings from database:', newSettings);
          console.log('SettingsContext: timeEditLock value:', newSettings.timeEditLock);
          console.log('SettingsContext: timeFormat value:', newSettings.timeFormat, 'from dbSettings.timeFormat:', dbSettings.timeFormat, 'from dbSettings.time_format:', dbSettings.time_format);
          console.log('SettingsContext: show_english_keys value:', newSettings.show_english_keys, 'from dbSettings.show_english_keys:', dbSettings.show_english_keys);
          console.log('SettingsContext: requireLogin value:', newSettings.requireLogin, 'from dbSettings.require_login:', dbSettings.require_login);
          setSettings(newSettings);
          
        // Apply font immediately after loading settings
        if (newSettings.fontFamily) {
          console.log('Applying font on load:', newSettings.fontFamily);
          applyFont(newSettings.fontFamily);
        }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // دالة لتحديث الإعدادات
  const updateSettings = (newSettings) => {
    console.log('SettingsContext: updateSettings called with:', newSettings);
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      console.log('SettingsContext: Previous settings:', prev);
      console.log('SettingsContext: Updated settings:', updated);
      
      // Apply font when fontFamily is updated
      if (newSettings.fontFamily != null) {
        applyFont(newSettings.fontFamily);
      }
      
      // Log timezone and time format changes
      if (newSettings.timezone && newSettings.timezone !== prev.timezone) {
        console.log('SettingsContext: Timezone changed to', newSettings.timezone);
      }
      if (newSettings.timeFormat && newSettings.timeFormat !== prev.timeFormat) {
        console.log('SettingsContext: Time format changed to', newSettings.timeFormat);
      }
      if (newSettings.timeEditLock !== undefined) {
        console.log('SettingsContext: timeEditLock changed to', newSettings.timeEditLock);
        console.log('SettingsContext: timeEditLock type:', typeof newSettings.timeEditLock);
      }
      
      return updated;
    });
  };

  // دالة لإعادة تحميل الإعدادات
  const reloadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch(API_ENDPOINTS.LOAD_SETTINGS);
      const data = await response.json();
      
      if (data.success) {
        const dbSettings = data.settings;
        const newSettings = {
          systemName: dbSettings.system_name || 'نظام الحضور والمرتبات والأجور',
          companyName: dbSettings.company_name || 'شركة TimePay',
          companyLogo: dbSettings.company_logo || '',
          companyLogoSoftLight: dbSettings.company_logo_soft_light || '',
          currency: dbSettings.currency || 'EGP',
          fontFamily: dbSettings.font_family || 'Cairo',
          timeFormat: dbSettings.timeFormat || '24',
          timezone: dbSettings.timezone || 'Africa/Cairo',
          city: dbSettings.city || 'Cairo',
          workStartTime: dbSettings.work_start_time || '08:00',
          workEndTime: dbSettings.work_end_time || '17:00',
          timeEditLock: dbSettings.timeEditLock === 'true' || dbSettings.timeEditLock === true,
          autoBackup: dbSettings.auto_backup === 'true' || dbSettings.auto_backup === true,
          backupFrequency: dbSettings.backup_frequency || 'daily',
          backupTime: dbSettings.backup_time || '02:00',
          lastBackup: dbSettings.last_backup || 'لم يتم إنشاء نسخة احتياطية',
          requireLogin: dbSettings.require_login !== 'false' && dbSettings.require_login !== false,
          mealAllowanceEnabled: parseSystemBooleanFlag(dbSettings.meal_allowance_enabled, true)
        };
        setSettings(newSettings);
        
        // Apply font immediately after reloading settings
        if (newSettings.fontFamily) {
          console.log('Applying font on reload:', newSettings.fontFamily);
          applyFont(newSettings.fontFamily);
        }
      }
    } catch (error) {
      console.error('Error reloading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo(() => ({
    settings,
    isLoading,
    updateSettings,
    reloadSettings
  }), [settings, isLoading]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

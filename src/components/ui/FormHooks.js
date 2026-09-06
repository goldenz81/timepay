import { useState, useCallback } from 'react';

// Hook لإدارة حالة النماذج
export const useForm = (initialValues = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const setError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const setTouchedField = useCallback((name, isTouched = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }));
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setValue(name, fieldValue);
    
    // إزالة الخطأ عند التغيير
    if (errors[name]) {
      setError(name, '');
    }
  }, [errors, setValue, setError]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouchedField(name, true);
  }, [setTouchedField]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const validate = useCallback((validationRules) => {
    const newErrors = {};
    
    Object.keys(validationRules).forEach(field => {
      const rules = validationRules[field];
      const value = values[field];
      
      if (rules.required && (!value || value.toString().trim() === '')) {
        newErrors[field] = rules.required;
      } else if (rules.minLength && value && value.length < rules.minLength) {
        newErrors[field] = rules.minLength;
      } else if (rules.maxLength && value && value.length > rules.maxLength) {
        newErrors[field] = rules.maxLength;
      } else if (rules.pattern && value && !rules.pattern.test(value)) {
        newErrors[field] = rules.pattern;
      } else if (rules.custom && value) {
        const customError = rules.custom(value, values);
        if (customError) {
          newErrors[field] = customError;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values]);

  return {
    values,
    errors,
    touched,
    setValue,
    setError,
    setTouchedField,
    handleChange,
    handleBlur,
    reset,
    validate
  };
};

// Hook للتحقق من صحة النماذج
export const useValidation = () => {
  const validationRules = {
    required: (message) => ({ required: message }),
    minLength: (min, message) => ({ minLength: { min, message } }),
    maxLength: (max, message) => ({ maxLength: { max, message } }),
    pattern: (regex, message) => ({ pattern: { regex, message } }),
    custom: (validator, message) => ({ custom: { validator, message } })
  };

  return validationRules;
};

// Hook لإدارة حالة التحميل
export const useLoading = (initialState = false) => {
  const [loading, setLoading] = useState(initialState);

  const startLoading = useCallback(() => setLoading(true), []);
  const stopLoading = useCallback(() => setLoading(false), []);

  return {
    loading,
    startLoading,
    stopLoading
  };
};

// Hook لإدارة الرسائل
export const useMessage = () => {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // 'success', 'error', 'warning', 'info'

  const showMessage = useCallback((text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
  }, []);

  const hideMessage = useCallback(() => {
    setMessage('');
    setMessageType('info');
  }, []);

  const showSuccess = useCallback((text) => showMessage(text, 'success'), [showMessage]);
  const showError = useCallback((text) => showMessage(text, 'error'), [showMessage]);
  const showWarning = useCallback((text) => showMessage(text, 'warning'), [showMessage]);

  return {
    message,
    messageType,
    showMessage,
    hideMessage,
    showSuccess,
    showError,
    showWarning
  };
};

// Hook لإدارة النماذج المتقدمة
export const useAdvancedForm = (initialValues = {}, validationRules = {}) => {
  const form = useForm(initialValues);
  const loading = useLoading();
  const message = useMessage();

  const handleSubmit = useCallback(async (onSubmit) => {
    loading.startLoading();
    message.hideMessage();

    try {
      // التحقق من صحة البيانات
      const isValid = form.validate(validationRules);
      
      if (!isValid) {
        message.showError('يرجى تصحيح الأخطاء قبل المتابعة');
        return;
      }

      // تنفيذ الدالة المرسلة
      await onSubmit(form.values);
      message.showSuccess('تم الحفظ بنجاح');
      
    } catch (error) {
      console.error('Form submission error:', error);
      message.showError(error.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      loading.stopLoading();
    }
  }, [form, loading, message, validationRules]);

  return {
    ...form,
    ...loading,
    ...message,
    handleSubmit
  };
};

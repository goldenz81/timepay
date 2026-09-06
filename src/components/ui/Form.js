import React, { useState, forwardRef, useRef, useEffect } from 'react';
import { ChevronDown, Eye, EyeOff, Check, AlertCircle, Clock, Calendar, User, Mail, Phone, MapPin, Globe, DollarSign, Building2, Settings, Shield, Bell, Download, Upload, Search, Filter, X } from 'lucide-react';

// ===== FORM WRAPPER =====
export const Form = ({ 
  children, 
  onSubmit, 
  className = '',
  loading = false 
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!loading && onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className={`space-y-6 ${className}`}
    >
      {children}
    </form>
  );
};

// ===== FORM GROUP =====
export const FormGroup = ({ 
  label, 
  error, 
  success,
  required = false, 
  children,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-600 flex items-center gap-2">
          <Check size={16} />
          {success}
        </p>
      )}
    </div>
  );
};

// ===== INPUT COMPONENT =====
export const Input = forwardRef(({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  success,
  disabled = false,
  required = false,
  icon: Icon,
  className = '',
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

  return (
    <FormGroup label={label} error={error} success={success} required={required} className={className}>
      <div className="relative group">
        {Icon && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
            <Icon 
              size={20} 
              className={`transition-colors duration-200 ${
                isFocused 
                  ? 'text-blue-600' 
                  : error 
                    ? 'text-red-500' 
                    : success 
                      ? 'text-green-600' 
                      : 'text-gray-400'
              }`} 
            />
          </div>
        )}
        
        <input
          ref={ref}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full px-4 py-3.5
            ${Icon ? 'pr-12' : 'pr-4'}
            bg-white border-2 rounded-xl
            text-gray-900 placeholder-gray-400
            transition-all duration-300 ease-in-out
            focus:outline-none focus:ring-0
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error 
              ? 'border-red-300 focus:border-red-500 bg-red-50' 
              : success 
                ? 'border-green-300 focus:border-green-500 bg-green-50'
                : isFocused
                  ? 'border-blue-500 shadow-lg shadow-blue-100'
                  : 'border-gray-200 hover:border-gray-300'
            }
            ${isFocused ? 'transform scale-[1.02]' : ''}
            group-hover:shadow-md
          `}
          {...props}
        />
        
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
    </FormGroup>
  );
});

// ===== SELECT COMPONENT =====
export const Select = forwardRef(({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'اختر...',
  error,
  success,
  disabled = false,
  required = false,
  icon: Icon,
  className = '',
  variant = 'default', // 'default', 'minimal', 'elegant', 'modern'
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const selectRef = useRef(null);

  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (optionValue) => {
    const syntheticEvent = {
      target: {
        value: optionValue,
        name: props.name || '',
        type: 'select'
      },
      currentTarget: {
        value: optionValue,
        name: props.name || '',
        type: 'select'
      }
    };
    onChange(syntheticEvent);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getVariantStyles = () => {
    switch (variant) {
      case 'minimal':
        return {
          button: `
            w-full px-4 py-3.5 pr-12
            bg-transparent border-b-2 border-gray-300
            text-right text-gray-900
            transition-all duration-300 ease-in-out
            focus:outline-none focus:ring-0
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${Icon ? 'pr-12' : 'pr-4'}
            ${error 
              ? 'border-red-400 focus:border-red-500' 
              : success 
                ? 'border-green-400 focus:border-green-500'
                : isFocused
                  ? 'border-blue-500'
                  : 'border-gray-300 hover:border-gray-400'
            }
            hover:border-gray-400
          `,
          dropdown: 'absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto'
        };
      
      case 'elegant':
        return {
          button: `
            w-full px-6 py-4 pr-12
            bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-2xl
            text-right text-gray-900
            transition-all duration-300 ease-in-out
            focus:outline-none focus:ring-4 focus:ring-blue-100
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${Icon ? 'pr-12' : 'pr-6'}
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
              : success 
                ? 'border-green-300 focus:border-green-500 focus:ring-green-100'
                : isFocused
                  ? 'border-blue-400 shadow-lg shadow-blue-100'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            }
            ${isFocused ? 'transform scale-[1.02]' : ''}
          `,
          dropdown: 'absolute top-full left-0 right-0 mt-3 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto backdrop-blur-sm'
        };
      
      case 'modern':
        return {
          button: `
            w-full px-4 py-3.5 pr-12
            bg-white border-2 border-gray-200 rounded-xl
            text-right text-gray-900
            transition-all duration-300 ease-in-out
            focus:outline-none focus:ring-0
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${Icon ? 'pr-12' : 'pr-4'}
            ${error 
              ? 'border-red-300 focus:border-red-500 bg-red-50' 
              : success 
                ? 'border-green-300 focus:border-green-500 bg-green-50'
                : isFocused
                  ? 'border-blue-500 shadow-lg shadow-blue-100'
                  : 'border-gray-200 hover:border-gray-300'
            }
            ${isFocused ? 'transform scale-[1.02]' : ''}
            hover:shadow-md
          `,
          dropdown: 'absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto'
        };
      
      default:
        return {
          button: `
            w-full px-4 py-3.5 pr-12
            bg-white border-2 border-gray-200 rounded-xl
            text-right text-gray-900
            transition-all duration-300 ease-in-out
            focus:outline-none focus:ring-0
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${Icon ? 'pr-12' : 'pr-4'}
            ${error 
              ? 'border-red-300 focus:border-red-500 bg-red-50' 
              : success 
                ? 'border-green-300 focus:border-green-500 bg-green-50'
                : isFocused
                  ? 'border-blue-500 shadow-lg shadow-blue-100'
                  : 'border-gray-200 hover:border-gray-300'
            }
            ${isFocused ? 'transform scale-[1.02]' : ''}
            hover:shadow-md
          `,
          dropdown: 'absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <FormGroup label={label} error={error} success={success} required={required} className={className}>
      <div className="relative" ref={selectRef}>
        <button
          ref={ref}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          className={styles.button}
          {...props}
        >
          <div className="flex items-center justify-between">
            <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown 
              size={20} 
              className={`transition-all duration-300 ${
                isOpen ? 'rotate-180' : ''
              } ${
                error ? 'text-red-500' : success ? 'text-green-600' : 'text-gray-400'
              }`} 
            />
          </div>
        </button>
        
        {Icon && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
            <Icon 
              size={20} 
              className={`transition-colors duration-200 ${
                isFocused 
                  ? 'text-blue-600' 
                  : error 
                    ? 'text-red-500' 
                    : success 
                      ? 'text-green-600' 
                      : 'text-gray-400'
              }`} 
            />
          </div>
        )}
        
        {isOpen && (
          <div className={styles.dropdown}>
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full px-4 py-3 text-right text-gray-900 transition-all duration-200
                  ${index === 0 ? 'rounded-t-lg' : ''}
                  ${index === options.length - 1 ? 'rounded-b-lg' : ''}
                  ${option.value === value 
                    ? 'bg-blue-100 text-blue-900 font-semibold' 
                    : 'hover:bg-gray-50 hover:text-gray-900'
                  }
                  ${variant === 'elegant' ? 'hover:bg-blue-50' : ''}
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </FormGroup>
  );
});

// ===== TEXTAREA COMPONENT =====
export const Textarea = forwardRef(({
  label,
  value,
  onChange,
  placeholder,
  error,
  success,
  disabled = false,
  required = false,
  rows = 4,
  className = '',
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <FormGroup label={label} error={error} success={success} required={required} className={className}>
      <div className="relative group">
        <textarea
          ref={ref}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full px-4 py-3.5
            bg-white border-2 rounded-xl
            text-gray-900 placeholder-gray-400
            transition-all duration-300 ease-in-out
            focus:outline-none focus:ring-0
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            resize-none
            ${error 
              ? 'border-red-300 focus:border-red-500 bg-red-50' 
              : success 
                ? 'border-green-300 focus:border-green-500 bg-green-50'
                : isFocused
                  ? 'border-blue-500 shadow-lg shadow-blue-100'
                  : 'border-gray-200 hover:border-gray-300'
            }
            ${isFocused ? 'transform scale-[1.01]' : ''}
            group-hover:shadow-md
          `}
          {...props}
        />
      </div>
    </FormGroup>
  );
});

// ===== SWITCH COMPONENT =====
export const Switch = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex items-center space-x-4 space-x-reverse ${className}`}>
      <div className="flex-1">
        <label className="text-sm font-semibold text-gray-800 cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>
      
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div
          className={`
            w-12 h-6 rounded-full transition-all duration-300 ease-in-out cursor-pointer
            ${checked ? 'bg-blue-600' : 'bg-gray-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={() => !disabled && onChange({ target: { checked: !checked } })}
        >
          <div
            className={`
              w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 ease-in-out
              ${checked ? 'transform -translate-x-6' : 'transform -translate-x-0.5'}
              ${checked ? 'mt-0.5' : 'mt-0.5'}
            `}
          />
        </div>
      </div>
    </div>
  );
};

// ===== CHECKBOX COMPONENT =====
export const Checkbox = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex items-center space-x-4 space-x-reverse ${className}`}>
      <div className="flex-1">
        <label className="text-sm font-semibold text-gray-800 cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>
      
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={`
            w-5 h-5 text-blue-600 bg-white border-2 border-gray-300 rounded-lg
            focus:ring-4 focus:ring-blue-100 focus:ring-offset-0
            transition-all duration-200
            disabled:bg-gray-50 disabled:border-gray-200 disabled:cursor-not-allowed
          `}
          {...props}
        />
        {checked && (
          <div className="absolute top-0.5 left-0.5">
            <Check size={16} className="text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
};

// ===== TIME INPUT COMPONENT =====
export const TimeInput = forwardRef(({
  label,
  value,
  onChange,
  error,
  success,
  disabled = false,
  required = false,
  className = '',
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <FormGroup label={label} error={error} success={success} required={required} className={className}>
      <div className="relative group">
        <input
          ref={ref}
          type="time"
          value={value}
          onChange={onChange}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full px-4 py-3.5
            bg-white border-2 rounded-xl
            text-gray-900
            transition-all duration-300 ease-in-out
            focus:outline-none focus:ring-0
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error 
              ? 'border-red-300 focus:border-red-500 bg-red-50' 
              : success 
                ? 'border-green-300 focus:border-green-500 bg-green-50'
                : isFocused
                  ? 'border-blue-500 shadow-lg shadow-blue-100'
                  : 'border-gray-200 hover:border-gray-300'
            }
            ${isFocused ? 'transform scale-[1.02]' : ''}
            group-hover:shadow-md
          `}
          {...props}
        />
      </div>
    </FormGroup>
  );
});

// ===== NUMBER INPUT COMPONENT =====
export const NumberInput = forwardRef(({
  label,
  value,
  onChange,
  placeholder,
  error,
  success,
  disabled = false,
  required = false,
  min,
  max,
  step,
  icon: Icon,
  className = '',
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <FormGroup label={label} error={error} success={success} required={required} className={className}>
      <div className="relative group">
        {Icon && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
            <Icon 
              size={20} 
              className={`transition-colors duration-200 ${
                isFocused 
                  ? 'text-blue-600' 
                  : error 
                    ? 'text-red-500' 
                    : success 
                      ? 'text-green-600' 
                      : 'text-gray-400'
              }`} 
            />
          </div>
        )}
        
        <input
          ref={ref}
          type="number"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full px-4 py-3.5
            ${Icon ? 'pr-12' : 'pr-4'}
            bg-white border-2 rounded-xl
            text-gray-900 placeholder-gray-400
            transition-all duration-300 ease-in-out
            focus:outline-none focus:ring-0
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error 
              ? 'border-red-300 focus:border-red-500 bg-red-50' 
              : success 
                ? 'border-green-300 focus:border-green-500 bg-green-50'
                : isFocused
                  ? 'border-blue-500 shadow-lg shadow-blue-100'
                  : 'border-gray-200 hover:border-gray-300'
            }
            ${isFocused ? 'transform scale-[1.02]' : ''}
            group-hover:shadow-md
          `}
          {...props}
        />
      </div>
    </FormGroup>
  );
});

// ===== BUTTON COMPONENT =====
export const Button = ({
  children,
  type = 'button',
  variant = 'primary', // 'primary', 'secondary', 'success', 'danger', 'warning', 'info', 'outline'
  size = 'md', // 'sm', 'md', 'lg'
  disabled = false,
  loading = false,
  icon: Icon,
  className = '',
  onClick,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-gray-500 hover:bg-gray-600 text-white';
      case 'success':
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'warning':
        return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      case 'info':
        return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'outline':
        return 'bg-transparent border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white';
      default:
        return 'bg-blue-500 hover:bg-blue-600 text-white';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-4 py-2 text-sm';
      case 'lg':
        return 'px-8 py-4 text-lg';
      default:
        return 'px-6 py-3 text-base';
    }
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        ${getVariantStyles()}
        ${getSizeStyles()}
        rounded-xl font-semibold
        transition-all duration-300 ease-in-out
        focus:outline-none focus:ring-4 focus:ring-blue-100
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center space-x-2 space-x-reverse
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      ) : Icon ? (
        <Icon size={20} />
      ) : null}
      {children}
    </button>
  );
};

// ===== COMMON ICONS =====
export const Icons = {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  DollarSign,
  Building2,
  Settings,
  Shield,
  Bell,
  Download,
  Upload,
  Search,
  Filter,
  Clock,
  Calendar,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  X
};

// Export all components
export default Form;

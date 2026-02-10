/**
 * @deprecated Use `ValidatedInput` or `AdvancedValidatedInput` instead.
 * This component is not used anywhere in the codebase and will be removed
 * in a future cleanup. Prefer the Input → ValidatedInput → FormField hierarchy.
 * 
 * EnhancedInput Component
 * 
 * Advanced input field with inline validation, format helpers,
 * character counters, and success/error feedback.
 * 
 * @component
 * @example
 * <EnhancedInput
 *   label="Phone Number"
 *   type="tel"
 *   format="(0##) ### ####"
 *   validation="onBlur"
 *   required
 * />
 */

import React, { useState, useEffect } from 'react';
import Icon from './Icon.jsx';

const EnhancedInput = ({
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
  icon: Icon,
  format, // For phone, date formatting
  validation, // 'onBlur', 'onChange', or custom function
  validator, // Custom validation function
  successMessage,
  errorMessage,
  helper,
  maxLength,
  showCounter = false,
  className = '',
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const [validationState, setValidationState] = useState(null); // null, 'valid', 'invalid'
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  // Format input based on pattern
  const formatValue = (val) => {
    if (!format) return val;

    // Phone number formatting: (0##) ### ####
    if (format === '(0##) ### ####') {
      const cleaned = val.replace(/\D/g, '');
      const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
      if (match) {
        let formatted = '';
        if (match[1]) formatted += `(${match[1]}`;
        if (match[2]) formatted += `) ${match[2]}`;
        if (match[3]) formatted += ` ${match[3]}`;
        return formatted;
      }
    }

    return val;
  };

  // Validate input
  const validate = (val) => {
    // Required validation
    if (required && !val.trim()) {
      setValidationState('invalid');
      setErrorMsg(errorMessage || `${label} is required`);
      return false;
    }

    // Email validation
    if (type === 'email' && val) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        setValidationState('invalid');
        setErrorMsg(errorMessage || 'Invalid email format');
        return false;
      }
    }

    // Phone validation (Kenya format)
    if (type === 'tel' && val) {
      const phoneRegex = /^0\d{9}$/;
      const cleaned = val.replace(/\D/g, '');
      if (!phoneRegex.test(cleaned)) {
        setValidationState('invalid');
        setErrorMsg(errorMessage || 'Invalid phone number (0XXXXXXXXX)');
        return false;
      }
    }

    // Custom validator
    if (validator) {
      const customResult = validator(val);
      if (customResult !== true) {
        setValidationState('invalid');
        setErrorMsg(customResult || errorMessage || 'Invalid input');
        return false;
      }
    }

    // All validations passed
    setValidationState('valid');
    setErrorMsg('');
    return true;
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    
    // Apply formatting
    const formatted = formatValue(newValue);
    setInternalValue(formatted);

    // Call parent onChange
    if (onChange) {
      onChange({
        ...e,
        target: { ...e.target, value: formatted }
      });
    }

    // Validate on change if specified
    if (validation === 'onChange' && isTouched) {
      validate(formatted);
    }
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    setIsTouched(true);

    // Validate on blur
    if (validation === 'onBlur' || validation === 'onChange') {
      validate(internalValue);
    }

    // Call parent onBlur
    if (onBlur) {
      onBlur(e);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <Icon className="w-5 h-5" />
          </div>
        )}

        <input
          type={showPassword ? 'text' : type}
          value={internalValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`
            w-full rounded-md shadow-sm text-sm transition-colors min-h-[44px]
            ${Icon ? 'pl-10' : 'pl-3'}
            ${(success || validationState === 'valid') 
              ? 'border-green-500 focus:border-green-500 focus:ring-green-500' 
              : (errorMsg || validationState === 'invalid') 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                : 'border-gray-300 dark:border-slate-600 focus:border-brand-500 focus:ring-brand-500'}
            bg-white dark:bg-slate-800 text-gray-900 dark:text-white
            disabled:bg-gray-100 dark:disabled:bg-slate-900 disabled:cursor-not-allowed
            ${type === 'password' || isSuccess ? 'pr-10' : ''}
          `}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          aria-invalid={!!errorMsg || validationState === 'invalid'}
          aria-describedby={helper ? `${label}-helper` : undefined}
          {...props}
        />

        {/* Validation Icons & Password Toggle */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-2">
          {type === 'password' && (
            <button
              type="button"
              onClick={togglePassword}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              tabIndex={-1}
            >
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
            </button>
          )}

          {(validationState === 'valid' || success) && type !== 'password' && (
            <Icon name="check" size={18} className="text-green-500" />
          )}

          {(validationState === 'invalid' || errorMsg) && type !== 'password' && (
            <Icon name="alert-circle" size={18} className="text-red-500" />
          )}
        </div>
      </div>

      {/* Helper Text / Error / Success / Counter */}
      <div className="mt-2 flex justify-between items-start gap-2">
        <div className="flex-1">
          {/* Error Message */}
          {validationState === 'invalid' && errorMsg && (
            <p className="text-sm text-red-400 flex items-center gap-1 animate-fade-in">
              <Icon name="alert-circle" className="w-4 h-4" />
              {errorMsg}
            </p>
          )}

          {/* Success Message */}
          {validationState === 'valid' && successMessage && (
            <p className="text-sm text-green-400 flex items-center gap-1 animate-fade-in">
              <Icon name="check" className="w-4 h-4" />
              {successMessage}
            </p>
          )}

          {/* Helper Text (when no validation state) */}
          {!validationState && helper && (
            <p className="helper-text">
              {helper}
            </p>
          )}
        </div>

        {/* Character Counter */}
        {showCounter && maxLength && (
          <p className={`text-xs ${
            internalValue.length >= maxLength * 0.9 
              ? 'text-amber-400' 
              : 'text-slate-400'
          }`}>
            {internalValue.length}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
};

export default EnhancedInput;

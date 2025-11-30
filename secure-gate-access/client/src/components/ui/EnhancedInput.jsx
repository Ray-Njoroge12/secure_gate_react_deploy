/**
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
import { Check, X, AlertCircle, Eye, EyeOff } from 'lucide-react';

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
      {/* Label */}
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {Icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
            <Icon className="w-5 h-5" />
          </div>
        )}

        {/* Input Field */}
        <input
          type={inputType}
          value={internalValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={`
            input
            ${Icon ? 'pl-10' : ''}
            ${(validationState || (type === 'password' && showPassword)) ? 'pr-10' : ''}
            ${validationState === 'valid' ? 'border-green-500 focus:border-green-500' : ''}
            ${validationState === 'invalid' ? 'border-red-500 focus:border-red-500' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          {...props}
        />

        {/* Right Icons (Validation or Password Toggle) */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {/* Password Toggle */}
          {type === 'password' && (
            <button
              type="button"
              onClick={togglePassword}
              className="text-slate-400 hover:text-slate-300 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Validation Icons */}
          {validationState === 'valid' && (
            <Check className="w-5 h-5 text-green-500 animate-fade-in" />
          )}
          {validationState === 'invalid' && (
            <X className="w-5 h-5 text-red-500 animate-fade-in" />
          )}
        </div>
      </div>

      {/* Helper Text / Error / Success / Counter */}
      <div className="mt-2 flex justify-between items-start gap-2">
        <div className="flex-1">
          {/* Error Message */}
          {validationState === 'invalid' && errorMsg && (
            <p className="text-sm text-red-400 flex items-center gap-1 animate-fade-in">
              <AlertCircle className="w-4 h-4" />
              {errorMsg}
            </p>
          )}

          {/* Success Message */}
          {validationState === 'valid' && successMessage && (
            <p className="text-sm text-green-400 flex items-center gap-1 animate-fade-in">
              <Check className="w-4 h-4" />
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

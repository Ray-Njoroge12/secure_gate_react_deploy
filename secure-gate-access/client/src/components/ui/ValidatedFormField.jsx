/**
 * Enhanced Validated Form Field Component
 * 
 * Provides comprehensive form field with:
 * - Real-time validation feedback
 * - Accessibility support
 * - Visual validation states
 * - Custom validation rules
 * - Better user experience
 */

import React, { useState, useEffect } from 'react';

const ValidatedFormField = ({
  id,
  type = 'text',
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
  error,
  success,
  validationRules = [],
  showValidationOnChange = false,
  helperText,
  className = '',
  inputClassName = '',
  ...props
}) => {
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const [validationState, setValidationState] = useState({
    isValid: true,
    errors: [],
    warnings: []
  });

  // Validate field based on rules
  const validateField = () => {
    if (!validationRules.length) return { isValid: true, errors: [], warnings: [] };

    const errors = [];
    const warnings = [];

    validationRules.forEach(rule => {
      const result = rule(value);
      if (result) {
        if (result.type === 'error') {
          errors.push(result.message);
        } else if (result.type === 'warning') {
          warnings.push(result.message);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  // Update validation state when value changes
  useEffect(() => {
    if (showValidationOnChange || touched) {
      setValidationState(validateField());
    }
  }, [value, touched, showValidationOnChange]);

  const handleFocus = (e) => {
    setFocused(true);
    setTouched(true);
  };

  const handleBlur = (e) => {
    setFocused(false);
    setTouched(true);
    setValidationState(validateField());
    if (onBlur) onBlur(e);
  };

  const hasError = error || (touched && !validationState.isValid);
  const hasSuccess = success || (touched && validationState.isValid && value && !hasError);
  
  // Determine input styling based on validation state
  const getInputClassName = () => {
    let baseClasses = 'w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors duration-200';
    
    if (hasError) {
      baseClasses += ' border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500';
    } else if (hasSuccess) {
      baseClasses += ' border-green-300 bg-green-50 focus:ring-green-500 focus:border-green-500';
    } else if (focused) {
      baseClasses += ' border-brand-300 focus:ring-brand-500 focus:border-brand-500';
    } else {
      baseClasses += ' border-gray-300 focus:ring-brand-500 focus:border-brand-500';
    }
    
    if (disabled) {
      baseClasses += ' bg-gray-50 text-gray-500 cursor-not-allowed';
    }
    
    return `${baseClasses} ${inputClassName}`;
  };

  const getIconElement = () => {
    if (hasError) {
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else if (hasSuccess) {
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label 
          htmlFor={id} 
          className={`block text-sm font-medium mb-2 ${
            hasError ? 'text-red-700' : hasSuccess ? 'text-green-700' : 'text-gray-700'
          }`}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={getInputClassName()}
          aria-invalid={hasError}
          aria-describedby={
            [
              helperText && `${id}-help`,
              hasError && `${id}-error`,
              hasSuccess && `${id}-success`
            ].filter(Boolean).join(' ')
          }
          {...props}
        />
        
        {(hasError || hasSuccess) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {getIconElement()}
          </div>
        )}
      </div>
      
      {/* Helper text */}
      {helperText && !hasError && !hasSuccess && (
        <p id={`${id}-help`} className="text-sm text-gray-500">
          {helperText}
        </p>
      )}
      
      {/* Success message */}
      {hasSuccess && success && (
        <p id={`${id}-success`} className="text-sm text-green-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {success}
        </p>
      )}
      
      {/* Error messages */}
      {hasError && (
        <div id={`${id}-error`} className="space-y-1">
          {error && (
            <p className="text-sm text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}
          {validationState.errors.map((error, index) => (
            <p key={index} className="text-sm text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          ))}
        </div>
      )}
      
      {/* Warning messages */}
      {validationState.warnings.map((warning, index) => (
        <p key={index} className="text-sm text-yellow-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.924-.833-2.694 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          {warning}
        </p>
      ))}
    </div>
  );
};

// Common validation rules
export const ValidationRules = {
  required: (message = 'This field is required') => (value) => {
    if (!value || value.toString().trim() === '') {
      return { type: 'error', message };
    }
    return null;
  },
  
  minLength: (min, message) => (value) => {
    if (value && value.length < min) {
      return { type: 'error', message: message || `Must be at least ${min} characters long` };
    }
    return null;
  },
  
  maxLength: (max, message) => (value) => {
    if (value && value.length > max) {
      return { type: 'error', message: message || `Must be no more than ${max} characters long` };
    }
    return null;
  },
  
  email: (message = 'Please enter a valid email address') => (value) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return { type: 'error', message };
    }
    return null;
  },
  
  passwordStrength: () => (value) => {
    if (!value) return null;
    
    const checks = {
      length: value.length >= 8,
      lowercase: /[a-z]/.test(value),
      uppercase: /[A-Z]/.test(value),
      number: /\d/.test(value),
      special: /[@$!%*?&]/.test(value)
    };
    
    const failedChecks = Object.values(checks).filter(check => !check).length;
    
    if (failedChecks > 2) {
      return { type: 'error', message: 'Password is too weak' };
    } else if (failedChecks > 0) {
      return { type: 'warning', message: 'Password could be stronger' };
    }
    
    return null;
  },
  
  phoneNumber: (message = 'Please enter a valid phone number') => (value) => {
    if (value && !/^(\+254|0)[17]\d{8}$/.test(value.replace(/\s/g, ''))) {
      return { type: 'error', message };
    }
    return null;
  }
};

export default ValidatedFormField;

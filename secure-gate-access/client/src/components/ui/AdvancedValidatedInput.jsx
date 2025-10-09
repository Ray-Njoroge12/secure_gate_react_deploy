/**
 * Advanced ValidatedInput Component
 * 
 * Enhanced input component with:
 * - Real-time validation with visual feedback
 * - Success indicators and warnings
 * - Async validation support
 * - Accessibility compliance
 * - Mobile-responsive design
 * - Custom validation rules
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Loader2,
  Info,
  X
} from 'lucide-react';
import { Input } from './index';
import { useAdvancedValidation } from '../../hooks/useAdvancedValidation';
import { componentTokens } from '../../design-system';

const AdvancedValidatedInput = ({
  // Core props
  name,
  value,
  onChange,
  onBlur,
  onFocus,
  
  // Validation props
  validationRules = [],
  validateOnBlur = true,
  validateOnChange = true,
  debounceMs = 300,
  showValidationOnChange = true,
  showSuccessIndicators = true,
  showWarningIndicators = true,
  
  // External validation state
  error: externalError,
  warning: externalWarning,
  success: externalSuccess,
  touched: externalTouched,
  isValidating: externalIsValidating,
  
  // UI props
  label,
  placeholder,
  helpText,
  required = false,
  disabled = false,
  readOnly = false,
  type = 'text',
  size = 'md',
  variant = 'default',
  
  // Advanced props
  showPasswordToggle = false,
  clearable = false,
  showCharacterCount = false,
  maxLength,
  minLength,
  
  // Event handlers
  onValidationChange,
  onClear,
  
  // Styling
  className = '',
  inputClassName = '',
  labelClassName = '',
  helpClassName = '',
  errorClassName = '',
  warningClassName = '',
  successClassName = '',
  
  // Accessibility
  ariaLabel,
  ariaDescribedBy,
  ariaInvalid,
  
  // Other props
  ...props
}) => {
  // Internal state
  const [internalTouched, setInternalTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value || '');
  
  // Update internal value when value prop changes
  useEffect(() => {
    setInternalValue(value || '');
  }, [value]);
  
  // Refs
  const inputRef = useRef(null);
  const validationRef = useRef(null);

  // Use external or internal state
  const isTouched = externalTouched !== undefined ? externalTouched : internalTouched;
  const isExternalValidation = externalError !== undefined || externalWarning !== undefined || externalSuccess !== undefined || externalIsValidating !== undefined;

  // Advanced validation hook
  const {
    registerField,
    validateField,
    getFieldState,
    VALIDATION_STATES
  } = useAdvancedValidation();

  // Register validation rules
  useEffect(() => {
    if (validationRules.length > 0) {
      registerField(name, validationRules, {
        debounceDelay: debounceMs,
        validateOnChange,
        validateOnBlur
      });
    }
  }, [name, validationRules, debounceMs, validateOnChange, validateOnBlur, registerField]);

  // Get validation state
  const validationState = useMemo(() => {
    if (isExternalValidation) {
      return {
        hasErrors: !!externalError,
        hasWarnings: !!externalWarning,
        hasSuccesses: !!externalSuccess,
        isValid: !externalError && !externalWarning && !externalIsValidating,
        isTouched,
        isValidating: !!externalIsValidating,
        state: externalError ? VALIDATION_STATES.INVALID : 
               externalWarning ? VALIDATION_STATES.WARNING :
               externalSuccess ? VALIDATION_STATES.SUCCESS :
               VALIDATION_STATES.IDLE,
        errors: externalError ? (Array.isArray(externalError) ? externalError : [externalError]) : [],
        warnings: externalWarning ? (Array.isArray(externalWarning) ? externalWarning : [externalWarning]) : [],
        successes: externalSuccess ? (Array.isArray(externalSuccess) ? externalSuccess : [externalSuccess]) : []
      };
    }
    
    return getFieldState(name);
  }, [
    isExternalValidation, 
    externalError, 
    externalWarning, 
    externalSuccess, 
    externalIsValidating, 
    isTouched, 
    getFieldState, 
    name, 
    VALIDATION_STATES
  ]);

  // Update internal value when external value changes
  useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  // Handle input change
  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);
  }, [onChange]);

  // Handle input blur
  const handleBlur = useCallback((e) => {
    setInternalTouched(true);
    setIsFocused(false);
    onBlur?.(e);
  }, [onBlur]);

  // Handle input focus
  const handleFocus = useCallback((e) => {
    setInternalTouched(true);
    setIsFocused(true);
    onFocus?.(e);
  }, [onFocus]);

  // Handle password toggle
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // Handle clear
  const handleClear = useCallback(() => {
    setInternalValue('');
    onChange?.('');
    onClear?.();
    inputRef.current?.focus();
  }, [onChange, onClear]);

  // Notify parent of validation changes
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange({
        fieldName: name,
        ...validationState
      });
    }
  }, [name, validationState, onValidationChange]);

  // Get size-specific styles
  const getSizeStyles = useCallback(() => {
    const sizes = {
      sm: {
        input: 'text-sm px-3 py-2 min-h-[40px]',
        icon: 'w-4 h-4',
        text: 'text-xs',
        spacing: 'space-y-1'
      },
      md: {
        input: 'text-base px-4 py-3 min-h-[44px]',
        icon: 'w-5 h-5',
        text: 'text-sm',
        spacing: 'space-y-2'
      },
      lg: {
        input: 'text-lg px-5 py-4 min-h-[48px]',
        icon: 'w-6 h-6',
        text: 'text-base',
        spacing: 'space-y-3'
      }
    };
    return sizes[size] || sizes.md;
  }, [size]);

  // Get variant-specific styles
  const getVariantStyles = useCallback(() => {
    const variants = {
      default: 'border-slate-600 focus:border-brand-500 focus:ring-brand-500',
      error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
      warning: 'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500',
      success: 'border-green-500 focus:border-green-500 focus:ring-green-500'
    };
    return variants[variant] || variants.default;
  }, [variant]);

  // Determine current variant based on validation state
  const currentVariant = useMemo(() => {
    if (validationState.hasErrors) return 'error';
    if (validationState.hasWarnings) return 'warning';
    if (validationState.hasSuccesses) return 'success';
    return 'default';
  }, [validationState]);

  // Generate unique IDs for accessibility
  const inputId = `input-${name}`;
  const errorId = `error-${name}`;
  const warningId = `warning-${name}`;
  const successId = `success-${name}`;
  const helpId = `help-${name}`;

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();

  // Calculate character count
  const characterCount = internalValue?.length || 0;
  const isOverLimit = maxLength && characterCount > maxLength;
  const isNearLimit = maxLength && characterCount >= maxLength * 0.8;

  return (
    <div className={`advanced-validated-input ${sizeStyles.spacing} ${className}`}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={inputId}
          className={`block font-medium text-slate-200 ${sizeStyles.text} ${labelClassName}`}
        >
          {label}
          {required && (
            <span className="text-red-400 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        <Input
          ref={inputRef}
          id={inputId}
          name={name}
          type={showPasswordToggle && type === 'password' ? (showPassword ? 'text' : 'password') : type}
          value={internalValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          maxLength={maxLength}
          minLength={minLength}
          aria-label={ariaLabel || label}
          aria-invalid={validationState.hasErrors}
          aria-describedby={[
            validationState.hasErrors ? errorId : null,
            validationState.hasWarnings ? warningId : null,
            validationState.hasSuccesses ? successId : null,
            helpText ? helpId : null
          ].filter(Boolean).join(' ') || undefined}
          aria-required={required}
          className={`
            ${sizeStyles.input}
            ${getVariantStyles()}
            ${validationState.isValidating ? 'pr-20' : 'pr-10'}
            ${clearable && internalValue ? 'pr-16' : ''}
            ${isFocused ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-slate-900' : ''}
            ${inputClassName}
          `}
          {...props}
        />

        {/* Right Side Icons */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {/* Validation Indicator */}
          {validationState.isValidating && (
            <div className="flex items-center">
              <Loader2 className={`${sizeStyles.icon} animate-spin text-slate-400`} />
            </div>
          )}

          {/* Success Indicator */}
          {!validationState.isValidating && validationState.hasSuccesses && showSuccessIndicators && (
            <div className="flex items-center">
              <CheckCircle className={`${sizeStyles.icon} text-green-500`} />
            </div>
          )}

          {/* Warning Indicator */}
          {!validationState.isValidating && validationState.hasWarnings && showWarningIndicators && (
            <div className="flex items-center">
              <AlertTriangle className={`${sizeStyles.icon} text-yellow-500`} />
            </div>
          )}

          {/* Error Indicator */}
          {!validationState.isValidating && validationState.hasErrors && (
            <div className="flex items-center">
              <AlertCircle className={`${sizeStyles.icon} text-red-500`} />
            </div>
          )}

          {/* Password Toggle */}
          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="p-1 text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className={`${sizeStyles.icon}`} />
              ) : (
                <Eye className={`${sizeStyles.icon}`} />
              )}
            </button>
          )}

          {/* Clear Button */}
          {clearable && internalValue && !disabled && !readOnly && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
              aria-label="Clear input"
            >
              <X className={`${sizeStyles.icon}`} />
            </button>
          )}
        </div>
      </div>

      {/* Character Count */}
      {showCharacterCount && maxLength && (
        <div className={`text-right ${sizeStyles.text} ${
          isOverLimit ? 'text-red-400' : 
          isNearLimit ? 'text-yellow-400' : 
          'text-slate-400'
        }`}>
          {characterCount}/{maxLength}
        </div>
      )}

      {/* Error Messages */}
      {validationState.hasErrors && isTouched && (
        <div 
          id={errorId}
          className={`${sizeStyles.text} text-red-400 ${errorClassName}`}
          role="alert"
          aria-live="polite"
        >
          {validationState.errors.map((error, index) => (
            <div key={index} className="flex items-center space-x-1">
              <AlertCircle className={`${sizeStyles.icon} flex-shrink-0`} />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Warning Messages */}
      {validationState.hasWarnings && isTouched && showWarningIndicators && (
        <div 
          id={warningId}
          className={`${sizeStyles.text} text-yellow-400 ${warningClassName}`}
          role="alert"
          aria-live="polite"
        >
          {validationState.warnings.map((warning, index) => (
            <div key={index} className="flex items-center space-x-1">
              <AlertTriangle className={`${sizeStyles.icon} flex-shrink-0`} />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Success Messages */}
      {validationState.hasSuccesses && isTouched && showSuccessIndicators && (
        <div 
          id={successId}
          className={`${sizeStyles.text} text-green-400 ${successClassName}`}
          role="status"
          aria-live="polite"
        >
          {validationState.successes.map((success, index) => (
            <div key={index} className="flex items-center space-x-1">
              <CheckCircle className={`${sizeStyles.icon} flex-shrink-0`} />
              <span>{success}</span>
            </div>
          ))}
        </div>
      )}

      {/* Help Text */}
      {helpText && !validationState.hasErrors && !validationState.hasWarnings && (
        <div 
          id={helpId}
          className={`${sizeStyles.text} text-slate-400 ${helpClassName}`}
        >
          <div className="flex items-center space-x-1">
            <Info className={`${sizeStyles.icon} flex-shrink-0`} />
            <span>{helpText}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedValidatedInput;





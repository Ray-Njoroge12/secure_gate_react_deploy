import React, { useState, useEffect, useCallback, useRef } from 'react';

import Input from './Input';

// Debounce utility
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * ValidatedInput component with real-time validation and debouncing
 * @component
 * @param {Object} props - Component props
 * @param {string} props.name - Input name for form handling
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {Array} props.validationRules - Array of validation functions
 * @param {boolean} props.validateOnBlur - Whether to validate on blur
 * @param {boolean} props.validateOnChange - Whether to validate on change
 * @param {number} props.debounceMs - Debounce delay in milliseconds
 * @param {string} props.error - External error message
 * @param {boolean} props.touched - Whether input has been touched
 * @param {Function} props.onValidationChange - Callback when validation state changes
 * @param {string} props.label - Input label
 * @param {boolean} props.required - Whether input is required
 * @param {string} props.helpText - Help text to display
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Rendered validated input component
 * @example
 * <ValidatedInput
 *   name="email"
 *   value={email}
 *   onChange={setEmail}
 *   validationRules={[emailRequired, emailFormat]}
 *   label="Email Address"
 *   required
 * />
 */
const ValidatedInput = ({
  name,
  value,
  onChange,
  validationRules = [],
  validateOnBlur = true,
  validateOnChange = true,
  debounceMs = 300,
  error: externalError,
  touched: externalTouched,
  onValidationChange,
  label,
  required = false,
  helpText,
  className = '',
  ...props
}) => {
  const [internalError, setInternalError] = useState('');
  const [internalTouched, setInternalTouched] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const inputRef = useRef(null);

  // Use external or internal state
  const error = externalError !== undefined ? externalError : internalError;
  const touched = externalTouched !== undefined ? externalTouched : internalTouched;
  const hasError = touched && error;

  // Debounced validation function
  const debouncedValidate = useCallback(
    debounce((val) => {
      setIsValidating(true);
      
      // Clear previous error
      setInternalError('');
      
      // Run validation rules
      for (const rule of validationRules) {
        const errorMsg = rule(val);
        if (errorMsg) {
          setInternalError(errorMsg);
          setIsValidating(false);
          return;
        }
      }
      
      setIsValidating(false);
    }, debounceMs),
    [validationRules, debounceMs]
  );

  // Validate on change
  useEffect(() => {
    if (validateOnChange && validationRules.length > 0) {
      debouncedValidate(value);
    }
  }, [value, validateOnChange, debouncedValidate]);

  // Notify parent of validation state changes
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange({
        hasError: !!error,
        error,
        isValidating,
        touched
      });
    }
  }, [error, isValidating, touched, onValidationChange]);

  // Handle input change
  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  // Handle blur
  const handleBlur = (e) => {
    setInternalTouched(true);
    
    if (validateOnBlur && validationRules.length > 0) {
      // Immediate validation on blur
      setIsValidating(true);
      setInternalError('');
      
      for (const rule of validationRules) {
        const errorMsg = rule(value);
        if (errorMsg) {
          setInternalError(errorMsg);
          setIsValidating(false);
          return;
        }
      }
      
      setIsValidating(false);
    }
    
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  // Handle focus
  const handleFocus = (e) => {
    if (props.onFocus) {
      props.onFocus(e);
    }
  };

  // Generate unique IDs for accessibility
  const inputId = `input-${name}`;
  const errorId = `error-${name}`;
  const helpId = `help-${name}`;

  return (
    <div className={`validated-input ${className}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm sm:text-base font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          {label}
          {required && (
            <span className="text-red-400 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          id={inputId}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          aria-invalid={hasError}
          aria-describedby={[
            hasError ? errorId : null,
            helpText ? helpId : null
          ].filter(Boolean).join(' ') || undefined}
          aria-required={required}
          className={`
            ${hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            ${isValidating ? 'pr-8' : ''}
            min-h-[44px] sm:min-h-[48px]
          `}
          {...props}
        />
        
        {/* Validation indicator */}
        {isValidating && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 dark:border-slate-600 border-t-blue-600"></div>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {hasError && (
        <div 
          id={errorId}
          className="mt-1 text-sm text-red-400"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
      
      {/* Help text */}
      {helpText && !hasError && (
        <div 
          id={helpId}
          className="mt-1 text-sm text-gray-500 dark:text-slate-400"
        >
          {helpText}
        </div>
      )}
    </div>
  );
};

/**
 * ValidatedForm component for managing multiple validated inputs
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onSubmit - Form submit handler
 * @param {Function} props.onValidationChange - Validation state change handler
 * @param {React.ReactNode} props.children - Form children
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Rendered validated form component
 */
export const ValidatedForm = ({
  onSubmit,
  onValidationChange,
  children,
  className = '',
  ...props
}) => {
  const [validationState, setValidationState] = useState({});
  const [isFormValid, setIsFormValid] = useState(true);

  // Handle validation changes from child inputs
  const handleValidationChange = (name, state) => {
    setValidationState(prev => ({
      ...prev,
      [name]: state
    }));
  };

  // Check if form is valid
  useEffect(() => {
    const hasErrors = Object.values(validationState).some(state => state.hasError);
    const isAnyValidating = Object.values(validationState).some(state => state.isValidating);
    
    setIsFormValid(!hasErrors && !isAnyValidating);
    
    if (onValidationChange) {
      onValidationChange({
        isValid: !hasErrors && !isAnyValidating,
        hasErrors,
        isAnyValidating,
        validationState
      });
    }
  }, [validationState, onValidationChange]);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isFormValid && onSubmit) {
      onSubmit(e, validationState);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className={`validated-form ${className}`}
      noValidate
      {...props}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === ValidatedInput) {
          return React.cloneElement(child, {
            onValidationChange: (state) => handleValidationChange(child.props.name, state)
          });
        }
        return child;
      })}
    </form>
  );
};

export default ValidatedInput;
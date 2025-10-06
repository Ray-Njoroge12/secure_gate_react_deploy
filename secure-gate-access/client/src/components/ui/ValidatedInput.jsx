// Enhanced Input component with real-time validation
import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { VALIDATION_ICONS, VALIDATION_STATES, debounce } from '../../utils/validationRules';

const ValidatedInput = memo(({ 
  label,
  error,
  helperText,
  icon,
  required = false,
  className = '',
  validator = null,
  validateOnChange = true,
  validateOnBlur = true,
  debounceDelay = 300,
  showValidationIcon = true,
  showExample = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  'aria-invalid': ariaInvalid,
  onValidationChange,
  ...props 
}) => {
  const inputRef = useRef(null);
  const [validationState, setValidationState] = useState(VALIDATION_STATES.IDLE);
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);

  // Debounced validation function
  const debouncedValidate = useCallback(
    debounce(async (value) => {
      if (!validator) return;

      setIsValidating(true);
      setValidationState(VALIDATION_STATES.VALIDATING);

      try {
        const result = await validator(value, label || 'Field');
        
        setValidationErrors(result.errors || []);
        setValidationWarnings(result.warnings || []);
        setValidationState(result.state || VALIDATION_STATES.IDLE);

        // Notify parent component of validation change
        if (onValidationChange) {
          onValidationChange({
            isValid: result.isValid,
            errors: result.errors || [],
            warnings: result.warnings || [],
            state: result.state || VALIDATION_STATES.IDLE
          });
        }
      } catch (err) {
        console.error('Validation error:', err);
        setValidationState(VALIDATION_STATES.INVALID);
        setValidationErrors(['Validation failed. Please try again.']);
      } finally {
        setIsValidating(false);
      }
    }, debounceDelay),
    [validator, label, debounceDelay, onValidationChange]
  );

  // Handle input change
  const handleChange = useCallback((e) => {
    const value = e.target.value;
    
    // Call original onChange if provided
    if (props.onChange) {
      props.onChange(e);
    }

    // Validate on change if enabled
    if (validateOnChange && validator && hasBeenTouched) {
      debouncedValidate(value);
    }
  }, [props.onChange, validateOnChange, validator, hasBeenTouched, debouncedValidate]);

  // Handle input blur
  const handleBlur = useCallback((e) => {
    setHasBeenTouched(true);
    
    // Call original onBlur if provided
    if (props.onBlur) {
      props.onBlur(e);
    }

    // Validate on blur if enabled
    if (validateOnBlur && validator) {
      debouncedValidate(e.target.value);
    }
  }, [props.onBlur, validateOnBlur, validator, debouncedValidate]);

  // Handle focus
  const handleFocus = useCallback((e) => {
    // Call original onFocus if provided
    if (props.onFocus) {
      props.onFocus(e);
    }
  }, [props.onFocus]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + A to select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (inputRef.current) {
          inputRef.current.select();
        }
      }
      // Escape to clear
      if (e.key === 'Escape' && inputRef.current) {
        inputRef.current.value = '';
        inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    const input = inputRef.current;
    if (input) {
      input.addEventListener('keydown', handleKeyDown);
      return () => input.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  // Determine if field has errors (from props or validation)
  const hasErrors = error || validationErrors.length > 0;
  const hasWarnings = validationWarnings.length > 0;
  const isFieldValid = !hasErrors && !isValidating && validationState === VALIDATION_STATES.VALID;

  // Get validation icon
  const getValidationIcon = () => {
    if (!showValidationIcon) return null;
    
    if (isValidating) return VALIDATION_ICONS.loading;
    if (hasErrors) return VALIDATION_ICONS.invalid;
    if (hasWarnings) return VALIDATION_ICONS.warning;
    if (isFieldValid) return VALIDATION_ICONS.valid;
    return null;
  };

  // Get validation message
  const getValidationMessage = () => {
    if (error) return error;
    if (validationErrors.length > 0) return validationErrors[0];
    if (validationWarnings.length > 0) return validationWarnings[0];
    return null;
  };

  // Get example text
  const getExampleText = () => {
    if (!showExample || hasErrors || validationErrors.length > 0) return null;
    if (helperText) return helperText;
    return null;
  };

  const inputClasses = `
    w-full min-h-[44px] px-3 sm:px-4 py-2 sm:py-3 bg-slate-800 border rounded-lg 
    text-sm sm:text-base text-slate-200 placeholder-slate-400 
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:border-transparent
    disabled:opacity-50 disabled:cursor-not-allowed
    ${hasErrors 
      ? 'border-red-500 focus:ring-red-500' 
      : hasWarnings
      ? 'border-yellow-500 focus:ring-yellow-500'
      : isFieldValid
      ? 'border-green-500 focus:ring-green-500'
      : 'border-slate-600 hover:border-slate-500 focus:ring-brand-500'
    }
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const id = props.id || props.name || label?.toLowerCase().replace(/\s+/g, '-');
  const validationIcon = getValidationIcon();
  const validationMessage = getValidationMessage();
  const exampleText = getExampleText();

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-sm sm:text-base font-medium text-slate-300">
          {label}
          {required && <span className="text-red-400 ml-1" aria-label="required">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-slate-400">{icon}</span>
          </div>
        )}
        
        <input
          ref={inputRef}
          id={id}
          className={`${inputClasses} ${icon ? 'pl-10' : ''} ${validationIcon ? 'pr-10' : ''}`}
          aria-label={ariaLabel || (label ? undefined : props.placeholder)}
          aria-describedby={ariaDescribedby || (validationMessage ? `${id}-error` : exampleText ? `${id}-helper` : undefined)}
          aria-invalid={ariaInvalid || (hasErrors ? 'true' : 'false')}
          aria-required={required}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          {...props}
        />

        {/* Validation Icon */}
        {validationIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {validationIcon}
          </div>
        )}
      </div>
      
      {/* Error Message */}
      {validationMessage && (
        <p id={`${id}-error`} className="text-sm text-red-400 flex items-center" role="alert">
          <span className="mr-1">⚠</span>
          {validationMessage}
        </p>
      )}
      
      {/* Warning Message */}
      {hasWarnings && !hasErrors && (
        <p className="text-sm text-yellow-400 flex items-center">
          <span className="mr-1">⚠</span>
          {validationWarnings[0]}
        </p>
      )}
      
      {/* Helper Text / Example */}
      {exampleText && (
        <p id={`${id}-helper`} className="text-sm text-slate-400">
          {exampleText}
        </p>
      )}

      {/* Additional validation errors */}
      {validationErrors.length > 1 && (
        <ul className="text-sm text-red-400 space-y-1">
          {validationErrors.slice(1).map((error, index) => (
            <li key={index} className="flex items-center">
              <span className="mr-1">•</span>
              {error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

ValidatedInput.displayName = 'ValidatedInput';

export default ValidatedInput;

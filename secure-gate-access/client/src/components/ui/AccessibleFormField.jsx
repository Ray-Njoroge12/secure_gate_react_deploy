// client/src/components/ui/AccessibleFormField.jsx
import React, { forwardRef, useState, useId } from 'react';
import { useAccessibility } from '../../hooks/useAccessibility';

const AccessibleFormField = forwardRef(({
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  id,
  name,
  className = '',
  inputClassName = '',
  labelClassName = '',
  errorClassName = '',
  helperClassName = '',
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  ...props
}, ref) => {
  const { getAccessibleClasses, getAccessibleStyles, announce } = useAccessibility();
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!value);
  
  // Generate unique IDs
  const fieldId = id || useId();
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;
  const describedBy = [ariaDescribedBy, error ? errorId : null, helperText ? helperId : null]
    .filter(Boolean)
    .join(' ');

  // Handle value changes
  const handleChange = (e) => {
    const newValue = e.target.value;
    setHasValue(!!newValue);
    onChange?.(e);
  };

  // Handle focus
  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
    
    if (label) {
      announce(`Focused on ${label} field`);
    }
  };

  // Handle blur
  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  // Base input classes
  const baseInputClasses = [
    'block',
    'w-full',
    'px-3',
    'py-2',
    'border',
    'rounded-md',
    'shadow-sm',
    'placeholder-gray-400',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-0',
    'transition-colors',
    'duration-200',
    'disabled:bg-gray-50',
    'disabled:text-gray-500',
    'disabled:cursor-not-allowed'
  ];

  // Input state classes
  const inputStateClasses = error
    ? [
        'border-red-300',
        'focus:border-red-500',
        'focus:ring-red-500'
      ]
    : [
        'border-gray-300',
        'focus:border-blue-500',
        'focus:ring-blue-500'
      ];

  // Label classes
  const labelClasses = [
    'block',
    'text-sm',
    'font-medium',
    'text-gray-700',
    'mb-1',
    required && 'after:content-["*"] after:ml-1 after:text-red-500',
    labelClassName
  ].filter(Boolean);

  // Error classes
  const errorClasses = [
    'mt-1',
    'text-sm',
    'text-red-600',
    errorClassName
  ];

  // Helper text classes
  const helperClasses = [
    'mt-1',
    'text-sm',
    'text-gray-500',
    helperClassName
  ];

  // Get accessible classes
  const accessibleInputClasses = getAccessibleClasses([
    ...baseInputClasses,
    ...inputStateClasses,
    inputClassName
  ].join(' '));

  const accessibleStyles = getAccessibleStyles();

  // Render different input types
  const renderInput = () => {
    const commonProps = {
      ref,
      id: fieldId,
      name: name || fieldId,
      type,
      value,
      onChange: handleChange,
      onFocus: handleFocus,
      onBlur: handleBlur,
      placeholder,
      disabled,
      required,
      className: accessibleInputClasses,
      style: accessibleStyles,
      'aria-describedby': describedBy || undefined,
      'aria-invalid': error ? 'true' : 'false',
      'aria-required': required,
      ...props
    };

    switch (type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={props.rows || 3}
            className={[accessibleInputClasses, 'resize-vertical'].join(' ')}
          />
        );
      
      case 'select':
        return (
          <select {...commonProps}>
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {props.children}
          </select>
        );
      
      default:
        return <input {...commonProps} />;
    }
  };

  return (
    <div className={['form-field', className].filter(Boolean).join(' ')}>
      {/* Label */}
      {label && (
        <label
          htmlFor={fieldId}
          className={labelClasses.join(' ')}
        >
          {label}
        </label>
      )}

      {/* Input */}
      <div className="relative">
        {renderInput()}
        
        {/* Focus indicator */}
        {isFocused && (
          <div className="absolute inset-0 rounded-md ring-2 ring-blue-500 ring-offset-2 pointer-events-none" />
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          id={errorId}
          className={errorClasses.join(' ')}
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      {/* Helper text */}
      {helperText && !error && (
        <div
          id={helperId}
          className={helperClasses.join(' ')}
        >
          {helperText}
        </div>
      )}

      {/* Required indicator for screen readers */}
      {required && (
        <span className="sr-only">Required field</span>
      )}
    </div>
  );
});

AccessibleFormField.displayName = 'AccessibleFormField';

export default AccessibleFormField;





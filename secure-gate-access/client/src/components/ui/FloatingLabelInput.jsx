/**
 * @fileoverview Floating Label Input Component
 * @description Enhanced input field with animated floating label, icons, and inline validation
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import './FloatingLabelInput.css';

/**
 * FloatingLabelInput Component
 * 
 * @param {Object} props - Component props
 * @param {string} props.id - Input ID
 * @param {string} props.name - Input name
 * @param {string} props.type - Input type (text, email, password, etc.)
 * @param {string} props.label - Label text
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {Function} props.onBlur - Blur handler
 * @param {Function} props.onFocus - Focus handler
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.required - Required field
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.error - Error message
 * @param {boolean} props.success - Success state
 * @param {string} props.helperText - Helper text
 * @param {React.ReactNode} props.leftIcon - Left icon component
 * @param {React.ReactNode} props.rightIcon - Right icon component
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.inputProps - Additional input props
 */
const FloatingLabelInput = ({
  id,
  name,
  type = 'text',
  label,
  value = '',
  onChange,
  onBlur,
  onFocus,
  placeholder = '',
  required = false,
  disabled = false,
  error = '',
  success = false,
  helperText = '',
  leftIcon = null,
  rightIcon = null,
  className = '',
  inputProps = {},
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const inputRef = useRef(null);

  // Check if input has value
  useEffect(() => {
    setHasValue(value && value.toString().length > 0);
  }, [value]);

  // Determine if label should float
  const shouldFloat = isFocused || hasValue || placeholder;

  // Handle focus
  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  // Handle blur
  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  // Handle label click
  const handleLabelClick = () => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  };

  // Determine input state classes
  const getStateClasses = () => {
    if (error) return 'floating-input--error';
    if (success) return 'floating-input--success';
    if (isFocused) return 'floating-input--focused';
    return '';
  };

  return (
    <div className={`floating-input-wrapper ${className}`}>
      <div className={`floating-input-container ${getStateClasses()}`}>
        {/* Left Icon */}
        {leftIcon && (
          <div className="floating-input__icon floating-input__icon--left">
            {leftIcon}
          </div>
        )}

        {/* Input Field */}
        <div className="floating-input__field">
          <input
            ref={inputRef}
            id={id}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={isFocused ? placeholder : ''}
            required={required}
            disabled={disabled}
            className={`floating-input__input ${leftIcon ? 'floating-input__input--with-left-icon' : ''} ${rightIcon || success || error ? 'floating-input__input--with-right-icon' : ''}`}
            aria-label={label}
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${id}-error` : helperText ? `${id}-helper` : undefined
            }
            {...inputProps}
            {...rest}
          />

          {/* Floating Label */}
          <label
            htmlFor={id}
            className={`floating-input__label ${shouldFloat ? 'floating-input__label--float' : ''}`}
            onClick={handleLabelClick}
          >
            {label}
            {required && <span className="floating-input__required">*</span>}
          </label>
        </div>

        {/* Right Icon / Status Indicator */}
        <div className="floating-input__icon floating-input__icon--right">
          {error && (
            <AlertCircle className="floating-input__status-icon floating-input__status-icon--error" />
          )}
          {success && !error && (
            <Check className="floating-input__status-icon floating-input__status-icon--success" />
          )}
          {!error && !success && rightIcon && rightIcon}
        </div>
      </div>

      {/* Helper Text / Error Message */}
      {(helperText || error) && (
        <div className="floating-input__message">
          {error ? (
            <span
              id={`${id}-error`}
              className="floating-input__error"
              role="alert"
            >
              {error}
            </span>
          ) : (
            <span id={`${id}-helper`} className="floating-input__helper">
              {helperText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default FloatingLabelInput;

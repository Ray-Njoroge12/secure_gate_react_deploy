/**
 * @fileoverview Floating Label Input Component
 * @description Enhanced input field with animated floating label, icons, and inline validation
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect } from 'react';

import Button from './Button.jsx';
import Icon from './Icon.jsx';
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
 * @param {React.ReactNode|string} props.icon - Alias for leftIcon (legacy support)
 * @param {React.ReactNode|string} props.endIcon - Alias for rightIcon (legacy support)
 * @param {boolean} props.disablePasswordToggle - Disable built-in password toggle
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
  icon = null,
  endIcon = null,
  disablePasswordToggle = false,
  className = '',
  inputProps = {},
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef(null);

  // Check if input has value
  useEffect(() => {
    setHasValue(Boolean(value && value.toString().length > 0));
  }, [value]);

  // Determine if label should float
  const shouldFloat = isFocused || hasValue;

  // Handle focus
  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  // Handle blur
  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleLabelClick = () => {
    if (!inputRef.current || disabled) return;
    inputRef.current.focus();
  };

  const normalizeIcon = (iconNode, size = 18) => {
    if (!iconNode) return null;
    if (typeof iconNode === 'string') {
      return <Icon name={iconNode} size={size} aria-hidden="true" />;
    }
    return iconNode;
  };

  const resolvedLeftIcon = normalizeIcon(leftIcon || icon);
  const resolvedRightIcon = normalizeIcon(rightIcon || endIcon);
  const hasPasswordToggle = type === 'password' && !disablePasswordToggle;

  // Determine input state classes
  const stateClasses = error
    ? 'floating-input--error'
    : success
      ? 'floating-input--success'
      : isFocused
        ? 'floating-input--focused'
        : '';

  const inputType = hasPasswordToggle && showPassword ? 'text' : type;
  const isInvalid = Boolean(error);
  const isReadOnly = typeof onChange !== 'function';

  return (
    <div className={`floating-input-wrapper ${className}`.trim()}>
      <div className={`floating-input-container ${stateClasses}`.trim()}>
        {/* Left Icon */}
        {resolvedLeftIcon && (
          <div className="floating-input__icon floating-input__icon--left" aria-hidden="true">
            {resolvedLeftIcon}
          </div>
        )}

        <div className="floating-input__field">
          <input
            ref={inputRef}
            id={id}
            name={name}
            type={inputType}
            value={value}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={isFocused ? placeholder : ''}
            required={required}
            disabled={disabled}
            readOnly={isReadOnly}
            data-testid={id ? `input-${id}` : undefined}
            className={`floating-input__input ${resolvedLeftIcon ? 'floating-input__input--with-left-icon' : ''} ${resolvedRightIcon || success || error || hasPasswordToggle ? 'floating-input__input--with-right-icon' : ''}`}
            aria-label={label}
            aria-required={required || undefined}
            aria-invalid={isInvalid || undefined}
            aria-describedby={
              [
                error ? `${id}-error` : null,
                helperText && !error ? `${id}-helper` : null
              ].filter(Boolean).join(' ') || undefined
            }
            {...inputProps}
            {...rest}
          />

          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
          <label
            htmlFor={id}
            className={`floating-input__label ${shouldFloat ? 'floating-input__label--float' : ''}`}
            onClick={handleLabelClick}
          >
            {label}
            {required && <span className="floating-input__required" aria-hidden="true">*</span>}
          </label>
        </div>

        {/* Right Icon / Status Indicator */}
        <div className="floating-input__icon floating-input__icon--right">
          {error && (
            <Icon name="alert-circle" className="floating-input__status-icon floating-input__status-icon--error" />
          )}
          {success && !error && (
            <Icon name="check" className="floating-input__status-icon floating-input__status-icon--success" />
          )}
          {!error && !success && resolvedRightIcon}

          {!error && !success && !resolvedRightIcon && hasPasswordToggle && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={disabled}
              className="h-8 w-8 min-h-0 rounded-md px-0 py-0 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 focus-visible:ring-brand-500"
            >
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} aria-hidden="true" />
            </Button>
          )}
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

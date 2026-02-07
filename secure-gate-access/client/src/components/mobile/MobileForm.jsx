/**
 * MobileForm Component
 * 
 * Mobile-optimized form component with enhanced input controls,
 * touch-friendly interactions, and improved accessibility
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useEnhancedResponsive } from '../../hooks/useEnhancedResponsive.js';
import TouchOptimizedButton from './TouchOptimizedButton.jsx';

const MobileFormInput = ({
  type = 'text',
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  error,
  required = false,
  disabled = false,
  autoComplete,
  inputMode,
  pattern,
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef(null);
  const responsive = useEnhancedResponsive();

  const handleFocus = useCallback((e) => {
    setIsFocused(true);
    onFocus?.(e);
    
    // Scroll input into view on mobile to avoid keyboard overlap
    if (responsive.isMobile) {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 300); // Delay to allow keyboard animation
    }
  }, [onFocus, responsive.isMobile]);

  const handleBlur = useCallback((e) => {
    setIsFocused(false);
    onBlur?.(e);
  }, [onBlur]);

  const inputType = type === 'password' && showPassword ? 'text' : type;
  
  // Enhanced input mode for mobile keyboards
  const getInputMode = () => {
    if (inputMode) return inputMode;
    
    switch (type) {
      case 'email': return 'email';
      case 'tel': return 'tel';
      case 'number': return 'numeric';
      case 'url': return 'url';
      case 'search': return 'search';
      default: return 'text';
    }
  };

  const inputClasses = [
    'w-full',
    'px-4',
    'py-3',
    'text-base', // Larger text on mobile
    'border',
    'rounded-lg',
    'transition-all',
    'duration-200',
    'bg-white dark:bg-slate-800',
    'dark:bg-slate-800',
    // Touch-optimized sizing - ensure minimum 44px height
    'min-h-[48px]', // Increased from conditional to always 48px minimum
    // Focus states
    isFocused ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-gray-300 dark:border-slate-600',
    // Error states
    error ? 'border-red-500 ring-2 ring-red-200 dark:ring-red-800' : '',
    // Disabled states
    disabled ? 'bg-gray-100 dark:bg-slate-700 cursor-not-allowed opacity-60' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <label
          htmlFor={props.id}
          className={[
            'block',
            'text-sm',
            'font-medium',
            'text-gray-700 dark:text-gray-300',
            'dark:text-gray-300',
            required ? "after:content-['*'] after:text-red-500 after:ml-1" : ''
          ].join(' ')}
        >
          {label}
        </label>
      )}
      
      {/* Input container */}
      <div className="relative">
        <input
          ref={inputRef}
          type={inputType}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          inputMode={getInputMode()}
          pattern={pattern}
          className={inputClasses}
          // Mobile-specific attributes
          autoCapitalize={type === 'email' ? 'none' : 'sentences'}
          autoCorrect={type === 'email' || type === 'password' ? 'off' : 'on'}
          spellCheck={type === 'email' || type === 'password' ? 'false' : 'true'}
          {...props}
        />
        
        {/* Password visibility toggle */}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
          <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

const MobileFormSelect = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  error,
  required = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);
  const responsive = useEnhancedResponsive();

  const handleOptionSelect = useCallback((optionValue) => {
    onChange?.(optionValue);
    setIsOpen(false);
  }, [onChange]);

  const selectedOption = options.find(opt => opt.value === value);

  const selectClasses = [
    'w-full',
    'px-4',
    'py-3',
    'text-base',
    'border',
    'rounded-lg',
    'transition-all',
    'duration-200',
    'bg-white dark:bg-slate-800',
    'dark:bg-slate-800',
    'cursor-pointer',
    'min-h-[48px]', // Ensure minimum 48px height for all select elements
    error ? 'border-red-500' : 'border-gray-300 dark:border-slate-600',
    disabled ? 'bg-gray-100 dark:bg-slate-700 cursor-not-allowed opacity-60' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <label
          className={[
            'block',
            'text-sm',
            'font-medium',
            'text-gray-700 dark:text-gray-300',
            'dark:text-gray-300',
            required ? "after:content-['*'] after:text-red-500 after:ml-1" : ''
          ].join(' ')}
        >
          {label}
        </label>
      )}
      
      {/* Select container */}
      <div className="relative">
        <button
          ref={selectRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={selectClasses}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          {...props}
        >
          <div className="flex items-center justify-between">
            <span className={selectedOption ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-300'}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <svg
              className={`w-5 h-5 text-gray-400 dark:text-gray-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        
        {/* Options dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleOptionSelect(option.value)}
                className={[
                  'w-full',
                  'px-4',
                  'py-3',
                  'text-left',
                  'text-base',
                  'hover:bg-gray-100 dark:hover:bg-slate-700',
                  'dark:hover:bg-slate-700',
                  'transition-colors',
                  'duration-150',
                  'min-h-[48px]', // Ensure minimum 48px height for all option buttons
                  option.value === value ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                ].join(' ')}
                role="option"
                aria-selected={option.value === value}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
          <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

const MobileForm = ({
  children,
  onSubmit,
  className = '',
  showKeyboardSpacer = true,
  ...props
}) => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const formRef = useRef(null);
  const responsive = useEnhancedResponsive();

  // Handle virtual keyboard on mobile
  useEffect(() => {
    if (!responsive.isMobile || !showKeyboardSpacer) return;

    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const heightDifference = windowHeight - viewportHeight;
      
      setKeyboardHeight(heightDifference > 150 ? heightDifference : 0);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport.removeEventListener('resize', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [responsive.isMobile, showKeyboardSpacer]);

  const formClasses = [
    'space-y-6',
    responsive.isMobile ? 'px-4' : 'px-0',
    className
  ].filter(Boolean).join(' ');

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className={formClasses}
      noValidate
      {...props}
    >
      {children}
      
      {/* Keyboard spacer */}
      {keyboardHeight > 0 && (
        <div
          style={{ height: keyboardHeight }}
          className="flex-shrink-0"
          aria-hidden="true"
        />
      )}
    </form>
  );
};

// Export components
MobileForm.Input = MobileFormInput;
MobileForm.Select = MobileFormSelect;
MobileForm.Button = TouchOptimizedButton;

export default MobileForm;
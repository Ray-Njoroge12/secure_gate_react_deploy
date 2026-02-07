/**
 * @fileoverview Dropdown component for Secure Gate Access
 * @description Accessible dropdown with keyboard navigation and roving tabindex
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createRovingTabindex, focusManager } from '../../utils/focusManagement';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Dropdown option type
 * @typedef {Object} DropdownOption
 * @property {string|number} value - Option value
 * @property {string} label - Option label
 * @property {boolean} [disabled] - Whether option is disabled
 * @property {React.ReactNode} [icon] - Optional icon
 */

/**
 * Dropdown component with keyboard navigation
 * 
 * @component
 * @param {Object} props - Component props
 * @param {DropdownOption[]} props.options - Array of dropdown options
 * @param {string|number} [props.value] - Selected value
 * @param {Function} [props.onChange] - Function called when selection changes
 * @param {string} [props.placeholder='Select an option'] - Placeholder text
 * @param {boolean} [props.disabled=false] - Whether dropdown is disabled
 * @param {string} [props.size='md'] - Dropdown size ('sm', 'md', 'lg')
 * @param {string} [props.variant='default'] - Dropdown variant ('default', 'outline')
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {string} [props.ariaLabel] - ARIA label for the dropdown
 * @param {string} [props.ariaLabelledBy] - ID of element that labels the dropdown
 * @param {string} [props.ariaDescribedBy] - ID of element that describes the dropdown
 * @returns {JSX.Element} Dropdown component
 * 
 * @example
 * <Dropdown
 *   options={[
 *     { value: '1', label: 'Option 1' },
 *     { value: '2', label: 'Option 2' }
 *   ]}
 *   value={selectedValue}
 *   onChange={setSelectedValue}
 *   placeholder="Choose an option"
 * />
 */
const Dropdown = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  size = 'md',
  variant = 'default',
  className = '',
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const cleanupRef = useRef(null);

  // Size classes
  const sizeClasses = {
    sm: 'text-sm px-3 py-2 min-h-[44px]',
    md: 'text-base px-4 py-2.5 min-h-[48px]',
    lg: 'text-lg px-5 py-3 min-h-[52px]'
  };

  // Variant classes
  const variantClasses = {
    default: 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-200',
    outline: 'bg-transparent border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-200'
  };

  // Get selected option
  const selectedOption = options.find(option => option.value === value);

  // Handle option selection
  const handleSelect = useCallback((option) => {
    if (option.disabled) return;
    
    onChange?.(option.value);
    setIsOpen(false);
    setFocusedIndex(-1);
    buttonRef.current?.focus();
  }, [onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          handleSelect(options[focusedIndex]);
        } else {
          setIsOpen(!isOpen);
        }
        break;

      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          buttonRef.current?.focus();
        }
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          const nextIndex = focusedIndex < options.length - 1 ? focusedIndex + 1 : 0;
          setFocusedIndex(nextIndex);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(options.length - 1);
        } else {
          const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : options.length - 1;
          setFocusedIndex(prevIndex);
        }
        break;

      case 'Home':
        if (isOpen) {
          event.preventDefault();
          setFocusedIndex(0);
        }
        break;

      case 'End':
        if (isOpen) {
          event.preventDefault();
          setFocusedIndex(options.length - 1);
        }
        break;

      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
          setFocusedIndex(-1);
        }
        break;
    }
  }, [disabled, isOpen, focusedIndex, options, handleSelect]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Set up roving tabindex when dropdown is open
  useEffect(() => {
    if (isOpen && listRef.current) {
      cleanupRef.current = createRovingTabindex(listRef.current, '[role="option"]');
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [isOpen]);

  // Focus the focused option when it changes
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const options = listRef.current.querySelectorAll('[role="option"]');
      if (options[focusedIndex]) {
        options[focusedIndex].focus();
      }
    }
  }, [focusedIndex, isOpen]);

  // Handle button click
  const handleButtonClick = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setFocusedIndex(0);
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleButtonClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between rounded-lg border
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:border-gray-400 dark:hover:border-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900'
          }
          transition-colors duration-200
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown List */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto"
          role="listbox"
          aria-label={ariaLabel || 'Options'}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              role="option"
              tabIndex={index === focusedIndex ? 0 : -1}
              aria-selected={option.value === value}
              className={`
                flex items-center justify-between px-4 py-2 cursor-pointer min-h-[44px]
                ${option.disabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-gray-100 dark:hover:bg-slate-700 focus:bg-gray-100 dark:focus:bg-slate-700'
                }
                ${option.value === value ? 'bg-gray-100 dark:bg-slate-700' : ''}
                transition-colors duration-150
              `}
              onClick={() => handleSelect(option)}
              onMouseEnter={() => setFocusedIndex(index)}
            >
              <div className="flex items-center space-x-3">
                {option.icon && (
                  <span className="flex-shrink-0 text-gray-500 dark:text-slate-400">
                    {option.icon}
                  </span>
                )}
                <span className="text-gray-900 dark:text-slate-200 truncate">
                  {option.label}
                </span>
              </div>
              
              {option.value === value && (
                <Check className="w-4 h-4 text-brand-500 flex-shrink-0" />
              )}
            </div>
          ))}
          
          {options.length === 0 && (
            <div className="px-4 py-2 text-gray-500 dark:text-slate-400 text-center">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dropdown;

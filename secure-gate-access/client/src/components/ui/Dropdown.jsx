/**
 * @fileoverview Dropdown component for Secure Gate Access
 * @description Accessible dropdown with keyboard navigation and roving tabindex
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

import { createRovingTabindex } from '../../utils/focusManagement';

import Icon from './Icon.jsx';

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

      default:
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
  
  const buttonId = `dropdown-button-${Math.random().toString(36).substr(2, 9)}`;

  // Handle button click
  const handleButtonClick = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setFocusedIndex(0);
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block text-left w-full ${className}`}
    >
      {/* Button */}
      <button
        type="button"
        ref={buttonRef}
        className={`
          flex items-center justify-between w-full rounded-md border shadow-sm px-4 py-2 
          text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed transition-colors
          ${variantClasses[variant]}
          ${isOpen ? 'ring-2 ring-brand-500 border-brand-500' : ''}
          ${sizeClasses[size]}
        `}
        id={buttonId}
        onClick={handleButtonClick}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
      >
        <span className="block truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <Icon 
          name="chevron-down" 
          size={16} 
          className={`ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown List */}
      {isOpen && (
        <ul
          className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
          role="listbox"
          aria-labelledby={buttonId}
          aria-activedescendant={focusedIndex >= 0 ? `option-${focusedIndex}` : undefined}
          tabIndex={-1}
        >
          {options.map((option, index) => {
            const isSelected = value === option.value;
            const isFocused = focusedIndex === index;

            return (
              <li
                key={option.value}
                id={`option-${index}`}
                className={`
                  cursor-default select-none relative py-2 pl-3 pr-9 transition-colors
                  ${isFocused ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-100' : 'text-gray-900 dark:text-gray-100'}
                  ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                onClick={() => handleSelect(option)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelect(option);
                  }
                }}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                <div className="flex items-center">
                  {option.icon && <span className="mr-2 flex-shrink-0">{option.icon}</span>}
                  <span className={`block truncate ${isSelected ? 'font-semibold' : 'font-normal'}`}>
                    {option.label}
                  </span>
                </div>

                {isSelected && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-brand-600 dark:text-brand-400">
                    <Icon name="check" size={16} aria-hidden="true" />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Dropdown;

/**
 * @fileoverview Accessible Checkbox component for Secure Gate Access
 * @description WCAG 2.1 AA compliant checkbox with 24x24px minimum touch target
 * @author Secure Gate Access Team
 * @version 2.0.0
 */

import React, { useId } from 'react';
import Icon from './Icon.jsx';

/**
 * Accessible Checkbox component with WCAG 2.1 AA compliant touch target
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {boolean} [props.checked=false] - Whether checkbox is checked
 * @param {Function} [props.onCheckedChange] - Callback when checked state changes
 * @param {boolean} [props.disabled=false] - Whether checkbox is disabled
 * @param {string} [props.label] - Label text (required for accessibility)
 * @param {string} [props.description] - Optional description text
 * @param {string} [props.error] - Error message to display
 * @param {string} [props.id] - Custom ID for the checkbox
 * @param {string} [props.name] - Form field name
 * @returns {JSX.Element} Checkbox component
 * 
 * @example
 * // Basic usage
 * <Checkbox 
 *   label="Save to favorites" 
 *   checked={isFavorite} 
 *   onCheckedChange={setIsFavorite} 
 * />
 * 
 * @example
 * // With description and error
 * <Checkbox
 *   label="Accept terms"
 *   description="You must accept our terms to continue"
 *   error={errors.terms}
 *   checked={accepted}
 *   onCheckedChange={setAccepted}
 * />
 */
export const Checkbox = React.forwardRef(
  ({ 
    className = '', 
    checked = false, 
    onCheckedChange, 
    disabled = false, 
    label,
    description,
    error,
    id: customId,
    name,
    ...props 
  }, ref) => {
    // Generate unique ID for accessibility
    const generatedId = useId();
    const id = customId || generatedId;
    const inputId = id; // Define inputId for label association
    const descriptionId = description ? `${id}-description` : undefined;
    const errorId = error ? `${id}-error` : undefined;

    const handleChange = (e) => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(e.target.checked);
      }
    };

    const handleKeyDown = (e) => {
      // Space is handled natively by input[type="checkbox"]
      // Enter key support for better UX
      if (e.key === 'Enter' && !disabled) {
        e.preventDefault();
        onCheckedChange?.(!checked);
      }
    };

    return (
      <div className={`flex items-start ${className}`}>
        <div className="flex h-6 items-center">
          <label 
            htmlFor={inputId}
            className="relative flex items-center p-[2px] rounded-full cursor-pointer"
          >
            <input
              id={inputId}
              name={name}
              type="checkbox"
              className="peer sr-only"
              checked={checked}
              onChange={handleChange}
              disabled={disabled}
              aria-invalid={!!error}
              ref={ref}
              {...props}
            />
            <div
              className={`
                h-5 w-5 rounded border bg-white dark:bg-slate-800 transition-all 
                peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-brand-500
                flex items-center justify-center
                ${disabled ? 'border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-900 cursor-not-allowed' : ''}
                ${error ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}
                ${checked && !disabled ? 'bg-brand-600 border-brand-600 text-white' : ''}
                ${checked && disabled ? 'bg-gray-400 border-gray-400 text-white' : ''}
              `}
            >
              {checked && (
                <Icon 
                  name="check" 
                  size={14} 
                  strokeWidth={3}
                  className="pointer-events-none"
                  aria-hidden="true" 
                />
              )}
            </div>
          </label>
        </div>
        
        {(label || description) && (
          <div className="ml-3 text-sm leading-6">
            {label && (
              <label 
                htmlFor={id} 
                className={`font-medium ${disabled ? 'text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-gray-500 dark:text-gray-400">{description}</p>
            )}
            {error && (
              <p className="text-red-500 text-xs mt-1" role="alert">{error}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;

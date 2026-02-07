/**
 * @fileoverview Accessible Checkbox component for Secure Gate Access
 * @description WCAG 2.1 AA compliant checkbox with 24x24px minimum touch target
 * @author Secure Gate Access Team
 * @version 2.0.0
 */

import React, { useId } from 'react';
import { Check } from 'lucide-react';

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
      <div className={`flex items-start gap-3 ${className}`}>
        {/* Clickable area wrapper for larger touch target */}
        <div className="relative flex items-center justify-center min-w-[32px] min-h-[32px]">
          {/* Hidden native checkbox for accessibility */}
          <input
            ref={ref}
            type="checkbox"
            id={id}
            name={name}
            checked={checked}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
            aria-invalid={!!error}
            className="sr-only peer"
            {...props}
          />
          
          {/* Custom styled checkbox - 24x24px (WCAG 2.1 AA compliant) */}
          <label
            htmlFor={id}
            className={`
              flex items-center justify-center
              w-6 h-6 shrink-0 rounded-md border-2 cursor-pointer
              transition-all duration-200 ease-out
              
              /* Default state */
              ${checked 
                ? 'bg-green-600 border-green-600 text-white dark:bg-green-500 dark:border-green-500' 
                : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600'
              }
              
              /* Hover state */
              ${!disabled && !checked ? 'hover:border-green-500 hover:bg-green-50 dark:hover:bg-slate-700' : ''}
              ${!disabled && checked ? 'hover:bg-green-700 hover:border-green-700 dark:hover:bg-green-600' : ''}
              
              /* Focus state - visible ring for keyboard navigation */
              peer-focus-visible:outline-none 
              peer-focus-visible:ring-2 
              peer-focus-visible:ring-green-500 
              peer-focus-visible:ring-offset-2 
              peer-focus-visible:ring-offset-white
              dark:peer-focus-visible:ring-offset-slate-900
              
              /* Error state */
              ${error ? 'border-red-500 dark:border-red-400' : ''}
              
              /* Disabled state */
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {/* Animated checkmark */}
            <Check 
              className={`
                w-4 h-4 stroke-[3]
                transition-all duration-200
                ${checked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
              `}
              aria-hidden="true"
            />
          </label>
        </div>

        {/* Label and description */}
        {(label || description || error) && (
          <div className="flex flex-col gap-1 pt-0.5">
            {label && (
              <label 
                htmlFor={id}
                className={`
                  text-sm font-medium leading-tight cursor-pointer select-none
                  text-gray-900 dark:text-slate-100
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {label}
              </label>
            )}
            
            {description && (
              <p 
                id={descriptionId}
                className="text-sm text-gray-500 dark:text-slate-300"
              >
                {description}
              </p>
            )}
            
            {error && (
              <p 
                id={errorId}
                className="text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;

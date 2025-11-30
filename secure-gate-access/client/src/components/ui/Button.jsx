/**
 * @fileoverview Button component for Secure Gate Access
 * @description A versatile button component with multiple variants, sizes, and accessibility features
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { memo, useEffect, useRef } from 'react';

/**
 * Button component with multiple variants and accessibility features
 * 
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} [props.variant='primary'] - Button style variant
 * @param {string} [props.size='md'] - Button size
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {boolean} [props.loading=false] - Whether button is in loading state
 * @param {React.ReactNode} [props.icon] - Icon to display before text
 * @param {Function} [props.onClick] - Click handler function
 * @param {string} [props.type='button'] - HTML button type
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {string} [props.aria-label] - ARIA label for accessibility
 * @param {string} [props.aria-describedby] - ARIA describedby for accessibility
 * @param {boolean} [props.aria-expanded] - ARIA expanded state for accessibility
 * @param {string} [props.aria-controls] - ARIA controls for accessibility
 * @param {Object} props...props - Additional props passed to button element
 * @returns {JSX.Element} Button component
 * 
 * @example
 * // Basic button
 * <Button onClick={handleClick}>Click me</Button>
 * 
 * @example
 * // Button with icon and loading state
 * <Button 
 *   variant="primary" 
 *   size="lg" 
 *   icon={<Icon />} 
 *   loading={isLoading}
 *   onClick={handleSubmit}
 * >
 *   Submit
 * </Button>
 * 
 * @example
 * // Disabled button with accessibility attributes
 * <Button 
 *   disabled 
 *   aria-label="Save changes"
 *   aria-describedby="save-help"
 * >
 *   Save
 * </Button>
 */
const Button = memo(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  'aria-expanded': ariaExpanded,
  'aria-controls': ariaControls,
  ...props 
}) => {
  const buttonRef = useRef(null);

  /**
   * Keyboard shortcuts for accessibility
   * 
   * @description Handles keyboard navigation for the button:
   * - Space or Enter: Activates the button
   * - Prevents default behavior for these keys
   * - Only activates if button is not disabled or loading
   * 
   * @effect
   * @listens keydown
   * @dependencies disabled, loading, onClick
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space or Enter to activate button
      if ((e.key === ' ' || e.key === 'Enter') && e.target === buttonRef.current) {
        e.preventDefault();
        if (!disabled && !loading) {
          onClick?.(e);
        }
      }
    };

    const button = buttonRef.current;
    if (button) {
      button.addEventListener('keydown', handleKeyDown);
      return () => button.removeEventListener('keydown', handleKeyDown);
    }
  }, [disabled, loading, onClick]);

  /**
   * Base CSS classes for all button variants
   * @constant {string}
   */
  const baseClasses = `inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${fullWidth ? 'w-full' : ''}`;
  
  /**
   * CSS classes for different button variants
   * @constant {Object.<string, string>}
   */
  const variantClasses = {
    primary: 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-green-500',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white shadow-md hover:shadow-lg focus-visible:ring-slate-500',
    outlined: 'border-2 border-slate-600 hover:border-slate-500 text-slate-200 hover:bg-slate-800 bg-transparent focus-visible:ring-slate-500',
    ghost: 'hover:bg-slate-800 text-slate-300 hover:text-slate-100 bg-transparent focus-visible:ring-slate-600',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg focus-visible:ring-red-500'
  };
  
  /**
   * CSS classes for different button sizes
   * @constant {Object.<string, string>}
   */
  const sizeClasses = {
    sm: 'h-9 px-3 py-1.5 text-sm',
    md: 'h-11 px-4 py-2 text-base',
    lg: 'h-14 px-6 py-3 text-lg'
  };
  
  /**
   * Combined CSS classes for the button
   * @constant {string}
   */
  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  
  // Auto-generate aria-label for icon-only buttons
  const isIconOnly = icon && !children;
  const autoAriaLabel = isIconOnly && !ariaLabel ? 'Button' : ariaLabel;
  
  return (
    <button
      ref={buttonRef}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={buttonClasses}
      aria-label={autoAriaLabel}
      aria-describedby={ariaDescribedby}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {children}
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span>{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span>{icon}</span>}
        </>
      )}
    </button>
  );
});

/**
 * Display name for the component (useful for debugging)
 * @constant {string}
 */
Button.displayName = 'Button';

export default Button;
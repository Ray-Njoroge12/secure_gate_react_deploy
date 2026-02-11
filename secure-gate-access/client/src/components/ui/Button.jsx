/**
 * @fileoverview Button component for Secure Gate Access
 * @description A versatile button component with multiple variants, sizes, and accessibility features
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { memo, useEffect, useRef } from 'react';
import Icon from './Icon';

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
  const baseClasses = `inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${fullWidth ? 'w-full' : ''}`;
  
  /**
   * CSS classes for different button variants — aligned with brand color #10b981
   * Includes aliases for common naming conventions
   * @constant {Object.<string, string>}
   */
  const variantClasses = {
    // Primary variants — using brand-* (maps to emerald via tailwind.config.js)
    primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-brand-500',
    brand: 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-brand-500',
    secondary: 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-white shadow-sm hover:shadow-md focus-visible:ring-slate-500',
    default: 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-white shadow-sm hover:shadow-md focus-visible:ring-slate-500',
    
    // Outline variants (both naming conventions supported)
    outlined: 'border-2 border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 bg-transparent focus-visible:ring-slate-500',
    outline: 'border-2 border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 bg-transparent focus-visible:ring-slate-500',
    
    // Ghost/minimal/text variants
    ghost: 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 bg-transparent focus-visible:ring-slate-600',
    text: 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 bg-transparent focus-visible:ring-slate-600',
    
    // Status variants — Tier 1 shadow (below CTA)
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md focus-visible:ring-red-500',
    destructive: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md focus-visible:ring-red-500',
    error: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md focus-visible:ring-red-500',
    success: 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow-md focus-visible:ring-brand-500',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow-md focus-visible:ring-amber-500',
    info: 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md focus-visible:ring-blue-500',

    // Layout/shape variants (preserve className for custom styling)
    circle: 'rounded-full p-2 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 bg-transparent focus-visible:ring-slate-600',
    compact: 'px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 bg-transparent focus-visible:ring-slate-600',
    filled: 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg hover:shadow-xl focus-visible:ring-brand-500'
  };
  
  /**
   * CSS classes for different button sizes
   * WCAG 2.1 AA: All sizes meet 44px minimum touch target
   * @constant {Object.<string, string>}
   */
  const sizeClasses = {
    sm: 'h-11 px-3 py-1.5 text-sm',  // 44px - meets WCAG minimum
    md: 'h-12 px-4 py-2 text-base',  // 48px
    lg: 'h-14 px-6 py-3 text-lg'      // 56px
  };
  
  /**
   * Get variant classes with fallback to primary for unknown variants
   * @constant {string}
   */
  const resolvedVariantClasses = variantClasses[variant] || variantClasses.primary;
  const resolvedSizeClasses = sizeClasses[size] || sizeClasses.md;
  
  /**
   * Combined CSS classes for the button
   * @constant {string}
   */
  const buttonClasses = `${baseClasses} ${resolvedVariantClasses} ${resolvedSizeClasses} ${className}`;
  
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
          <Icon name="loader-2" sizeOverride={16} className="animate-spin" aria-hidden="true" />
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

export { Button };
export default Button;
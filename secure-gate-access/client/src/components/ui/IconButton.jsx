/**
 * @fileoverview IconButton component for Secure Gate Access
 * @description WCAG 2.1 AA compliant icon button with 44x44px minimum touch target
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { memo, useRef, useEffect } from 'react';

/**
 * Accessible IconButton component with 44x44px minimum touch target
 * 
 * @component
 * @param {Object} props - Component props
 * @param {React.ComponentType} props.icon - Lucide icon component (required)
 * @param {string} props.label - Aria label for accessibility (required)
 * @param {string} [props.variant='ghost'] - Button variant (ghost, outlined, filled, danger)
 * @param {string} [props.size='md'] - Button size (sm, md, lg)
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {boolean} [props.loading=false] - Whether button is in loading state
 * @param {Function} [props.onClick] - Click handler
 * @param {string} [props.type='button'] - HTML button type
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {string} [props.title] - Tooltip text (defaults to label)
 * @returns {JSX.Element} IconButton component
 * 
 * @example
 * // Basic usage
 * <IconButton icon={Search} label="Search visitors" onClick={handleSearch} />
 * 
 * @example
 * // Filled primary action
 * <IconButton icon={Plus} label="Add visitor" variant="filled" size="lg" />
 * 
 * @example
 * // Loading state
 * <IconButton icon={Save} label="Saving..." loading={isSaving} variant="filled" />
 * 
 * @example
 * // Danger action
 * <IconButton icon={Trash2} label="Delete" variant="danger" onClick={handleDelete} />
 */
const IconButton = memo(React.forwardRef(({ 
  icon: Icon,
  label,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  title,
  ...props 
}, ref) => {
  const buttonRef = useRef(null);
  const combinedRef = ref || buttonRef;

  /**
   * Keyboard accessibility - Space and Enter activation
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && e.target === combinedRef.current) {
        e.preventDefault();
        if (!disabled && !loading) {
          onClick?.(e);
        }
      }
    };

    const button = combinedRef.current;
    if (button) {
      button.addEventListener('keydown', handleKeyDown);
      return () => button.removeEventListener('keydown', handleKeyDown);
    }
  }, [disabled, loading, onClick, combinedRef]);

  /**
   * Size configurations - all meet WCAG 2.1 AA touch target requirements
   * sm: 40px (slightly below 44px, use for tight spaces only)
   * md: 44px (WCAG 2.1 AA minimum)
   * lg: 48px (generous touch target)
   */
  const sizeClasses = {
    sm: 'min-w-[40px] min-h-[40px] p-2',
    md: 'min-w-[44px] min-h-[44px] p-2.5',
    lg: 'min-w-[48px] min-h-[48px] p-3'
  };

  /**
   * Icon sizes matching button sizes
   */
  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  /**
   * Variant styles with full state support
   */
  const variantClasses = {
    ghost: `
      bg-transparent
      text-slate-600 dark:text-slate-300
      hover:bg-slate-100 dark:hover:bg-slate-800
      hover:text-slate-900 dark:hover:text-slate-100
      active:bg-slate-200 dark:active:bg-slate-700
      focus-visible:ring-slate-500
    `,
    outlined: `
      bg-transparent
      border-2 border-slate-300 dark:border-slate-600
      text-slate-600 dark:text-slate-300
      hover:border-slate-400 dark:hover:border-slate-500
      hover:bg-slate-50 dark:hover:bg-slate-800
      active:bg-slate-100 dark:active:bg-slate-700
      focus-visible:ring-slate-500
    `,
    filled: `
      bg-green-600 dark:bg-green-500
      text-white
      hover:bg-green-700 dark:hover:bg-green-600
      active:bg-green-800 dark:active:bg-green-700
      shadow-md hover:shadow-lg
      focus-visible:ring-green-500
    `,
    danger: `
      bg-transparent
      text-red-600 dark:text-red-400
      hover:bg-red-50 dark:hover:bg-red-900/20
      hover:text-red-700 dark:hover:text-red-300
      active:bg-red-100 dark:active:bg-red-900/30
      focus-visible:ring-red-500
    `
  };

  /**
   * Base classes for all icon buttons
   */
  const baseClasses = `
    inline-flex items-center justify-center
    rounded-lg
    transition-all duration-200 ease-out
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
  `;

  const buttonClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Validate required props
  if (!Icon) {
    console.warn('IconButton: icon prop is required');
    return null;
  }

  if (!label) {
    console.warn('IconButton: label prop is required for accessibility');
  }

  return (
    <button
      ref={combinedRef}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={buttonClasses}
      aria-label={label}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      title={title || label}
      {...props}
    >
      {loading ? (
        // Loading spinner
        <svg 
          className={`animate-spin ${iconSizeClasses[size]}`} 
          fill="none" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4" 
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
          />
        </svg>
      ) : (
        <Icon 
          className={iconSizeClasses[size]} 
          aria-hidden="true"
        />
      )}
    </button>
  );
}));

IconButton.displayName = 'IconButton';

export default IconButton;

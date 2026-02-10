// client/src/components/ui/AccessibleButton.jsx
import React, { forwardRef } from 'react';
import { useAccessibility } from '../../hooks/useAccessibility';

const AccessibleButton = forwardRef(({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  onClick,
  onFocus,
  onBlur,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-expanded': ariaExpanded,
  'aria-pressed': ariaPressed,
  'aria-controls': ariaControls,
  type = 'button',
  ...props
}, ref) => {
  const { getAccessibleClasses, getAccessibleStyles, announce } = useAccessibility();

  // Base classes
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'rounded-md',
    'transition-all',
    'duration-200',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'disabled:pointer-events-none'
  ];

  // Variant classes — aligned with brand color system (brand = emerald)
  const variantClasses = {
    primary: [
      'bg-brand-600',
      'text-white',
      'hover:bg-brand-700',
      'focus:ring-brand-500',
      'active:bg-brand-800'
    ],
    secondary: [
      'bg-gray-200',
      'text-gray-900 dark:text-white',
      'hover:bg-gray-300',
      'focus:ring-gray-500',
      'active:bg-gray-400'
    ],
    outline: [
      'border',
      'border-gray-300 dark:border-slate-600',
      'bg-white dark:bg-slate-800',
      'text-gray-700 dark:text-slate-200',
      'hover:bg-gray-50 dark:hover:bg-slate-700',
      'focus:ring-brand-500',
      'active:bg-gray-100 dark:bg-slate-700 dark:active:bg-slate-600'
    ],
    ghost: [
      'text-gray-700 dark:text-slate-300',
      'hover:bg-gray-100 dark:hover:bg-slate-700',
      'focus:ring-gray-500',
      'active:bg-gray-200 dark:active:bg-slate-600'
    ],
    danger: [
      'bg-red-600',
      'text-white',
      'hover:bg-red-700',
      'focus:ring-red-500',
      'active:bg-red-800'
    ],
    success: [
      'bg-brand-600',
      'text-white',
      'hover:bg-brand-700',
      'focus:ring-brand-500',
      'active:bg-brand-800'
    ]
  };

  // Size classes - All sizes meet 44px minimum touch target requirement
  const sizeClasses = {
    small: ['text-sm', 'px-3', 'py-2', 'min-h-[44px]', 'min-w-[44px]'],
    medium: ['text-sm', 'px-4', 'py-3', 'min-h-[48px]', 'min-w-[48px]'],
    large: ['text-base', 'px-6', 'py-3', 'min-h-[52px]', 'min-w-[52px]']
  };

  // Combine all classes
  const classes = [
    ...baseClasses,
    ...variantClasses[variant],
    ...sizeClasses[size],
    fullWidth && 'w-full',
    className
  ].filter(Boolean);

  // Handle click with accessibility
  const handleClick = (e) => {
    if (disabled || loading) return;
    
    onClick?.(e);
    
    // Announce action to screen readers
    if (ariaLabel) {
      announce(`Button ${ariaLabel} activated`);
    }
  };

  // Handle focus
  const handleFocus = (e) => {
    onFocus?.(e);
    
    if (ariaLabel) {
      announce(`Button ${ariaLabel} focused`);
    }
  };

  // Handle blur
  const handleBlur = (e) => {
    onBlur?.(e);
  };

  // Get accessible classes
  const accessibleClasses = getAccessibleClasses(classes.join(' '));
  const accessibleStyles = getAccessibleStyles();

  // Render icon
  const renderIcon = () => {
    if (!icon) return null;
    
    const iconElement = React.cloneElement(icon, {
      className: [
        size === 'small' ? 'w-4 h-4' : size === 'large' ? 'w-6 h-6' : 'w-5 h-5',
        iconPosition === 'right' ? 'ml-2' : 'mr-2'
      ].join(' ')
    });

    return iconElement;
  };

  // Render loading spinner
  const renderLoadingSpinner = () => (
    <svg
      className={[
        'animate-spin',
        size === 'small' ? 'w-4 h-4' : size === 'large' ? 'w-6 h-6' : 'w-5 h-5',
        iconPosition === 'right' ? 'ml-2' : 'mr-2'
      ].join(' ')}
      fill="none"
      viewBox="0 0 24 24"
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
  );

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={accessibleClasses}
      style={accessibleStyles}
      onClick={handleClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-expanded={ariaExpanded}
      aria-pressed={ariaPressed}
      aria-controls={ariaControls}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading && iconPosition === 'left' && renderLoadingSpinner()}
      {!loading && icon && iconPosition === 'left' && renderIcon()}
      
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
      
      {loading && iconPosition === 'right' && renderLoadingSpinner()}
      {!loading && icon && iconPosition === 'right' && renderIcon()}
      
      {loading && (
        <span className="sr-only">Loading...</span>
      )}
    </button>
  );
});

AccessibleButton.displayName = 'AccessibleButton';

export default AccessibleButton;

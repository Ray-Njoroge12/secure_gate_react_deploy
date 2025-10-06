// client/src/components/ui/Button.jsx
import React, { memo, useEffect, useRef } from 'react';

const Button = memo(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  loading = false,
  icon,
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

  // Keyboard shortcuts
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
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white focus:ring-brand-500 shadow-brand',
    secondary: 'bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-slate-200 focus:ring-slate-500 shadow-sm',
    outline: 'border-2 border-brand-600 text-brand-600 hover:bg-brand-600 hover:text-white focus:ring-brand-500 bg-transparent',
    ghost: 'text-slate-300 hover:bg-slate-800 hover:text-slate-100 focus:ring-slate-500 bg-transparent',
    danger: 'bg-error-600 hover:bg-error-700 active:bg-error-800 text-white focus:ring-error-500 shadow-sm'
  };
  
  const sizeClasses = {
    sm: 'min-h-[44px] px-3 py-2 text-sm',
    md: 'min-h-[48px] px-4 py-3 text-sm xs:text-base',
    lg: 'min-h-[52px] px-6 py-3 text-base xs:text-lg',
    xl: 'min-h-[56px] px-8 py-4 text-lg xs:text-xl'
  };
  
  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={buttonClasses}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {icon && !loading && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
});

export default Button;
// client/src/components/ui/Input.jsx
import React, { memo, useEffect, useRef } from 'react';

const Input = memo(({ 
  label,
  error,
  success,
  warning,
  helperText,
  icon,
  required = false,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  'aria-invalid': ariaInvalid,
  ...props 
}) => {
  const inputRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + A to select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (inputRef.current) {
          inputRef.current.select();
        }
      }
      // Escape to clear
      if (e.key === 'Escape' && inputRef.current) {
        inputRef.current.value = '';
        inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    const input = inputRef.current;
    if (input) {
      input.addEventListener('keydown', handleKeyDown);
      return () => input.removeEventListener('keydown', handleKeyDown);
    }
  }, []);
  const inputClasses = `
    w-full min-h-[44px] sm:min-h-[48px] px-3 sm:px-4 py-2 sm:py-3 bg-slate-800 border rounded-lg 
    text-sm sm:text-base text-slate-200 placeholder-slate-400 
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
    disabled:opacity-50 disabled:cursor-not-allowed
    ${error 
      ? 'border-red-500 focus:ring-red-500' 
      : success
      ? 'border-green-500 focus:ring-green-500'
      : warning
      ? 'border-yellow-500 focus:ring-yellow-500'
      : 'border-slate-600 hover:border-slate-500'
    }
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  const id = props.id || props.name || label?.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-sm sm:text-base font-medium text-slate-300">
          {label}
          {required && <span className="text-red-400 ml-1" aria-label="required">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-slate-400">{icon}</span>
          </div>
        )}
        
        <input
          id={id}
          className={`${inputClasses} ${icon ? 'pl-10' : ''}`}
          aria-label={ariaLabel || (label ? undefined : props.placeholder)}
          aria-describedby={ariaDescribedby || (error ? `${id}-error` : helperText ? `${id}-helper` : undefined)}
          aria-invalid={ariaInvalid || (error ? 'true' : 'false')}
          aria-required={required}
          {...props}
        />
      </div>
      
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p id={`${id}-helper`} className="text-sm text-slate-400">
          {helperText}
        </p>
      )}
    </div>
  );
});

export default Input;
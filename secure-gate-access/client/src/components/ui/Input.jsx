// client/src/components/ui/Input.jsx
import React, { memo } from 'react';

const Input = memo(({ 
  label,
  error,
  helperText,
  icon,
  required = false,
  className = '',
  ...props 
}) => {
  const inputClasses = `
    w-full min-h-[44px] px-3 sm:px-4 py-2 sm:py-3 bg-slate-800 border rounded-lg 
    text-sm sm:text-base text-slate-200 placeholder-slate-400 
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
    disabled:opacity-50 disabled:cursor-not-allowed
    ${error 
      ? 'border-red-500 focus:ring-red-500' 
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
          {...props}
        />
      </div>
      
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-slate-400">
          {helperText}
        </p>
      )}
    </div>
  );
});

export default Input;
// client/src/components/ui/FormField.jsx
import React from 'react';
import { Input } from './Input';

const FormField = ({ 
  label, 
  error, 
  required = false,
  children,
  htmlFor,
  description,
  className = '',
  ...props 
}) => {
  const fieldId = htmlFor || props.id || props.name || label?.toLowerCase().replace(/\s+/g, '-');
  const errorId = error ? `${fieldId}-error` : undefined;
  const descriptionId = description ? `${fieldId}-description` : undefined;
  
  const ariaDescribedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;
  
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label 
          htmlFor={fieldId} 
          className="block text-sm font-medium text-slate-300"
        >
          {label}
          {required && (
            <span className="text-red-400 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
      )}
      
      {description && (
        <p 
          id={descriptionId} 
          className="text-sm text-slate-400"
        >
          {description}
        </p>
      )}
      
      <div className="relative">
        {React.isValidElement(children) 
          ? React.cloneElement(children, {
              id: fieldId,
              'aria-describedby': ariaDescribedBy,
              'aria-invalid': error ? 'true' : 'false',
              'aria-required': required,
              ...children.props
            })
          : children
        }
      </div>
      
      {error && (
        <p 
          id={errorId} 
          className="text-sm text-red-400" 
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
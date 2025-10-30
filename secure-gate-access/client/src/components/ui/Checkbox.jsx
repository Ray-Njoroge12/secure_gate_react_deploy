import React from 'react';
import { Check } from 'lucide-react';

export const Checkbox = React.forwardRef(
  ({ className = '', checked, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        className={`peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white'
        } ${className}`}
        onClick={() => !disabled && onCheckedChange && onCheckedChange(!checked)}
        {...props}
      >
        {checked && <Check className="h-4 w-4" />}
      </button>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;

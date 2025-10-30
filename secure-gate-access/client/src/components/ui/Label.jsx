import React from 'react';

export const Label = React.forwardRef(
  ({ className = '', htmlFor, ...props }, ref) => {
    return (
      <label
        ref={ref}
        htmlFor={htmlFor}
        className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
        {...props}
      />
    );
  }
);

Label.displayName = 'Label';

export default Label;

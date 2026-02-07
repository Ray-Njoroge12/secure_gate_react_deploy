// client/src/components/ui/Card.jsx
import React, { useEffect, useRef } from 'react';

const Card = ({ 
  children, 
  className = '', 
  padding = 'md',
  hover = false,
  variant = 'outlined',
  size = 'md',
  onClick,
  disabled = false,
  ...props 
}) => {
  const cardRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to close modal cards
      if (e.key === 'Escape' && cardRef.current?.closest('.modal')) {
        const closeButton = cardRef.current.querySelector('[aria-label*="close"], [aria-label*="Close"]');
        if (closeButton) {
          closeButton.click();
        }
      }
      
      // Handle clickable card keyboard activation
      if (onClick && !disabled && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
      }
    };

    const card = cardRef.current;
    if (card) {
      card.addEventListener('keydown', handleKeyDown);
      return () => card.removeEventListener('keydown', handleKeyDown);
    }
  }, [onClick, disabled]);

  // Handle keyboard events for button element
  const handleKeyDown = (e) => {
    if (onClick && !disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    }
  };

  const handleClick = (e) => {
    if (onClick && !disabled) {
      onClick(e);
    }
  };

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  // Theme-aware variant classes
  const variantClasses = {
    outlined: 'border-gray-200 dark:border-slate-700',
    elevated: 'shadow-lg border-gray-200 dark:border-slate-700',
    flat: 'shadow-none border-gray-200 dark:border-slate-700'
  };

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6', 
    lg: 'p-8'
  };
  
  // Theme-aware card classes
  const cardClasses = `
    bg-white dark:bg-slate-800 rounded-lg border ${variantClasses[variant]} shadow-sm
    ${hover ? 'hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-md dark:hover:shadow-lg transition-all duration-200' : ''}
    ${onClick ? 'cursor-pointer hover:shadow-md dark:hover:shadow-lg' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${paddingClasses[padding]}
    ${sizeClasses[size]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const Component = onClick ? 'button' : 'div';
  const buttonProps = onClick ? {
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    disabled,
    role: 'button',
    tabIndex: disabled ? -1 : 0,
    'aria-disabled': disabled,
    type: 'button'
  } : {};
  
  return (
    <Component 
      ref={cardRef} 
      className={cardClasses} 
      {...buttonProps}
      {...props}
    >
      {children}
    </Component>
  );
};

const CardHeader = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b border-gray-200 dark:border-slate-700 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-gray-900 dark:text-slate-200 ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ children, className = '' }) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
);

const CardFooter = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-t border-gray-200 dark:border-slate-700 ${className}`}>
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;
export { Card, CardHeader, CardTitle, CardContent, CardFooter };
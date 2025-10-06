// client/src/components/ui/Card.jsx
import React, { useEffect, useRef } from 'react';

const Card = ({ 
  children, 
  className = '', 
  padding = 'md',
  hover = false,
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
    };

    const card = cardRef.current;
    if (card) {
      card.addEventListener('keydown', handleKeyDown);
      return () => card.removeEventListener('keydown', handleKeyDown);
    }
  }, []);
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  
  const cardClasses = `
    bg-secondary-800 rounded-lg border border-secondary-700 shadow-brand 
    ${hover ? 'hover:border-slate-600 transition-colors duration-200' : ''}
    ${paddingClasses[padding]}
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  return (
    <div ref={cardRef} className={cardClasses} {...props}>
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-secondary-200 ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ children, className = '' }) => (
  <div className={className}>
    {children}
  </div>
);

const CardFooter = ({ children, className = '' }) => (
  <div className={`mt-4 pt-4 border-t border-secondary-700 ${className}`}>
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;
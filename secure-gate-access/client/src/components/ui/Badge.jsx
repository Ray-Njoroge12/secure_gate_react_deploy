// client/src/components/ui/Badge.jsx
import React, { useEffect, useRef } from 'react';

const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  className = '',
  ...props 
}) => {
  const badgeRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space or Enter to activate clickable badges
      if ((e.key === ' ' || e.key === 'Enter') && badgeRef.current?.onClick) {
        e.preventDefault();
        badgeRef.current.click();
      }
    };

    const badge = badgeRef.current;
    if (badge) {
      badge.addEventListener('keydown', handleKeyDown);
      return () => badge.removeEventListener('keydown', handleKeyDown);
    }
  }, []);
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  const variantClasses = {
    default: 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300',
    success: 'bg-success-50 dark:bg-green-900/30 text-success-700 dark:text-green-400',
    warning: 'bg-warning-50 dark:bg-amber-900/30 text-warning-700 dark:text-amber-400',
    danger: 'bg-error-50 dark:bg-red-900/30 text-error-700 dark:text-red-400',
    info: 'bg-info-50 dark:bg-blue-900/30 text-info-700 dark:text-blue-400',
    pending: 'bg-warning-50 dark:bg-amber-900/30 text-warning-700 dark:text-amber-400'
  };
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs min-h-[24px]',
    md: 'px-3 py-1 text-sm min-h-[28px]',
    lg: 'px-4 py-1.5 text-base min-h-[32px]'
  };
  
  const badgeClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  
  return (
    <span ref={badgeRef} className={badgeClasses} {...props}>
      {children}
    </span>
  );
};

export default Badge;
export { Badge };
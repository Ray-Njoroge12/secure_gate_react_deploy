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
    default: 'bg-slate-700 text-slate-300',
    success: 'bg-success-50 text-success-700',
    warning: 'bg-warning-50 text-warning-700',
    danger: 'bg-error-50 text-error-700',
    info: 'bg-info-50 text-info-700',
    pending: 'bg-warning-50 text-warning-700'
  };
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs min-h-[32px] min-w-[32px]',
    md: 'px-3 py-1 text-sm min-h-[36px] min-w-[36px]',
    lg: 'px-4 py-2 text-base min-h-[44px] min-w-[44px]'
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
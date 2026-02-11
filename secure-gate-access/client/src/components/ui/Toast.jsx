// client/src/components/ui/Toast.jsx
import React, { useEffect, memo, useRef } from 'react';
import Icon from './Icon';
import Button from './Button';

const Toast = memo(({ 
  message, 
  type = 'info', 
  onClose, 
  duration = 4000,
  className = '',
  ...props 
}) => {
  const toastRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to close
      if (e.key === 'Escape' && toastRef.current) {
        onClose?.();
      }
      // Space or Enter to close
      if ((e.key === ' ' || e.key === 'Enter') && e.target === toastRef.current) {
        e.preventDefault();
        onClose?.();
      }
    };

    const toast = toastRef.current;
    if (toast) {
      toast.addEventListener('keydown', handleKeyDown);
      return () => toast.removeEventListener('keydown', handleKeyDown);
    }
  }, [onClose]);
  const baseClasses = 'fixed top-4 right-4 max-w-sm p-4 rounded-lg shadow-brand border z-50 transform transition-all duration-300';
  
  const typeClasses = {
    success: 'bg-primary-900 border-primary-700 text-primary-100',
    error: 'bg-red-900 border-red-700 text-red-100',
    warning: 'bg-yellow-900 border-yellow-700 text-yellow-100',
    info: 'bg-accent-900 border-accent-700 text-accent-100'
  };
  
  const icons = {
    success: <Icon name="check-circle" sizeOverride={20} aria-hidden="true" />,
    error: <Icon name="x-circle" sizeOverride={20} aria-hidden="true" />,
    warning: <Icon name="alert-triangle" sizeOverride={20} aria-hidden="true" />,
    info: <Icon name="info" sizeOverride={20} aria-hidden="true" />
  };
  
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);
  
  const toastClasses = `${baseClasses} ${typeClasses[type]} ${className}`;
  
  return (
    <div ref={toastRef} className={toastClasses} role="alert" tabIndex={0} {...props}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {icons[type]}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">
            {message}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="inline-flex rounded-md p-1.5 min-w-[44px] min-h-[44px] items-center justify-center hover:bg-black hover:bg-opacity-20 transition-colors"
            aria-label="Close notification"
          >
            <Icon name="x" sizeOverride={16} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
});

export default Toast;
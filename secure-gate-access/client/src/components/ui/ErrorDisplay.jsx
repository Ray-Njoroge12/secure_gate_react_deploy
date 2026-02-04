import React, { useEffect, useRef } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const ErrorDisplay = ({ 
  error, 
  onClose, 
  type = 'error',
  title = null,
  className = ''
}) => {
  const errorRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to close
      if (e.key === 'Escape' && errorRef.current) {
        onClose?.();
      }
      // Space or Enter to close
      if ((e.key === ' ' || e.key === 'Enter') && e.target === errorRef.current) {
        e.preventDefault();
        onClose?.();
      }
    };

    const errorElement = errorRef.current;
    if (errorElement) {
      errorElement.addEventListener('keydown', handleKeyDown);
      return () => errorElement.removeEventListener('keydown', handleKeyDown);
    }
  }, [onClose]);

  if (!error) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'info': return <Info className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300';
      default:
        return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md ${className}`}>
      <div ref={errorRef} className={`border rounded-lg p-4 shadow-lg ${getStyles()}`} tabIndex={0}>
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-3">
            {getIcon()}
          </div>
          <div className="flex-1">
            {title && (
              <h4 className="font-semibold text-sm mb-1">
                {title}
              </h4>
            )}
            <p className="text-sm">
              {error}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center -m-2"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;

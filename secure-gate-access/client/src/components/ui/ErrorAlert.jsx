import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import Button from './Button.jsx';

/**
 * Unified Error Alert Component
 * Provides consistent error display with recovery actions and accessibility
 */
const ErrorAlert = ({ 
  error, 
  onClose, 
  onRetry,
  onHelp,
  type = 'error',
  title = null,
  className = '',
  position = 'top-right',
  autoClose = false,
  autoCloseDelay = 5000,
  showRecoveryActions = true,
  persistent = false
}) => {
  const alertRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Auto-close functionality
  useEffect(() => {
    if (autoClose && error && !persistent) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [error, autoClose, autoCloseDelay, persistent]);

  // Show animation
  useEffect(() => {
    if (error) {
      setIsVisible(true);
      setIsClosing(false);
    }
  }, [error]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!error || !alertRef.current) return;

      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
      // Space or Enter to close
      if ((e.key === ' ' || e.key === 'Enter') && e.target === alertRef.current) {
        e.preventDefault();
        handleClose();
      }
      // Ctrl/Cmd + R to retry
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && onRetry) {
        e.preventDefault();
        handleRetry();
      }
      // Ctrl/Cmd + H to get help
      if ((e.ctrlKey || e.metaKey) && e.key === 'h' && onHelp) {
        e.preventDefault();
        handleHelp();
      }
    };

    const alertElement = alertRef.current;
    if (alertElement) {
      alertElement.addEventListener('keydown', handleKeyDown);
      return () => alertElement.removeEventListener('keydown', handleKeyDown);
    }
  }, [error, onRetry, onHelp]);

  const handleClose = () => {
    if (persistent) return;
    
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  const handleRetry = () => {
    onRetry?.();
    handleClose();
  };

  const handleHelp = () => {
    if (onHelp) onHelp();
  };
  
  const getColors = () => {
    switch (type) {
      case 'error':
        return 'bg-white dark:bg-slate-800 border-red-200 text-red-800 dark:text-red-200 border-l-[6px] border-l-red-500';
      case 'warning':
        return 'bg-white dark:bg-slate-800 border-yellow-200 text-yellow-800 dark:text-yellow-200 border-l-[6px] border-l-yellow-500';
      case 'info':
        return 'bg-white dark:bg-slate-800 border-blue-200 text-blue-800 dark:text-blue-200 border-l-[6px] border-l-blue-500';
      case 'success':
        return 'bg-white dark:bg-slate-800 border-green-200 text-green-800 dark:text-green-200 border-l-[6px] border-l-green-500';
      default:
        return 'bg-white dark:bg-slate-800 border-gray-200 text-gray-800 dark:text-gray-200 border-l-[6px] border-l-gray-500';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'error': return 'AlertCircle';
      case 'warning': return 'AlertTriangle';
      case 'success': return 'CheckCircle';
      case 'info': return 'Info';
      default: return 'Info';
    }
  };
  
  const renderActions = () => {
    if (!onRetry && !onHelp) return null;
    
    return (
      <div className="mt-3 flex gap-3">
        {onRetry && (
          <ActionButton
            icon="RefreshCw"
            label="Retry"
            onClick={handleRetry}
            variant="outline"
          />
        )}
        {onHelp && (
          <ActionButton
            icon="HelpCircle"
            label="Help"
            onClick={handleHelp}
            variant="outline"
          />
        )}
      </div>
    );
  };
  
  const positionClasses = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-center': 'top-4 left-1/2 -translate-x-1/2',
      'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <div
      ref={alertRef}
      className={`fixed ${positionClasses[position]} z-50 w-full max-w-md p-4 transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[-1rem] opacity-0'
      } ${className}`}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      tabIndex={0}
    >
      <div 
        className={`relative flex items-start p-4 mb-4 text-sm rounded-lg border shadow-lg ${getColors()}`}
      >
        <div className="flex-shrink-0 mt-0.5">
          <Icon name={getIcon()} size={20} className="w-5 h-5" aria-hidden="true" />
        </div>
        
        <div className="flex-1 ml-3 mr-8">
          {title && (
            <h3 className="font-semibold mb-1" id="alert-title">
              {title}
            </h3>
          )}
          <div className="text-sm opacity-90 break-words">
            {error.message || error || 'An unexpected error occurred'}
          </div>
          
          {renderActions()}
        </div>

        <Button
          onClick={handleClose}
          type="button"
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 !p-1.5 !h-auto !min-h-0 opacity-70 hover:opacity-100"
          aria-label="Close alert"
        >
          <Icon name="x" size={16} className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const ActionButton = ({ icon, label, onClick, variant = 'info' }) => (
  <Button
    onClick={onClick}
    variant="ghost"
    size="sm"
    className="!h-auto !min-h-0 !px-3 !py-1.5 !text-xs !font-medium"
    icon={icon ? <Icon name={icon} size={14} className="w-3.5 h-3.5" /> : undefined}
  >
    {label}
  </Button>
);

export default ErrorAlert;

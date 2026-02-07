import React, { useEffect, useRef, useState } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle, RefreshCw, HelpCircle, ExternalLink } from 'lucide-react';
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
    onHelp?.();
  };

  if (!error || !isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'info': return <Info className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    const baseStyles = 'border rounded-lg p-4 shadow-lg transition-all duration-300';
    const positionStyles = {
      'top-right': 'fixed top-4 right-4 z-50 max-w-md',
      'top-left': 'fixed top-4 left-4 z-50 max-w-md',
      'top-center': 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md',
      'bottom-right': 'fixed bottom-4 right-4 z-50 max-w-md',
      'bottom-left': 'fixed bottom-4 left-4 z-50 max-w-md',
      'bottom-center': 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md',
      'inline': 'mb-4 max-w-full'
    };

    const typeStyles = {
      success: 'bg-green-50 border-green-200 text-green-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      error: 'bg-red-50 border-red-200 text-red-800'
    };

    const animationStyles = isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100';

    return `${baseStyles} ${positionStyles[position]} ${typeStyles[type]} ${animationStyles} ${className}`;
  };

  const getRecoveryActions = () => {
    if (!showRecoveryActions) return null;

    const actions = [];
    
    if (onRetry) {
      actions.push(
        <Button
          key="retry"
          variant="outline"
          size="sm"
          onClick={handleRetry}
          className="text-xs"
          aria-label="Retry the failed action"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Retry
        </Button>
      );
    }

    if (onHelp) {
      actions.push(
        <Button
          key="help"
          variant="outline"
          size="sm"
          onClick={handleHelp}
          className="text-xs"
          aria-label="Get help with this error"
        >
          <HelpCircle className="w-3 h-3 mr-1" />
          Help
        </Button>
      );
    }

    return actions.length > 0 ? (
      <div className="flex gap-2 mt-3">
        {actions}
      </div>
    ) : null;
  };

  return (
    <div className={getStyles()}>
      <div 
        ref={alertRef}
        className="flex items-start"
        tabIndex={0}
        role="alert"
        aria-live="assertive"
        aria-label={`${type} alert: ${title || error}`}
      >
        <div className="flex-shrink-0 mr-3">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="font-semibold text-sm mb-1">
              {title}
            </h4>
          )}
          <p className="text-sm break-words">
            {error}
          </p>
          {getRecoveryActions()}
        </div>
        {!persistent && onClose && (
          <button
            onClick={handleClose}
            className="flex-shrink-0 ml-3 text-gray-500 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            aria-label="Close alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;

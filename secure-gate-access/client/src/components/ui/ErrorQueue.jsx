/**
 * @fileoverview ErrorQueue component for Secure Gate Access
 * @description Global error display component that shows errors from ErrorContext
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useEffect, useState } from 'react';
import { useError } from '../../contexts/ErrorContext';
import errorQueueService from '../../services/errorQueueService';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';

/**
 * ErrorQueue component for displaying global errors and notifications
 * 
 * @component
 * @param {Object} props - Component props
 * @param {number} props.maxItems - Maximum number of items to display
 * @param {number} props.autoDismissDelay - Auto-dismiss delay in milliseconds
 * @param {string} props.position - Position of the queue ('top-right', 'top-left', 'bottom-right', 'bottom-left')
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} ErrorQueue component
 * 
 * @example
 * <ErrorQueue maxItems={5} autoDismissDelay={5000} position="top-right" />
 */
const ErrorQueue = ({
  maxItems = 5,
  autoDismissDelay = 5000,
  position = 'top-right',
  className = ''
}) => {
  const { clearError, clearAllErrors } = useError();
  const [errors, setErrors] = useState([]);

  // Subscribe to error queue changes
  useEffect(() => {
    const unsubscribe = errorQueueService.subscribe((newErrors) => {
      setErrors(newErrors.slice(0, maxItems));
    });

    // Get initial errors
    setErrors(errorQueueService.getErrors().slice(0, maxItems));

    return unsubscribe;
  }, [maxItems]);

  // Auto-dismiss items after delay
  useEffect(() => {
    const timers = errors.map((item) => {
      if (item.autoClose !== false) {
        return setTimeout(() => {
          handleDismiss(item.id);
        }, item.autoCloseDelay || autoDismissDelay);
      }
      return null;
    });

    return () => {
      timers.forEach(timer => timer && clearTimeout(timer));
    };
  }, [errors, autoDismissDelay]);

  const handleDismiss = (id) => {
    errorQueueService.removeError(id);
  };

  const handleDismissAll = () => {
    errorQueueService.clearAll();
  };

  const handleRetry = (item) => {
    if (item.onRetry) {
      item.onRetry();
    }
    handleDismiss(item.id);
  };

  const handleHelp = (item) => {
    if (item.onHelp) {
      item.onHelp();
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  if (errors.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed z-50 ${getPositionClasses()} space-y-2 ${className}`}
      role="region"
      aria-label="Error notifications"
      aria-live="polite"
    >
      {/* Dismiss All Button */}
      {errors.length > 1 && (
        <div className="flex justify-end mb-2">
          <button
            onClick={handleDismissAll}
            className="text-xs text-slate-400 hover:text-slate-200 bg-slate-800 px-2 py-1 rounded"
            aria-label="Dismiss all notifications"
          >
            Dismiss All
          </button>
        </div>
      )}

      {/* Error Items */}
      {errors.map((item) => (
        <div
          key={item.id}
          className={`
            max-w-sm w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg
            transform transition-all duration-300 ease-in-out
            ${item.type === 'error' ? 'border-red-500' : ''}
            ${item.type === 'success' ? 'border-green-500' : ''}
            ${item.type === 'warning' ? 'border-yellow-500' : ''}
            ${item.type === 'info' ? 'border-blue-500' : ''}
          `}
          role="alert"
          aria-live={item.type === 'error' ? 'assertive' : 'polite'}
        >
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                {getIcon(item.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                {item.title && (
                  <h4 className="text-sm font-medium text-slate-200 mb-1">
                    {item.title}
                  </h4>
                )}
                
                <p className="text-sm text-slate-300">
                  {item.message}
                </p>
                
                {item.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                      Show details
                    </summary>
                    <div className="mt-2 text-xs text-slate-400 bg-slate-900 p-2 rounded">
                      <pre className="whitespace-pre-wrap">{item.details}</pre>
                    </div>
                  </details>
                )}
                
                {/* Recovery Actions */}
                {item.showRecoveryActions && (
                  <div className="mt-3 flex space-x-2">
                    {item.onRetry && (
                      <button
                        onClick={() => handleRetry(item)}
                        className="text-xs px-3 py-1 rounded transition-colors bg-brand-600 text-white hover:bg-brand-700 flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </button>
                    )}
                    
                    {item.onHelp && (
                      <button
                        onClick={() => handleHelp(item)}
                        className="text-xs px-3 py-1 rounded transition-colors bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center gap-1"
                      >
                        <HelpCircle className="w-3 h-3" />
                        Help
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0 ml-2">
                <button
                  onClick={() => handleDismiss(item.id)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label={`Dismiss ${item.type} notification`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ErrorQueue;

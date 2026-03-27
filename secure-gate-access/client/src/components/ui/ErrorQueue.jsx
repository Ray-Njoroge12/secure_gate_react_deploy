/**
 * @fileoverview ErrorQueue component for Secure Gate Access
 * @description Global error display component that shows errors from ErrorContext
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useEffect, useState } from 'react';

import errorQueueService from '../../services/errorQueueService';

import Button from './Button.jsx';
import Icon from './Icon.jsx';

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

  // Render based on error type
  const getIconForType = (type) => {
    switch (type) {
      case 'success': return 'check-circle';
      case 'warning': return 'alert-triangle';
      case 'info': return 'info';
      case 'system': return 'refresh-cw';
      default: return 'alert-circle';
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
          <Button
            onClick={handleDismissAll}
            variant="ghost"
            size="sm"
            className="!h-auto !min-h-0 !px-2 !py-1 !text-xs text-gray-500 dark:text-slate-400"
            aria-label="Dismiss all notifications"
          >
            Dismiss All
          </Button>
        </div>
      )}

      {/* Error Items */}
      {errors.map((item) => (
        <div
          key={item.id}
          className={`
            max-w-sm w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg
            transform transition-all duration-300 ease-in-out
            ${item.type === 'error' ? 'border-red-500' : ''}
            ${item.type === 'success' ? 'border-green-500' : ''}
            ${item.type === 'warning' ? 'border-yellow-500' : ''}
            ${item.type === 'info' ? 'border-blue-500' : ''}
          `}
          role="alert"
          aria-live={item.type === 'error' ? 'assertive' : 'polite'}
        >
          <div className="flex-shrink-0">
            <Icon name={getIconForType(item.type)} size={20} className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {item.title || 'Error'}
            </p>
            <p className="text-xs opacity-90 line-clamp-2 mt-0.5">
              {item.message}
            </p>
            {item.details && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 dark:text-slate-400 cursor-pointer hover:text-gray-700 dark:hover:text-slate-300">
                  Show details
                </summary>
                <div className="mt-2 text-xs text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-900 p-2 rounded">
                  <pre className="whitespace-pre-wrap">{item.details}</pre>
                </div>
              </details>
            )}
            
            {/* Recovery Actions */}
            {item.showRecoveryActions && (
              <div className="mt-3 flex space-x-2">
                {item.onRetry && (
                  <Button
                    onClick={() => handleRetry(item)}
                    variant="secondary"
                    size="sm"
                    className="!h-auto !min-h-0 !px-3 !py-1 !text-xs"
                    icon={<Icon name="refresh-cw" size={12} className="w-3 h-3" />}
                  >
                    Retry
                  </Button>
                )}
                
                {item.onHelp && (
                  <Button
                    onClick={() => handleHelp(item)}
                    variant="secondary"
                    size="sm"
                    className="!h-auto !min-h-0 !px-3 !py-1 !text-xs"
                    icon={<Icon name="help-circle" size={12} className="w-3 h-3" />}
                  >
                    Help
                  </Button>
                )}
              </div>
            )}
          </div>
          
          <div className="flex-shrink-0 ml-2">
            <Button
              onClick={() => handleDismiss(item.id)}
              variant="ghost"
              size="sm"
              className="!h-auto !min-h-0 !p-1 text-gray-400 dark:text-slate-400"
              aria-label={`Dismiss ${item.type} notification`}
            >
              <Icon name="x" size={16} />
            </Button>
          </div>

          {/* Progress bar for auto-dismiss */}
          {item.createdAt && autoDismissDelay && (
            <div 
              className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                transition: 'width 0.3s ease-in-out',
                width: `${((Date.now() - item.createdAt) / autoDismissDelay) * 100}%`,
                zIndex: -1,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default ErrorQueue;

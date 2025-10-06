import React, { useState, useEffect } from 'react';
import ErrorAlert from './ui/ErrorAlert';
import errorQueueService from '../services/errorQueueService';

/**
 * Error Queue Component
 * Displays all errors from the error queue service
 */
const ErrorQueue = () => {
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    // Subscribe to error queue changes
    const unsubscribe = errorQueueService.subscribe((newErrors) => {
      setErrors(newErrors);
    });

    // Initialize with current errors
    setErrors(errorQueueService.getErrors());

    return unsubscribe;
  }, []);

  const handleClose = (errorId) => {
    errorQueueService.removeError(errorId);
  };

  const handleRetry = (errorId, onRetry) => {
    if (onRetry) {
      onRetry();
    }
    errorQueueService.removeError(errorId);
  };

  const handleHelp = (errorId, onHelp) => {
    if (onHelp) {
      onHelp();
    }
  };

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="error-queue">
      {errors.map((error) => (
        <ErrorAlert
          key={error.id}
          error={error.message}
          onClose={() => handleClose(error.id)}
          onRetry={error.onRetry ? () => handleRetry(error.id, error.onRetry) : null}
          onHelp={error.onHelp ? () => handleHelp(error.id, error.onHelp) : null}
          type={error.type}
          title={error.title}
          position={error.position}
          autoClose={error.autoClose}
          autoCloseDelay={error.autoCloseDelay}
          showRecoveryActions={error.showRecoveryActions}
          persistent={error.persistent}
        />
      ))}
    </div>
  );
};

export default ErrorQueue;

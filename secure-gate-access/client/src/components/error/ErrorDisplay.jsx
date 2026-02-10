/**
 * Enhanced Error Display Component
 * 
 * Displays user-friendly error messages with actionable guidance
 * and recovery options
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ERROR_SEVERITY, RECOVERY_ACTIONS } from '../../services/errorManagementService';
import Button from '../ui/Button';
import './ErrorDisplay.css';

const ErrorDisplay = ({
  error,
  onRetry,
  onDismiss,
  onHelp,
  showDetails = false,
  className = ''
}) => {
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (onRetry && !isRetrying) {
      setIsRetrying(true);
      try {
        await onRetry();
      } finally {
        setIsRetrying(false);
      }
    }
  };

  const handleAction = async (action) => {
    if (action.handler) {
      if (action.type === RECOVERY_ACTIONS.RETRY) {
        await handleRetry();
      } else {
        action.handler();
      }
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case ERROR_SEVERITY.CRITICAL:
        return '🚨';
      case ERROR_SEVERITY.HIGH:
        return '⚠️';
      case ERROR_SEVERITY.MEDIUM:
        return '⚠️';
      case ERROR_SEVERITY.LOW:
        return 'ℹ️';
      default:
        return '⚠️';
    }
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case ERROR_SEVERITY.CRITICAL:
        return 'error-display--critical';
      case ERROR_SEVERITY.HIGH:
        return 'error-display--high';
      case ERROR_SEVERITY.MEDIUM:
        return 'error-display--medium';
      case ERROR_SEVERITY.LOW:
        return 'error-display--low';
      default:
        return 'error-display--medium';
    }
  };

  return (
    <div 
      className={`error-display ${getSeverityClass(error.severity)} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="error-display__header">
        <div className="error-display__icon">
          {getSeverityIcon(error.severity)}
        </div>
        <div className="error-display__title-section">
          <h3 className="error-display__title">{error.title}</h3>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="error-display__close"
              onClick={onDismiss}
              aria-label="Dismiss error"
              title="Dismiss this error"
            >
              ×
            </Button>
          )}
        </div>
      </div>

      <div className="error-display__content">
        <p className="error-display__message">{error.message}</p>
        
        {error.guidance && (
          <div className="error-display__guidance">
            <p className="error-display__guidance-text">{error.guidance}</p>
          </div>
        )}

        {error.actions && error.actions.length > 0 && (
          <div className="error-display__actions">
            {error.actions.map((action, index) => (
              <Button
                key={index}
                variant={action.primary ? 'primary' : 'secondary'}
                size="sm"
                className={`error-display__action ${action.primary ? 'error-display__action--primary' : 'error-display__action--secondary'}`}
                onClick={() => handleAction(action)}
                disabled={isRetrying && action.type === RECOVERY_ACTIONS.RETRY}
              >
                {isRetrying && action.type === RECOVERY_ACTIONS.RETRY ? 'Retrying...' : action.label}
              </Button>
            ))}
          </div>
        )}

        {showDetails && error.details && (
          <div className="error-display__details">
            <Button
              variant="ghost"
              size="sm"
              className="error-display__details-toggle"
              onClick={() => setShowFullDetails(!showFullDetails)}
              aria-expanded={showFullDetails}
            >
              {showFullDetails ? 'Hide Details' : 'Show Details'}
            </Button>
            
            {showFullDetails && (
              <div className="error-display__details-content">
                {Object.entries(error.details).map(([key, value]) => (
                  <div key={key} className="error-display__detail-item">
                    <strong>{key}:</strong> {value}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {onHelp && (
          <div className="error-display__help">
            <Button
              variant="ghost"
              size="sm"
              className="error-display__help-button"
              onClick={onHelp}
              title="Get help with this error"
            >
              Need help? Click here for troubleshooting steps
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

ErrorDisplay.propTypes = {
  error: PropTypes.shape({
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    guidance: PropTypes.string,
    severity: PropTypes.oneOf(Object.values(ERROR_SEVERITY)),
    actions: PropTypes.arrayOf(PropTypes.shape({
      type: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      primary: PropTypes.bool,
      handler: PropTypes.func
    })),
    details: PropTypes.object
  }).isRequired,
  onRetry: PropTypes.func,
  onDismiss: PropTypes.func,
  onHelp: PropTypes.func,
  showDetails: PropTypes.bool,
  className: PropTypes.string
};

export default ErrorDisplay;
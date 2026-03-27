import PropTypes from 'prop-types';
import React from 'react';

import Button from '../ui/Button';

import ErrorBoundary from './ErrorBoundary';
import './NetworkErrorBoundary.css';

const NetworkErrorFallback = ({ 
  error, 
  errorId: _errorId,
  retryCount, 
  onRetry, 
  onReload, 
  isRetrying 
}) => {
  const isNetworkError = error?.message?.includes('Network Error') || 
                        error?.message?.includes('fetch') ||
                        error?.code === 'NETWORK_ERROR';

  if (!isNetworkError) {
    // Fall back to default error boundary for non-network errors
    return null;
  }

  return (
    <div className="network-error-boundary">
      <div className="network-error-boundary__icon">🌐</div>
      <div className="network-error-boundary__content">
        <h3 className="network-error-boundary__title">Connection Problem</h3>
        <p className="network-error-boundary__message">
          It looks like you're having trouble connecting to our servers. 
          This could be due to a network issue or server maintenance.
        </p>
        
        <div className="network-error-boundary__suggestions">
          <h4>Try these steps:</h4>
          <ul>
            <li>Check your internet connection</li>
            <li>Refresh the page</li>
            <li>Wait a few minutes and try again</li>
            <li>Check if other websites are working</li>
          </ul>
        </div>

        {retryCount > 0 && (
          <div className="network-error-boundary__retry-info">
            Retry attempt: {retryCount}
          </div>
        )}

        <div className="network-error-boundary__actions">
          <Button
            className="network-error-boundary__button network-error-boundary__button--primary"
            onClick={onRetry}
            disabled={isRetrying || retryCount >= 3}
          >
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </Button>
          
          <Button
            className="network-error-boundary__button network-error-boundary__button--secondary"
            onClick={onReload}
          >
            Refresh Page
          </Button>
        </div>

        <div className="network-error-boundary__help">
          <p>
            If the problem persists, please check our{' '}
            <a href="/status" target="_blank" rel="noopener noreferrer">
              system status page
            </a>{' '}
            or contact support.
          </p>
        </div>
      </div>
    </div>
  );
};

NetworkErrorFallback.propTypes = {
  error: PropTypes.object,
  errorId: PropTypes.string,
  retryCount: PropTypes.number,
  onRetry: PropTypes.func.isRequired,
  onReload: PropTypes.func.isRequired,
  isRetrying: PropTypes.bool
};

const NetworkErrorBoundary = ({ children, ...props }) => {
  return (
    <ErrorBoundary
      {...props}
      fallback={NetworkErrorFallback}
      level="component"
    >
      {children}
    </ErrorBoundary>
  );
};

NetworkErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired
};

export default NetworkErrorBoundary;





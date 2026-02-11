import React from 'react';
import PropTypes from 'prop-types';
import ErrorBoundary from './ErrorBoundary';
import { navigateToLogin } from '../../utils/authNavigation';
import './AuthErrorBoundary.css';
import Button from '../ui/Button';

const AuthErrorFallback = ({ 
  error, 
  errorId, 
  retryCount, 
  onRetry, 
  onReload, 
  onGoHome,
  isRetrying 
}) => {
  const isAuthError = error?.message?.includes('401') || 
                     error?.message?.includes('Unauthorized') ||
                     error?.message?.includes('Token') ||
                     error?.code === 'AUTH_ERROR';

  if (!isAuthError) {
    // Fall back to default error boundary for non-auth errors
    return null;
  }

  const handleLogin = () => {
    navigateToLogin();
  };

  return (
    <div className="auth-error-boundary">
      <div className="auth-error-boundary__icon">🔐</div>
      <div className="auth-error-boundary__content">
        <h3 className="auth-error-boundary__title">Authentication Required</h3>
        <p className="auth-error-boundary__message">
          Your session has expired or you need to log in again to access this feature.
        </p>
        
        <div className="auth-error-boundary__info">
          <p>
            This usually happens when:
          </p>
          <ul>
            <li>Your session has timed out</li>
            <li>You've been logged out from another device</li>
            <li>Your authentication token has expired</li>
          </ul>
        </div>

        {retryCount > 0 && (
          <div className="auth-error-boundary__retry-info">
            Retry attempt: {retryCount}
          </div>
        )}

        <div className="auth-error-boundary__actions">
          <Button
            className="auth-error-boundary__button auth-error-boundary__button--primary"
            onClick={handleLogin}
          >
            Log In Again
          </Button>
          
          <Button
            className="auth-error-boundary__button auth-error-boundary__button--secondary"
            onClick={onRetry}
            disabled={isRetrying || retryCount >= 2}
          >
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </Button>
          
          <Button
            className="auth-error-boundary__button auth-error-boundary__button--outline"
            onClick={onGoHome}
          >
            Go Home
          </Button>
        </div>

        <div className="auth-error-boundary__help">
          <p>
            If you continue to have problems, please{' '}
            <a href="/support" target="_blank" rel="noopener noreferrer">
              contact support
            </a>{' '}
            or try clearing your browser cache.
          </p>
        </div>
      </div>
    </div>
  );
};

AuthErrorFallback.propTypes = {
  error: PropTypes.object,
  errorId: PropTypes.string,
  retryCount: PropTypes.number,
  onRetry: PropTypes.func.isRequired,
  onReload: PropTypes.func.isRequired,
  onGoHome: PropTypes.func.isRequired,
  isRetrying: PropTypes.bool
};

const AuthErrorBoundary = ({ children, ...props }) => {
  return (
    <ErrorBoundary
      {...props}
      fallback={AuthErrorFallback}
      level="component"
    >
      {children}
    </ErrorBoundary>
  );
};

AuthErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired
};

export default AuthErrorBoundary;




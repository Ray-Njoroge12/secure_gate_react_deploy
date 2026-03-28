// client/src/components/ui/ErrorBoundary.jsx
import React from 'react';
import logger from 'utils/logger';

import { navigateTo } from '../../utils/appNavigation';
import { handleError, getRecoveryActions, ERROR_TYPES } from '../../utils/errorHandler';
import { reportError, reportUserAction } from '../../utils/errorReporting';

import Icon from './Icon.jsx';

import { Card, Button } from './index';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorId: null,
      errorType: null,
      recoveryActions: [],
      retryCount: 0,
      isRecovering: false
    };
    
    this.maxRetries = props.maxRetries || 3;
    this.retryDelay = props.retryDelay || 1000;
    this.errorRef = React.createRef();
  }

  // Keyboard shortcuts
  componentDidMount() {
    const handleKeyDown = (e) => {
      // Escape to dismiss error
      if (e.key === 'Escape' && this.state.hasError) {
        this.handleDismiss();
      }
      // Ctrl/Cmd + R to reload page
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && this.state.hasError) {
        e.preventDefault();
        window.location.reload();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    this.keydownHandler = handleKeyDown;
  }

  componentWillUnmount() {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
    }
  }

    static getDerivedStateFromError(_error) {
    // Update state to show fallback UI
    return { hasError: true };
  }

  async componentDidCatch(error, errorInfo) {
    // Log error details
    const errorId = Date.now().toString(36);
    
    // Process error with enhanced error handler
    const processedError = handleError(error, 'error_boundary', {
      showToUser: true,
      logToConsole: true,
      reportToService: true
    }) || { type: 'unknown', message: error.message };

    // Get recovery actions based on error type
    const recoveryActions = getRecoveryActions(processedError.type, 'error_boundary') || [];
    
    this.setState({
      error,
      errorInfo,
      errorId,
      errorType: processedError.type,
      recoveryActions
    });

    // Log using centralized logger
    logger.error('Error caught by ErrorBoundary:', {
      errorId,
      error: error.toString(),
      errorInfo,
      componentStack: errorInfo.componentStack,
      processedError
    });

    // Report to error reporting service
    try {
      await reportError(processedError, {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        retryCount: this.state.retryCount
      });
    } catch (reportError) {
      logger.error('Failed to report error to service', reportError);
    }

    // Report user action for context
    reportUserAction('error_boundary_triggered', {
      errorType: processedError.type,
      errorId,
      component: this.props.componentName || 'Unknown'
    });
  }

  handleReload = () => {
    reportUserAction('error_recovery_reload');
    window.location.reload();
  };

  handleReset = () => {
    reportUserAction('error_recovery_reset');
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null,
      errorType: null,
      recoveryActions: [],
      retryCount: 0,
      isRecovering: false
    });
  };

  handleGoHome = () => {
    reportUserAction('error_recovery_go_home');
    navigateTo('/dashboard');
  };

  handleRetry = async () => {
    const { retryCount } = this.state;
    
    if (retryCount >= this.maxRetries) {
      logger.warn('Maximum retry attempts reached');
      return;
    }

    this.setState({ isRecovering: true });
    reportUserAction('error_recovery_retry', { attempt: retryCount + 1 });

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, this.retryDelay));

    this.setState(prevState => ({
      hasError: false,
      retryCount: prevState.retryCount + 1,
      isRecovering: false
    }));
  };

  handleRecoveryAction = (action) => {
    reportUserAction('error_recovery_action', { action: action.label });
    
    if (typeof action.action === 'function') {
      action.action();
    } else {
      // Handle string actions
      switch (action.action) {
        case 'retry':
          this.handleRetry();
          break;
        case 'reset_form':
          // Trigger form reset if available
          const form = document.querySelector('form');
          if (form) {
            form.reset();
            this.handleReset();
          }
          break;
        case 'offline_mode':
          // Enable offline mode (if implemented)
          logger.info('Switching to offline mode');
          break;
        default:
          logger.warn('Unknown recovery action:', action.action);
      }
    }
  };

  render() {
    if (this.state.hasError) {
      const { 
        error, 
        errorId, 
        errorType, 
        recoveryActions, 
        retryCount, 
        isRecovering 
      } = this.state;
      const { fallback, showDetails = false } = this.props;

      // If a custom fallback is provided, use it
      if (fallback) {
        return fallback(error, this.handleReset);
      }

      // Get error-specific messaging
      const getErrorIcon = () => {
        switch (errorType) {
          case ERROR_TYPES.NETWORK:
            return <Icon name="wifi-off" size={64} className="w-16 h-16 text-orange-500" />;
          case ERROR_TYPES.AUTHENTICATION:
            return <Icon name="lock" size={64} className="w-16 h-16 text-blue-500" />;
          case ERROR_TYPES.SERVER:
            return <Icon name="server-crash" size={64} className="w-16 h-16 text-red-500" />;
          default:
            return <Icon name="alert-triangle" size={64} className="w-16 h-16 text-red-600" />;
        }
      };

      const getErrorMessage = () => {
        switch (errorType) {
          case ERROR_TYPES.NETWORK:
            return {
              title: 'Connection Problem',
              message: 'Please check your internet connection and try again.',
              suggestion: 'Make sure you\'re connected to the internet and try refreshing the page.'
            };
          case ERROR_TYPES.AUTHENTICATION:
            return {
              title: 'Session Expired',
              message: 'Your session has expired. Please log in again.',
              suggestion: 'This usually happens when you\'ve been inactive for a while.'
            };
          case ERROR_TYPES.SERVER:
            return {
              title: 'Server Error',
              message: 'Our servers are experiencing issues. Please try again in a few moments.',
              suggestion: 'This is a temporary issue. Please wait a moment and try again.'
            };
          default:
            return {
              title: 'Something went wrong',
              message: 'We\'re sorry, but something unexpected happened.',
              suggestion: 'Please try refreshing the page or contact support if the problem persists.'
            };
        }
      };

      const errorMessage = getErrorMessage();

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
          <Card className="max-w-lg w-full">
            <Card.Header>
              <div className="text-center">
                <div className="mx-auto mb-4">
                  {getErrorIcon()}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {errorMessage.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-200 mb-2">
                  {errorMessage.message}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
                  {errorMessage.suggestion}
                </p>
                
                {errorId && (
                  <div className="mb-4 p-3 bg-gray-100 dark:bg-slate-700 rounded-md">
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      Error ID: <code className="font-mono bg-gray-200 px-1 rounded">{errorId}</code>
                    </p>
                    {retryCount > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                        Retry attempt: {retryCount}/{this.maxRetries}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card.Header>

            <Card.Content>
              {showDetails && error && (
                <div className="mb-4">
                  <details className="bg-red-50 border border-red-200 rounded-md p-3">
                    <summary className="text-sm font-medium text-red-800 cursor-pointer">
                      Technical Details
                    </summary>
                    <div className="mt-2 text-xs text-red-700 font-mono whitespace-pre-wrap">
                      {error.toString()}
                      {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </div>
                  </details>
                </div>
              )}

              <div className="space-y-3">
                {/* Primary action */}
                <Button 
                  variant="primary" 
                  onClick={this.handleReload}
                  className="w-full"
                  disabled={isRecovering}
                >
                  {isRecovering ? 'Recovering...' : 'Reload Page'}
                </Button>
                
                {/* Recovery actions based on error type */}
                {recoveryActions && recoveryActions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-200 text-center">Or try:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {recoveryActions.slice(0, 4).map((action, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          onClick={() => this.handleRecoveryAction(action)}
                          className="w-full text-sm"
                          disabled={isRecovering}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Retry option for certain error types */}
                {errorType === ERROR_TYPES.NETWORK && retryCount < this.maxRetries && (
                  <Button
                    variant="outline"
                    onClick={this.handleRetry}
                    className="w-full"
                    disabled={isRecovering}
                  >
                    {isRecovering ? 'Retrying...' : 'Try Again'}
                  </Button>
                )}

                {/* Standard fallback actions */}
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={this.handleReset}
                    className="w-full"
                    disabled={isRecovering}
                  >
                    Reset
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={this.handleGoHome}
                    className="w-full"
                    disabled={isRecovering}
                  >
                    Go Home
                  </Button>
                </div>
              </div>
            </Card.Content>

            <Card.Footer>
              <div className="text-center text-xs text-gray-500 dark:text-gray-300">
                {retryCount >= this.maxRetries ? (
                  <span className="text-red-600">
                    Maximum retry attempts reached. Please contact support.
                  </span>
                ) : (
                  'If this error persists, please contact technical support with the error ID above.'
                )}
              </div>
            </Card.Footer>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
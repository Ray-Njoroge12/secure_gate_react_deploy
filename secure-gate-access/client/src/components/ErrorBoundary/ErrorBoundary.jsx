import React, { Component } from 'react';
import logger from 'utils/logger';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import api from '../../utils/apiClient';
import { navigateTo } from '../../utils/appNavigation';
import './ErrorBoundary.css';
import Button from '../ui/Button';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: uuidv4() // Guaranteed unique UUID
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    this.setState({
      error,
      errorInfo
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      logger.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Send error to logging service
    this.logError(error, errorInfo);
  }

  componentDidMount() {
    // Add keyboard event listener for error boundary
    document.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    // Remove keyboard event listener
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (e) => {
    // Only handle keyboard shortcuts when error boundary is active
    if (!this.state.hasError) return;

    // Escape to go home
    if (e.key === 'Escape') {
      e.preventDefault();
      this.handleGoHome();
    }
    // Ctrl/Cmd + R to retry
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      if (!this.state.isRetrying && this.state.retryCount < 3) {
        this.handleRetry();
      }
    }
    // Ctrl/Cmd + L to reload page
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault();
      this.handleReload();
    }
    // Ctrl/Cmd + H to go home
    if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
      e.preventDefault();
      this.handleGoHome();
    }
    // Ctrl/Cmd + B to report bug
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      this.handleReportBug();
    }
    // Space or Enter to toggle details
    if ((e.key === ' ' || e.key === 'Enter') && e.target.tagName === 'SUMMARY') {
      e.preventDefault();
      e.target.click();
    }
  };

  logError = async (error, errorInfo) => {
    const errorData = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      // NOTE: userId removed to avoid PII in error logs (Kenya DPA compliance)
      // Backend can identify user from httpOnly cookie session
      retryCount: this.state.retryCount
    };

    try {
      // Send to backend logging service using httpOnly cookies
      await api.post('/api/logs/error', errorData);
    } catch (logError) {
      logger.error('Failed to log error:', logError);
    }
  };

  // NOTE: getCurrentUserId and getAuthToken removed - no longer needed
  // Auth is handled via httpOnly cookies (credentials: 'include')
  // User identification is done server-side from session

  handleRetry = async () => {
    this.setState({ isRetrying: true });
    
    // Wait a moment before retrying
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      isRetrying: false
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    navigateTo('/');
  };

  handleReportBug = () => {
    const errorData = {
      errorId: this.state.errorId,
      error: this.state.error,
      errorInfo: this.state.errorInfo,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Open email client with error details
    const subject = `Bug Report - Error ID: ${this.state.errorId}`;
    const body = `Please describe what you were doing when this error occurred:\n\n\n\nError Details:\n${JSON.stringify(errorData, null, 2)}`;
    const mailtoLink = `mailto:support@securegate.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.open(mailtoLink);
  };

  render() {
    if (this.state.hasError) {
      const { error, errorId, retryCount, isRetrying } = this.state;
      const { fallback: Fallback, level = 'page' } = this.props;

      // Use custom fallback if provided
      if (Fallback) {
        return (
          <Fallback
            error={error}
            errorId={errorId}
            retryCount={retryCount}
            onRetry={this.handleRetry}
            onReload={this.handleReload}
            onGoHome={this.handleGoHome}
            onReportBug={this.handleReportBug}
            isRetrying={isRetrying}
          />
        );
      }

      // Default error UI based on level
      if (level === 'component') {
        return this.renderComponentError();
      }

      return this.renderPageError();
    }

    return this.props.children;
  }

  renderComponentError = () => {
    const { error, errorId, isRetrying } = this.state;

    return (
      <div 
        className="error-boundary error-boundary--component"
        tabIndex={0}
        role="alert"
        aria-live="polite"
        aria-label="Component error - Something went wrong"
      >
        <div className="error-boundary__icon">⚠️</div>
        <div className="error-boundary__content">
          <h3 className="error-boundary__title">Something went wrong</h3>
          <p className="error-boundary__message">
            This component encountered an error and couldn't render properly.
          </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="error-boundary__details">
                <summary 
                  tabIndex={0}
                  aria-label="Toggle error details"
                  title="Press Space or Enter to toggle details"
                >
                  Error Details
                </summary>
                <pre className="error-boundary__error-text">
                  {error?.message || 'Unknown error'}
                </pre>
              </details>
            )}
          <div className="error-boundary__actions">
            <Button
              className="error-boundary__button error-boundary__button--primary"
              onClick={this.handleRetry}
              disabled={isRetrying}
              aria-label="Try to recover from the error"
              title="Press Ctrl/Cmd + R to retry"
            >
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
          </div>
          <div className="error-boundary__help">
            <p className="error-boundary__keyboard-help">
              <strong>Keyboard shortcuts:</strong> Ctrl/Cmd + R to retry.
            </p>
          </div>
        </div>
      </div>
    );
  };

  renderPageError = () => {
    const { error, errorId, retryCount, isRetrying } = this.state;

    return (
      <div 
        className="error-boundary error-boundary--page"
        tabIndex={0}
        role="alert"
        aria-live="assertive"
        aria-label="Error boundary - Something went wrong"
      >
        <div className="error-boundary__container">
          <div className="error-boundary__icon">🚨</div>
          <div className="error-boundary__content">
            <h1 className="error-boundary__title">Oops! Something went wrong</h1>
            <p className="error-boundary__message">
              We're sorry, but something unexpected happened. Our team has been notified.
            </p>
            
            <div className="error-boundary__error-id">
              Error ID: <code>{errorId}</code>
            </div>

            {retryCount > 0 && (
              <div className="error-boundary__retry-info">
                Retry attempt: {retryCount}
              </div>
            )}

            {process.env.NODE_ENV === 'development' && (
              <details className="error-boundary__details">
                <summary 
                  tabIndex={0}
                  aria-label="Toggle technical details"
                  title="Press Space or Enter to toggle details"
                >
                  Technical Details
                </summary>
                <div className="error-boundary__error-text">
                  <strong>Error:</strong> {error?.message || 'Unknown error'}
                  {error?.stack && (
                    <pre className="error-boundary__stack">
                      {error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="error-boundary__actions">
              <Button
                className="error-boundary__button error-boundary__button--primary"
                onClick={this.handleRetry}
                disabled={isRetrying || retryCount >= 3}
                aria-label="Try to recover from the error"
                title="Press Ctrl/Cmd + R to retry"
              >
                {isRetrying ? 'Retrying...' : 'Try Again'}
              </Button>
              
              <Button
                className="error-boundary__button error-boundary__button--secondary"
                onClick={this.handleReload}
                aria-label="Reload the entire page"
                title="Press Ctrl/Cmd + L to reload"
              >
                Reload Page
              </Button>
              
              <Button
                className="error-boundary__button error-boundary__button--secondary"
                onClick={this.handleGoHome}
                aria-label="Go to the home page"
                title="Press Ctrl/Cmd + H or Escape to go home"
              >
                Go Home
              </Button>
              
              <Button
                className="error-boundary__button error-boundary__button--outline"
                onClick={this.handleReportBug}
                aria-label="Report this bug to support"
                title="Press Ctrl/Cmd + B to report bug"
              >
                Report Bug
              </Button>
            </div>

            <div className="error-boundary__help">
              <p>
                If this problem persists, please contact support with the Error ID above.
              </p>
              <p className="error-boundary__keyboard-help">
                <strong>Keyboard shortcuts:</strong> Escape or Ctrl/Cmd + H to go home, Ctrl/Cmd + R to retry, Ctrl/Cmd + L to reload, Ctrl/Cmd + B to report bug.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.elementType,
  level: PropTypes.oneOf(['page', 'component']),
  onError: PropTypes.func
};

export default ErrorBoundary;

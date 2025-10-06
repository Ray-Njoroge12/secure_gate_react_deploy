import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './ErrorBoundary.css';

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
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Send error to logging service
    this.logError(error, errorInfo);
  }

  logError = async (error, errorInfo) => {
    const errorData = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId(),
      retryCount: this.state.retryCount
    };

    try {
      // Send to backend logging service
      await fetch('/api/logs/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(errorData)
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  };

  getCurrentUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.id || null;
    } catch {
      return null;
    }
  };

  getAuthToken = () => {
    try {
      return localStorage.getItem('token') || null;
    } catch {
      return null;
    }
  };

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
    window.location.href = '/';
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
      <div className="error-boundary error-boundary--component">
        <div className="error-boundary__icon">⚠️</div>
        <div className="error-boundary__content">
          <h3 className="error-boundary__title">Something went wrong</h3>
          <p className="error-boundary__message">
            This component encountered an error and couldn't render properly.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="error-boundary__details">
              <summary>Error Details</summary>
              <pre className="error-boundary__error-text">
                {error?.message || 'Unknown error'}
              </pre>
            </details>
          )}
          <div className="error-boundary__actions">
            <button
              className="error-boundary__button error-boundary__button--primary"
              onClick={this.handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  renderPageError = () => {
    const { error, errorId, retryCount, isRetrying } = this.state;

    return (
      <div className="error-boundary error-boundary--page">
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
                <summary>Technical Details</summary>
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
              <button
                className="error-boundary__button error-boundary__button--primary"
                onClick={this.handleRetry}
                disabled={isRetrying || retryCount >= 3}
              >
                {isRetrying ? 'Retrying...' : 'Try Again'}
              </button>
              
              <button
                className="error-boundary__button error-boundary__button--secondary"
                onClick={this.handleReload}
              >
                Reload Page
              </button>
              
              <button
                className="error-boundary__button error-boundary__button--secondary"
                onClick={this.handleGoHome}
              >
                Go Home
              </button>
              
              <button
                className="error-boundary__button error-boundary__button--outline"
                onClick={this.handleReportBug}
              >
                Report Bug
              </button>
            </div>

            <div className="error-boundary__help">
              <p>
                If this problem persists, please contact support with the Error ID above.
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

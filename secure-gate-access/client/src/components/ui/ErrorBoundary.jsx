// client/src/components/ui/ErrorBoundary.jsx
import React from 'react';
import { Card, Button } from './index';
import logger from '../../utils/logger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state to show fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    const errorId = Date.now().toString(36);
    
    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Log using centralized logger
    logger.error('Error caught by ErrorBoundary:', {
      errorId,
      error: error.toString(),
      errorInfo,
      componentStack: errorInfo.componentStack
    });

    // In production, you might want to log to an error reporting service
    // Example: Sentry, LogRocket, etc.
    // if (process.env.NODE_ENV === 'production') {
    //   logErrorToService(error, errorInfo, errorId);
    // }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorId } = this.state;
      const { fallback, showDetails = false } = this.props;

      // If a custom fallback is provided, use it
      if (fallback) {
        return fallback(error, this.handleReset);
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="max-w-lg w-full">
            <Card.Header>
              <div className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 text-red-600">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Something went wrong
                </h2>
                <p className="text-gray-600 mb-4">
                  We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists.
                </p>
                
                {errorId && (
                  <div className="mb-4 p-3 bg-gray-100 rounded-md">
                    <p className="text-xs text-gray-700">
                      Error ID: <code className="font-mono bg-gray-200 px-1 rounded">{errorId}</code>
                    </p>
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
                <Button 
                  variant="primary" 
                  onClick={this.handleReload}
                  className="w-full"
                >
                  Reload Page
                </Button>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={this.handleReset}
                    className="w-full"
                  >
                    Try Again
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={this.handleGoHome}
                    className="w-full"
                  >
                    Go Home
                  </Button>
                </div>
              </div>
            </Card.Content>

            <Card.Footer>
              <div className="text-center text-xs text-gray-500">
                If this error persists, please contact technical support with the error ID above.
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
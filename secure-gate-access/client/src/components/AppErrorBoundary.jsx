/**
 * @fileoverview App Error Boundary
 * @description Comprehensive error boundary with fallback UI and recovery options
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';

import logger from 'utils/logger';
import { navigateToLogin } from '../utils/authNavigation';
import Button from './ui/Button';

/**
 * App-level Error Boundary Component
 * 
 * @description Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the app.
 * 
 * @component
 */
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(_error) {
    // Update state to show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    logger.error('App Error Boundary caught an error:', error, {
      errorInfo,
      componentStack: errorInfo.componentStack,
      errorBoundary: 'AppErrorBoundary'
    });

    this.setState({
      error,
      errorInfo
    });

    // Report to error reporting service if available
    if (window.reportError) {
      window.reportError(error, errorInfo);
    }
  }

  handleRetry = () => {
    const { retryCount } = this.state;
    if (retryCount < 3) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1
      });
    } else {
      // After 3 retries, reload the page
      window.location.reload();
    }
  };

  handleReset = () => {
    // Clear all localStorage and reload
    localStorage.clear();
    sessionStorage.clear();
    navigateToLogin();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, retryCount } = this.state;
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Something went wrong
                </h3>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-200">
                The application encountered an unexpected error. This has been logged and will be investigated.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <h4 className="text-sm font-medium text-red-800 mb-2">Error Details:</h4>
                <pre className="text-xs text-red-700 whitespace-pre-wrap overflow-auto max-h-32">
                  {error.toString()}
                  {errorInfo && errorInfo.componentStack}
                </pre>
              </div>
            )}

            <div className="flex flex-col space-y-3">
              {retryCount < 3 ? (
                <Button
                  onClick={this.handleRetry}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                >
                  Try Again {retryCount > 0 && `(${3 - retryCount} attempts left)`}
                </Button>
              ) : (
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Reload Page
                </Button>
              )}
              
              <Button
                onClick={this.handleReset}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
              >
                Reset Application
              </Button>
              
              <Button
                onClick={() => navigateToLogin()}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 text-center"
              >
                Go to Login
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <p className="text-xs text-gray-500 dark:text-gray-300 text-center">
                If this problem persists, please contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
